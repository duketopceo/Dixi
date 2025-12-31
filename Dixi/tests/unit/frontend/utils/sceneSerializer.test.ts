import {
  serializeScene,
  deserializeScene,
  validateScene,
  SerializedScene,
} from '../../../../packages/frontend/src/utils/sceneSerializer';
import { SceneObject } from '../../../../packages/frontend/src/store/sceneStore';

describe('Scene Serializer', () => {
  const mockObjects: SceneObject[] = [
    {
      id: 'test-1',
      type: 'box',
      position: [1, 2, -3],
      rotation: [0.1, 0.2, 0.3],
      scale: [0.5, 0.6, 0.7],
      color: '#00F5FF',
      metadata: {
        createdAt: 1000,
        lastModified: 2000,
      },
    },
    {
      id: 'test-2',
      type: 'sphere',
      position: [4, 5, -6],
      rotation: [0.4, 0.5, 0.6],
      scale: [0.8, 0.9, 1.0],
      color: '#FF006E',
    },
  ];

  describe('serializeScene', () => {
    it('should serialize scene objects to JSON format', () => {
      const serialized = serializeScene(mockObjects);

      expect(serialized.objects).toHaveLength(2);
      expect(serialized.objects[0].id).toBe('test-1');
      expect(serialized.objects[0].type).toBe('box');
      expect(serialized.objects[0].position).toEqual([1, 2, -3]);
      expect(serialized.objects[0].rotation).toEqual([0.1, 0.2, 0.3]);
      expect(serialized.objects[0].scale).toEqual([0.5, 0.6, 0.7]);
      expect(serialized.objects[0].color).toBe('#00F5FF');
    });

    it('should include timestamps', () => {
      const beforeTime = Date.now();
      const serialized = serializeScene(mockObjects);
      const afterTime = Date.now();

      expect(serialized.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(serialized.createdAt).toBeLessThanOrEqual(afterTime);
      expect(serialized.updatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(serialized.updatedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should use provided scene name', () => {
      const serialized = serializeScene(mockObjects, 'My Scene');

      expect(serialized.name).toBe('My Scene');
    });

    it('should generate default name if not provided', () => {
      const serialized = serializeScene(mockObjects);

      expect(serialized.name).toContain('Scene_');
    });

    it('should preserve metadata timestamps', () => {
      const serialized = serializeScene(mockObjects);

      expect(serialized.objects[0].metadata?.createdAt).toBe(1000);
      expect(serialized.objects[0].metadata?.lastModified).toBe(2000);
    });

    it('should create metadata if missing', () => {
      const objectsWithoutMetadata: SceneObject[] = [
        {
          id: 'test-1',
          type: 'box',
          position: [0, 0, -2],
          rotation: [0, 0, 0],
          scale: [0.5, 0.5, 0.5],
          color: '#00F5FF',
        },
      ];

      const serialized = serializeScene(objectsWithoutMetadata);

      expect(serialized.objects[0].metadata).toBeDefined();
      expect(serialized.objects[0].metadata?.createdAt).toBeDefined();
      expect(serialized.objects[0].metadata?.lastModified).toBeDefined();
    });

    it('should create new arrays (not reference original)', () => {
      const serialized = serializeScene(mockObjects);

      // Modify serialized data
      serialized.objects[0].position[0] = 999;

      // Original should be unchanged
      expect(mockObjects[0].position[0]).toBe(1);
    });
  });

  describe('deserializeScene', () => {
    it('should deserialize valid scene data', () => {
      const serialized: SerializedScene = {
        objects: [
          {
            id: 'test-1',
            type: 'box',
            position: [1, 2, -3],
            rotation: [0.1, 0.2, 0.3],
            scale: [0.5, 0.6, 0.7],
            color: '#00F5FF',
            metadata: {
              createdAt: 1000,
              lastModified: 2000,
            },
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const deserialized = deserializeScene(serialized);

      expect(deserialized).toHaveLength(1);
      expect(deserialized[0].id).toBe('test-1');
      expect(deserialized[0].type).toBe('box');
      expect(deserialized[0].position).toEqual([1, 2, -3]);
    });

    it('should handle invalid position arrays', () => {
      const serialized: SerializedScene = {
        objects: [
          {
            id: 'test-1',
            type: 'box',
            position: [1, 2] as any, // Invalid: only 2 elements
            rotation: [0, 0, 0],
            scale: [0.5, 0.5, 0.5],
            color: '#00F5FF',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const deserialized = deserializeScene(serialized);

      expect(deserialized[0].position).toEqual([0, 0, -2]); // Default
    });

    it('should handle invalid rotation arrays', () => {
      const serialized: SerializedScene = {
        objects: [
          {
            id: 'test-1',
            type: 'box',
            position: [0, 0, -2],
            rotation: [0.1] as any, // Invalid: only 1 element
            scale: [0.5, 0.5, 0.5],
            color: '#00F5FF',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const deserialized = deserializeScene(serialized);

      expect(deserialized[0].rotation).toEqual([0, 0, 0]); // Default
    });

    it('should handle invalid scale arrays', () => {
      const serialized: SerializedScene = {
        objects: [
          {
            id: 'test-1',
            type: 'box',
            position: [0, 0, -2],
            rotation: [0, 0, 0],
            scale: [] as any, // Invalid: empty
            color: '#00F5FF',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const deserialized = deserializeScene(serialized);

      expect(deserialized[0].scale).toEqual([0.5, 0.5, 0.5]); // Default
    });

    it('should handle invalid color', () => {
      const serialized: SerializedScene = {
        objects: [
          {
            id: 'test-1',
            type: 'box',
            position: [0, 0, -2],
            rotation: [0, 0, 0],
            scale: [0.5, 0.5, 0.5],
            color: 123 as any, // Invalid: not a string
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const deserialized = deserializeScene(serialized);

      expect(deserialized[0].color).toBe('#00F5FF'); // Default
    });

    it('should create metadata if missing', () => {
      const serialized: SerializedScene = {
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const deserialized = deserializeScene(serialized);

      expect(deserialized[0].metadata).toBeDefined();
      expect(deserialized[0].metadata?.createdAt).toBeDefined();
      expect(deserialized[0].metadata?.lastModified).toBeDefined();
    });

    it('should return empty array for invalid data', () => {
      const invalid = {
        objects: null,
      } as any;

      const deserialized = deserializeScene(invalid);

      expect(deserialized).toEqual([]);
    });

    it('should return empty array when objects is not an array', () => {
      const invalid = {
        objects: 'not-an-array',
      } as any;

      const deserialized = deserializeScene(invalid);

      expect(deserialized).toEqual([]);
    });
  });

  describe('validateScene', () => {
    it('should return true for valid scene', () => {
      const validScene: SerializedScene = {
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(validateScene(validScene)).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateScene(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validateScene('string')).toBe(false);
      expect(validateScene(123)).toBe(false);
      expect(validateScene([])).toBe(false);
    });

    it('should return false when objects is missing', () => {
      const invalid = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(validateScene(invalid)).toBe(false);
    });

    it('should return false when objects is not an array', () => {
      const invalid = {
        objects: 'not-an-array',
      };

      expect(validateScene(invalid)).toBe(false);
    });

    it('should return false for invalid object structure', () => {
      const invalid = {
        objects: [
          {
            id: 'test-1',
            // Missing required fields
          },
        ],
      };

      expect(validateScene(invalid)).toBe(false);
    });

    it('should return false for object with wrong types', () => {
      const invalid = {
        objects: [
          {
            id: 123, // Should be string
            type: 'box',
            position: [0, 0, -2],
            rotation: [0, 0, 0],
            scale: [0.5, 0.5, 0.5],
            color: '#00F5FF',
          },
        ],
      };

      expect(validateScene(invalid)).toBe(false);
    });

    it('should return true for empty objects array', () => {
      const validScene: SerializedScene = {
        objects: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(validateScene(validScene)).toBe(true);
    });
  });
});

