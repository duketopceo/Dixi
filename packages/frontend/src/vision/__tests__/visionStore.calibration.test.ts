// Calibration lifecycle on the store: persisted-payload validation and
// the cancel-restore snapshot.

import { describe, it, expect, beforeEach } from 'vitest';
import { useVisionStore } from '../visionStore';
import type { Point2 } from '../homography';

const KEY = 'dixi-calibration-v1';
const pts4 = [
  { camera: [0.1, 0.1] as Point2, projector: [0.05, 0.05] as Point2 },
  { camera: [0.9, 0.1] as Point2, projector: [0.95, 0.05] as Point2 },
  { camera: [0.9, 0.9] as Point2, projector: [0.95, 0.95] as Point2 },
  { camera: [0.1, 0.9] as Point2, projector: [0.05, 0.95] as Point2 },
];

describe('visionStore calibration lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    useVisionStore.setState({
      calibrating: false,
      calibrationPoints: [],
      preCalibrationPoints: null,
      homography: null,
    });
  });

  it('cancel restores the points present when calibration began', () => {
    const s = useVisionStore.getState();
    // Simulate a prior completed calibration already in state.
    useVisionStore.setState({ calibrationPoints: pts4 });
    s.beginCalibration();
    expect(useVisionStore.getState().calibrationPoints).toHaveLength(0);
    // bank one point mid-flow, then cancel
    useVisionStore.getState().addCalibrationPoint([0.5, 0.5]);
    useVisionStore.getState().cancelCalibration();
    expect(useVisionStore.getState().calibrationPoints).toEqual(pts4);
    expect(useVisionStore.getState().preCalibrationPoints).toBeNull();
  });

  it('cancel with no prior calibration returns to empty', () => {
    useVisionStore.getState().beginCalibration();
    useVisionStore.getState().addCalibrationPoint([0.5, 0.5]);
    useVisionStore.getState().cancelCalibration();
    expect(useVisionStore.getState().calibrationPoints).toHaveLength(0);
  });

  it('a completed calibration produces a persisted homography', () => {
    const s = useVisionStore.getState();
    s.beginCalibration();
    let done = false;
    for (const p of pts4) done = useVisionStore.getState().addCalibrationPoint(p.camera);
    expect(done).toBe(true);
    const st = useVisionStore.getState();
    expect(st.calibrating).toBe(false);
    expect(st.homography).not.toBeNull();
    expect(st.homography).toHaveLength(9);
    expect(st.homography!.every(Number.isFinite)).toBe(true);
    // persisted payload round-trips the validation gate
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.homography).toEqual(st.homography);
  });

  it('rejects corrupt-but-parseable persisted calibration', async () => {
    // poisoned payload: right shape, but coordinates are not finite numbers
    localStorage.setItem(
      KEY,
      JSON.stringify({
        points: [
          { camera: [null, 0.1], projector: [0.05, 0.05] },
          { camera: [0.9, 0.1], projector: [0.95, 0.05] },
          { camera: [0.9], projector: [0.95, 0.95] },
          { camera: [0.1, 0.9], projector: [0.05, 0.95] },
        ],
        homography: [1, 0, 0, 0, 1, 0, 0, 0, 'x'],
      }),
    );
    const { vi } = await import('vitest');
    vi.resetModules();
    const fresh = await import('../visionStore');
    expect(fresh.useVisionStore.getState().homography).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull(); // poison removed
    vi.resetModules(); // restore module registry for later suites
  });

  it('degenerate camera points restart the flow instead of persisting NaN', () => {
    const s = useVisionStore.getState();
    s.beginCalibration();
    // same point 4x -> degenerate -> homography must not compute/persist
    let done = false;
    for (let i = 0; i < 4; i++) done = useVisionStore.getState().addCalibrationPoint([0.5, 0.5]);
    expect(done).toBe(false);
    expect(useVisionStore.getState().homography).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(useVisionStore.getState().calibrating).toBe(true); // restarted, still calibrating
  });
});
