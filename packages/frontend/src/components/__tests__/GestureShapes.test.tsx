// GestureShapes interaction state machine: pinch-grab, drag, two-hand
// scale, release — observed through the recorded 2d context.

import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import GestureShapes from '../GestureShapes';
import { useTrackingStore, type TrackingData, type HandData } from '../../store/trackingStore';

interface CtxCall {
  method: string;
  args: number[];
}
const ctxCalls: CtxCall[] = [];

function makeCtxStub() {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        // property reads (fillStyle etc.) return a recorder fn — harmless
        return (...args: number[]) => ctxCalls.push({ method: String(prop), args });
      },
      set() {
        return true;
      },
    },
  );
}

/** HandData whose position lands at canvas-space [0,1] (x,y). */
function handAt(x: number, y: number, gesture: string): HandData {
  return {
    detected: true,
    landmarks: [],
    gesture,
    position: { x: x * 2 - 1, y: y * 2 - 1, z: 0 },
    cameraPosition: { x, y },
    pinchStrength: gesture === 'pinch' ? 1 : 0,
    confidence: 1,
    timestamp: Date.now(),
  };
}

function tracking(left: HandData | null, right: HandData | null): TrackingData {
  return { face: null, body: null, eyes: null, timestamp: Date.now(), hands: { left, right } };
}

async function setTracking(t: TrackingData) {
  act(() => {
    useTrackingStore.getState().setTracking(t);
  });
  // let a few rAF ticks paint the new state
  await new Promise((r) => setTimeout(r, 30));
}

/** Largest-radius arc in the recorded calls — the circle shape 'a'. */
function circleArc(): { x: number; y: number; r: number } | null {
  const arcs = ctxCalls.filter((c) => c.method === 'arc' && c.args[2] > 40);
  const last = arcs[arcs.length - 1];
  return last ? { x: last.args[0], y: last.args[1], r: last.args[2] } : null;
}

const SHAPE_A = { x: 0.3, y: 0.4 }; // initial position of the circle

describe('GestureShapes interaction', () => {
  beforeEach(() => {
    ctxCalls.length = 0;
    useTrackingStore.setState({ currentTracking: null, trackingHistory: [] });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 5),
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => makeCtxStub() as unknown as CanvasRenderingContext2D,
    );
  });

  it('pinch-grabs and drags the nearest shape', async () => {
    render(<GestureShapes />);
    const W = window.innerWidth;
    const H = window.innerHeight;

    await setTracking(tracking(null, null));
    const before = circleArc();
    expect(before).not.toBeNull();
    expect(before!.x).toBeCloseTo(SHAPE_A.x * W, 0);
    expect(before!.y).toBeCloseTo(SHAPE_A.y * H, 0);

    // pinch down on the circle — grab
    await setTracking(tracking(null, handAt(SHAPE_A.x, SHAPE_A.y, 'pinch')));
    // drag to (0.6, 0.6)
    await setTracking(tracking(null, handAt(0.6, 0.6, 'pinch')));

    const after = circleArc();
    expect(after!.x).toBeCloseTo(0.6 * W, 0);
    expect(after!.y).toBeCloseTo(0.6 * H, 0);
  });

  it('releases the shape when the pinch opens', async () => {
    render(<GestureShapes />);
    await setTracking(tracking(null, handAt(SHAPE_A.x, SHAPE_A.y, 'pinch')));
    await setTracking(tracking(null, handAt(0.5, 0.5, 'pinch')));
    // open the hand — release
    await setTracking(tracking(null, handAt(0.5, 0.5, 'none')));
    // move open hand elsewhere — nothing should drag
    await setTracking(tracking(null, handAt(0.9, 0.9, 'none')));
    const pos = circleArc();
    expect(pos!.x).toBeCloseTo(0.5 * window.innerWidth, 0);
  });

  it('does not grab when the pinch lands far from every shape', async () => {
    render(<GestureShapes />);
    await setTracking(tracking(null, null));
    // pinch far away from all shapes, then drag
    await setTracking(tracking(null, handAt(0.95, 0.95, 'pinch')));
    await setTracking(tracking(null, handAt(0.8, 0.8, 'pinch')));
    const pos = circleArc();
    expect(pos!.x).toBeCloseTo(SHAPE_A.x * window.innerWidth, 0);
    expect(pos!.y).toBeCloseTo(SHAPE_A.y * window.innerHeight, 0);
  });
});
