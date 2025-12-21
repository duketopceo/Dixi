import { Router, Request, Response } from 'express';
import { wsService } from '../index';

const router = Router();

// Get projection status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    active: true,
    renderAPI: process.env.RENDER_API || 'webgl',
    gpuAcceleration: process.env.ENABLE_GPU_ACCELERATION === 'true',
    connectedClients: wsService ? wsService.getClientCount() : 0
  });
});

// Update projection mapping
router.post('/mapping', (req: Request, res: Response) => {
  try {
    const { calibrationData, transform } = req.body;
    
    // Broadcast projection update
    if (wsService) {
      wsService.broadcastProjection({
        type: 'mapping_update',
        calibrationData,
        transform,
        timestamp: Date.now()
      });
    }

    res.json({ 
      message: 'Projection mapping updated',
      calibrationData,
      transform
    });
  } catch (error) {
    console.error('Failed to update projection mapping:', error);
    res.status(500).json({ 
      error: 'Failed to update projection mapping',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Set projection content
router.post('/content', (req: Request, res: Response) => {
  try {
    const { content, position, style } = req.body;
    
    // Broadcast content update
    if (wsService) {
      wsService.broadcastProjection({
        type: 'content_update',
        content,
        position,
        style,
        timestamp: Date.now()
      });
    }

    res.json({ 
      message: 'Projection content updated',
      content
    });
  } catch (error) {
    console.error('Failed to update projection content:', error);
    res.status(500).json({ 
      error: 'Failed to update projection content',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
