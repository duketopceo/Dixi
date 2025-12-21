"""
Pytest configuration and fixtures for vision service tests.
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

# Add the vision package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'packages', 'vision'))


@pytest.fixture(autouse=True)
def mock_cv2():
    """Mock OpenCV to prevent camera access during tests."""
    with patch('cv2.VideoCapture') as mock_cap:
        mock_cap.return_value.isOpened.return_value = True
        mock_cap.return_value.read.return_value = (True, Mock())
        mock_cap.return_value.release.return_value = None
        yield mock_cap


@pytest.fixture(autouse=True)
def mock_mediapipe():
    """Mock MediaPipe to prevent model loading during tests."""
    with patch.dict('sys.modules', {
        'mediapipe': MagicMock(),
        'mediapipe.tasks': MagicMock(),
        'mediapipe.tasks.python': MagicMock(),
        'mediapipe.tasks.python.vision': MagicMock(),
    }):
        yield


@pytest.fixture
def gesture_service():
    """Create a GestureRecognitionService instance for testing."""
    with patch('cv2.VideoCapture'):
        from main import GestureRecognitionService
        service = GestureRecognitionService()
        yield service


@pytest.fixture
def mock_hand_landmarks():
    """Create mock hand landmarks for testing."""
    mock_landmarks = Mock()
    mock_landmarks.landmark = [Mock(x=0.5, y=0.5, z=0) for _ in range(21)]
    return mock_landmarks


@pytest.fixture
def sample_gesture_data():
    """Sample gesture data for testing."""
    return {
        'type': 'wave',
        'position': {'x': 0.5, 'y': 0.5, 'z': 0},
        'confidence': 0.85,
        'timestamp': 1703134800000
    }


@pytest.fixture
def all_gesture_types():
    """List of all supported gesture types."""
    return [
        'wave', 'point', 'point_up', 'point_down', 'point_left', 'point_right',
        'pinch', 'fist', 'open_palm', 'peace', 'ok',
        'thumbs_up', 'thumbs_down',
        'swipe_left', 'swipe_right', 'swipe_up', 'swipe_down',
        'zoom_in', 'zoom_out', 'rotate_cw', 'rotate_ccw',
        'clap', 'stretch', 'circle', 'tap', 'double_tap'
    ]

