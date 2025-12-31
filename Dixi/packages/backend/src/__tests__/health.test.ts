import request from 'supertest';
import express from 'express';
import healthRouter from '../routes/health';

// Mock axios for vision service calls
jest.mock('axios');
jest.mock('../index', () => ({
  wsService: {
    getClientCount: () => 0
  }
}));

const app = express();
app.use(express.json());
app.use('/health', healthRouter);

describe('Health Check Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK with basic health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('GET /health/deep', () => {
    it('should return health status with service checks', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      const response = await request(app).get('/health/deep');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 OK for liveness probe', async () => {
      const response = await request(app).get('/health/live');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('alive');
    });
  });
});

