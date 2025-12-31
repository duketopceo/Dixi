"""
Dixi Vision Service - Gesture Recognition & Face Detection
Supports 10 basic gestures: pinch, point, open_palm, fist, swipe_left, swipe_right,
peace, thumbs_up, thumbs_down, ok, wave
Includes MediaPipe face detection with 468 facial landmarks
"""

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


class FaceDetectionService:
    """Face detection using MediaPipe FaceLandmarker."""
    
    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__), 'face_landmarker.task')
        
        if not os.path.exists(model_path):
            print(f"WARNING: Face model file not found at {model_path}")
            print(f"Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task")
            self.landmarker = None
        else:
            try:
                base_options = python.BaseOptions(model_asset_path=model_path)
                options = vision.FaceLandmarkerOptions(
                    base_options=base_options,
                    output_face_blendshapes=True,
                    output_facial_transformation_matrixes=True,
                    num_faces=1,  # Single face for simplicity
                    min_face_detection_confidence=0.5,
                    min_face_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                    running_mode=vision.RunningMode.VIDEO
                )
                self.landmarker = vision.FaceLandmarker.create_from_options(options)
                print("Face Detection Service initialized")
            except Exception as e:
                print(f"ERROR: Failed to initialize face landmarker: {e}")
                self.landmarker = None
        
        self.current_face_data = None
        self.enabled = False
    
    def detect_face(self, mp_image, timestamp_ms: int):
        """Detect face in frame. Returns (face_data, face_landmarks)."""
        if not self.landmarker or not self.enabled:
            return None, None
        
        try:
            result = self.landmarker.detect_for_video(mp_image, timestamp_ms)
            
            if result.face_landmarks and len(result.face_landmarks) > 0:
                face_landmarks = result.face_landmarks[0]
                
                # Calculate face bounding box
                xs = [landmark.x for landmark in face_landmarks]
                ys = [landmark.y for landmark in face_landmarks]
                
                # Get key facial points
                left_eye = face_landmarks[33]  # Left eye outer corner
                right_eye = face_landmarks[263]  # Right eye outer corner
                nose_tip = face_landmarks[4]  # Nose tip
                mouth_center = face_landmarks[13]  # Mouth center
                
                # Calculate head pose (simple estimation)
                eye_center_x = (left_eye.x + right_eye.x) / 2
                eye_center_y = (left_eye.y + right_eye.y) / 2
                nose_x = nose_tip.x
                nose_y = nose_tip.y
                
                # Simple head pose estimation
                head_tilt = np.arctan2(right_eye.y - left_eye.y, right_eye.x - left_eye.x) * 180 / np.pi
                head_turn = (nose_x - eye_center_x) * 30  # Rough estimate
                
                face_data = {
                    'detected': True,
                    'landmarks_count': len(face_landmarks),
                    'bounding_box': {
                        'x_min': float(min(xs)),
                        'y_min': float(min(ys)),
                        'x_max': float(max(xs)),
                        'y_max': float(max(ys)),
                        'width': float(max(xs) - min(xs)),
                        'height': float(max(ys) - min(ys))
                    },
                    'key_points': {
                        'left_eye': {'x': float(left_eye.x), 'y': float(left_eye.y)},
                        'right_eye': {'x': float(right_eye.x), 'y': float(right_eye.y)},
                        'nose_tip': {'x': float(nose_tip.x), 'y': float(nose_tip.y)},
                        'mouth_center': {'x': float(mouth_center.x), 'y': float(mouth_center.y)}
                    },
                    'head_pose': {
                        'tilt': float(head_tilt),
                        'turn': float(head_turn)
                    },
                    'timestamp': timestamp_ms
                }
                
                # Add blendshapes if available
                if result.face_blendshapes and len(result.face_blendshapes) > 0:
                    blendshapes = result.face_blendshapes[0]
                    face_data['expressions'] = {
                        shape.category_name: float(shape.score)
                        for shape in blendshapes[:10]  # Top 10 expressions
                    }
                
                self.current_face_data = face_data
                return face_data, face_landmarks
            else:
                self.current_face_data = None
                return None, None
        except Exception as e:
            print(f"Face detection error: {e}")
            return None, None
    
    def draw_face_landmarks(self, frame, face_landmarks):
        """Draw face landmarks on frame."""
        if not face_landmarks:
            return
        
        h, w, _ = frame.shape
        
        # Draw key facial points
        key_indices = [33, 263, 4, 13]  # Left eye, right eye, nose, mouth
        for idx in key_indices:
            if idx < len(face_landmarks):
                landmark = face_landmarks[idx]
                cx, cy = int(landmark.x * w), int(landmark.y * h)
                cv2.circle(frame, (cx, cy), 5, (255, 0, 255), -1)
        
        # Draw face outline (simplified - just key points)
        outline_indices = [10, 151, 9, 175, 18, 200, 199, 175, 10]  # Face outline
        points = []
        for idx in outline_indices:
            if idx < len(face_landmarks):
                landmark = face_landmarks[idx]
                points.append((int(landmark.x * w), int(landmark.y * h)))
        
        if len(points) > 2:
            cv2.polylines(frame, [np.array(points)], False, (0, 255, 255), 2)
    
    def get_current_face(self) -> Optional[Dict]:
        """Get current face detection data."""
        return self.current_face_data
    
    def enable(self):
        """Enable face detection."""
        self.enabled = True
    
    def disable(self):
        """Disable face detection."""
        self.enabled = False
        self.current_face_data = None


class GestureRecognitionService:
    """Simplified gesture recognition with 10 basic gestures."""
    
    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__), 'hand_landmarker.task')
        
        if not os.path.exists(model_path):
            print(f"ERROR: Model file not found at {model_path}")
            self.landmarker = None
        else:
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.HandLandmarkerOptions(
                base_options=base_options,
                num_hands=1,  # Single hand only for simplicity
                min_hand_detection_confidence=0.7,
                min_hand_presence_confidence=0.5,
                min_tracking_confidence=0.5,
                running_mode=vision.RunningMode.VIDEO
            )
            self.landmarker = vision.HandLandmarker.create_from_options(options)
            print("Gesture Recognition Service initialized (simplified mode)")
        
        self.is_tracking = False
        self.current_gesture = None
        self.camera = None
        self.tracking_thread = None
        self.latest_frame = None
        self.camera_error = None
        self.lock = threading.Lock()
        
        # Simple position history for swipe detection
        self.position_history = collections.deque(maxlen=15)
        
        # Backend push settings
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        self.last_pushed_gesture = None
        self.last_push_time = 0
        self.push_cooldown_ms = 300
        
        # Face detection service
        self.face_service = FaceDetectionService()

    def start_tracking(self):
        if self.is_tracking:
            return {"status": "already_running"}
        
        # Auto-enable face detection when tracking starts
        if self.face_service.landmarker:
            self.face_service.enable()
        
        self.is_tracking = True
        self.tracking_thread = threading.Thread(target=self._track_gestures)
        self.tracking_thread.start()
        
        return {"status": "started", "message": "Gesture tracking started"}

    def stop_tracking(self):
        self.is_tracking = False
        
        if self.camera:
            self.camera.release()
            self.camera = None
        
        if self.tracking_thread:
            self.tracking_thread.join(timeout=2)
            self.tracking_thread = None
        
        return {"status": "stopped", "message": "Gesture tracking stopped"}

    def _track_gestures(self):
        """Main tracking loop - simplified."""
        try:
            camera_index = int(os.getenv('CAMERA_INDEX', '0'))
            self.camera = cv2.VideoCapture(camera_index)
            
            if not self.camera.isOpened():
                print(f"Camera not available at index {camera_index}")
                self.camera_error = f"Camera could not be opened at index {camera_index}. Check permissions or if another app is using it."
                return
            
            # Get camera resolution
            width = int(self.camera.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
            print(f"Camera opened: {width}x{height}")
            
            # Reduce buffer for lower latency
            self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            while self.is_tracking:
                ret, frame = self.camera.read()
                
                if not ret:
                    time.sleep(0.05)
                    continue
                
                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                
                timestamp_ms = int(time.time() * 1000)
                
                # Process hand gestures
                if self.landmarker:
                    result = self.landmarker.detect_for_video(mp_image, timestamp_ms)
                    
                    if result.hand_landmarks and len(result.hand_landmarks) > 0:
                        hand_landmarks = result.hand_landmarks[0]
                        gesture_data = self._analyze_gesture(hand_landmarks, timestamp_ms)
                        self.current_gesture = gesture_data
                        
                        # Draw landmarks
                        self._draw_landmarks(frame, hand_landmarks)
                        
                        # Push to backend
                        self._push_gesture_to_backend(gesture_data, timestamp_ms)
                    else:
                        self.current_gesture = None
                        self.position_history.clear()
                
                # Process face detection
                if self.face_service.enabled:
                    face_data, face_landmarks = self.face_service.detect_face(mp_image, timestamp_ms)
                    if face_data and face_landmarks:
                        self.face_service.draw_face_landmarks(frame, face_landmarks)
                        # Push face data to backend
                        self._push_face_to_backend(face_data, timestamp_ms)
                
                with self.lock:
                    self.latest_frame = frame.copy()
                
                time.sleep(0.03)  # ~30 FPS
        
        except Exception as e:
            print(f"Error in tracking loop: {e}")
            self.camera_error = str(e)
        
        finally:
            if self.camera:
                self.camera.release()

    def _get_finger_states(self, landmarks) -> Dict[str, bool]:
        """Detect which fingers are extended."""
        # Thumb
        thumb_tip = landmarks[4]
        thumb_ip = landmarks[3]
        thumb_mcp = landmarks[2]
        thumb_extended = abs(thumb_tip.x - thumb_mcp.x) > abs(thumb_ip.x - thumb_mcp.x) * 0.5
        
        # Other fingers - tip above PIP joint means extended
        index_extended = landmarks[8].y < landmarks[6].y
        middle_extended = landmarks[12].y < landmarks[10].y
        ring_extended = landmarks[16].y < landmarks[14].y
        pinky_extended = landmarks[20].y < landmarks[18].y
        
        return {
            'thumb': thumb_extended,
            'index': index_extended,
            'middle': middle_extended,
            'ring': ring_extended,
            'pinky': pinky_extended
        }

    def _analyze_gesture(self, landmarks, timestamp_ms: int) -> Dict:
        """Analyze hand landmarks - simplified 10 gesture detection."""
        wrist = landmarks[0]
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        
        # Track position for swipe detection
        self.position_history.append({
            'x': wrist.x,
            'y': wrist.y,
            'time': timestamp_ms
        })
        
        # Get finger states
        fingers = self._get_finger_states(landmarks)
        extended_count = sum(fingers.values())
        
        # Calculate thumb-index distance for pinch
        thumb_index_dist = np.sqrt(
            (thumb_tip.x - index_tip.x)**2 + 
            (thumb_tip.y - index_tip.y)**2
        )
        
        # Detect gesture
        gesture_type = 'unknown'
        confidence = 0.7
        
        # Check for swipe first (motion-based)
        swipe = self._detect_swipe()
        if swipe:
            gesture_type = swipe
            confidence = 0.85
        # Pinch - thumb and index close
        elif thumb_index_dist < 0.05:
            gesture_type = 'pinch'
            confidence = 0.9
        # OK sign - thumb and index form circle, others extended
        elif thumb_index_dist < 0.06 and fingers['middle'] and fingers['ring'] and fingers['pinky']:
            gesture_type = 'ok'
            confidence = 0.85
        # Fist - all fingers closed
        elif extended_count == 0:
            gesture_type = 'fist'
            confidence = 0.9
        # Open palm - all fingers extended
        elif extended_count == 5:
            gesture_type = 'open_palm'
            confidence = 0.9
        # Peace - index and middle extended
        elif fingers['index'] and fingers['middle'] and not fingers['ring'] and not fingers['pinky']:
            gesture_type = 'peace'
            confidence = 0.85
        # Thumbs up - only thumb extended, pointing up
        elif fingers['thumb'] and extended_count == 1 and thumb_tip.y < wrist.y:
            gesture_type = 'thumbs_up'
            confidence = 0.85
        # Thumbs down - only thumb extended, pointing down
        elif fingers['thumb'] and extended_count == 1 and thumb_tip.y > wrist.y:
            gesture_type = 'thumbs_down'
            confidence = 0.85
        # Point - only index extended
        elif fingers['index'] and not fingers['middle'] and not fingers['ring'] and not fingers['pinky']:
            gesture_type = 'point'
            confidence = 0.85
        
        return {
            'type': gesture_type,
            'position': {
                'x': float(wrist.x * 2 - 1),  # Normalize to -1 to 1
                'y': float(1 - wrist.y * 2),
                'z': float(wrist.z) if hasattr(wrist, 'z') else 0
            },
            'confidence': confidence,
            'timestamp': timestamp_ms,
            'fingers': fingers
        }

    def _detect_swipe(self) -> Optional[str]:
        """Simple swipe detection based on position history."""
        if len(self.position_history) < 8:
            return None
        
        history = list(self.position_history)
        
        # Get start and end positions
        start = history[0]
        end = history[-1]
        
        # Calculate movement
        dx = end['x'] - start['x']
        dy = end['y'] - start['y']
        dt = (end['time'] - start['time']) / 1000.0  # seconds
        
        if dt < 0.1:  # Too fast, likely noise
            return None
        
        # Calculate velocity
        velocity = np.sqrt(dx**2 + dy**2) / dt
        
        # Need significant movement and velocity
        if velocity < 0.3:
            return None
        
        # Determine direction
        if abs(dx) > abs(dy) * 1.5:  # Horizontal swipe
            if dx > 0.1:
                return 'swipe_right'
            elif dx < -0.1:
                return 'swipe_left'
        
        return None

    def _draw_landmarks(self, frame, landmarks):
        """Draw landmarks on frame."""
        h, w, _ = frame.shape
        
        # Draw points
        for landmark in landmarks:
            cx, cy = int(landmark.x * w), int(landmark.y * h)
            cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)
        
        # Draw connections
        connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),  # Thumb
            (0, 5), (5, 6), (6, 7), (7, 8),  # Index
            (5, 9), (9, 10), (10, 11), (11, 12),  # Middle
            (9, 13), (13, 14), (14, 15), (15, 16),  # Ring
            (13, 17), (17, 18), (18, 19), (19, 20), (0, 17)  # Pinky
        ]
        
        for p1, p2 in connections:
            pt1 = (int(landmarks[p1].x * w), int(landmarks[p1].y * h))
            pt2 = (int(landmarks[p2].x * w), int(landmarks[p2].y * h))
            cv2.line(frame, pt1, pt2, (0, 255, 0), 2)

    def _push_gesture_to_backend(self, gesture_data: Dict, timestamp_ms: int):
        """Push gesture to backend."""
        try:
            gesture_changed = (
                self.last_pushed_gesture is None or
                self.last_pushed_gesture.get('type') != gesture_data.get('type')
            )
            cooldown_expired = (timestamp_ms - self.last_push_time) >= self.push_cooldown_ms
            
            if gesture_changed or cooldown_expired:
                try:
                    requests.post(
                        f"{self.backend_url}/api/gestures/process",
                        json=gesture_data,
                        timeout=0.5
                    )
                    self.last_pushed_gesture = gesture_data.copy()
                    self.last_push_time = timestamp_ms
                except requests.exceptions.RequestException:
                    pass  # Silently fail - backend might be down
        except Exception:
            pass

    def _push_face_to_backend(self, face_data: Dict, timestamp_ms: int):
        """Push face detection data to backend."""
        try:
            # Use same cooldown mechanism as gestures to prevent spam
            cooldown_expired = (timestamp_ms - self.last_push_time) >= self.push_cooldown_ms
            
            if cooldown_expired and face_data:
                try:
                    requests.post(
                        f"{self.backend_url}/api/faces/process",
                        json=face_data,
                        timeout=0.5
                    )
                    self.last_push_time = timestamp_ms
                except requests.exceptions.RequestException:
                    pass  # Silently fail - backend might be down
        except Exception:
            pass

    def get_current_gesture(self) -> Optional[Dict]:
        return self.current_gesture

    def get_video_frame(self):
        """Get latest frame for MJPEG stream."""
        with self.lock:
            if self.latest_frame is None:
                return None
            
            ret, jpeg = cv2.imencode('.jpg', self.latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            return jpeg.tobytes() if ret else None


# Initialize services
gesture_service = GestureRecognitionService()
face_service = gesture_service.face_service  # Access face service through gesture service


# Routes
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
        'service': 'Dixi Vision Service',
        'version': '2.1.0',
        'mode': 'simplified',
        'gestures': ['pinch', 'point', 'open_palm', 'fist', 'swipe_left', 'swipe_right', 
                     'peace', 'thumbs_up', 'thumbs_down', 'ok'],
        'tracking': gesture_service.is_tracking,
        'mediapipe': 'ready' if gesture_service.landmarker else 'model_not_found',
        'face_detection': {
            'enabled': face_service.enabled,
            'available': face_service.landmarker is not None,
            'model_loaded': face_service.landmarker is not None
        },
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


@app.route('/capture_frame', methods=['GET'])
def capture_frame():
    """Capture a single frame for AI vision analysis."""
    frame = gesture_service.get_video_frame()
    if frame:
        return Response(frame, mimetype='image/jpeg')
    else:
        return jsonify({'error': 'No frame available'}), 503


@app.route('/capture_frame_base64', methods=['GET'])
def capture_frame_base64():
    """Capture a single frame as base64 for AI vision analysis."""
    import base64
    frame = gesture_service.get_video_frame()
    if frame:
        frame_base64 = base64.b64encode(frame).decode('utf-8')
        return jsonify({
            'image': frame_base64,
            'format': 'jpeg',
            'timestamp': int(time.time() * 1000)
        })
    else:
        return jsonify({'error': 'No frame available'}), 503


# Face Detection Routes
@app.route('/face', methods=['GET'])
def get_face():
    """Get current face detection data."""
    face_data = face_service.get_current_face()
    return jsonify(face_data if face_data else {'detected': False, 'message': 'No face detected'})


@app.route('/face/start', methods=['POST'])
def start_face_detection():
    """Enable face detection."""
    face_service.enable()
    return jsonify({
        'status': 'started',
        'message': 'Face detection enabled',
        'available': face_service.landmarker is not None
    })


@app.route('/face/stop', methods=['POST'])
def stop_face_detection():
    """Disable face detection."""
    face_service.disable()
    return jsonify({
        'status': 'stopped',
        'message': 'Face detection disabled'
    })


@app.route('/face/status', methods=['GET'])
def get_face_status():
    """Get face detection status."""
    return jsonify({
        'enabled': face_service.enabled,
        'available': face_service.landmarker is not None,
        'current_face': face_service.get_current_face() is not None,
        'model_loaded': face_service.landmarker is not None
    })


if __name__ == '__main__':
    port = int(os.getenv('VISION_SERVICE_PORT', 5001))
    print(f"Dixi Vision Service starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
