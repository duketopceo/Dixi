import { Router, Request, Response } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5001';

// Basic health check (fast)
router.get('/', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      backend: 'running',
      ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    }
  });
});

// Deep health check (comprehensive)
router.get('/deep', async (req: Request, res: Response) => {
  const checks: any = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    backend: { status: 'healthy' },
    vision: { status: 'unknown' },
    gpu: { status: 'unknown' },
    websocket: { status: 'unknown' }
  };

  // Check Vision Service
  try {
    const visionResponse = await axios.get(`${VISION_SERVICE_URL}/health`, { timeout: 5000 });
    checks.vision = {
      status: 'healthy',
      response: visionResponse.data
    };
  } catch (error) {
    logger.warn('Vision service health check failed:', error);
    checks.vision = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check Ollama AI Service
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const ollamaResponse = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 });
    checks.ollama = {
      status: 'healthy',
      url: ollamaUrl,
      models: ollamaResponse.data.models?.map((m: any) => m.name) || []
    };
  } catch (error) {
    logger.warn('Ollama health check failed:', error);
    checks.ollama = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check WebSocket
  try {
    const { wsService } = await import('../index');
    checks.websocket = {
      status: 'healthy',
      connectedClients: wsService ? wsService.getClientCount() : 0
    };
  } catch (error) {
    logger.warn('WebSocket health check failed:', error);
    checks.websocket = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Determine overall health
  const isHealthy = checks.vision.status === 'healthy' && 
                    checks.ollama.status === 'healthy' &&
                    checks.websocket.status === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    checks
  });
});

// Readiness check (for k8s/cloud deployments)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if critical services are ready
    const visionReady = await axios.get(`${VISION_SERVICE_URL}/health`, { timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    const isReady = visionReady;

    if (isReady) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'Vision service unavailable' });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({ status: 'not ready', error: 'Internal error' });
  }
});

// Liveness check (for k8s/cloud deployments)
router.get('/live', (req: Request, res: Response) => {
  // Simple check that the process is alive
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

export default router;
