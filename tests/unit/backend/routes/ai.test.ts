import request from 'supertest';
import express, { Express } from 'express';

// Mock axios for external service calls
jest.mock('axios');

// Mock the AI service
jest.mock('../../../../packages/backend/src/services/ai', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    infer: jest.fn().mockResolvedValue({ 
      text: 'Mocked AI response', 
      metadata: { model: 'gemma3:4b' } 
    }),
    inferStream: jest.fn().mockImplementation((prompt, context, callback) => {
      callback({ text: 'Streamed ', done: false });
      callback({ text: 'response', done: true });
      return Promise.resolve();
    }),
    checkConnection: jest.fn().mockResolvedValue(true),
    initialized: true,
    modelName: 'gemma3:4b'
  }))
}));

// Mock the index module for wsService
jest.mock('../../../../packages/backend/src/index', () => ({
  wsService: {
    getClientCount: () => 0,
    broadcastAIResponse: jest.fn()
  }
}));

// Import after mocking
import aiRouter from '../../../../packages/backend/src/routes/ai';

describe('AI Endpoints', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/ai', aiRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /ai/infer', () => {
    it('should accept manual query and return response', async () => {
      const response = await request(app)
        .post('/ai/infer')
        .send({ query: 'What is 2+2?' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    it('should sanitize HTML/script tags (XSS prevention)', async () => {
      const response = await request(app)
        .post('/ai/infer')
        .send({ query: '<script>alert("xss")</script>What is 2+2?' });
      
      expect(response.status).toBe(200);
      // Should not crash or return script tags in response
      expect(response.body.response).not.toContain('<script>');
    });

    it('should handle SQL injection attempts safely', async () => {
      const response = await request(app)
        .post('/ai/infer')
        .send({ query: "'; DROP TABLE users; --" });
      
      expect(response.status).toBe(200);
      // Should process as normal query
    });

    it('should handle extremely long queries', async () => {
      const longQuery = 'a'.repeat(100000);
      
      const response = await request(app)
        .post('/ai/infer')
        .send({ query: longQuery });
      
      // Should either process or reject with 400
      expect([200, 400, 413]).toContain(response.status);
    });

    it('should handle unicode and emoji correctly', async () => {
      const response = await request(app)
        .post('/ai/infer')
        .send({ query: '你好世界 🌍 What does this mean?' });
      
      expect(response.status).toBe(200);
    });

    it('should reject empty queries', async () => {
      const response = await request(app)
        .post('/ai/infer')
        .send({ query: '' });
      
      expect(response.status).toBe(400);
    });

    it('should reject missing query field', async () => {
      const response = await request(app)
        .post('/ai/infer')
        .send({});
      
      expect(response.status).toBe(400);
    });

    it('should include context when provided', async () => {
      const response = await request(app)
        .post('/ai/infer')
        .send({ 
          query: 'What gesture was that?',
          context: {
            gesture: {
              type: 'wave',
              confidence: 0.85
            }
          }
        });
      
      expect(response.status).toBe(200);
    });
  });

  describe('POST /ai/stream', () => {
    it('should stream response', async () => {
      const response = await request(app)
        .post('/ai/stream')
        .send({ query: 'Tell me a story' });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should reject empty queries', async () => {
      const response = await request(app)
        .post('/ai/stream')
        .send({ query: '' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /ai/status', () => {
    it('should return AI service status', async () => {
      const response = await request(app).get('/ai/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });

    it('should include model name', async () => {
      const response = await request(app).get('/ai/status');
      
      expect(response.status).toBe(200);
      // Model name should be present
      expect(response.body).toHaveProperty('model');
    });

    it('should show connection state', async () => {
      const response = await request(app).get('/ai/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('connected');
      expect(typeof response.body.connected).toBe('boolean');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid requests gracefully', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(app)
          .post('/ai/infer')
          .send({ query: 'Quick question' })
      );
      
      const responses = await Promise.all(requests);
      
      // All should either succeed or be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});

