"""
Tests for vision service configuration system
"""

import os
import sys
import unittest
from unittest.mock import patch

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import VisionConfig, get_config, reload_config


class TestVisionConfig(unittest.TestCase):
    """Test VisionConfig class"""

    def setUp(self):
        """Set up test environment"""
        # Save original environment
        self.original_env = os.environ.copy()

    def tearDown(self):
        """Restore original environment"""
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_default_config(self):
        """Test default configuration values"""
        # Clear relevant env vars
        for key in ['FRAME_SKIP_INTERVAL', 'ENABLE_FACE_TRACKING', 'ENABLE_POSE_TRACKING', 
                    'BACKEND_PUSH_COOLDOWN_MS', 'ADAPTIVE_FPS']:
            os.environ.pop(key, None)
        
        config = VisionConfig()
        
        self.assertEqual(config.frame_skip_interval, 2)
        self.assertEqual(config.enable_face_tracking, True)
        self.assertEqual(config.enable_pose_tracking, True)
        self.assertEqual(config.backend_push_cooldown_ms, 500)
        self.assertEqual(config.adaptive_fps, False)

    def test_environment_variable_override(self):
        """Test environment variable overrides"""
        os.environ['FRAME_SKIP_INTERVAL'] = '3'
        os.environ['ENABLE_FACE_TRACKING'] = 'false'
        os.environ['ENABLE_POSE_TRACKING'] = 'false'
        os.environ['BACKEND_PUSH_COOLDOWN_MS'] = '1000'
        os.environ['ADAPTIVE_FPS'] = 'true'
        
        config = VisionConfig()
        
        self.assertEqual(config.frame_skip_interval, 3)
        self.assertEqual(config.enable_face_tracking, False)
        self.assertEqual(config.enable_pose_tracking, False)
        self.assertEqual(config.backend_push_cooldown_ms, 1000)
        self.assertEqual(config.adaptive_fps, True)

    def test_to_dict(self):
        """Test config to_dict method"""
        config = VisionConfig()
        config_dict = config.to_dict()
        
        self.assertIsInstance(config_dict, dict)
        self.assertIn('frame_skip_interval', config_dict)
        self.assertIn('enable_face_tracking', config_dict)
        self.assertIn('enable_pose_tracking', config_dict)
        self.assertIn('backend_push_cooldown_ms', config_dict)
        self.assertIn('adaptive_fps', config_dict)

    def test_update(self):
        """Test config update method"""
        config = VisionConfig()
        
        updates = {
            'frame_skip_interval': 4,
            'enable_face_tracking': False,
            'adaptive_fps': True
        }
        
        config.update(updates)
        
        self.assertEqual(config.frame_skip_interval, 4)
        self.assertEqual(config.enable_face_tracking, False)
        self.assertEqual(config.adaptive_fps, True)
        # Unchanged values should remain
        self.assertEqual(config.enable_pose_tracking, True)

    def test_get_config_singleton(self):
        """Test get_config returns singleton"""
        config1 = get_config()
        config2 = get_config()
        
        self.assertIs(config1, config2)

    def test_reload_config(self):
        """Test reload_config creates new instance"""
        config1 = get_config()
        
        os.environ['FRAME_SKIP_INTERVAL'] = '5'
        config2 = reload_config()
        
        # Should be different instance
        self.assertIsNot(config1, config2)
        self.assertEqual(config2.frame_skip_interval, 5)


if __name__ == '__main__':
    unittest.main()
