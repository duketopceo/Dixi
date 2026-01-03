/**
 * ProjectorCanvas - Fullscreen canvas for projector display
 * 
 * Renders interactive shapes that can be controlled via hand gestures
 * detected by the vision service. Supports drag and scale operations.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useProjectorGesture } from '../../hooks/useProjectorGesture';
import { useProjectorCalibration } from '../../hooks/useProjectorCalibration';
import './ProjectorCanvas.css';

// Shape types that can be rendered on the projector
interface ProjectorShape {
  id: string;
  type: 'circle' | 'square' | 'triangle';
  x: number;  // 0-1 normalized
  y: number;  // 0-1 normalized
  scale: number;
  color: string;
  isDragging: boolean;
}

// Initial shapes for the demo
const DEFAULT_SHAPES: ProjectorShape[] = [
  {
    id: 'shape-1',
    type: 'circle',
    x: 0.3,
    y: 0.5,
    scale: 1.0,
    color: '#00F5FF',
    isDragging: false
  },
  {
    id: 'shape-2',
    type: 'square',
    x: 0.7,
    y: 0.5,
    scale: 1.0,
    color: '#FF006E',
    isDragging: false
  }
];

const ProjectorCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<ProjectorShape[]>(DEFAULT_SHAPES);
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);
  const [wasPinching, setWasPinching] = useState(false);
  
  // Get projector gesture data from WebSocket
  const gesture = useProjectorGesture();
  
  // Get calibration status
  const { calibrated, error: calibrationError, loading: calibrationLoading } = useProjectorCalibration();
  
  // Shape size in pixels (base size before scale)
  const BASE_SHAPE_SIZE = 80;

  // Check if a point is inside a shape (hit test)
  const getShapeAtPoint = useCallback((x: number, y: number, canvas: HTMLCanvasElement): ProjectorShape | null => {
    // Check shapes in reverse order (top-most first)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const shapeX = shape.x * canvas.width;
      const shapeY = shape.y * canvas.height;
      const size = BASE_SHAPE_SIZE * shape.scale;
      
      const distance = Math.sqrt(
        Math.pow(x * canvas.width - shapeX, 2) + 
        Math.pow(y * canvas.height - shapeY, 2)
      );
      
      if (distance < size) {
        return shape;
      }
    }
    return null;
  }, [shapes]);

  // Handle gesture updates
  useEffect(() => {
    if (!gesture || !canvasRef.current) return;
    
    const { x, y, isPinching } = gesture;
    
    // If started pinching
    if (isPinching && !wasPinching) {
      // Check if we're over a shape
      const hitShape = getShapeAtPoint(x, y, canvasRef.current);
      if (hitShape) {
        setActiveShapeId(hitShape.id);
        setShapes(prev => prev.map(s => 
          s.id === hitShape.id ? { ...s, isDragging: true } : s
        ));
      }
    }
    
    // If currently pinching and have an active shape, drag it
    if (isPinching && activeShapeId) {
      setShapes(prev => prev.map(s => 
        s.id === activeShapeId ? { ...s, x, y } : s
      ));
    }
    
    // If released pinch
    if (!isPinching && wasPinching) {
      setShapes(prev => prev.map(s => ({ ...s, isDragging: false })));
      setActiveShapeId(null);
    }
    
    setWasPinching(isPinching);
  }, [gesture, wasPinching, activeShapeId, getShapeAtPoint]);

  // Draw shapes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw each shape
    shapes.forEach(shape => {
      const x = shape.x * canvas.width;
      const y = shape.y * canvas.height;
      const size = BASE_SHAPE_SIZE * shape.scale;
      
      ctx.save();
      
      // Set style
      ctx.fillStyle = shape.color;
      ctx.strokeStyle = shape.isDragging ? '#FFFFFF' : shape.color;
      ctx.lineWidth = shape.isDragging ? 4 : 2;
      ctx.globalAlpha = shape.isDragging ? 1.0 : 0.8;
      
      // Add glow effect for dragging shapes
      if (shape.isDragging) {
        ctx.shadowColor = shape.color;
        ctx.shadowBlur = 20;
      }
      
      switch (shape.type) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
          
        case 'square':
          ctx.fillRect(x - size, y - size, size * 2, size * 2);
          ctx.strokeRect(x - size, y - size, size * 2, size * 2);
          break;
          
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y + size);
          ctx.lineTo(x - size, y + size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
      }
      
      ctx.restore();
    });
    
    // Draw cursor if gesture detected
    if (gesture && calibrated) {
      const cursorX = gesture.x * canvas.width;
      const cursorY = gesture.y * canvas.height;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, gesture.isPinching ? 20 : 10, 0, Math.PI * 2);
      ctx.fillStyle = gesture.isPinching ? '#00FF00' : '#FFFFFF';
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.restore();
    }
  }, [shapes, gesture, calibrated]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="projector-canvas-container">
      {/* Status banners */}
      {!calibrated && !calibrationLoading && (
        <div className="projector-status-banner warning">
          ⚠️ Projector not calibrated
          <span className="banner-subtitle">
            Run calibration to enable gesture control
          </span>
        </div>
      )}
      
      {calibrationLoading && (
        <div className="projector-status-banner loading">
          ⏳ Checking calibration...
        </div>
      )}
      
      {calibrationError && (
        <div className="projector-status-banner error">
          ❌ {calibrationError}
        </div>
      )}
      
      {!gesture && calibrated && (
        <div className="projector-status-banner offline">
          📡 Tracking offline
          <span className="banner-subtitle">
            Waiting for vision service...
          </span>
        </div>
      )}
      
      {/* Main canvas */}
      <canvas 
        ref={canvasRef}
        className="projector-canvas"
      />
      
      {/* Debug info (only in development) */}
      {import.meta.env.DEV && (
        <div className="projector-debug-info">
          <div>Calibrated: {calibrated ? '✓' : '✗'}</div>
          {gesture && (
            <>
              <div>X: {gesture.x.toFixed(3)}</div>
              <div>Y: {gesture.y.toFixed(3)}</div>
              <div>Pinching: {gesture.isPinching ? '✓' : '✗'}</div>
            </>
          )}
          <div>Active: {activeShapeId || 'none'}</div>
        </div>
      )}
    </div>
  );
};

export default ProjectorCanvas;
