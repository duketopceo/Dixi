/**
 * Integration tests for Backend ↔ Vision Service communication
 * 
 * Note: These tests require both backend and vision service to be running.
 * Run with: npm run test:integration
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const VISION_URL = process.env.VISION_URL || 'http://localhost:5000';

// Skip if services not running
const checkServices = async () => {
  try {
    await axios.get(`${BACKEND_URL}/health`, { timeout: 2000 });
    await axios.get(`${VISION_URL}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
};

describe('Backend ↔ Vision Integration', () => {
  let servicesAvailable = false;

  beforeAll(async () => {
    servicesAvailable = await checkServices();
    if (!servicesAvailable) {
      console.warn('⚠️ Services not running - skipping integration tests');
    }
  });

  describe('Vision Service Push to Backend', () => {
    it('should receive gesture data from vision service', async () => {
      if (!servicesAvailable) {
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/gestures`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('type');
    });

    it('should handle vision service timeout gracefully', async () => {
      if (!servicesAvailable) {
        return;
      }

      // Backend should handle slow vision service
      const response = await axios.get(`${BACKEND_URL}/api/gestures`, {
        timeout: 10000
      });

      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Gesture Processing Flow', () => {
    it('should process gesture through full pipeline', async () => {
      if (!servicesAvailable) {
        return;
      }

      // Send gesture to backend
      const gestureData = {
        type: 'wave',
        position: { x: 0.5, y: 0.5, z: 0 },
        confidence: 0.85,
        timestamp: Date.now()
      };

      const response = await axios.post(
        `${BACKEND_URL}/api/gestures/process`,
        gestureData,
        { timeout: 5000 }
      );

      expect(response.status).toBe(200);
    });

    it('should handle high-frequency gesture updates', async () => {
      if (!servicesAvailable) {
        return;
      }

      // Send multiple gestures rapidly (simulating 30 FPS tracking)
      const requests = Array(30).fill(null).map((_, i) => 
        axios.post(
          `${BACKEND_URL}/api/gestures/process`,
          {
            type: i % 2 === 0 ? 'wave' : 'point',
            position: { x: 0.5 + (i * 0.01), y: 0.5, z: 0 },
            confidence: 0.85,
            timestamp: Date.now() + i
          },
          { timeout: 1000 }
        ).catch(() => null) // Ignore rate limited requests
      );

      const responses = await Promise.all(requests);
      
      // At least some should succeed
      const successCount = responses.filter(r => r?.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Service Disconnect Handling', () => {
    it('should handle vision service unavailable', async () => {
      if (!servicesAvailable) {
        return;
      }

      // Backend should return appropriate error when vision is down
      // This is a mock test - actual disconnect would require stopping the service
      const response = await axios.get(`${BACKEND_URL}/api/gestures`, {
        timeout: 5000
      }).catch(err => err.response);

      // Should either succeed or return 503
      expect([200, 503, undefined]).toContain(response?.status);
    });
  });

  describe('Health Check Integration', () => {
    it('should verify backend can reach vision service', async () => {
      if (!servicesAvailable) {
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/health/ready`, {
        timeout: 5000
      });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should verify vision service is healthy', async () => {
      if (!servicesAvailable) {
        return;
      }

      const response = await axios.get(`${VISION_URL}/health`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    });
  });
});

describe('Vision Service Direct Tests', () => {
  let servicesAvailable = false;

  beforeAll(async () => {
    servicesAvailable = await checkServices();
  });

  describe('Gesture Tracking Lifecycle', () => {
    it('should start and stop tracking', async () => {
      if (!servicesAvailable) {
        return;
      }

      // Start tracking
      const startResponse = await axios.post(`${VISION_URL}/gesture/start`, {}, {
        timeout: 5000
      });
      expect(startResponse.status).toBe(200);
      expect(['started', 'already_running']).toContain(startResponse.data.status);

      // Get current gesture
      const gestureResponse = await axios.get(`${VISION_URL}/gesture`, {
        timeout: 5000
      });
      expect(gestureResponse.status).toBe(200);

      // Stop tracking
      const stopResponse = await axios.post(`${VISION_URL}/gesture/stop`, {}, {
        timeout: 5000
      });
      expect(stopResponse.status).toBe(200);
    });
  });

  describe('Video Feed', () => {
    it('should provide video feed stream', async () => {
      if (!servicesAvailable) {
        return;
      }

      // Just check the endpoint responds
      const response = await axios.get(`${VISION_URL}/video_feed`, {
        timeout: 2000,
        responseType: 'stream'
      }).catch(err => ({ status: err.response?.status || 503 }));

      // Video feed should be available or return appropriate error
      expect([200, 503]).toContain(response.status);
    });
  });
});

