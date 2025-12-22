import { GestureSmoother, createGestureSmoother } from '../../../../packages/frontend/src/utils/gestureSmoothing';
import * as THREE from 'three';

describe('GestureSmoothing', () => {
  describe('GestureSmoother', () => {
    describe('smoothPosition', () => {
      it('should return first position immediately', () => {
        const smoother = new GestureSmoother(0.3);
        const position = new THREE.Vector3(1, 2, 3);

        const result = smoother.smoothPosition(position);

        expect(result).toEqual(position);
      });

      it('should smooth subsequent positions', () => {
        const smoother = new GestureSmoother(0.5); // 50% smoothing
        const pos1 = new THREE.Vector3(0, 0, 0);
        const pos2 = new THREE.Vector3(10, 10, 10);

        smoother.smoothPosition(pos1);
        const result = smoother.smoothPosition(pos2);

        // With alpha=0.5, result should be halfway between pos1 and pos2
        expect(result.x).toBeGreaterThan(0);
        expect(result.x).toBeLessThan(10);
        expect(result.y).toBeGreaterThan(0);
        expect(result.y).toBeLessThan(10);
      });

      it('should accept array format for position', () => {
        const smoother = new GestureSmoother(0.3);
        const position: [number, number, number] = [1, 2, 3];

        const result = smoother.smoothPosition(position);

        expect(result.x).toBe(1);
        expect(result.y).toBe(2);
        expect(result.z).toBe(3);
      });

      it('should not modify original vector', () => {
        const smoother = new GestureSmoother(0.3);
        const original = new THREE.Vector3(1, 2, 3);
        const originalCopy = original.clone();

        smoother.smoothPosition(original);
        smoother.smoothPosition(new THREE.Vector3(5, 6, 7));

        expect(original).toEqual(originalCopy);
      });
    });

    describe('smoothRotation', () => {
      it('should return first rotation immediately', () => {
        const smoother = new GestureSmoother(0.3);
        const angle = Math.PI / 4;

        const result = smoother.smoothRotation(angle);

        expect(result).toBe(angle);
      });

      it('should smooth subsequent rotations', () => {
        const smoother = new GestureSmoother(0.5);
        const angle1 = 0;
        const angle2 = Math.PI;

        smoother.smoothRotation(angle1);
        const result = smoother.smoothRotation(angle2);

        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(Math.PI);
      });

      it('should handle angle wrapping (0-2π)', () => {
        const smoother = new GestureSmoother(0.5);
        const angle1 = Math.PI * 1.9; // Near 2π
        const angle2 = 0.1; // Just past 0

        smoother.smoothRotation(angle1);
        const result = smoother.smoothRotation(angle2);

        // Should handle wrap correctly
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(2 * Math.PI);
      });

      it('should normalize angles to 0-2π range', () => {
        const smoother = new GestureSmoother(0.3);
        const angle = 3 * Math.PI; // > 2π

        smoother.smoothRotation(angle);
        const result = smoother.smoothRotation(angle);

        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(2 * Math.PI);
      });
    });

    describe('smoothScale', () => {
      it('should return first scale immediately', () => {
        const smoother = new GestureSmoother(0.3);
        const scale = 1.5;

        const result = smoother.smoothScale(scale);

        expect(result).toBe(scale);
      });

      it('should smooth subsequent scales', () => {
        const smoother = new GestureSmoother(0.5);
        const scale1 = 1.0;
        const scale2 = 2.0;

        smoother.smoothScale(scale1);
        const result = smoother.smoothScale(scale2);

        expect(result).toBeGreaterThan(1.0);
        expect(result).toBeLessThan(2.0);
      });

      it('should handle scale changes smoothly', () => {
        const smoother = new GestureSmoother(0.3);
        
        smoother.smoothScale(1.0);
        smoother.smoothScale(1.5);
        const result = smoother.smoothScale(2.0);

        expect(result).toBeGreaterThan(1.0);
        expect(result).toBeLessThanOrEqual(2.0);
      });
    });

    describe('reset', () => {
      it('should reset all smoothed values', () => {
        const smoother = new GestureSmoother(0.3);
        
        smoother.smoothPosition([1, 2, 3]);
        smoother.smoothRotation(Math.PI);
        smoother.smoothScale(1.5);

        smoother.reset();

        // After reset, next values should be returned immediately (no smoothing)
        const pos1 = smoother.smoothPosition([5, 6, 7]);
        expect(pos1.x).toBe(5);
        expect(pos1.y).toBe(6);
        expect(pos1.z).toBe(7);

        const rot1 = smoother.smoothRotation(Math.PI / 2);
        expect(rot1).toBe(Math.PI / 2);

        const scale1 = smoother.smoothScale(2.0);
        expect(scale1).toBe(2.0);
      });
    });

    describe('setAlpha', () => {
      it('should update smoothing factor', () => {
        const smoother = new GestureSmoother(0.3);
        
        smoother.smoothPosition([0, 0, 0]);
        smoother.setAlpha(0.8); // More responsive

        const result = smoother.smoothPosition([10, 10, 10]);
        
        // With higher alpha, should be closer to target
        expect(result.x).toBeGreaterThan(7); // Closer to 10
      });

      it('should clamp alpha to 0-1 range', () => {
        const smoother = new GestureSmoother(0.3);
        
        smoother.setAlpha(-0.5);
        expect(smoother['alpha']).toBe(0);

        smoother.setAlpha(1.5);
        expect(smoother['alpha']).toBe(1);
      });
    });

    describe('constructor', () => {
      it('should clamp alpha to 0-1 range', () => {
        const smoother1 = new GestureSmoother(-0.5);
        expect(smoother1['alpha']).toBe(0);

        const smoother2 = new GestureSmoother(1.5);
        expect(smoother2['alpha']).toBe(1);
      });

      it('should accept valid alpha values', () => {
        const smoother = new GestureSmoother(0.7);
        expect(smoother['alpha']).toBe(0.7);
      });
    });
  });

  describe('createGestureSmoother', () => {
    it('should create a GestureSmoother instance', () => {
      const smoother = createGestureSmoother(0.3);
      
      expect(smoother).toBeInstanceOf(GestureSmoother);
    });

    it('should use default alpha if not provided', () => {
      const smoother = createGestureSmoother();
      
      expect(smoother['alpha']).toBe(0.3); // Default
    });

    it('should use provided alpha', () => {
      const smoother = createGestureSmoother(0.5);
      
      expect(smoother['alpha']).toBe(0.5);
    });
  });
});

