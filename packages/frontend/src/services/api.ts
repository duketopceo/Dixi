import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const apiService = {
  // Gesture endpoints
  async getGestureStatus() {
    const response = await api.get('/gestures');
    return response.data;
  },

  async startGestureTracking() {
    const response = await api.post('/gestures/start');
    return response.data;
  },

  async stopGestureTracking() {
    const response = await api.post('/gestures/stop');
    return response.data;
  },

  // AI endpoints
  async getAIStatus() {
    const response = await api.get('/ai/status');
    return response.data;
  },

  async initializeAI(modelPath?: string, modelSize?: string) {
    const response = await api.post('/ai/initialize', { modelPath, modelSize });
    return response.data;
  },

  async sendAIQuery(query: string, context?: any) {
    const response = await api.post('/ai/infer', { query, context });
    return response.data;
  },

  // Projection endpoints
  async getProjectionStatus() {
    const response = await api.get('/projection/status');
    return response.data;
  },

  async updateProjectionMapping(calibrationData: any, transform: any) {
    const response = await api.post('/projection/mapping', { calibrationData, transform });
    return response.data;
  },

  async updateProjectionContent(content: any, position?: any, style?: any) {
    const response = await api.post('/projection/content', { content, position, style });
    return response.data;
  }
};
