import { useState, useEffect, useCallback, useRef } from 'react';

export interface SystemStatus {
  backend: { status: string; error?: string };
  vision: { status: string; tracking?: boolean; error?: string };
  ollama: { status: string; error?: string };
  websocket: boolean;
  timestamp: number;
}

const VISION_URL = 'http://localhost:5001';
const BACKEND_URL = 'http://localhost:3001';
const OLLAMA_URL = 'http://localhost:11434';

export function useSystemStatus(pollInterval = 10000) {
  const [status, setStatus] = useState<SystemStatus>({
    backend: { status: 'unknown' },
    vision: { status: 'unknown' },
    ollama: { status: 'unknown' },
    websocket: false,
    timestamp: Date.now()
  });
  const [isChecking, setIsChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const checkStatus = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setIsChecking(true);

    const newStatus: SystemStatus = {
      backend: { status: 'unknown' },
      vision: { status: 'unknown' },
      ollama: { status: 'unknown' },
      websocket: false,
      timestamp: Date.now()
    };

    // Check backend
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal, method: 'GET' });
      if (res.ok) {
        newStatus.backend = { status: 'healthy' };
      } else {
        newStatus.backend = { status: 'unhealthy', error: `HTTP ${res.status}` };
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        newStatus.backend = { status: 'offline', error: 'Connection failed' };
      }
    }

    // Check vision service
    try {
      const res = await fetch(`${VISION_URL}/health`, { signal, method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        newStatus.vision = { status: 'healthy', tracking: data.tracking };
      } else {
        newStatus.vision = { status: 'unhealthy', error: `HTTP ${res.status}` };
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        newStatus.vision = { status: 'offline', error: 'Connection failed' };
      }
    }

    // Check Ollama
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal, method: 'GET' });
      if (res.ok) {
        newStatus.ollama = { status: 'available' };
      } else {
        newStatus.ollama = { status: 'unavailable', error: `HTTP ${res.status}` };
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        newStatus.ollama = { status: 'offline', error: 'Connection failed' };
      }
    }

    setStatus(newStatus);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, pollInterval);

    return () => {
      clearInterval(interval);
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [checkStatus, pollInterval]);

  return { status, isChecking, refresh: checkStatus };
}
