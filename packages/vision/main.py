from flask import Flask, jsonify, request
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
from flask import Flask, jsonify, request, Response, render_template
from dotenv import load_dotenv

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
            self.camera = cv2.VideoCapture(0)
            
            if not self.camera.isOpened():
                print("❌ Camera not available. No mock data will be generated.")
                self.camera_error = "Camera could not be opened. Check permissions or if another app is using it."
                return
            
            print("📹 Camera opened successfully")
            
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
                        gesture_data = self._analyze_gesture(hand_landmarks)
                        self.current_gesture = gesture_data
                        
                        # Draw landmarks for the debug feed
                        self._draw_landmarks(frame, hand_landmarks)
                    else:
                        self.current_gesture = None
                    
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


    def _analyze_gesture(self, hand_landmarks) -> Dict:
        """Analyze hand landmarks to determine gesture type"""
        # Tasks API landmark object is slightly different but has x, y, z
        thumb_tip = hand_landmarks[4]
        index_tip = hand_landmarks[8]
        wrist = hand_landmarks[0]
        
        # Calculate average position
        avg_x = (thumb_tip.x + index_tip.x) / 2
        avg_y = (thumb_tip.y + index_tip.y) / 2
        
        # Simple pinch detection
        dist = np.sqrt((thumb_tip.x - index_tip.x)**2 + (thumb_tip.y - index_tip.y)**2)
        
        if dist < 0.05:
            gesture_type = 'pinch'
        elif index_tip.y < wrist.y:
            gesture_type = 'point'
        else:
            gesture_type = 'unknown'
        
        return {
            'type': gesture_type,
            'position': {
                'x': float(avg_x * 2 - 1),
                'y': float(1 - avg_y * 2),
                'z': float(thumb_tip.z)
            },
            'confidence': 0.9,
            'timestamp': int(time.time() * 1000),
            'hand': 'detected',
            'landmarks_count': len(hand_landmarks)
        }

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

    def get_video_frame(self):
        """Get the latest frame for the MJPEG stream"""
        with self.lock:
            if self.latest_frame is None:
                return None
            ret, jpeg = cv2.imencode('.jpg', self.latest_frame)
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
