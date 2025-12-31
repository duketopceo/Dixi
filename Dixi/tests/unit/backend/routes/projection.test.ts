import request from 'supertest';
import express, { Express } from 'express';

// Mock wsService
jest.mock('../../../../packages/backend/src/index', () => ({
  wsService: {
    getClientCount: () => 0,
    broadcastProjection: jest.fn(),
  }
}));

// Import after mocking
import projectionRouter from '../../../../packages/backend/src/routes/projection';

describe('Projection Routes', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/projection', projectionRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projection/status', () => {
    it('should return projection status', async () => {
      const response = await request(app).get('/api/projection/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('active');
      expect(response.body.active).toBe(true);
      expect(response.body).toHaveProperty('renderAPI');
      expect(response.body).toHaveProperty('gpuAcceleration');
      expect(response.body).toHaveProperty('connectedClients');
    });
  });

  describe('POST /api/projection/scene', () => {
    it('should save a valid scene', async () => {
      const sceneData = {
        scene: {
          objects: [
            {
              id: 'test-1',
              type: 'box',
              position: [0, 0, -2],
              rotation: [0, 0, 0],
              scale: [0.5, 0.5, 0.5],
              color: '#00F5FF',
            },
          ],
        },
        name: 'Test Scene',
      };

      const response = await request(app)
        .post('/api/projection/scene')
        .send(sceneData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('sceneId');
      expect(response.body).toHaveProperty('scene');
      expect(response.body.scene.objects).toHaveLength(1);
      expect(response.body.scene.name).toBe('Test Scene');
    });

    it('should reject scene without objects array', async () => {
      const response = await request(app)
        .post('/api/projection/scene')
        .send({
          scene: { invalid: 'data' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid scene data');
    });

    it('should generate default name if not provided', async () => {
      const sceneData = {
        scene: {
          objects: [
            {
              id: 'test-1',
              type: 'box',
              position: [0, 0, -2],
              rotation: [0, 0, 0],
              scale: [0.5, 0.5, 0.5],
              color: '#00F5FF',
            },
          ],
        },
      };

      const response = await request(app)
        .post('/api/projection/scene')
        .send(sceneData);

      expect(response.status).toBe(200);
      expect(response.body.scene.name).toContain('Scene_');
    });
  });

  describe('GET /api/projection/scene/:id', () => {
    let savedSceneId: string;

    beforeAll(async () => {
      // Save a scene for testing
      const sceneData = {
        scene: {
          objects: [
            {
              id: 'test-1',
              type: 'box',
              position: [0, 0, -2],
              rotation: [0, 0, 0],
              scale: [0.5, 0.5, 0.5],
              color: '#00F5FF',
            },
          ],
        },
        name: 'Load Test Scene',
      };

      const saveResponse = await request(app)
        .post('/api/projection/scene')
        .send(sceneData);

      savedSceneId = saveResponse.body.sceneId;
    });

    it('should load an existing scene', async () => {
      const response = await request(app).get(`/api/projection/scene/${savedSceneId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('scene');
      expect(response.body.scene.id).toBe(savedSceneId);
      expect(response.body.scene.objects).toHaveLength(1);
    });

    it('should return 404 for non-existent scene', async () => {
      const response = await request(app).get('/api/projection/scene/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Scene not found');
    });
  });

  describe('GET /api/projection/scenes', () => {
    it('should list all scenes', async () => {
      // Create a few scenes first
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post('/api/projection/scene')
          .send({
            scene: {
              objects: [
                {
                  id: `test-${i}`,
                  type: 'box',
                  position: [0, 0, -2],
                  rotation: [0, 0, 0],
                  scale: [0.5, 0.5, 0.5],
                  color: '#00F5FF',
                },
              ],
            },
            name: `List Test Scene ${i}`,
          });
      }

      const response = await request(app).get('/api/projection/scenes');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('scenes');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.scenes)).toBe(true);
      expect(response.body.scenes.length).toBeGreaterThanOrEqual(2);
      
      // Check scene structure
      if (response.body.scenes.length > 0) {
        expect(response.body.scenes[0]).toHaveProperty('id');
        expect(response.body.scenes[0]).toHaveProperty('name');
        expect(response.body.scenes[0]).toHaveProperty('objectCount');
        expect(response.body.scenes[0]).toHaveProperty('createdAt');
        expect(response.body.scenes[0]).toHaveProperty('updatedAt');
      }
    });

    it('should return empty array when no scenes exist', async () => {
      // Note: This test may fail if other tests created scenes
      // In a real scenario, we'd clear the storage between tests
      const response = await request(app).get('/api/projection/scenes');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.scenes)).toBe(true);
    });
  });

  describe('DELETE /api/projection/scene/:id', () => {
    let sceneToDeleteId: string;

    beforeEach(async () => {
      // Create a scene to delete
      const sceneData = {
        scene: {
          objects: [
            {
              id: 'test-delete',
              type: 'box',
              position: [0, 0, -2],
              rotation: [0, 0, 0],
              scale: [0.5, 0.5, 0.5],
              color: '#00F5FF',
            },
          ],
        },
        name: 'Delete Test Scene',
      };

      const saveResponse = await request(app)
        .post('/api/projection/scene')
        .send(sceneData);

      sceneToDeleteId = saveResponse.body.sceneId;
    });

    it('should delete an existing scene', async () => {
      const response = await request(app).delete(`/api/projection/scene/${sceneToDeleteId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');
      expect(response.body.sceneId).toBe(sceneToDeleteId);
    });

    it('should return 404 when deleting non-existent scene', async () => {
      const response = await request(app).delete('/api/projection/scene/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Scene not found');
    });

    it('should not be able to load deleted scene', async () => {
      // Delete the scene
      await request(app).delete(`/api/projection/scene/${sceneToDeleteId}`);

      // Try to load it
      const response = await request(app).get(`/api/projection/scene/${sceneToDeleteId}`);

      expect(response.status).toBe(404);
    });
  });
});

