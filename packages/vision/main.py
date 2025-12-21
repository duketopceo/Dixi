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
        self.motion_history = collections.deque(maxlen=50)  # Extended for complex motion patterns
        self.two_hand_distance_history = collections.deque(maxlen=20)  # Track distance between hands for clap/stretch detection
        # Push architecture: backend URL and last pushed gesture
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        self.last_pushed_gesture = None
        self.last_push_time = 0
        self.push_cooldown_ms = 200  # Minimum time between pushes (ms)
        # Gesture state tracking
        self.last_gesture_type = None
        self.gesture_hold_time = {}  # Track how long a gesture has been held
        self.last_pinch_time = None
        self.last_pinch_distance = None
        self.previous_finger_count = None
        
        # Gesture priority hierarchy to prevent conflicts
        self.GESTURE_PRIORITY = {
            'high': ['pinch', 'ok', 'peace', 'double_tap'],  # Check first - most specific
            'medium': ['point_up', 'point_down', 'point_left', 'point_right', 
                      'swipe_left', 'swipe_right', 'swipe_up', 'swipe_down',
                      'zoom_in', 'zoom_out', 'grab', 'release'],  # Directional/motion
            'low': ['fist', 'open_palm', 'thumbs_up', 'thumbs_down', 
                   'three', 'four', 'five', 'wave', 'rock', 'spiderman', 'gun']  # Generic shapes - check last
        }

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
            
            # Camera watchdog: detect frame timeouts and auto-restart
            last_frame_time = time.time()
            FRAME_TIMEOUT = 5.0  # 5 seconds timeout
            camera_restart_count = 0
            MAX_RESTARTS = 3  # Max restarts before giving up
            
            while self.is_tracking:
                ret, frame = self.camera.read()
                current_time = time.time()
                
                if not ret:
                    print("⚠️ Failed to read frame")
                    # Check if we've been waiting too long for a frame
                    if current_time - last_frame_time > FRAME_TIMEOUT:
                        print("❌ Camera feed timeout detected - restarting camera")
                        if camera_restart_count >= MAX_RESTARTS:
                            print(f"❌ Max camera restarts ({MAX_RESTARTS}) reached. Stopping tracking.")
                            self.camera_error = "Camera timeout - max restarts reached"
                            break
                        
                        # Restart camera
                        try:
                            self.camera.release()
                            time.sleep(1)  # Give camera time to release
                            self.camera = cv2.VideoCapture(camera_index)
                            
                            if not self.camera.isOpened():
                                print(f"❌ Failed to reopen camera at index {camera_index}")
                                camera_restart_count += 1
                                time.sleep(2)  # Wait before retry
                                continue
                            
                            # Reconfigure camera settings
                            if target_width and target_height:
                                self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, int(target_width))
                                self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, int(target_height))
                            self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                            
                            camera_restart_count += 1
                            last_frame_time = current_time
                            print(f"✅ Camera restarted (attempt {camera_restart_count}/{MAX_RESTARTS})")
                            continue
                        except Exception as e:
                            print(f"❌ Error restarting camera: {e}")
                            camera_restart_count += 1
                            time.sleep(2)
                            continue
                    else:
                        # Just a temporary read failure, wait a bit
                        time.sleep(0.1)
                        continue
                
                # Update last frame time on successful read
                if ret:
                    last_frame_time = current_time
                    camera_restart_count = 0  # Reset restart count on successful frame
                
                if self.landmarker:
                    # Convert BGR to RGB
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                    
                    # Get timestamp in ms
                    timestamp_ms = int(time.time() * 1000)
                    
                    # Process frame
                    result = self.landmarker.detect_for_video(mp_image, timestamp_ms)
                    
                    if result.hand_landmarks:
                        num_hands = len(result.hand_landmarks)
                        
                        # Handle two-hand gestures
                        if num_hands == 2:
                            hand1_landmarks = result.hand_landmarks[0]
                            hand2_landmarks = result.hand_landmarks[1]
                            
                            # Detect two-hand gestures
                            two_hand_gesture = self._detect_two_hand_gesture(hand1_landmarks, hand2_landmarks, timestamp_ms)
                            if two_hand_gesture:
                                gesture_data = two_hand_gesture
                            else:
                                # Default to primary hand (first detected)
                                gesture_data = self._analyze_gesture(hand1_landmarks, timestamp_ms)
                                gesture_data['hand'] = 'both'
                            
                            # Draw both hands
                            self._draw_landmarks(frame, hand1_landmarks)
                            self._draw_landmarks(frame, hand2_landmarks)
                        else:
                            # Single hand
                            hand_landmarks = result.hand_landmarks[0]
                            gesture_data = self._analyze_gesture(hand_landmarks, timestamp_ms)
                            gesture_data['hand'] = 'single'
                            self._draw_landmarks(frame, hand_landmarks)
                        
                        self.current_gesture = gesture_data
                        
                        # Push gesture to backend if it changed or cooldown expired
                        self._push_gesture_to_backend(gesture_data, timestamp_ms)
                    else:
                        self.current_gesture = None
                        # Clear history when hand is lost
                        self.gesture_history.clear()
                        self.motion_history.clear()
                    
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


    def _detect_finger_states(self, hand_landmarks) -> Dict[str, bool]:
        """Detect which fingers are extended (True) or bent (False)"""
        # Landmark indices: 0=wrist, 4=thumb_tip, 8=index_tip, 12=middle_tip, 16=ring_tip, 20=pinky_tip
        # For each finger, check if tip is above the joint before it
        thumb_tip = hand_landmarks[4]
        thumb_ip = hand_landmarks[3]  # Thumb IP joint
        thumb_extended = thumb_tip.x > thumb_ip.x if thumb_tip.x > hand_landmarks[0].x else thumb_tip.x < thumb_ip.x
        
        index_tip = hand_landmarks[8]
        index_pip = hand_landmarks[6]  # Index PIP joint
        index_extended = index_tip.y < index_pip.y
        
        middle_tip = hand_landmarks[12]
        middle_pip = hand_landmarks[10]
        middle_extended = middle_tip.y < middle_pip.y
        
        ring_tip = hand_landmarks[16]
        ring_pip = hand_landmarks[14]
        ring_extended = ring_tip.y < ring_pip.y
        
        pinky_tip = hand_landmarks[20]
        pinky_pip = hand_landmarks[18]
        pinky_extended = pinky_tip.y < pinky_pip.y
        
        return {
            'thumb': thumb_extended,
            'index': index_extended,
            'middle': middle_extended,
            'ring': ring_extended,
            'pinky': pinky_extended
        }
    
    def _detect_hand_orientation(self, hand_landmarks) -> Dict[str, float]:
        """Calculate hand orientation (pitch, yaw, roll)"""
        wrist = hand_landmarks[0]
        middle_mcp = hand_landmarks[9]  # Middle finger MCP
        index_mcp = hand_landmarks[5]   # Index finger MCP
        
        # Calculate vectors
        # Roll: rotation around the axis from wrist to middle finger
        wrist_to_middle = np.array([middle_mcp.x - wrist.x, middle_mcp.y - wrist.y])
        roll = np.arctan2(wrist_to_middle[1], wrist_to_middle[0])
        
        # Pitch: vertical orientation (how much hand is tilted up/down)
        index_to_pinky = np.array([
            hand_landmarks[17].x - index_mcp.x,
            hand_landmarks[17].y - index_mcp.y
        ])
        pitch = np.arctan2(index_to_pinky[1], index_to_pinky[0])
        
        # Yaw: horizontal orientation (pointing left/right)
        wrist_to_index = np.array([index_mcp.x - wrist.x, index_mcp.y - wrist.y])
        yaw = np.arctan2(wrist_to_index[1], wrist_to_index[0])
        
        return {
            'pitch': float(np.degrees(pitch)),
            'yaw': float(np.degrees(yaw)),
            'roll': float(np.degrees(roll))
        }
    
    def _detect_motion_pattern(self, timestamp_ms: int) -> Dict[str, any]:
        """Analyze motion patterns from gesture history"""
        if len(self.motion_history) < 10:
            return {'pattern': 'none', 'velocity': 0.0, 'direction': 0.0}
        
        recent = list(self.motion_history)[-20:]
        if len(recent) < 10:
            return {'pattern': 'none', 'velocity': 0.0, 'direction': 0.0}
        
        # Calculate velocities
        velocities = []
        directions = []
        for i in range(1, len(recent)):
            dt = (recent[i]['timestamp'] - recent[i-1]['timestamp']) / 1000.0
            if dt > 0:
                dx = recent[i]['x'] - recent[i-1]['x']
                dy = recent[i]['y'] - recent[i-1]['y']
                vel = np.sqrt(dx**2 + dy**2) / dt
                direction = np.arctan2(dy, dx)
                velocities.append(vel)
                directions.append(direction)
        
        if len(velocities) < 5:
            return {'pattern': 'none', 'velocity': 0.0, 'direction': 0.0}
        
        avg_velocity = np.mean(velocities)
        avg_direction = np.mean(directions)
        
        # Detect patterns
        x_positions = [p['x'] for p in recent]
        y_positions = [p['y'] for p in recent]
        x_range = max(x_positions) - min(x_positions)
        y_range = max(y_positions) - min(y_positions)
        
        # Circular motion detection
        center_x = np.mean(x_positions)
        center_y = np.mean(y_positions)
        distances_from_center = [np.sqrt((p['x'] - center_x)**2 + (p['y'] - center_y)**2) for p in recent]
        distance_variance = np.var(distances_from_center)
        is_circular = distance_variance < 0.01 and avg_velocity > 0.1
        
        # Figure-8 detection (two circles)
        if is_circular and len(recent) > 15:
            # Check for two distinct centers
            mid_point = len(recent) // 2
            center1 = (np.mean([p['x'] for p in recent[:mid_point]]), np.mean([p['y'] for p in recent[:mid_point]]))
            center2 = (np.mean([p['x'] for p in recent[mid_point:]]), np.mean([p['y'] for p in recent[mid_point:]]))
            center_distance = np.sqrt((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)
            is_figure_eight = center_distance > 0.1 and distance_variance < 0.015
        
        # Swipe detection
        is_swipe_left = x_range > 0.15 and avg_direction < -2.5 and avg_velocity > 0.2
        is_swipe_right = x_range > 0.15 and avg_direction > 0.5 and avg_velocity > 0.2
        is_swipe_up = y_range > 0.15 and -1.5 < avg_direction < -0.5 and avg_velocity > 0.2
        is_swipe_down = y_range > 0.15 and 0.5 < avg_direction < 1.5 and avg_velocity > 0.2
        
        # Shake detection (rapid back and forth)
        direction_changes = sum(1 for i in range(1, len(directions)) 
                               if abs(directions[i] - directions[i-1]) > 2.0)
        is_shake = direction_changes > 3 and avg_velocity > 0.3
        
        pattern = 'none'
        if is_figure_eight:
            pattern = 'figure_eight'
        elif is_circular:
            # Determine rotation direction
            angle_changes = [directions[i] - directions[i-1] for i in range(1, len(directions))]
            avg_angle_change = np.mean([a if abs(a) < np.pi else (a - 2*np.pi if a > 0 else a + 2*np.pi) for a in angle_changes])
            pattern = 'rotate_clockwise' if avg_angle_change > 0 else 'rotate_counterclockwise'
        elif is_swipe_left:
            pattern = 'swipe_left'
        elif is_swipe_right:
            pattern = 'swipe_right'
        elif is_swipe_up:
            pattern = 'swipe_up'
        elif is_swipe_down:
            pattern = 'swipe_down'
        elif is_shake:
            pattern = 'shake'
        
        return {
            'pattern': pattern,
            'velocity': float(avg_velocity),
            'direction': float(np.degrees(avg_direction))
        }
    
    def _analyze_gesture(self, hand_landmarks, timestamp_ms: int) -> Dict:
        """Analyze hand landmarks to determine gesture type - supports 30+ gestures"""
        # Get key landmarks
        thumb_tip = hand_landmarks[4]
        thumb_ip = hand_landmarks[3]
        index_tip = hand_landmarks[8]
        index_pip = hand_landmarks[6]
        index_mcp = hand_landmarks[5]
        middle_tip = hand_landmarks[12]
        middle_pip = hand_landmarks[10]
        ring_tip = hand_landmarks[16]
        ring_pip = hand_landmarks[14]
        pinky_tip = hand_landmarks[20]
        pinky_pip = hand_landmarks[18]
        wrist = hand_landmarks[0]
        
        # Calculate position
        avg_x = wrist.x
        avg_y = wrist.y
        
        # Add to history
        current_pos = {
            'x': float(avg_x),
            'y': float(avg_y),
            'timestamp': timestamp_ms
        }
        self.gesture_history.append(current_pos)
        self.motion_history.append(current_pos)
        
        # Get finger states, orientation, and motion
        finger_states = self._detect_finger_states(hand_landmarks)
        orientation = self._detect_hand_orientation(hand_landmarks)
        motion = self._detect_motion_pattern(timestamp_ms)
        
        # Calculate distances
        thumb_index_dist = np.sqrt((thumb_tip.x - index_tip.x)**2 + (thumb_tip.y - index_tip.y)**2)
        index_middle_dist = np.sqrt((index_tip.x - middle_tip.x)**2 + (index_tip.y - middle_tip.y)**2)
        
        # Count extended fingers
        extended_count = sum([finger_states['thumb'], finger_states['index'], 
                             finger_states['middle'], finger_states['ring'], finger_states['pinky']])
        
        gesture_type = 'unknown'
        confidence = 0.5
        
        # Gesture detection with priority hierarchy to prevent conflicts
        detected = False
        
        # Priority 1: Motion-based gestures (highest priority - they override static)
        if motion['pattern'] != 'none':
            gesture_type = motion['pattern']
            confidence = 0.85
            detected = True
        
        # Priority 2: High-priority specific gestures (pinch, ok, peace, etc.)
        if not detected:
            # Special handling for double_tap (needs timing)
            if 'double_tap' in self.GESTURE_PRIORITY['high']:
                if thumb_index_dist < 0.05:
                    current_time = timestamp_ms
                    if self.last_pinch_time is not None:
                        time_since_last = current_time - self.last_pinch_time
                        if 200 < time_since_last < 800:  # 200-800ms between pinches
                            gesture_type = 'double_tap'
                            confidence = 0.85
                            detected = True
                            self.last_pinch_time = None
                        else:
                            self.last_pinch_time = current_time
                            self.last_pinch_distance = thumb_index_dist
                    else:
                        self.last_pinch_time = current_time
                        self.last_pinch_distance = thumb_index_dist
            
            # Check other high-priority gestures
            if not detected:
                for gesture_name in self.GESTURE_PRIORITY['high']:
                    if gesture_name == 'double_tap':
                        continue  # Already handled above
                    if self._check_gesture(gesture_name, hand_landmarks, finger_states, thumb_index_dist, orientation):
                        gesture_type = gesture_name
                        confidence = 0.9
                        detected = True
                        break
        
        # Priority 3: Medium-priority directional/motion gestures
        if not detected:
            # Special handling for zoom_in/zoom_out (needs distance tracking)
            if thumb_index_dist < 0.05 and self.last_pinch_distance is not None:
                if thumb_index_dist > self.last_pinch_distance * 1.2:
                    gesture_type = 'zoom_in'
                    confidence = 0.8
                    detected = True
                elif thumb_index_dist < self.last_pinch_distance * 0.8:
                    gesture_type = 'zoom_out'
                    confidence = 0.8
                    detected = True
                self.last_pinch_distance = thumb_index_dist
            
            # Special handling for grab/release (needs finger count tracking)
            if not detected:
                current_finger_count = extended_count
                if self.previous_finger_count is not None:
                    if self.previous_finger_count > current_finger_count + 1:
                        gesture_type = 'grab'
                        confidence = 0.8
                        detected = True
                    elif self.previous_finger_count < current_finger_count - 1:
                        gesture_type = 'release'
                        confidence = 0.8
                        detected = True
                self.previous_finger_count = current_finger_count
            
            # Check other medium-priority gestures
            if not detected:
                for gesture_name in self.GESTURE_PRIORITY['medium']:
                    if gesture_name in ['zoom_in', 'zoom_out', 'grab', 'release']:
                        continue  # Already handled above
                    if self._check_gesture(gesture_name, hand_landmarks, finger_states, thumb_index_dist, orientation):
                        gesture_type = gesture_name
                        confidence = 0.85
                        detected = True
                        break
        
        # Priority 4: Low-priority generic shapes (check last)
        if not detected:
            # Wave detection (special case - uses motion history)
            if self._detect_wave():
                gesture_type = 'wave'
                confidence = 0.85
                detected = True
            else:
                for gesture_name in self.GESTURE_PRIORITY['low']:
                    if self._check_gesture(gesture_name, hand_landmarks, finger_states, thumb_index_dist, orientation):
                        gesture_type = gesture_name
                        confidence = 0.85
                        detected = True
                        break
        
        # Update gesture hold time
        if gesture_type == self.last_gesture_type:
            self.gesture_hold_time[gesture_type] = self.gesture_hold_time.get(gesture_type, 0) + 1
        else:
            self.gesture_hold_time.clear()
            self.gesture_hold_time[gesture_type] = 1
            self.last_gesture_type = gesture_type
        
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
            'landmarks_count': len(hand_landmarks),
            'finger_states': finger_states,
            'orientation': orientation,
            'motion': motion
        }
    
    def _check_gesture(self, gesture_name: str, hand_landmarks, finger_states: Dict, 
                      thumb_index_dist: float, orientation: Optional[Dict] = None) -> bool:
        """Check if a specific gesture matches current hand state"""
        thumb_tip = hand_landmarks[4]
        index_tip = hand_landmarks[8]
        middle_tip = hand_landmarks[12]
        ring_tip = hand_landmarks[16]
        pinky_tip = hand_landmarks[20]
        wrist = hand_landmarks[0]
        
        extended_count = sum([finger_states['thumb'], finger_states['index'], 
                             finger_states['middle'], finger_states['ring'], finger_states['pinky']])
        
        gesture_checks = {
            'fist': not finger_states['thumb'] and not finger_states['index'] and \
                   not finger_states['middle'] and not finger_states['ring'] and not finger_states['pinky'],
            'open_palm': extended_count == 5,
            'thumbs_up': finger_states['thumb'] and not finger_states['index'] and \
                        not finger_states['middle'] and not finger_states['ring'] and not finger_states['pinky'] and \
                        thumb_tip.y < wrist.y,
            'thumbs_down': finger_states['thumb'] and not finger_states['index'] and \
                          not finger_states['middle'] and not finger_states['ring'] and not finger_states['pinky'] and \
                          thumb_tip.y > wrist.y,
            'peace': finger_states['index'] and finger_states['middle'] and \
                    not finger_states['ring'] and not finger_states['pinky'],
            'ok': thumb_index_dist < 0.05 and finger_states['middle'] and \
                 finger_states['ring'] and finger_states['pinky'],
            'rock': finger_states['index'] and finger_states['pinky'] and \
                   not finger_states['middle'] and not finger_states['ring'],
            'spiderman': not finger_states['middle'] and not finger_states['ring'] and \
                        finger_states['thumb'] and finger_states['index'] and finger_states['pinky'],
            'gun': finger_states['index'] and not finger_states['middle'] and \
                  not finger_states['ring'] and not finger_states['pinky'] and thumb_tip.y < index_tip.y,
            'three': finger_states['thumb'] and finger_states['index'] and finger_states['middle'] and \
                    not finger_states['ring'] and not finger_states['pinky'],
            'four': not finger_states['thumb'] and finger_states['index'] and \
                   finger_states['middle'] and finger_states['ring'] and finger_states['pinky'],
            'five': extended_count == 5,
            'pinch': thumb_index_dist < 0.05,
            'point': finger_states['index'] and index_tip.y < wrist.y - 0.1,
            'point_up': finger_states['index'] and not finger_states['middle'] and \
                       index_tip.y < wrist.y - 0.15 and orientation and -45 < orientation['yaw'] < 45,
            'point_down': finger_states['index'] and not finger_states['middle'] and \
                         index_tip.y < wrist.y - 0.15 and orientation and (orientation['yaw'] > 135 or orientation['yaw'] < -135),
            'point_left': finger_states['index'] and not finger_states['middle'] and \
                         index_tip.y < wrist.y - 0.15 and orientation and -135 < orientation['yaw'] < -45,
            'point_right': finger_states['index'] and not finger_states['middle'] and \
                          index_tip.y < wrist.y - 0.15 and orientation and 45 < orientation['yaw'] < 135,
        }
        
        return gesture_checks.get(gesture_name, False)
    
    def _detect_two_hand_gesture(self, hand1_landmarks, hand2_landmarks, timestamp_ms: int) -> Optional[Dict]:
        """Detect gestures requiring two hands"""
        wrist1 = hand1_landmarks[0]
        wrist2 = hand2_landmarks[0]
        
        # Calculate distance between hands
        hand_distance = np.sqrt((wrist1.x - wrist2.x)**2 + (wrist1.y - wrist2.y)**2)
        
        # Store current distance in history for tracking
        self.two_hand_distance_history.append({
            'distance': hand_distance,
            'timestamp': timestamp_ms
        })
        
        # Clap detection - hands coming together (need enough history)
        if len(self.two_hand_distance_history) >= 5:
            prev_distances = [d['distance'] for d in list(self.two_hand_distance_history)[-5:-1]]
            
            if len(prev_distances) > 0 and hand_distance < min(prev_distances) * 0.7:
                return {
                    'type': 'clap',
                    'position': {
                        'x': float(((wrist1.x + wrist2.x) / 2) * 2 - 1),
                        'y': float(1 - ((wrist1.y + wrist2.y) / 2) * 2),
                        'z': float((wrist1.z + wrist2.z) / 2)
                    },
                    'confidence': 0.85,
                    'timestamp': timestamp_ms,
                    'hand': 'both',
                    'landmarks_count': len(hand1_landmarks) + len(hand2_landmarks)
                }
        
        # Stretch detection - hands moving apart (need enough history)
        if len(self.two_hand_distance_history) >= 5:
            prev_distances = [d['distance'] for d in list(self.two_hand_distance_history)[-5:-1]]
            
            if len(prev_distances) > 0 and hand_distance > max(prev_distances) * 1.3:
                return {
                    'type': 'stretch',
                    'position': {
                        'x': float(((wrist1.x + wrist2.x) / 2) * 2 - 1),
                        'y': float(1 - ((wrist1.y + wrist2.y) / 2) * 2),
                        'z': float((wrist1.z + wrist2.z) / 2)
                    },
                    'confidence': 0.85,
                    'timestamp': timestamp_ms,
                    'hand': 'both',
                    'landmarks_count': len(hand1_landmarks) + len(hand2_landmarks)
                }
        
        # Point both - both hands pointing
        finger_states1 = self._detect_finger_states(hand1_landmarks)
        finger_states2 = self._detect_finger_states(hand2_landmarks)
        
        if finger_states1['index'] and finger_states2['index'] and \
           not finger_states1['middle'] and not finger_states2['middle']:
            return {
                'type': 'point_both',
                'position': {
                    'x': float(((wrist1.x + wrist2.x) / 2) * 2 - 1),
                    'y': float(1 - ((wrist1.y + wrist2.y) / 2) * 2),
                    'z': float((wrist1.z + wrist2.z) / 2)
                },
                'confidence': 0.8,
                'timestamp': timestamp_ms,
                'hand': 'both',
                'landmarks_count': len(hand1_landmarks) + len(hand2_landmarks)
            }
        
        return None
    
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
    # Accept refresh parameter to force new connection (used for cache busting, value not needed)
    _ = request.args.get('refresh', None)  # noqa: F841 - intentionally unused for cache busting
    
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
