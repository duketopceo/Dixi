import React, { useRef, useEffect, useCallback } from 'react';
import { useTrackerVideoStream } from '../vision/useTrackerVideoStream';
import { useTrackingStore } from '../store/trackingStore';
import { useVisionStore } from '../vision/visionStore';
import { HAND_COLOR } from './canvasUtils';

// Hand skeleton connections for landmark overlay
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16],// ring
  [0, 17], [17, 18], [18, 19], [19, 20],// pinky
  [5, 9], [9, 13], [13, 17], [0, 17],   // palm
];

const WIDTH = 320;
const HEIGHT = 180;

/**
 * What the camera sees, with the tracked skeleton drawn on top.
 * Proof-of-recognition panel — the fastest way to debug tracking quality.
 */
export const CameraPreview: React.FC = () => {
  const visible = useVisionStore((s) => s.previewVisible);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stream = useTrackerVideoStream(visible);
  const tracking = useTrackingStore((s) => s.currentTracking);
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;

  // Rebind whenever the tracker's stream identity changes — a restart swaps
  // the stream, and latching the old one shows a frozen dead feed.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    if (v.srcObject !== stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
  }, [stream]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    for (const side of ['left', 'right'] as const) {
      const hand = trackingRef.current?.hands?.[side];
      if (!hand?.detected || !hand.landmarks) continue;
      const color = HAND_COLOR[side];

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      for (const [a, b] of BONES) {
        const pa = hand.landmarks[a];
        const pb = hand.landmarks[b];
        if (!pa || !pb) continue;
        ctx.beginPath();
        // mirror x to match the mirrored video preview
        ctx.moveTo((1 - pa.x) * WIDTH, pa.y * HEIGHT);
        ctx.lineTo((1 - pb.x) * WIDTH, pb.y * HEIGHT);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const lm of hand.landmarks) {
        ctx.beginPath();
        ctx.arc((1 - lm.x) * WIDTH, lm.y * HEIGHT, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // gesture label
      const tip = hand.landmarks[8];
      if (tip) {
        ctx.fillStyle = '#fff';
        ctx.font = '11px system-ui';
        ctx.fillText(hand.gesture, (1 - tip.x) * WIDTH + 8, tip.y * HEIGHT);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    let id: number;
    const loop = () => {
      draw();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
    // `draw` must not be a dep — tracking re-renders ~40x/s would cancel the
    // pending rAF every frame and the overlay would never paint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 70,
        right: 16,
        zIndex: 1700,
        width: WIDTH,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        background: '#000',
      }}
    >
      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 6,
            fontSize: 10,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'system-ui',
            textShadow: '0 1px 2px #000',
          }}
        >
          camera · skeleton overlay
        </div>
      </div>
    </div>
  );
};

export default CameraPreview;
