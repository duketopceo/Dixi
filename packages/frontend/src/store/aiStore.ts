import { create } from 'zustand';

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
}

export const useAIStore = create<AIStore>((set) => ({
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
    set({ latestResponse: null, responseHistory: [] })
}));
