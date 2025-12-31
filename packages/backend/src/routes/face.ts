import { Router, Request, Response } from 'express';
import axios from 'axios';
import { wsService } from '../index';
import { gestureLimiter } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5001';

// Face data buffer for tracking
interface FaceData {
  detected: boolean;
  landmarks_count?: number;
  bounding_box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    width: number;
    height: number;
  };
  key_points?: {
    left_eye: { x: number; y: number };
    right_eye: { x: number; y: number };
    nose_tip: { x: number; y: number };
    mouth_center: { x: number; y: number };
  };
  head_pose?: {
    tilt: number;
    turn: number;
  };
  expressions?: { [key: string]: number };
  timestamp: number;
}

let currentFaceData: FaceData | null = null;

// Get current face data
router.get('/', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${VISION_SERVICE_URL}/face`, {
      timeout: 5000
    });
    const faceData = response.data;
    
    res.json(faceData);
  } catch (error: any) {
    logger.error('Failed to fetch face data:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      res.status(503).json({ 
        error: 'Vision service unavailable',
        details: 'Vision service is not running or not accessible.',
        type: 'connection_error'
      });
      return;
    }
    
    if (error.response) {
      res.status(error.response.status || 500).json({ 
        error: 'Vision service error',
        details: error.response.data?.error || error.response.statusText || 'Unknown error',
        type: 'service_error'
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch face data',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'unknown_error'
    });
  }
});

// Process face detection data
router.post('/process', gestureLimiter, async (req: Request, res: Response) => {
  try {
    const faceData: FaceData = req.body;
    
    logger.debug('Processing face data', { detected: faceData.detected });
    
    // Store current face data
    currentFaceData = faceData;
    
    // Broadcast to all connected clients via WebSocket
    if (wsService) {
      wsService.broadcastFace(faceData);
    }
    
    res.json({ 
      message: 'Face data processed successfully',
      face: faceData
    });
  } catch (error: any) {
    logger.error('Failed to process face data:', error);
    
    res.status(500).json({ 
      error: 'Failed to process face data',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'processing_error'
    });
  }
});

// Start face detection
router.post('/start', gestureLimiter, async (req: Request, res: Response) => {
  try {
    logger.info('Starting face detection');
    const response = await axios.post(`${VISION_SERVICE_URL}/face/start`);
    logger.info('Face detection started successfully');
    res.json({ 
      message: 'Face detection started',
      data: response.data
    });
  } catch (error) {
    logger.error('Failed to start face detection:', error);
    res.status(500).json({ 
      error: 'Failed to start face detection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop face detection
router.post('/stop', gestureLimiter, async (req: Request, res: Response) => {
  try {
    logger.info('Stopping face detection');
    const response = await axios.post(`${VISION_SERVICE_URL}/face/stop`);
    logger.info('Face detection stopped successfully');
    res.json({ 
      message: 'Face detection stopped',
      data: response.data
    });
  } catch (error) {
    logger.error('Failed to stop face detection:', error);
    res.status(500).json({ 
      error: 'Failed to stop face detection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get face detection status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${VISION_SERVICE_URL}/face/status`, {
      timeout: 5000
    });
    res.json(response.data);
  } catch (error: any) {
    logger.error('Failed to fetch face status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch face status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
