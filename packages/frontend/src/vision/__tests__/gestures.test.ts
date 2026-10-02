import { describe, it, expect } from 'vitest';
import {
  pinchStrength,
  classifyGesture,
  cursorPoint,
  fingerStates,
  PositionSmoother,
  THUMB_TIP,
  INDEX_TIP,
  MIDDLE_TIP,
  RING_TIP,
  PINKY_TIP,
  WRIST,
  INDEX_MCP,
} from '../gestures';
import type { Landmark, RawHandResult } from '../types';

/** Build a synthetic hand: wrist at (0.5,0.8), finger positions laid out. */
function makeLandmarks(overrides: Partial<Record<number, Landmark>> = {}): Landmark[] {
  const pts: Landmark[] = Array.from({ length: 21 }, (_, i) => ({
    x: 0.5 + i * 0.005,
    y: 0.8 - i * 0.02,
    z: 0,
  }));
  pts[WRIST] = { x: 0.5, y: 0.8, z: 0 };
  pts[INDEX_MCP] = { x: 0.55, y: 0.65, z: 0 };
  for (const [idx, lm] of Object.entries(overrides)) {
    if (lm) pts[Number(idx)] = lm;
  }
  return pts;
}

function makeHand(landmarks: Landmark[], canned = 'None', score = 0): RawHandResult {
  return {
    landmarks,
    worldLandmarks: [],
    handedness: 'Right',
    cannedGesture: canned,
    gestureScore: score,
  };
}

describe('pinchStrength', () => {
  it('is ~1 when thumb and index tips touch', () => {
    const lm = makeLandmarks({
      [THUMB_TIP]: { x: 0.6, y: 0.6, z: 0 },
      [INDEX_TIP]: { x: 0.6, y: 0.6, z: 0 },
    });
    expect(pinchStrength(lm)).toBeGreaterThan(0.9);
  });

  it('is ~0 when tips are far apart', () => {
    const lm = makeLandmarks({
      [THUMB_TIP]: { x: 0.2, y: 0.2, z: 0 },
      [INDEX_TIP]: { x: 0.8, y: 0.8, z: 0 },
    });
    expect(pinchStrength(lm)).toBeLessThan(0.1);
  });

  it('normalizes by hand size (stable across camera distance)', () => {
    // small hand (far away): wrist->mcp = 0.05, tips touching-ish
    const far = makeLandmarks({
      [WRIST]: { x: 0.5, y: 0.5, z: 0 },
      [INDEX_MCP]: { x: 0.52, y: 0.5, z: 0 },
      [THUMB_TIP]: { x: 0.53, y: 0.5, z: 0 },
      [INDEX_TIP]: { x: 0.53, y: 0.505, z: 0 },
    });
    expect(pinchStrength(far)).toBeGreaterThan(0.8);
  });
});

describe('classifyGesture', () => {
  const pinched = makeLandmarks({
    [THUMB_TIP]: { x: 0.6, y: 0.6, z: 0 },
    [INDEX_TIP]: { x: 0.6, y: 0.6, z: 0 },
  });
  const open = makeLandmarks({
    [THUMB_TIP]: { x: 0.1, y: 0.1, z: 0 },
    [INDEX_TIP]: { x: 0.9, y: 0.9, z: 0 },
  });

  it('detects pinch geometrically (no canned pinch exists)', () => {
    const { gesture } = classifyGesture(makeHand(pinched), false);
    expect(gesture).toBe('pinch');
  });

  it('applies hysteresis: stays pinched below the off-threshold', () => {
    // strength ~0.75 — below PINCH_ON(0.82), above PINCH_OFF(0.70)
    // tip dist 0.0625 vs handSize ~0.158 -> ratio 0.395 -> strength ~0.81
    const lm = makeLandmarks({
      [THUMB_TIP]: { x: 0.60, y: 0.60, z: 0 },
      [INDEX_TIP]: { x: 0.645, y: 0.645, z: 0 },
    });
    expect(classifyGesture(makeHand(lm), false).gesture).not.toBe('pinch');
    expect(classifyGesture(makeHand(lm), true).gesture).toBe('pinch');
  });

  it('maps canned gestures', () => {
    const { gesture } = classifyGesture(makeHand(open, 'Thumb_Up', 0.9), false);
    expect(gesture).toBe('thumbs_up');
  });

  it('rejects low-confidence canned gestures', () => {
    const { gesture } = classifyGesture(makeHand(open, 'Victory', 0.2), false);
    expect(gesture).toBe('none');
  });

  it('pinch overrides canned labels', () => {
    const { gesture } = classifyGesture(makeHand(pinched, 'Closed_Fist', 0.9), false);
    expect(gesture).toBe('pinch');
  });
});

describe('cursorPoint', () => {
  it('uses index tip when not pinching', () => {
    const lm = makeLandmarks({
      [INDEX_TIP]: { x: 0.42, y: 0.33, z: 0 },
    });
    const p = cursorPoint(makeHand(lm), 'point');
    expect(p.x).toBeCloseTo(0.42);
    expect(p.y).toBeCloseTo(0.33);
  });

  it('uses thumb/index midpoint when pinching', () => {
    const lm = makeLandmarks({
      [THUMB_TIP]: { x: 0.4, y: 0.4, z: 0 },
      [INDEX_TIP]: { x: 0.5, y: 0.4, z: 0 },
    });
    const p = cursorPoint(makeHand(lm), 'pinch');
    expect(p.x).toBeCloseTo(0.45);
    expect(p.y).toBeCloseTo(0.4);
  });
});

describe('fingerStates', () => {
  it('flags extended fingers by tip-vs-mcp distance from wrist', () => {
    const lm = makeLandmarks({
      [INDEX_TIP]: { x: 0.55, y: 0.3, z: 0 }, // far from wrist -> extended
      [MIDDLE_TIP]: { x: 0.58, y: 0.75, z: 0 }, // close -> curled
      [RING_TIP]: { x: 0.6, y: 0.75, z: 0 },
      [PINKY_TIP]: { x: 0.62, y: 0.75, z: 0 },
    });
    const f = fingerStates(lm);
    expect(f.index).toBe(true);
    expect(f.middle).toBe(false);
  });
});

describe('PositionSmoother', () => {
  it('passes the first point through', () => {
    const s = new PositionSmoother(0.3);
    expect(s.smooth(0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('lerps toward new positions', () => {
    const s = new PositionSmoother(0.5);
    s.smooth(0, 0);
    const out = s.smooth(0.1, 0.1);
    expect(out.x).toBeCloseTo(0.05);
  });

  it('rejects outlier jumps', () => {
    const s = new PositionSmoother(0.5, 0.25);
    s.smooth(0.5, 0.5);
    const out = s.smooth(0.95, 0.95); // 0.63 jump > threshold
    expect(out).toEqual({ x: 0.5, y: 0.5 });
  });

  it('reset clears state', () => {
    const s = new PositionSmoother(0.5);
    s.smooth(0.5, 0.5);
    s.reset();
    expect(s.smooth(0.9, 0.9)).toEqual({ x: 0.9, y: 0.9 });
  });
});
