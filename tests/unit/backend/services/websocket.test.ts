/**
 * WebSocket Service Tests
 * 
 * Note: These tests mock the WebSocket behavior since we can't
 * create actual WebSocket connections in unit tests.
 */

// Mock the ws module
jest.mock('ws', () => {
  return {
    WebSocketServer: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      clients: new Set(),
      close: jest.fn()
    })),
    WebSocket: {
      OPEN: 1,
      CLOSED: 3
    }
  };
});

import { WebSocketService } from '../../../../packages/backend/src/services/websocket';

describe('WebSocketService', () => {
  let wsService: WebSocketService;
  let mockClients: Set<any>;

  beforeEach(() => {
    mockClients = new Set();
    wsService = new WebSocketService(3002);
    
    // Access internal clients for testing
    (wsService as any).clients = mockClients;
  });

  afterEach(() => {
    mockClients.clear();
  });

  describe('broadcastGestureUpdate', () => {
    it('should broadcast to all connected clients', () => {
      const mockClient1 = { 
        readyState: 1, // WebSocket.OPEN
        send: jest.fn() 
      };
      const mockClient2 = { 
        readyState: 1,
        send: jest.fn() 
      };
      
      mockClients.add(mockClient1);
      mockClients.add(mockClient2);

      const gestureData = {
        type: 'wave',
        position: { x: 0.5, y: 0.5, z: 0 },
        confidence: 0.85
      };

      wsService.broadcastGestureUpdate(gestureData);

      expect(mockClient1.send).toHaveBeenCalled();
      expect(mockClient2.send).toHaveBeenCalled();
      
      const sentData = JSON.parse(mockClient1.send.mock.calls[0][0]);
      expect(sentData.type).toBe('gesture_update');
      expect(sentData.data).toEqual(gestureData);
    });

    it('should handle disconnected clients gracefully', () => {
      const connectedClient = { 
        readyState: 1, // OPEN
        send: jest.fn() 
      };
      const disconnectedClient = { 
        readyState: 3, // CLOSED
        send: jest.fn() 
      };
      
      mockClients.add(connectedClient);
      mockClients.add(disconnectedClient);

      const gestureData = { type: 'wave', confidence: 0.85 };

      // Should not throw
      expect(() => wsService.broadcastGestureUpdate(gestureData)).not.toThrow();
      
      expect(connectedClient.send).toHaveBeenCalled();
      expect(disconnectedClient.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', () => {
      const errorClient = { 
        readyState: 1,
        send: jest.fn().mockImplementation(() => {
          throw new Error('Send failed');
        })
      };
      
      mockClients.add(errorClient);

      const gestureData = { type: 'wave', confidence: 0.85 };

      // Should not throw even when client.send fails
      expect(() => wsService.broadcastGestureUpdate(gestureData)).not.toThrow();
    });
  });

  describe('broadcastAIResponse', () => {
    it('should broadcast AI responses', () => {
      const mockClient = { 
        readyState: 1,
        send: jest.fn() 
      };
      
      mockClients.add(mockClient);

      const aiResponse = {
        query: 'What is 2+2?',
        response: '4',
        metadata: { model: 'gemma3:4b' },
        timestamp: Date.now()
      };

      wsService.broadcastAIResponse(aiResponse);

      expect(mockClient.send).toHaveBeenCalled();
      
      const sentData = JSON.parse(mockClient.send.mock.calls[0][0]);
      expect(sentData.type).toBe('ai_response');
      expect(sentData.data.response).toBe('4');
    });

    it('should include metadata correctly', () => {
      const mockClient = { 
        readyState: 1,
        send: jest.fn() 
      };
      
      mockClients.add(mockClient);

      const aiResponse = {
        query: 'Test',
        response: 'Response',
        metadata: { 
          analysisType: 'manual',
          streaming: false,
          gestureCount: 5
        },
        timestamp: Date.now()
      };

      wsService.broadcastAIResponse(aiResponse);

      const sentData = JSON.parse(mockClient.send.mock.calls[0][0]);
      expect(sentData.data.metadata.analysisType).toBe('manual');
      expect(sentData.data.metadata.gestureCount).toBe(5);
    });
  });

  describe('Connection Management', () => {
    it('should track connected client count', () => {
      expect(wsService.getClientCount()).toBe(0);
      
      mockClients.add({ readyState: 1, send: jest.fn() });
      expect(wsService.getClientCount()).toBe(1);
      
      mockClients.add({ readyState: 1, send: jest.fn() });
      expect(wsService.getClientCount()).toBe(2);
    });

    it('should handle client disconnect', () => {
      const client = { readyState: 1, send: jest.fn() };
      mockClients.add(client);
      
      expect(wsService.getClientCount()).toBe(1);
      
      mockClients.delete(client);
      expect(wsService.getClientCount()).toBe(0);
    });

    it('should handle rapid connect/disconnect', () => {
      // Simulate 20 rapid connections/disconnections
      for (let i = 0; i < 20; i++) {
        const client = { readyState: 1, send: jest.fn() };
        mockClients.add(client);
        
        // Simulate some staying connected, some disconnecting
        if (i % 2 === 0) {
          mockClients.delete(client);
        }
      }
      
      // Should have 10 clients remaining
      expect(wsService.getClientCount()).toBe(10);
    });
  });

  describe('Broadcast to Multiple Clients', () => {
    it('should broadcast simultaneously to multiple clients', () => {
      const clients: any[] = [];
      for (let i = 0; i < 10; i++) {
        const client = { readyState: 1, send: jest.fn() };
        clients.push(client);
        mockClients.add(client);
      }

      const data = { type: 'wave', confidence: 0.85 };
      wsService.broadcastGestureUpdate(data);

      clients.forEach(client => {
        expect(client.send).toHaveBeenCalledTimes(1);
      });
    });
  });
});

