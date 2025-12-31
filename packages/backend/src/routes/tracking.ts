import { Router, Request, Response } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5001';

// Combined tracking endpoint - returns both gesture and face data
router.get('/', async (req: Request, res: Response) => {
  try {
    // Fetch both gesture and face data in parallel
    const [gestureResponse, faceResponse] = await Promise.allSettled([
      axios.get(`${VISION_SERVICE_URL}/gesture`, { timeout: 5000 }),
      axios.get(`${VISION_SERVICE_URL}/face`, { timeout: 5000 })
    ]);

    const gestureData = gestureResponse.status === 'fulfilled' 
      ? gestureResponse.value.data 
      : { error: 'Gesture data unavailable', details: gestureResponse.reason?.message };
    
    const faceData = faceResponse.status === 'fulfilled'
      ? faceResponse.value.data
      : { error: 'Face data unavailable', details: faceResponse.reason?.message };

    res.json({
      gesture: gestureData,
      face: faceData,
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.error('Failed to fetch tracking data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tracking data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
