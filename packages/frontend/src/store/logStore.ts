import { create } from 'zustand';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source: 'backend' | 'frontend' | 'vision' | 'websocket' | 'api';
  stack?: string;
  metadata?: Record<string, any>;
}

interface LogStore {
  // Backend logs
  backendErrors: LogEntry[];
  backendLogs: LogEntry[];
  
  // Frontend logs
  frontendErrors: LogEntry[];
  
  // Vision service logs
  visionLogs: LogEntry[];
  
  // WebSocket logs
  websocketLogs: LogEntry[];
  
  // API request logs
  apiLogs: LogEntry[];
  
  // System health logs
  healthLogs: LogEntry[];
  
  // Actions
  addBackendError: (entry: Omit<LogEntry, 'id' | 'source'>) => void;
  addBackendLog: (entry: Omit<LogEntry, 'id' | 'source'>) => void;
  addFrontendError: (entry: Omit<LogEntry, 'id' | 'source'>) => void;
  addVisionLog: (entry: Omit<LogEntry, 'id' | 'source'>) => void;
  addWebSocketLog: (entry: Omit<LogEntry, 'id' | 'source'>) => void;
  addApiLog: (entry: Omit<LogEntry, 'id' | 'source'>) => void;
  addHealthLog: (entry: Omit<LogEntry, 'id' | 'source'>) => void;
  clearSection: (section: keyof Omit<LogStore, 'addBackendError' | 'addBackendLog' | 'addFrontendError' | 'addVisionLog' | 'addWebSocketLog' | 'addApiLog' | 'addHealthLog' | 'clearSection' | 'clearAll'>) => void;
  clearAll: () => void;
}

const MAX_LOGS_PER_SECTION = 1000;

export const useLogStore = create<LogStore>((set) => ({
  backendErrors: [],
  backendLogs: [],
  frontendErrors: [],
  visionLogs: [],
  websocketLogs: [],
  apiLogs: [],
  healthLogs: [],

  addBackendError: (entry) =>
    set((state) => ({
      backendErrors: [
        {
          ...entry,
          id: `${Date.now()}-${Math.random()}`,
          source: 'backend',
        },
        ...state.backendErrors.slice(0, MAX_LOGS_PER_SECTION - 1),
      ],
    })),

  addBackendLog: (entry) =>
    set((state) => ({
      backendLogs: [
        {
          ...entry,
          id: `${Date.now()}-${Math.random()}`,
          source: 'backend',
        },
        ...state.backendLogs.slice(0, MAX_LOGS_PER_SECTION - 1),
      ],
    })),

  addFrontendError: (entry) =>
    set((state) => ({
      frontendErrors: [
        {
          ...entry,
          id: `${Date.now()}-${Math.random()}`,
          source: 'frontend',
        },
        ...state.frontendErrors.slice(0, MAX_LOGS_PER_SECTION - 1),
      ],
    })),

  addVisionLog: (entry) =>
    set((state) => ({
      visionLogs: [
        {
          ...entry,
          id: `${Date.now()}-${Math.random()}`,
          source: 'vision',
        },
        ...state.visionLogs.slice(0, MAX_LOGS_PER_SECTION - 1),
      ],
    })),

  addWebSocketLog: (entry) =>
    set((state) => ({
      websocketLogs: [
        {
          ...entry,
          id: `${Date.now()}-${Math.random()}`,
          source: 'websocket',
        },
        ...state.websocketLogs.slice(0, MAX_LOGS_PER_SECTION - 1),
      ],
    })),

  addApiLog: (entry) =>
    set((state) => ({
      apiLogs: [
        {
          ...entry,
          id: `${Date.now()}-${Math.random()}`,
          source: 'api',
        },
        ...state.apiLogs.slice(0, MAX_LOGS_PER_SECTION - 1),
      ],
    })),

  addHealthLog: (entry) =>
    set((state) => ({
      healthLogs: [
        {
          ...entry,
          id: `${Date.now()}-${Math.random()}`,
          source: 'backend',
        },
        ...state.healthLogs.slice(0, MAX_LOGS_PER_SECTION - 1),
      ],
    })),

  clearSection: (section) =>
    set((state) => ({
      [section]: [],
    })),

  clearAll: () =>
    set({
      backendErrors: [],
      backendLogs: [],
      frontendErrors: [],
      visionLogs: [],
      websocketLogs: [],
      apiLogs: [],
      healthLogs: [],
    }),
}));

// Capture frontend console errors
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    originalError(...args);
    useLogStore.getState().addFrontendError({
      timestamp: Date.now(),
      level: 'error',
      message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
    });
  };
  
  console.warn = (...args) => {
    originalWarn(...args);
    // Warnings can go to backend logs or a separate section
  };
  
  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    useLogStore.getState().addFrontendError({
      timestamp: Date.now(),
      level: 'error',
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
    });
  });
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    useLogStore.getState().addFrontendError({
      timestamp: Date.now(),
      level: 'error',
      message: `Unhandled promise rejection: ${event.reason}`,
    });
  });
}
