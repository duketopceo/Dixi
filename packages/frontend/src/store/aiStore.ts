import { create } from 'zustand';
import { apiService } from '../services/api';
import { useTrackingStore } from './trackingStore';

interface AIResponse {
  query: string;
  response: string;
  metadata?: any;
  timestamp: number;
  streaming?: boolean;
  analysisType?: 'gesture' | 'continuous' | 'query';
}

interface ChatMessage {
  id: string;
  query: string;
  response: string;
  timestamp: number;
  metadata?: any;
}

interface AIStore {
  latestResponse: AIResponse | null;
  responseHistory: AIResponse[];
  chatHistory: ChatMessage[];
  isProcessing: boolean;
  isStreaming: boolean;
  streamingText: string;
  autoAnalysisEnabled: boolean;
  autoAnalysisInterval: number; // in milliseconds
  setLatestResponse: (response: AIResponse) => void;
  updateStreamingResponse: (text: string, metadata?: any) => void;
  setProcessing: (isProcessing: boolean) => void;
  clearResponses: () => void;
  sendQuery: (query: string, context?: any) => Promise<void>;
  sendQueryWithTracking: (query: string, includeFace?: boolean) => Promise<void>;
  analyzeTracking: (prompt?: string) => Promise<void>;
  clearResponse: () => void;
  addChatMessage: (query: string, response: string, metadata?: any) => void;
  clearChatHistory: () => void;
  setAutoAnalysis: (enabled: boolean, interval?: number) => void;
  getContextSummary: () => string;
}

export const useAIStore = create<AIStore>((set, get) => ({
  latestResponse: null,
  responseHistory: [],
  chatHistory: [],
  isProcessing: false,
  isStreaming: false,
  streamingText: '',
  autoAnalysisEnabled: false,
  autoAnalysisInterval: 10000, // 10 seconds default
  
  setLatestResponse: (response) => {
    const isStreaming = response.streaming === true;
    const finalResponse = {
      ...response,
      streaming: false
    };
    
    set((state) => {
      // Add to chat history if it's a user query (not gesture/continuous analysis)
      const shouldAddToChat = !isStreaming && 
                             finalResponse.analysisType === 'query' && 
                             finalResponse.query && 
                             finalResponse.response;
      
      return {
        latestResponse: isStreaming ? { ...response, response: state.streamingText } : finalResponse,
        responseHistory: isStreaming 
          ? state.responseHistory 
          : [...state.responseHistory.slice(-9), finalResponse],
        chatHistory: shouldAddToChat
          ? [...state.chatHistory.slice(-49), {
              id: `chat-${Date.now()}`,
              query: finalResponse.query,
              response: finalResponse.response,
              timestamp: finalResponse.timestamp,
              metadata: finalResponse.metadata
            }]
          : state.chatHistory,
        isProcessing: false,
        isStreaming: isStreaming,
        streamingText: isStreaming ? state.streamingText : ''
      };
    });
  },
  
  updateStreamingResponse: (text: string, metadata?: any) => {
    set((state) => {
      const newText = state.streamingText + text;
      return {
        streamingText: newText,
        isStreaming: true,
        latestResponse: state.latestResponse ? {
          ...state.latestResponse,
          response: newText,
          streaming: true,
          metadata: metadata || state.latestResponse.metadata
        } : null
      };
    });
  },
  
  setProcessing: (isProcessing) =>
    set({ isProcessing, isStreaming: false, streamingText: '' }),
  
  clearResponses: () =>
    set({ latestResponse: null, responseHistory: [], streamingText: '', isStreaming: false }),
  
  clearResponse: () =>
    set({ latestResponse: null, streamingText: '', isStreaming: false }),
  
  sendQuery: async (query: string, context?: any) => {
    set({ isProcessing: true });
    try {
      // Get current tracking data for context if not provided
      const currentTracking = useTrackingStore.getState().currentTracking;
      const trackingContext = context || (currentTracking ? {
        hands: currentTracking.hands,
        face: currentTracking.face,
        body: currentTracking.body,
        eyes: currentTracking.eyes
      } : undefined);
      
      const response = await apiService.sendAIQuery(query, trackingContext);
      
      // Response comes back as { text, metadata }
      const aiResponse: AIResponse = {
        query,
        response: response.text || response.response || '',
        metadata: response.metadata,
        timestamp: Date.now(),
        analysisType: 'query'
      };
      
      set((state) => {
        // Add to chat history for user queries
        const chatMessage = {
          id: `chat-${Date.now()}`,
          query,
          response: aiResponse.response,
          timestamp: aiResponse.timestamp,
          metadata: aiResponse.metadata
        };
        
        return {
          latestResponse: aiResponse,
          responseHistory: [...state.responseHistory.slice(-9), aiResponse],
          chatHistory: [...state.chatHistory.slice(-49), chatMessage],
          isProcessing: false
        };
      });
    } catch (error) {
      set({ isProcessing: false });
      throw error;
    }
  },

  sendQueryWithTracking: async (query: string, includeFace: boolean = true) => {
    set({ isProcessing: true });
    try {
      // Build context from unified tracking data
      const currentTracking = useTrackingStore.getState().currentTracking;
      
      const context: any = {};
      
      if (currentTracking) {
        // Hands context
        if (currentTracking.hands?.left?.detected || currentTracking.hands?.right?.detected) {
          context.hands = {
            left: currentTracking.hands.left ? {
              gesture: currentTracking.hands.left.gesture,
              position: currentTracking.hands.left.position,
              confidence: currentTracking.hands.left.confidence
            } : null,
            right: currentTracking.hands.right ? {
              gesture: currentTracking.hands.right.gesture,
              position: currentTracking.hands.right.position,
              confidence: currentTracking.hands.right.confidence
            } : null
          };
        }
        
        // Face context
        if (includeFace && currentTracking.face?.detected) {
          context.face = {
            detected: true,
            engagement: currentTracking.face.engagement,
            expressions: currentTracking.face.expressions,
            head_pose: currentTracking.face.head_pose,
            mouth_features: currentTracking.face.mouth_features
          };
        }
        
        // Body context
        if (currentTracking.body?.detected) {
          context.body = {
            posture: currentTracking.body.posture,
            orientation: currentTracking.body.orientation
          };
        }
        
        // Eyes context
        if (currentTracking.eyes) {
          context.eyes = {
            combined_gaze: currentTracking.eyes.combined_gaze,
            attention_score: currentTracking.eyes.attention_score
          };
        }
      }
      
      const response = await apiService.sendAIQuery(query, context);
      
      const aiResponse: AIResponse = {
        query,
        response: response.text || response.response || '',
        metadata: { ...response.metadata, context },
        timestamp: Date.now(),
        analysisType: 'query'
      };
      
      set((state) => {
        const chatMessage = {
          id: `chat-${Date.now()}`,
          query,
          response: aiResponse.response,
          timestamp: aiResponse.timestamp,
          metadata: aiResponse.metadata
        };
        
        return {
          latestResponse: aiResponse,
          responseHistory: [...state.responseHistory.slice(-9), aiResponse],
          chatHistory: [...state.chatHistory.slice(-49), chatMessage],
          isProcessing: false
        };
      });
    } catch (error) {
      set({ isProcessing: false });
      throw error;
    }
  },

  analyzeTracking: async (prompt?: string) => {
    set({ isProcessing: true });
    try {
      const response = await apiService.analyzeTracking(prompt);
      
      const aiResponse: AIResponse = {
        query: prompt || 'Analyze current scene',
        response: response.analysis?.text || response.analysis?.response || '',
        metadata: {
          ...response.analysis?.metadata,
          context: response.context,
          analysisType: 'combined_vision_tracking'
        },
        timestamp: Date.now(),
        analysisType: 'continuous'
      };
      
      set((state) => ({
        latestResponse: aiResponse,
        responseHistory: [...state.responseHistory.slice(-9), aiResponse],
        isProcessing: false
      }));
    } catch (error) {
      set({ isProcessing: false });
      throw error;
    }
  },

  setAutoAnalysis: (enabled: boolean, interval?: number) => {
    set({
      autoAnalysisEnabled: enabled,
      autoAnalysisInterval: interval || get().autoAnalysisInterval
    });
  },

  getContextSummary: () => {
    return useTrackingStore.getState().getContextSummary();
  },
  
  addChatMessage: (query: string, response: string, metadata?: any) => {
    set((state) => ({
      chatHistory: [...state.chatHistory.slice(-49), {
        id: `chat-${Date.now()}`,
        query,
        response,
        timestamp: Date.now(),
        metadata
      }]
    }));
  },
  
  clearChatHistory: () => {
    set({ chatHistory: [] });
  }
}));
