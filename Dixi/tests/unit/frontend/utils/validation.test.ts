import {
  validateGesture,
  validateObjectExists,
  sanitizeTransform,
  MAX_OBJECTS,
  validateObjectTransform,
  clampToSceneBounds,
  SCENE_BOUNDS,
} from '../../../../packages/frontend/src/utils/validation';
import { SceneObject } from '../../../../packages/frontend/src/store/sceneStore';

describe('Validation Utilities', () => {
  describe('validateGesture', () => {
    it('should return true for valid gesture', () => {
      const gesture = {
        type: 'point',
        position: { x: 0.5, y: 0.5 },
        confidence: 0.8,
      };

      expect(validateGesture(gesture)).toBe(true);
    });

    it('should return false for null gesture', () => {
      expect(validateGesture(null)).toBe(false);
    });

    it('should return false for gesture with low confidence', () => {
      const gesture = {
        type: 'point',
        position: { x: 0.5, y: 0.5 },
        confidence: 0.1, // Below MIN_GESTURE_CONFIDENCE (0.3)
      };

      expect(validateGesture(gesture)).toBe(false);
    });

    it('should return true for gesture without confidence', () => {
      const gesture = {
        type: 'point',
        position: { x: 0.5, y: 0.5 },
      };

      expect(validateGesture(gesture)).toBe(true);
    });

    it('should return false for invalid position (NaN)', () => {
      const gesture = {
        type: 'point',
        position: { x: NaN, y: 0.5 },
      };

      expect(validateGesture(gesture)).toBe(false);
    });

    it('should return false for invalid position (Infinity)', () => {
      const gesture = {
        type: 'point',
        position: { x: Infinity, y: 0.5 },
      };

      expect(validateGesture(gesture)).toBe(false);
    });

    it('should return false for position out of bounds (x > 1)', () => {
      const gesture = {
        type: 'point',
        position: { x: 1.5, y: 0.5 },
      };

      expect(validateGesture(gesture)).toBe(false);
    });

    it('should return false for position out of bounds (y < 0)', () => {
      const gesture = {
        type: 'point',
        position: { x: 0.5, y: -0.1 },
      };

      expect(validateGesture(gesture)).toBe(false);
    });
  });

  describe('validateObjectExists', () => {
    it('should return true if object exists', () => {
      const objects: SceneObject[] = [
        {
          id: 'test-1',
          type: 'box',
          position: [0, 0, -2],
          rotation: [0, 0, 0],
          scale: [0.5, 0.5, 0.5],
          color: '#00F5FF',
        },
      ];

      expect(validateObjectExists('test-1', objects)).toBe(true);
    });

    it('should return false if object does not exist', () => {
      const objects: SceneObject[] = [
        {
          id: 'test-1',
          type: 'box',
          position: [0, 0, -2],
          rotation: [0, 0, 0],
          scale: [0.5, 0.5, 0.5],
          color: '#00F5FF',
        },
      ];

      expect(validateObjectExists('test-2', objects)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(validateObjectExists('test-1', [])).toBe(false);
    });
  });

  describe('validateObjectTransform', () => {
    it('should return valid for correct transform', () => {
      const result = validateObjectTransform(
        [0, 0, -2],
        [0, 0, 0],
        [0.5, 0.5, 0.5]
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid position array length', () => {
      const result = validateObjectTransform(
        [0, 0] as any, // Invalid: only 2 elements
        undefined,
        undefined
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for NaN in position', () => {
      const result = validateObjectTransform(
        [NaN, 0, -2],
        undefined,
        undefined
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Position[0]'))).toBe(true);
    });

    it('should return errors for position out of bounds', () => {
      const result = validateObjectTransform(
        [SCENE_BOUNDS.maxX + 1, 0, -2], // X out of bounds
        undefined,
        undefined
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Position X out of bounds'))).toBe(true);
    });

    it('should return errors for invalid rotation', () => {
      const result = validateObjectTransform(
        undefined,
        [NaN, 0, 0],
        undefined
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Rotation[0]'))).toBe(true);
    });

    it('should return errors for invalid scale (negative)', () => {
      const result = validateObjectTransform(
        undefined,
        undefined,
        [-1, 0.5, 0.5]
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Scale[0] must be greater than 0'))).toBe(true);
    });

    it('should return errors for scale exceeding maximum', () => {
      const result = validateObjectTransform(
        undefined,
        undefined,
        [6, 6, 6] // Exceeds max of 5
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('clampToSceneBounds', () => {
    it('should clamp X value to bounds', () => {
      expect(clampToSceneBounds(SCENE_BOUNDS.maxX + 5, 'x')).toBe(SCENE_BOUNDS.maxX);
      expect(clampToSceneBounds(SCENE_BOUNDS.minX - 5, 'x')).toBe(SCENE_BOUNDS.minX);
      expect(clampToSceneBounds(0, 'x')).toBe(0);
    });

    it('should clamp Y value to bounds', () => {
      expect(clampToSceneBounds(SCENE_BOUNDS.maxY + 5, 'y')).toBe(SCENE_BOUNDS.maxY);
      expect(clampToSceneBounds(SCENE_BOUNDS.minY - 5, 'y')).toBe(SCENE_BOUNDS.minY);
    });

    it('should clamp Z value to bounds', () => {
      expect(clampToSceneBounds(SCENE_BOUNDS.maxZ + 5, 'z')).toBe(SCENE_BOUNDS.maxZ);
      expect(clampToSceneBounds(SCENE_BOUNDS.minZ - 5, 'z')).toBe(SCENE_BOUNDS.minZ);
    });
  });

  describe('sanitizeTransform', () => {
    it('should sanitize valid transform', () => {
      const result = sanitizeTransform(
        [1, 2, -3],
        [0.1, 0.2, 0.3],
        [0.5, 0.6, 0.7]
      );

      expect(result.position).toEqual([1, 2, -3]);
      expect(result.rotation).toEqual([0.1, 0.2, 0.3]);
      expect(result.scale).toEqual([0.5, 0.6, 0.7]);
    });

    it('should replace NaN with defaults', () => {
      const result = sanitizeTransform(
        [NaN, 2, -3],
        [NaN, 0.2, 0.3],
        [NaN, 0.6, 0.7]
      );

      expect(result.position?.[0]).toBe(0); // Clamped to 0
      expect(result.rotation?.[0]).toBe(0);
      expect(result.scale?.[0]).toBe(0.5); // Default scale
    });

    it('should replace Infinity with defaults', () => {
      const result = sanitizeTransform(
        [Infinity, 2, -3],
        undefined,
        undefined
      );

      expect(result.position?.[0]).toBe(0);
    });

    it('should clamp position to scene bounds', () => {
      const result = sanitizeTransform(
        [SCENE_BOUNDS.maxX + 10, SCENE_BOUNDS.minY - 10, SCENE_BOUNDS.maxZ + 10],
        undefined,
        undefined
      );

      expect(result.position?.[0]).toBe(SCENE_BOUNDS.maxX);
      expect(result.position?.[1]).toBe(SCENE_BOUNDS.minY);
      expect(result.position?.[2]).toBe(SCENE_BOUNDS.maxZ);
    });

    it('should clamp scale to valid range (0.1 to 5)', () => {
      const result = sanitizeTransform(
        undefined,
        undefined,
        [0.05, 10, -1] // All out of range
      );

      expect(result.scale?.[0]).toBe(0.1); // Min
      expect(result.scale?.[1]).toBe(5); // Max
      expect(result.scale?.[2]).toBe(0.1); // Min
    });

    it('should handle partial transforms', () => {
      const result = sanitizeTransform(
        [1, 2, -3],
        undefined,
        undefined
      );

      expect(result.position).toBeDefined();
      expect(result.rotation).toBeUndefined();
      expect(result.scale).toBeUndefined();
    });
  });

  describe('MAX_OBJECTS constant', () => {
    it('should be defined', () => {
      expect(MAX_OBJECTS).toBeDefined();
      expect(typeof MAX_OBJECTS).toBe('number');
      expect(MAX_OBJECTS).toBeGreaterThan(0);
    });
  });
});

