// Bridges tracker worker results into the existing trackingStore shape so
// every downstream component (ProjectionShapes, HUD, GestureCursor) works
// unchanged — same TrackingData interface the Python service produced.

import { TrackerClient } from './trackerClient';
import { classifyGesture, cursorPoint, fingerStates, PositionSmoother } from './gestures';
import { useVisionStore } from './visionStore';
import { useTrackingStore, type TrackingData, type HandData } from '../store/trackingStore';
import type { RawHandResult } from './types';

const smoothers: Record<'Left' | 'Right', PositionSmoother> = {
  Left: new PositionSmoother(),
  Right: new PositionSmoother(),
};
const wasPinching: Record<'Left' | 'Right', boolean> = { Left: false, Right: false };

function toHandData(raw: RawHandResult): HandData {
  const store = useVisionStore.getState();
  const { gesture, pinch } = classifyGesture(raw, wasPinching[raw.handedness]);
  wasPinching[raw.handedness] = gesture === 'pinch';

  const cam = cursorPoint(raw, gesture);
  const smoothed = smoothers[raw.handedness].smooth(cam.x, cam.y);

  // camera [0,1] -> projector [0,1] -> legacy [-1,1] position
  const proj = store.toProjector(smoothed.x, smoothed.y);
  const position = proj
    ? { x: proj[0] * 2 - 1, y: proj[1] * 2 - 1, z: raw.landmarks[8]?.z ?? 0 }
    : null;

  return {
    detected: true,
    landmarks: raw.landmarks,
    gesture,
    // uncalibrated fallback: mirror camera x (selfie-style) so it still feels right
    position: position ?? { x: (1 - smoothed.x) * 2 - 1, y: smoothed.y * 2 - 1, z: 0 },
    cameraPosition: smoothed,
    pinchStrength: pinch,
    confidence: raw.gestureScore,
    fingers: fingerStates(raw.landmarks),
    timestamp: Date.now(),
  };
}

export class BrowserTrackingSource {
  private client: TrackerClient;
  private startPromise: Promise<void> | null = null;

  constructor() {
    this.client = new TrackerClient({
      onReady: () => useVisionStore.getState().setStatus('running'),
      onResult: (hands, _ts, inferenceMs) => {
        const store = useVisionStore.getState();
        store.setPerf(store.fps, inferenceMs); // fps set by onFps

        const tracked: TrackingData = {
          face: null,
          body: null,
          eyes: null,
          timestamp: Date.now(),
          hands: {
            left: null,
            right: null,
          },
        };

        const seen = new Set<string>();
        for (const raw of hands) {
          seen.add(raw.handedness);
          tracked.hands[raw.handedness === 'Left' ? 'left' : 'right'] = toHandData(raw);
        }
        for (const side of ['Left', 'Right'] as const) {
          if (!seen.has(side)) {
            wasPinching[side] = false;
            smoothers[side].reset();
          }
        }

        useTrackingStore.getState().setTracking(tracked);
      },
      onError: (message) => useVisionStore.getState().setStatus('error', message),
    });
    this.client.onFps = (fps) => useVisionStore.getState().setPerf(fps, 0);
  }

  async start(deviceId?: string): Promise<void> {
    // StrictMode double-mounts effects in dev — dedupe concurrent starts or
    // a second caller can leave status stuck at 'starting' after 'running'.
    if (this.startPromise) return this.startPromise;
    const store = useVisionStore.getState();
    store.setStatus('starting');
    const wantId = deviceId ?? store.cameraId ?? undefined;
    this.startPromise = this.client
      .start(wantId) // onReady inside -> 'running'
      .catch(async (err) => {
        // A persisted cameraId can point at an unplugged camera — fall back
        // to the system default instead of wedging on 'error' forever.
        if (wantId && err instanceof DOMException && err.name === 'OverconstrainedError') {
          store.setCameraId(null);
          return this.client.start(undefined);
        }
        throw err;
      })
      .catch((err) => {
        store.setStatus('error', err instanceof Error ? err.message : 'Camera unavailable');
        throw err;
      })
      .finally(() => {
        this.startPromise = null;
      });
    return this.startPromise;
  }

  stop(): void {
    this.startPromise = null;
    this.client.stop();
    useVisionStore.getState().setStatus('idle');
  }

  /** Available video inputs — labels populate only after a camera grant. */
  async listCameras(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput');
  }

  /** Persist + hot-swap the camera; restarts the tracker when running. */
  async setCamera(id: string | null): Promise<void> {
    const store = useVisionStore.getState();
    store.setCameraId(id);
    if (store.status === 'running' || store.status === 'starting') {
      this.stop();
      await this.start();
    }
  }

  get videoElement(): HTMLVideoElement | null {
    return this.client.videoElement;
  }
}

export const browserTrackingSource = new BrowserTrackingSource();
