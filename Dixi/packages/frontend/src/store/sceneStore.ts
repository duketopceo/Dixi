import { create } from 'zustand';
import * as THREE from 'three';
import { MAX_OBJECTS } from '../utils/validation';

export type ObjectType = 'box' | 'sphere' | 'torus' | 'cone' | 'cylinder' | 'octahedron' | 'tetrahedron' | 'plane' | 'ring';

export interface SceneObject {
  id: string;
  type: ObjectType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  metadata?: {
    createdAt: number;
    lastModified: number;
    [key: string]: unknown;
  };
}

interface SceneHistory {
  past: SceneObject[][];
  present: SceneObject[];
  future: SceneObject[][];
}

export interface ObjectGroup {
  id: string;
  name?: string;
  objectIds: string[];
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  metadata?: {
    createdAt: number;
    lastModified: number;
    [key: string]: unknown;
  };
}

interface SceneStore {
  objects: SceneObject[];
  selectedObjectId: string | null;
  selectedObjectIds: string[]; // Multi-select support
  groups: ObjectGroup[];
  selectedGroupId: string | null;
  history: SceneHistory;
  
  // Actions
  addObject: (object: SceneObject) => { success: boolean; error?: string };
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  addToSelection: (id: string) => void; // Add to multi-select
  removeFromSelection: (id: string) => void; // Remove from multi-select
  clearSelection: () => void; // Clear all selections
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  updateSelectedObjects: (updates: Partial<SceneObject>) => void; // Update all selected objects
  clearScene: () => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Duplication
  duplicateObject: (id: string, offset?: [number, number, number]) => { success: boolean; error?: string; duplicatedId?: string };
  
  // Grouping
  createGroup: (objectIds: string[], name?: string) => { success: boolean; groupId?: string; error?: string };
  addToGroup: (groupId: string, objectId: string) => { success: boolean; error?: string };
  removeFromGroup: (groupId: string, objectId: string) => void;
  deleteGroup: (groupId: string) => void;
  selectGroup: (groupId: string | null) => void;
  updateGroup: (groupId: string, updates: Partial<ObjectGroup>) => void;
  ungroup: (groupId: string) => void; // Remove group, keep objects
  getGroup: (groupId: string) => ObjectGroup | undefined;
  getObjectsInGroup: (groupId: string) => SceneObject[];
  
  // Helpers
  getObject: (id: string) => SceneObject | undefined;
  getSelectedObject: () => SceneObject | undefined;
  getSelectedObjects: () => SceneObject[]; // Get all selected objects
  isSelected: (id: string) => boolean; // Check if object is selected
}

const MAX_HISTORY = 20;

const createHistory = (objects: SceneObject[]): SceneHistory => ({
  past: [],
  present: [...objects],
  future: [],
});

const addToHistory = (history: SceneHistory, newObjects: SceneObject[]): SceneHistory => {
  const newPast = [...history.past, history.present];
  // Limit history size
  const trimmedPast = newPast.slice(-MAX_HISTORY);
  
  return {
    past: trimmedPast,
    present: [...newObjects],
    future: [], // Clear future when new action is performed
  };
};

export const useSceneStore = create<SceneStore>((set, get) => ({
  objects: [],
  selectedObjectId: null,
  selectedObjectIds: [],
  groups: [],
  selectedGroupId: null,
  history: createHistory([]),
  
  addObject: (object) => {
    const state = get();
    if (state.objects.length >= MAX_OBJECTS) {
      return {
        success: false,
        error: `Maximum object limit reached (${MAX_OBJECTS}). Please remove some objects or clear the scene.`,
      };
    }
    const newObjects = [...state.objects, object];
    set((state) => ({
      objects: newObjects,
      history: addToHistory(state.history, newObjects),
    }));
    return { success: true };
  },
  
  removeObject: (id) => {
    const state = get();
    const newObjects = state.objects.filter((obj) => obj.id !== id);
    const newSelectedIds = state.selectedObjectIds.filter((selectedId) => selectedId !== id);
    set({
      objects: newObjects,
      selectedObjectId: state.selectedObjectId === id 
        ? (newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : null)
        : state.selectedObjectId,
      selectedObjectIds: newSelectedIds,
      history: addToHistory(state.history, newObjects),
    });
  },
  
  selectObject: (id) =>
    set({ 
      selectedObjectId: id,
      selectedObjectIds: id ? [id] : [], // Single select clears multi-select
    }),
  
  addToSelection: (id) => {
    const state = get();
    if (!state.selectedObjectIds.includes(id)) {
      set({
        selectedObjectIds: [...state.selectedObjectIds, id],
        selectedObjectId: id, // Also set as primary selection
      });
    }
  },
  
  removeFromSelection: (id) => {
    const state = get();
    const newIds = state.selectedObjectIds.filter((selectedId) => selectedId !== id);
    set({
      selectedObjectIds: newIds,
      selectedObjectId: newIds.length > 0 ? newIds[newIds.length - 1] : null, // Set last as primary
    });
  },
  
  clearSelection: () =>
    set({ 
      selectedObjectId: null,
      selectedObjectIds: [],
    }),
  
  updateObject: (id, updates) => {
    const state = get();
    const newObjects = state.objects.map((obj) =>
      obj.id === id
        ? {
            ...obj,
            ...updates,
            metadata: {
              ...obj.metadata,
              lastModified: Date.now(),
            },
          }
        : obj
    );
    set({
      objects: newObjects,
      history: addToHistory(state.history, newObjects),
    });
  },
  
  clearScene: () => {
    const state = get();
    set({
      objects: [],
      selectedObjectId: null,
      selectedObjectIds: [],
      history: addToHistory(state.history, []),
    });
  },
  
  updateSelectedObjects: (updates) => {
    const state = get();
    const newObjects = state.objects.map((obj) =>
      state.selectedObjectIds.includes(obj.id)
        ? {
            ...obj,
            ...updates,
            metadata: {
              ...obj.metadata,
              lastModified: Date.now(),
            },
          }
        : obj
    );
    set({
      objects: newObjects,
      history: addToHistory(state.history, newObjects),
    });
  },
  
  undo: () => {
    const state = get();
    if (state.history.past.length === 0) return;
    
    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);
    const newFuture = [state.history.present, ...state.history.future];
    
    set({
      objects: previous,
      history: {
        past: newPast,
        present: previous,
        future: newFuture.slice(0, MAX_HISTORY),
      },
    });
  },
  
  redo: () => {
    const state = get();
    if (state.history.future.length === 0) return;
    
    const next = state.history.future[0];
    const newPast = [...state.history.past, state.history.present];
    const newFuture = state.history.future.slice(1);
    
    set({
      objects: next,
      history: {
        past: newPast.slice(-MAX_HISTORY),
        present: next,
        future: newFuture,
      },
    });
  },
  
  clearHistory: () =>
    set((state) => ({
      history: createHistory(state.objects),
    })),
  
  getObject: (id) => {
    const state = get();
    return state.objects.find((obj) => obj.id === id);
  },
  
  getSelectedObject: () => {
    const state = get();
    if (!state.selectedObjectId) return undefined;
    return state.objects.find((obj) => obj.id === state.selectedObjectId);
  },
  
  getSelectedObjects: () => {
    const state = get();
    return state.objects.filter((obj) => state.selectedObjectIds.includes(obj.id));
  },
  
  isSelected: (id) => {
    const state = get();
    return state.selectedObjectIds.includes(id);
  },

  duplicateObject: (id, offset = [0.5, 0.5, 0]) => {
    const state = get();
    const object = state.objects.find((obj) => obj.id === id);
    
    if (!object) {
      return {
        success: false,
        error: 'Object not found',
      };
    }

    if (state.objects.length >= MAX_OBJECTS) {
      return {
        success: false,
        error: `Maximum object limit reached (${MAX_OBJECTS}). Please remove some objects or clear the scene.`,
      };
    }

    // Create duplicate with offset position
    const duplicated: SceneObject = {
      ...object,
      id: `${object.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: [
        object.position[0] + offset[0],
        object.position[1] + offset[1],
        object.position[2] + offset[2],
      ] as [number, number, number],
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
      },
    };

    const newObjects = [...state.objects, duplicated];
    set((state) => ({
      objects: newObjects,
      history: addToHistory(state.history, newObjects),
    }));

    return {
      success: true,
      duplicatedId: duplicated.id,
    };
  },

  createGroup: (objectIds, name) => {
    const state = get();
    
    if (objectIds.length < 2) {
      return {
        success: false,
        error: 'Group must contain at least 2 objects',
      };
    }

    // Validate all object IDs exist
    const validIds = objectIds.filter((id) => state.objects.some((obj) => obj.id === id));
    if (validIds.length < 2) {
      return {
        success: false,
        error: 'Not enough valid objects to create group',
      };
    }

    // Calculate group center (average position)
    const groupObjects = validIds.map((id) => state.objects.find((obj) => obj.id === id)).filter(Boolean) as SceneObject[];
    const centerX = groupObjects.reduce((sum, obj) => sum + obj.position[0], 0) / groupObjects.length;
    const centerY = groupObjects.reduce((sum, obj) => sum + obj.position[1], 0) / groupObjects.length;
    const centerZ = groupObjects.reduce((sum, obj) => sum + obj.position[2], 0) / groupObjects.length;

    const group: ObjectGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Group_${Date.now()}`,
      objectIds: validIds,
      position: [centerX, centerY, centerZ],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
      },
    };

    set({
      groups: [...state.groups, group],
    });

    return {
      success: true,
      groupId: group.id,
    };
  },

  addToGroup: (groupId, objectId) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    
    if (!group) {
      return {
        success: false,
        error: 'Group not found',
      };
    }

    if (group.objectIds.includes(objectId)) {
      return {
        success: false,
        error: 'Object already in group',
      };
    }

    const updatedGroups = state.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            objectIds: [...g.objectIds, objectId],
            metadata: {
              ...g.metadata,
              lastModified: Date.now(),
            },
          }
        : g
    );

    set({ groups: updatedGroups });

    return { success: true };
  },

  removeFromGroup: (groupId, objectId) => {
    const state = get();
    const updatedGroups = state.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            objectIds: g.objectIds.filter((id) => id !== objectId),
            metadata: {
              ...g.metadata,
              lastModified: Date.now(),
            },
          }
        : g
    ).filter((g) => g.objectIds.length >= 2); // Remove groups with < 2 objects

    set({ groups: updatedGroups });
  },

  deleteGroup: (groupId) => {
    const state = get();
    const updatedGroups = state.groups.filter((g) => g.id !== groupId);
    set({
      groups: updatedGroups,
      selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
    });
  },

  selectGroup: (groupId) =>
    set({ selectedGroupId: groupId }),

  updateGroup: (groupId, updates) => {
    const state = get();
    const updatedGroups = state.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            ...updates,
            metadata: {
              ...g.metadata,
              lastModified: Date.now(),
            },
          }
        : g
    );
    set({ groups: updatedGroups });
  },

  ungroup: (groupId) => {
    const state = get();
    const updatedGroups = state.groups.filter((g) => g.id !== groupId);
    set({
      groups: updatedGroups,
      selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
    });
  },

  getGroup: (groupId) => {
    const state = get();
    return state.groups.find((g) => g.id === groupId);
  },

  getObjectsInGroup: (groupId) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return [];
    return state.objects.filter((obj) => group.objectIds.includes(obj.id));
  },
}));

