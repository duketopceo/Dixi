// Camera + inference engine. Runs MediaPipe GestureRecognizer on the main
// thread — a Worker was considered, but MediaPipe's WASM loader calls
// importScripts() internally, which ES-module workers forbid, and inference
// at native camera resolution is ~10ms/frame on modern hardware.
//
// One inference per animation frame; the rAF cadence provides natural
// backpressure. Timestamps feed VIDEO mode so MediaPipe tracks across frames.

import {
  FilesetResolver,
  GestureRecognizer,
  type GestureRecognizerResult,
} from '@mediapipe/tasks-vision';
import type { RawHandResult } from './types';

const WASM_BASE = '/wasm';
const MODEL_PATH = '/models/gesture_recognizer.task';
// Inference input width — MediaPipe scales internally, so feeding the
// full-res video element just wastes texture readback on every frame.
const INFER_WIDTH = 320;

export interface TrackerCallbacks {
  onReady?: () => void;
  onResult?: (hands: RawHandResult[], timestampMs: number, inferenceMs: number) => void;
  onError?: (message: string) => void;
}

export class TrackerClient {
  private recognizer: GestureRecognizer | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private frame: OffscreenCanvas | null = null;
  private frameCtx: OffscreenCanvasRenderingContext2D | null = null;
  private running = false;
  private rafId = 0;
  private callbacks: TrackerCallbacks;
  private frameCount = 0;
  private fpsWindowStart = 0;
  onFps?: (fps: number) => void;

  constructor(callbacks: TrackerCallbacks) {
    this.callbacks = callbacks;
  }

  /** Benchmark both delegates on a blank frame; keep the faster. */
  private async pickDelegate(): Promise<GestureRecognizer> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const opts = {
      runningMode: 'VIDEO' as const,
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    const bench = async (delegate: 'GPU' | 'CPU') => {
      try {
        const r = await GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          ...opts,
        });
        const blank = new OffscreenCanvas(160, 90);
        blank.getContext('2d');
        r.recognizeForVideo(blank, performance.now()); // warm
        const t0 = performance.now();
        for (let i = 0; i < 3; i++) r.recognizeForVideo(blank, t0 + i * 33);
        const ms = (performance.now() - t0) / 3;
        return { r, ms };
      } catch {
        return { r: null, ms: Infinity };
      }
    };

    // Sequential — parallel benches would contend on the main thread
    const cpu = await bench('CPU');
    const gpu = await bench('GPU');
    // GPU must beat CPU by a real margin — some platforms report GPU "working"
    // while running pathologically slow (Asahi ARM Chromium: 142ms vs 22ms)
    const winner = gpu.ms < cpu.ms * 0.85 ? gpu : cpu;
    const loser = winner === gpu ? cpu : gpu;
    loser.r?.close();
    return winner.r!;
  }

  async start(deviceId?: string): Promise<void> {
    if (this.running) return;

    if (!this.recognizer) {
      this.recognizer = await this.pickDelegate();
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    });

    this.video = document.createElement('video');
    this.video.srcObject = this.stream;
    this.video.playsInline = true;
    this.video.muted = true;
    await this.video.play();

    // Downscale target for inference
    const h = Math.round((INFER_WIDTH * this.video.videoHeight) / this.video.videoWidth);
    this.frame = new OffscreenCanvas(INFER_WIDTH, h);
    this.frameCtx = this.frame.getContext('2d');

    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__video = this.video;
    }

    this.running = true;
    this.fpsWindowStart = performance.now();
    this.callbacks.onReady?.();
    this.pump();
  }

  get videoElement(): HTMLVideoElement | null {
    return this.video;
  }

  private toRaw(result: GestureRecognizerResult): RawHandResult[] {
    const hands: RawHandResult[] = [];
    for (let i = 0; i < result.landmarks.length; i++) {
      hands.push({
        landmarks: result.landmarks[i].map((l) => ({ x: l.x, y: l.y, z: l.z })),
        worldLandmarks:
          result.worldLandmarks?.[i]?.map((l) => ({ x: l.x, y: l.y, z: l.z })) ?? [],
        handedness: result.handednesses?.[i]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right',
        cannedGesture: result.gestures?.[i]?.[0]?.categoryName ?? 'None',
        gestureScore: result.gestures?.[i]?.[0]?.score ?? 0,
      });
    }
    return hands;
  }

  private pump = (): void => {
    if (!this.running || !this.recognizer || !this.video) return;

    if (this.video.readyState >= 2 && this.frameCtx && this.frame) {
      const start = performance.now();
      try {
        this.frameCtx.drawImage(this.video, 0, 0, this.frame.width, this.frame.height);
        const result = this.recognizer.recognizeForVideo(this.frame, start);
        const inferenceMs = performance.now() - start;
        this.callbacks.onResult?.(this.toRaw(result), start, inferenceMs);
        this.frameCount++;
        if (performance.now() - this.fpsWindowStart >= 2000) {
          this.onFps?.((this.frameCount * 1000) / (performance.now() - this.fpsWindowStart));
          this.frameCount = 0;
          this.fpsWindowStart = performance.now();
        }
      } catch (err) {
        this.callbacks.onError?.(err instanceof Error ? err.message : String(err));
      }
    }

    this.rafId = requestAnimationFrame(this.pump);
  };

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video?.pause();
    this.video = null;
  }
}
