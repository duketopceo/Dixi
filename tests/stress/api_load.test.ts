/**
 * API Load/Stress Tests
 * 
 * Tests HTTP endpoints under heavy load conditions.
 * Run with: npm run test:stress
 */

import axios from 'axios';

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

describe('API Stress Tests', () => {
  let servicesAvailable = false;

  beforeAll(async () => {
    servicesAvailable = await checkServices();
    if (!servicesAvailable) {
      console.warn('⚠️ Backend not running - skipping stress tests');
    }
  }, 10000);

  describe('Health Endpoint Load', () => {
    it('should handle 500 concurrent health checks', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const requestCount = 500;
      const requests = Array(requestCount).fill(null).map(() =>
        axios.get(`${BACKEND_URL}/health`, { timeout: 10000 })
          .then(r => ({ status: r.status, success: true }))
          .catch(e => ({ status: e.response?.status || 0, success: false }))
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const successCount = results.filter(r => r.success && r.status === 200).length;
      const requestsPerSecond = (requestCount / duration) * 1000;

      console.log(`Completed ${requestCount} requests in ${duration}ms`);
      console.log(`Success rate: ${successCount}/${requestCount} (${(successCount/requestCount*100).toFixed(1)}%)`);
      console.log(`Requests/second: ${requestsPerSecond.toFixed(1)}`);

      // At least 90% should succeed
      expect(successCount).toBeGreaterThan(requestCount * 0.9);
    }, 30000);
  });

  describe('Gesture Endpoint Load', () => {
    it('should handle 200 concurrent gesture submissions', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const requestCount = 200;
      const requests = Array(requestCount).fill(null).map((_, i) =>
        axios.post(
          `${BACKEND_URL}/api/gestures/process`,
          {
            type: i % 2 === 0 ? 'wave' : 'point',
            position: { x: Math.random(), y: Math.random(), z: 0 },
            confidence: 0.8 + Math.random() * 0.2,
            timestamp: Date.now() + i
          },
          { timeout: 10000 }
        )
          .then(r => ({ status: r.status, success: true }))
          .catch(e => ({ status: e.response?.status || 0, success: false }))
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const successCount = results.filter(r => r.success).length;
      const rateLimitedCount = results.filter(r => r.status === 429).length;

      console.log(`Completed ${requestCount} requests in ${duration}ms`);
      console.log(`Success: ${successCount}, Rate Limited: ${rateLimitedCount}`);

      // All should complete (200 OK or 429 Rate Limited)
      const completedCount = results.filter(r => r.status === 200 || r.status === 429).length;
      expect(completedCount).toBeGreaterThan(requestCount * 0.8);
    }, 30000);

    it('should handle sustained load over 10 seconds', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const duration = 10000; // 10 seconds
      const requestsPerSecond = 20;
      const results: { status: number; latency: number }[] = [];

      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        const batchStart = Date.now();

        const batch = Array(requestsPerSecond).fill(null).map(() => {
          const reqStart = Date.now();
          return axios.post(
            `${BACKEND_URL}/api/gestures/process`,
            {
              type: 'wave',
              position: { x: 0.5, y: 0.5, z: 0 },
              confidence: 0.85,
              timestamp: Date.now()
            },
            { timeout: 5000 }
          )
            .then(r => ({ status: r.status, latency: Date.now() - reqStart }))
            .catch(e => ({ status: e.response?.status || 0, latency: Date.now() - reqStart }));
        });

        const batchResults = await Promise.all(batch);
        results.push(...batchResults);

        // Wait for the rest of the second
        const elapsed = Date.now() - batchStart;
        if (elapsed < 1000) {
          await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
        }
      }

      const successCount = results.filter(r => r.status === 200).length;
      const avgLatency = results.reduce((a, b) => a + b.latency, 0) / results.length;
      const maxLatency = Math.max(...results.map(r => r.latency));

      console.log(`Total requests: ${results.length}`);
      console.log(`Success rate: ${(successCount/results.length*100).toFixed(1)}%`);
      console.log(`Average latency: ${avgLatency.toFixed(1)}ms`);
      console.log(`Max latency: ${maxLatency}ms`);

      // Average latency should be reasonable
      expect(avgLatency).toBeLessThan(5000);
    }, 60000);
  });

  describe('AI Endpoint Load', () => {
    it('should handle 10 concurrent AI queries', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const requestCount = 10;
      const requests = Array(requestCount).fill(null).map((_, i) =>
        axios.post(
          `${BACKEND_URL}/api/ai/infer`,
          { query: `Quick question ${i}: What is ${i}+${i}?` },
          { timeout: 60000 }
        )
          .then(r => ({ status: r.status, success: true, hasResponse: !!r.data.response }))
          .catch(e => ({ status: e.response?.status || 0, success: false, hasResponse: false }))
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const successCount = results.filter(r => r.success && r.hasResponse).length;
      const rateLimitedCount = results.filter(r => r.status === 429).length;

      console.log(`Completed ${requestCount} AI queries in ${duration}ms`);
      console.log(`Success: ${successCount}, Rate Limited: ${rateLimitedCount}`);

      // Some should succeed (may be rate limited)
      expect(successCount + rateLimitedCount).toBeGreaterThan(0);
    }, 120000);

    it('should measure AI response times', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const latencies: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        
        try {
          await axios.post(
            `${BACKEND_URL}/api/ai/infer`,
            { query: 'Say hello in one word' },
            { timeout: 60000 }
          );
          
          latencies.push(Date.now() - start);
        } catch {
          // May fail or timeout
        }

        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (latencies.length > 0) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const minLatency = Math.min(...latencies);
        const maxLatency = Math.max(...latencies);

        console.log(`AI Response Times (${latencies.length} samples):`);
        console.log(`  Min: ${minLatency}ms`);
        console.log(`  Max: ${maxLatency}ms`);
        console.log(`  Avg: ${avgLatency.toFixed(1)}ms`);

        // AI responses should complete within timeout
        expect(avgLatency).toBeLessThan(30000);
      }
    }, 120000);
  });

  describe('Mixed Endpoint Load', () => {
    it('should handle mixed traffic patterns', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      const totalRequests = 100;
      const requests: Promise<{ type: string; status: number; success: boolean }>[] = [];

      for (let i = 0; i < totalRequests; i++) {
        const type = i % 3;
        
        let request: Promise<{ type: string; status: number; success: boolean }>;

        if (type === 0) {
          // Health check (30%)
          request = axios.get(`${BACKEND_URL}/health`, { timeout: 5000 })
            .then(r => ({ type: 'health', status: r.status, success: true }))
            .catch(e => ({ type: 'health', status: e.response?.status || 0, success: false }));
        } else if (type === 1) {
          // Gesture (30%)
          request = axios.post(
            `${BACKEND_URL}/api/gestures/process`,
            {
              type: 'wave',
              position: { x: 0.5, y: 0.5, z: 0 },
              confidence: 0.85,
              timestamp: Date.now()
            },
            { timeout: 5000 }
          )
            .then(r => ({ type: 'gesture', status: r.status, success: true }))
            .catch(e => ({ type: 'gesture', status: e.response?.status || 0, success: false }));
        } else {
          // AI status (40%)
          request = axios.get(`${BACKEND_URL}/api/ai/status`, { timeout: 5000 })
            .then(r => ({ type: 'ai-status', status: r.status, success: true }))
            .catch(e => ({ type: 'ai-status', status: e.response?.status || 0, success: false }));
        }

        requests.push(request);
      }

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // Group by type
      const byType = results.reduce((acc, r) => {
        if (!acc[r.type]) acc[r.type] = { success: 0, failed: 0 };
        if (r.success) acc[r.type].success++;
        else acc[r.type].failed++;
        return acc;
      }, {} as Record<string, { success: number; failed: number }>);

      console.log(`Mixed load test completed in ${duration}ms`);
      console.log('Results by type:');
      Object.entries(byType).forEach(([type, counts]) => {
        console.log(`  ${type}: ${counts.success} success, ${counts.failed} failed`);
      });

      // Overall success rate should be high
      const totalSuccess = results.filter(r => r.success).length;
      expect(totalSuccess).toBeGreaterThan(totalRequests * 0.7);
    }, 60000);
  });

  describe('Error Recovery', () => {
    it('should recover from burst of invalid requests', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      // Send burst of invalid requests
      const invalidRequests = Array(50).fill(null).map(() =>
        axios.post(
          `${BACKEND_URL}/api/ai/infer`,
          { /* missing query */ },
          { timeout: 5000 }
        )
          .then(r => ({ status: r.status, success: true }))
          .catch(e => ({ status: e.response?.status || 0, success: false }))
      );

      await Promise.all(invalidRequests);

      // Server should still respond to valid requests
      const validRequest = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      expect(validRequest.status).toBe(200);
    }, 30000);

    it('should handle request timeout gracefully', async () => {
      if (!servicesAvailable) {
        console.log('Skipping - services not available');
        return;
      }

      // Request with very short timeout
      const result = await axios.get(`${BACKEND_URL}/health`, { timeout: 1 })
        .then(r => ({ status: r.status, success: true }))
        .catch(e => ({ status: 0, success: false, error: e.code }));

      // Either succeeds or times out (ECONNABORTED)
      expect(result.success || result.error === 'ECONNABORTED').toBe(true);

      // Normal request should still work
      const normalResult = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      expect(normalResult.status).toBe(200);
    }, 10000);
  });
});

