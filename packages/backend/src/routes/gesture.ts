import { Router, Request, Response } from 'express';
import axios from 'axios';
import { wsService } from '../index';
import { AIService } from '../services/ai';
import { gestureLimiter } from '../middleware/rateLimiter';
import { validateGestureProcess } from '../middleware/validation';
import logger from '../utils/logger';

// Type definitions for gesture data
interface GesturePosition {
  x: number;
  y: number;
  z?: number;
}

interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

interface GestureOrientation {
  pitch: number;
  yaw: number;
  roll: number;
}

interface GestureMotion {
  pattern: string;
  velocity: number;
  direction: number;
}

interface GestureBufferItem {
  type: string;
  position?: GesturePosition;
  confidence?: number;
  timestamp: number;
  finger_states?: FingerStates;
  orientation?: GestureOrientation;
  motion?: GestureMotion;
}

interface GestureHistoryItem {
  type: string;
  time: number;
}

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5000';
const aiService = new AIService();
// CRITICAL: Aggressive rate limiting to prevent freeze
// Separate cooldown timers for each gesture type
const gestureCooldowns: { [key: string]: number } = {};
const GESTURE_COOLDOWN_MS = 10000; // 10 seconds - CRITICAL: Prevents 200ms spam
const MIN_GESTURE_INTERVAL = 10000; // 10 seconds between ANY gesture-triggered analyses
const COOLDOWN_AFTER_ANALYSIS = 15000; // 15 second cooldown after each analysis

// AI call queue to prevent simultaneous calls (CRITICAL for preventing freeze)
let aiCallQueue: Array<() => Promise<void>> = [];
let isProcessingAI = false;
let lastAICallTime = 0;
const MIN_AI_CALL_INTERVAL = 10000; // 10 seconds minimum between ANY AI calls

// Continuous analysis - DISABLED by default (causes freeze)
const gestureBuffer: GestureBufferItem[] = [];
const MAX_BUFFER_SIZE = 10;
const CONTINUOUS_ANALYSIS_INTERVAL = 10000; // 10 seconds when enabled
let continuousAnalysisEnabled = false; // Toggleable - starts disabled
let lastContinuousAnalysis = 0;
let lastGestureAnalysis = 0;
let continuousAnalysisTimer: NodeJS.Timeout | null = null;
let analysisInProgress = false;

// Get current gesture data
router.get('/', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${VISION_SERVICE_URL}/gesture`, {
      timeout: 5000 // 5 second timeout
    });
    const gestureData = response.data;
    
    // DISABLED: Auto-trigger AI on GET route (causes freeze with frequent polling)
    // AI should only be triggered on POST /process with proper rate limiting
    
    res.json(gestureData);
  } catch (error: any) {
    logger.error('Failed to fetch gesture data:', error);
    
    // Handle specific error types
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      res.status(503).json({ 
        error: 'Vision service unavailable',
        details: 'Vision service is not running or not accessible. Please start the vision service on port 5000.',
        type: 'connection_error'
      });
      return;
    }
    
    if (error.response) {
      // Vision service responded with an error
      res.status(error.response.status || 500).json({ 
        error: 'Vision service error',
        details: error.response.data?.error || error.response.statusText || 'Unknown error',
        type: 'service_error'
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch gesture data',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'unknown_error'
    });
  }
});

// AI call queue processor (prevents simultaneous calls)
async function processAIQueue(): Promise<void> {
  if (isProcessingAI || aiCallQueue.length === 0) return;
  
  const currentTime = Date.now();
  if (currentTime - lastAICallTime < MIN_AI_CALL_INTERVAL) {
    // Too soon, wait a bit
    setTimeout(() => processAIQueue(), MIN_AI_CALL_INTERVAL - (currentTime - lastAICallTime));
    return;
  }
  
  isProcessingAI = true;
  const aiCall = aiCallQueue.shift();
  
  if (aiCall) {
    try {
      await aiCall();
      lastAICallTime = Date.now();
    } catch (error) {
      logger.error('AI queue processing error:', error);
    }
  }
  
  isProcessingAI = false;
  
  // Process next in queue if any
  if (aiCallQueue.length > 0) {
    setTimeout(() => processAIQueue(), MIN_AI_CALL_INTERVAL);
  }
}

// Helper function to trigger AI inference for any gesture (queued, non-blocking)
async function triggerAIForGesture(gestureData: GestureBufferItem): Promise<void> {
  const gestureType = gestureData.type;
  const emoji = gestureType === 'wave' ? '🌊' : gestureType === 'point' ? '👉' : gestureType === 'pinch' ? '🤏' : '👋';
  
  // Add to queue instead of calling directly
  aiCallQueue.push(async () => {
    try {
      logger.info(`${emoji} ${gestureType} gesture detected, processing AI inference`);
      
      // Initialize AI service if needed (it will check internally)
      try {
        await aiService.initialize();
      } catch (initError) {
        logger.warn('AI service initialization failed, will attempt inference anyway:', initError);
      }
    
    // Create gesture-specific prompts for all gesture types
    let prompt: string;
    let queryText: string;
    const x = gestureData.position?.x?.toFixed(2) || '0.00';
    const y = gestureData.position?.y?.toFixed(2) || '0.00';
    const confidence = ((gestureData.confidence ?? 0) * 100).toFixed(0);
    
    // Gesture-specific prompts
    const gesturePrompts: { [key: string]: string } = {
      'wave': `The user just waved their hand. This is a friendly greeting gesture.`,
      'point': `The user is pointing at coordinates [${x}, ${y}]. They might be indicating something specific.`,
      'point_up': `The user is pointing upward. This could indicate something above or a positive direction.`,
      'point_down': `The user is pointing downward. This could indicate something below or a negative direction.`,
      'point_left': `The user is pointing left. This could indicate direction or navigation.`,
      'point_right': `The user is pointing right. This could indicate direction or navigation.`,
      'pinch': `The user is performing a pinch gesture at [${x}, ${y}]. This typically means selection or grabbing.`,
      'fist': `The user made a fist. This could indicate determination, agreement, or a closed state.`,
      'open_palm': `The user has an open palm. This could indicate openness, stopping, or showing something.`,
      'thumbs_up': `The user gave a thumbs up. This is a positive affirmation or approval gesture.`,
      'thumbs_down': `The user gave a thumbs down. This is a negative or disapproval gesture.`,
      'peace': `The user made a peace sign (V-sign). This is a friendly or victory gesture.`,
      'ok': `The user made an OK sign. This indicates approval or that something is correct.`,
      'rock': `The user made a rock on gesture. This is a playful or celebratory gesture.`,
      'spiderman': `The user made a Spiderman web-shooting gesture. This is a playful action gesture.`,
      'gun': `The user made a pointing gun gesture. This could indicate targeting or selection.`,
      'three': `The user is showing three fingers. This could indicate a number or count.`,
      'four': `The user is showing four fingers. This could indicate a number or count.`,
      'five': `The user is showing an open hand with all fingers extended.`,
      'swipe_left': `The user swiped left. This typically means moving backward, dismissing, or going to previous.`,
      'swipe_right': `The user swiped right. This typically means moving forward, accepting, or going to next.`,
      'swipe_up': `The user swiped up. This could mean scrolling up, revealing, or moving upward.`,
      'swipe_down': `The user swiped down. This could mean scrolling down, hiding, or moving downward.`,
      'circle': `The user made a circular motion. This could indicate rotation, completion, or a circular pattern.`,
      'figure_eight': `The user made a figure-eight motion. This is a complex gesture indicating infinity or a pattern.`,
      'zoom_in': `The user is zooming in (pinch expanding). They want to see more detail or get closer.`,
      'zoom_out': `The user is zooming out (pinch contracting). They want to see a wider view or move back.`,
      'grab': `The user is grabbing or closing their hand. This indicates selection or taking hold of something.`,
      'release': `The user is releasing or opening their hand. This indicates letting go or deselecting.`,
      'rotate_clockwise': `The user is rotating clockwise. This could indicate turning something or a clockwise motion.`,
      'rotate_counterclockwise': `The user is rotating counter-clockwise. This could indicate turning something or a counter-clockwise motion.`,
      'shake': `The user is shaking their hand rapidly. This could indicate uncertainty, rejection, or a negative response.`,
      'double_tap': `The user performed a double tap (two quick pinches). This typically means selection or activation.`,
      'clap': `The user clapped their hands together. This is a celebratory or approval gesture.`,
      'stretch': `The user stretched their hands apart. This could indicate expansion, zooming out, or separation.`,
      'point_both': `The user is pointing with both hands. This emphasizes a specific location or direction.`
    };
    
    prompt = gesturePrompts[gestureType] || `The user performed a ${gestureType} gesture at coordinates [${x}, ${y}] with ${confidence}% confidence.`;
    queryText = `${gestureType.charAt(0).toUpperCase() + gestureType.slice(1)} gesture detected`;
    
    // Add context about gesture details if available
    if (gestureData.finger_states || gestureData.orientation || gestureData.motion) {
      const contextParts = [];
      if (gestureData.motion?.pattern && gestureData.motion.pattern !== 'none') {
        contextParts.push(`motion pattern: ${gestureData.motion.pattern}`);
      }
      if (gestureData.orientation) {
        contextParts.push(`hand orientation: pitch ${gestureData.orientation.pitch.toFixed(0)}°, yaw ${gestureData.orientation.yaw.toFixed(0)}°`);
      }
      if (contextParts.length > 0) {
        prompt += ` Context: ${contextParts.join(', ')}.`;
      }
    }
    
    prompt += ` Describe this interaction naturally and helpfully. Keep it brief (1-2 sentences).`;
    
      // Build optimized context object (not string)
      const aiContext = {
        gesture: {
          type: gestureType,
          confidence: gestureData.confidence || 0.8,
          coordinates: {
            x: gestureData.position?.x || 0,
            y: gestureData.position?.y || 0
          }
        },
        // Include gesture history if available (last 3 only)
        gesture_history: gestureBuffer.slice(-3).map((g: GestureBufferItem): GestureHistoryItem => ({
          type: g.type,
          time: g.timestamp ? Date.now() - g.timestamp : 0
        }))
      };
      
      // Get AI response (non-blocking, async) with optimized context
      const aiResponse = await aiService.infer(prompt, aiContext);
      
      // Broadcast AI response via WebSocket
      if (wsService) {
        wsService.broadcastAIResponse({
          query: queryText,
          response: aiResponse.text,
          metadata: { ...aiResponse.metadata, analysisType: 'gesture' },
          timestamp: Date.now()
        });
      }
      
      logger.info(`✅ AI response generated for ${gestureType} gesture`);
    } catch (error) {
      logger.error(`Failed to generate AI response for ${gestureData.type}:`, error);
      // Don't throw - we don't want to break gesture detection if AI fails
      if (wsService) {
        wsService.broadcastAIResponse({
          query: `${gestureData.type} gesture detected`,
          response: `AI service is currently unavailable. ${gestureData.type} gesture was recognized successfully.`,
          metadata: { error: true, analysisType: 'gesture' },
          timestamp: Date.now()
        });
      }
    }
  });
  
  // Start processing queue (non-blocking)
  processAIQueue().catch((error) => {
    logger.error('Failed to process AI queue:', error);
  });
}

// Start gesture tracking (with rate limiting)
router.post('/start', gestureLimiter, async (req: Request, res: Response) => {
  try {
    logger.info('Starting gesture tracking');
    const response = await axios.post(`${VISION_SERVICE_URL}/gesture/start`);
    logger.info('Gesture tracking started successfully');
    res.json({ 
      message: 'Gesture tracking started',
      data: response.data
    });
  } catch (error) {
    logger.error('Failed to start gesture tracking:', error);
    res.status(500).json({ 
      error: 'Failed to start gesture tracking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop gesture tracking (with rate limiting)
router.post('/stop', gestureLimiter, async (req: Request, res: Response) => {
  try {
    logger.info('Stopping gesture tracking');
    const response = await axios.post(`${VISION_SERVICE_URL}/gesture/stop`);
    logger.info('Gesture tracking stopped successfully');
    res.json({ 
      message: 'Gesture tracking stopped',
      data: response.data
    });
  } catch (error) {
    logger.error('Failed to stop gesture tracking:', error);
    res.status(500).json({ 
      error: 'Failed to stop gesture tracking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Continuous analysis function with rate limiting (DISABLED by default)
// Can also be used for manual single analysis
async function performContinuousAnalysis(isManual: boolean = false): Promise<void> {
  // CRITICAL: Multiple rate limiting checks
  const currentTime = Date.now();
  if (analysisInProgress || isProcessingAI) {
    logger.debug('Analysis already in progress, skipping');
    return;
  }
  
  if (currentTime - lastContinuousAnalysis < COOLDOWN_AFTER_ANALYSIS) {
    logger.debug('Analysis cooldown active, skipping');
    return;
  }
  
  if (currentTime - lastAICallTime < MIN_AI_CALL_INTERVAL) {
    logger.debug('AI call interval not met, skipping');
    return;
  }
  
    // For manual analysis, require at least 3 gestures; for continuous, require 5
    const minGestures = isManual ? 3 : 5;
    if (gestureBuffer.length < minGestures) return;
  
  analysisInProgress = true;
  
  try {
    const recentGestures = gestureBuffer.slice(-10); // Last 10 gestures
    const gestureTypes = recentGestures.map(g => g.type).filter(t => t !== 'unknown');
    const uniqueTypes = [...new Set(gestureTypes)];
    
    if (uniqueTypes.length === 0) return;
    
    // Build analysis prompt
    const gestureSummary = uniqueTypes.map(type => {
      const count = gestureTypes.filter(t => t === type).length;
      return `${type} (${count}x)`;
    }).join(', ');
    
    const prompt = `Analyze the user's recent gesture activity. They performed: ${gestureSummary}. Provide a brief, natural analysis of what the user might be trying to communicate or interact with. Keep it conversational and helpful (2-3 sentences max).`;
    
    // Build optimized context for analysis
    const analysisContext = {
      gesture_history: recentGestures.slice(-3).map((g: GestureBufferItem): GestureHistoryItem => ({
        type: g.type,
        time: g.timestamp ? Date.now() - g.timestamp : 0
      })),
      analysisType: isManual ? 'manual' : 'continuous'
    };
    
    const queryText = isManual ? 'Manual gesture analysis' : 'Continuous gesture analysis';
    
    // Use streaming for analysis with optimized context
    if (wsService) {
      let fullResponse = '';
      
      await aiService.inferStream(prompt, analysisContext, (chunk: { text: string; done: boolean }) => {
        if (chunk.text && wsService) {
          fullResponse += chunk.text;
          // Stream each chunk to clients
          wsService.broadcastAIResponse({
            query: queryText,
            response: fullResponse,
            metadata: { 
              analysisType: isManual ? 'manual' : 'continuous',
              streaming: !chunk.done
            },
            timestamp: Date.now()
          });
        }
        
        // Final response when streaming completes
        if (chunk.done && wsService) {
          wsService.broadcastAIResponse({
            query: queryText,
            response: fullResponse,
            metadata: { 
              analysisType: isManual ? 'manual' : 'continuous',
              streaming: false,
              gestureCount: recentGestures.length
            },
            timestamp: Date.now()
          });
        }
      });
    }
    
    lastContinuousAnalysis = Date.now();
  } catch (error) {
    logger.error('Continuous analysis failed:', error);
  } finally {
    analysisInProgress = false;
  }
}

// Process gesture event (with validation)
router.post('/process', validateGestureProcess, async (req: Request, res: Response) => {
  try {
    const gestureData = req.body;
    
    logger.debug('Processing gesture', { type: gestureData.type, confidence: gestureData.confidence });
    
    // Add to buffer for continuous analysis
    gestureBuffer.push({
      ...gestureData,
      timestamp: Date.now()
    });
    if (gestureBuffer.length > MAX_BUFFER_SIZE) {
      gestureBuffer.shift(); // Remove oldest
    }
    
    // Broadcast to all connected clients via WebSocket
    if (wsService) {
      wsService.broadcastGesture({
        type: gestureData.type || 'unknown',
        position: gestureData.position || { x: 0, y: 0 },
        confidence: gestureData.confidence || 0,
        timestamp: Date.now()
      });
    }
    
    // CRITICAL: NO automatic AI calls happen here.
    // AI is ONLY triggered via:
    // 1. Manual query from frontend (POST /api/ai/infer)
    // 2. Manual analysis button (POST /gestures/analyze-now)
    // 3. Continuous analysis toggle when explicitly enabled by user
    
    // Continuous analysis - DISABLED by default, user must explicitly enable
    // Even when enabled, uses aggressive rate limiting
    if (continuousAnalysisEnabled) {
      const currentTime = Date.now();
      const timeSinceLastAnalysis = currentTime - lastContinuousAnalysis;
      const timeSinceLastAI = currentTime - lastAICallTime;
      
      // CRITICAL: Multiple rate limiting checks - all must pass
      if (timeSinceLastAnalysis > CONTINUOUS_ANALYSIS_INTERVAL && 
          timeSinceLastAI > MIN_AI_CALL_INTERVAL &&
          gestureBuffer.length >= 5 && 
          !analysisInProgress &&
          !isProcessingAI &&
          aiCallQueue.length === 0) { // No queued calls
        // Clear any existing timer
        if (continuousAnalysisTimer) {
          clearTimeout(continuousAnalysisTimer);
        }
        // Schedule analysis with LONG delay to prevent any spam
        continuousAnalysisTimer = setTimeout(() => {
          // Double-check still enabled before running
          if (continuousAnalysisEnabled && !analysisInProgress && !isProcessingAI) {
            performContinuousAnalysis().catch((error) => {
              logger.error('Scheduled continuous analysis failed:', error);
            });
          }
        }, 10000); // 10 second delay (was 5s)
      }
    }
    
    res.json({ 
      message: 'Gesture processed successfully',
      gesture: gestureData
    });
  } catch (error: any) {
    logger.error('Failed to process gesture:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      res.status(400).json({ 
        error: 'Validation error',
        details: error.message || 'Invalid gesture data format',
        type: 'validation_error'
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Failed to process gesture',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'processing_error'
    });
  }
});

// Get continuous analysis status
router.get('/continuous-analysis/status', async (req: Request, res: Response) => {
  try {
    res.json({ 
      enabled: continuousAnalysisEnabled,
      interval: CONTINUOUS_ANALYSIS_INTERVAL
    });
  } catch (error) {
    logger.error('Failed to get continuous analysis status:', error);
    res.status(500).json({ 
      error: 'Failed to get continuous analysis status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Toggle continuous analysis
router.post('/continuous-analysis/toggle', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be a boolean' });
      return;
    }
    
    continuousAnalysisEnabled = enabled;
    
    // Clear any existing timer when disabling
    if (!enabled && continuousAnalysisTimer) {
      clearTimeout(continuousAnalysisTimer);
      continuousAnalysisTimer = null;
    }
    
    logger.info(`Continuous analysis ${enabled ? 'enabled' : 'disabled'}`);
    
    res.json({ 
      enabled: continuousAnalysisEnabled,
      message: `Continuous analysis ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    logger.error('Failed to toggle continuous analysis:', error);
    res.status(500).json({ 
      error: 'Failed to toggle continuous analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Manual single gesture analysis (triggered by button click)
router.post('/analyze-now', async (req: Request, res: Response) => {
  try {
    // Check if continuous analysis is enabled - if so, don't allow manual trigger
    if (continuousAnalysisEnabled) {
      res.status(400).json({ 
        error: 'Continuous analysis is enabled. Disable it first to use manual analysis.',
        enabled: true
      });
      return;
    }

    // Rate limiting check
    const currentTime = Date.now();
    if (analysisInProgress || isProcessingAI) {
      res.status(429).json({ 
        error: 'Analysis already in progress. Please wait.',
        retryAfter: Math.ceil((MIN_AI_CALL_INTERVAL - (currentTime - lastAICallTime)) / 1000)
      });
      return;
    }

    if (currentTime - lastAICallTime < MIN_AI_CALL_INTERVAL) {
      const waitTime = Math.ceil((MIN_AI_CALL_INTERVAL - (currentTime - lastAICallTime)) / 1000);
      res.status(429).json({ 
        error: 'Rate limited. Please wait before requesting another analysis.',
        retryAfter: waitTime
      });
      return;
    }

    // Check if we have enough gestures in buffer
    if (gestureBuffer.length < 3) {
      res.status(400).json({ 
        error: 'Not enough gesture data. Need at least 3 gestures in buffer.',
        currentBufferSize: gestureBuffer.length
      });
      return;
    }

    // Trigger single analysis (non-blocking) - pass true to indicate manual
    performContinuousAnalysis(true).catch((error) => {
      logger.error('Manual gesture analysis failed:', error);
    });

    res.json({ 
      message: 'Gesture analysis triggered',
      bufferSize: gestureBuffer.length,
      status: 'processing'
    });
  } catch (error) {
    logger.error('Failed to trigger manual gesture analysis:', error);
    res.status(500).json({ 
      error: 'Failed to trigger gesture analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
