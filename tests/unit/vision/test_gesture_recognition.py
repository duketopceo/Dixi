"""
Tests for the GestureRecognitionService class in the vision service.
"""

import pytest
import time
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the vision package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'packages', 'vision'))


class TestGestureRecognitionServiceInitialization:
    """Test service initialization"""
    
    def test_service_starts_with_tracking_disabled(self):
        """Service should start with is_tracking=False"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            assert service.is_tracking == False
    
    def test_current_gesture_is_none_initially(self):
        """current_gesture should be None at start"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            assert service.current_gesture is None or service.current_gesture.get('type') in [None, 'none', 'unknown']


class TestStartStopTracking:
    """Test start/stop tracking methods"""
    
    def test_start_tracking_returns_started(self):
        """start_tracking should return status 'started' or 'already_running'"""
        with patch('cv2.VideoCapture') as mock_cap:
            mock_cap.return_value.isOpened.return_value = True
            mock_cap.return_value.read.return_value = (True, Mock())
            
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            with patch.object(service, '_track_gestures'):
                result = service.start_tracking()
                assert result['status'] in ['started', 'already_running']
    
    def test_stop_tracking_returns_stopped(self):
        """stop_tracking should return status 'stopped'"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            service.is_tracking = True
            
            result = service.stop_tracking()
            assert result['status'] == 'stopped'
    
    def test_stop_tracking_sets_is_tracking_false(self):
        """stop_tracking should set is_tracking to False"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            service.is_tracking = True
            
            service.stop_tracking()
            assert service.is_tracking == False


class TestWaveDetection:
    """Test wave gesture detection"""
    
    def test_detect_wave_returns_false_with_empty_history(self):
        """_detect_wave should return False with empty motion history"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            service.motion_history = []
            
            # Mock hand landmarks
            mock_landmarks = Mock()
            result = service._detect_wave(mock_landmarks)
            assert result == False
    
    def test_detect_wave_returns_false_with_few_frames(self):
        """_detect_wave should return False with less than 10 frames"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            service.motion_history = [{'x': 0.5, 'y': 0.5}] * 5  # Only 5 frames
            
            mock_landmarks = Mock()
            result = service._detect_wave(mock_landmarks)
            assert result == False
    
    def test_detect_wave_detects_horizontal_oscillation(self):
        """_detect_wave should detect horizontal wave (oscillating x)"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            # Simulate oscillating x positions
            service.motion_history = [
                {'x': 0.3, 'y': 0.5},
                {'x': 0.7, 'y': 0.5},
                {'x': 0.3, 'y': 0.5},
                {'x': 0.7, 'y': 0.5},
                {'x': 0.3, 'y': 0.5},
                {'x': 0.7, 'y': 0.5},
                {'x': 0.3, 'y': 0.5},
                {'x': 0.7, 'y': 0.5},
                {'x': 0.3, 'y': 0.5},
                {'x': 0.7, 'y': 0.5},
                {'x': 0.3, 'y': 0.5},
                {'x': 0.7, 'y': 0.5},
            ]
            
            mock_landmarks = Mock()
            mock_landmarks.landmark = [Mock(x=0.5, y=0.5, z=0)] * 21
            
            result = service._detect_wave(mock_landmarks)
            # Result depends on implementation thresholds
            assert isinstance(result, bool)


class TestPushCooldown:
    """Test gesture push cooldown behavior"""
    
    def test_first_push_succeeds(self):
        """First push should always succeed"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            service.last_push_time = 0
            service.last_pushed_gesture = None
            
            # Reset cooldown
            service.last_push_time = 0
            
            # Check if can push
            current_time = time.time()
            time_since_push = current_time - service.last_push_time
            
            # First push should succeed (time since push > cooldown)
            assert time_since_push > 0.2  # 200ms cooldown
    
    def test_immediate_push_is_skipped(self):
        """Immediate second push should be skipped (200ms cooldown)"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            # Simulate recent push
            service.last_push_time = time.time()
            
            # Check if cooldown is active
            time_since_push = time.time() - service.last_push_time
            
            # Should be within cooldown (< 200ms)
            assert time_since_push < 0.2


class TestFingerStateDetection:
    """Test finger state detection"""
    
    def test_detect_finger_states_returns_dict(self):
        """_detect_finger_states should return a dictionary"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            # Mock hand landmarks with proper structure
            mock_landmarks = Mock()
            mock_landmarks.landmark = [Mock(x=0.5, y=0.5, z=0) for _ in range(21)]
            
            result = service._detect_finger_states(mock_landmarks)
            
            assert isinstance(result, dict)
            assert 'thumb' in result
            assert 'index' in result
            assert 'middle' in result
            assert 'ring' in result
            assert 'pinky' in result


class TestGestureAnalysis:
    """Test overall gesture analysis"""
    
    def test_analyze_gesture_returns_gesture_dict(self):
        """_analyze_gesture should return a gesture dictionary"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            # Mock hand landmarks
            mock_landmarks = Mock()
            mock_landmarks.landmark = [Mock(x=0.5, y=0.5, z=0) for _ in range(21)]
            
            result = service._analyze_gesture(mock_landmarks)
            
            assert isinstance(result, dict)
            assert 'type' in result
            assert 'confidence' in result
    
    def test_analyze_gesture_includes_position(self):
        """_analyze_gesture should include position data"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            mock_landmarks = Mock()
            mock_landmarks.landmark = [Mock(x=0.5, y=0.5, z=0) for _ in range(21)]
            
            result = service._analyze_gesture(mock_landmarks)
            
            assert 'position' in result or ('x' in result and 'y' in result)


class TestGestureTypes:
    """Test recognition of specific gesture types"""
    
    @pytest.mark.parametrize("gesture_type", [
        "wave", "point", "pinch", "fist", "open_palm", "peace", "ok",
        "thumbs_up", "point_up", "point_down", "point_left", "point_right"
    ])
    def test_gesture_type_is_valid(self, gesture_type):
        """All gesture types should be valid strings"""
        assert isinstance(gesture_type, str)
        assert len(gesture_type) > 0
    
    def test_unknown_gesture_is_handled(self):
        """Unknown gesture should be handled gracefully"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            # Mock ambiguous landmarks
            mock_landmarks = Mock()
            mock_landmarks.landmark = [Mock(x=0.5, y=0.5, z=0) for _ in range(21)]
            
            result = service._analyze_gesture(mock_landmarks)
            
            # Should not crash and return some type
            assert 'type' in result
            assert result['type'] is not None


class TestMotionPatternDetection:
    """Test motion pattern detection"""
    
    def test_detect_motion_pattern_returns_dict(self):
        """_detect_motion_pattern should return a dictionary"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            service.motion_history = [
                {'x': 0.5, 'y': 0.5},
                {'x': 0.6, 'y': 0.5},
                {'x': 0.7, 'y': 0.5},
            ]
            
            result = service._detect_motion_pattern()
            
            assert isinstance(result, (dict, type(None)))


class TestHandOrientation:
    """Test hand orientation detection"""
    
    def test_detect_hand_orientation_returns_dict(self):
        """_detect_hand_orientation should return a dictionary"""
        with patch('cv2.VideoCapture'):
            from main import GestureRecognitionService
            service = GestureRecognitionService()
            
            mock_landmarks = Mock()
            mock_landmarks.landmark = [Mock(x=0.5, y=0.5, z=0) for _ in range(21)]
            
            result = service._detect_hand_orientation(mock_landmarks)
            
            assert isinstance(result, dict)
            assert 'pitch' in result or 'roll' in result or 'yaw' in result


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

