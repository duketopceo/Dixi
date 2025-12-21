from flask import Flask, jsonify, request
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import threading
import time
from typing import Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

class GestureRecognitionService:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        self.is_tracking = False
        self.current_gesture = None
        self.camera = None
        self.tracking_thread = None
        
        print("🤖 Gesture Recognition Service initialized")
        print(f"📹 MediaPipe Hands model loaded")

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
            # Try to open camera (may not be available in all environments)
            self.camera = cv2.VideoCapture(0)
            
            if not self.camera.isOpened():
                print("⚠️ Camera not available, using simulated data")
                self._simulate_gestures()
                return
            
            print("📹 Camera opened successfully")
            
            while self.is_tracking:
                ret, frame = self.camera.read()
                
                if not ret:
                    print("⚠️ Failed to read frame")
                    break
                
                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Process frame with MediaPipe
                results = self.hands.process(rgb_frame)
                
                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        gesture_data = self._analyze_gesture(hand_landmarks)
                        self.current_gesture = gesture_data
                else:
                    self.current_gesture = None
                
                time.sleep(0.033)  # ~30 FPS
        
        except Exception as e:
            print(f"❌ Error in tracking loop: {e}")
            self._simulate_gestures()
        
        finally:
            if self.camera:
                self.camera.release()

    def _simulate_gestures(self):
        """Simulate gesture data when camera is not available"""
        print("🎭 Simulating gesture data")
        
        gesture_types = ['point', 'swipe_left', 'swipe_right', 'pinch', 'grab', 'open_palm']
        
        while self.is_tracking:
            # Simulate gesture with random data
            gesture_type = gesture_types[int(time.time()) % len(gesture_types)]
            
            self.current_gesture = {
                'type': gesture_type,
                'position': {
                    'x': np.sin(time.time()) * 0.5,
                    'y': np.cos(time.time()) * 0.5,
                    'z': 0.0
                },
                'confidence': 0.85 + np.random.random() * 0.1,
                'timestamp': int(time.time() * 1000),
                'hand': 'right',
                'landmarks_count': 21
            }
            
            time.sleep(0.5)  # Update every 500ms

    def _analyze_gesture(self, hand_landmarks) -> Dict:
        """Analyze hand landmarks to determine gesture type"""
        # Get key landmark positions
        thumb_tip = hand_landmarks.landmark[4]
        index_tip = hand_landmarks.landmark[8]
        middle_tip = hand_landmarks.landmark[12]
        ring_tip = hand_landmarks.landmark[16]
        pinky_tip = hand_landmarks.landmark[20]
        wrist = hand_landmarks.landmark[0]
        
        # Calculate average position
        avg_x = (thumb_tip.x + index_tip.x + middle_tip.x) / 3
        avg_y = (thumb_tip.y + index_tip.y + middle_tip.y) / 3
        avg_z = (thumb_tip.z + index_tip.z + middle_tip.z) / 3
        
        # Simple gesture classification
        # Distance between thumb and index finger
        thumb_index_dist = np.sqrt(
            (thumb_tip.x - index_tip.x) ** 2 +
            (thumb_tip.y - index_tip.y) ** 2 +
            (thumb_tip.z - index_tip.z) ** 2
        )
        
        if thumb_index_dist < 0.05:
            gesture_type = 'pinch'
        elif index_tip.y < wrist.y and middle_tip.y > wrist.y:
            gesture_type = 'point'
        elif all(tip.y < wrist.y for tip in [index_tip, middle_tip, ring_tip, pinky_tip]):
            gesture_type = 'open_palm'
        else:
            gesture_type = 'unknown'
        
        return {
            'type': gesture_type,
            'position': {
                'x': float(avg_x * 2 - 1),  # Normalize to [-1, 1]
                'y': float(1 - avg_y * 2),  # Invert Y and normalize
                'z': float(avg_z)
            },
            'confidence': 0.9,
            'timestamp': int(time.time() * 1000),
            'hand': 'detected',
            'landmarks_count': len(hand_landmarks.landmark)
        }

    def get_current_gesture(self) -> Optional[Dict]:
        """Get the current gesture data"""
        return self.current_gesture

# Initialize service
gesture_service = GestureRecognitionService()

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
    """Get current gesture data"""
    gesture = gesture_service.get_current_gesture()
    
    if gesture:
        return jsonify(gesture)
    else:
        return jsonify({
            'type': 'none',
            'message': 'No gesture detected'
        }), 200

@app.route('/gesture/start', methods=['POST'])
def start_tracking():
    """Start gesture tracking"""
    result = gesture_service.start_tracking()
    return jsonify(result)

@app.route('/gesture/stop', methods=['POST'])
def stop_tracking():
    """Stop gesture tracking"""
    result = gesture_service.stop_tracking()
    return jsonify(result)

@app.route('/status', methods=['GET'])
def get_status():
    """Get service status"""
    return jsonify({
        'service': 'Dixi Vision Service',
        'version': '1.0.0',
        'tracking': gesture_service.is_tracking,
        'mediapipe': 'loaded',
        'opencv': cv2.__version__,
        'timestamp': int(time.time() * 1000)
    })

if __name__ == '__main__':
    port = int(os.getenv('VISION_SERVICE_PORT', 5000))
    print(f"🚀 Dixi Vision Service starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
