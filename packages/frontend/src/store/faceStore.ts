import { create } from 'zustand';

export interface FaceData {
  detected: boolean;
  landmarks_count?: number;
  bounding_box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
    width: number;
    height: number;
  };
  key_points?: {
    left_eye: { x: number; y: number };
    right_eye: { x: number; y: number };
    nose_tip: { x: number; y: number };
    mouth_center: { x: number; y: number };
  };
  head_pose?: {
    tilt: number;
    turn: number;
  };
  eye_features?: {
    left_eye_open: boolean;
    right_eye_open: boolean;
    both_eyes_open: boolean;
    gaze_direction: number;
    left_eye_height: number;
    right_eye_height: number;
  };
  mouth_features?: {
    mouth_open: boolean;
    mouth_open_ratio: number;
    smile_score: number;
    is_smiling: boolean;
    mouth_width: number;
  };
  engagement?: {
    score: number;
    head_straightness: number;
    eye_engagement: number;
    is_engaged: boolean;
  };
  expressions?: { [key: string]: number };
  timestamp: number;
}

interface FaceStore {
  currentFace: FaceData | null;
  setCurrentFace: (face: FaceData | null) => void;
  clearFace: () => void;
}

export const useFaceStore = create<FaceStore>((set) => ({
  currentFace: null,
  setCurrentFace: (face) => set({ currentFace: face }),
  clearFace: () => set({ currentFace: null }),
}));
