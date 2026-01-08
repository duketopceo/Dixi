"""
Vision Service Configuration
Manages configuration for frame skipping, model processing, and performance settings
"""

import os
from typing import Dict, Any


class VisionConfig:
    """Configuration manager for vision service."""
    
    def __init__(self):
        """Load configuration from environment variables with defaults."""
        self.frame_skip_interval = int(os.getenv('FRAME_SKIP_INTERVAL', '2'))
        self.enable_face_tracking = os.getenv('ENABLE_FACE_TRACKING', 'true').lower() == 'true'
        self.enable_pose_tracking = os.getenv('ENABLE_POSE_TRACKING', 'true').lower() == 'true'
        self.backend_push_cooldown_ms = int(os.getenv('BACKEND_PUSH_COOLDOWN_MS', '500'))
        self.adaptive_fps = os.getenv('ADAPTIVE_FPS', 'false').lower() == 'true'
        
        # Adaptive FPS settings
        self.adaptive_idle_fps = 10  # FPS when idle
        self.adaptive_active_fps = 15  # FPS when active
        self.adaptive_idle_timeout_seconds = 5  # Seconds of inactivity before reducing FPS
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            'frame_skip_interval': self.frame_skip_interval,
            'enable_face_tracking': self.enable_face_tracking,
            'enable_pose_tracking': self.enable_pose_tracking,
            'backend_push_cooldown_ms': self.backend_push_cooldown_ms,
            'adaptive_fps': self.adaptive_fps,
            'adaptive_idle_fps': self.adaptive_idle_fps,
            'adaptive_active_fps': self.adaptive_active_fps,
            'adaptive_idle_timeout_seconds': self.adaptive_idle_timeout_seconds
        }
    
    def update(self, updates: Dict[str, Any]) -> None:
        """Update configuration values."""
        if 'frame_skip_interval' in updates:
            self.frame_skip_interval = int(updates['frame_skip_interval'])
        if 'enable_face_tracking' in updates:
            self.enable_face_tracking = bool(updates['enable_face_tracking'])
        if 'enable_pose_tracking' in updates:
            self.enable_pose_tracking = bool(updates['enable_pose_tracking'])
        if 'backend_push_cooldown_ms' in updates:
            self.backend_push_cooldown_ms = int(updates['backend_push_cooldown_ms'])
        if 'adaptive_fps' in updates:
            self.adaptive_fps = bool(updates['adaptive_fps'])
        if 'adaptive_idle_fps' in updates:
            self.adaptive_idle_fps = int(updates['adaptive_idle_fps'])
        if 'adaptive_active_fps' in updates:
            self.adaptive_active_fps = int(updates['adaptive_active_fps'])
        if 'adaptive_idle_timeout_seconds' in updates:
            self.adaptive_idle_timeout_seconds = int(updates['adaptive_idle_timeout_seconds'])


# Global config instance
_config_instance: VisionConfig = None


def get_config() -> VisionConfig:
    """Get the global config instance."""
    global _config_instance
    if _config_instance is None:
        _config_instance = VisionConfig()
    return _config_instance


def reload_config() -> VisionConfig:
    """Reload configuration from environment variables."""
    global _config_instance
    _config_instance = VisionConfig()
    return _config_instance
