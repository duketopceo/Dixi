import request from 'supertest';
import express, { Express } from 'express';

// Mock monitoring service
jest.mock('../../../../packages/backend/src/services/monitoring', () => ({
  MonitoringService: jest.fn().mockImplementation(() => ({
    getSystemMetrics: () => ({
      cpu: { usage: 0.5 },
      memory: { used: 100, total: 200 },
      uptime: 3600,
    }),
    getRequestMetrics: () => ({
      totalRequests: 100,
      requestsPerSecond: 10,
      averageResponseTime: 50,
    }),
    getGestureMetrics: () => ({
      totalGestures: 50,
      gesturesPerSecond: 5,
      gestureTypes: { point: 20, pinch: 15, wave: 15 },
    }),
    getAIMetrics: () => ({
      totalQueries: 30,
      averageResponseTime: 200,
      cacheHitRate: 0.6,
    }),
    getWebSocketMetrics: () => ({
      connectedClients: 2,
      messagesPerSecond: 5,
    }),
    getPrometheusMetrics: () => '# Prometheus metrics\nmetric_name 123',
  })),
}));

// Import after mocking
import metricsRouter from '../../../../packages/backend/src/routes/metrics';

describe('Metrics Routes', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/metrics', metricsRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/metrics', () => {
    it('should return all metrics', async () => {
      const response = await request(app).get('/api/metrics');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('system');
      expect(response.body.metrics).toHaveProperty('requests');
      expect(response.body.metrics).toHaveProperty('gestures');
      expect(response.body.metrics).toHaveProperty('ai');
      expect(response.body.metrics).toHaveProperty('websocket');
      expect(response.body.metrics).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/metrics/system', () => {
    it('should return system metrics only', async () => {
      const response = await request(app).get('/api/metrics/system');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('cpu');
      expect(response.body.metrics).toHaveProperty('memory');
      expect(response.body.metrics).toHaveProperty('uptime');
    });
  });

  describe('GET /api/metrics/ai', () => {
    it('should return AI metrics only', async () => {
      const response = await request(app).get('/api/metrics/ai');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('totalQueries');
      expect(response.body.metrics).toHaveProperty('averageResponseTime');
    });
  });

  describe('GET /api/metrics/gestures', () => {
    it('should return gesture metrics only', async () => {
      const response = await request(app).get('/api/metrics/gestures');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('totalGestures');
    });
  });

  describe('GET /api/metrics/websocket', () => {
    it('should return WebSocket metrics only', async () => {
      const response = await request(app).get('/api/metrics/websocket');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('connectedClients');
    });
  });

  describe('GET /api/metrics/requests', () => {
    it('should return request metrics only', async () => {
      const response = await request(app).get('/api/metrics/requests');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('totalRequests');
    });
  });

  describe('GET /api/metrics/prometheus', () => {
    it('should return Prometheus format metrics', async () => {
      const response = await request(app).get('/api/metrics/prometheus');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('Prometheus');
    });
  });
});

