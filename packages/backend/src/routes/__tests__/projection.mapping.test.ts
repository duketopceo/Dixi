import request from 'supertest';
import express, { Express } from 'express';
import projectionRoutes from '../projection';

// Mock wsService to avoid WebSocket dependencies in tests
jest.mock('../../index', () => ({
  wsService: null
}));

describe('Projection Mapping API', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/projection', projectionRoutes);
  });

  describe('GET /api/projection/mapping', () => {
    it('should return calibrated: false when no calibration exists', async () => {
      const response = await request(app)
        .get('/api/projection/mapping')
        .expect(200);

      expect(response.body).toEqual({ calibrated: false });
    });

    it('should return stored calibration after POST', async () => {
      const calibrationPayload = {
        points: [
          { id: 'topLeft', cameraX: 0.1, cameraY: 0.1 },
          { id: 'topRight', cameraX: 0.9, cameraY: 0.1 },
          { id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 },
          { id: 'bottomRight', cameraX: 0.9, cameraY: 0.9 }
        ],
        createdAt: new Date().toISOString()
      };

      // First POST to store calibration
      await request(app)
        .post('/api/projection/mapping')
        .send(calibrationPayload)
        .expect(200);

      // Then GET should return the stored calibration
      const getResponse = await request(app)
        .get('/api/projection/mapping')
        .expect(200);

      expect(getResponse.body.calibrated).toBe(true);
      expect(getResponse.body.points).toHaveLength(4);
      expect(getResponse.body.points).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'topLeft', cameraX: 0.1, cameraY: 0.1 }),
        expect.objectContaining({ id: 'topRight', cameraX: 0.9, cameraY: 0.1 }),
        expect.objectContaining({ id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 }),
        expect.objectContaining({ id: 'bottomRight', cameraX: 0.9, cameraY: 0.9 })
      ]));
      expect(getResponse.body.createdAt).toBeDefined();
    });
  });

  describe('POST /api/projection/mapping', () => {
    it('should accept valid calibration payload and return 200', async () => {
      const calibrationPayload = {
        points: [
          { id: 'topLeft', cameraX: 0.0, cameraY: 0.0 },
          { id: 'topRight', cameraX: 1.0, cameraY: 0.0 },
          { id: 'bottomLeft', cameraX: 0.0, cameraY: 1.0 },
          { id: 'bottomRight', cameraX: 1.0, cameraY: 1.0 }
        ],
        createdAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/projection/mapping')
        .send(calibrationPayload)
        .expect(200);

      expect(response.body.calibrated).toBe(true);
      expect(response.body.points).toHaveLength(4);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 400 when points array has wrong length', async () => {
      const invalidPayload = {
        points: [
          { id: 'topLeft', cameraX: 0.1, cameraY: 0.1 },
          { id: 'topRight', cameraX: 0.9, cameraY: 0.1 }
        ]
      };

      const response = await request(app)
        .post('/api/projection/mapping')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when missing required point IDs', async () => {
      const invalidPayload = {
        points: [
          { id: 'topLeft', cameraX: 0.1, cameraY: 0.1 },
          { id: 'topRight', cameraX: 0.9, cameraY: 0.1 },
          { id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 },
          { id: 'topLeft', cameraX: 0.9, cameraY: 0.9 } // Duplicate topLeft, missing bottomRight
        ]
      };

      const response = await request(app)
        .post('/api/projection/mapping')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when coordinates are out of range', async () => {
      const invalidPayload = {
        points: [
          { id: 'topLeft', cameraX: 1.5, cameraY: 0.1 }, // cameraX > 1
          { id: 'topRight', cameraX: 0.9, cameraY: 0.1 },
          { id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 },
          { id: 'bottomRight', cameraX: 0.9, cameraY: 0.9 }
        ]
      };

      const response = await request(app)
        .post('/api/projection/mapping')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when point ID is invalid', async () => {
      const invalidPayload = {
        points: [
          { id: 'invalidId', cameraX: 0.1, cameraY: 0.1 },
          { id: 'topRight', cameraX: 0.9, cameraY: 0.1 },
          { id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 },
          { id: 'bottomRight', cameraX: 0.9, cameraY: 0.9 }
        ]
      };

      const response = await request(app)
        .post('/api/projection/mapping')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when points array is missing', async () => {
      const invalidPayload = {
        createdAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/projection/mapping')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
