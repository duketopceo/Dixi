import { Router, Request, Response } from 'express';
import { MonitoringService } from '../services/monitoring';
import logger from '../utils/logger';

const router = Router();

// Get monitoring service instance (singleton)
const monitoringService = new MonitoringService();

/**
 * GET /api/metrics
 * Get all metrics (system, requests, gestures, AI, WebSocket)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const metrics = {
      system: monitoringService.getSystemMetrics(),
      requests: monitoringService.getRequestMetrics(),
      gestures: monitoringService.getGestureMetrics(),
      ai: monitoringService.getAIMetrics(),
      websocket: monitoringService.getWebSocketMetrics(),
      timestamp: Date.now(),
    };

    res.json({
      message: 'Metrics retrieved successfully',
      metrics,
    });
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/system
 * Get system metrics only (CPU, memory, uptime)
 */
router.get('/system', (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getSystemMetrics();

    res.json({
      message: 'System metrics retrieved successfully',
      metrics,
    });
  } catch (error) {
    logger.error('Failed to get system metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve system metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/ai
 * Get AI metrics only
 */
router.get('/ai', (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getAIMetrics();

    res.json({
      message: 'AI metrics retrieved successfully',
      metrics,
    });
  } catch (error) {
    logger.error('Failed to get AI metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve AI metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/gestures
 * Get gesture metrics only
 */
router.get('/gestures', (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getGestureMetrics();

    res.json({
      message: 'Gesture metrics retrieved successfully',
      metrics,
    });
  } catch (error) {
    logger.error('Failed to get gesture metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve gesture metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/websocket
 * Get WebSocket metrics only
 */
router.get('/websocket', (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getWebSocketMetrics();

    res.json({
      message: 'WebSocket metrics retrieved successfully',
      metrics,
    });
  } catch (error) {
    logger.error('Failed to get WebSocket metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve WebSocket metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/requests
 * Get request metrics only
 */
router.get('/requests', (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getRequestMetrics();

    res.json({
      message: 'Request metrics retrieved successfully',
      metrics,
    });
  } catch (error) {
    logger.error('Failed to get request metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve request metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/prometheus
 * Export metrics in Prometheus format
 */
router.get('/prometheus', (req: Request, res: Response) => {
  try {
    const prometheusMetrics = monitoringService.getPrometheusMetrics();

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Failed to export Prometheus metrics:', error);
    res.status(500).json({
      error: 'Failed to export Prometheus metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

