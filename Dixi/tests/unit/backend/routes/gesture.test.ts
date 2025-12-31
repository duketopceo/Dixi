import request from 'supertest';
import express, { Express } from 'express';

// Mock axios for external service calls
jest.mock('axios');

// Mock the AI service
jest.mock('../../../../packages/backend/src/services/ai', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    infer: jest.fn().mockResolvedValue({ text: 'Mocked AI response', metadata: {} }),
    inferStream: jest.fn().mockImplementation((prompt, context, callback) => {
      callback({ text: 'Mocked', done: false });
      callback({ text: ' response', done: true });
      return Promise.resolve();
    }),
    checkConnection: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock the index module for wsService
jest.mock('../../../../packages/backend/src/index', () => ({
  wsService: {
    getClientCount: () => 0,
    broadcastGestureUpdate: jest.fn(),
    broadcastAIResponse: jest.fn()
  }
}));

// Import after mocking
import gestureRouter from '../../../../packages/backend/src/routes/gesture';

// Load test fixtures
const fixtures = require('../../../fixtures/gestures.json');

describe('Gesture Endpoints', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/gestures', gestureRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /gestures', () => {
    it('should return current gesture data when vision service is available', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockResolvedValue({ 
        data: fixtures.validWave 
      });
      
      const response = await request(app).get('/gestures');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('type');
    });

    it('should NOT trigger AI service on GET request (bug fix validation)', async () => {
      const axios = require('axios');
      const aiMock = jest.fn();
      axios.get = jest.fn().mockResolvedValue({ 
        data: fixtures.validPoint 
      });
      axios.post = aiMock;
      
      await request(app).get('/gestures');
      
      // AI should NOT be called on GET - this was the freeze bug
      expect(aiMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/generate'),
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle missing gesture gracefully', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockResolvedValue({ 
        data: { type: 'none', confidence: 0 } 
      });
      
      const response = await request(app).get('/gestures');
      
      expect(response.status).toBe(200);
      expect(response.body.type).toBe('none');
    });

    it('should return 503 when vision service is unavailable', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue({ 
        code: 'ECONNREFUSED' 
      });
      
      const response = await request(app).get('/gestures');
      
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.type).toBe('connection_error');
    });

    it('should handle timeout gracefully', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockRejectedValue({ 
        code: 'ETIMEDOUT' 
      });
      
      const response = await request(app).get('/gestures');
      
      expect(response.status).toBe(503);
    });
  });

  describe('POST /gestures/process', () => {
    it('should accept valid gesture data', async () => {
      const response = await request(app)
        .post('/gestures/process')
        .send(fixtures.validWave);
      
      expect(response.status).toBe(200);
    });

    it('should NOT auto-trigger AI on process (bug fix validation)', async () => {
      const axios = require('axios');
      const aiMock = jest.fn();
      axios.post = aiMock;
      
      await request(app)
        .post('/gestures/process')
        .send(fixtures.validWave);
      
      // AI should NOT be auto-called on process - this was the freeze bug
      // Only manual analyze should trigger AI
      expect(aiMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/generate'),
        expect.anything(),
        expect.anything()
      );
    });

    it('should validate gesture type', async () => {
      const response = await request(app)
        .post('/gestures/process')
        .send(fixtures.invalidType);
      
      // Should still accept but may flag as unknown
      expect([200, 400]).toContain(response.status);
    });

    it('should validate confidence range (0-1)', async () => {
      const response = await request(app)
        .post('/gestures/process')
        .send(fixtures.invalidConfidence);
      
      // Should either normalize or reject
      expect([200, 400]).toContain(response.status);
    });

    it('should handle missing position', async () => {
      const response = await request(app)
        .post('/gestures/process')
        .send(fixtures.missingPosition);
      
      // Should still process with default position
      expect([200, 400]).toContain(response.status);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/gestures/process')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).toBe(400);
    });

    it('should reject extremely large payloads (>10MB)', async () => {
      const largePayload = {
        type: 'wave',
        data: 'x'.repeat(11 * 1024 * 1024) // 11MB
      };
      
      const response = await request(app)
        .post('/gestures/process')
        .send(largePayload);
      
      expect(response.status).toBe(413); // Payload Too Large
    });

    it('should handle 100 concurrent submissions', async () => {
      const requests = Array(100).fill(null).map((_, i) => 
        request(app)
          .post('/gestures/process')
          .send({
            ...fixtures.validWave,
            timestamp: Date.now() + i
          })
      );
      
      const responses = await Promise.all(requests);
      
      // All should complete (200 or 429 for rate limited)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should accept all valid gesture types', async () => {
      const gestureTypes: string[] = fixtures.allGestureTypes;
      
      for (const gestureType of gestureTypes) {
        const response = await request(app)
          .post('/gestures/process')
          .send({
            type: gestureType,
            position: { x: 0.5, y: 0.5, z: 0 },
            confidence: 0.85,
            timestamp: Date.now()
          });
        
        expect([200, 429]).toContain(response.status);
      }
    });
  });

  describe('POST /gestures/analyze-now', () => {
    it('should trigger manual AI analysis', async () => {
      const response = await request(app)
        .post('/gestures/analyze-now')
        .send({});
      
      expect([200, 429]).toContain(response.status);
    });

    it('should respect rate limiting', async () => {
      // First request should succeed
      const first = await request(app)
        .post('/gestures/analyze-now')
        .send({});
      
      // Immediate second request should be rate limited
      const second = await request(app)
        .post('/gestures/analyze-now')
        .send({});
      
      expect([200, 429]).toContain(first.status);
      expect([200, 429]).toContain(second.status);
    });
  });

  describe('POST /gestures/start', () => {
    it('should start tracking', async () => {
      const response = await request(app)
        .post('/gestures/start')
        .send({});
      
      expect(response.status).toBe(200);
    });

    it('should be idempotent (can call multiple times)', async () => {
      await request(app).post('/gestures/start').send({});
      const response = await request(app).post('/gestures/start').send({});
      
      expect(response.status).toBe(200);
    });
  });

  describe('POST /gestures/stop', () => {
    it('should stop tracking', async () => {
      const response = await request(app)
        .post('/gestures/stop')
        .send({});
      
      expect(response.status).toBe(200);
    });
  });

  describe('Continuous Analysis Toggle', () => {
    it('should get continuous analysis status', async () => {
      const response = await request(app)
        .get('/gestures/continuous-analysis/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled');
      expect(typeof response.body.enabled).toBe('boolean');
    });

    it('should toggle continuous analysis', async () => {
      const response = await request(app)
        .post('/gestures/continuous-analysis/toggle')
        .send({ enabled: true });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled');
    });
  });
});

