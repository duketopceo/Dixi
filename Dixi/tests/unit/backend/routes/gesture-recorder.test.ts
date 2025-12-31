import request from 'supertest';
import express, { Express } from 'express';

// Mock gesture recorder service
jest.mock('../../../../packages/backend/src/services/gestureRecorder', () => ({
  gestureRecorder: {
    isRecording: jest.fn(() => false),
    startRecording: jest.fn((name?: string) => `recording_${Date.now()}`),
    stopRecording: jest.fn((name?: string) => ({
      id: 'test-recording-id',
      name: name || 'Test Recording',
      events: [
        { type: 'point', position: { x: 0.5, y: 0.5 }, timestamp: 0 },
      ],
      createdAt: Date.now(),
      duration: 1000,
    })),
    getRecordings: jest.fn(() => [
      {
        id: 'recording-1',
        name: 'Recording 1',
        events: [],
        createdAt: Date.now(),
        duration: 500,
      },
    ]),
    getRecording: jest.fn((id: string) => {
      if (id === 'test-recording-id') {
        return {
          id: 'test-recording-id',
          name: 'Test Recording',
          events: [],
          createdAt: Date.now(),
          duration: 1000,
        };
      }
      return null;
    }),
    deleteRecording: jest.fn((id: string) => id === 'test-recording-id'),
  },
}));

// Import after mocking
import gestureRecorderRouter from '../../../../packages/backend/src/routes/gesture-recorder';

describe('Gesture Recorder Routes', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/gestures', gestureRecorderRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/gestures/record/start', () => {
    it('should start recording', async () => {
      const response = await request(app)
        .post('/api/gestures/record/start')
        .send({ name: 'Test Recording' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('recordingId');
    });

    it('should return error if already recording', async () => {
      const { gestureRecorder } = require('../../../../packages/backend/src/services/gestureRecorder');
      gestureRecorder.isRecording.mockReturnValueOnce(true);

      const response = await request(app)
        .post('/api/gestures/record/start');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already in progress');
    });
  });

  describe('POST /api/gestures/record/stop', () => {
    it('should stop recording', async () => {
      const { gestureRecorder } = require('../../../../packages/backend/src/services/gestureRecorder');
      gestureRecorder.isRecording.mockReturnValueOnce(true);

      const response = await request(app)
        .post('/api/gestures/record/stop')
        .send({ name: 'Final Recording' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('recording');
    });

    it('should return error if not recording', async () => {
      const { gestureRecorder } = require('../../../../packages/backend/src/services/gestureRecorder');
      gestureRecorder.isRecording.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/gestures/record/stop');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No active recording');
    });
  });

  describe('GET /api/gestures/recordings', () => {
    it('should list all recordings', async () => {
      const response = await request(app).get('/api/gestures/recordings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recordings');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.recordings)).toBe(true);
    });
  });

  describe('GET /api/gestures/recordings/:id', () => {
    it('should return specific recording', async () => {
      const response = await request(app).get('/api/gestures/recordings/test-recording-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recording');
      expect(response.body.recording.id).toBe('test-recording-id');
    });

    it('should return 404 for non-existent recording', async () => {
      const { gestureRecorder } = require('../../../../packages/backend/src/services/gestureRecorder');
      gestureRecorder.getRecording.mockReturnValueOnce(null);

      const response = await request(app).get('/api/gestures/recordings/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Recording not found');
    });
  });

  describe('POST /api/gestures/recordings/:id/play', () => {
    it('should return not implemented message', async () => {
      const response = await request(app)
        .post('/api/gestures/recordings/test-recording-id/play');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('not yet implemented');
    });
  });

  describe('DELETE /api/gestures/recordings/:id', () => {
    it('should delete recording', async () => {
      const response = await request(app)
        .delete('/api/gestures/recordings/test-recording-id');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent recording', async () => {
      const { gestureRecorder } = require('../../../../packages/backend/src/services/gestureRecorder');
      gestureRecorder.deleteRecording.mockReturnValueOnce(false);

      const response = await request(app)
        .delete('/api/gestures/recordings/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Recording not found');
    });
  });
});

