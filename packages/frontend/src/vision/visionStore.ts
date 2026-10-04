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
  /** Points snapshotted when calibration began — restored on cancel. */
  preCalibrationPoints: { camera: Point2; projector: Point2 }[] | null;

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

function isPoint2(p: unknown): p is Point2 {
  return Array.isArray(p) && p.length === 2 && p.every((v) => Number.isFinite(v));
}

function isValidSavedCalibration(data: unknown): data is {
  points: { camera: Point2; projector: Point2 }[];
  homography: Homography;
} {
  const d = data as { points?: unknown; homography?: unknown } | null;
  return (
    Array.isArray(d?.points) &&
    d.points.length === 4 &&
    d.points.every(
      (p) => isPoint2((p as { camera?: unknown })?.camera) && isPoint2((p as { projector?: unknown })?.projector),
    ) &&
    Array.isArray(d.homography) &&
    d.homography.length === 9 &&
    d.homography.every((v) => Number.isFinite(v))
  );
}

function loadCalibration(): {
  points: { camera: Point2; projector: Point2 }[];
  homography: Homography | null;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { points: [], homography: null };
    const data: unknown = JSON.parse(raw);
    if (isValidSavedCalibration(data)) {
      return { points: data.points, homography: data.homography };
    }
    // Corrupt-but-parseable payload (NaN, wrong arity) — remove the poison
    // so every reload doesn't re-ingest it.
    localStorage.removeItem(STORAGE_KEY);
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
  preCalibrationPoints: null,
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

  beginCalibration: () =>
    set((s) => ({
      calibrating: true,
      calibrationPoints: [],
      preCalibrationPoints: s.calibrationPoints,
    })),

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
      set({ calibrationPoints: points, homography: h, calibrating: false, preCalibrationPoints: null });
      return true;
    }
    // Degenerate point set — restart
    set({ calibrationPoints: [] });
    return false;
  },

  cancelCalibration: () =>
    set((s) => ({
      calibrating: false,
      // Restore the snapshot taken at beginCalibration — module-load
      // `initial` is stale if calibration changed since page load.
      calibrationPoints: s.preCalibrationPoints ?? s.calibrationPoints,
      preCalibrationPoints: null,
    })),

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
