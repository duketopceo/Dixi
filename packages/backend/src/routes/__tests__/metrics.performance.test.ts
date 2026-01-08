import request from 'supertest';
import express from 'express';
import metricsRoutes from '../metrics';
import { MonitoringService } from '../../services/monitoring';

// Mock axios for vision service calls
jest.mock('axios', () => ({
  get: jest.fn(),
}));

const axios = require('axios');

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

describe('Performance Metrics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/metrics/performance should return performance metrics', async () => {
    // Mock vision service status
    axios.get.mockResolvedValueOnce({
      data: {
        hand_tracking: true,
        face_tracking: true,
        pose_tracking: true,
      },
    });

    const res = await request(app).get('/api/metrics/performance');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('performance');
    expect(res.body.performance).toHaveProperty('vision');
    expect(res.body.performance).toHaveProperty('backend');
    expect(res.body.performance).toHaveProperty('websocket');
    expect(res.body.performance).toHaveProperty('system');
    expect(res.body.performance.vision).toHaveProperty('fps');
    expect(res.body.performance.vision).toHaveProperty('status');
    expect(res.body.performance.vision).toHaveProperty('models');
    expect(res.body.performance.vision.models).toHaveProperty('hands');
    expect(res.body.performance.vision.models).toHaveProperty('face');
    expect(res.body.performance.vision.models).toHaveProperty('pose');
  });

  it('GET /api/metrics/performance should handle vision service unavailable', async () => {
    axios.get.mockRejectedValueOnce({
      code: 'ECONNREFUSED',
    });

    const res = await request(app).get('/api/metrics/performance');

    expect(res.statusCode).toEqual(200);
    expect(res.body.performance.vision.status).toBe('disconnected');
  });

  it('GET /api/metrics/performance should include system metrics', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        hand_tracking: true,
        face_tracking: false,
        pose_tracking: true,
      },
    });

    const res = await request(app).get('/api/metrics/performance');

    expect(res.statusCode).toEqual(200);
    expect(res.body.performance.system).toHaveProperty('cpu');
    expect(res.body.performance.system).toHaveProperty('memory');
    expect(res.body.performance.system).toHaveProperty('memoryUsed');
    expect(res.body.performance.system).toHaveProperty('memoryTotal');
    expect(typeof res.body.performance.system.cpu).toBe('number');
    expect(typeof res.body.performance.system.memory).toBe('number');
  });
});
