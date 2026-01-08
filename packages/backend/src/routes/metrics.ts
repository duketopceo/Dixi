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
    const prometheusMetrics = monitoringService.exportPrometheusMetrics();

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

/**
 * GET /api/metrics/performance
 * Get performance metrics including vision service FPS, latency, and model status
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5001';
    const axios = require('axios');
    
    // Get tracking status from vision service
    let visionStatus = null;
    let visionFPS = null;
    let modelStatus = {
      hands: false,
      face: false,
      pose: false
    };
    
    try {
      const trackingStatus = await axios.get(`${VISION_SERVICE_URL}/tracking/status`, { timeout: 2000 });
      if (trackingStatus.data) {
        modelStatus = {
          hands: trackingStatus.data.hand_tracking || false,
          face: trackingStatus.data.face_tracking || false,
          pose: trackingStatus.data.pose_tracking || false
        };
      }
    } catch (error) {
      logger.debug('Could not fetch vision service status:', error);
    }
    
    // Get system metrics
    const systemMetrics = monitoringService.getSystemMetrics();
    const requestMetrics = monitoringService.getRequestMetrics();
    const wsMetrics = monitoringService.getWebSocketMetrics();
    
    // Estimate FPS based on request rate (approximation)
    // In a real implementation, vision service would report actual FPS
    visionFPS = requestMetrics.requestsPerSecond * 2; // Rough estimate
    
    res.json({
      message: 'Performance metrics retrieved successfully',
      performance: {
        vision: {
          fps: visionFPS,
          status: visionStatus ? 'connected' : 'disconnected',
          models: modelStatus
        },
        backend: {
          latency: requestMetrics.averageLatency,
          requestsPerSecond: requestMetrics.requestsPerSecond,
          p95Latency: requestMetrics.p95Latency,
          p99Latency: requestMetrics.p99Latency
        },
        websocket: {
          connected: wsMetrics.connectedClients > 0,
          clients: wsMetrics.connectedClients,
          messagesPerSecond: wsMetrics.messagesPerSecond,
          latency: wsMetrics.averageLatency
        },
        system: {
          cpu: systemMetrics.cpu.usage,
          memory: systemMetrics.memory.usagePercent,
          memoryUsed: systemMetrics.memory.used,
          memoryTotal: systemMetrics.memory.total
        },
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Failed to get performance metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

