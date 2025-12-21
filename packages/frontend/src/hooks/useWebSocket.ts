import { useCallback, useRef, useState } from 'react';
import { useGestureStore } from '../store/gestureStore';
import { useAIStore } from '../store/aiStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCurrentGesture = useGestureStore((state) => state.setCurrentGesture);
  const setLatestResponse = useAIStore((state) => state.setLatestResponse);

  const connect = useCallback(() => {
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Please refresh the page.`);
      console.error(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      wsRef.current = new WebSocket(WS_URL);
      setError(null);

      wsRef.current.onopen = () => {
        console.log('🔌 WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      wsRef.current.onmessage = (event) => {
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
            case 'connection':
              // Welcome message
              console.log('WebSocket:', message.message);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          setError('Failed to parse message from server');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected', { code: event.code, reason: event.reason });
        setIsConnected(false);
        
        // Only attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000) { // 1000 = normal closure
          reconnectAttemptsRef.current += 1;
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current; // Exponential backoff
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to WebSocket');
      setIsConnected(false);
      
      // Schedule reconnection attempt
      reconnectAttemptsRef.current += 1;
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      }
    }
  }, [setCurrentGesture, setLatestResponse]);

  const disconnect = useCallback(() => {
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset reconnection attempts
    reconnectAttemptsRef.current = 0;
    
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        setError('Failed to send message');
        throw error;
      }
    } else {
      const errorMsg = 'WebSocket is not connected';
      console.warn(errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return { connect, disconnect, send, isConnected, error };
};
