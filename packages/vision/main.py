from flask import Flask, jsonify, request, Response, render_template
from flask_cors import CORS
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import threading
import time
from typing import Dict, Optional
import os
import sys
import io
import collections
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

# Log buffer for debug UI
log_buffer = collections.deque(maxlen=100)

class LogCapture(io.StringIO):
    def write(self, s):
        if s.strip():
            log_buffer.append(f"[{time.strftime('%H:%M:%S')}] {s.strip()}")
        return super().write(s)

# Redirect stdout to capture logs
sys.stdout = LogCapture()

class GestureRecognitionService:
    def __init__(self):
        # Initialize MediaPipe Tasks API
        model_path = os.path.join(os.path.dirname(__file__), 'hand_landmarker.task')
        
        # Verify model file exists
        if not os.path.exists(model_path):
            print(f"❌ ERROR: Model file not found at {model_path}")
            self.landmarker = None
        else:
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.HandLandmarkerOptions(
                base_options=base_options,
                num_hands=2,
                min_hand_detection_confidence=0.7,
                min_hand_presence_confidence=0.5,
                min_tracking_confidence=0.5,
                running_mode=vision.RunningMode.VIDEO
            )
            self.landmarker = vision.HandLandmarker.create_from_options(options)
            print("🤖 Gesture Recognition Service initialized with modern Tasks API")
        
        self.is_tracking = False
        self.current_gesture = None
        self.camera = None
        self.tracking_thread = None
        self.latest_frame = None
        self.camera_error = None
        self.lock = threading.Lock()
        self.gesture_history = collections.deque(maxlen=30)
        # Push architecture: backend URL and last pushed gesture
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        self.last_pushed_gesture = None
        self.last_push_time = 0
        self.push_cooldown_ms = 200  # Minimum time between pushes (ms)

    def start_tracking(self):
        """Start gesture tracking from camera"""
        if self.is_tracking:
            return {"status": "already_running"}
        
        self.is_tracking = True
        self.tracking_thread = threading.Thread(target=self._track_gestures)
        self.tracking_thread.start()
        
        return {"status": "started", "message": "Gesture tracking started"}

    def stop_tracking(self):
        """Stop gesture tracking"""
        self.is_tracking = False
        
        if self.camera:
            self.camera.release()
            self.camera = None
        
        if self.tracking_thread:
            self.tracking_thread.join(timeout=2)
            self.tracking_thread = None
        
        return {"status": "stopped", "message": "Gesture tracking stopped"}

    def _track_gestures(self):
        """Main tracking loop"""
        try:
            # Get camera device index from environment (default: 0)
            camera_index = int(os.getenv('CAMERA_INDEX', '0'))
            self.camera = cv2.VideoCapture(camera_index)
            
            if not self.camera.isOpened():
                print(f"❌ Camera not available at index {camera_index}. No mock data will be generated.")
                self.camera_error = f"Camera could not be opened at index {camera_index}. Check permissions or if another app is using it."
                return
            
            # Configure camera resolution if specified (for higher res USB cameras)
            # Default: use camera's native resolution
            target_width = os.getenv('CAMERA_WIDTH')
            target_height = os.getenv('CAMERA_HEIGHT')
            
            if target_width and target_height:
                self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, int(target_width))
                self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, int(target_height))
                print(f"📹 Camera configured: {target_width}x{target_height}")
            else:
                # Get actual resolution for logging
                actual_width = int(self.camera.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_height = int(self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
                print(f"📹 Camera opened successfully at index {camera_index} ({actual_width}x{actual_height})")
            
            # Optimize for performance: set buffer size to 1 to reduce latency
            self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            while self.is_tracking:
                ret, frame = self.camera.read()
                
                if not ret:
                    print("⚠️ Failed to read frame")
                    break
                
                if self.landmarker:
                    # Convert BGR to RGB
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                    
                    # Get timestamp in ms
                    timestamp_ms = int(time.time() * 1000)
                    
                    # Process frame
                    result = self.landmarker.detect_for_video(mp_image, timestamp_ms)
                    
                    if result.hand_landmarks:
                        # Extract the first hand's landmarks
                        hand_landmarks = result.hand_landmarks[0]
                        gesture_data = self._analyze_gesture(hand_landmarks, timestamp_ms)
                        self.current_gesture = gesture_data
                        
                        # Push gesture to backend if it changed or cooldown expired
                        self._push_gesture_to_backend(gesture_data, timestamp_ms)
                        
                        # Draw landmarks for the debug feed
                        self._draw_landmarks(frame, hand_landmarks)
                    else:
                        self.current_gesture = None
                        # Clear history when hand is lost
                        self.gesture_history.clear()
                    
                    with self.lock:
                        self.latest_frame = frame.copy()
                else:
                    self.current_gesture = None
                
                time.sleep(0.01)  # Faster loop, limited by camera FPS
        
        except Exception as e:
            print(f"❌ Error in tracking loop: {e}")
            self.camera_error = str(e)
        
        finally:
            if self.camera:
                self.camera.release()


    def _analyze_gesture(self, hand_landmarks, timestamp_ms: int) -> Dict:
        """Analyze hand landmarks to determine gesture type"""
        # Tasks API landmark object is slightly different but has x, y, z
        thumb_tip = hand_landmarks[4]
        index_tip = hand_landmarks[8]
        wrist = hand_landmarks[0]
        
        # Calculate average position (using wrist as reference for stability)
        avg_x = wrist.x
        avg_y = wrist.y
        
        # Simple pinch detection
        dist = np.sqrt((thumb_tip.x - index_tip.x)**2 + (thumb_tip.y - index_tip.y)**2)
        
        # Add current position to history for wave detection
        current_pos = {
            'x': float(avg_x),
            'y': float(avg_y),
            'timestamp': timestamp_ms
        }
        self.gesture_history.append(current_pos)
        
        # Detect wave gesture using motion analysis
        wave_detected = self._detect_wave()
        
        # Determine gesture type (wave takes priority)
        if wave_detected:
            gesture_type = 'wave'
            confidence = 0.85
        elif dist < 0.05:
            gesture_type = 'pinch'
            confidence = 0.9
        elif index_tip.y < wrist.y - 0.1:
            gesture_type = 'point'
            confidence = 0.9
        else:
            gesture_type = 'unknown'
            confidence = 0.5
        
        return {
            'type': gesture_type,
            'position': {
                'x': float(avg_x * 2 - 1),
                'y': float(1 - avg_y * 2),
                'z': float(thumb_tip.z)
            },
            'confidence': confidence,
            'timestamp': timestamp_ms,
            'hand': 'detected',
            'landmarks_count': len(hand_landmarks)
        }
    
    def _detect_wave(self) -> bool:
        """Detect wave gesture by analyzing motion patterns"""
        if len(self.gesture_history) < 10:
            return False
        
        # Get recent positions (last 1 second worth, assuming ~30fps)
        recent_positions = list(self.gesture_history)[-20:]
        
        if len(recent_positions) < 10:
            return False
        
        # Calculate horizontal and vertical movement
        x_positions = [p['x'] for p in recent_positions]
        y_positions = [p['y'] for p in recent_positions]
        
        # Calculate velocity changes (direction changes indicate oscillation)
        x_velocities = []
        y_velocities = []
        
        for i in range(1, len(recent_positions)):
            dt = (recent_positions[i]['timestamp'] - recent_positions[i-1]['timestamp']) / 1000.0
            if dt > 0:
                x_vel = (x_positions[i] - x_positions[i-1]) / dt
                y_vel = (y_positions[i] - y_positions[i-1]) / dt
                x_velocities.append(x_vel)
                y_velocities.append(y_vel)
        
        if len(x_velocities) < 5:
            return False
        
        # Count direction changes (sign changes in velocity)
        x_direction_changes = sum(1 for i in range(1, len(x_velocities)) 
                                 if (x_velocities[i] > 0) != (x_velocities[i-1] > 0))
        y_direction_changes = sum(1 for i in range(1, len(y_velocities)) 
                                 if (y_velocities[i] > 0) != (y_velocities[i-1] > 0))
        
        # Calculate movement amplitude
        x_range = max(x_positions) - min(x_positions)
        y_range = max(y_positions) - min(y_positions)
        
        # Wave detection criteria:
        # - At least 3 direction changes in horizontal OR vertical movement
        # - Significant movement amplitude (>0.1 in normalized coordinates)
        # - Movement is primarily in one direction (horizontal OR vertical)
        horizontal_wave = x_direction_changes >= 3 and x_range > 0.1 and x_range > y_range * 1.5
        vertical_wave = y_direction_changes >= 3 and y_range > 0.1 and y_range > x_range * 1.5
        
        return horizontal_wave or vertical_wave

    def _draw_landmarks(self, frame, hand_landmarks):
        """Draw landmarks on the frame for visual debugging"""
        h, w, _ = frame.shape
        for landmark in hand_landmarks:
            cx, cy = int(landmark.x * w), int(landmark.y * h)
            cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1)
        
        # Draw connections for fingers (simplified)
        points = [(0,1), (1,2), (2,3), (3,4), # thumb
                  (0,5), (5,6), (6,7), (7,8), # index
                  (5,9), (9,10), (10,11), (11,12), # middle
                  (9,13), (13,14), (14,15), (15,16), # ring
                  (13,17), (17,18), (18,19), (19,20), (0,17)] # pinky
        
        for p1, p2 in points:
            pt1 = (int(hand_landmarks[p1].x * w), int(hand_landmarks[p1].y * h))
            pt2 = (int(hand_landmarks[p2].x * w), int(hand_landmarks[p2].y * h))
            cv2.line(frame, pt1, pt2, (0, 255, 0), 2)

    def get_current_gesture(self) -> Optional[Dict]:
        return self.current_gesture

    def _push_gesture_to_backend(self, gesture_data: Dict, timestamp_ms: int):
        """Push gesture data to backend when detected (push architecture)"""
        try:
            # Only push if:
            # 1. Gesture type changed, OR
            # 2. Enough time has passed since last push (cooldown), OR
            # 3. It's a wave gesture (always push waves immediately)
            current_time = timestamp_ms
            gesture_changed = (
                self.last_pushed_gesture is None or
                self.last_pushed_gesture.get('type') != gesture_data.get('type')
            )
            cooldown_expired = (current_time - self.last_push_time) >= self.push_cooldown_ms
            is_wave = gesture_data.get('type') == 'wave'
            
            if gesture_changed or (cooldown_expired and is_wave) or (cooldown_expired and gesture_data.get('type') != 'unknown'):
                # Push to backend
                try:
                    response = requests.post(
                        f"{self.backend_url}/api/gestures/process",
                        json=gesture_data,
                        timeout=1.0  # Short timeout to avoid blocking
                    )
                    if response.status_code == 200:
                        self.last_pushed_gesture = gesture_data.copy()
                        self.last_push_time = current_time
                except requests.exceptions.RequestException as e:
                    # Log error but don't crash - backend might be down
                    # Only log occasionally to avoid spam
                    if (current_time - self.last_push_time) > 5000:  # Log every 5 seconds max
                        print(f"⚠️ Failed to push gesture to backend: {e}")
        except Exception as e:
            # Don't let push errors break tracking
            print(f"⚠️ Error pushing gesture: {e}")

    def get_video_frame(self):
        """Get the latest frame for the MJPEG stream"""
        with self.lock:
            if self.latest_frame is None:
                return None
            
            # For higher resolution cameras, resize for streaming to reduce bandwidth
            # while keeping full resolution for gesture detection
            max_stream_width = int(os.getenv('STREAM_MAX_WIDTH', '1280'))
            frame = self.latest_frame
            
            # Resize if frame is larger than max stream width
            h, w = frame.shape[:2]
            if w > max_stream_width:
                scale = max_stream_width / w
                new_width = max_stream_width
                new_height = int(h * scale)
                frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)
            
            # Encode with quality setting (lower for higher res to reduce bandwidth)
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85]
            ret, jpeg = cv2.imencode('.jpg', frame, encode_params)
            return jpeg.tobytes() if ret else None

# Initialize service
gesture_service = GestureRecognitionService()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'vision',
        'tracking': gesture_service.is_tracking,
        'timestamp': int(time.time() * 1000)
    })

@app.route('/gesture', methods=['GET'])
def get_gesture():
    gesture = gesture_service.get_current_gesture()
    return jsonify(gesture if gesture else {'type': 'none', 'message': 'No gesture detected'})

@app.route('/gesture/start', methods=['POST'])
def start_tracking():
    return jsonify(gesture_service.start_tracking())

@app.route('/gesture/stop', methods=['POST'])
def stop_tracking():
    return jsonify(gesture_service.stop_tracking())

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        'service': 'Dixi Vision Service (Modernized)',
        'version': '1.2.0',
        'tracking': gesture_service.is_tracking,
        'mediapipe_tasks': 'ready' if gesture_service.landmarker else 'model_not_found',
        'camera_error': gesture_service.camera_error,
        'timestamp': int(time.time() * 1000)
    })

@app.route('/dashboard')
def dashboard():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            frame = gesture_service.get_video_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')
            time.sleep(0.04)  # ~25 FPS
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/logs')
def get_logs():
    return jsonify(list(log_buffer))

if __name__ == '__main__':
    port = int(os.getenv('VISION_SERVICE_PORT', 5000))
    print(f"🚀 Dixi Vision Service starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
