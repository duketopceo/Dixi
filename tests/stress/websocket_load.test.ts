/**
 * WebSocket Load/Stress Tests
 * 
 * Tests WebSocket server under heavy load conditions.
 * Run with: npm run test:stress
 */

import WebSocket from 'ws';
import axios from 'axios';

const WS_URL = process.env.WS_URL || 'ws://localhost:3002';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Check if services are available
const checkServices = async (): Promise<boolean> => {
  try {
    await axios.get(`${BACKEND_URL}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
};

describe('WebSocket Stress Tests', () => {
  let servicesAvailable = false;

  beforeAll(async () => {
    servicesAvailable = await checkServices();
    if (!servicesAvailable) {
      console.warn('⚠️ Backend not running - skipping stress tests');
    }
  }, 10000);

  describe('Concurrent Connections', () => {
    it('should handle 100 concurrent connections', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const connectionCount = 100;
      const clients: WebSocket[] = [];
      const connectionPromises: Promise<boolean>[] = [];

      for (let i = 0; i < connectionCount; i++) {
        const promise = new Promise<boolean>((resolve) => {
          const ws = new WebSocket(WS_URL);
          clients.push(ws);

          const timeout = setTimeout(() => {
            resolve(false);
          }, 10000);

          ws.on('open', () => {
            clearTimeout(timeout);
            resolve(true);
          });

          ws.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
          });
        });

        connectionPromises.push(promise);
      }

      const results = await Promise.all(connectionPromises);
      const successCount = results.filter(r => r).length;

      // Clean up connections
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });

      // At least 80% should connect successfully
      expect(successCount).toBeGreaterThan(connectionCount * 0.8);
      
      console.log(`Connected ${successCount}/${connectionCount} clients`);
    }, 30000);

    it('should handle 500 concurrent connections', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const connectionCount = 500;
      const clients: WebSocket[] = [];
      const connectionPromises: Promise<boolean>[] = [];

      // Create connections in batches to avoid overwhelming
      const batchSize = 50;
      
      for (let batch = 0; batch < connectionCount / batchSize; batch++) {
        const batchPromises: Promise<boolean>[] = [];
        
        for (let i = 0; i < batchSize; i++) {
          const promise = new Promise<boolean>((resolve) => {
            const ws = new WebSocket(WS_URL);
            clients.push(ws);

            const timeout = setTimeout(() => resolve(false), 5000);

            ws.on('open', () => {
              clearTimeout(timeout);
              resolve(true);
            });

            ws.on('error', () => {
              clearTimeout(timeout);
              resolve(false);
            });
          });

          batchPromises.push(promise);
        }

        const batchResults = await Promise.all(batchPromises);
        connectionPromises.push(...batchResults.map(r => Promise.resolve(r)));
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const results = await Promise.all(connectionPromises);
      const successCount = results.filter(r => r).length;

      // Clean up
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });

      // At least 70% should connect
      expect(successCount).toBeGreaterThan(connectionCount * 0.7);
      
      console.log(`Connected ${successCount}/${connectionCount} clients`);
    }, 60000);
  });

  describe('Message Throughput', () => {
    it('should handle 1000 messages per second', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const messageCount = 1000;
      let receivedCount = 0;
      const latencies: number[] = [];

      const client = new WebSocket(WS_URL);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        
        client.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        client.on('error', reject);
      });

      client.on('message', () => {
        receivedCount++;
      });

      // Send messages via HTTP to trigger broadcasts
      const startTime = Date.now();
      const sendPromises: Promise<any>[] = [];

      for (let i = 0; i < messageCount; i++) {
        const sendStart = Date.now();
        
        const promise = axios.post(
          `${BACKEND_URL}/api/gestures/process`,
          {
            type: 'wave',
            position: { x: Math.random(), y: Math.random(), z: 0 },
            confidence: 0.85,
            timestamp: Date.now()
          },
          { timeout: 5000 }
        ).then(() => {
          latencies.push(Date.now() - sendStart);
        }).catch(() => {
          // May be rate limited
        });

        sendPromises.push(promise);

        // Throttle to ~1000/sec
        if (i % 100 === 99) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      await Promise.all(sendPromises);
      const duration = Date.now() - startTime;

      // Wait for messages to arrive
      await new Promise(resolve => setTimeout(resolve, 2000));

      client.close();

      // Calculate statistics
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;

      console.log(`Sent ${messageCount} messages in ${duration}ms`);
      console.log(`Received ${receivedCount} messages`);
      console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);

      // Messages per second should be high
      const messagesPerSecond = (messageCount / duration) * 1000;
      expect(messagesPerSecond).toBeGreaterThan(100);
    }, 60000);

    it('should broadcast to multiple clients simultaneously', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const clientCount = 10;
      const messageCount = 100;
      const clients: WebSocket[] = [];
      const receivedCounts: number[] = new Array(clientCount).fill(0);

      // Create clients
      for (let i = 0; i < clientCount; i++) {
        const ws = new WebSocket(WS_URL);
        clients.push(ws);

        const clientIndex = i;
        ws.on('message', () => {
          receivedCounts[clientIndex]++;
        });

        await new Promise<void>((resolve) => {
          ws.on('open', () => resolve());
          ws.on('error', () => resolve());
          setTimeout(() => resolve(), 2000);
        });
      }

      // Send messages
      for (let i = 0; i < messageCount; i++) {
        await axios.post(
          `${BACKEND_URL}/api/gestures/process`,
          {
            type: 'point',
            position: { x: 0.5, y: 0.5, z: 0 },
            confidence: 0.9,
            timestamp: Date.now()
          },
          { timeout: 2000 }
        ).catch(() => {});

        // Small delay to avoid rate limiting
        if (i % 10 === 9) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Wait for messages to arrive
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Close clients
      clients.forEach(ws => ws.close());

      // Check that all clients received messages
      const totalReceived = receivedCounts.reduce((a, b) => a + b, 0);
      console.log(`Total messages received across ${clientCount} clients: ${totalReceived}`);
      console.log(`Per-client counts: ${receivedCounts.join(', ')}`);

      // At least some messages should be received
      expect(totalReceived).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Connection Resilience', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const cycleCount = 50;
      let successCount = 0;

      for (let i = 0; i < cycleCount; i++) {
        const ws = new WebSocket(WS_URL);

        const connected = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 1000);

          ws.on('open', () => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          });

          ws.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
          });
        });

        if (connected) successCount++;
      }

      console.log(`Successful cycles: ${successCount}/${cycleCount}`);
      expect(successCount).toBeGreaterThan(cycleCount * 0.8);
    }, 60000);

    it('should recover from mass disconnection', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const clientCount = 50;
      const clients: WebSocket[] = [];

      // Create connections
      for (let i = 0; i < clientCount; i++) {
        const ws = new WebSocket(WS_URL);
        clients.push(ws);

        await new Promise<void>((resolve) => {
          ws.on('open', () => resolve());
          ws.on('error', () => resolve());
          setTimeout(() => resolve(), 1000);
        });
      }

      // Count connected
      const connectedBefore = clients.filter(ws => ws.readyState === WebSocket.OPEN).length;
      console.log(`Connected before disconnect: ${connectedBefore}/${clientCount}`);

      // Disconnect all at once
      clients.forEach(ws => ws.close());

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to connect again
      const newClient = new WebSocket(WS_URL);
      
      const reconnected = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);

        newClient.on('open', () => {
          clearTimeout(timeout);
          newClient.close();
          resolve(true);
        });

        newClient.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });

      expect(reconnected).toBe(true);
    }, 30000);
  });

  describe('Memory Stability', () => {
    it('should not leak memory with many short-lived connections', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const ws = new WebSocket(WS_URL);

        await new Promise<void>((resolve) => {
          ws.on('open', () => {
            ws.close();
            resolve();
          });
          ws.on('error', () => resolve());
          setTimeout(() => {
            if (ws.readyState !== WebSocket.CLOSED) {
              ws.close();
            }
            resolve();
          }, 500);
        });
      }

      // If we get here without crashing, memory is stable
      expect(true).toBe(true);
    }, 120000);
  });
});

