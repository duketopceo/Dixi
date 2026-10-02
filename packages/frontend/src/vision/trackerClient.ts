// Main-thread client for the tracker worker.
// Owns getUserMedia, captures frames as ImageBitmaps, and enforces
// backpressure (never more than one frame in flight — stale frames drop).

import type { RawHandResult, WorkerOutMessage } from './types';

export interface TrackerCallbacks {
  onReady?: () => void;
  onResult?: (hands: RawHandResult[], timestampMs: number, inferenceMs: number) => void;
  onError?: (message: string) => void;
}

export class TrackerClient {
  private worker: Worker | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private inflight = false;
  private running = false;
  private rafId = 0;
  private callbacks: TrackerCallbacks;
  private frameCount = 0;
  private fpsWindowStart = 0;
  onFps?: (fps: number) => void;

  constructor(callbacks: TrackerCallbacks) {
    this.callbacks = callbacks;
  }

  async start(deviceId?: string): Promise<void> {
    if (this.running) return;

    this.worker = new Worker(new URL('./trackerWorker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => this.handleMessage(e.data);
    this.worker.onerror = (e) => this.callbacks.onError?.(e.message);

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

    this.running = true;
    this.fpsWindowStart = performance.now();
    this.pump();
  }

  get videoElement(): HTMLVideoElement | null {
    return this.video;
  }

  get ready(): boolean {
    return this.running && !this.inflight;
  }

  private handleMessage(msg: WorkerOutMessage): void {
    switch (msg.type) {
      case 'ready':
        this.callbacks.onReady?.();
        break;
      case 'result':
        this.inflight = false;
        this.callbacks.onResult?.(msg.hands, msg.timestampMs, msg.inferenceMs);
        this.frameCount++;
        const now = performance.now();
        if (now - this.fpsWindowStart >= 2000) {
          this.onFps?.((this.frameCount * 1000) / (now - this.fpsWindowStart));
          this.frameCount = 0;
          this.fpsWindowStart = now;
        }
        break;
      case 'error':
        this.inflight = false;
        this.callbacks.onError?.(msg.message);
        break;
    }
  }

  private pump = (): void => {
    if (!this.running) return;
    if (!this.inflight && this.video && this.video.readyState >= 2) {
      this.inflight = true;
      // 320px wide is enough for hand tracking and ~4x cheaper to transfer
      createImageBitmap(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight, {
        resizeWidth: 320,
        resizeHeight: Math.round((320 * this.video.videoHeight) / this.video.videoWidth),
      })
        .then((bitmap) => {
          if (!this.running) {
            bitmap.close();
            return;
          }
          this.worker!.postMessage(
            { type: 'frame', bitmap, timestampMs: performance.now() },
            [bitmap],
          );
        })
        .catch(() => {
          this.inflight = false;
        });
    }
    this.rafId = requestAnimationFrame(this.pump);
  };

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.worker?.postMessage({ type: 'dispose' });
    this.worker?.terminate();
    this.worker = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video?.pause();
    this.video = null;
    this.inflight = false;
  }
}
