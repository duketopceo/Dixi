import { create } from 'zustand';

interface GestureData {
  type: string;
  position: { x: number; y: number; z?: number };
  confidence: number;
  timestamp: number;
}

interface GestureStore {
  currentGesture: GestureData | null;
  gestureHistory: GestureData[];
  setCurrentGesture: (gesture: GestureData) => void;
  clearGesture: () => void;
}

export const useGestureStore = create<GestureStore>((set) => ({
  currentGesture: null,
  gestureHistory: [],
  
  setCurrentGesture: (gesture) =>
    set((state) => ({
      currentGesture: gesture,
      gestureHistory: [...state.gestureHistory.slice(-19), gesture]
    })),
  
  clearGesture: () =>
    set({ currentGesture: null })
}));
