import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai';
import { wsService } from '../index';
import { aiLimiter, visionLimiter } from '../middleware/rateLimiter';
import { validateAIInfer, validateAIInit } from '../middleware/validation';
import logger from '../utils/logger';

const router = Router();
const aiService = new AIService();

// Get AI model status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await aiService.getModelStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get AI model status:', error);
    res.status(500).json({ 
      error: 'Failed to get AI model status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize AI model
router.post('/initialize', validateAIInit, async (req: Request, res: Response) => {
  try {
    const { modelPath, modelSize } = req.body;
    await aiService.initialize(modelPath, modelSize);
    logger.info('AI model initialized', { modelSize: modelSize || process.env.MODEL_SIZE || '7B' });
    res.json({ 
      message: 'AI model initialized successfully',
      modelSize: modelSize || process.env.MODEL_SIZE || '7B'
    });
  } catch (error) {
    logger.error('Failed to initialize AI model:', error);
    res.status(500).json({ 
      error: 'Failed to initialize AI model',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate AI inference (with rate limiting)
router.post('/infer', aiLimiter, validateAIInfer, async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;
    
    logger.info('AI inference requested', { queryLength: query.length, hasContext: !!context });
    const startTime = Date.now();
    
    const response = await aiService.infer(query, context);
    
    const inferenceTime = Date.now() - startTime;
    logger.info('AI inference completed', { inferenceTime });
    
    // Broadcast AI response via WebSocket
    if (wsService) {
      wsService.broadcastAIResponse({
        query,
        response: response.text,
        metadata: response.metadata,
        timestamp: Date.now()
      });
    }

    res.json(response);
  } catch (error) {
    logger.error('Failed to generate AI inference:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI inference',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stream AI inference (for long responses, with rate limiting)
router.post('/stream', aiLimiter, validateAIInfer, async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;
    
    logger.info('AI streaming requested', { queryLength: query.length });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await aiService.inferStream(query, context, (chunk) => {
      // Check if response is still writable before writing
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    });

    // Only send [DONE] and end if response is still writable
    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
      logger.info('AI streaming completed');
    }
  } catch (error) {
    logger.error('Failed to stream AI inference:', error);
    
    // If SSE headers are already set, send error as SSE event
    if (res.getHeader('Content-Type') === 'text/event-stream') {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ 
          error: 'Failed to stream AI inference',
          details: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      // Otherwise send JSON error response
      res.status(500).json({ 
        error: 'Failed to stream AI inference',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Analyze current camera frame with vision model
router.post('/vision/analyze', visionLimiter, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    logger.info('Vision analysis requested');
    
    // Check if vision model is available
    const hasVision = await aiService.isVisionModelAvailable();
    if (!hasVision) {
      return res.status(503).json({
        error: 'Vision model not available',
        details: 'Run: ollama pull llava:7b'
      });
    }
    
    const response = await aiService.analyzeCurrentFrame(prompt);
    
    // Broadcast AI response via WebSocket
    if (wsService) {
      wsService.broadcastAIResponse({
        query: prompt || 'Vision analysis',
        response: response.text,
        metadata: { ...response.metadata, analysisType: 'vision' },
        timestamp: Date.now()
      });
    }

    res.json(response);
  } catch (error) {
    logger.error('Failed to analyze vision:', error);
    res.status(500).json({ 
      error: 'Failed to analyze vision',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if vision model is available
router.get('/vision/status', async (req: Request, res: Response) => {
  try {
    const hasVision = await aiService.isVisionModelAvailable();
    res.json({
      available: hasVision,
      model: hasVision ? 'llava:7b' : null,
      message: hasVision 
        ? 'Vision model ready for image analysis' 
        : 'Vision model not installed. Run: ollama pull llava:7b'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check vision status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
