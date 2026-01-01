import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTrackingStore } from '../store/trackingStore';

// Shape interface
interface Shape {
  id: string;
  type: 'circle' | 'square' | 'triangle';
  position: { x: number; y: number }; // [0, 1] normalized
  scale: number;
  color: string;
}

// Initial shapes to render
const initialShapes: Shape[] = [
  { id: 'shape-1', type: 'circle', position: { x: 0.3, y: 0.4 }, scale: 1, color: '#00F5FF' },
  { id: 'shape-2', type: 'square', position: { x: 0.5, y: 0.5 }, scale: 1, color: '#FF006E' },
  { id: 'shape-3', type: 'triangle', position: { x: 0.7, y: 0.6 }, scale: 1, color: '#00FF87' },
];

// Convert vision service [-1, 1] range to [0, 1]
export function normalizeCoordinate(raw: number): number {
  return Math.max(0, Math.min(1, (raw + 1) / 2));
}

// Calculate distance between two points
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Shape size in normalized units
const SHAPE_SIZE = 0.08;
// Drag threshold - how close hand must be to grab shape
const DRAG_THRESHOLD = 0.12;

export const ProjectionShapes: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const [draggedShapeId, setDraggedShapeId] = useState<string | null>(null);
  const [lastHandPos, setLastHandPos] = useState<{ x: number; y: number } | null>(null);

  // Get tracking data from store
  const tracking = useTrackingStore((state) => state.currentTracking);

  // Extract hand data (prefer right hand, fallback to left)
  const hand = tracking?.hands?.right?.detected
    ? tracking.hands.right
    : tracking?.hands?.left?.detected
    ? tracking.hands.left
    : null;

  const isPinching = hand?.gesture === 'pinch';
  const handPos = hand?.position
    ? {
        x: normalizeCoordinate(hand.position.x),
        y: normalizeCoordinate(hand.position.y),
      }
    : null;

  // Handle shape dragging
  useEffect(() => {
    if (!handPos) {
      // No hand detected, release any dragged shape
      if (draggedShapeId) {
        setDraggedShapeId(null);
      }
      return;
    }

    if (isPinching) {
      if (!draggedShapeId) {
        // Not currently dragging - check if we should start
        // Find the nearest shape within threshold
        let nearestShape: Shape | null = null;
        let nearestDist = Infinity;

        for (const shape of shapes) {
          const dist = distance(handPos, shape.position);
          if (dist < nearestDist && dist < DRAG_THRESHOLD) {
            nearestDist = dist;
            nearestShape = shape;
          }
        }

        if (nearestShape) {
          setDraggedShapeId(nearestShape.id);
          setLastHandPos(handPos);
        }
      } else {
        // Currently dragging - update position
        if (lastHandPos) {
          const dx = handPos.x - lastHandPos.x;
          const dy = handPos.y - lastHandPos.y;

          setShapes((prevShapes) =>
            prevShapes.map((shape) =>
              shape.id === draggedShapeId
                ? {
                    ...shape,
                    position: {
                      x: Math.max(0, Math.min(1, shape.position.x + dx)),
                      y: Math.max(0, Math.min(1, shape.position.y + dy)),
                    },
                  }
                : shape
            )
          );
        }
        setLastHandPos(handPos);
      }
    } else {
      // Not pinching - release
      if (draggedShapeId) {
        setDraggedShapeId(null);
        setLastHandPos(null);
      }
    }
  }, [handPos, isPinching, draggedShapeId, lastHandPos, shapes]);

  // Draw shapes on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fill the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each shape
    for (const shape of shapes) {
      const x = shape.position.x * canvas.width;
      const y = shape.position.y * canvas.height;
      const size = SHAPE_SIZE * Math.min(canvas.width, canvas.height) * shape.scale;

      ctx.fillStyle = shape.color;
      ctx.strokeStyle = draggedShapeId === shape.id ? '#FFFFFF' : shape.color;
      ctx.lineWidth = draggedShapeId === shape.id ? 4 : 2;

      ctx.beginPath();

      switch (shape.type) {
        case 'circle':
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          break;
        case 'square':
          ctx.rect(x - size / 2, y - size / 2, size, size);
          break;
        case 'triangle':
          ctx.moveTo(x, y - size / 2);
          ctx.lineTo(x + size / 2, y + size / 2);
          ctx.lineTo(x - size / 2, y + size / 2);
          ctx.closePath();
          break;
      }

      ctx.fill();
      ctx.stroke();

      // Add glow effect for dragged shape
      if (draggedShapeId === shape.id) {
        ctx.shadowColor = shape.color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw hand cursor if available
    if (handPos) {
      const hx = handPos.x * canvas.width;
      const hy = handPos.y * canvas.height;

      ctx.beginPath();
      ctx.arc(hx, hy, isPinching ? 15 : 10, 0, Math.PI * 2);
      ctx.fillStyle = isPinching ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // Draw connection line when dragging
      if (draggedShapeId) {
        const draggedShape = shapes.find((s) => s.id === draggedShapeId);
        if (draggedShape) {
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(
            draggedShape.position.x * canvas.width,
            draggedShape.position.y * canvas.height
          );
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw instructions in corner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Pinch near a shape to grab and move it', 20, canvas.height - 20);
  }, [shapes, handPos, isPinching, draggedShapeId]);

  // Animation loop
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [draw]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      draw();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        cursor: 'none',
      }}
    />
  );
};

export default ProjectionShapes;
