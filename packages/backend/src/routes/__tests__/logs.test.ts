import request from 'supertest';
import express from 'express';
import logsRoutes from '../logs';
import { getLogService } from '../../services/logService';

// Mock axios for vision service calls
jest.mock('axios', () => ({
  get: jest.fn(),
}));

const axios = require('axios');

const app = express();
app.use(express.json());
app.use('/api/logs', logsRoutes);

describe('Logs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/logs/backend should return backend logs', async () => {
    const res = await request(app).get('/api/logs/backend');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('logs');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  it('GET /api/logs/backend should filter by level', async () => {
    const res = await request(app).get('/api/logs/backend?level=error');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('logs');
    // All returned logs should be error level (if any exist)
    res.body.logs.forEach((log: any) => {
      if (log.level) {
        expect(log.level).toBe('error');
      }
    });
  });

  it('GET /api/logs/backend should respect limit parameter', async () => {
    const res = await request(app).get('/api/logs/backend?limit=10');

    expect(res.statusCode).toEqual(200);
    expect(res.body.logs.length).toBeLessThanOrEqual(10);
  });

  it('GET /api/logs/vision should proxy to vision service', async () => {
    const mockLogs = ['[21:00:00] Log entry 1', '[21:00:01] Log entry 2'];
    axios.get.mockResolvedValueOnce({ data: mockLogs });

    const res = await request(app).get('/api/logs/vision');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('logs');
    expect(res.body).toHaveProperty('count');
    expect(res.body.logs).toEqual(mockLogs);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/logs'),
      expect.objectContaining({ params: expect.anything(), timeout: 2000 })
    );
  });

  it('GET /api/logs/vision should handle vision service unavailable', async () => {
    axios.get.mockRejectedValueOnce({
      code: 'ECONNREFUSED',
    });

    const res = await request(app).get('/api/logs/vision');

    expect(res.statusCode).toEqual(503);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Vision service unavailable');
  });

  it('GET /api/logs/stats should return log statistics', async () => {
    const res = await request(app).get('/api/logs/stats');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('total');
    expect(res.body.stats).toHaveProperty('byLevel');
    expect(res.body.stats).toHaveProperty('bySource');
    expect(res.body.stats).toHaveProperty('errorRate');
    expect(typeof res.body.stats.total).toBe('number');
    expect(typeof res.body.stats.errorRate).toBe('number');
  });
});
