import { useSceneStore, SceneObject, ObjectType } from '../../../../packages/frontend/src/store/sceneStore';
import { MAX_OBJECTS } from '../../../../packages/frontend/src/utils/validation';

describe('SceneStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useSceneStore.getState();
    store.clearScene();
    store.clearHistory();
  });

  describe('addObject', () => {
    it('should add an object to the scene', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      const result = store.addObject(object);

      expect(result.success).toBe(true);
      expect(store.objects).toHaveLength(1);
      expect(store.objects[0]).toEqual(object);
    });

    it('should enforce MAX_OBJECTS limit', () => {
      const store = useSceneStore.getState();
      
      // Fill up to the limit
      for (let i = 0; i < MAX_OBJECTS; i++) {
        const object: SceneObject = {
          id: `test-${i}`,
          type: 'box',
          position: [0, 0, -2],
          rotation: [0, 0, 0],
          scale: [0.5, 0.5, 0.5],
          color: '#00F5FF',
        };
        store.addObject(object);
      }

      expect(store.objects).toHaveLength(MAX_OBJECTS);

      // Try to add one more
      const extraObject: SceneObject = {
        id: 'test-extra',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      const result = store.addObject(extraObject);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum object limit');
      expect(store.objects).toHaveLength(MAX_OBJECTS);
    });

    it('should add metadata with timestamps', () => {
      const store = useSceneStore.getState();
      const beforeTime = Date.now();
      
      const object: SceneObject = {
        id: 'test-1',
        type: 'sphere',
        position: [1, 1, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#FF006E',
      };

      store.addObject(object);
      const afterTime = Date.now();

      const addedObject = store.objects[0];
      expect(addedObject.metadata).toBeDefined();
      expect(addedObject.metadata?.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(addedObject.metadata?.createdAt).toBeLessThanOrEqual(afterTime);
      expect(addedObject.metadata?.lastModified).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('removeObject', () => {
    it('should remove an object by id', () => {
      const store = useSceneStore.getState();
      const object1: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };
      const object2: SceneObject = {
        id: 'test-2',
        type: 'sphere',
        position: [1, 1, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#FF006E',
      };

      store.addObject(object1);
      store.addObject(object2);
      expect(store.objects).toHaveLength(2);

      store.removeObject('test-1');

      expect(store.objects).toHaveLength(1);
      expect(store.objects[0].id).toBe('test-2');
    });

    it('should clear selection if removed object was selected', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      store.addObject(object);
      store.selectObject('test-1');
      expect(store.selectedObjectId).toBe('test-1');

      store.removeObject('test-1');

      expect(store.selectedObjectId).toBeNull();
    });
  });

  describe('selectObject', () => {
    it('should select an object by id', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      store.addObject(object);
      store.selectObject('test-1');

      expect(store.selectedObjectId).toBe('test-1');
    });

    it('should clear selection when passing null', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      store.addObject(object);
      store.selectObject('test-1');
      expect(store.selectedObjectId).toBe('test-1');

      store.selectObject(null);

      expect(store.selectedObjectId).toBeNull();
    });
  });

  describe('updateObject', () => {
    it('should update object properties', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      store.addObject(object);
      store.updateObject('test-1', {
        position: [1, 2, -3],
        color: '#FF006E',
      });

      const updated = store.objects[0];
      expect(updated.position).toEqual([1, 2, -3]);
      expect(updated.color).toBe('#FF006E');
      expect(updated.type).toBe('box'); // Unchanged
    });

    it('should update lastModified timestamp', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      store.addObject(object);
      const originalModified = store.objects[0].metadata?.lastModified;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        store.updateObject('test-1', { position: [1, 1, -2] });
        const updated = store.objects[0];
        expect(updated.metadata?.lastModified).toBeGreaterThan(originalModified || 0);
      }, 10);
    });
  });

  describe('clearScene', () => {
    it('should remove all objects', () => {
      const store = useSceneStore.getState();
      
      for (let i = 0; i < 5; i++) {
        const object: SceneObject = {
          id: `test-${i}`,
          type: 'box',
          position: [0, 0, -2],
          rotation: [0, 0, 0],
          scale: [0.5, 0.5, 0.5],
          color: '#00F5FF',
        };
        store.addObject(object);
      }

      expect(store.objects).toHaveLength(5);

      store.clearScene();

      expect(store.objects).toHaveLength(0);
      expect(store.selectedObjectId).toBeNull();
    });
  });

  describe('undo/redo', () => {
    it('should undo the last operation', () => {
      const store = useSceneStore.getState();
      const object1: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };
      const object2: SceneObject = {
        id: 'test-2',
        type: 'sphere',
        position: [1, 1, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#FF006E',
      };

      store.addObject(object1);
      expect(store.objects).toHaveLength(1);

      store.addObject(object2);
      expect(store.objects).toHaveLength(2);

      store.undo();
      expect(store.objects).toHaveLength(1);
      expect(store.objects[0].id).toBe('test-1');
    });

    it('should redo an undone operation', () => {
      const store = useSceneStore.getState();
      const object1: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };
      const object2: SceneObject = {
        id: 'test-2',
        type: 'sphere',
        position: [1, 1, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#FF006E',
      };

      store.addObject(object1);
      store.addObject(object2);
      expect(store.objects).toHaveLength(2);

      store.undo();
      expect(store.objects).toHaveLength(1);

      store.redo();
      expect(store.objects).toHaveLength(2);
      expect(store.objects[1].id).toBe('test-2');
    });

    it('should not undo when history is empty', () => {
      const store = useSceneStore.getState();
      const initialObjects = store.objects.length;

      store.undo();

      expect(store.objects).toHaveLength(initialObjects);
    });

    it('should not redo when future is empty', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      store.addObject(object);
      const initialLength = store.objects.length;

      store.redo();

      expect(store.objects).toHaveLength(initialLength);
    });

    it('should limit history to MAX_HISTORY entries', () => {
      const store = useSceneStore.getState();
      const MAX_HISTORY = 20;

      // Add more than MAX_HISTORY objects
      for (let i = 0; i < MAX_HISTORY + 5; i++) {
        const object: SceneObject = {
          id: `test-${i}`,
          type: 'box',
          position: [0, 0, -2],
          rotation: [0, 0, 0],
          scale: [0.5, 0.5, 0.5],
          color: '#00F5FF',
        };
        store.addObject(object);
      }

      // Undo MAX_HISTORY times
      for (let i = 0; i < MAX_HISTORY; i++) {
        store.undo();
      }

      // Should still be able to undo (history was trimmed)
      expect(store.history.past.length).toBeLessThanOrEqual(MAX_HISTORY);
    });
  });

  describe('getObject', () => {
    it('should return object by id', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      store.addObject(object);
      const found = store.getObject('test-1');

      expect(found).toEqual(object);
    });

    it('should return undefined for non-existent id', () => {
      const store = useSceneStore.getState();
      const found = store.getObject('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getSelectedObject', () => {
    it('should return selected object', () => {
      const store = useSceneStore.getState();
      const object: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };

      store.addObject(object);
      store.selectObject('test-1');
      const selected = store.getSelectedObject();

      expect(selected).toEqual(object);
    });

    it('should return undefined when nothing is selected', () => {
      const store = useSceneStore.getState();
      const selected = store.getSelectedObject();

      expect(selected).toBeUndefined();
    });
  });

  describe('clearHistory', () => {
    it('should clear history while keeping current state', () => {
      const store = useSceneStore.getState();
      const object1: SceneObject = {
        id: 'test-1',
        type: 'box',
        position: [0, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#00F5FF',
      };
      const object2: SceneObject = {
        id: 'test-2',
        type: 'sphere',
        position: [1, 1, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        color: '#FF006E',
      };

      store.addObject(object1);
      store.addObject(object2);
      expect(store.history.past.length).toBeGreaterThan(0);

      store.clearHistory();

      expect(store.history.past).toHaveLength(0);
      expect(store.history.future).toHaveLength(0);
      expect(store.objects).toHaveLength(2); // Current state preserved
    });
  });
});

