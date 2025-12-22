/**
 * Gesture Recorder Service
 * 
 * Records and replays gesture sequences for testing and demonstration.
 */

interface GestureEvent {
  type: string;
  position: { x: number; y: number };
  confidence?: number;
  timestamp: number;
}

interface GestureRecording {
  id: string;
  name: string;
  events: GestureEvent[];
  createdAt: number;
  duration: number; // in milliseconds
}

export class GestureRecorderService {
  private recordings: Map<string, GestureRecording>;
  private activeRecording: GestureEvent[] | null = null;
  private recordingStartTime: number | null = null;

  constructor() {
    this.recordings = new Map();
  }

  /**
   * Start recording gestures
   */
  startRecording(name?: string): string {
    if (this.activeRecording !== null) {
      throw new Error('Recording already in progress');
    }

    this.activeRecording = [];
    this.recordingStartTime = Date.now();

    return `recording_${Date.now()}`;
  }

  /**
   * Record a gesture event
   */
  recordGesture(gesture: {
    type: string;
    position: { x: number; y: number };
    confidence?: number;
  }): void {
    if (this.activeRecording === null) {
      return; // Not recording, ignore
    }

    this.activeRecording.push({
      type: gesture.type,
      position: gesture.position,
      confidence: gesture.confidence,
      timestamp: Date.now() - (this.recordingStartTime || 0),
    });
  }

  /**
   * Stop recording and save
   */
  stopRecording(name?: string): GestureRecording {
    if (this.activeRecording === null) {
      throw new Error('No active recording');
    }

    const duration = Date.now() - (this.recordingStartTime || 0);
    const recording: GestureRecording = {
      id: `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Recording_${Date.now()}`,
      events: [...this.activeRecording],
      createdAt: Date.now(),
      duration,
    };

    this.recordings.set(recording.id, recording);
    this.activeRecording = null;
    this.recordingStartTime = null;

    return recording;
  }

  /**
   * Get all recordings
   */
  getRecordings(): GestureRecording[] {
    return Array.from(this.recordings.values());
  }

  /**
   * Get specific recording
   */
  getRecording(id: string): GestureRecording | null {
    return this.recordings.get(id) || null;
  }

  /**
   * Delete recording
   */
  deleteRecording(id: string): boolean {
    return this.recordings.delete(id);
  }

  /**
   * Export recording as JSON
   */
  exportRecording(id: string): string | null {
    const recording = this.recordings.get(id);
    if (!recording) return null;

    return JSON.stringify(recording, null, 2);
  }

  /**
   * Import recording from JSON
   */
  importRecording(json: string): GestureRecording {
    try {
      const recording: GestureRecording = JSON.parse(json);
      
      // Validate structure
      if (!recording.id || !recording.events || !Array.isArray(recording.events)) {
        throw new Error('Invalid recording format');
      }

      // Generate new ID to avoid conflicts
      recording.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      recording.createdAt = Date.now();

      this.recordings.set(recording.id, recording);
      return recording;
    } catch (error) {
      throw new Error(`Failed to import recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.activeRecording !== null;
  }

  /**
   * Get active recording info
   */
  getActiveRecordingInfo(): { eventCount: number; duration: number } | null {
    if (this.activeRecording === null) return null;

    return {
      eventCount: this.activeRecording.length,
      duration: Date.now() - (this.recordingStartTime || 0),
    };
  }
}

// Singleton instance
export const gestureRecorder = new GestureRecorderService();

