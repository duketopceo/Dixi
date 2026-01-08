/**
 * useProjectorGesture - Hook for receiving projector gesture data via WebSocket
 * 
 * Listens for 'projector_gesture' messages and provides the latest gesture data
 * in projector coordinate space (0-1 normalized).
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export interface ProjectorGestureData {
  type: string;
  position: { x: number; y: number; z?: number };
  confidence: number;
  timestamp: number;
  isPinching: boolean;
  source: 'projector';
  coordinate_space: 'projector';
}

export interface UseProjectorGestureResult {
  x: number;
  y: number;
  isPinching: boolean;
  gestureType: string;
  confidence: number;
  timestamp: number;
}

export const useProjectorGesture = (): UseProjectorGestureResult | null => {
  const [gesture, setGesture] = useState<UseProjectorGestureResult | null>(null);
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) {
      setGesture(null);
      return;
    }

    // Listen for projector_gesture events from WebSocket
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'projector_gesture' && message.data) {
          const data = message.data as ProjectorGestureData;
          
          // Validate the data
          if (
            typeof data.position?.x !== 'number' ||
            typeof data.position?.y !== 'number' ||
            isNaN(data.position.x) ||
            isNaN(data.position.y)
          ) {
            return; // Invalid data, ignore
          }
          
          setGesture({
            x: Math.max(0, Math.min(1, data.position.x)),
            y: Math.max(0, Math.min(1, data.position.y)),
            isPinching: data.isPinching ?? data.type === 'pinch',
            gestureType: data.type || 'unknown',
            confidence: data.confidence || 0,
            timestamp: data.timestamp || Date.now()
          });
        }
      } catch (error) {
        // Silently ignore parse errors
      }
    };

    // Access the WebSocket instance directly through the manager
    // We need to set up a global event listener since the hook uses a singleton
    const ws = (window as any).__dixi_websocket;
    if (ws) {
      ws.addEventListener('message', handleMessage);
      return () => ws.removeEventListener('message', handleMessage);
    }
    
    return undefined;
  }, [isConnected]);

  // Clear gesture after timeout (hand no longer detected)
  useEffect(() => {
    if (!gesture) return;
    
    const timeout = setTimeout(() => {
      // If no update in 500ms, clear the gesture
      if (Date.now() - gesture.timestamp > 500) {
        setGesture(null);
      }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [gesture]);

  return gesture;
};

export default useProjectorGesture;
