import request from 'supertest';
import express from 'express';
import adminRoutes from '../admin';

jest.mock('../../services/wsService', () => ({
  getWSService: () => ({
    getClientCount: () => 0,
    getClients: () => [],
  }),
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin API authentication', () => {
  const ORIGINAL_ENV = process.env.ADMIN_API_KEY;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = ORIGINAL_ENV;
    }
  });

  describe('when ADMIN_API_KEY is not configured', () => {
    beforeEach(() => {
      delete process.env.ADMIN_API_KEY;
    });

    it('returns 503 rather than falling back to a published key', async () => {
      const res = await request(app).get('/api/admin/config');
      expect(res.statusCode).toBe(503);
      expect(res.body.error).toBe('Admin API unavailable');
    });
  });

  describe('when ADMIN_API_KEY is configured', () => {
    beforeEach(() => {
      process.env.ADMIN_API_KEY = 'test-secret-key';
    });

    it('rejects requests with no credentials', async () => {
      const res = await request(app).get('/api/admin/config');
      expect(res.statusCode).toBe(401);
    });

    it('ignores the apiKey query parameter (keys must not appear in URLs)', async () => {
      const res = await request(app).get('/api/admin/config?apiKey=test-secret-key');
      expect(res.statusCode).toBe(401);
    });

    it('rejects a wrong x-api-key header', async () => {
      const res = await request(app)
        .get('/api/admin/config')
        .set('x-api-key', 'wrong-key');
      expect(res.statusCode).toBe(401);
    });

    it('accepts the correct x-api-key header', async () => {
      const res = await request(app)
        .get('/api/admin/config')
        .set('x-api-key', 'test-secret-key');
      expect(res.statusCode).toBe(200);
    });

    it('unimplemented endpoints return 501, not 200 placeholders', async () => {
      const put = await request(app)
        .put('/api/admin/config')
        .set('x-api-key', 'test-secret-key')
        .send({ config: {} });
      expect(put.statusCode).toBe(501);

      const logs = await request(app)
        .get('/api/admin/logs')
        .set('x-api-key', 'test-secret-key');
      expect(logs.statusCode).toBe(501);

      const disconnect = await request(app)
        .post('/api/admin/clients/abc/disconnect')
        .set('x-api-key', 'test-secret-key');
      expect(disconnect.statusCode).toBe(501);
    });
  });
});
