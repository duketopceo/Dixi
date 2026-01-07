"""
Projection Calibration Module

Handles homography computation for mapping camera coordinates to projector coordinates.
Provides utilities for:
- Storing/loading calibration data
- Computing homography matrix from corner points
- Transforming camera coordinates to projector coordinates
- Position smoothing/filtering
"""

import numpy as np
import json
import os
import time
from typing import Dict, Optional, Tuple, List
import collections


# Constants for position smoothing
OUTLIER_DISTANCE_THRESHOLD = 0.3  # Maximum normalized distance before treating as outlier


class PositionSmoother:
    """Simple exponential smoothing filter for reducing noise in position data."""
    
    def __init__(self, alpha: float = 0.3, history_size: int = 5):
        """
        Initialize the position smoother.
        
        Args:
            alpha: Smoothing factor (0 = no smoothing, 1 = no filtering)
            history_size: Number of positions to keep for outlier detection
        """
        self.alpha = alpha
        self.history_size = history_size
        self.history: collections.deque = collections.deque(maxlen=history_size)
        self.last_smoothed: Optional[Tuple[float, float]] = None
    
    def smooth(self, x: float, y: float) -> Tuple[float, float]:
        """
        Apply smoothing to a position.
        
        Args:
            x: Raw x coordinate
            y: Raw y coordinate
            
        Returns:
            Smoothed (x, y) tuple
        """
        # Add to history
        self.history.append((x, y))
        
        # If first point, just return it
        if self.last_smoothed is None:
            self.last_smoothed = (x, y)
            return (x, y)
        
        # Outlier detection: skip extreme jumps
        distance = np.sqrt(
            (x - self.last_smoothed[0])**2 + 
            (y - self.last_smoothed[1])**2
        )
        
        # If jump is too large, treat as outlier and reject
        if distance > OUTLIER_DISTANCE_THRESHOLD:
            # Return last smoothed position instead
            return self.last_smoothed
        
        # Apply exponential smoothing
        smoothed_x = self.alpha * x + (1 - self.alpha) * self.last_smoothed[0]
        smoothed_y = self.alpha * y + (1 - self.alpha) * self.last_smoothed[1]
        
        self.last_smoothed = (smoothed_x, smoothed_y)
        return (smoothed_x, smoothed_y)
    
    def reset(self):
        """Reset the smoother state."""
        self.history.clear()
        self.last_smoothed = None


class ProjectionCalibration:
    """
    Handles projection calibration using homography transformation.
    
    Maps camera image coordinates to projector canvas coordinates using
    a perspective transformation (homography).
    """
    
    def __init__(self, calibration_file: str = None):
        """
        Initialize the calibration service.
        
        Args:
            calibration_file: Optional path to store/load calibration data
        """
        if calibration_file is None:
            calibration_file = os.path.join(
                os.path.dirname(__file__), 
                'calibration_data.json'
            )
        self.calibration_file = calibration_file
        
        # Calibration state
        self.calibrated = False
        self.homography_matrix: Optional[np.ndarray] = None
        self.camera_corners: Optional[List[Tuple[float, float]]] = None
        self.projector_corners: Optional[List[Tuple[float, float]]] = None
        self.created_at: Optional[str] = None
        
        # Position smoother
        self.smoother = PositionSmoother(alpha=0.3)
        
        # Throttling
        self.last_position_time = 0
        self.position_throttle_ms = 33  # ~30fps max
        
        # Load existing calibration if available
        self._load_calibration()
    
    def _load_calibration(self):
        """Load calibration from file if it exists."""
        try:
            if os.path.exists(self.calibration_file):
                with open(self.calibration_file, 'r') as f:
                    data = json.load(f)
                
                if data.get('calibrated') and data.get('homography_matrix'):
                    self.homography_matrix = np.array(data['homography_matrix'])
                    self.camera_corners = data.get('camera_corners')
                    self.projector_corners = data.get('projector_corners')
                    self.created_at = data.get('created_at')
                    self.calibrated = True
                    print(f"Loaded calibration from {self.calibration_file}")
        except Exception as e:
            print(f"Failed to load calibration: {e}")
            self.calibrated = False
    
    def _save_calibration(self):
        """Save calibration to file."""
        try:
            data = {
                'calibrated': self.calibrated,
                'homography_matrix': self.homography_matrix.tolist() if self.homography_matrix is not None else None,
                'camera_corners': self.camera_corners,
                'projector_corners': self.projector_corners,
                'created_at': self.created_at
            }
            with open(self.calibration_file, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Saved calibration to {self.calibration_file}")
        except Exception as e:
            print(f"Failed to save calibration: {e}")
    
    def calibrate(
        self, 
        camera_corners: List[Dict[str, float]],
        projector_corners: Optional[List[Dict[str, float]]] = None
    ) -> Dict:
        """
        Compute homography from camera corners to projector corners.
        
        Args:
            camera_corners: List of 4 corner points from camera image
                           Each point: {'x': float, 'y': float} in normalized coords (0-1)
            projector_corners: Optional list of 4 corner points for projector canvas
                              Defaults to unit square [(0,0), (1,0), (1,1), (0,1)]
        
        Returns:
            Dict with calibration result status
        """
        try:
            # Validate input
            if len(camera_corners) != 4:
                return {
                    'success': False,
                    'error': f'Expected 4 corners, got {len(camera_corners)}'
                }
            
            # Extract camera points (ensure proper ordering: TL, TR, BR, BL)
            cam_pts = []
            for corner in camera_corners:
                x = corner.get('x', corner.get('cameraX', 0))
                y = corner.get('y', corner.get('cameraY', 0))
                cam_pts.append([x, y])
            
            # Default projector corners: unit square
            if projector_corners is None:
                proj_pts = [[0, 0], [1, 0], [1, 1], [0, 1]]
            else:
                proj_pts = [[p.get('x', 0), p.get('y', 0)] for p in projector_corners]
            
            # Convert to numpy arrays
            src_pts = np.array(cam_pts, dtype=np.float32)
            dst_pts = np.array(proj_pts, dtype=np.float32)
            
            # Validate points are not degenerate
            if not self._validate_points(src_pts):
                return {
                    'success': False,
                    'error': 'Camera corner points are degenerate (collinear or overlapping)'
                }
            
            # Compute homography matrix
            # Note: cv2.findHomography could be used here, but we use 
            # numpy-based implementation to avoid cv2 dependency issues
            self.homography_matrix = self._compute_homography(src_pts, dst_pts)
            
            if self.homography_matrix is None:
                return {
                    'success': False,
                    'error': 'Failed to compute homography matrix'
                }
            
            # Store calibration data
            self.camera_corners = cam_pts
            self.projector_corners = proj_pts
            self.created_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            self.calibrated = True
            
            # Reset smoother for fresh start
            self.smoother.reset()
            
            # Save to file
            self._save_calibration()
            
            return {
                'success': True,
                'calibrated': True,
                'created_at': self.created_at,
                'message': 'Calibration successful'
            }
            
        except Exception as e:
            print(f"Calibration error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _validate_points(self, points: np.ndarray) -> bool:
        """
        Validate that points form a valid quadrilateral.
        
        Args:
            points: 4x2 numpy array of corner points
            
        Returns:
            True if points are valid, False otherwise
        """
        # Check for overlapping points
        for i in range(4):
            for j in range(i + 1, 4):
                if np.allclose(points[i], points[j], atol=0.01):
                    return False
        
        # Check for collinearity (all 4 points on a line)
        # Using cross product of vectors
        v1 = points[1] - points[0]
        v2 = points[2] - points[0]
        v3 = points[3] - points[0]
        
        cross1 = np.cross(v1, v2)
        cross2 = np.cross(v1, v3)
        
        if np.abs(cross1) < 0.0001 and np.abs(cross2) < 0.0001:
            return False
        
        return True
    
    def _compute_homography(
        self, 
        src_pts: np.ndarray, 
        dst_pts: np.ndarray
    ) -> Optional[np.ndarray]:
        """
        Compute homography matrix using Direct Linear Transform (DLT).
        
        Args:
            src_pts: 4x2 source points (camera corners)
            dst_pts: 4x2 destination points (projector corners)
            
        Returns:
            3x3 homography matrix or None if computation fails
        """
        try:
            # Build matrix A for DLT
            # For each point correspondence (x,y) -> (u,v):
            # [x y 1 0 0 0 -ux -uy -u] [h1 h2 h3 h4 h5 h6 h7 h8 h9]' = 0
            # [0 0 0 x y 1 -vx -vy -v]
            
            A = []
            for i in range(4):
                x, y = src_pts[i]
                u, v = dst_pts[i]
                A.append([x, y, 1, 0, 0, 0, -u*x, -u*y, -u])
                A.append([0, 0, 0, x, y, 1, -v*x, -v*y, -v])
            
            A = np.array(A)
            
            # Solve using SVD
            U, S, Vh = np.linalg.svd(A)
            H = Vh[-1].reshape(3, 3)
            
            # Normalize so H[2,2] = 1
            if abs(H[2, 2]) > 1e-10:
                H = H / H[2, 2]
            
            return H
            
        except Exception as e:
            print(f"Homography computation error: {e}")
            return None
    
    def transform_point(
        self, 
        x: float, 
        y: float, 
        apply_smoothing: bool = True
    ) -> Optional[Tuple[float, float]]:
        """
        Transform a camera coordinate to projector coordinate.
        
        Args:
            x: Camera x coordinate (0-1 normalized)
            y: Camera y coordinate (0-1 normalized)
            apply_smoothing: Whether to apply position smoothing
            
        Returns:
            (projector_x, projector_y) tuple or None if not calibrated
        """
        if not self.calibrated or self.homography_matrix is None:
            return None
        
        try:
            # Apply homography transform
            # [u] = H * [x]
            # [v]       [y]
            # [w]       [1]
            pt = np.array([x, y, 1.0])
            transformed = self.homography_matrix @ pt
            
            # Convert from homogeneous coordinates
            if abs(transformed[2]) < 1e-10:
                return None
            
            proj_x = transformed[0] / transformed[2]
            proj_y = transformed[1] / transformed[2]
            
            # Clamp to valid range [0, 1]
            proj_x = max(0.0, min(1.0, proj_x))
            proj_y = max(0.0, min(1.0, proj_y))
            
            # Apply smoothing if enabled
            if apply_smoothing:
                proj_x, proj_y = self.smoother.smooth(proj_x, proj_y)
            
            return (proj_x, proj_y)
            
        except Exception as e:
            print(f"Transform error: {e}")
            return None
    
    def transform_gesture(
        self, 
        gesture_data: Dict
    ) -> Dict:
        """
        Transform a gesture's position from camera to projector coordinates.
        
        Args:
            gesture_data: Gesture data dict with 'position' field
            
        Returns:
            Updated gesture data with transformed position
        """
        if not self.calibrated or 'position' not in gesture_data:
            return gesture_data
        
        try:
            pos = gesture_data['position']
            
            # Coordinate system conversion:
            # - Gesture data comes in normalized [-1, 1] range from MediaPipe
            # - Camera/homography uses [0, 1] range
            # - Y-axis is flipped because MediaPipe uses screen coordinates 
            #   (Y increases downward) but projector uses Cartesian coordinates
            #   (Y increases upward)
            cam_x = (pos.get('x', 0) + 1) / 2
            cam_y = (1 - pos.get('y', 0)) / 2
            
            # Apply throttling
            current_time = int(time.time() * 1000)
            if current_time - self.last_position_time < self.position_throttle_ms:
                # Use cached position
                if hasattr(self, '_last_transformed_pos'):
                    cam_x, cam_y = self._last_transformed_pos
                    return self._build_gesture_response(gesture_data, cam_x, cam_y)
            
            # Transform to projector coordinates
            result = self.transform_point(cam_x, cam_y)
            
            if result is None:
                return gesture_data
            
            proj_x, proj_y = result
            self._last_transformed_pos = (proj_x, proj_y)
            self.last_position_time = current_time
            
            return self._build_gesture_response(gesture_data, proj_x, proj_y)
            
        except Exception as e:
            print(f"Gesture transform error: {e}")
            return gesture_data
    
    def _build_gesture_response(
        self, 
        gesture_data: Dict, 
        proj_x: float, 
        proj_y: float
    ) -> Dict:
        """Build transformed gesture response."""
        transformed = gesture_data.copy()
        
        # Update position to projector coordinates
        transformed['position'] = {
            'x': proj_x,
            'y': proj_y,
            'z': gesture_data.get('position', {}).get('z', 0)
        }
        
        # Add projector-specific fields
        transformed['isPinching'] = gesture_data.get('type') == 'pinch'
        transformed['source'] = 'projector'
        transformed['coordinate_space'] = 'projector'
        
        return transformed
    
    def get_status(self) -> Dict:
        """Get current calibration status."""
        return {
            'calibrated': self.calibrated,
            'camera_corners': self.camera_corners,
            'projector_corners': self.projector_corners,
            'created_at': self.created_at,
            'homography_matrix': self.homography_matrix.tolist() if self.homography_matrix is not None else None
        }
    
    def clear_calibration(self):
        """Clear current calibration."""
        self.calibrated = False
        self.homography_matrix = None
        self.camera_corners = None
        self.projector_corners = None
        self.created_at = None
        self.smoother.reset()
        
        # Remove calibration file
        try:
            if os.path.exists(self.calibration_file):
                os.remove(self.calibration_file)
        except Exception as e:
            print(f"Failed to remove calibration file: {e}")


# Utility functions for testing homography math
def compute_homography_from_corners(
    camera_corners: List[Tuple[float, float]],
    projector_corners: List[Tuple[float, float]] = None
) -> Optional[np.ndarray]:
    """
    Compute homography matrix from corner correspondences.
    
    Args:
        camera_corners: List of 4 (x, y) tuples from camera
        projector_corners: List of 4 (x, y) tuples for projector (default: unit square)
        
    Returns:
        3x3 homography matrix or None
    """
    calib = ProjectionCalibration()
    result = calib.calibrate(
        [{'x': c[0], 'y': c[1]} for c in camera_corners],
        [{'x': p[0], 'y': p[1]} for p in projector_corners] if projector_corners else None
    )
    
    if result.get('success'):
        return calib.homography_matrix
    return None


def apply_homography(
    homography: np.ndarray, 
    x: float, 
    y: float
) -> Tuple[float, float]:
    """
    Apply homography transformation to a point.
    
    Args:
        homography: 3x3 homography matrix
        x: Input x coordinate
        y: Input y coordinate
        
    Returns:
        (transformed_x, transformed_y) tuple
    """
    pt = np.array([x, y, 1.0])
    transformed = homography @ pt
    
    if abs(transformed[2]) < 1e-10:
        raise ValueError("Point transformation resulted in invalid homogeneous coordinate")
    
    return (transformed[0] / transformed[2], transformed[1] / transformed[2])
