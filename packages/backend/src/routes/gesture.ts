import { Router, Request, Response } from 'express';
import axios from 'axios';
import { wsService } from '../index';
import { gestureLimiter } from '../middleware/rateLimiter';
import { validateGestureProcess } from '../middleware/validation';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5000';

// Get current gesture data
router.get('/', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${VISION_SERVICE_URL}/gesture`);
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to fetch gesture data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch gesture data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start gesture tracking (with rate limiting)
router.post('/start', gestureLimiter, async (req: Request, res: Response) => {
  try {
    logger.info('Starting gesture tracking');
    const response = await axios.post(`${VISION_SERVICE_URL}/gesture/start`);
    logger.info('Gesture tracking started successfully');
    res.json({ 
      message: 'Gesture tracking started',
      data: response.data
    });
  } catch (error) {
    logger.error('Failed to start gesture tracking:', error);
    res.status(500).json({ 
      error: 'Failed to start gesture tracking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop gesture tracking (with rate limiting)
router.post('/stop', gestureLimiter, async (req: Request, res: Response) => {
  try {
    logger.info('Stopping gesture tracking');
    const response = await axios.post(`${VISION_SERVICE_URL}/gesture/stop`);
    logger.info('Gesture tracking stopped successfully');
    res.json({ 
      message: 'Gesture tracking stopped',
      data: response.data
    });
  } catch (error) {
    logger.error('Failed to stop gesture tracking:', error);
    res.status(500).json({ 
      error: 'Failed to stop gesture tracking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process gesture event (with validation)
router.post('/process', validateGestureProcess, async (req: Request, res: Response) => {
  try {
    const gestureData = req.body;
    
    logger.debug('Processing gesture', { type: gestureData.type, confidence: gestureData.confidence });
    
    // Broadcast to all connected clients via WebSocket
    if (wsService) {
      wsService.broadcastGesture({
        type: gestureData.type || 'unknown',
        position: gestureData.position || { x: 0, y: 0 },
        confidence: gestureData.confidence || 0,
        timestamp: Date.now()
      });
    }
    
    res.json({ 
      message: 'Gesture processed successfully',
      gesture: gestureData
    });
  } catch (error) {
    logger.error('Failed to process gesture:', error);
    res.status(500).json({ 
      error: 'Failed to process gesture',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
