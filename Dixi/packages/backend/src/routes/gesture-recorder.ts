import { Router, Request, Response } from 'express';
import { gestureRecorder } from '../services/gestureRecorder';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/gestures/record/start
 * Start recording gestures
 */
router.post('/record/start', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (gestureRecorder.isRecording()) {
      return res.status(400).json({
        error: 'Recording already in progress',
        details: 'Stop current recording before starting a new one',
      });
    }

    const recordingId = gestureRecorder.startRecording(name);
    
    logger.info('Gesture recording started', { recordingId, name });

    res.json({
      message: 'Recording started',
      recordingId,
    });
  } catch (error) {
    logger.error('Failed to start recording:', error);
    res.status(500).json({
      error: 'Failed to start recording',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/gestures/record/stop
 * Stop recording and save
 */
router.post('/record/stop', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!gestureRecorder.isRecording()) {
      return res.status(400).json({
        error: 'No active recording',
        details: 'Start a recording before stopping',
      });
    }

    const recording = gestureRecorder.stopRecording(name);
    
    logger.info('Gesture recording stopped', { recordingId: recording.id, eventCount: recording.events?.length || 0 });

    res.json({
      message: 'Recording stopped and saved',
      recording,
    });
  } catch (error) {
    logger.error('Failed to stop recording:', error);
    res.status(500).json({
      error: 'Failed to stop recording',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/gestures/recordings
 * List all recordings
 */
router.get('/recordings', (req: Request, res: Response) => {
  try {
    const recordings = gestureRecorder.getRecordings();

    res.json({
      message: 'Recordings retrieved successfully',
      recordings,
      count: recordings.length,
    });
  } catch (error) {
    logger.error('Failed to list recordings:', error);
    res.status(500).json({
      error: 'Failed to retrieve recordings',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/gestures/recordings/:id
 * Get specific recording
 */
router.get('/recordings/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recording = gestureRecorder.getRecording(id);

    if (!recording) {
      return res.status(404).json({
        error: 'Recording not found',
        details: `No recording found with id: ${id}`,
      });
    }

    res.json({
      message: 'Recording retrieved successfully',
      recording,
    });
  } catch (error) {
    logger.error('Failed to get recording:', error);
    res.status(500).json({
      error: 'Failed to retrieve recording',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/gestures/recordings/:id/play
 * Replay recording (placeholder - would need WebSocket integration)
 */
router.post('/recordings/:id/play', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recording = gestureRecorder.getRecording(id);

    if (!recording) {
      return res.status(404).json({
        error: 'Recording not found',
        details: `No recording found with id: ${id}`,
      });
    }

    // Note: Actual replay would require WebSocket integration
    res.json({
      message: 'Replay not yet implemented',
      recordingId: id,
      note: 'Replay functionality requires WebSocket integration',
    });
  } catch (error) {
    logger.error('Failed to play recording:', error);
    res.status(500).json({
      error: 'Failed to play recording',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/gestures/recordings/:id
 * Delete recording
 */
router.delete('/recordings/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = gestureRecorder.deleteRecording(id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Recording not found',
        details: `No recording found with id: ${id}`,
      });
    }

    logger.info('Recording deleted', { recordingId: id });

    res.json({
      message: 'Recording deleted successfully',
      recordingId: id,
    });
  } catch (error) {
    logger.error('Failed to delete recording:', error);
    res.status(500).json({
      error: 'Failed to delete recording',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

