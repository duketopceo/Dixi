import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useGestureStore } from '../store/gestureStore';
import { useAIStore } from '../store/aiStore';
import { useFaceStore } from '../store/faceStore';
import logger from '../utils/logger';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

// Singleton WebSocket connection state
class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Set<() => void> = new Set();
  private _isConnected = false;
  private _error: string | null = null;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get error(): string | null {
    return this._error;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  connect(): void {
    // Clear any existing reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Don't reconnect if we've exceeded max attempts
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._error = `Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Please refresh the page.`;
      logger.error(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      this.notify();
      return;
    }

    // Don't create new connection if already connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Close existing connection if any
      if (this.ws) {
        this.ws.close();
      }

      this.ws = new WebSocket(WS_URL);
      this._error = null;
      this.notify();

      this.ws.onopen = () => {
        logger.log('🔌 WebSocket connected');
        this._isConnected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
        this.notify();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'gesture':
              useGestureStore.getState().setCurrentGesture(message.data);
              break;
            case 'face':
              // Handle face detection data
              useFaceStore.getState().setCurrentFace(message.data);
              break;
            case 'ai_response':
              // Handle streaming responses
              if (message.data.streaming) {
                // Update streaming text incrementally
                if (message.data.response) {
                  useAIStore.getState().updateStreamingResponse(
                    message.data.response,
                    message.data.metadata
                  );
                }
              } else {
                // Final response
                useAIStore.getState().setLatestResponse(message.data);
                // Clear streaming state
                useAIStore.getState().setProcessing(false);
              }
              break;
            case 'projection':
              // Handle projection updates
              logger.log('Projection update:', message.data);
              break;
            case 'connection':
              // Welcome message
              logger.log('WebSocket:', message.message);
              break;
            default:
              logger.log('Unknown message type:', message.type);
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
          this._error = 'Failed to parse message from server';
          this.notify();
        }
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        this._error = 'WebSocket connection error';
        this._isConnected = false;
        this.notify();
      };

      this.ws.onclose = (event) => {
        logger.log('🔌 WebSocket disconnected', { code: event.code, reason: event.reason });
        this._isConnected = false;
        this.notify();
        
        // Only attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000) { // 1000 = normal closure
          this.reconnectAttempts += 1;
          const delay = RECONNECT_DELAY * this.reconnectAttempts; // Exponential backoff
          logger.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        }
      };
    } catch (error) {
      logger.error('Failed to connect to WebSocket:', error);
      this._error = error instanceof Error ? error.message : 'Failed to connect to WebSocket';
      this._isConnected = false;
      this.notify();
      
      // Schedule reconnection attempt
      this.reconnectAttempts += 1;
      if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, RECONNECT_DELAY);
      }
    }
  }

  disconnect(): void {
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset reconnection attempts
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close(1000); // Normal closure
      this.ws = null;
      this._isConnected = false;
      this.notify();
    }
  }

  send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        logger.error('Failed to send WebSocket message:', error);
        this._error = 'Failed to send message';
        this.notify();
        throw error;
      }
    } else {
      const errorMsg = 'WebSocket is not connected';
      logger.warn(errorMsg);
      this._error = errorMsg;
      this.notify();
      throw new Error(errorMsg);
    }
  }
}

// Get the singleton instance
const wsManager = WebSocketManager.getInstance();

export const useWebSocket = () => {
  // Subscribe to changes in the WebSocket manager
  const isConnected = useSyncExternalStore(
    (listener) => wsManager.subscribe(listener),
    () => wsManager.isConnected
  );

  const error = useSyncExternalStore(
    (listener) => wsManager.subscribe(listener),
    () => wsManager.error
  );

  const connect = useCallback(() => {
    wsManager.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  const send = useCallback((data: unknown) => {
    wsManager.send(data);
  }, []);

  return { connect, disconnect, send, isConnected, error };
};
