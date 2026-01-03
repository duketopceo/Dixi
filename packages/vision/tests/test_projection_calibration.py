"""
Tests for projection calibration module.

Tests homography computation, coordinate transformation, and position smoothing.
"""

import pytest
import numpy as np
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from projection_calibration import (
    ProjectionCalibration,
    PositionSmoother,
    compute_homography_from_corners,
    apply_homography
)


class TestPositionSmoother:
    """Tests for position smoothing."""
    
    def test_first_point_returned_unsmoothed(self):
        """First point should be returned as-is."""
        smoother = PositionSmoother(alpha=0.3)
        result = smoother.smooth(0.5, 0.5)
        assert result == (0.5, 0.5)
    
    def test_smoothing_reduces_noise(self):
        """Smoothing should reduce position noise."""
        smoother = PositionSmoother(alpha=0.3)
        
        # First point
        smoother.smooth(0.5, 0.5)
        
        # Slightly noisy point
        result = smoother.smooth(0.55, 0.52)
        
        # Should be closer to 0.5 than 0.55 due to smoothing
        assert 0.5 < result[0] < 0.55
        assert 0.5 < result[1] < 0.52
    
    def test_outlier_rejection(self):
        """Large jumps should be rejected as outliers."""
        smoother = PositionSmoother(alpha=0.3)
        
        # Establish baseline
        smoother.smooth(0.5, 0.5)
        
        # Try a large jump (outlier)
        result = smoother.smooth(0.9, 0.9)  # >0.3 distance
        
        # Should return last smoothed position
        assert result == (0.5, 0.5)
    
    def test_reset_clears_state(self):
        """Reset should clear smoother state."""
        smoother = PositionSmoother()
        smoother.smooth(0.5, 0.5)
        smoother.reset()
        
        assert smoother.last_smoothed is None
        assert len(smoother.history) == 0


class TestHomographyComputation:
    """Tests for homography matrix computation."""
    
    def test_identity_homography(self, tmp_path):
        """Unit square to unit square should give identity-like transform."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        # Same corners for camera and projector
        corners = [
            {'x': 0, 'y': 0},
            {'x': 1, 'y': 0},
            {'x': 1, 'y': 1},
            {'x': 0, 'y': 1}
        ]
        
        result = calib.calibrate(corners, corners)
        assert result['success'] is True
        
        # Transform should return same point
        transformed = calib.transform_point(0.5, 0.5, apply_smoothing=False)
        assert transformed is not None
        assert abs(transformed[0] - 0.5) < 0.01
        assert abs(transformed[1] - 0.5) < 0.01
    
    def test_scaled_homography(self, tmp_path):
        """Scaled mapping should correctly transform points."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        # Camera corners at 0.1-0.9 range
        camera_corners = [
            {'x': 0.1, 'y': 0.1},
            {'x': 0.9, 'y': 0.1},
            {'x': 0.9, 'y': 0.9},
            {'x': 0.1, 'y': 0.9}
        ]
        
        # Projector corners at unit square
        projector_corners = [
            {'x': 0, 'y': 0},
            {'x': 1, 'y': 0},
            {'x': 1, 'y': 1},
            {'x': 0, 'y': 1}
        ]
        
        result = calib.calibrate(camera_corners, projector_corners)
        assert result['success'] is True
        
        # Center of camera should map to center of projector
        center = calib.transform_point(0.5, 0.5, apply_smoothing=False)
        assert center is not None
        assert abs(center[0] - 0.5) < 0.1
        assert abs(center[1] - 0.5) < 0.1
        
        # Camera corner should map near projector corner
        corner = calib.transform_point(0.1, 0.1, apply_smoothing=False)
        assert corner is not None
        # Should be close to (0, 0)
        assert corner[0] < 0.15
        assert corner[1] < 0.15
    
    def test_degenerate_points_rejected(self, tmp_path):
        """Overlapping or collinear points should be rejected."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        # Overlapping points
        corners = [
            {'x': 0.5, 'y': 0.5},
            {'x': 0.5, 'y': 0.5},  # Same as first
            {'x': 1, 'y': 1},
            {'x': 0, 'y': 1}
        ]
        
        result = calib.calibrate(corners)
        assert result['success'] is False
        assert 'degenerate' in result.get('error', '').lower() or 'invalid' in result.get('error', '').lower()
    
    def test_wrong_number_of_points_rejected(self, tmp_path):
        """Non-four-point arrays should be rejected."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        # Only 3 points
        corners = [
            {'x': 0, 'y': 0},
            {'x': 1, 'y': 0},
            {'x': 1, 'y': 1}
        ]
        
        result = calib.calibrate(corners)
        assert result['success'] is False


class TestCoordinateTransformation:
    """Tests for coordinate transformation."""
    
    def test_transform_clamps_to_valid_range(self, tmp_path):
        """Transformed coordinates should be clamped to [0, 1]."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        corners = [
            {'x': 0.2, 'y': 0.2},
            {'x': 0.8, 'y': 0.2},
            {'x': 0.8, 'y': 0.8},
            {'x': 0.2, 'y': 0.8}
        ]
        
        calib.calibrate(corners)
        
        # Transform point outside camera region
        result = calib.transform_point(0.05, 0.05, apply_smoothing=False)
        
        assert result is not None
        assert 0.0 <= result[0] <= 1.0
        assert 0.0 <= result[1] <= 1.0
    
    def test_transform_returns_none_when_not_calibrated(self, tmp_path):
        """Transform should return None when not calibrated."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        result = calib.transform_point(0.5, 0.5)
        assert result is None
    
    def test_gesture_transform_adds_projector_fields(self, tmp_path):
        """Gesture transform should add projector-specific fields."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        corners = [
            {'x': 0, 'y': 0},
            {'x': 1, 'y': 0},
            {'x': 1, 'y': 1},
            {'x': 0, 'y': 1}
        ]
        calib.calibrate(corners)
        
        gesture = {
            'type': 'pinch',
            'position': {'x': 0.0, 'y': 0.0, 'z': 0},
            'confidence': 0.9,
            'timestamp': 1234567890
        }
        
        transformed = calib.transform_gesture(gesture)
        
        assert 'isPinching' in transformed
        assert transformed['isPinching'] is True
        assert transformed.get('source') == 'projector'
        assert transformed.get('coordinate_space') == 'projector'
    
    def test_gesture_transform_preserves_non_pinch(self, tmp_path):
        """Non-pinch gestures should have isPinching=False."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        corners = [
            {'x': 0, 'y': 0},
            {'x': 1, 'y': 0},
            {'x': 1, 'y': 1},
            {'x': 0, 'y': 1}
        ]
        calib.calibrate(corners)
        
        gesture = {
            'type': 'point',
            'position': {'x': 0.0, 'y': 0.0, 'z': 0},
            'confidence': 0.9,
            'timestamp': 1234567890
        }
        
        transformed = calib.transform_gesture(gesture)
        
        assert transformed['isPinching'] is False


class TestCalibrationPersistence:
    """Tests for calibration save/load."""
    
    def test_calibration_can_be_saved_and_loaded(self, tmp_path):
        """Calibration should persist to file and reload."""
        calib_file = str(tmp_path / "test_calibration.json")
        
        # Create and calibrate
        calib1 = ProjectionCalibration(calibration_file=calib_file)
        corners = [
            {'x': 0.1, 'y': 0.1},
            {'x': 0.9, 'y': 0.1},
            {'x': 0.9, 'y': 0.9},
            {'x': 0.1, 'y': 0.9}
        ]
        calib1.calibrate(corners)
        assert calib1.calibrated is True
        
        # Create new instance to test loading
        calib2 = ProjectionCalibration(calibration_file=calib_file)
        assert calib2.calibrated is True
        
        # Should produce same transform
        result1 = calib1.transform_point(0.5, 0.5, apply_smoothing=False)
        result2 = calib2.transform_point(0.5, 0.5, apply_smoothing=False)
        
        assert result1 is not None
        assert result2 is not None
        assert abs(result1[0] - result2[0]) < 0.01
        assert abs(result1[1] - result2[1]) < 0.01
    
    def test_clear_calibration_removes_state(self, tmp_path):
        """Clear calibration should reset all state."""
        calib_file = str(tmp_path / "test_calibration.json")
        
        calib = ProjectionCalibration(calibration_file=calib_file)
        corners = [
            {'x': 0.1, 'y': 0.1},
            {'x': 0.9, 'y': 0.1},
            {'x': 0.9, 'y': 0.9},
            {'x': 0.1, 'y': 0.9}
        ]
        calib.calibrate(corners)
        assert calib.calibrated is True
        
        calib.clear_calibration()
        
        assert calib.calibrated is False
        assert calib.homography_matrix is None
        assert not os.path.exists(calib_file)


class TestUtilityFunctions:
    """Tests for standalone utility functions."""
    
    def test_compute_homography_from_corners(self):
        """Utility function should compute valid homography."""
        camera_corners = [(0.1, 0.1), (0.9, 0.1), (0.9, 0.9), (0.1, 0.9)]
        
        H = compute_homography_from_corners(camera_corners)
        
        assert H is not None
        assert H.shape == (3, 3)
    
    def test_apply_homography_transforms_point(self):
        """Apply homography should transform point correctly."""
        camera_corners = [(0, 0), (1, 0), (1, 1), (0, 1)]
        
        # Identity-like homography
        H = compute_homography_from_corners(camera_corners)
        
        if H is not None:
            result = apply_homography(H, 0.5, 0.5)
            assert abs(result[0] - 0.5) < 0.01
            assert abs(result[1] - 0.5) < 0.01


class TestStatus:
    """Tests for calibration status reporting."""
    
    def test_status_when_not_calibrated(self, tmp_path):
        """Status should report uncalibrated state."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        
        status = calib.get_status()
        
        assert status['calibrated'] is False
        assert status['homography_matrix'] is None
    
    def test_status_when_calibrated(self, tmp_path):
        """Status should report calibrated state with data."""
        calib = ProjectionCalibration(calibration_file=str(tmp_path / "test_calib.json"))
        corners = [
            {'x': 0.1, 'y': 0.1},
            {'x': 0.9, 'y': 0.1},
            {'x': 0.9, 'y': 0.9},
            {'x': 0.1, 'y': 0.9}
        ]
        calib.calibrate(corners)
        
        status = calib.get_status()
        
        assert status['calibrated'] is True
        assert status['homography_matrix'] is not None
        assert status['camera_corners'] is not None
        assert status['created_at'] is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
