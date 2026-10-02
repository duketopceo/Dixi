import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTrackingStore, type HandData } from '../store/trackingStore';

interface Shape {
  id: string;
  type: 'circle' | 'square' | 'triangle';
  position: { x: number; y: number }; // [0,1] canvas space
  scale: number;
  color: string;
  pulse: number; // decays 1->0, visual hit feedback
}

const initialShapes: Shape[] = [
  { id: 'a', type: 'circle', position: { x: 0.3, y: 0.4 }, scale: 1, color: '#00F5FF', pulse: 0 },
  { id: 'b', type: 'square', position: { x: 0.5, y: 0.55 }, scale: 1, color: '#FF006E', pulse: 0 },
  { id: 'c', type: 'triangle', position: { x: 0.7, y: 0.35 }, scale: 1, color: '#00FF87', pulse: 0 },
];

export function normalizeCoordinate(raw: number): number {
  return Math.max(0, Math.min(1, (raw + 1) / 2));
}

const SHAPE_RADIUS = 0.07;
const GRAB_THRESHOLD = 0.1;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

interface HandCursor {
  pos: { x: number; y: number }; // [0,1] canvas
  pinching: boolean;
  side: 'left' | 'right';
}

function cursorOf(hand: HandData | null, side: 'left' | 'right'): HandCursor | null {
  if (!hand?.detected || !hand.position) return null;
  return {
    pos: {
      x: normalizeCoordinate(hand.position.x),
      y: normalizeCoordinate(hand.position.y),
    },
    pinching: hand.gesture === 'pinch',
    side,
  };
}

/**
 * Gesture-driven shapes: pinch to grab, second-hand pinch scales.
 * Position arrives in [-1,1] projector space via trackingStore — identical
 * to ProjectionShapes' contract, browser or server sourced.
 */
export const GestureShapes: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const tracking = useTrackingStore((s) => s.currentTracking);

  // interaction state lives in refs — updated per-frame without re-renders
  const grabbed = useRef<Map<string, 'left' | 'right'>>(new Map());
  const scaleStart = useRef<{ shapeId: string; handDist: number; scale: number } | null>(null);
  const lastPos = useRef<Map<'left' | 'right', { x: number; y: number }>>(new Map());
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  const left = cursorOf(tracking?.hands?.left ?? null, 'left');
  const right = cursorOf(tracking?.hands?.right ?? null, 'right');
  const cursors = [left, right].filter((c): c is HandCursor => c !== null);
  const cursorsRef = useRef<HandCursor[]>(cursors);
  cursorsRef.current = cursors;

  useEffect(() => {
    const current = shapesRef.current;

    // --- two-hand scale: both hands pinching, one shape grabbed ---
    const pinchingHands = cursors.filter((c) => c.pinching);
    if (pinchingHands.length === 2 && grabbed.current.size === 1) {
      const shapeId = [...grabbed.current.keys()][0];
      const shape = current.find((s) => s.id === shapeId);
      if (shape) {
        const handDist = dist(pinchingHands[0].pos, pinchingHands[1].pos);
        if (!scaleStart.current || scaleStart.current.shapeId !== shapeId) {
          scaleStart.current = { shapeId, handDist, scale: shape.scale };
        } else if (scaleStart.current.handDist > 0.01) {
          const ratio = handDist / scaleStart.current.handDist;
          const baseScale = scaleStart.current.scale; // updater runs later — capture now
          setShapes((prev) =>
            prev.map((s) =>
              s.id === shapeId
                ? { ...s, scale: Math.max(0.3, Math.min(3, baseScale * ratio)) }
                : s,
            ),
          );
        }
      }
    } else {
      scaleStart.current = null;
    }

    // --- single-hand pinch drag ---
    for (const cursor of cursors) {
      const side = cursor.side;
      const last = lastPos.current.get(side);

      if (cursor.pinching) {
        if (!grabbed.current.has(side)) {
          // grab nearest shape within threshold
          let best: Shape | null = null;
          let bestDist = GRAB_THRESHOLD;
          for (const s of current) {
            const d = dist(cursor.pos, s.position);
            if (d < bestDist && ![...grabbed.current.keys()].includes(s.id)) {
              bestDist = d;
              best = s;
            }
          }
          if (best) {
            grabbed.current.set(best.id, side);
            setShapes((prev) =>
              prev.map((s) => (s.id === best!.id ? { ...s, pulse: 1 } : s)),
            );
          }
        }

        // drag: move shape by cursor delta
        const shapeId = [...grabbed.current.entries()].find(([, s]) => s === side)?.[0];
        if (shapeId && last) {
          const dx = cursor.pos.x - last.x;
          const dy = cursor.pos.y - last.y;
          setShapes((prev) =>
            prev.map((s) =>
              s.id === shapeId
                ? {
                    ...s,
                    position: {
                      x: Math.max(0, Math.min(1, s.position.x + dx)),
                      y: Math.max(0, Math.min(1, s.position.y + dy)),
                    },
                  }
                : s,
            ),
          );
        }
      } else {
        // released
        for (const [shapeId, s] of [...grabbed.current.entries()]) {
          if (s === side) grabbed.current.delete(shapeId);
        }
      }

      lastPos.current.set(side, cursor.pos);
    }

    // hand disappeared entirely -> release its grabs
    for (const side of ['left', 'right'] as const) {
      if (!cursors.some((c) => c.side === side)) {
        for (const [shapeId, s] of [...grabbed.current.entries()]) {
          if (s === side) grabbed.current.delete(shapeId);
        }
        lastPos.current.delete(side);
      }
    }
  }, [tracking, cursors]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grabbedIds = new Set(grabbed.current.keys());

    for (const shape of shapesRef.current) {
      const x = shape.position.x * canvas.width;
      const y = shape.position.y * canvas.height;
      const r = SHAPE_RADIUS * Math.min(canvas.width, canvas.height) * shape.scale;
      const isGrabbed = grabbedIds.has(shape.id);

      ctx.save();
      if (isGrabbed || shape.pulse > 0.05) {
        const glow = isGrabbed ? 1 : shape.pulse;
        ctx.shadowColor = shape.color;
        ctx.shadowBlur = 30 * glow;
      }
      ctx.fillStyle = shape.color;
      ctx.strokeStyle = isGrabbed ? '#fff' : shape.color;
      ctx.lineWidth = isGrabbed ? 4 : 2;
      ctx.beginPath();
      switch (shape.type) {
        case 'circle':
          ctx.arc(x, y, r, 0, Math.PI * 2);
          break;
        case 'square':
          ctx.rect(x - r, y - r, r * 2, r * 2);
          break;
        case 'triangle':
          ctx.moveTo(x, y - r);
          ctx.lineTo(x + r, y + r);
          ctx.lineTo(x - r, y + r);
          ctx.closePath();
          break;
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // cursors
    for (const cursor of cursorsRef.current) {
      const cx = cursor.pos.x * canvas.width;
      const cy = cursor.pos.y * canvas.height;
      ctx.beginPath();
      ctx.arc(cx, cy, cursor.pinching ? 16 : 10, 0, Math.PI * 2);
      ctx.fillStyle = cursor.pinching
        ? 'rgba(255,255,255,0.9)'
        : 'rgba(255,255,255,0.4)';
      ctx.fill();
      ctx.strokeStyle = cursor.side === 'right' ? '#00F5FF' : '#FF006E';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Pinch to grab • pinch with both hands to scale', 20, canvas.height - 20);
    // reads via refs — this closure mounts once and must not go stale
  }, []);

  useEffect(() => {
    let id: number;
    const loop = () => {
      // decay pulse
      setShapes((prev) =>
        prev.some((s) => s.pulse > 0.01)
          ? prev.map((s) => ({ ...s, pulse: Math.max(0, s.pulse - 0.04) }))
          : prev,
      );
      draw();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
    // run once: depending on `draw` means every tracking-store re-render cancels
    // the pending rAF before it fires — the loop starves and never paints
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

export default GestureShapes;
