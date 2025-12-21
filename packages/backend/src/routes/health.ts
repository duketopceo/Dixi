import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as tf from '@tensorflow/tfjs-node-gpu';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5000';

// Basic health check (fast)
router.get('/', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      backend: 'running',
      gpu: process.env.USE_GPU === 'true' ? 'enabled' : 'disabled'
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

  // Check GPU/TensorFlow
  try {
    const gpuInfo = {
      backend: tf.getBackend(),
      available: process.env.USE_GPU === 'true',
      memory: tf.memory()
    };
    checks.gpu = {
      status: 'healthy',
      info: gpuInfo
    };
  } catch (error) {
    logger.warn('GPU health check failed:', error);
    checks.gpu = {
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
                    checks.gpu.status === 'healthy' &&
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
