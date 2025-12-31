/**
 * Integration tests for Scene Management (Save/Load Flow)
 * 
 * Tests the complete flow of saving and loading scenes via the backend API.
 */

import axios from 'axios';
import { useSceneStore } from '../../../../packages/frontend/src/store/sceneStore';
import { serializeScene, deserializeScene } from '../../../../packages/frontend/src/utils/sceneSerializer';
import { createObject } from '../../../../packages/frontend/src/components/Scene/ObjectLibrary';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Skip if backend not running
const checkBackend = async () => {
  try {
    await axios.get(`${BACKEND_URL}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
};

describe('Scene Management Integration', () => {
  let backendAvailable = false;

  beforeAll(async () => {
    backendAvailable = await checkBackend();
    if (!backendAvailable) {
      console.warn('⚠️ Backend not running - skipping integration tests');
    }
  });

  beforeEach(() => {
    // Reset scene store
    const store = useSceneStore.getState();
    store.clearScene();
  });

  describe('Save Scene Flow', () => {
    it('should save a scene with objects', async () => {
      if (!backendAvailable) return;

      const store = useSceneStore.getState();
      
      // Create some objects
      const obj1 = createObject('box', [0, 0, -2]);
      const obj2 = createObject('sphere', [1, 1, -2]);
      store.addObject(obj1);
      store.addObject(obj2);

      // Serialize scene
      const serialized = serializeScene(store.objects, 'Test Scene');

      // Save via API
      const response = await axios.post(
        `${BACKEND_URL}/api/projection/scene`,
        { scene: serialized, name: 'Test Scene' },
        { timeout: 5000 }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('sceneId');
      expect(response.data).toHaveProperty('scene');
      expect(response.data.scene.objects).toHaveLength(2);
      expect(response.data.scene.name).toBe('Test Scene');
    });

    it('should reject invalid scene data', async () => {
      if (!backendAvailable) return;

      try {
        await axios.post(
          `${BACKEND_URL}/api/projection/scene`,
          { scene: { invalid: 'data' } },
          { timeout: 5000 }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('Invalid scene data');
      }
    });
  });

  describe('Load Scene Flow', () => {
    it('should load a saved scene', async () => {
      if (!backendAvailable) return;

      const store = useSceneStore.getState();
      
      // Create and save a scene
      const obj1 = createObject('box', [0, 0, -2]);
      const obj2 = createObject('sphere', [1, 1, -2]);
      store.addObject(obj1);
      store.addObject(obj2);

      const serialized = serializeScene(store.objects, 'Load Test Scene');
      const saveResponse = await axios.post(
        `${BACKEND_URL}/api/projection/scene`,
        { scene: serialized, name: 'Load Test Scene' },
        { timeout: 5000 }
      );

      const sceneId = saveResponse.data.sceneId;

      // Clear scene
      store.clearScene();
      expect(store.objects).toHaveLength(0);

      // Load scene
      const loadResponse = await axios.get(
        `${BACKEND_URL}/api/projection/scene/${sceneId}`,
        { timeout: 5000 }
      );

      expect(loadResponse.status).toBe(200);
      expect(loadResponse.data.scene).toBeDefined();
      expect(loadResponse.data.scene.objects).toHaveLength(2);

      // Deserialize and add to store
      const loadedObjects = deserializeScene(loadResponse.data.scene);
      loadedObjects.forEach((obj) => {
        store.addObject(obj);
      });

      expect(store.objects).toHaveLength(2);
    });

    it('should return 404 for non-existent scene', async () => {
      if (!backendAvailable) return;

      try {
        await axios.get(
          `${BACKEND_URL}/api/projection/scene/non-existent-id`,
          { timeout: 5000 }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toContain('Scene not found');
      }
    });
  });

  describe('List Scenes Flow', () => {
    it('should list all saved scenes', async () => {
      if (!backendAvailable) return;

      // Create and save multiple scenes
      const store = useSceneStore.getState();
      
      for (let i = 0; i < 3; i++) {
        const obj = createObject('box', [i, i, -2]);
        store.addObject(obj);
        const serialized = serializeScene(store.objects, `Scene ${i}`);
        await axios.post(
          `${BACKEND_URL}/api/projection/scene`,
          { scene: serialized, name: `Scene ${i}` },
          { timeout: 5000 }
        );
        store.clearScene();
      }

      // List scenes
      const response = await axios.get(
        `${BACKEND_URL}/api/projection/scenes`,
        { timeout: 5000 }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('scenes');
      expect(response.data).toHaveProperty('count');
      expect(response.data.scenes.length).toBeGreaterThanOrEqual(3);
      expect(response.data.scenes[0]).toHaveProperty('id');
      expect(response.data.scenes[0]).toHaveProperty('name');
      expect(response.data.scenes[0]).toHaveProperty('objectCount');
    });
  });

  describe('Delete Scene Flow', () => {
    it('should delete a saved scene', async () => {
      if (!backendAvailable) return;

      const store = useSceneStore.getState();
      
      // Create and save a scene
      const obj = createObject('box', [0, 0, -2]);
      store.addObject(obj);
      const serialized = serializeScene(store.objects, 'Delete Test Scene');
      const saveResponse = await axios.post(
        `${BACKEND_URL}/api/projection/scene`,
        { scene: serialized, name: 'Delete Test Scene' },
        { timeout: 5000 }
      );

      const sceneId = saveResponse.data.sceneId;

      // Delete scene
      const deleteResponse = await axios.delete(
        `${BACKEND_URL}/api/projection/scene/${sceneId}`,
        { timeout: 5000 }
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data.message).toContain('deleted successfully');

      // Verify it's gone
      try {
        await axios.get(
          `${BACKEND_URL}/api/projection/scene/${sceneId}`,
          { timeout: 5000 }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should return 404 when deleting non-existent scene', async () => {
      if (!backendAvailable) return;

      try {
        await axios.delete(
          `${BACKEND_URL}/api/projection/scene/non-existent-id`,
          { timeout: 5000 }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('Complete Save/Load Cycle', () => {
    it('should maintain object properties through save/load cycle', async () => {
      if (!backendAvailable) return;

      const store = useSceneStore.getState();
      
      // Create objects with various properties
      const obj1 = createObject('box', [1, 2, -3], '#FF0000');
      const obj2 = createObject('sphere', [4, 5, -6], '#00FF00');
      store.addObject(obj1);
      store.addObject(obj2);

      // Update object
      store.updateObject(obj1.id, {
        rotation: [0.1, 0.2, 0.3],
        scale: [1.5, 1.5, 1.5],
      });

      // Save
      const serialized = serializeScene(store.objects, 'Complete Test');
      const saveResponse = await axios.post(
        `${BACKEND_URL}/api/projection/scene`,
        { scene: serialized, name: 'Complete Test' },
        { timeout: 5000 }
      );

      const sceneId = saveResponse.data.sceneId;

      // Clear and load
      store.clearScene();
      const loadResponse = await axios.get(
        `${BACKEND_URL}/api/projection/scene/${sceneId}`,
        { timeout: 5000 }
      );

      const loadedObjects = deserializeScene(loadResponse.data.scene);
      
      // Verify properties
      expect(loadedObjects).toHaveLength(2);
      expect(loadedObjects[0].position).toEqual([1, 2, -3]);
      expect(loadedObjects[0].color).toBe('#FF0000');
      expect(loadedObjects[0].rotation).toEqual([0.1, 0.2, 0.3]);
      expect(loadedObjects[0].scale).toEqual([1.5, 1.5, 1.5]);
      expect(loadedObjects[1].position).toEqual([4, 5, -6]);
      expect(loadedObjects[1].color).toBe('#00FF00');
    });
  });
});

