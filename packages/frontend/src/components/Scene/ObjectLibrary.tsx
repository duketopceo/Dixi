import * as THREE from 'three';
import { ObjectType, SceneObject } from '../../store/sceneStore';

export const OBJECT_COLORS = [
  '#00F5FF', // Cyan
  '#FF006E', // Pink
  '#00FF87', // Green
  '#FFD700', // Gold
  '#9D4EDD', // Purple
  '#4A90E2', // Blue
  '#FF8C00', // Orange
  '#32CD32', // Lime
] as const;

export interface ObjectConfig {
  type: ObjectType;
  defaultSize: number;
  defaultColor: string;
}

export const OBJECT_CONFIGS: Record<ObjectType, ObjectConfig> = {
  box: {
    type: 'box',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[0],
  },
  sphere: {
    type: 'sphere',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[1],
  },
  torus: {
    type: 'torus',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[2],
  },
  cone: {
    type: 'cone',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[3],
  },
  cylinder: {
    type: 'cylinder',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[4],
  },
  octahedron: {
    type: 'octahedron',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[5],
  },
  tetrahedron: {
    type: 'tetrahedron',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[6],
  },
  plane: {
    type: 'plane',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[7],
  },
  ring: {
    type: 'ring',
    defaultSize: 0.5,
    defaultColor: OBJECT_COLORS[0],
  },
};

/**
 * Creates a new scene object at the specified position
 */
export function createObject(
  type: ObjectType,
  position: [number, number, number],
  color?: string
): SceneObject {
  const config = OBJECT_CONFIGS[type];
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    type,
    position,
    rotation: [0, 0, 0],
    scale: [config.defaultSize, config.defaultSize, config.defaultSize],
    color: color || config.defaultColor,
    metadata: {
      createdAt: Date.now(),
      lastModified: Date.now(),
    },
  };
}

/**
 * Gets a random color from the palette
 */
export function getRandomColor(): string {
  return OBJECT_COLORS[Math.floor(Math.random() * OBJECT_COLORS.length)];
}

/**
 * Converts gesture position (0-1 normalized) to 3D coordinates
 */
export function gestureTo3DPosition(
  gestureX: number,
  gestureY: number,
  zDepth: number = -2
): [number, number, number] {
  const x = (gestureX - 0.5) * 10;
  const y = -(gestureY - 0.5) * 10; // Invert Y
  return [x, y, zDepth];
}

