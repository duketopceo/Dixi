import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AIService } from '../services/ai';
import { wsService } from '../index';
import { visionLimiter } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5001';
const aiService = new AIService();

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

// Analyze current frame with full context (gesture + face + AI vision)
router.post('/analyze', visionLimiter, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    logger.info('Combined tracking analysis requested');
    
    // Check if vision model is available
    const hasVision = await aiService.isVisionModelAvailable();
    if (!hasVision) {
      return res.status(503).json({
        error: 'Vision model not available',
        details: 'Run: ollama pull llava:7b'
      });
    }
    
    // Get current gesture and face data
    const [gestureResponse, faceResponse] = await Promise.allSettled([
      axios.get(`${VISION_SERVICE_URL}/gesture`, { timeout: 2000 }),
      axios.get(`${VISION_SERVICE_URL}/face`, { timeout: 2000 })
    ]);

    const gestureData = gestureResponse.status === 'fulfilled' ? gestureResponse.value.data : null;
    const faceData = faceResponse.status === 'fulfilled' ? faceResponse.value.data : null;
    
    const context = {
      gesture: gestureData,
      face: faceData
    };
    
    // Analyze frame with full context
    const aiResponse = await aiService.analyzeCurrentFrame(
      prompt || "Describe what you see in this camera feed. Comment on the person's gestures, facial expressions, and what they might be doing or feeling.",
      context
    );
    
    // Broadcast AI response via WebSocket
    if (wsService) {
      wsService.broadcastAIResponse({
        query: prompt || 'Combined tracking analysis',
        response: aiResponse.text,
        metadata: { ...aiResponse.metadata, analysisType: 'tracking', context },
        timestamp: Date.now()
      });
    }

    res.json({
      analysis: aiResponse,
      context: {
        gesture: gestureData,
        face: faceData
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.error('Failed to analyze tracking:', error);
    res.status(500).json({ 
      error: 'Failed to analyze tracking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
