// TrackerClient lifecycle: generation-serialized start/stop must never
// resurrect a stopped tracker, leak camera tracks, or run a dead pump.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackerClient } from '../trackerClient';

// --- MediaPipe mocks ------------------------------------------------------

const recognizeForVideo = vi.fn();
const recognizerInstances: { close: ReturnType<typeof vi.fn> }[] = [];

function makeRecognizer() {
  const r = {
    recognizeForVideo,
    close: vi.fn(),
  };
  recognizerInstances.push(r);
  return r;
}

let delegateFailures: Record<'GPU' | 'CPU', boolean> = { GPU: false, CPU: false };

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn(async () => ({})),
  },
  GestureRecognizer: {
    createFromOptions: vi.fn(async (_fileset: unknown, opts: { baseOptions: { delegate: 'GPU' | 'CPU' } }) => {
      if (delegateFailures[opts.baseOptions.delegate]) throw new Error('delegate init failed');
      return makeRecognizer();
    }),
  },
}));

// --- Browser API mocks -----------------------------------------------------

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>;
}
const tracksByStream = new WeakMap<object, FakeTrack[]>();
let lastStream: { getTracks: () => FakeTrack[] } | null = null;

function makeStream() {
  const tracks: FakeTrack[] = [{ stop: vi.fn() }];
  const stream = { getTracks: () => tracks };
  tracksByStream.set(stream, tracks);
  lastStream = stream;
  return stream as unknown as MediaStream;
}

class FakeOffscreenCanvas {
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
  getContext() {
    return { drawImage: vi.fn() };
  }
}

let rafCallback: FrameRequestCallback | null = null;
let gumReject: Error | null = null;

function stepFrames(n: number) {
  for (let i = 0; i < n; i++) {
    const cb = rafCallback;
    rafCallback = null;
    cb?.(performance.now());
  }
}

describe('TrackerClient lifecycle', () => {
  let onReady: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let onResult: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    delegateFailures = { GPU: false, CPU: false };
    gumReject = null;
    lastStream = null;
    rafCallback = null;
    recognizerInstances.length = 0;
    recognizeForVideo.mockReset();
    recognizeForVideo.mockReturnValue({ landmarks: [], handednesses: [], gestures: [] });

    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    Object.defineProperty(window.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(async () => {
          if (gumReject) throw gumReject;
          return makeStream();
        }),
      },
      configurable: true,
    });

    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { value: 480, configurable: true });
    Object.defineProperty(HTMLVideoElement.prototype, 'readyState', { value: 4, configurable: true });

    onReady = vi.fn();
    onError = vi.fn();
    onResult = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const makeClient = () => new TrackerClient({ onReady, onResult, onError });

  it('runs one pump after start and reports results', async () => {
    const client = makeClient();
    await client.start();
    expect(onReady).toHaveBeenCalledTimes(1);
    stepFrames(2);
    expect(onResult).toHaveBeenCalled();
  });

  it('stop() during startup aborts the in-flight start — no resurrection', async () => {
    const client = makeClient();
    const p = client.start();
    client.stop();
    await p;
    expect(onReady).not.toHaveBeenCalled();
    stepFrames(3);
    expect(onResult).not.toHaveBeenCalled();
  });

  it('stop() mid-start stops camera tracks acquired by the stale start', async () => {
    const client = makeClient();
    const p = client.start();
    client.stop();
    await p;
    // The stale start may have acquired a stream before noticing the
    // generation bump — whatever it grabbed must be stopped.
    const tracks = lastStream ? tracksByStream.get(lastStream) ?? [] : [];
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  });

  it('start → stop → start ends with exactly one live tracker', async () => {
    const client = makeClient();
    const p1 = client.start();
    client.stop();
    await p1;
    await client.start();
    expect(onReady).toHaveBeenCalledTimes(1);
    stepFrames(2);
    expect(onResult).toHaveBeenCalled();
    // only the second start's stream should be live
    const tracks = tracksByStream.get(lastStream!)!;
    for (const t of tracks) expect(t.stop).not.toHaveBeenCalled();
  });

  it('concurrent starts share one recognizer and only the newest survives', async () => {
    const client = makeClient();
    await Promise.all([client.start(), client.start()]);
    // two concurrent starts: the stale one aborts before acquiring a stream
    expect(onReady).toHaveBeenCalledTimes(1);
    stepFrames(1);
    expect(onResult).toHaveBeenCalled();
  });

  it('rejects when both delegates fail — never reports ready with a dead pump', async () => {
    delegateFailures = { GPU: true, CPU: true };
    const client = makeClient();
    await expect(client.start()).rejects.toThrow(/no usable/);
    expect(onReady).not.toHaveBeenCalled();
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('rejects on camera denial without leaving a stream', async () => {
    gumReject = new DOMException('denied', 'NotAllowedError');
    const client = makeClient();
    await expect(client.start()).rejects.toThrow('denied');
    expect(onReady).not.toHaveBeenCalled();
  });

  it('halts after 30 consecutive pump failures and reports a single error', async () => {
    const client = makeClient();
    await client.start();
    recognizeForVideo.mockImplementation(() => {
      throw new Error('wasm exploded');
    });
    stepFrames(40);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('halted'));
    // tracker stopped itself — no more frames are pumped
    stepFrames(5);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('tolerates transient pump errors without escalating to error state', async () => {
    const client = makeClient();
    await client.start();
    recognizeForVideo
      .mockImplementationOnce(() => { throw new Error('flaky'); })
      .mockReturnValue({ landmarks: [], handednesses: [], gestures: [] });
    stepFrames(5);
    expect(onError).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalled();
  });
});
