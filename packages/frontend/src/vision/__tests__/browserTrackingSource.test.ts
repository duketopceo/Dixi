// BrowserTrackingSource: RawHandResult -> trackingStore mapping —
// handedness, mirror fallback, per-hand state reset.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserTrackingSource } from '../browserTrackingSource';
import { useTrackingStore } from '../../store/trackingStore';
import { useVisionStore } from '../visionStore';
import type { RawHandResult } from '../types';
import type { TrackerCallbacks } from '../trackerClient';

// Capture the callbacks passed to the (mocked) TrackerClient so tests can
// drive frames through the source.
const hooks = vi.hoisted(() => ({ cb: null as TrackerCallbacks | null }));

vi.mock('../trackerClient', () => ({
  TrackerClient: vi.fn((cb: TrackerCallbacks) => {
    hooks.cb = cb;
    return { start: vi.fn(async () => {}), stop: vi.fn(), videoElement: null };
  }),
}));

/** 21-point landmark array; overrides applied by index. */
function landmarks(overrides: Record<number, { x: number; y: number }>) {
  const lms = Array.from({ length: 21 }, (_, i) => ({
    x: 0.2 + i * 0.01,
    y: 0.6,
    z: 0,
  }));
  for (const [i, p] of Object.entries(overrides)) {
    lms[Number(i)] = { ...lms[Number(i)], ...p };
  }
  return lms;
}

/** Open hand — thumb/index tips far apart → pinchStrength ~0. */
function openHand(handedness: 'Left' | 'Right', tip: { x: number; y: number }): RawHandResult {
  const lms = landmarks({
    0: { x: 0.4, y: 0.6 },   // wrist
    4: { x: 0.1, y: 0.3 },   // thumb tip — far from index
    5: { x: 0.48, y: 0.55 }, // index MCP
    8: tip,                  // index tip = cursor anchor
  });
  return { landmarks: lms, worldLandmarks: [], handedness, cannedGesture: 'None', gestureScore: 0.9 };
}

/** Pinching hand — tips together → strength 1. */
function pinchHand(handedness: 'Left' | 'Right', at: { x: number; y: number }): RawHandResult {
  const lms = landmarks({
    0: { x: 0.4, y: 0.6 },
    4: at,                     // thumb tip
    5: { x: 0.48, y: 0.55 },
    8: { x: at.x, y: at.y },   // index tip at same spot
  });
  return { landmarks: lms, worldLandmarks: [], handedness, cannedGesture: 'None', gestureScore: 0.9 };
}

/** Marginal pinch — strength lands between PINCH_OFF and PINCH_ON. */
function marginalPinch(handedness: 'Left' | 'Right'): RawHandResult {
  const lms = landmarks({
    0: { x: 0, y: 0 },
    4: { x: 0.1, y: 0 },
    5: { x: 0.1, y: 0 },     // handSize = 0.1 (wrist->indexMCP)... override below
    8: { x: 0.115, y: 0 },   // tipDist = 0.015? adjust for strength ~0.78
  });
  // wrist(0,0)->indexMCP(0.1,0): handSize 0.1; tips 4(0.1,0) 8(0.115,0): tipDist 0.015
  // ratio 0.15 -> strength = 1 - (0.15-0.25)/0.75 = 1.13 -> clamp 1. Too strong.
  // Recompute: want strength ~0.78 -> ratio ~0.415 -> tipDist ~0.0415*0.1
  lms[8] = { x: 0.1415, y: 0, z: 0 };
  return { landmarks: lms, worldLandmarks: [], handedness, cannedGesture: 'None', gestureScore: 0.9 };
}

function frame(hands: RawHandResult[], ms = 0) {
  hooks.cb?.onResult?.(hands, performance.now(), ms);
}

describe('BrowserTrackingSource', () => {
  beforeEach(() => {
    useTrackingStore.setState({ currentTracking: null, trackingHistory: [] });
    useVisionStore.setState({ homography: null, status: 'idle', fps: 0, inferenceMs: 0 });
    // constructs the mocked TrackerClient and captures its callbacks
    new BrowserTrackingSource();
    // clear any residual per-hand state from earlier tests
    frame([]);
  });

  it('maps handedness to the matching tracking slot', () => {
    frame([openHand('Right', { x: 0.5, y: 0.5 }), openHand('Left', { x: 0.3, y: 0.5 })]);
    const t = useTrackingStore.getState().currentTracking!;
    expect(t.hands.right?.detected).toBe(true);
    expect(t.hands.left?.detected).toBe(true);
    expect(t.hands.right).not.toBeNull();
    expect(t.hands.left).not.toBeNull();
  });

  it('mirrors camera x in the uncalibrated fallback position', () => {
    frame([openHand('Right', { x: 0.3, y: 0.5 })]);
    const t = useTrackingStore.getState().currentTracking!;
    // camera x 0.3 -> smoothed 0.3 -> mirrored position.x = (1-0.3)*2-1 = 0.4
    expect(t.hands.right!.position.x).toBeCloseTo(0.4, 5);
    expect(t.hands.right!.cameraPosition!.x).toBeCloseTo(0.3, 5);
  });

  it('classifies pinch geometrically and reports pinchStrength', () => {
    frame([pinchHand('Right', { x: 0.5, y: 0.5 })]);
    const t = useTrackingStore.getState().currentTracking!;
    expect(t.hands.right!.gesture).toBe('pinch');
    expect(t.hands.right!.pinchStrength).toBeGreaterThan(0.82);
  });

  it('resets pinch hysteresis when a hand leaves the frame', () => {
    // strong pinch -> 'pinch' (wasPinching=true)
    frame([pinchHand('Right', { x: 0.5, y: 0.5 })]);
    expect(useTrackingStore.getState().currentTracking!.hands.right!.gesture).toBe('pinch');
    // hand leaves -> internal wasPinching must reset
    frame([]);
    expect(useTrackingStore.getState().currentTracking!.hands.right).toBeNull();
    // marginal strength that hysteresis WOULD keep as pinch if state leaked
    frame([marginalPinch('Right')]);
    const g = useTrackingStore.getState().currentTracking!.hands.right!.gesture;
    expect(g).not.toBe('pinch');
  });

  it('publishes perf stats and lifecycle status', () => {
    hooks.cb?.onReady?.();
    expect(useVisionStore.getState().status).toBe('running');
    frame([openHand('Right', { x: 0.5, y: 0.5 })], 22);
    expect(useVisionStore.getState().inferenceMs).toBe(22);
    hooks.cb?.onError?.('boom');
    expect(useVisionStore.getState().status).toBe('error');
    expect(useVisionStore.getState().error).toBe('boom');
  });
});
