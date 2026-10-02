import React, { useRef, useEffect, useCallback } from 'react';
import { useTrackingStore } from '../store/trackingStore';

interface Stroke {
  color: string;
  width: number;
  points: { x: number; y: number }[]; // [0,1] canvas space
}

const HAND_COLOR: Record<'left' | 'right', string> = {
  right: '#00F5FF',
  left: '#FF006E',
};

const norm = (v: number) => Math.max(0, Math.min(1, (v + 1) / 2));

/**
 * Draw with your index finger: pinch closes the pen, open palm lifts it,
 * closed fist clears the canvas.
 */
export const DrawScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const active = useRef<Map<'left' | 'right', Stroke>>(new Map());
  const tracking = useTrackingStore((s) => s.currentTracking);
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;

  // mutate stroke state from tracking updates
  useEffect(() => {
    const hands = tracking?.hands;
    for (const side of ['left', 'right'] as const) {
      const hand = hands?.[side];
      if (!hand?.detected || !hand.position) {
        active.current.delete(side);
        continue;
      }
      const pos = { x: norm(hand.position.x), y: norm(hand.position.y) };

      if (hand.gesture === 'closed_fist') {
        strokes.current = [];
        active.current.clear();
        continue;
      }

      if (hand.gesture === 'pinch') {
        let stroke = active.current.get(side);
        if (!stroke) {
          stroke = { color: HAND_COLOR[side], width: 6, points: [pos] };
          active.current.set(side, stroke);
          strokes.current.push(stroke);
        } else {
          const last = stroke.points[stroke.points.length - 1];
          // skip micro-jitter (< 2px on a 1080p canvas)
          if (Math.hypot(pos.x - last.x, pos.y - last.y) > 0.002) {
            stroke.points.push(pos);
          }
        }
      } else {
        active.current.delete(side);
      }
    }
  }, [tracking]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokes.current) {
      if (stroke.points.length < 2) {
        // single tap dot
        const p = stroke.points[0];
        if (p) {
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, stroke.width / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.color;
          ctx.fill();
        }
        continue;
      }
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = 8;
      for (let i = 0; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        if (i === 0) ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
        else ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // hand cursors
    const hands = trackingRef.current?.hands;
    for (const side of ['left', 'right'] as const) {
      const hand = hands?.[side];
      if (!hand?.detected || !hand.position) continue;
      const x = norm(hand.position.x) * canvas.width;
      const y = norm(hand.position.y) * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, hand.gesture === 'pinch' ? 12 : 8, 0, Math.PI * 2);
      ctx.fillStyle =
        hand.gesture === 'pinch' ? HAND_COLOR[side] : 'rgba(255,255,255,0.35)';
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Pinch = pen down • open hand = lift • fist = clear', 20, canvas.height - 20);
  }, []);

  useEffect(() => {
    let id: number;
    const loop = () => {
      draw();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
    // run once — a `draw` dep here starves the rAF loop (tracking re-renders
    // cancel the pending frame before it can paint)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        cursor: 'none',
        pointerEvents: 'none',
      }}
    />
  );
};

export default DrawScene;
