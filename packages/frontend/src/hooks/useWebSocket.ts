import { useEffect, useCallback } from 'react';
import { useGestureStore } from '../store/gestureStore';
import { useAIStore } from '../store/aiStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

export const useWebSocket = () => {
  let ws: WebSocket | null = null;

  const setCurrentGesture = useGestureStore((state) => state.setCurrentGesture);
  const setLatestResponse = useAIStore((state) => state.setLatestResponse);

  const connect = useCallback(() => {
    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'gesture':
              setCurrentGesture(message.data);
              break;
            case 'ai_response':
              setLatestResponse(message.data);
              break;
            case 'projection':
              // Handle projection updates
              console.log('Projection update:', message.data);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, [setCurrentGesture, setLatestResponse]);

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
  }, []);

  const send = useCallback((data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return { connect, disconnect, send };
};
