import { GestureRecorderService, gestureRecorder } from '../../../../packages/backend/src/services/gestureRecorder';

describe('Gesture Recorder Service', () => {
  let recorder: GestureRecorderService;

  beforeEach(() => {
    recorder = new GestureRecorderService();
  });

  describe('startRecording', () => {
    it('should start a new recording', () => {
      const recordingId = recorder.startRecording('Test Recording');
      expect(recordingId).toBeDefined();
      expect(recorder.isRecording()).toBe(true);
    });

    it('should throw error if recording already in progress', () => {
      recorder.startRecording();
      expect(() => recorder.startRecording()).toThrow('Recording already in progress');
    });
  });

  describe('recordGesture', () => {
    it('should record gesture events', () => {
      recorder.startRecording();
      recorder.recordGesture({
        type: 'point',
        position: { x: 0.5, y: 0.5 },
        confidence: 0.8,
      });

      const info = recorder.getActiveRecordingInfo();
      expect(info?.eventCount).toBe(1);
    });

    it('should ignore gestures when not recording', () => {
      recorder.recordGesture({
        type: 'point',
        position: { x: 0.5, y: 0.5 },
      });

      expect(recorder.isRecording()).toBe(false);
    });

    it('should record multiple gestures with timestamps', () => {
      recorder.startRecording();
      recorder.recordGesture({ type: 'point', position: { x: 0.5, y: 0.5 } });
      
      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        recorder.recordGesture({ type: 'pinch', position: { x: 0.6, y: 0.6 } });
        const info = recorder.getActiveRecordingInfo();
        expect(info?.eventCount).toBe(2);
      }, 10);
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and return recording object', () => {
      recorder.startRecording('Test');
      recorder.recordGesture({ type: 'point', position: { x: 0.5, y: 0.5 } });
      
      const recording = recorder.stopRecording('Test Recording');
      
      expect(recording).toBeDefined();
      expect(recording.name).toBe('Test Recording');
      expect(recording.events).toHaveLength(1);
      expect(recording.id).toBeDefined();
      expect(recording.duration).toBeGreaterThanOrEqual(0);
      expect(recorder.isRecording()).toBe(false);
    });

    it('should throw error if no active recording', () => {
      expect(() => recorder.stopRecording()).toThrow('No active recording');
    });
  });

  describe('getRecordings', () => {
    it('should return all saved recordings', () => {
      recorder.startRecording();
      recorder.recordGesture({ type: 'point', position: { x: 0.5, y: 0.5 } });
      const recording1 = recorder.stopRecording('Recording 1');

      recorder.startRecording();
      recorder.recordGesture({ type: 'pinch', position: { x: 0.6, y: 0.6 } });
      const recording2 = recorder.stopRecording('Recording 2');

      const recordings = recorder.getRecordings();
      expect(recordings.length).toBeGreaterThanOrEqual(2);
      expect(recordings.some((r) => r.id === recording1.id)).toBe(true);
      expect(recordings.some((r) => r.id === recording2.id)).toBe(true);
    });
  });

  describe('getRecording', () => {
    it('should return specific recording by id', () => {
      recorder.startRecording();
      recorder.recordGesture({ type: 'point', position: { x: 0.5, y: 0.5 } });
      const recording = recorder.stopRecording('Test');

      const retrieved = recorder.getRecording(recording.id);
      expect(retrieved).toEqual(recording);
    });

    it('should return null for non-existent id', () => {
      expect(recorder.getRecording('non-existent')).toBeNull();
    });
  });

  describe('deleteRecording', () => {
    it('should delete recording by id', () => {
      recorder.startRecording();
      recorder.recordGesture({ type: 'point', position: { x: 0.5, y: 0.5 } });
      const recording = recorder.stopRecording('Test');

      const deleted = recorder.deleteRecording(recording.id);
      expect(deleted).toBe(true);
      expect(recorder.getRecording(recording.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      expect(recorder.deleteRecording('non-existent')).toBe(false);
    });
  });

  describe('exportRecording', () => {
    it('should export recording as JSON string', () => {
      recorder.startRecording();
      recorder.recordGesture({ type: 'point', position: { x: 0.5, y: 0.5 } });
      const recording = recorder.stopRecording('Test');

      const json = recorder.exportRecording(recording.id);
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json!);
      expect(parsed.id).toBe(recording.id);
      expect(parsed.events).toHaveLength(1);
    });

    it('should return null for non-existent id', () => {
      expect(recorder.exportRecording('non-existent')).toBeNull();
    });
  });

  describe('importRecording', () => {
    it('should import recording from JSON', () => {
      const json = JSON.stringify({
        id: 'test-id',
        name: 'Imported Recording',
        events: [
          { type: 'point', position: { x: 0.5, y: 0.5 }, timestamp: 0 },
        ],
        createdAt: Date.now(),
        duration: 1000,
      });

      const imported = recorder.importRecording(json);
      expect(imported).toBeDefined();
      expect(imported.name).toBe('Imported Recording');
      expect(imported.events).toHaveLength(1);
      expect(imported.id).not.toBe('test-id'); // Should generate new ID
    });

    it('should throw error for invalid JSON', () => {
      expect(() => recorder.importRecording('invalid json')).toThrow();
    });

    it('should throw error for invalid recording format', () => {
      const invalid = JSON.stringify({ invalid: 'format' });
      expect(() => recorder.importRecording(invalid)).toThrow('Invalid recording format');
    });
  });

  describe('isRecording', () => {
    it('should return false when not recording', () => {
      expect(recorder.isRecording()).toBe(false);
    });

    it('should return true when recording', () => {
      recorder.startRecording();
      expect(recorder.isRecording()).toBe(true);
      recorder.stopRecording();
      expect(recorder.isRecording()).toBe(false);
    });
  });

  describe('getActiveRecordingInfo', () => {
    it('should return null when not recording', () => {
      expect(recorder.getActiveRecordingInfo()).toBeNull();
    });

    it('should return recording info when active', () => {
      recorder.startRecording();
      recorder.recordGesture({ type: 'point', position: { x: 0.5, y: 0.5 } });

      const info = recorder.getActiveRecordingInfo();
      expect(info).toBeDefined();
      expect(info?.eventCount).toBe(1);
      expect(info?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('gestureRecorder singleton', () => {
    it('should be an instance of GestureRecorderService', () => {
      expect(gestureRecorder).toBeInstanceOf(GestureRecorderService);
    });
  });
});

