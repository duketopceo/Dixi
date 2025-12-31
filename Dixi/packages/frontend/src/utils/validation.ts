import { SceneObject } from '../store/sceneStore';
import * as THREE from 'three';

export const MAX_OBJECTS = 50;
export const MIN_GESTURE_CONFIDENCE = 0.3;
export const SCENE_BOUNDS = {
  minX: -10,
  maxX: 10,
  minY: -10,
  maxY: 10,
  minZ: -10,
  maxZ: 5,
};

/**
 * Validates gesture data before use
 */
export function validateGesture(gesture: { type: string; position: { x: number; y: number }; confidence?: number } | null): boolean {
  if (!gesture) return false;
  
  // Check confidence threshold
  if (gesture.confidence !== undefined && gesture.confidence < MIN_GESTURE_CONFIDENCE) {
    return false;
  }
  
  // Validate position is within bounds (0-1 normalized)
  const { x, y } = gesture.position;
  if (typeof x !== 'number' || typeof y !== 'number') return false;
  if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return false;
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  
  return true;
}

/**
 * Validates object position, rotation, scale values
 */
export function validateObjectTransform(
  position?: [number, number, number],
  rotation?: [number, number, number],
  scale?: [number, number, number]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (position) {
    if (!Array.isArray(position) || position.length !== 3) {
      errors.push('Position must be a 3-element array');
    } else {
      position.forEach((val, idx) => {
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
          errors.push(`Position[${idx}] must be a finite number`);
        } else if (val < SCENE_BOUNDS.minX || val > SCENE_BOUNDS.maxX) {
          if (idx === 0) errors.push(`Position X out of bounds (${SCENE_BOUNDS.minX} to ${SCENE_BOUNDS.maxX})`);
        } else if (val < SCENE_BOUNDS.minY || val > SCENE_BOUNDS.maxY) {
          if (idx === 1) errors.push(`Position Y out of bounds (${SCENE_BOUNDS.minY} to ${SCENE_BOUNDS.maxY})`);
        } else if (val < SCENE_BOUNDS.minZ || val > SCENE_BOUNDS.maxZ) {
          if (idx === 2) errors.push(`Position Z out of bounds (${SCENE_BOUNDS.minZ} to ${SCENE_BOUNDS.maxZ})`);
        }
      });
    }
  }
  
  if (rotation) {
    if (!Array.isArray(rotation) || rotation.length !== 3) {
      errors.push('Rotation must be a 3-element array');
    } else {
      rotation.forEach((val, idx) => {
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
          errors.push(`Rotation[${idx}] must be a finite number`);
        }
      });
    }
  }
  
  if (scale) {
    if (!Array.isArray(scale) || scale.length !== 3) {
      errors.push('Scale must be a 3-element array');
    } else {
      scale.forEach((val, idx) => {
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
          errors.push(`Scale[${idx}] must be a finite number`);
        } else if (val <= 0) {
          errors.push(`Scale[${idx}] must be greater than 0`);
        } else if (val > 5) {
          errors.push(`Scale[${idx}] exceeds maximum (5)`);
        }
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Clamps a value to valid scene bounds
 */
export function clampToSceneBounds(value: number, axis: 'x' | 'y' | 'z'): number {
  switch (axis) {
    case 'x':
      return Math.max(SCENE_BOUNDS.minX, Math.min(SCENE_BOUNDS.maxX, value));
    case 'y':
      return Math.max(SCENE_BOUNDS.minY, Math.min(SCENE_BOUNDS.maxY, value));
    case 'z':
      return Math.max(SCENE_BOUNDS.minZ, Math.min(SCENE_BOUNDS.maxZ, value));
    default:
      return value;
  }
}

/**
 * Validates object exists before manipulation
 */
export function validateObjectExists(objectId: string, objects: SceneObject[]): boolean {
  return objects.some((obj) => obj.id === objectId);
}

/**
 * Sanitizes transform values (removes NaN, Infinity, clamps to bounds)
 */
export function sanitizeTransform(
  position?: [number, number, number],
  rotation?: [number, number, number],
  scale?: [number, number, number]
): {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
} {
  const sanitized: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  } = {};
  
  if (position) {
    sanitized.position = [
      clampToSceneBounds(isFinite(position[0]) ? position[0] : 0, 'x'),
      clampToSceneBounds(isFinite(position[1]) ? position[1] : 0, 'y'),
      clampToSceneBounds(isFinite(position[2]) ? position[2] : -2, 'z'),
    ];
  }
  
  if (rotation) {
    sanitized.rotation = [
      isFinite(rotation[0]) ? rotation[0] : 0,
      isFinite(rotation[1]) ? rotation[1] : 0,
      isFinite(rotation[2]) ? rotation[2] : 0,
    ];
  }
  
  if (scale) {
    sanitized.scale = [
      Math.max(0.1, Math.min(5, isFinite(scale[0]) ? scale[0] : 0.5)),
      Math.max(0.1, Math.min(5, isFinite(scale[1]) ? scale[1] : 0.5)),
      Math.max(0.1, Math.min(5, isFinite(scale[2]) ? scale[2] : 0.5)),
    ];
  }
  
  return sanitized;
}

