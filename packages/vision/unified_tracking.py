"""
Unified Tracking Service - Combines face, hands, body pose, and eye tracking
Uses MediaPipe Tasks API for efficient multi-model inference
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import os
import time
import threading
from typing import Dict, Optional, Tuple, List
import collections
import requests
from config import get_config


class UnifiedTrackingService:
    """Unified tracking service using MediaPipe for face, hands, body, and eyes."""
    
    def __init__(self):
        """Initialize all MediaPipe models."""
        # Load configuration
        self.config = get_config()
        
        self.hand_landmarker = None
        self.face_landmarker = None
        self.pose_landmarker = None
        
        # Initialize hand landmarker (2 hands) - always enabled
        hand_model_path = os.path.join(os.path.dirname(__file__), 'hand_landmarker.task')
        if os.path.exists(hand_model_path):
            try:
                base_options = python.BaseOptions(model_asset_path=hand_model_path)
                options = vision.HandLandmarkerOptions(
                    base_options=base_options,
                    num_hands=2,  # Dual hand tracking
                    min_hand_detection_confidence=0.7,
                    min_hand_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                    running_mode=vision.RunningMode.VIDEO
                )
                self.hand_landmarker = vision.HandLandmarker.create_from_options(options)
                print("Hand Landmarker initialized (2 hands)")
            except Exception as e:
                print(f"ERROR: Failed to initialize hand landmarker: {e}")
        
        # Initialize face landmarker (conditional based on config)
        if self.config.enable_face_tracking:
            face_model_path = os.path.join(os.path.dirname(__file__), 'face_landmarker.task')
            if os.path.exists(face_model_path):
                try:
                    base_options = python.BaseOptions(model_asset_path=face_model_path)
                    options = vision.FaceLandmarkerOptions(
                        base_options=base_options,
                        output_face_blendshapes=True,
                        output_facial_transformation_matrixes=True,
                        num_faces=1,
                        min_face_detection_confidence=0.5,
                        min_face_presence_confidence=0.5,
                        min_tracking_confidence=0.5,
                        running_mode=vision.RunningMode.VIDEO
                    )
                    self.face_landmarker = vision.FaceLandmarker.create_from_options(options)
                    print("Face Landmarker initialized")
                except Exception as e:
                    print(f"ERROR: Failed to initialize face landmarker: {e}")
        else:
            print("Face tracking disabled in config")
        
        # Initialize pose landmarker (conditional based on config)
        if self.config.enable_pose_tracking:
            pose_model_path = os.path.join(os.path.dirname(__file__), 'pose_landmarker.task')
            if os.path.exists(pose_model_path):
                try:
                    base_options = python.BaseOptions(model_asset_path=pose_model_path)
                    options = vision.PoseLandmarkerOptions(
                        base_options=base_options,
                        output_segmentation_masks=False,
                        num_poses=1,
                        min_pose_detection_confidence=0.5,
                        min_pose_presence_confidence=0.5,
                        min_tracking_confidence=0.5,
                        running_mode=vision.RunningMode.VIDEO
                    )
                    self.pose_landmarker = vision.PoseLandmarker.create_from_options(options)
                    print("Pose Landmarker initialized")
                except Exception as e:
                    print(f"ERROR: Failed to initialize pose landmarker: {e}")
        else:
            print("Pose tracking disabled in config")
        
        # Tracking state
        self.current_tracking_data = None
        self.hand_position_history = {
            'left': collections.deque(maxlen=15),
            'right': collections.deque(maxlen=15)
        }
        
        # Performance optimization: frame skipping (from config)
        self.frame_skip_counter = 0
        self.frame_skip_interval = self.config.frame_skip_interval
        
        # Batch update settings
        self.update_batch = []
        self.batch_size = 3  # Batch 3 frames before pushing
        self.last_batch_push = 0
        self.batch_interval_ms = 100  # Push batch every 100ms
        
        # Camera and tracking loop
        self.is_tracking = False
        self.camera = None
        self.tracking_thread = None
        self.latest_frame = None
        self.camera_error = None
        self.lock = threading.Lock()
        
        # Backend push settings (from config)
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        self.last_push_time = 0
        self.push_cooldown_ms = self.config.backend_push_cooldown_ms
        
        # Adaptive FPS settings
        self.adaptive_fps = self.config.adaptive_fps
        self.last_activity_time = time.time()
        self.current_fps_target = self.config.adaptive_active_fps if self.config.adaptive_fps else 30
    
    def process_frame(self, mp_image, timestamp_ms: int) -> Dict:
        """Process a single frame and return unified tracking data."""
        self.frame_skip_counter += 1
        if self.frame_skip_counter % self.frame_skip_interval != 0:
            return self.current_tracking_data or self._empty_tracking_data(timestamp_ms)
        
        tracking_data = {
            'face': None,
            'hands': {'left': None, 'right': None},
            'body': None,
            'eyes': None,
            'timestamp': timestamp_ms
        }
        
        # Process face (includes eye data) - conditional based on config
        if self.config.enable_face_tracking and self.face_landmarker:
            face_data, eye_data = self._process_face(mp_image, timestamp_ms)
            tracking_data['face'] = face_data
            tracking_data['eyes'] = eye_data
            # Update activity time if face detected
            if face_data:
                self.last_activity_time = time.time()
        
        # Process hands (dual hand tracking) - always enabled
        if self.hand_landmarker:
            hands_data = self._process_hands(mp_image, timestamp_ms)
            tracking_data['hands'] = hands_data
            # Update activity time if hands detected
            if hands_data.get('left') or hands_data.get('right'):
                self.last_activity_time = time.time()
        
        # Process body pose - conditional based on config
        if self.config.enable_pose_tracking and self.pose_landmarker:
            body_data = self._process_pose(mp_image, timestamp_ms)
            tracking_data['body'] = body_data
            # Update activity time if pose detected
            if body_data:
                self.last_activity_time = time.time()
        
        self.current_tracking_data = tracking_data
        return tracking_data
    
    def _process_face(self, mp_image, timestamp_ms: int) -> Tuple[Optional[Dict], Optional[Dict]]:
        """Process face detection and extract face + eye data."""
        try:
            result = self.face_landmarker.detect_for_video(mp_image, timestamp_ms)
            
            if not result.face_landmarks or len(result.face_landmarks) == 0:
                return None, None
            
            face_landmarks = result.face_landmarks[0]
            
            # Calculate face bounding box
            xs = [lm.x for lm in face_landmarks]
            ys = [lm.y for lm in face_landmarks]
            
            # Key facial points
            left_eye = face_landmarks[33]
            right_eye = face_landmarks[263]
            nose_tip = face_landmarks[4]
            mouth_center = face_landmarks[13]
            
            # Eye landmarks for detailed tracking
            left_eye_top = face_landmarks[159]
            left_eye_bottom = face_landmarks[145]
            left_eye_left = face_landmarks[33]
            left_eye_right = face_landmarks[133]
            right_eye_top = face_landmarks[386]
            right_eye_bottom = face_landmarks[374]
            right_eye_left = face_landmarks[362]
            right_eye_right = face_landmarks[263]
            
            # Iris landmarks (if available in face mesh)
            # MediaPipe FaceLandmarker has 468 landmarks, with iris at the end
            # Left iris center: 468, Right iris center: 473 (if available)
            # Fallback to eye center if iris landmarks not available
            if len(face_landmarks) > 473:
                left_iris = face_landmarks[468]
                right_iris = face_landmarks[473]
            else:
                # Use eye center as fallback
                left_iris = left_eye
                right_iris = right_eye
            
            # Head pose
            eye_center_x = (left_eye.x + right_eye.x) / 2
            head_tilt = np.arctan2(right_eye.y - left_eye.y, right_eye.x - left_eye.x) * 180 / np.pi
            head_turn = (nose_tip.x - eye_center_x) * 30
            
            # Eye open/closed
            left_eye_height = abs(left_eye_top.y - left_eye_bottom.y)
            right_eye_height = abs(right_eye_top.y - right_eye_bottom.y)
            left_eye_open = left_eye_height > 0.01
            right_eye_open = right_eye_height > 0.01
            
            # Enhanced eye tracking: gaze direction
            # Calculate gaze based on iris position relative to eye center
            left_eye_center_x = (left_eye_left.x + left_eye_right.x) / 2
            left_eye_center_y = (left_eye_top.y + left_eye_bottom.y) / 2
            right_eye_center_x = (right_eye_left.x + right_eye_right.x) / 2
            right_eye_center_y = (right_eye_top.y + right_eye_bottom.y) / 2
            
            # Gaze direction vector (normalized)
            left_gaze_x = (left_iris.x - left_eye_center_x) * 2
            left_gaze_y = (left_iris.y - left_eye_center_y) * 2
            right_gaze_x = (right_iris.x - right_eye_center_x) * 2
            right_gaze_y = (right_iris.y - right_eye_center_y) * 2
            
            # Combined gaze
            combined_gaze_x = (left_gaze_x + right_gaze_x) / 2
            combined_gaze_y = (left_gaze_y + right_gaze_y) / 2
            # Estimate depth (z) based on eye convergence
            gaze_convergence = abs(left_gaze_x - right_gaze_x)
            combined_gaze_z = 1.0 - min(1.0, gaze_convergence * 2)  # Closer = higher z
            
            # Mouth features
            mouth_left = face_landmarks[61]
            mouth_right = face_landmarks[291]
            mouth_top = face_landmarks[13]
            mouth_bottom = face_landmarks[14]
            mouth_height = abs(mouth_top.y - mouth_bottom.y)
            mouth_width = abs(mouth_right.x - mouth_left.x)
            mouth_open = mouth_height > 0.015
            mouth_open_ratio = mouth_height / mouth_width if mouth_width > 0 else 0
            
            mouth_corner_avg_y = (mouth_left.y + mouth_right.y) / 2
            smile_score = max(0, (mouth_center.y - mouth_corner_avg_y) * 10)
            is_smiling = smile_score > 0.1
            
            # Engagement
            head_straightness = 1 - (abs(head_tilt) / 45) - (abs(head_turn) / 30)
            head_straightness = max(0, min(1, head_straightness))
            eye_engagement = 1.0 if (left_eye_open and right_eye_open) else 0.5
            engagement_score = (head_straightness * 0.6 + eye_engagement * 0.4)
            
            # Face data
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
                'mouth_features': {
                    'mouth_open': bool(mouth_open),
                    'mouth_open_ratio': float(mouth_open_ratio),
                    'smile_score': float(smile_score),
                    'is_smiling': bool(is_smiling),
                    'mouth_width': float(mouth_width)
                },
                'engagement': {
                    'score': float(engagement_score),
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
                    for shape in blendshapes[:10]
                }
            
            # Eye tracking data
            eye_data = {
                'left_eye': {
                    'gaze_direction': {
                        'x': float(left_gaze_x),
                        'y': float(left_gaze_y),
                        'z': 0.0  # Depth estimation would require stereo
                    },
                    'iris_position': {
                        'x': float(left_iris.x),
                        'y': float(left_iris.y)
                    },
                    'is_open': bool(left_eye_open),
                    'eye_height': float(left_eye_height)
                },
                'right_eye': {
                    'gaze_direction': {
                        'x': float(right_gaze_x),
                        'y': float(right_gaze_y),
                        'z': 0.0
                    },
                    'iris_position': {
                        'x': float(right_iris.x),
                        'y': float(right_iris.y)
                    },
                    'is_open': bool(right_eye_open),
                    'eye_height': float(right_eye_height)
                },
                'combined_gaze': {
                    'x': float(combined_gaze_x),
                    'y': float(combined_gaze_y),
                    'z': float(combined_gaze_z)
                },
                'attention_score': float(engagement_score * (1.0 if left_eye_open and right_eye_open else 0.7))
            }
            
            return face_data, eye_data
            
        except Exception as e:
            print(f"Face processing error: {e}")
            return None, None
    
    def _process_hands(self, mp_image, timestamp_ms: int) -> Dict:
        """Process dual hand tracking."""
        hands_data = {'left': None, 'right': None}
        
        try:
            result = self.hand_landmarker.detect_for_video(mp_image, timestamp_ms)
            
            if not result.hand_landmarks or len(result.hand_landmarks) == 0:
                return hands_data
            
            # Process each detected hand
            for idx, hand_landmarks in enumerate(result.hand_landmarks):
                if idx >= 2:  # Max 2 hands
                    break
                
                # Determine hand label (left/right)
                # MediaPipe provides hand_world_landmarks for better 3D positioning
                # Use wrist position and thumb to determine handedness
                wrist = hand_landmarks[0]
                thumb_tip = hand_landmarks[4]
                index_tip = hand_landmarks[8]
                
                # Simple handedness: if thumb is to the left of wrist, it's likely a right hand
                # (from camera perspective, mirrored)
                is_right_hand = thumb_tip.x < wrist.x
                hand_label = 'right' if is_right_hand else 'left'
                
                # If we already have data for this hand, keep the one with higher confidence
                if hands_data[hand_label] is not None:
                    # Use the hand that's more centered (better tracking)
                    current_wrist_x = abs(hands_data[hand_label]['position']['x'])
                    new_wrist_x = abs(wrist.x * 2 - 1)
                    if new_wrist_x > current_wrist_x:
                        continue  # Keep existing hand
                
                # Analyze gesture
                gesture_data = self._analyze_hand_gesture(hand_landmarks, hand_label, timestamp_ms)
                hands_data[hand_label] = gesture_data
                
                # Update position history
                self.hand_position_history[hand_label].append({
                    'x': wrist.x,
                    'y': wrist.y,
                    'time': timestamp_ms
                })
            
            return hands_data
            
        except Exception as e:
            print(f"Hand processing error: {e}")
            return hands_data
    
    def _analyze_hand_gesture(self, landmarks, hand_label: str, timestamp_ms: int) -> Dict:
        """Analyze hand landmarks to detect gesture."""
        wrist = landmarks[0]
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        
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
        
        # Check for swipe
        swipe = self._detect_swipe(hand_label)
        if swipe:
            gesture_type = swipe
            confidence = 0.85
        elif thumb_index_dist < 0.05:
            gesture_type = 'pinch'
            confidence = 0.9
        elif thumb_index_dist < 0.06 and fingers['middle'] and fingers['ring'] and fingers['pinky']:
            gesture_type = 'ok'
            confidence = 0.85
        elif extended_count == 0:
            gesture_type = 'fist'
            confidence = 0.9
        elif extended_count == 5:
            gesture_type = 'open_palm'
            confidence = 0.9
        elif fingers['index'] and fingers['middle'] and not fingers['ring'] and not fingers['pinky']:
            gesture_type = 'peace'
            confidence = 0.85
        elif fingers['thumb'] and extended_count == 1 and thumb_tip.y < wrist.y:
            gesture_type = 'thumbs_up'
            confidence = 0.85
        elif fingers['thumb'] and extended_count == 1 and thumb_tip.y > wrist.y:
            gesture_type = 'thumbs_down'
            confidence = 0.85
        elif fingers['index'] and not fingers['middle'] and not fingers['ring'] and not fingers['pinky']:
            gesture_type = 'point'
            confidence = 0.85
        
        return {
            'detected': True,
            'landmarks': [{'x': float(lm.x), 'y': float(lm.y), 'z': float(lm.z) if hasattr(lm, 'z') else 0.0} 
                         for lm in landmarks],
            'gesture': gesture_type,
            'position': {
                'x': float(wrist.x * 2 - 1),  # Normalize to -1 to 1
                'y': float(1 - wrist.y * 2),
                'z': float(wrist.z) if hasattr(wrist, 'z') else 0
            },
            'confidence': confidence,
            'fingers': fingers,
            'timestamp': timestamp_ms
        }
    
    def _get_finger_states(self, landmarks) -> Dict[str, bool]:
        """Detect which fingers are extended."""
        thumb_tip = landmarks[4]
        thumb_ip = landmarks[3]
        thumb_mcp = landmarks[2]
        thumb_extended = abs(thumb_tip.x - thumb_mcp.x) > abs(thumb_ip.x - thumb_mcp.x) * 0.5
        
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
    
    def _detect_swipe(self, hand_label: str) -> Optional[str]:
        """Detect swipe gesture for a specific hand."""
        history = self.hand_position_history[hand_label]
        if len(history) < 8:
            return None
        
        history_list = list(history)
        start = history_list[0]
        end = history_list[-1]
        
        dx = end['x'] - start['x']
        dy = end['y'] - start['y']
        dt = (end['time'] - start['time']) / 1000.0
        
        if dt < 0.1:
            return None
        
        velocity = np.sqrt(dx**2 + dy**2) / dt
        if velocity < 0.3:
            return None
        
        if abs(dx) > abs(dy) * 1.5:
            if dx > 0.1:
                return 'swipe_right'
            elif dx < -0.1:
                return 'swipe_left'
        
        return None
    
    def _process_pose(self, mp_image, timestamp_ms: int) -> Optional[Dict]:
        """Process body pose tracking."""
        try:
            result = self.pose_landmarker.detect_for_video(mp_image, timestamp_ms)
            
            if not result.pose_landmarks or len(result.pose_landmarks) == 0:
                return None
            
            pose_landmarks = result.pose_landmarks[0]
            
            # Extract key body points
            # MediaPipe Pose has 33 landmarks
            # Key indices: 0=nose, 2=left_eye, 5=right_eye, 7=left_ear, 8=right_ear
            # 11=left_shoulder, 12=right_shoulder, 13=left_elbow, 14=right_elbow
            # 15=left_wrist, 16=right_wrist, 23=left_hip, 24=right_hip
            # 25=left_knee, 26=right_knee, 27=left_ankle, 28=right_ankle
            
            nose = pose_landmarks[0]
            left_shoulder = pose_landmarks[11]
            right_shoulder = pose_landmarks[12]
            left_hip = pose_landmarks[23]
            right_hip = pose_landmarks[24]
            left_knee = pose_landmarks[25]
            right_knee = pose_landmarks[26]
            
            # Calculate body orientation
            shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2
            hip_center_x = (left_hip.x + right_hip.x) / 2
            shoulder_center_y = (left_shoulder.y + right_shoulder.y) / 2
            hip_center_y = (left_hip.y + right_hip.y) / 2
            
            # Body orientation angles
            body_pitch = np.arctan2(hip_center_y - shoulder_center_y, 
                                   abs(hip_center_x - shoulder_center_x)) * 180 / np.pi
            body_yaw = (shoulder_center_x - hip_center_x) * 30
            body_roll = np.arctan2(right_shoulder.y - left_shoulder.y,
                                  right_shoulder.x - left_shoulder.x) * 180 / np.pi
            
            # Detect posture
            # Standing: knees below hips, shoulders above hips
            # Sitting: knees at similar level to hips
            # Leaning: significant body pitch
            knee_avg_y = (left_knee.y + right_knee.y) / 2
            hip_avg_y = (left_hip.y + right_hip.y) / 2
            
            if abs(knee_avg_y - hip_avg_y) < 0.1:
                posture = 'sitting'
            elif abs(body_pitch) > 20:
                posture = 'leaning'
            elif hip_avg_y < knee_avg_y:
                posture = 'standing'
            else:
                posture = 'unknown'
            
            # Extract all landmarks
            landmarks = [{'x': float(lm.x), 'y': float(lm.y), 'z': float(lm.z) if hasattr(lm, 'z') else 0.0}
                        for lm in pose_landmarks]
            
            return {
                'detected': True,
                'landmarks': landmarks,
                'landmarks_count': len(pose_landmarks),
                'posture': posture,
                'orientation': {
                    'pitch': float(body_pitch),
                    'yaw': float(body_yaw),
                    'roll': float(body_roll)
                },
                'key_points': {
                    'nose': {'x': float(nose.x), 'y': float(nose.y)},
                    'left_shoulder': {'x': float(left_shoulder.x), 'y': float(left_shoulder.y)},
                    'right_shoulder': {'x': float(right_shoulder.x), 'y': float(right_shoulder.y)},
                    'left_hip': {'x': float(left_hip.x), 'y': float(left_hip.y)},
                    'right_hip': {'x': float(right_hip.x), 'y': float(right_hip.y)}
                },
                'timestamp': timestamp_ms
            }
            
        except Exception as e:
            print(f"Pose processing error: {e}")
            return None
    
    def _empty_tracking_data(self, timestamp_ms: int) -> Dict:
        """Return empty tracking data structure."""
        return {
            'face': None,
            'hands': {'left': None, 'right': None},
            'body': None,
            'eyes': None,
            'timestamp': timestamp_ms
        }
    
    def get_current_tracking(self) -> Optional[Dict]:
        """Get current tracking data."""
        return self.current_tracking_data
    
    def start_tracking(self):
        """Start unified tracking loop."""
        if self.is_tracking:
            return {"status": "already_running"}
        
        self.is_tracking = True
        self.tracking_thread = threading.Thread(target=self._tracking_loop)
        self.tracking_thread.start()
        
        return {"status": "started", "message": "Unified tracking started"}
    
    def stop_tracking(self):
        """Stop unified tracking loop."""
        self.is_tracking = False
        
        if self.camera:
            self.camera.release()
            self.camera = None
        
        if self.tracking_thread:
            self.tracking_thread.join(timeout=2)
            self.tracking_thread = None
        
        return {"status": "stopped", "message": "Unified tracking stopped"}
    
    def _tracking_loop(self):
        """Main tracking loop that processes camera frames."""
        try:
            camera_index = int(os.getenv('CAMERA_INDEX', '0'))
            self.camera = cv2.VideoCapture(camera_index)
            
            if not self.camera.isOpened():
                print(f"Camera not available at index {camera_index}")
                self.camera_error = f"Camera could not be opened at index {camera_index}."
                return
            
            width = int(self.camera.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
            print(f"Camera opened: {width}x{height}")
            
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
                
                # Process unified tracking
                tracking_data = self.process_frame(mp_image, timestamp_ms)
                
                # Draw overlays on frame
                self._draw_overlays(frame, tracking_data)
                
                # Push to backend
                self._push_to_backend(tracking_data, timestamp_ms)
                
                with self.lock:
                    self.latest_frame = frame.copy()
                
                # Adaptive FPS: adjust sleep based on activity
                if self.adaptive_fps:
                    time_since_activity = time.time() - self.last_activity_time
                    if time_since_activity > self.config.adaptive_idle_timeout_seconds:
                        # Idle: use lower FPS
                        self.current_fps_target = self.config.adaptive_idle_fps
                        sleep_time = 1.0 / self.config.adaptive_idle_fps
                    else:
                        # Active: use higher FPS
                        self.current_fps_target = self.config.adaptive_active_fps
                        sleep_time = 1.0 / self.config.adaptive_active_fps
                else:
                    # Fixed FPS: ~30 FPS (0.033s per frame)
                    sleep_time = 0.033
                
                time.sleep(sleep_time)
        
        except Exception as e:
            print(f"Error in tracking loop: {e}")
            self.camera_error = str(e)
        
        finally:
            if self.camera:
                self.camera.release()
    
    def _draw_overlays(self, frame, tracking_data: Dict):
        """Draw tracking overlays on frame."""
        h, w, _ = frame.shape
        
        # Draw hands
        if tracking_data.get('hands'):
            for hand_label in ['left', 'right']:
                hand = tracking_data['hands'][hand_label]
                if hand and hand.get('landmarks'):
                    landmarks = hand['landmarks']
                    # Draw hand landmarks
                    for lm in landmarks:
                        cx, cy = int(lm['x'] * w), int(lm['y'] * h)
                        cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)
        
        # Draw face bounding box
        if tracking_data.get('face') and tracking_data['face'].get('bounding_box'):
            bbox = tracking_data['face']['bounding_box']
            x1 = int(bbox['x_min'] * w)
            y1 = int(bbox['y_min'] * h)
            x2 = int(bbox['x_max'] * w)
            y2 = int(bbox['y_max'] * h)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)
        
        # Draw body pose skeleton (simplified)
        if tracking_data.get('body') and tracking_data['body'].get('landmarks'):
            landmarks = tracking_data['body']['landmarks']
            # Draw key points
            key_indices = [0, 2, 5, 7, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
            for idx in key_indices:
                if idx < len(landmarks):
                    lm = landmarks[idx]
                    cx, cy = int(lm['x'] * w), int(lm['y'] * h)
                    cv2.circle(frame, (cx, cy), 5, (255, 0, 255), -1)
    
    def _push_to_backend(self, tracking_data: Dict, timestamp_ms: int):
        """Push unified tracking data to backend (with batching)."""
        try:
            # Add to batch
            self.update_batch.append(tracking_data)
            
            # Check if we should push batch
            should_push = (
                len(self.update_batch) >= self.batch_size or
                (timestamp_ms - self.last_batch_push) >= self.batch_interval_ms
            )
            
            if should_push and len(self.update_batch) > 0:
                # Use the most recent tracking data from batch
                latest_data = self.update_batch[-1]
                
                cooldown_expired = (timestamp_ms - self.last_push_time) >= self.push_cooldown_ms
                
                if cooldown_expired:
                    try:
                        requests.post(
                            f"{self.backend_url}/api/tracking/process",
                            json=latest_data,
                            timeout=0.5
                        )
                        self.last_push_time = timestamp_ms
                        self.last_batch_push = timestamp_ms
                    except requests.exceptions.RequestException:
                        pass  # Silently fail
                
                # Clear batch
                self.update_batch.clear()
        except Exception:
            pass
    
    def get_video_frame(self):
        """Get latest frame for MJPEG stream."""
        with self.lock:
            if self.latest_frame is None:
                return None
            
            ret, jpeg = cv2.imencode('.jpg', self.latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            return jpeg.tobytes() if ret else None
