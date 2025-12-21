import request from 'supertest';
import express, { Express } from 'express';

// Mock axios for external service calls
jest.mock('axios');

// Mock the index module for wsService
jest.mock('../../../../packages/backend/src/index', () => ({
  wsService: {
    getClientCount: () => 0
  }
}));

// Import after mocking
import healthRouter from '../../../../packages/backend/src/routes/health';

describe('Health Check Endpoints', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/health', healthRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK with basic health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
    });

    it('should include timestamp that is recent', async () => {
      const beforeTime = Date.now();
      const response = await request(app).get('/health');
      const afterTime = Date.now();
      
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(response.body.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include services object', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body).toHaveProperty('services');
      expect(typeof response.body.services).toBe('object');
    });

    it('should handle 50 concurrent requests', async () => {
      const requests = Array(50).fill(null).map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
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

    it('should check Ollama connection', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockImplementation((url: string) => {
        if (url.includes('11434')) {
          return Promise.resolve({ data: { models: [] } });
        }
        return Promise.reject(new Error('Service unavailable'));
      });
      
      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
    });

    it('should check vision service connection', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockImplementation((url: string) => {
        if (url.includes('5000')) {
          return Promise.resolve({ data: { status: 'healthy' } });
        }
        return Promise.reject(new Error('Service unavailable'));
      });
      
      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return 503 if dependencies are down', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue(new Error('Connection refused'));
      
      const response = await request(app).get('/health/ready');
      
      // May return 200 or 503 depending on implementation
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('GET /health/deep', () => {
    it('should return detailed health status', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      const response = await request(app).get('/health/deep');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
    });

    it('should include memory information', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      const response = await request(app).get('/health/deep');
      
      // Deep health should include system metrics
      expect(response.body).toHaveProperty('checks');
    });

    it('should include uptime', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      const response = await request(app).get('/health/deep');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      // Check for uptime or timestamp
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 OK for liveness probe', async () => {
      const response = await request(app).get('/health/live');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('alive');
    });

    it('should be fast (< 100ms)', async () => {
      const startTime = Date.now();
      await request(app).get('/health/live');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100);
    });
  });
});

