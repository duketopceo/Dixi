import { describe, it, expect } from 'vitest';
import {
  computeHomography,
  applyHomography,
  validateCorners,
  type Point2,
} from '../homography';

const unitSquare: Point2[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

const quad: Point2[] = [
  [0.2, 0.15],
  [0.8, 0.1],
  [0.85, 0.9],
  [0.15, 0.85],
];

describe('computeHomography', () => {
  it('identity mapping returns ~identity matrix', () => {
    const h = computeHomography(unitSquare, unitSquare);
    expect(h).not.toBeNull();
    expect(h![0]).toBeCloseTo(1, 5);
    expect(h![4]).toBeCloseTo(1, 5);
    expect(h![8]).toBeCloseTo(1, 5);
    expect(h![1]).toBeCloseTo(0, 5);
    expect(h![6]).toBeCloseTo(0, 5);
  });

  it('maps corners to their targets exactly', () => {
    const h = computeHomography(quad, unitSquare)!;
    for (let i = 0; i < 4; i++) {
      const out = applyHomography(h, quad[i][0], quad[i][1])!;
      expect(out[0]).toBeCloseTo(unitSquare[i][0], 4);
      expect(out[1]).toBeCloseTo(unitSquare[i][1], 4);
    }
  });

  it('maps interior points (center of quad -> near 0.5)', () => {
    const h = computeHomography(quad, unitSquare)!;
    const cx = (quad[0][0] + quad[2][0]) / 2;
    const cy = (quad[0][1] + quad[2][1]) / 2;
    const out = applyHomography(h, cx, cy)!;
    expect(out[0]).toBeGreaterThan(0.3);
    expect(out[0]).toBeLessThan(0.7);
    expect(out[1]).toBeGreaterThan(0.3);
    expect(out[1]).toBeLessThan(0.7);
  });

  it('round-trips through the inverse mapping', () => {
    const h1 = computeHomography(quad, unitSquare)!;
    const h2 = computeHomography(unitSquare, quad)!;
    const p = applyHomography(h1, quad[1][0], quad[1][1])!;
    const back = applyHomography(h2, p[0], p[1])!;
    expect(back[0]).toBeCloseTo(quad[1][0], 4);
    expect(back[1]).toBeCloseTo(quad[1][1], 4);
  });

  it('rejects degenerate input (duplicate points)', () => {
    const bad: Point2[] = [
      [0.5, 0.5],
      [0.5, 0.5],
      [0.9, 0.9],
      [0.1, 0.9],
    ];
    expect(computeHomography(bad, unitSquare)).toBeNull();
  });

  it('rejects collinear points', () => {
    const line: Point2[] = [
      [0.1, 0.5],
      [0.3, 0.5],
      [0.7, 0.5],
      [0.9, 0.5],
    ];
    expect(computeHomography(line, unitSquare)).toBeNull();
  });

  it('returns null for wrong point count', () => {
    expect(computeHomography(quad.slice(0, 3), unitSquare)).toBeNull();
  });
});

describe('validateCorners', () => {
  it('accepts a proper quad', () => {
    expect(validateCorners(quad)).toBe(true);
  });
  it('rejects overlapping points', () => {
    expect(
      validateCorners([
        [0.5, 0.5],
        [0.505, 0.5],
        [0.9, 0.1],
        [0.1, 0.9],
      ]),
    ).toBe(false);
  });
});

describe('applyHomography', () => {
  it('returns null when point maps to infinity', () => {
    // w = 0 for the input
    const h = [1, 0, 0, 0, 1, 0, 0, 0, 0];
    expect(applyHomography(h, 0.5, 0.5)).toBeNull();
  });
});
