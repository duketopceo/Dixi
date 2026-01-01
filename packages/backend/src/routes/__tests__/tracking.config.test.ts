import request from 'supertest';
import express from 'express';
import trackingRoutes from '../tracking';

// Mock axios for vision service calls
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const axios = require('axios');

const app = express();
app.use(express.json());
app.use('/api/tracking', trackingRoutes);

describe('Vision Configuration API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/tracking/config should return current vision config', async () => {
    const mockConfig = {
      config: {
        frame_skip_interval: 2,
        enable_face_tracking: true,
        enable_pose_tracking: true,
        backend_push_cooldown_ms: 500,
        adaptive_fps: false,
      },
      timestamp: Date.now(),
    };

    axios.get.mockResolvedValueOnce({ data: mockConfig });

    const res = await request(app).get('/api/tracking/config');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockConfig);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/config'),
      expect.objectContaining({ timeout: 2000 })
    );
  });

  it('GET /api/tracking/config should handle vision service unavailable', async () => {
    axios.get.mockRejectedValueOnce({
      code: 'ECONNREFUSED',
    });

    const res = await request(app).get('/api/tracking/config');

    expect(res.statusCode).toEqual(503);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Vision service unavailable');
  });

  it('POST /api/tracking/config should update vision config', async () => {
    const updates = {
      frame_skip_interval: 3,
      enable_face_tracking: false,
    };

    const mockResponse = {
      message: 'Configuration updated',
      config: {
        frame_skip_interval: 3,
        enable_face_tracking: false,
        enable_pose_tracking: true,
        backend_push_cooldown_ms: 500,
        adaptive_fps: false,
      },
      timestamp: Date.now(),
    };

    axios.post.mockResolvedValueOnce({ data: mockResponse });

    const res = await request(app)
      .post('/api/tracking/config')
      .send(updates);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockResponse);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/config'),
      updates,
      expect.objectContaining({ timeout: 2000 })
    );
  });

  it('POST /api/tracking/config should handle vision service unavailable', async () => {
    axios.post.mockRejectedValueOnce({
      code: 'ECONNREFUSED',
    });

    const res = await request(app)
      .post('/api/tracking/config')
      .send({ frame_skip_interval: 2 });

    expect(res.statusCode).toEqual(503);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Vision service unavailable');
  });
});
