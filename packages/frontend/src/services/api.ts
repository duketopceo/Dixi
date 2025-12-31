import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

// Error handling utility
const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; details?: string }>;
    
    if (axiosError.response) {
      // Server responded with error status
      const message = axiosError.response.data?.error || axiosError.response.data?.details || axiosError.message;
      throw new Error(message || `Server error: ${axiosError.response.status}`);
    } else if (axiosError.request) {
      // Request made but no response received
      throw new Error('No response from server. Please check if the backend is running.');
    } else {
      // Error setting up request
      throw new Error(`Request error: ${axiosError.message}`);
    }
  } else if (error instanceof Error) {
    throw error;
  } else {
    throw new Error('An unknown error occurred');
  }
};

export const apiService = {
  // Gesture endpoints
  async getGestureStatus() {
    try {
      const response = await api.get('/gestures');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async startGestureTracking() {
    try {
      const response = await api.post('/gestures/start');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async stopGestureTracking() {
    try {
      const response = await api.post('/gestures/stop');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // AI endpoints
  async getAIStatus() {
    try {
      const response = await api.get('/ai/status');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async initializeAI(modelPath?: string, modelSize?: string) {
    try {
      const response = await api.post('/ai/initialize', { modelPath, modelSize });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async sendAIQuery(query: string, context?: any) {
    try {
      const response = await api.post('/ai/infer', { query, context });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Projection endpoints
  async getProjectionStatus() {
    try {
      const response = await api.get('/projection/status');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async updateProjectionMapping(calibrationData: any, transform: any) {
    try {
      const response = await api.post('/projection/mapping', { calibrationData, transform });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async updateProjectionContent(content: any, position?: any, style?: any) {
    try {
      const response = await api.post('/projection/content', { content, position, style });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Continuous analysis endpoints
  async getContinuousAnalysisStatus() {
    try {
      const response = await api.get('/gestures/continuous-analysis/status');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async toggleContinuousAnalysis(enabled: boolean) {
    try {
      const response = await api.post('/gestures/continuous-analysis/toggle', { enabled });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Manual single gesture analysis
  async triggerManualAnalysis() {
    try {
      const response = await api.post('/gestures/analyze-now');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Scene management endpoints
  async saveScene(scene: any, name?: string) {
    try {
      const response = await api.post('/projection/scene', { scene, name });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async loadScene(sceneId: string) {
    try {
      const response = await api.get(`/projection/scene/${sceneId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async listScenes() {
    try {
      const response = await api.get('/projection/scenes');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async deleteScene(sceneId: string) {
    try {
      const response = await api.delete(`/projection/scene/${sceneId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Vision AI endpoints
  async analyzeVision(prompt?: string) {
    try {
      const response = await api.post('/ai/vision/analyze', { prompt }, { timeout: 60000 });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getVisionStatus() {
    try {
      const response = await api.get('/ai/vision/status');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Face detection endpoints
  async getFaceData() {
    try {
      const response = await api.get('/faces');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getFaceStatus() {
    try {
      const response = await api.get('/faces/status');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Unified tracking endpoints
  async getTrackingData() {
    try {
      const response = await api.get('/tracking');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async analyzeTracking(prompt?: string) {
    try {
      const response = await api.post('/tracking/analyze', { prompt }, { timeout: 60000 });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async startTracking() {
    try {
      const response = await api.post('/tracking/start');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async stopTracking() {
    try {
      const response = await api.post('/tracking/stop');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }
};
