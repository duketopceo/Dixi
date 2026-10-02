// Shared types between the vision worker and the main thread.
// Camera coords are normalized [0,1] with origin top-left (MediaPipe image space).
// Projector coords are normalized [0,1] with origin top-left (canvas space).

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface CalibrationPoint {
  camera: { x: number; y: number };
  projector: { x: number; y: number };
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

export interface TrackedHand {
  detected: boolean;
  handedness: 'Left' | 'Right';
  gesture: GestureName;
  /** Fingertip/pinch-centroid position in projector space [-1, 1], or null when uncalibrated */
  position: { x: number; y: number; z: number } | null;
  /** Position in raw camera space [0, 1] */
  cameraPosition: { x: number; y: number };
  landmarks: Landmark[];
  confidence: number;
  pinchStrength: number; // 0 = wide open, 1 = tips touching
  timestamp: number;
}
