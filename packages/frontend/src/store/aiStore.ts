import { create } from 'zustand';
import { apiService } from '../services/api';
import { useGestureStore } from './gestureStore';

interface AIResponse {
  query: string;
  response: string;
  metadata?: any;
  timestamp: number;
}

interface AIStore {
  latestResponse: AIResponse | null;
  responseHistory: AIResponse[];
  isProcessing: boolean;
  setLatestResponse: (response: AIResponse) => void;
  setProcessing: (isProcessing: boolean) => void;
  clearResponses: () => void;
  sendQuery: (query: string, context?: any) => Promise<void>;
  clearResponse: () => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  latestResponse: null,
  responseHistory: [],
  isProcessing: false,
  
  setLatestResponse: (response) =>
    set((state) => ({
      latestResponse: response,
      responseHistory: [...state.responseHistory.slice(-9), response],
      isProcessing: false
    })),
  
  setProcessing: (isProcessing) =>
    set({ isProcessing }),
  
  clearResponses: () =>
    set({ latestResponse: null, responseHistory: [] }),
  
  clearResponse: () =>
    set({ latestResponse: null }),
  
  sendQuery: async (query: string, context?: any) => {
    set({ isProcessing: true });
    try {
      // Get current gesture for context if not provided
      const currentGesture = useGestureStore.getState().currentGesture;
      const gestureContext = context || (currentGesture ? {
        gesture: {
          type: currentGesture.type,
          coordinates: {
            x: currentGesture.position.x,
            y: currentGesture.position.y
          }
        }
      } : undefined);
      
      const response = await apiService.sendAIQuery(query, gestureContext);
      
      // Response comes back as { text, metadata }
      set({
        latestResponse: {
          query,
          response: response.text || response.response || '',
          metadata: response.metadata,
          timestamp: Date.now()
        },
        isProcessing: false
      });
    } catch (error) {
      set({ isProcessing: false });
      throw error;
    }
  }
}));
