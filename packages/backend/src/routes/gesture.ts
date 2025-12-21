import { Router, Request, Response } from 'express';
import axios from 'axios';
import { wsService } from '../index';
import { AIService } from '../services/ai';
import { gestureLimiter } from '../middleware/rateLimiter';
import { validateGestureProcess } from '../middleware/validation';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5000';
const aiService = new AIService();
// Separate cooldown timers for each gesture type
const gestureCooldowns: { [key: string]: number } = {
  wave: 0,
  point: 0,
  pinch: 0
};
const GESTURE_COOLDOWN_MS = 2000; // Prevent multiple AI calls for same gesture

// Get current gesture data
router.get('/', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${VISION_SERVICE_URL}/gesture`);
    const gestureData = response.data;
    
    // Automatically trigger AI inference when gesture is detected
    if (gestureData && gestureData.type && gestureData.type !== 'unknown') {
      const currentTime = Date.now();
      const gestureType = gestureData.type;
      // Only trigger if enough time has passed since last gesture of this type (cooldown)
      if (currentTime - (gestureCooldowns[gestureType] || 0) > GESTURE_COOLDOWN_MS) {
        gestureCooldowns[gestureType] = currentTime;
        
        // Trigger AI inference asynchronously (don't block the response)
        triggerAIForGesture(gestureData).catch((error) => {
          logger.error(`Failed to trigger AI for ${gestureType} gesture:`, error);
        });
      }
    }
    
    res.json(gestureData);
  } catch (error) {
    logger.error('Failed to fetch gesture data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch gesture data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to trigger AI inference for any gesture
async function triggerAIForGesture(gestureData: any): Promise<void> {
  try {
    const gestureType = gestureData.type;
    const emoji = gestureType === 'wave' ? '🌊' : gestureType === 'point' ? '👉' : gestureType === 'pinch' ? '🤏' : '👋';
    logger.info(`${emoji} ${gestureType} gesture detected, triggering AI inference`);
    
    // Initialize AI service if needed (it will check internally)
    try {
      await aiService.initialize();
    } catch (initError) {
      logger.warn('AI service initialization failed, will attempt inference anyway:', initError);
    }
    
    // Create gesture-specific prompts
    let prompt: string;
    let queryText: string;
    
    switch (gestureType) {
      case 'wave':
        prompt = `The user just waved their hand in front of the camera. Describe this gesture in a natural, friendly way. Keep it brief (1-2 sentences).`;
        queryText = 'Wave gesture detected';
        break;
      case 'point':
        const x = gestureData.position?.x?.toFixed(2) || '0.00';
        const y = gestureData.position?.y?.toFixed(2) || '0.00';
        prompt = `The user is pointing at coordinates [${x}, ${y}] in the interaction space. Describe what could be there or what action this might represent. Keep it brief (1-2 sentences).`;
        queryText = `Point gesture at coordinates [${x}, ${y}]`;
        break;
      case 'pinch':
        const px = gestureData.position?.x?.toFixed(2) || '0.00';
        const py = gestureData.position?.y?.toFixed(2) || '0.00';
        prompt = `The user is performing a pinch gesture at coordinates [${px}, ${py}]. This typically means selection or grabbing. Describe this interaction in a natural way. Keep it brief (1-2 sentences).`;
        queryText = `Pinch gesture at coordinates [${px}, ${py}]`;
        break;
      default:
        prompt = `The user performed a ${gestureType} gesture. Describe this interaction. Keep it brief (1-2 sentences).`;
        queryText = `${gestureType} gesture detected`;
    }
    
    // Get AI response
    const context = `Gesture detected: ${gestureType}, position: (${gestureData.position?.x?.toFixed(2)}, ${gestureData.position?.y?.toFixed(2)}), confidence: ${(gestureData.confidence * 100).toFixed(0)}%`;
    const aiResponse = await aiService.infer(prompt, context);
    
    // Broadcast AI response via WebSocket
    if (wsService) {
      wsService.broadcastAIResponse({
        query: queryText,
        response: aiResponse.text,
        metadata: aiResponse.metadata,
        timestamp: Date.now()
      });
    }
    
    logger.info(`✅ AI response generated for ${gestureType} gesture`);
  } catch (error) {
    logger.error(`Failed to generate AI response for ${gestureData.type}:`, error);
    // Don't throw - we don't want to break gesture detection if AI fails
    if (wsService) {
      wsService.broadcastAIResponse({
        query: `${gestureData.type} gesture detected`,
        response: `AI service is currently unavailable. ${gestureData.type} gesture was recognized successfully.`,
        metadata: { error: true },
        timestamp: Date.now()
      });
    }
  }
}

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
    
    // Automatically trigger AI inference when gesture is detected
    if (gestureData.type && gestureData.type !== 'unknown') {
      const currentTime = Date.now();
      const gestureType = gestureData.type;
      // Only trigger if enough time has passed since last gesture of this type (cooldown)
      if (currentTime - (gestureCooldowns[gestureType] || 0) > GESTURE_COOLDOWN_MS) {
        gestureCooldowns[gestureType] = currentTime;
        triggerAIForGesture(gestureData).catch((error) => {
          logger.error(`Failed to trigger AI for ${gestureType} gesture:`, error);
        });
      }
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
