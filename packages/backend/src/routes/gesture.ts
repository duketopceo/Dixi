import { Router, Request, Response } from 'express';
import axios from 'axios';
import { wsService } from '../index';
import { AIService } from '../services/ai';
import { gestureLimiter } from '../middleware/rateLimiter';
import { validateGestureProcess } from '../middleware/validation';
import logger from '../utils/logger';

const router = Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5000';
const aiService = new AIService();
// Separate cooldown timers for each gesture type
const gestureCooldowns: { [key: string]: number } = {
  wave: 0,
  point: 0,
  pinch: 0
};
const GESTURE_COOLDOWN_MS = 2000; // Prevent multiple AI calls for same gesture

// Continuous analysis state with rate limiting
const gestureBuffer: any[] = [];
const MAX_BUFFER_SIZE = 10; // Reduced from 20 for better performance
const CONTINUOUS_ANALYSIS_INTERVAL = 5000; // Increased to 5 seconds (was 3)
const MIN_GESTURE_INTERVAL = 2000; // 2 seconds between gesture-triggered analyses
const COOLDOWN_AFTER_ANALYSIS = 5000; // 5 second cooldown after each analysis
let lastContinuousAnalysis = 0;
let lastGestureAnalysis = 0;
let continuousAnalysisTimer: NodeJS.Timeout | null = null;
let analysisInProgress = false;

// Get current gesture data
router.get('/', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${VISION_SERVICE_URL}/gesture`);
    const gestureData = response.data;
    
    // Automatically trigger AI inference when gesture is detected
    if (gestureData && gestureData.type && gestureData.type !== 'unknown') {
      const currentTime = Date.now();
      const gestureType = gestureData.type;
      // Only trigger if enough time has passed since last gesture of this type (cooldown)
      if (currentTime - (gestureCooldowns[gestureType] || 0) > GESTURE_COOLDOWN_MS) {
        gestureCooldowns[gestureType] = currentTime;
        
        // Trigger AI inference asynchronously (don't block the response)
        triggerAIForGesture(gestureData).catch((error) => {
          logger.error(`Failed to trigger AI for ${gestureType} gesture:`, error);
        });
      }
    }
    
    res.json(gestureData);
  } catch (error) {
    logger.error('Failed to fetch gesture data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch gesture data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to trigger AI inference for any gesture
async function triggerAIForGesture(gestureData: any): Promise<void> {
  try {
    const gestureType = gestureData.type;
    const emoji = gestureType === 'wave' ? '🌊' : gestureType === 'point' ? '👉' : gestureType === 'pinch' ? '🤏' : '👋';
    logger.info(`${emoji} ${gestureType} gesture detected, triggering AI inference`);
    
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
    const confidence = (gestureData.confidence * 100).toFixed(0);
    
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
    
    // Get AI response
    const context = `Gesture detected: ${gestureType}, position: (${gestureData.position?.x?.toFixed(2)}, ${gestureData.position?.y?.toFixed(2)}), confidence: ${(gestureData.confidence * 100).toFixed(0)}%`;
    const aiResponse = await aiService.infer(prompt, context);
    
    // Broadcast AI response via WebSocket
    if (wsService) {
      wsService.broadcastAIResponse({
        query: queryText,
        response: aiResponse.text,
        metadata: aiResponse.metadata,
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
        metadata: { error: true },
        timestamp: Date.now()
      });
    }
  }
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

// Continuous analysis function with rate limiting
async function performContinuousAnalysis(): Promise<void> {
  // Rate limiting checks
  const currentTime = Date.now();
  if (analysisInProgress) {
    logger.debug('Analysis already in progress, skipping');
    return;
  }
  
  if (currentTime - lastContinuousAnalysis < COOLDOWN_AFTER_ANALYSIS) {
    logger.debug('Analysis cooldown active, skipping');
    return;
  }
  
  if (gestureBuffer.length < 5) return; // Need at least 5 gestures for analysis
  
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
    
    // Use streaming for continuous analysis
    if (wsService) {
      let fullResponse = '';
      
      await aiService.inferStream(prompt, { analysisType: 'continuous' }, (chunk: any) => {
        if (chunk.response) {
          fullResponse += chunk.response;
          // Stream each chunk to clients
          wsService.broadcastAIResponse({
            query: 'Continuous gesture analysis',
            response: fullResponse,
            metadata: { 
              ...chunk.metadata,
              analysisType: 'continuous',
              streaming: true
            },
            timestamp: Date.now()
          });
        }
      });
      
      // Final response when streaming completes
      wsService.broadcastAIResponse({
        query: 'Continuous gesture analysis',
        response: fullResponse,
        metadata: { 
          analysisType: 'continuous',
          streaming: false,
          gestureCount: recentGestures.length
        },
        timestamp: Date.now()
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
    
    // Automatically trigger AI inference when gesture is detected (with rate limiting)
    if (gestureData.type && gestureData.type !== 'unknown') {
      const currentTime = Date.now();
      const gestureType = gestureData.type;
      
      // Rate limiting: Only trigger if enough time has passed
      const timeSinceLastGesture = currentTime - (gestureCooldowns[gestureType] || 0);
      const timeSinceLastAnalysis = currentTime - lastGestureAnalysis;
      
      if (timeSinceLastGesture > GESTURE_COOLDOWN_MS && 
          timeSinceLastAnalysis > MIN_GESTURE_INTERVAL &&
          !analysisInProgress) {
        gestureCooldowns[gestureType] = currentTime;
        lastGestureAnalysis = currentTime;
        triggerAIForGesture(gestureData).catch((error) => {
          logger.error(`Failed to trigger AI for ${gestureType} gesture:`, error);
        });
      }
    }
    
    // Trigger continuous analysis if enough time has passed (with stricter rate limiting)
    const currentTime = Date.now();
    const timeSinceLastAnalysis = currentTime - lastContinuousAnalysis;
    if (timeSinceLastAnalysis > CONTINUOUS_ANALYSIS_INTERVAL && 
        gestureBuffer.length >= 5 && 
        !analysisInProgress) {
      // Clear any existing timer
      if (continuousAnalysisTimer) {
        clearTimeout(continuousAnalysisTimer);
      }
      // Schedule analysis (non-blocking) with delay to batch recent gestures
      continuousAnalysisTimer = setTimeout(() => {
        performContinuousAnalysis().catch((error) => {
          logger.error('Scheduled continuous analysis failed:', error);
        });
      }, 1000); // Increased delay to batch more gestures
    }
    
    res.json({ 
      message: 'Gesture processed successfully',
      gesture: gestureData
    });
  } catch (error) {
    logger.error('Failed to process gesture:', error);
    res.status(500).json({ 
      error: 'Failed to process gesture',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
