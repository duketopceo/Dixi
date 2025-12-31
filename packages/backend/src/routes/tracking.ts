import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AIService } from '../services/ai';
import { wsService } from '../index';
import { visionLimiter } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5001';
const aiService = new AIService();

// Unified tracking endpoint - returns all tracking data (face, hands, body, eyes)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Fetch unified tracking data from vision service
    const response = await axios.get(`${VISION_SERVICE_URL}/tracking`, { timeout: 5000 });
    res.json(response.data);
  } catch (error: any) {
    logger.error('Failed to fetch tracking data:', error);
    
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
      error: 'Failed to fetch tracking data',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'unknown_error'
    });
  }
});

// Process unified tracking data from vision service
router.post('/process', visionLimiter, async (req: Request, res: Response) => {
  try {
    const trackingData = req.body;
    
    logger.debug('Processing unified tracking data', { 
      hasFace: !!trackingData.face,
      hasHands: !!(trackingData.hands?.left || trackingData.hands?.right),
      hasBody: !!trackingData.body,
      hasEyes: !!trackingData.eyes
    });
    
    // Broadcast to all connected clients via WebSocket
    if (wsService) {
      wsService.broadcastTracking(trackingData);
    }
    
    res.json({ 
      message: 'Tracking data processed successfully',
      tracking: trackingData
    });
  } catch (error: any) {
    logger.error('Failed to process tracking data:', error);
    res.status(500).json({ 
      error: 'Failed to process tracking data',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'processing_error'
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
    
    // Get unified tracking data
    const trackingResponse = await axios.get(`${VISION_SERVICE_URL}/tracking`, { timeout: 2000 });
    const trackingData = trackingResponse.data;
    
    const context = {
      face: trackingData.face,
      hands: trackingData.hands,
      body: trackingData.body,
      eyes: trackingData.eyes
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
      context: trackingData,
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
