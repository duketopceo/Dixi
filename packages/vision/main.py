"""
Dixi Vision Service - Unified Tracking (Face, Hands, Body, Eyes)
Supports dual hand tracking, body pose, enhanced eye tracking, and face detection
Uses MediaPipe Tasks API for efficient multi-model inference
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
from unified_tracking import UnifiedTrackingService

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
                
                # Eye landmarks for gaze and open/closed detection
                left_eye_top = face_landmarks[159]  # Left eye top
                left_eye_bottom = face_landmarks[145]  # Left eye bottom
                right_eye_top = face_landmarks[386]  # Right eye top
                right_eye_bottom = face_landmarks[374]  # Right eye bottom
                
                # Mouth landmarks for open/closed and smile detection
                mouth_left = face_landmarks[61]  # Mouth left corner
                mouth_right = face_landmarks[291]  # Mouth right corner
                mouth_top = face_landmarks[13]  # Upper lip
                mouth_bottom = face_landmarks[14]  # Lower lip
                
                # Calculate head pose (simple estimation)
                eye_center_x = (left_eye.x + right_eye.x) / 2
                eye_center_y = (left_eye.y + right_eye.y) / 2
                nose_x = nose_tip.x
                nose_y = nose_tip.y
                
                # Simple head pose estimation
                head_tilt = np.arctan2(right_eye.y - left_eye.y, right_eye.x - left_eye.x) * 180 / np.pi
                head_turn = (nose_x - eye_center_x) * 30  # Rough estimate
                
                # Eye open/closed detection
                left_eye_height = abs(left_eye_top.y - left_eye_bottom.y)
                right_eye_height = abs(right_eye_top.y - right_eye_bottom.y)
                left_eye_open = left_eye_height > 0.01  # Threshold for open
                right_eye_open = right_eye_height > 0.01
                
                # Eye gaze direction (simplified - based on eye position relative to face center)
                face_center_x = (min(xs) + max(xs)) / 2
                left_eye_gaze_x = (left_eye.x - face_center_x) * 2  # Normalize to -1 to 1
                right_eye_gaze_x = (right_eye.x - face_center_x) * 2
                eye_gaze_direction = (left_eye_gaze_x + right_eye_gaze_x) / 2
                
                # Mouth open/closed detection
                mouth_height = abs(mouth_top.y - mouth_bottom.y)
                mouth_width = abs(mouth_right.x - mouth_left.x)
                mouth_open = mouth_height > 0.015  # Threshold for open mouth
                mouth_open_ratio = mouth_height / mouth_width if mouth_width > 0 else 0
                
                # Smile detection (mouth corners raised)
                mouth_corner_avg_y = (mouth_left.y + mouth_right.y) / 2
                mouth_center_y = mouth_center.y
                smile_score = max(0, (mouth_center_y - mouth_corner_avg_y) * 10)  # Positive when corners are higher
                is_smiling = smile_score > 0.1
                
                # Attention/engagement score (based on head pose and eye state)
                # Lower tilt and turn = more engaged, eyes open = more engaged
                head_straightness = 1 - (abs(head_tilt) / 45) - (abs(head_turn) / 30)
                head_straightness = max(0, min(1, head_straightness))
                eye_engagement = 1.0 if (left_eye_open and right_eye_open) else 0.5
                engagement_score = (head_straightness * 0.6 + eye_engagement * 0.4)
                
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
                    'eye_features': {
                        'left_eye_open': bool(left_eye_open),
                        'right_eye_open': bool(right_eye_open),
                        'both_eyes_open': bool(left_eye_open and right_eye_open),
                        'gaze_direction': float(eye_gaze_direction),  # -1 (left) to 1 (right)
                        'left_eye_height': float(left_eye_height),
                        'right_eye_height': float(right_eye_height)
                    },
                    'mouth_features': {
                        'mouth_open': bool(mouth_open),
                        'mouth_open_ratio': float(mouth_open_ratio),
                        'smile_score': float(smile_score),
                        'is_smiling': bool(is_smiling),
                        'mouth_width': float(mouth_width)
                    },
                    'engagement': {
                        'score': float(engagement_score),  # 0 to 1
                        'head_straightness': float(head_straightness),
                        'eye_engagement': float(eye_engagement),
                        'is_engaged': bool(engagement_score > 0.6)
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


# GestureRecognitionService has been removed - use UnifiedTrackingService instead
# All gesture functionality is now handled by UnifiedTrackingService
# The old class (previously ~350 lines) has been removed to reduce code duplication


# Initialize services
unified_tracking_service = UnifiedTrackingService()
# Face service is now part of unified tracking, but keep standalone for legacy routes
face_service = FaceDetectionService()


# Routes
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'vision',
        'tracking': unified_tracking_service.is_tracking,
        'timestamp': int(time.time() * 1000)
    })


# Old /gesture endpoints removed - use /tracking endpoints instead
# These endpoints are deprecated and will be removed in a future version
# Please migrate to /tracking/start and /tracking/stop


@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        'service': 'Dixi Vision Service',
        'version': '2.1.0',
        'mode': 'simplified',
        'gestures': ['pinch', 'point', 'open_palm', 'fist', 'swipe_left', 'swipe_right', 
                     'peace', 'thumbs_up', 'thumbs_down', 'ok'],
        'tracking': unified_tracking_service.is_tracking,
        'mediapipe': 'ready' if unified_tracking_service.hand_landmarker else 'model_not_found',
        'face_detection': {
            'enabled': face_service.enabled,
            'available': face_service.landmarker is not None,
            'model_loaded': face_service.landmarker is not None
        },
        'camera_error': unified_tracking_service.camera_error,
        'timestamp': int(time.time() * 1000)
    })


@app.route('/dashboard')
def dashboard():
    return render_template('index.html')


@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            frame = unified_tracking_service.get_video_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')
            time.sleep(0.04)  # ~25 FPS
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/logs')
def get_logs():
    """Get vision service logs with optional filtering."""
    level = request.args.get('level', type=str)
    limit = request.args.get('limit', default=100, type=int)
    
    logs = list(log_buffer)
    
    # Filter by level if provided
    if level:
        logs = [log for log in logs if level.upper() in log.upper()]
    
    # Apply limit
    logs = logs[-limit:] if limit > 0 else logs
    
    return jsonify(logs)


@app.route('/capture_frame', methods=['GET'])
def capture_frame():
    """Capture a single frame for AI vision analysis."""
    frame = unified_tracking_service.get_video_frame()
    if frame:
        return Response(frame, mimetype='image/jpeg')
    else:
        return jsonify({'error': 'No frame available'}), 503


@app.route('/capture_frame_base64', methods=['GET'])
def capture_frame_base64():
    """Capture a single frame as base64 for AI vision analysis."""
    import base64
    frame = unified_tracking_service.get_video_frame()
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


# Unified Tracking Routes
@app.route('/tracking', methods=['GET'])
def get_tracking():
    """Get unified tracking data (face, hands, body, eyes)."""
    tracking_data = unified_tracking_service.get_current_tracking()
    return jsonify(tracking_data if tracking_data else {
        'face': None,
        'hands': {'left': None, 'right': None},
        'body': None,
        'eyes': None,
        'timestamp': int(time.time() * 1000)
    })


@app.route('/tracking/start', methods=['POST'])
def start_unified_tracking():
    """Start unified tracking."""
    return jsonify(unified_tracking_service.start_tracking())


@app.route('/tracking/stop', methods=['POST'])
def stop_unified_tracking():
    """Stop unified tracking."""
    return jsonify(unified_tracking_service.stop_tracking())


@app.route('/tracking/status', methods=['GET'])
def get_tracking_status():
    """Get unified tracking status."""
    return jsonify({
        'hand_tracking': unified_tracking_service.hand_landmarker is not None,
        'face_tracking': unified_tracking_service.face_landmarker is not None,
        'pose_tracking': unified_tracking_service.pose_landmarker is not None,
        'dual_hands': True,
        'current_data': unified_tracking_service.get_current_tracking() is not None
    })


# Configuration endpoints
@app.route('/config', methods=['GET'])
def get_config():
    """Get current vision service configuration."""
    from config import get_config
    config = get_config()
    return jsonify({
        'config': config.to_dict(),
        'timestamp': int(time.time() * 1000)
    })


@app.route('/config', methods=['POST'])
def update_config():
    """Update vision service configuration."""
    from config import get_config, reload_config
    try:
        updates = request.json
        if not updates:
            return jsonify({'error': 'No configuration provided'}), 400
        
        config = get_config()
        config.update(updates)
        
        # Reload config in unified tracking service
        # Note: This requires restarting tracking for some changes to take effect
        unified_tracking_service.config = config
        unified_tracking_service.frame_skip_interval = config.frame_skip_interval
        unified_tracking_service.push_cooldown_ms = config.backend_push_cooldown_ms
        unified_tracking_service.adaptive_fps = config.adaptive_fps
        
        return jsonify({
            'message': 'Configuration updated',
            'config': config.to_dict(),
            'timestamp': int(time.time() * 1000),
            'note': 'Some changes may require restarting tracking to take effect'
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to update configuration',
            'details': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('VISION_SERVICE_PORT', 5001))
    print(f"Dixi Vision Service starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
