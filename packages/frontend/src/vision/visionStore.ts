// Vision state: mode, lifecycle, calibration, perf stats.

import { create } from 'zustand';
import type { Homography, Point2 } from './homography';
import { computeHomography, applyHomography, validateCorners } from './homography';

export type VisionMode = 'browser' | 'server';
export type VisionStatus = 'idle' | 'starting' | 'ready' | 'running' | 'error';

const STORAGE_KEY = 'dixi-calibration-v1';
// Projector corner targets, inset from edges so they're on the projection
export const PROJECTOR_TARGETS: Point2[] = [
  [0.05, 0.05],
  [0.95, 0.05],
  [0.95, 0.95],
  [0.05, 0.95],
];

interface VisionStore {
  mode: VisionMode;
  status: VisionStatus;
  error: string | null;
  fps: number;
  inferenceMs: number;
  /** 4 camera<->projector point pairs collected during calibration */
  calibrationPoints: { camera: Point2; projector: Point2 }[];
  homography: Homography | null;
  calibrating: boolean;
  previewVisible: boolean;
  cameraId: string | null;

  setMode: (mode: VisionMode) => void;
  setCameraId: (id: string | null) => void;
  setStatus: (status: VisionStatus, error?: string | null) => void;
  setPerf: (fps: number, inferenceMs: number) => void;
  togglePreview: () => void;
  beginCalibration: () => void;
  addCalibrationPoint: (camera: Point2) => boolean;
  cancelCalibration: () => void;
  clearCalibration: () => void;
  /** camera [0,1] -> projector [0,1]; null when uncalibrated */
  toProjector: (x: number, y: number) => Point2 | null;
}

function loadCalibration(): {
  points: { camera: Point2; projector: Point2 }[];
  homography: Homography | null;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { points: [], homography: null };
    const data = JSON.parse(raw);
    if (data?.points?.length === 4 && Array.isArray(data?.homography)) {
      return { points: data.points, homography: data.homography };
    }
  } catch {
    /* corrupt storage — recalibrate */
  }
  return { points: [], homography: null };
}

const initial = loadCalibration();

export const useVisionStore = create<VisionStore>((set, get) => ({
  mode: (import.meta.env.VITE_VISION_MODE as VisionMode) || 'browser',
  status: 'idle',
  error: null,
  fps: 0,
  inferenceMs: 0,
  calibrationPoints: initial.points,
  homography: initial.homography,
  calibrating: false,
  previewVisible: false,
  cameraId: (() => {
    try { return localStorage.getItem('dixi-camera-v1'); } catch { return null; }
  })(),

  setMode: (mode) => set({ mode }),
  setCameraId: (id) => {
    try {
      if (id) localStorage.setItem('dixi-camera-v1', id);
      else localStorage.removeItem('dixi-camera-v1');
    } catch { /* storage blocked */ }
    set({ cameraId: id });
  },
  setStatus: (status, error = null) => set({ status, error }),
  setPerf: (fps, inferenceMs) => set({ fps, inferenceMs }),
  togglePreview: () => set((s) => ({ previewVisible: !s.previewVisible })),

  beginCalibration: () => set({ calibrating: true, calibrationPoints: [] }),

  /** Returns true when all 4 points are in and calibration completed. */
  addCalibrationPoint: (camera) => {
    const { calibrationPoints } = get();
    const projector = PROJECTOR_TARGETS[calibrationPoints.length];
    const points = [...calibrationPoints, { camera, projector }];

    if (points.length < 4) {
      set({ calibrationPoints: points });
      return false;
    }

    const camPts = points.map((p) => p.camera);
    const projPts = points.map((p) => p.projector);
    const h =
      validateCorners(camPts) && validateCorners(projPts)
        ? computeHomography(camPts, projPts)
        : null;

    if (h) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ points, homography: h }));
      set({ calibrationPoints: points, homography: h, calibrating: false });
      return true;
    }
    // Degenerate point set — restart
    set({ calibrationPoints: [] });
    return false;
  },

  cancelCalibration: () =>
    set({
      calibrating: false,
      calibrationPoints: initial.points.length === 4 ? initial.points : [],
    }),

  clearCalibration: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ calibrationPoints: [], homography: null });
  },

  toProjector: (x, y) => {
    const { homography } = get();
    if (!homography) return null;
    return applyHomography(homography, x, y);
  },
}));
