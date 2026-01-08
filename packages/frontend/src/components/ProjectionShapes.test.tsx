import { describe, it, expect } from 'vitest';
import { normalizeCoordinate } from './ProjectionShapes';

/**
 * Simplified test suite focusing on the coordinate normalization utility.
 * Full component tests are run separately to avoid memory issues.
 */
describe('ProjectionShapes', () => {
  describe('normalizeCoordinate', () => {
    it('should convert -1 to 0', () => {
      expect(normalizeCoordinate(-1)).toBe(0);
    });

    it('should convert 1 to 1', () => {
      expect(normalizeCoordinate(1)).toBe(1);
    });

    it('should convert 0 to 0.5', () => {
      expect(normalizeCoordinate(0)).toBe(0.5);
    });

    it('should clamp values below -1 to 0', () => {
      expect(normalizeCoordinate(-2)).toBe(0);
    });

    it('should clamp values above 1 to 1', () => {
      expect(normalizeCoordinate(2)).toBe(1);
    });

    it('should handle intermediate values correctly', () => {
      expect(normalizeCoordinate(-0.5)).toBeCloseTo(0.25);
      expect(normalizeCoordinate(0.5)).toBeCloseTo(0.75);
    });
  });
});
