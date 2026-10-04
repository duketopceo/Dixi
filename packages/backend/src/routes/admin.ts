import { Router, Request, Response } from 'express';
import { getWSService } from '../services/wsService';
import logger from '../utils/logger';

const router = Router();

// API-key authentication. Fail closed: when ADMIN_API_KEY is unset the
// admin surface is unavailable rather than protected by a published value.
// Header-only — query-string keys leak into access logs.
const authenticateAdmin = (req: Request, res: Response, next: Function) => {
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    return res.status(503).json({
      error: 'Admin API unavailable',
      details: 'ADMIN_API_KEY is not configured'
    });
  }
  const apiKey = req.headers['x-api-key'];

  if (apiKey === adminApiKey) {
    next();
  } else {
    res.status(401).json({
      error: 'Unauthorized',
      details: 'Valid API key required for admin endpoints'
    });
  }
};

// Apply authentication to all admin routes
router.use(authenticateAdmin);

/**
 * GET /api/admin/config
 * Get current configuration
 */
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = {
      server: {
        port: process.env.PORT || 3001,
        wsPort: process.env.WS_PORT || 3002,
        nodeEnv: process.env.NODE_ENV || 'development',
      },
      services: {
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        ollamaModel: process.env.OLLAMA_MODEL || 'gemma3:4b',
        visionServiceUrl: process.env.VISION_SERVICE_URL || 'http://localhost:5001',
      },
      frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
      },
      cache: {
        aiCacheSize: process.env.AI_CACHE_SIZE || '100',
        aiCacheTTL: process.env.AI_CACHE_TTL || '3600000',
        gestureCacheSize: process.env.GESTURE_CACHE_SIZE || '200',
        gestureCacheTTL: process.env.GESTURE_CACHE_TTL || '1800000',
      },
    };

    res.json({
      message: 'Configuration retrieved successfully',
      config,
    });
  } catch (error) {
    logger.error('Failed to get config:', error);
    res.status(500).json({
      error: 'Failed to retrieve configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/admin/config
 * Update configuration (runtime updates - limited to safe values)
 */
router.put('/config', (req: Request, res: Response) => {
  try {
    const { config } = req.body;
    
    // Only allow updating certain safe configuration values
    // Note: Environment variables can't be changed at runtime in Node.js
    // This endpoint would need a config service to persist changes
    
    res.status(501).json({
      error: 'Not implemented',
      details: 'Runtime config updates require a config service with persistence',
    });
  } catch (error) {
    logger.error('Failed to update config:', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/logs
 * Get recent logs (last N entries)
 * @deprecated Use /api/logs/backend instead
 */
router.get('/logs', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    
    res.status(501).json({
      error: 'Not implemented',
      details: 'Use /api/logs/backend instead; log querying is not implemented',
      limit,
    });
  } catch (error) {
    logger.error('Failed to get logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve logs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/clients
 * List connected WebSocket clients
 */
router.get('/clients', (req: Request, res: Response) => {
  try {
    const wsService = getWSService();
    if (!wsService) {
      return res.status(503).json({
        error: 'WebSocket service not available',
      });
    }

    const clientCount = wsService.getClientCount();
    const clients = wsService.getClients ? wsService.getClients() : [];

    res.json({
      message: 'Clients retrieved successfully',
      count: clientCount,
      clients: clients.map((client: any) => ({
        id: client.id || 'unknown',
        connectedAt: client.connectedAt || null,
        lastActivity: client.lastActivity || null,
      })),
    });
  } catch (error) {
    logger.error('Failed to get clients:', error);
    res.status(500).json({
      error: 'Failed to retrieve clients',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/clients/:id/disconnect
 * Disconnect specific WebSocket client
 */
router.post('/clients/:id/disconnect', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const wsService = getWSService();
    if (!wsService) {
      return res.status(503).json({
        error: 'WebSocket service not available',
      });
    }

    res.status(501).json({
      error: 'Not implemented',
      details: 'disconnectClient is not implemented in WebSocketService',
      clientId: id,
    });
  } catch (error) {
    logger.error('Failed to disconnect client:', error);
    res.status(500).json({
      error: 'Failed to disconnect client',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const wsService = getWSService();
    const stats = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      websocket: wsService ? {
        clientCount: wsService.getClientCount(),
      } : null,
      timestamp: Date.now(),
    };

    res.json({
      message: 'Statistics retrieved successfully',
      stats,
    });
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

