import { create } from 'zustand';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

interface DebugState {
  logs: LogEntry[];
  isVisible: boolean;
  addLog: (message: string, level?: LogEntry['level'], source?: string) => void;
  clearLogs: () => void;
  toggleVisibility: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  logs: [],
  isVisible: false,
  addLog: (message, level = 'info', source = 'System') => 
    set((state) => ({
      logs: [
        {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          level,
          message,
          source,
        },
        ...state.logs.slice(0, 499), // Keep last 500 logs
      ],
    })),
  clearLogs: () => set({ logs: [] }),
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
}));

// Override console methods to capture logs
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  originalLog(...args);
  useDebugStore.getState().addLog(args.join(' '), 'info', 'Console');
};

console.warn = (...args) => {
  originalWarn(...args);
  useDebugStore.getState().addLog(args.join(' '), 'warn', 'Console');
};

console.error = (...args) => {
  originalError(...args);
  useDebugStore.getState().addLog(args.join(' '), 'error', 'Console');
};
