import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getLogService } from '../services/logService';
import logger from '../utils/logger';

const router = Router();
const logService = getLogService();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5001';

/**
 * GET /api/logs/backend
 * Get backend logs (Winston)
 * Query params: level, limit, since, search
 */
router.get('/backend', (req: Request, res: Response) => {
  try {
    const level = req.query.level as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const since = req.query.since ? parseInt(req.query.since as string) : undefined;
    const search = req.query.search as string | undefined;
    
    const logs = logService.getBackendLogs({
      level,
      limit,
      since,
      search
    });
    
    res.json({
      message: 'Backend logs retrieved successfully',
      logs,
      count: logs.length
    });
  } catch (error) {
    logger.error('Failed to get backend logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve backend logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/logs/vision
 * Get vision service logs (proxy to vision service)
 */
router.get('/vision', async (req: Request, res: Response) => {
  try {
    const level = req.query.level as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    const response = await axios.get(`${VISION_SERVICE_URL}/logs`, {
      params: { level, limit },
      timeout: 2000
    });
    
    res.json({
      message: 'Vision service logs retrieved successfully',
      logs: response.data,
      count: Array.isArray(response.data) ? response.data.length : 0
    });
  } catch (error: any) {
    logger.error('Failed to get vision logs:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      res.status(503).json({
        error: 'Vision service unavailable',
        details: 'Vision service is not running or not accessible.'
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to retrieve vision service logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/logs/stats
 * Get log statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = logService.getLogStats();
    
    res.json({
      message: 'Log statistics retrieved successfully',
      stats
    });
  } catch (error) {
    logger.error('Failed to get log stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve log statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
