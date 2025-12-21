import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai';
import { wsService } from '../index';

const router = Router();
const aiService = new AIService();

// Get AI model status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await aiService.getModelStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get AI model status:', error);
    res.status(500).json({ 
      error: 'Failed to get AI model status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize AI model
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const { modelPath, modelSize } = req.body;
    await aiService.initialize(modelPath, modelSize);
    res.json({ 
      message: 'AI model initialized successfully',
      modelSize: modelSize || process.env.MODEL_SIZE || '7B'
    });
  } catch (error) {
    console.error('Failed to initialize AI model:', error);
    res.status(500).json({ 
      error: 'Failed to initialize AI model',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate AI inference
router.post('/infer', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const response = await aiService.infer(query, context);
    
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
    console.error('Failed to generate AI inference:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI inference',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stream AI inference (for long responses)
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await aiService.inferStream(query, context, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Failed to stream AI inference:', error);
    res.status(500).json({ 
      error: 'Failed to stream AI inference',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
