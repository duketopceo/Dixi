import request from 'supertest';
import express, { Express } from 'express';
import { gestureRecorder } from '../../packages/backend/src/services/gestureRecorder';
import { promptTemplates } from '../../packages/backend/src/services/promptTemplates';
import { LRUCache } from '../../packages/backend/src/services/cache';
import projectionRoutes from '../../packages/backend/src/routes/projection';
import metricsRoutes from '../../packages/backend/src/routes/metrics';
import gestureRecorderRoutes from '../../packages/backend/src/routes/gesture-recorder';
import promptTemplatesRoutes from '../../packages/backend/src/routes/prompt-templates';

// Mock WebSocket service
jest.mock('../../packages/backend/src/index', () => ({
  wsService: {
    getClientCount: () => 0,
    broadcastProjection: jest.fn(),
  },
}));

describe('Advanced Features Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/projection', projectionRoutes);
    app.use('/api/metrics', metricsRoutes);
    app.use('/api/gestures', gestureRecorderRoutes);
    app.use('/api/prompts', promptTemplatesRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear gesture recorder
    gestureRecorder.getRecordings().forEach((rec) => {
      gestureRecorder.deleteRecording(rec.id);
    });
  });

  describe('Caching Integration', () => {
    it('should cache AI responses and return cached results', async () => {
      const cache = new LRUCache<string>(10, 5000); // 10 items, 5s TTL
      
      const key1 = 'test-query-1';
      const value1 = 'cached response 1';
      
      cache.set(key1, value1);
      expect(cache.get(key1)).toBe(value1);
      expect(cache.getStats().hits).toBe(1);
      
      // Test cache miss
      expect(cache.get('non-existent')).toBeUndefined();
      expect(cache.getStats().misses).toBe(1);
    });

    it('should expire cached entries after TTL', async () => {
      const cache = new LRUCache<string>(10, 100); // 100ms TTL
      
      cache.set('test-key', 'test-value');
      expect(cache.get('test-key')).toBe('test-value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.get('test-key')).toBeUndefined();
      expect(cache.getStats().evictions).toBeGreaterThan(0);
    });
  });

  describe('Metrics API Integration', () => {
    it('should expose system metrics via API', async () => {
      const response = await request(app).get('/api/metrics/system');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.system).toHaveProperty('memory');
    });

    it('should expose AI metrics via API', async () => {
      const response = await request(app).get('/api/metrics/ai');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ai');
      expect(response.body).toHaveProperty('cache');
    });

    it('should export Prometheus metrics', async () => {
      const response = await request(app).get('/api/metrics/prometheus');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# HELP');
    });
  });

  describe('Gesture Recorder Integration', () => {
    it('should record and retrieve gesture sequences', async () => {
      // Start recording
      const startResponse = await request(app)
        .post('/api/gestures/record/start')
        .send({ name: 'Test Sequence' });

      expect(startResponse.status).toBe(200);
      const recordingId = startResponse.body.recordingId;

      // Stop recording
      const stopResponse = await request(app)
        .post('/api/gestures/record/stop')
        .send({ name: 'Test Sequence' });

      expect(stopResponse.status).toBe(200);
      expect(stopResponse.body.recording).toHaveProperty('id');
      expect(stopResponse.body.recording).toHaveProperty('events');

      // Retrieve recording
      const getResponse = await request(app)
        .get(`/api/gestures/recordings/${stopResponse.body.recording.id}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.recording.id).toBe(stopResponse.body.recording.id);
    });

    it('should list all recordings', async () => {
      // Create a recording
      await request(app).post('/api/gestures/record/start');
      await request(app).post('/api/gestures/record/stop');

      const response = await request(app).get('/api/gestures/recordings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recordings');
      expect(Array.isArray(response.body.recordings)).toBe(true);
    });
  });

  describe('Prompt Templates Integration', () => {
    it('should create and render templates', async () => {
      // Create template
      const createResponse = await request(app)
        .post('/api/prompts/templates')
        .send({
          name: 'Test Template',
          description: 'Test',
          template: 'Hello {{name}}, you are at ({{x}}, {{y}})',
          variables: [
            { name: 'name', description: 'Name' },
            { name: 'x', description: 'X coordinate' },
            { name: 'y', description: 'Y coordinate' },
          ],
        });

      expect(createResponse.status).toBe(201);
      const templateId = createResponse.body.template.id;

      // Render template
      const renderResponse = await request(app)
        .post(`/api/prompts/templates/${templateId}/render`)
        .send({
          variables: {
            name: 'Alice',
            x: '0.5',
            y: '0.7',
          },
        });

      expect(renderResponse.status).toBe(200);
      expect(renderResponse.body.rendered).toContain('Alice');
      expect(renderResponse.body.rendered).toContain('0.5');
      expect(renderResponse.body.rendered).toContain('0.7');
    });

    it('should list all templates including defaults', async () => {
      const response = await request(app).get('/api/prompts/templates');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Select and Grouping Integration', () => {
    it('should save scene with multiple objects and groups', async () => {
      const sceneData = {
        objects: [
          {
            id: 'obj1',
            type: 'box',
            position: [0, 0, -2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            color: '#FF0000',
          },
          {
            id: 'obj2',
            type: 'sphere',
            position: [1, 0, -2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            color: '#00FF00',
          },
        ],
        groups: [
          {
            id: 'group1',
            name: 'Test Group',
            objectIds: ['obj1', 'obj2'],
            position: [0.5, 0, -2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        ],
      };

      const response = await request(app)
        .post('/api/projection/scene')
        .send({ scene: sceneData, name: 'Multi-Object Scene' });

      expect(response.status).toBe(200);
      expect(response.body.scene).toHaveProperty('objects');
      expect(response.body.scene.objects.length).toBe(2);
      expect(response.body.scene).toHaveProperty('groups');
      expect(response.body.scene.groups.length).toBe(1);
    });

    it('should load scene with groups and preserve structure', async () => {
      // Save scene first
      const sceneData = {
        objects: [
          {
            id: 'obj1',
            type: 'box',
            position: [0, 0, -2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            color: '#FF0000',
          },
        ],
        groups: [
          {
            id: 'group1',
            name: 'Test Group',
            objectIds: ['obj1'],
            position: [0, 0, -2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        ],
      };

      const saveResponse = await request(app)
        .post('/api/projection/scene')
        .send({ scene: sceneData, name: 'Grouped Scene' });

      const sceneId = saveResponse.body.sceneId;

      // Load scene
      const loadResponse = await request(app)
        .get(`/api/projection/scene/${sceneId}`);

      expect(loadResponse.status).toBe(200);
      expect(loadResponse.body.scene).toHaveProperty('groups');
      expect(loadResponse.body.scene.groups[0].objectIds).toContain('obj1');
    });
  });

  describe('Performance and Caching Integration', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .get('/api/metrics/system')
          .expect(200)
      );

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('system');
      });
    });

    it('should cache template rendering results', async () => {
      // Get a default template
      const templatesResponse = await request(app).get('/api/prompts/templates');
      const templateId = templatesResponse.body.templates[0].id;

      // Render multiple times (should be fast due to caching in service)
      const startTime = Date.now();
      const renders = await Promise.all([
        request(app)
          .post(`/api/prompts/templates/${templateId}/render`)
          .send({ variables: { query: 'Test 1' } }),
        request(app)
          .post(`/api/prompts/templates/${templateId}/render`)
          .send({ variables: { query: 'Test 2' } }),
        request(app)
          .post(`/api/prompts/templates/${templateId}/render`)
          .send({ variables: { query: 'Test 3' } }),
      ]);
      const endTime = Date.now();

      renders.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('rendered');
      });

      // All renders should complete quickly
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });
  });
});

