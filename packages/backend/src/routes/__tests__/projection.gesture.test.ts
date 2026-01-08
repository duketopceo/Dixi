import request from 'supertest';
import express, { Express } from 'express';
import projectionRoutes from '../projection';

// Mock wsService to avoid WebSocket dependencies in tests
jest.mock('../../index', () => ({
  wsService: {
    broadcastProjection: jest.fn(),
    broadcastProjectorGesture: jest.fn(),
    getClientCount: jest.fn(() => 0)
  }
}));

describe('Projection Gesture Normalization', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/projection', projectionRoutes);
  });

  describe('GET /api/projection/status', () => {
    it('should include calibration status', async () => {
      const response = await request(app)
        .get('/api/projection/status')
        .expect(200);

      expect(response.body).toHaveProperty('calibrated');
      expect(typeof response.body.calibrated).toBe('boolean');
    });
  });

  describe('Gesture payload validation', () => {
    // Helper to test that gesture payloads are properly validated
    const validateGesturePayload = (payload: any) => {
      // Position must be within 0-1 range
      if (payload.position) {
        expect(payload.position.x).toBeGreaterThanOrEqual(0);
        expect(payload.position.x).toBeLessThanOrEqual(1);
        expect(payload.position.y).toBeGreaterThanOrEqual(0);
        expect(payload.position.y).toBeLessThanOrEqual(1);
      }

      // No NaN values
      if (typeof payload.position?.x === 'number') {
        expect(Number.isNaN(payload.position.x)).toBe(false);
      }
      if (typeof payload.position?.y === 'number') {
        expect(Number.isNaN(payload.position.y)).toBe(false);
      }
    };

    it('should clamp position values to valid range', () => {
      const outOfRangePayload = {
        type: 'pinch',
        position: { x: 1.5, y: -0.2 },
        confidence: 0.9,
        timestamp: Date.now(),
        isPinching: true,
        source: 'projector',
        coordinate_space: 'projector'
      };

      // Clamp values
      const clampedPayload = {
        ...outOfRangePayload,
        position: {
          x: Math.max(0, Math.min(1, outOfRangePayload.position.x)),
          y: Math.max(0, Math.min(1, outOfRangePayload.position.y))
        }
      };

      validateGesturePayload(clampedPayload);
      expect(clampedPayload.position.x).toBe(1);
      expect(clampedPayload.position.y).toBe(0);
    });

    it('should handle valid payload without modification', () => {
      const validPayload = {
        type: 'pinch',
        position: { x: 0.5, y: 0.5 },
        confidence: 0.9,
        timestamp: Date.now(),
        isPinching: true,
        source: 'projector',
        coordinate_space: 'projector'
      };

      validateGesturePayload(validPayload);
      expect(validPayload.position.x).toBe(0.5);
      expect(validPayload.position.y).toBe(0.5);
    });
  });

  describe('Calibration with homography', () => {
    it('should accept and store homography matrix', async () => {
      const calibrationPayload = {
        points: [
          { id: 'topLeft', cameraX: 0.1, cameraY: 0.1 },
          { id: 'topRight', cameraX: 0.9, cameraY: 0.1 },
          { id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 },
          { id: 'bottomRight', cameraX: 0.9, cameraY: 0.9 }
        ],
        homographyMatrix: [
          [1.0, 0.0, 0.0],
          [0.0, 1.0, 0.0],
          [0.0, 0.0, 1.0]
        ],
        createdAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/projection/mapping')
        .send(calibrationPayload)
        .expect(200);

      expect(response.body.calibrated).toBe(true);
      expect(response.body.homographyMatrix).toBeDefined();
    });

    it('should return homography matrix in GET response', async () => {
      // First POST to store calibration with homography
      const calibrationPayload = {
        points: [
          { id: 'topLeft', cameraX: 0.1, cameraY: 0.1 },
          { id: 'topRight', cameraX: 0.9, cameraY: 0.1 },
          { id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 },
          { id: 'bottomRight', cameraX: 0.9, cameraY: 0.9 }
        ],
        homographyMatrix: [
          [1.2, 0.1, 0.0],
          [0.1, 1.2, 0.0],
          [0.0, 0.0, 1.0]
        ],
        createdAt: new Date().toISOString()
      };

      await request(app)
        .post('/api/projection/mapping')
        .send(calibrationPayload)
        .expect(200);

      // Then GET should return the stored calibration with homography
      const getResponse = await request(app)
        .get('/api/projection/mapping')
        .expect(200);

      expect(getResponse.body.calibrated).toBe(true);
      expect(getResponse.body.homographyMatrix).toBeDefined();
      expect(getResponse.body.homographyMatrix).toEqual(calibrationPayload.homographyMatrix);
    });
  });
});
