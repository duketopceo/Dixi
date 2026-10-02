// Pure gesture logic: MediaPipe landmarks -> gesture + interaction state.
// No DOM, no MediaPipe imports — unit-testable with synthetic landmarks.

import type { Landmark, GestureName, RawHandResult } from './types';

// MediaPipe 21-landmark indices
export const WRIST = 0;
export const THUMB_TIP = 4;
export const INDEX_TIP = 8;
export const MIDDLE_TIP = 12;
export const RING_TIP = 16;
export const PINKY_TIP = 20;
export const INDEX_MCP = 5;
export const MIDDLE_MCP = 9;

// Pinch hysteresis on strength (0..1): enter at 0.82, exit below 0.70
export const PINCH_ON = 0.82;
export const PINCH_OFF = 0.7;

const CANNED_MAP: Record<string, GestureName> = {
  Open_Palm: 'open_palm',
  Closed_Fist: 'closed_fist',
  Pointing_Up: 'point',
  Thumb_Up: 'thumbs_up',
  Thumb_Down: 'thumbs_down',
  Victory: 'victory',
  ILove_You: 'i_love_you',
};

export function dist2(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Pinch strength: 0 when tips are far apart, 1 when touching.
 * Normalized by hand size (wrist -> index MCP) so it works at any distance
 * from the camera.
 */
export function pinchStrength(landmarks: Landmark[]): number {
  const tipDist = dist2(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
  const handSize = dist2(landmarks[WRIST], landmarks[INDEX_MCP]);
  if (handSize < 1e-6) return 0;
  const ratio = tipDist / handSize;
  // ratio ~0.25 = touching, ~1.0 = fully open
  return Math.max(0, Math.min(1, 1 - (ratio - 0.25) / 0.75));
}

/**
 * Classify the hand gesture. Pinch is computed geometrically (the canned
 * model has no pinch); everything else comes from GestureRecognizer output.
 */
export function classifyGesture(
  raw: RawHandResult,
  wasPinching: boolean,
): { gesture: GestureName; pinch: number } {
  const pinch = pinchStrength(raw.landmarks);
  const isPinching = wasPinching ? pinch > PINCH_OFF : pinch > PINCH_ON;
  if (isPinching) return { gesture: 'pinch', pinch };

  const canned = CANNED_MAP[raw.cannedGesture];
  if (canned && raw.gestureScore > 0.5) return { gesture: canned, pinch };
  return { gesture: 'none', pinch };
}

/**
 * Index-finger tip position — the cursor anchor in camera space.
 * When pinching, use the midpoint of thumb+index tips (grabs feel anchored
 * at the pinch point, not the index tip).
 */
export function cursorPoint(raw: RawHandResult, gesture: GestureName): { x: number; y: number } {
  if (gesture === 'pinch') {
    return {
      x: (raw.landmarks[THUMB_TIP].x + raw.landmarks[INDEX_TIP].x) / 2,
      y: (raw.landmarks[THUMB_TIP].y + raw.landmarks[INDEX_TIP].y) / 2,
    };
  }
  return { x: raw.landmarks[INDEX_TIP].x, y: raw.landmarks[INDEX_TIP].y };
}

/** Finger-extension flags compatible with the backend HandData shape. */
export function fingerStates(landmarks: Landmark[]): {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
} {
  const extended = (tip: number, mcp: number) => {
    const tipD = dist2(landmarks[tip], landmarks[WRIST]);
    const mcpD = dist2(landmarks[mcp], landmarks[WRIST]);
    return tipD > mcpD * 1.15;
  };
  return {
    thumb: extended(THUMB_TIP, 2),
    index: extended(INDEX_TIP, INDEX_MCP),
    middle: extended(MIDDLE_TIP, MIDDLE_MCP),
    ring: extended(RING_TIP, 13),
    pinky: extended(PINKY_TIP, 17),
  };
}

/** Exponential position smoother with outlier rejection (Python parity). */
export class PositionSmoother {
  private last: { x: number; y: number } | null = null;

  constructor(
    private alpha = 0.35,
    private outlierThreshold = 0.25,
  ) {}

  smooth(x: number, y: number): { x: number; y: number } {
    if (!this.last) {
      this.last = { x, y };
      return this.last;
    }
    if (Math.hypot(x - this.last.x, y - this.last.y) > this.outlierThreshold) {
      return this.last; // reject outlier — keep previous
    }
    this.last = {
      x: this.alpha * x + (1 - this.alpha) * this.last.x,
      y: this.alpha * y + (1 - this.alpha) * this.last.y,
    };
    return this.last;
  }

  reset(): void {
    this.last = null;
  }
}
