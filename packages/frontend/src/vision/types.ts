// Shared vision types. Inference runs on the main thread (MediaPipe's WASM
// loader uses importScripts, which ES-module workers forbid) — the tracker
// self-benchmarks GPU vs CPU delegates at startup and keeps the faster.
// Camera coords are normalized [0,1] with origin top-left (MediaPipe image space).
// Projector coords are normalized [0,1] with origin top-left (canvas space).

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface RawHandResult {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  handedness: 'Left' | 'Right';
  cannedGesture: string; // GestureRecognizer categoryName or 'None'
  gestureScore: number;
}

export type GestureName =
  | 'pinch'
  | 'point'
  | 'open_palm'
  | 'closed_fist'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'victory'
  | 'i_love_you'
  | 'none';

