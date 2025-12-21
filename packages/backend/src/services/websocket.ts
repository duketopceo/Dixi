import { Server, WebSocket } from 'ws';

export interface GestureData {
  type: string;
  position: { x: number; y: number; z?: number };
  confidence: number;
  timestamp: number;
}

export interface AIResponse {
  query: string;
  response: string;
  metadata?: any;
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
      console.log('🔌 New WebSocket client connected');
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
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
    console.log('📨 Received message:', data.type);
    
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

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public broadcastAIResponse(response: AIResponse) {
    const message = JSON.stringify({
      type: 'ai_response',
      data: response
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public broadcastProjection(data: any) {
    const message = JSON.stringify({
      type: 'projection',
      data
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}
