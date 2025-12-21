import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai';
import { wsService } from '../index';
import { aiLimiter } from '../middleware/rateLimiter';
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
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
    logger.info('AI streaming completed');
  } catch (error) {
    logger.error('Failed to stream AI inference:', error);
    res.status(500).json({ 
      error: 'Failed to stream AI inference',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
