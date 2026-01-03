import { Server, WebSocket } from 'ws';
import logger from '../utils/logger';

export interface GestureData {
  type: string;
  position: { x: number; y: number; z?: number };
  confidence: number;
  timestamp: number;
}

// Projector-specific gesture data with additional fields
export interface ProjectorGestureData {
  type: string;
  position: { x: number; y: number; z?: number };
  confidence: number;
  timestamp: number;
  isPinching: boolean;
  source: 'projector';
  coordinate_space: 'projector';
}

export interface AIResponse {
  query: string;
  response: string;
  metadata?: any;
  timestamp: number;
}

export interface FaceData {
  detected: boolean;
  landmarks_count?: number;
  bounding_box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    width: number;
    height: number;
  };
  key_points?: {
    left_eye: { x: number; y: number };
    right_eye: { x: number; y: number };
    nose_tip: { x: number; y: number };
    mouth_center: { x: number; y: number };
  };
  head_pose?: {
    tilt: number;
    turn: number;
  };
  expressions?: { [key: string]: number };
  timestamp: number;
}

export interface TrackingData {
  face: FaceData | null;
  hands: {
    left: any | null;
    right: any | null;
  };
  body: any | null;
  eyes: any | null;
  timestamp: number;
}

export class WebSocketService {
  private wss: Server;
  private clients: Set<WebSocket>;

  constructor(wss: Server) {
    this.wss = wss;
    this.clients = new Set();
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('🔌 New WebSocket client connected');
      this.clients.add(ws);

      // Set up ping/pong to keep connection alive
      let isAlive = true;
      const pingInterval = setInterval(() => {
        if (!isAlive) {
          logger.warn('Client not responding to pings, terminating connection');
          clearInterval(pingInterval);
          ws.terminate();
          return;
        }
        isAlive = false;
        ws.ping();
      }, 30000); // Ping every 30 seconds

      ws.on('pong', () => {
        isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        logger.info('🔌 WebSocket client disconnected');
        clearInterval(pingInterval);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        clearInterval(pingInterval);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Dixi WebSocket server',
        timestamp: Date.now()
      }));
    });
  }

  private handleMessage(ws: WebSocket, data: any) {
    logger.debug('📨 Received WebSocket message', { type: data.type });
    
    // Echo back for now (can be extended)
    ws.send(JSON.stringify({
      type: 'ack',
      originalType: data.type,
      timestamp: Date.now()
    }));
  }

  public broadcastGesture(gesture: GestureData) {
    const message = JSON.stringify({
      type: 'gesture',
      data: gesture
    });

    let successCount = 0;
    let errorCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('Failed to send gesture to client:', error);
          // Remove client if send fails
          this.clients.delete(client);
          try {
            client.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
      } else {
        // Remove clients that are not open
        this.clients.delete(client);
      }
    });

    if (errorCount > 0) {
      logger.warn(`Broadcast gesture: ${successCount} sent, ${errorCount} failed`);
    }
  }

  public broadcastAIResponse(response: AIResponse) {
    const message = JSON.stringify({
      type: 'ai_response',
      data: response
    });

    let successCount = 0;
    let errorCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('Failed to send AI response to client:', error);
          // Remove client if send fails
          this.clients.delete(client);
          try {
            client.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
      } else {
        // Remove clients that are not open
        this.clients.delete(client);
      }
    });

    if (errorCount > 0) {
      logger.warn(`Broadcast AI response: ${successCount} sent, ${errorCount} failed`);
    }
  }

  public broadcastFace(face: FaceData) {
    const message = JSON.stringify({
      type: 'face',
      data: face
    });

    let successCount = 0;
    let errorCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('Failed to send face data to client:', error);
          // Remove client if send fails
          this.clients.delete(client);
          try {
            client.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
      } else {
        // Remove clients that are not open
        this.clients.delete(client);
      }
    });

    if (errorCount > 0) {
      logger.warn(`Broadcast face: ${successCount} sent, ${errorCount} failed`);
    }
  }

  public broadcastTracking(tracking: TrackingData) {
    const message = JSON.stringify({
      type: 'tracking',
      data: tracking
    });

    let successCount = 0;
    let errorCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('Failed to send tracking data to client:', error);
          // Remove client if send fails
          this.clients.delete(client);
          try {
            client.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
      } else {
        // Remove clients that are not open
        this.clients.delete(client);
      }
    });

    if (errorCount > 0) {
      logger.warn(`Broadcast tracking: ${successCount} sent, ${errorCount} failed`);
    }
  }

  public broadcastProjection(data: any) {
    const message = JSON.stringify({
      type: 'projection',
      data
    });

    let successCount = 0;
    let errorCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('Failed to send projection to client:', error);
          // Remove client if send fails
          this.clients.delete(client);
          try {
            client.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
      } else {
        // Remove clients that are not open
        this.clients.delete(client);
      }
    });

    if (errorCount > 0) {
      logger.warn(`Broadcast projection: ${successCount} sent, ${errorCount} failed`);
    }
  }

  public broadcastProjectorGesture(gesture: ProjectorGestureData) {
    // Guard against malformed payloads
    if (!gesture || typeof gesture.position?.x !== 'number' || typeof gesture.position?.y !== 'number') {
      logger.warn('Invalid projector gesture payload, skipping broadcast');
      return;
    }

    // Clamp position values to valid range
    const clampedGesture: ProjectorGestureData = {
      ...gesture,
      position: {
        x: Math.max(0, Math.min(1, gesture.position.x)),
        y: Math.max(0, Math.min(1, gesture.position.y)),
        z: gesture.position.z
      },
      isPinching: gesture.isPinching ?? gesture.type === 'pinch',
      source: 'projector',
      coordinate_space: 'projector'
    };

    const message = JSON.stringify({
      type: 'projector_gesture',
      data: clampedGesture
    });

    let successCount = 0;
    let errorCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('Failed to send projector gesture to client:', error);
          this.clients.delete(client);
          try {
            client.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
      } else {
        this.clients.delete(client);
      }
    });

    if (errorCount > 0) {
      logger.warn(`Broadcast projector gesture: ${successCount} sent, ${errorCount} failed`);
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getClients(): Array<{ id: string; connectedAt: number; lastActivity: number }> {
    // Return basic client info (WebSocket doesn't have built-in IDs, so we generate placeholders)
    const clientList: Array<{ id: string; connectedAt: number; lastActivity: number }> = [];
    let index = 0;
    this.clients.forEach(() => {
      clientList.push({
        id: `client-${index++}`,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      });
    });
    return clientList;
  }
}
