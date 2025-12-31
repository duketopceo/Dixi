import {
  createObject,
  getRandomColor,
  gestureTo3DPosition,
  OBJECT_COLORS,
  OBJECT_CONFIGS,
} from '../../../../../packages/frontend/src/components/Scene/ObjectLibrary';
import { ObjectType } from '../../../../../packages/frontend/src/store/sceneStore';

describe('ObjectLibrary', () => {
  describe('createObject', () => {
    it('should create a box object', () => {
      const object = createObject('box', [1, 2, -3]);

      expect(object.type).toBe('box');
      expect(object.position).toEqual([1, 2, -3]);
      expect(object.id).toContain('box_');
      expect(object.color).toBe(OBJECT_CONFIGS.box.defaultColor);
    });

    it('should create a sphere object', () => {
      const object = createObject('sphere', [0, 0, -2]);

      expect(object.type).toBe('sphere');
      expect(object.position).toEqual([0, 0, -2]);
      expect(object.id).toContain('sphere_');
    });

    it('should create a torus object', () => {
      const object = createObject('torus', [1, 1, -2]);

      expect(object.type).toBe('torus');
      expect(object.position).toEqual([1, 1, -2]);
      expect(object.id).toContain('torus_');
    });

    it('should create a cone object', () => {
      const object = createObject('cone', [2, 2, -2]);

      expect(object.type).toBe('cone');
      expect(object.position).toEqual([2, 2, -2]);
      expect(object.id).toContain('cone_');
    });

    it('should use provided color', () => {
      const customColor = '#FF0000';
      const object = createObject('box', [0, 0, -2], customColor);

      expect(object.color).toBe(customColor);
    });

    it('should use default color when not provided', () => {
      const object = createObject('box', [0, 0, -2]);

      expect(object.color).toBe(OBJECT_CONFIGS.box.defaultColor);
    });

    it('should set default rotation to [0, 0, 0]', () => {
      const object = createObject('box', [0, 0, -2]);

      expect(object.rotation).toEqual([0, 0, 0]);
    });

    it('should set default scale from config', () => {
      const object = createObject('box', [0, 0, -2]);
      const expectedScale = OBJECT_CONFIGS.box.defaultSize;

      expect(object.scale).toEqual([expectedScale, expectedScale, expectedScale]);
    });

    it('should generate unique IDs', () => {
      const object1 = createObject('box', [0, 0, -2]);
      const object2 = createObject('box', [0, 0, -2]);

      expect(object1.id).not.toBe(object2.id);
    });

    it('should include metadata with timestamps', () => {
      const beforeTime = Date.now();
      const object = createObject('box', [0, 0, -2]);
      const afterTime = Date.now();

      expect(object.metadata).toBeDefined();
      expect(object.metadata?.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(object.metadata?.createdAt).toBeLessThanOrEqual(afterTime);
      expect(object.metadata?.lastModified).toBeGreaterThanOrEqual(beforeTime);
      expect(object.metadata?.lastModified).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getRandomColor', () => {
    it('should return a color from OBJECT_COLORS', () => {
      const color = getRandomColor();

      expect(OBJECT_COLORS).toContain(color);
    });

    it('should return different colors on multiple calls (statistically)', () => {
      const colors = new Set();
      for (let i = 0; i < 100; i++) {
        colors.add(getRandomColor());
      }

      // With 100 calls and 8 colors, we should get at least 2 different colors
      expect(colors.size).toBeGreaterThan(1);
    });

    it('should only return valid hex colors', () => {
      for (let i = 0; i < 50; i++) {
        const color = getRandomColor();
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });
  });

  describe('gestureTo3DPosition', () => {
    it('should convert center gesture to origin', () => {
      const position = gestureTo3DPosition(0.5, 0.5);

      expect(position[0]).toBeCloseTo(0, 1);
      expect(position[1]).toBeCloseTo(0, 1);
      expect(position[2]).toBe(-2); // Default z
    });

    it('should convert top-left gesture to negative x, positive y', () => {
      const position = gestureTo3DPosition(0, 0);

      expect(position[0]).toBeCloseTo(-5, 1); // (0 - 0.5) * 10
      expect(position[1]).toBeCloseTo(5, 1); // -(0 - 0.5) * 10
    });

    it('should convert bottom-right gesture to positive x, negative y', () => {
      const position = gestureTo3DPosition(1, 1);

      expect(position[0]).toBeCloseTo(5, 1); // (1 - 0.5) * 10
      expect(position[1]).toBeCloseTo(-5, 1); // -(1 - 0.5) * 10
    });

    it('should use custom z depth', () => {
      const position = gestureTo3DPosition(0.5, 0.5, -5);

      expect(position[2]).toBe(-5);
    });

    it('should invert Y coordinate', () => {
      const pos1 = gestureTo3DPosition(0.5, 0.0); // Top
      const pos2 = gestureTo3DPosition(0.5, 1.0); // Bottom

      expect(pos1[1]).toBeGreaterThan(pos2[1]); // Top should have higher Y
    });

    it('should scale coordinates by 10', () => {
      const position = gestureTo3DPosition(0.6, 0.7);

      expect(position[0]).toBe(1); // (0.6 - 0.5) * 10
      expect(position[1]).toBe(-2); // -(0.7 - 0.5) * 10
    });
  });

  describe('OBJECT_CONFIGS', () => {
    it('should have config for all object types', () => {
      const types: ObjectType[] = ['box', 'sphere', 'torus', 'cone'];

      types.forEach((type) => {
        expect(OBJECT_CONFIGS[type]).toBeDefined();
        expect(OBJECT_CONFIGS[type].type).toBe(type);
        expect(OBJECT_CONFIGS[type].defaultSize).toBeGreaterThan(0);
        expect(OBJECT_CONFIGS[type].defaultColor).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should have consistent default sizes', () => {
      const sizes = Object.values(OBJECT_CONFIGS).map((config) => config.defaultSize);
      
      // All should be positive
      sizes.forEach((size) => {
        expect(size).toBeGreaterThan(0);
      });
    });
  });

  describe('OBJECT_COLORS', () => {
    it('should contain valid hex colors', () => {
      OBJECT_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should have at least one color', () => {
      expect(OBJECT_COLORS.length).toBeGreaterThan(0);
    });
  });
});

