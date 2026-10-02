// Web Worker: runs MediaPipe GestureRecognizer off the main thread.
// Loads the WASM runtime + vendored .task model, then recognizes frames as
// they arrive. One frame in flight — the client enforces backpressure.

import {
  FilesetResolver,
  GestureRecognizer,
  type GestureRecognizerResult,
} from '@mediapipe/tasks-vision';
import type { RawHandResult, WorkerInMessage, WorkerOutMessage } from './types';

const WASM_BASE = '/wasm';
const MODEL_PATH = '/models/gesture_recognizer.task';

let recognizer: GestureRecognizer | null = null;
let busy = false;

function post(msg: WorkerOutMessage, transfer?: Transferable[]): void {
  (self as unknown as Worker).postMessage(msg, { transfer });
}

async function init(): Promise<void> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const baseOptions = { modelAssetPath: MODEL_PATH };
  const opts = {
    runningMode: 'VIDEO' as const,
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
  try {
    recognizer = await GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { ...baseOptions, delegate: 'GPU' },
      ...opts,
    });
  } catch {
    // GPU delegate unavailable in some worker contexts — fall back to CPU
    recognizer = await GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { ...baseOptions, delegate: 'CPU' },
      ...opts,
    });
  }
}

function toRaw(result: GestureRecognizerResult): RawHandResult[] {
  const hands: RawHandResult[] = [];
  for (let i = 0; i < result.landmarks.length; i++) {
    const handedness = result.handednesses?.[i]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right';
    hands.push({
      landmarks: result.landmarks[i].map((l) => ({ x: l.x, y: l.y, z: l.z })),
      worldLandmarks:
        result.worldLandmarks?.[i]?.map((l) => ({ x: l.x, y: l.y, z: l.z })) ?? [],
      handedness,
      cannedGesture: result.gestures?.[i]?.[0]?.categoryName ?? 'None',
      gestureScore: result.gestures?.[i]?.[0]?.score ?? 0,
    });
  }
  return hands;
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  if (msg.type === 'dispose') {
    recognizer?.close();
    recognizer = null;
    return;
  }

  if (msg.type !== 'frame' || busy) {
    msg.bitmap.close();
    return;
  }

  try {
    if (!recognizer) {
      await init();
      post({ type: 'ready' });
    }
    busy = true;
    const start = performance.now();
    const result = recognizer!.recognizeForVideo(msg.bitmap, msg.timestampMs);
    const inferenceMs = performance.now() - start;
    post({ type: 'result', hands: toRaw(result), timestampMs: msg.timestampMs, inferenceMs });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  } finally {
    busy = false;
    msg.bitmap.close();
  }
};

export {};
