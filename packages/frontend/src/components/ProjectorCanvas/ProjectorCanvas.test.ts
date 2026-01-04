/**
 * Tests for ProjectorCanvas shape controller logic
 */

import { describe, it, expect, beforeEach } from 'vitest';

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

interface ProjectorGestureData {
  x: number;
  y: number;
  isPinching: boolean;
  gestureType: string;
  confidence: number;
  timestamp: number;
}

// Shape controller logic extracted from ProjectorCanvas for testing
class ShapeController {
  shapes: ProjectorShape[];
  activeShapeId: string | null = null;
  wasPinching: boolean = false;
  shapeSize: number = 80; // Base size in pixels
  canvasWidth: number = 1920;
  canvasHeight: number = 1080;

  constructor(initialShapes: ProjectorShape[] = []) {
    this.shapes = initialShapes;
  }

  getShapeAtPoint(x: number, y: number): ProjectorShape | null {
    // Check shapes in reverse order (top-most first)
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      const shapeX = shape.x * this.canvasWidth;
      const shapeY = shape.y * this.canvasHeight;
      const size = this.shapeSize * shape.scale;
      
      const distance = Math.sqrt(
        Math.pow(x * this.canvasWidth - shapeX, 2) + 
        Math.pow(y * this.canvasHeight - shapeY, 2)
      );
      
      if (distance < size) {
        return shape;
      }
    }
    return null;
  }

  handleGesture(gesture: ProjectorGestureData | null): void {
    if (!gesture) {
      // No gesture - reset drag state
      this.shapes = this.shapes.map(s => ({ ...s, isDragging: false }));
      this.activeShapeId = null;
      this.wasPinching = false;
      return;
    }

    const { x, y, isPinching } = gesture;

    // Started pinching
    if (isPinching && !this.wasPinching) {
      const hitShape = this.getShapeAtPoint(x, y);
      if (hitShape) {
        this.activeShapeId = hitShape.id;
        this.shapes = this.shapes.map(s =>
          s.id === hitShape.id ? { ...s, isDragging: true } : s
        );
      }
    }

    // Currently dragging
    if (isPinching && this.activeShapeId) {
      this.shapes = this.shapes.map(s =>
        s.id === this.activeShapeId ? { ...s, x, y } : s
      );
    }

    // Released pinch
    if (!isPinching && this.wasPinching) {
      this.shapes = this.shapes.map(s => ({ ...s, isDragging: false }));
      this.activeShapeId = null;
    }

    this.wasPinching = isPinching;
  }

  getShape(id: string): ProjectorShape | undefined {
    return this.shapes.find(s => s.id === id);
  }
}

describe('ShapeController', () => {
  let controller: ShapeController;
  const testShapes: ProjectorShape[] = [
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

  beforeEach(() => {
    controller = new ShapeController([...testShapes.map(s => ({ ...s }))]);
  });

  describe('getShapeAtPoint', () => {
    it('should return shape when point is inside', () => {
      const shape = controller.getShapeAtPoint(0.3, 0.5);
      expect(shape).not.toBeNull();
      expect(shape?.id).toBe('shape-1');
    });

    it('should return null when point is outside all shapes', () => {
      const shape = controller.getShapeAtPoint(0.1, 0.1);
      expect(shape).toBeNull();
    });

    it('should return topmost shape when overlapping', () => {
      // Add overlapping shape on top
      controller.shapes.push({
        id: 'shape-3',
        type: 'triangle',
        x: 0.3,
        y: 0.5,
        scale: 0.5,
        color: '#FFFFFF',
        isDragging: false
      });

      const shape = controller.getShapeAtPoint(0.3, 0.5);
      expect(shape?.id).toBe('shape-3'); // Should return the last (topmost) shape
    });
  });

  describe('handleGesture', () => {
    it('should start dragging when pinch starts over shape', () => {
      const gesture: ProjectorGestureData = {
        x: 0.3,
        y: 0.5,
        isPinching: true,
        gestureType: 'pinch',
        confidence: 0.9,
        timestamp: Date.now()
      };

      controller.handleGesture(gesture);

      expect(controller.activeShapeId).toBe('shape-1');
      expect(controller.getShape('shape-1')?.isDragging).toBe(true);
    });

    it('should not start dragging when pinch starts outside shapes', () => {
      const gesture: ProjectorGestureData = {
        x: 0.1,
        y: 0.1,
        isPinching: true,
        gestureType: 'pinch',
        confidence: 0.9,
        timestamp: Date.now()
      };

      controller.handleGesture(gesture);

      expect(controller.activeShapeId).toBeNull();
      expect(controller.shapes.every(s => !s.isDragging)).toBe(true);
    });

    it('should move shape while dragging', () => {
      // Start drag
      controller.handleGesture({
        x: 0.3,
        y: 0.5,
        isPinching: true,
        gestureType: 'pinch',
        confidence: 0.9,
        timestamp: Date.now()
      });

      // Move
      controller.handleGesture({
        x: 0.5,
        y: 0.6,
        isPinching: true,
        gestureType: 'pinch',
        confidence: 0.9,
        timestamp: Date.now()
      });

      const shape = controller.getShape('shape-1');
      expect(shape?.x).toBe(0.5);
      expect(shape?.y).toBe(0.6);
    });

    it('should stop dragging when pinch releases', () => {
      // Start drag
      controller.handleGesture({
        x: 0.3,
        y: 0.5,
        isPinching: true,
        gestureType: 'pinch',
        confidence: 0.9,
        timestamp: Date.now()
      });

      expect(controller.activeShapeId).toBe('shape-1');

      // Release
      controller.handleGesture({
        x: 0.4,
        y: 0.5,
        isPinching: false,
        gestureType: 'point',
        confidence: 0.9,
        timestamp: Date.now()
      });

      expect(controller.activeShapeId).toBeNull();
      expect(controller.getShape('shape-1')?.isDragging).toBe(false);
    });

    it('should reset all dragging when gesture is null', () => {
      // Start drag
      controller.handleGesture({
        x: 0.3,
        y: 0.5,
        isPinching: true,
        gestureType: 'pinch',
        confidence: 0.9,
        timestamp: Date.now()
      });

      // Null gesture (hand lost)
      controller.handleGesture(null);

      expect(controller.activeShapeId).toBeNull();
      expect(controller.shapes.every(s => !s.isDragging)).toBe(true);
      expect(controller.wasPinching).toBe(false);
    });

    it('should not move other shapes while dragging one', () => {
      const originalShape2Position = { x: 0.7, y: 0.5 };

      // Start drag on shape-1
      controller.handleGesture({
        x: 0.3,
        y: 0.5,
        isPinching: true,
        gestureType: 'pinch',
        confidence: 0.9,
        timestamp: Date.now()
      });

      // Move
      controller.handleGesture({
        x: 0.5,
        y: 0.6,
        isPinching: true,
        gestureType: 'pinch',
        confidence: 0.9,
        timestamp: Date.now()
      });

      const shape2 = controller.getShape('shape-2');
      expect(shape2?.x).toBe(originalShape2Position.x);
      expect(shape2?.y).toBe(originalShape2Position.y);
    });
  });

  describe('gesture sequence', () => {
    it('should handle complete drag operation', () => {
      const gestures: (ProjectorGestureData | null)[] = [
        // Point at shape
        { x: 0.3, y: 0.5, isPinching: false, gestureType: 'point', confidence: 0.9, timestamp: 1 },
        // Start pinch
        { x: 0.3, y: 0.5, isPinching: true, gestureType: 'pinch', confidence: 0.9, timestamp: 2 },
        // Drag
        { x: 0.35, y: 0.55, isPinching: true, gestureType: 'pinch', confidence: 0.9, timestamp: 3 },
        { x: 0.4, y: 0.6, isPinching: true, gestureType: 'pinch', confidence: 0.9, timestamp: 4 },
        { x: 0.45, y: 0.65, isPinching: true, gestureType: 'pinch', confidence: 0.9, timestamp: 5 },
        // Release
        { x: 0.45, y: 0.65, isPinching: false, gestureType: 'point', confidence: 0.9, timestamp: 6 },
      ];

      gestures.forEach(g => controller.handleGesture(g));

      const shape = controller.getShape('shape-1');
      expect(shape?.x).toBe(0.45);
      expect(shape?.y).toBe(0.65);
      expect(shape?.isDragging).toBe(false);
      expect(controller.activeShapeId).toBeNull();
    });
  });
});
