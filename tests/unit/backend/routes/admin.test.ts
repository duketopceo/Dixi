import request from 'supertest';
import express, { Express } from 'express';

// Mock wsService
jest.mock('../../../../packages/backend/src/index', () => ({
  wsService: {
    getClientCount: () => 2,
    getClients: () => [
      { id: 'client1', connectedAt: Date.now(), lastActivity: Date.now() },
      { id: 'client2', connectedAt: Date.now(), lastActivity: Date.now() },
    ],
  }
}));

// Set admin API key for tests
process.env.ADMIN_API_KEY = 'test-admin-key';

// Import after mocking
import adminRouter from '../../../../packages/backend/src/routes/admin';

describe('Admin Routes', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should require API key for all endpoints', async () => {
      const response = await request(app).get('/api/admin/config');
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should accept API key in header', async () => {
      const response = await request(app)
        .get('/api/admin/config')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
    });

    it('should accept API key in query parameter', async () => {
      const response = await request(app)
        .get('/api/admin/config?apiKey=test-admin-key');
      
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/admin/config', () => {
    it('should return current configuration', async () => {
      const response = await request(app)
        .get('/api/admin/config')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('config');
      expect(response.body.config).toHaveProperty('server');
      expect(response.body.config).toHaveProperty('services');
      expect(response.body.config).toHaveProperty('frontend');
      expect(response.body.config).toHaveProperty('cache');
    });
  });

  describe('PUT /api/admin/config', () => {
    it('should return not implemented message', async () => {
      const response = await request(app)
        .put('/api/admin/config')
        .set('x-api-key', 'test-admin-key')
        .send({ config: {} });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('not yet implemented');
    });
  });

  describe('GET /api/admin/logs', () => {
    it('should return logs endpoint info', async () => {
      const response = await request(app)
        .get('/api/admin/logs?limit=50')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('limit');
    });
  });

  describe('GET /api/admin/clients', () => {
    it('should return connected WebSocket clients', async () => {
      const response = await request(app)
        .get('/api/admin/clients')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('clients');
      expect(response.body.count).toBe(2);
      expect(Array.isArray(response.body.clients)).toBe(true);
    });
  });

  describe('POST /api/admin/clients/:id/disconnect', () => {
    it('should return not implemented message', async () => {
      const response = await request(app)
        .post('/api/admin/clients/client1/disconnect')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('not yet implemented');
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return system statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('x-api-key', 'test-admin-key');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('server');
      expect(response.body.stats).toHaveProperty('websocket');
      expect(response.body.stats.server).toHaveProperty('uptime');
      expect(response.body.stats.server).toHaveProperty('memory');
    });
  });
});

