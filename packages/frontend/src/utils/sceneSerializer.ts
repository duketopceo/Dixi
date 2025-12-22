import { SceneObject } from '../store/sceneStore';

export interface SerializedScene {
  id?: string;
  name?: string;
  objects: SceneObject[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Serializes scene state to JSON (removes Three.js refs and temporary state)
 */
export function serializeScene(objects: SceneObject[], name?: string): SerializedScene {
  return {
    objects: objects.map((obj) => ({
      id: obj.id,
      type: obj.type,
      position: [...obj.position],
      rotation: [...obj.rotation],
      scale: [...obj.scale],
      color: obj.color,
      metadata: {
        createdAt: obj.metadata?.createdAt || Date.now(),
        lastModified: obj.metadata?.lastModified || Date.now(),
      },
    })),
    name: name || `Scene_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Deserializes JSON to scene objects (validates and normalizes data)
 */
export function deserializeScene(data: SerializedScene): SceneObject[] {
  if (!data.objects || !Array.isArray(data.objects)) {
    return [];
  }

  return data.objects.map((obj) => ({
    id: obj.id,
    type: obj.type,
    position: Array.isArray(obj.position) && obj.position.length === 3
      ? (obj.position as [number, number, number])
      : [0, 0, -2],
    rotation: Array.isArray(obj.rotation) && obj.rotation.length === 3
      ? (obj.rotation as [number, number, number])
      : [0, 0, 0],
    scale: Array.isArray(obj.scale) && obj.scale.length === 3
      ? (obj.scale as [number, number, number])
      : [0.5, 0.5, 0.5],
    color: typeof obj.color === 'string' ? obj.color : '#00F5FF',
    metadata: {
      createdAt: obj.metadata?.createdAt || Date.now(),
      lastModified: obj.metadata?.lastModified || Date.now(),
    },
  }));
}

/**
 * Validates scene data structure
 */
export function validateScene(data: unknown): data is SerializedScene {
  if (!data || typeof data !== 'object') return false;
  const scene = data as Record<string, unknown>;
  if (!Array.isArray(scene.objects)) return false;
  return scene.objects.every((obj: unknown) => {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    return (
      typeof o.id === 'string' &&
      typeof o.type === 'string' &&
      Array.isArray(o.position) &&
      Array.isArray(o.rotation) &&
      Array.isArray(o.scale) &&
      typeof o.color === 'string'
    );
  });
}

