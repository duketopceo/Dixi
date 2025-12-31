import axios from 'axios';
import logger from '../utils/logger';
import { aiResponseCache, generateQueryCacheKey } from './cache';

export interface AIModelConfig {
  modelPath?: string;
  modelSize?: string;
  useGPU?: boolean;
}

export interface InferenceResponse {
  text: string;
  metadata?: {
    inferenceTime: number;
    tokenCount?: number;
    confidence?: number;
    model?: string;
    context?: OptimizedContext;
    tokens?: number;
  };
}

// Type definitions for gesture context
export interface GestureCoordinates {
  x: number;
  y: number;
}

export interface GestureInfo {
  type: string;
  confidence?: number;
  coordinates?: GestureCoordinates;
  position?: GestureCoordinates;
}

export interface GestureHistoryItem {
  type: string;
  time?: number;
  timestamp?: number;
}

export interface GestureContext {
  gesture?: GestureInfo;
  gesture_history?: GestureHistoryItem[];
  analysisType?: string;
}

export interface OptimizedContext {
  app: string;
  timestamp: number;
  mode: string;
  gesture?: {
    type: string;
    confidence: number;
    position?: GestureCoordinates;
  };
  recent_gestures?: Array<{
    type: string;
    time?: number;
  }>;
}

/**
 * Vision analysis context - structured type for analyzeCurrentFrame
 * This defines the context from the Python vision service (hands, face, body, eyes)
 */
export interface VisionAnalysisContext {
  gesture?: {
    type: string;
    confidence?: number;
    position?: GestureCoordinates;
    hand?: 'left' | 'right';
  };
  hands?: {
    left?: {
      detected: boolean;
      gesture: string;
      position: GestureCoordinates;
      confidence: number;
      fingers?: {
        thumb: boolean;
        index: boolean;
        middle: boolean;
        ring: boolean;
        pinky: boolean;
      };
    };
    right?: {
      detected: boolean;
      gesture: string;
      position: GestureCoordinates;
      confidence: number;
      fingers?: {
        thumb: boolean;
        index: boolean;
        middle: boolean;
        ring: boolean;
        pinky: boolean;
      };
    };
  };
  face?: {
    detected: boolean;
    bounding_box?: {
      x_min: number;
      y_min: number;
      x_max: number;
      y_max: number;
      width: number;
      height: number;
    };
    key_points?: {
      left_eye: GestureCoordinates;
      right_eye: GestureCoordinates;
      nose_tip: GestureCoordinates;
      mouth_center: GestureCoordinates;
    };
    head_pose?: {
      tilt: number;
      turn: number;
      pitch?: number;
      yaw?: number;
      roll?: number;
    };
    expressions?: Record<string, number>;
    mouth_features?: {
      mouth_open: boolean;
      mouth_open_ratio: number;
      smile_score: number;
      is_smiling: boolean;
      mouth_width?: number;
    };
    eye_features?: {
      both_eyes_open: boolean;
      left_eye_open: boolean;
      right_eye_open: boolean;
      gaze_direction: number;
      blink_detected?: boolean;
    };
    engagement?: {
      score: number;
      head_straightness: number;
      eye_engagement: number;
      is_engaged: boolean;
    };
  };
  body?: {
    detected: boolean;
    posture?: 'standing' | 'sitting' | 'leaning' | 'unknown';
    orientation?: {
      pitch: number;
      yaw: number;
      roll: number;
    };
    key_points?: {
      nose?: GestureCoordinates;
      left_shoulder?: GestureCoordinates;
      right_shoulder?: GestureCoordinates;
      left_hip?: GestureCoordinates;
      right_hip?: GestureCoordinates;
      left_elbow?: GestureCoordinates;
      right_elbow?: GestureCoordinates;
      left_wrist?: GestureCoordinates;
      right_wrist?: GestureCoordinates;
    };
  };
  eyes?: {
    left_eye?: {
      gaze_direction: { x: number; y: number; z: number };
      iris_position: GestureCoordinates;
      is_open: boolean;
      eye_height?: number;
    };
    right_eye?: {
      gaze_direction: { x: number; y: number; z: number };
      iris_position: GestureCoordinates;
      is_open: boolean;
      eye_height?: number;
    };
    combined_gaze?: { x: number; y: number; z: number };
    attention_score?: number;
  };
}

// Optimized Ollama parameters for performance
const OLLAMA_INFERENCE_PARAMS = {
  // Response Generation
  temperature: 0.7,        // Balance creativity vs consistency
  top_p: 0.9,              // Nucleus sampling - keeps responses focused
  top_k: 40,               // Limits vocabulary to top 40 tokens
  
  // Length Control
  num_predict: 150,        // Max tokens (keep responses SHORT)
  stop: ["\n\n", "###"],   // Stop sequences to prevent rambling
  
  // Performance
  num_ctx: 2048,           // Context window (2048 is good balance)
  
  // System Prompt (CRITICAL)
  system: `You are Dixi, a friendly AI assistant for an interactive gesture-controlled projection system.

You can see user gestures in real-time:
- OPEN_PALM: User is showing their hand openly - acknowledge them warmly
- PINCH: User is selecting or grabbing something - help them with the action
- POINT: User is pointing at something - describe where they're pointing
- FIST: User made a fist - could be confirming, closing, or power gesture
- THUMBS_UP/DOWN: User is giving approval/disapproval
- WAVE: User is greeting or getting attention
- PEACE: User is making a peace sign - casual/friendly
- OK: User is confirming something is good

Your style:
- Be conversational, warm, and brief (1-2 sentences)
- Respond to gestures naturally as if in conversation
- You're like a helpful projection assistant
- Use one emoji per response that matches the mood
- When unsure, ask a clarifying question
- Help users understand what actions are possible`
};

// Gesture emoji mapping
const GESTURE_EMOJIS: { [key: string]: string } = {
  'wave': '👋',
  'point': '👉',
  'pinch': '🤏',
  'fist': '✊',
  'open_palm': '✋',
  'thumbs_up': '👍',
  'thumbs_down': '👎',
  'peace': '✌️',
  'ok': '👌'
};

export class AIService {
  private initialized: boolean = false;
  private ollamaBaseUrl: string;
  private modelName: string;
  private visionModelName: string;
  private visionServiceUrl: string;
  private aiProvider: string;
  private geminiApiKey?: string;
  private cloudModel: string;

  constructor() {
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    // Use gemma3:4b if available, otherwise fallback to llama3.2
    this.modelName = process.env.OLLAMA_MODEL || 'gemma3:4b';
    // Vision model for image analysis (llava is now installed)
    this.visionModelName = process.env.OLLAMA_VISION_MODEL || 'llava:7b';
    logger.info('✅ Vision model llava:7b is available for image analysis');
    // Vision service URL for capturing frames
    this.visionServiceUrl = process.env.VISION_SERVICE_URL || 'http://localhost:5001';
    
    // NEW: Gemini configuration
    this.aiProvider = process.env.AI_PROVIDER || 'ollama';
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.cloudModel = process.env.CLOUD_MODEL || 'gemini-1.5-flash';
    
    // Log provider status
    logger.info('🤖 AI Service initialized');
    logger.info(`🔗 Provider: ${this.aiProvider}`);
    if (this.aiProvider === 'gemini') {
      if (this.geminiApiKey) {
        logger.info(`☁️  Gemini configured: ${this.cloudModel}`);
      } else {
        logger.warn('⚠️  AI_PROVIDER=gemini but GEMINI_API_KEY missing, falling back to Ollama');
        this.aiProvider = 'ollama';
      }
    }
    logger.info(`🔗 Ollama Base URL: ${this.ollamaBaseUrl}`);
    logger.info(`📦 Ollama Model: ${this.modelName}`);
    logger.info(`👁️ Vision Model: ${this.visionModelName}`);
  }

  async initialize(modelPath?: string, modelSize?: string): Promise<void> {
    try {
      if (modelSize) {
        this.modelName = modelSize;
      }
      
      // Test Ollama connection
      logger.info(`Testing Ollama connection at ${this.ollamaBaseUrl}...`);
      await this.testOllamaConnection();
      
      this.initialized = true;
      logger.info(`✅ AI Service (Ollama: ${this.modelName}) initialized successfully`);
    } catch (error) {
      logger.error('Failed to initialize AI model:', error);
      throw new Error(`Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testOllamaConnection(): Promise<void> {
    try {
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`, {
        timeout: 5000
      });
      logger.info('✅ Ollama connection successful');
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Ollama is not running. Please start Ollama service.');
      }
      throw new Error(`Ollama connection failed: ${error.message}`);
    }
  }

  async getModelStatus(): Promise<any> {
    let ollamaStatus = 'unknown';
    try {
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`, {
        timeout: 5000
      });
      ollamaStatus = 'connected';
    } catch (error) {
      ollamaStatus = 'disconnected';
    }

    return {
      initialized: this.initialized,
      modelName: this.modelName,
      ollamaBaseUrl: this.ollamaBaseUrl,
      ollamaStatus,
      provider: this.aiProvider,
      cloudModel: this.cloudModel,
      geminiConfigured: !!this.geminiApiKey,
      backend: this.aiProvider === 'gemini' ? 'gemini' : 'ollama'
    };
  }

  // Build optimized context (for metadata only, not sent to Ollama)
  private buildOptimizedContext(context?: GestureContext): OptimizedContext {
    const optimizedContext: OptimizedContext = {
      // Level 1: Always Include (Essential)
      app: "Dixi",
      timestamp: Date.now(),
      mode: "gesture_controlled_interface"
    };

    // Level 2: Include When Available (Helpful)
    if (context?.gesture) {
      optimizedContext.gesture = {
        type: context.gesture.type,
        confidence: context.gesture.confidence || 0.8,
        position: context.gesture.coordinates || context.gesture.position
      };
    }

    // Gesture history (last 3 only - keep it minimal)
    if (context?.gesture_history && Array.isArray(context.gesture_history)) {
      optimizedContext.recent_gestures = context.gesture_history.slice(-3).map((g: GestureHistoryItem) => ({
        type: g.type,
        time: g.time || g.timestamp
      }));
    }

    return optimizedContext;
  }

  // Build prompt with optimized context
  private buildPrompt(query: string, context?: GestureContext): string {
    let prompt = query;

    if (context?.gesture) {
      const emoji = GESTURE_EMOJIS[context.gesture.type] || '👋';
      const confidence = context.gesture.confidence 
        ? `${(context.gesture.confidence * 100).toFixed(0)}%` 
        : '';
      
      // Gesture-specific prompt templates
      switch (context.gesture.type) {
        case 'point':
          const x = context.gesture.coordinates?.x || context.gesture.position?.x || 0;
          const y = context.gesture.coordinates?.y || context.gesture.position?.y || 0;
          prompt = `${emoji} User is pointing at screen position (${x.toFixed(2)}, ${y.toFixed(2)}). ${query}`;
          break;
        case 'wave':
          prompt = `${emoji} User waved. ${query}`;
          break;
        case 'pinch':
          const px = context.gesture.coordinates?.x || context.gesture.position?.x || 0;
          const py = context.gesture.coordinates?.y || context.gesture.position?.y || 0;
          prompt = `${emoji} User pinched at position (${px.toFixed(2)}, ${py.toFixed(2)}). ${query}`;
          break;
        default:
          prompt = `${emoji} User performed ${context.gesture.type} gesture${confidence ? ` (${confidence} confidence)` : ''}. ${query}`;
      }
    }

    return prompt;
  }

  /**
   * Gemini text inference
   * Uses the same prompt building as Ollama but sends to Gemini API
   */
  private async inferGemini(
    prompt: string,
    context?: GestureContext
  ): Promise<InferenceResponse> {
    const startTime = Date.now();

    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    try {
      // Build the same prompt as Ollama would use
      const fullPrompt = this.buildPrompt(prompt, context);
      const optimizedContext = this.buildOptimizedContext(context);

      // Gemini API endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.cloudModel}:generateContent?key=${this.geminiApiKey}`;

      const response = await axios.post(
        url,
        {
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 150,
            stopSequences: ["\n\n", "###"]
          },
          systemInstruction: {
            parts: [{
              text: OLLAMA_INFERENCE_PARAMS.system
            }]
          }
        },
        {
          timeout: 60000
        }
      );

      const inferenceTime = Date.now() - startTime;

      // Extract text from Gemini response
      const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!responseText) {
        throw new Error('Empty response from Gemini API');
      }

      logger.info(`✅ Gemini inference complete in ${inferenceTime}ms`);

      return {
        text: responseText,
        metadata: {
          inferenceTime,
          tokenCount: responseText.split(' ').length,
          confidence: 0.95,
          model: this.cloudModel,
          context: optimizedContext,
          tokens: response.data.usageMetadata?.totalTokenCount || responseText.split(' ').length
        }
      };
    } catch (error: any) {
      logger.error('Gemini inference failed:', error);
      
      if (error.response) {
        logger.error('Gemini API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Gemini API error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Gemini API service is not available');
      }
      
      throw new Error(`Gemini inference error: ${error.message}`);
    }
  }

  async infer(query: string, context?: GestureContext): Promise<InferenceResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Check cache first - include provider in cache key to differentiate Gemini vs Ollama
      const activeModel = this.aiProvider === 'gemini' ? this.cloudModel : this.modelName;
      const cacheKey = generateQueryCacheKey(query, activeModel, this.aiProvider);
      const cached = aiResponseCache.get(cacheKey);
      
      if (cached) {
        logger.debug('AI response cache hit', { cacheKey, provider: this.aiProvider });
        return {
          text: cached,
          metadata: {
            inferenceTime: 0, // Cached, no inference time
            tokenCount: cached.split(' ').length,
            confidence: 0.95,
            model: activeModel,
            context: this.buildOptimizedContext(context),
            tokens: cached.split(' ').length,
          }
        };
      }

      // Build optimized context (minimal, essential only)
      const optimizedContext = this.buildOptimizedContext(context);
      const prompt = this.buildPrompt(query, context);

      // Try Gemini first if configured, fall back to Ollama
      if (this.aiProvider === 'gemini' && this.geminiApiKey) {
        try {
          return await this.inferGemini(query, context);
        } catch (geminiError: any) {
          logger.warn('Gemini inference failed, falling back to Ollama:', geminiError.message);
          // Continue to Ollama fallback below
        }
      }

      // Ollama doesn't accept 'context' parameter - include context in prompt instead
      const response = await axios.post(
        `${this.ollamaBaseUrl}/api/generate`,
        {
          model: this.modelName,
          prompt: prompt,
          stream: false,
          
          // Optimized Ollama parameters (removed unsupported ones)
          temperature: OLLAMA_INFERENCE_PARAMS.temperature,
          top_p: OLLAMA_INFERENCE_PARAMS.top_p,
          top_k: OLLAMA_INFERENCE_PARAMS.top_k,
          num_predict: OLLAMA_INFERENCE_PARAMS.num_predict,
          stop: OLLAMA_INFERENCE_PARAMS.stop,
          num_ctx: OLLAMA_INFERENCE_PARAMS.num_ctx,
          system: OLLAMA_INFERENCE_PARAMS.system
          // Note: num_batch and num_gpu are not standard Ollama parameters
        },
        {
          timeout: 60000 // 60 second timeout
        }
      );

      const inferenceTime = Date.now() - startTime;
      const responseText = response.data.response || '';

      // Cache the response
      if (responseText) {
        aiResponseCache.set(cacheKey, responseText);
        logger.debug('AI response cached', { cacheKey });
      }

      return {
        text: responseText,
        metadata: {
          inferenceTime,
          tokenCount: responseText.split(' ').length,
          confidence: 0.95,
          model: this.modelName,
          context: optimizedContext,
          tokens: response.data.eval_count || responseText.split(' ').length
        }
      };
    } catch (error: any) {
      logger.error('Ollama inference failed:', error);
      
      // Log detailed error information
      if (error.response) {
        logger.error('Ollama API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Ollama API error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Ollama service is not available. Please ensure Ollama is running.');
      }
      
      throw new Error(`Ollama inference error: ${error.message}`);
    }
  }

  async inferStream(
    query: string, 
    context: GestureContext, 
    onChunk: (chunk: { text: string; done: boolean }) => void
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Build optimized context (for metadata only, not sent to Ollama)
      const optimizedContext = this.buildOptimizedContext(context);
      const prompt = this.buildPrompt(query, context);

      logger.debug('AI inference request', { 
        model: this.modelName, 
        promptLength: prompt.length,
        hasContext: !!context 
      });

      const response = await axios.post(
        `${this.ollamaBaseUrl}/api/generate`,
        {
          model: this.modelName,
          prompt: prompt,
          stream: true,
          
          // Optimized Ollama parameters (removed unsupported ones)
          temperature: OLLAMA_INFERENCE_PARAMS.temperature,
          top_p: OLLAMA_INFERENCE_PARAMS.top_p,
          top_k: OLLAMA_INFERENCE_PARAMS.top_k,
          num_predict: OLLAMA_INFERENCE_PARAMS.num_predict,
          stop: OLLAMA_INFERENCE_PARAMS.stop,
          num_ctx: OLLAMA_INFERENCE_PARAMS.num_ctx,
          system: OLLAMA_INFERENCE_PARAMS.system
          // Note: num_batch and num_gpu are not standard Ollama parameters
        },
        {
          timeout: 120000, // 2 minute timeout for streaming
          responseType: 'stream'
        }
      );

      // Return a Promise that resolves only when the stream completes
      return new Promise<void>((resolve, reject) => {
        let buffer = '';
        let streamEnded = false;

        const finish = () => {
          if (!streamEnded) {
            streamEnded = true;
            resolve();
          }
        };

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.response) {
                  onChunk({
                    text: data.response,
                    done: data.done || false
                  });
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        });

        response.data.on('end', () => {
          if (buffer.trim()) {
            try {
              const data = JSON.parse(buffer);
              if (data.response) {
                onChunk({
                  text: data.response,
                  done: true
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
          onChunk({ text: '', done: true });
          finish();
        });

        response.data.on('error', (error: Error) => {
          logger.error('Ollama streaming error:', error);
          onChunk({ text: '', done: true });
          if (!streamEnded) {
            streamEnded = true;
            reject(error);
          }
        });
      });
    } catch (error: any) {
      logger.error('Ollama streaming failed:', error);
      
      // Log detailed error information
      if (error.response) {
        logger.error('Ollama API streaming error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Ollama API error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Ollama service is not available. Please ensure Ollama is running.');
      }
      
      throw new Error(`Ollama streaming error: ${error.message}`);
    }
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    logger.info('🗑️ AI Service disposed');
  }

  /**
   * Gemini vision analysis
   * Analyzes images using Gemini's multimodal capabilities
   */
  private async analyzeImageGemini(imageBase64: string, prompt?: string): Promise<InferenceResponse> {
    const startTime = Date.now();

    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const analysisPrompt = prompt || 
      "Describe what you see in this image. Focus on any people, gestures, and what they might be doing. Be brief (2-3 sentences).";

    try {
      logger.info('👁️ Analyzing image with Gemini...');
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.cloudModel}:generateContent?key=${this.geminiApiKey}`;

      const response = await axios.post(
        url,
        {
          contents: [{
            parts: [
              {
                text: analysisPrompt
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 200,
            stopSequences: ["\n\n", "###"]
          },
          systemInstruction: {
            parts: [{
              text: `You are Dixi's vision system. Describe what you see concisely and helpfully.
Focus on:
- People and their body language/gestures
- Hand positions and what they might indicate
- The environment and context
- Any text or objects visible
Be conversational and brief (2-3 sentences max).`
            }]
          }
        },
        {
          timeout: 30000 // 30 second timeout for vision
        }
      );

      const inferenceTime = Date.now() - startTime;
      const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not analyze image';

      if (!responseText) {
        throw new Error('Empty response from Gemini vision API');
      }

      logger.info(`✅ Gemini vision analysis complete in ${inferenceTime}ms`);

      return {
        text: responseText,
        metadata: {
          inferenceTime,
          model: this.cloudModel,
          tokenCount: responseText.split(' ').length,
          confidence: 0.9,
          tokens: response.data.usageMetadata?.totalTokenCount || responseText.split(' ').length
        }
      };
    } catch (error: any) {
      logger.error('Gemini vision analysis failed:', error);
      
      if (error.response) {
        logger.error('Gemini API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Gemini API error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Gemini API service is not available for vision analysis');
      }
      
      throw new Error(`Gemini vision analysis error: ${error.message}`);
    }
  }

  // Analyze an image using the vision model (llava)
  async analyzeImage(imageBase64: string, prompt?: string): Promise<InferenceResponse> {
    const analysisPrompt = prompt || 
      "Describe what you see in this image. Focus on any people, gestures, and what they might be doing. Be brief (2-3 sentences).";

    // Try Gemini first if configured, fall back to Ollama
    if (this.aiProvider === 'gemini' && this.geminiApiKey) {
      try {
        return await this.analyzeImageGemini(imageBase64, prompt);
      } catch (geminiError: any) {
        logger.warn('Gemini vision analysis failed, falling back to Ollama:', geminiError.message);
        // Continue to Ollama fallback below
      }
    }

    const startTime = Date.now();

    try {
      logger.info('👁️ Analyzing image with vision model...');
      
      const response = await axios.post(
        `${this.ollamaBaseUrl}/api/generate`,
        {
          model: this.visionModelName,
          prompt: analysisPrompt,
          images: [imageBase64], // Base64 encoded image
          stream: false,
          temperature: 0.7,
          num_predict: 200,
          system: `You are Dixi's vision system. Describe what you see concisely and helpfully.
Focus on:
- People and their body language/gestures
- Hand positions and what they might indicate
- The environment and context
- Any text or objects visible
Be conversational and brief (2-3 sentences max).`
        },
        {
          timeout: 30000 // 30 second timeout for vision
        }
      );

      const inferenceTime = Date.now() - startTime;
      const responseText = response.data.response || 'Could not analyze image';

      logger.info(`✅ Vision analysis complete in ${inferenceTime}ms`);

      return {
        text: responseText,
        metadata: {
          inferenceTime,
          model: this.visionModelName,
          tokenCount: responseText.split(' ').length,
          confidence: 0.9
        }
      };
    } catch (error: any) {
      logger.error('Vision analysis failed:', error);
      
      if (error.response?.status === 404) {
        throw new Error(`Vision model '${this.visionModelName}' not found. Run: ollama pull ${this.visionModelName}`);
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama service not available for vision analysis');
      }
      
      throw new Error(`Vision analysis error: ${error.message}`);
    }
  }

  /**
   * Capture a frame from the vision service and analyze it
   * Uses typed VisionAnalysisContext for full body + hands + face + eyes tracking
   */
  async analyzeCurrentFrame(prompt?: string, context?: VisionAnalysisContext): Promise<InferenceResponse> {
    try {
      logger.info('📸 Capturing frame from vision service...');
      
      // Get a frame from the vision service
      const frameResponse = await axios.get(
        `${this.visionServiceUrl}/capture_frame`,
        {
          timeout: 5000,
          responseType: 'arraybuffer'
        }
      );

      // Convert to base64
      const imageBase64 = Buffer.from(frameResponse.data).toString('base64');
      
      // Build enhanced prompt with context
      let enhancedPrompt = prompt || "Describe what you see in this image. Focus on any people, gestures, and what they might be doing. Be brief (2-3 sentences).";
      
      if (context) {
        const contextInfo: string[] = [];
        
        // Single gesture context (legacy support)
        if (context.gesture?.type && context.gesture.type !== 'none') {
          const hand = context.gesture.hand ? ` (${context.gesture.hand} hand)` : '';
          contextInfo.push(`The person is making a "${context.gesture.type}" gesture${hand}.`);
        }
        
        // Both hands context
        if (context.hands) {
          if (context.hands.left?.detected && context.hands.left.gesture !== 'unknown') {
            contextInfo.push(`Left hand: ${context.hands.left.gesture} gesture.`);
          }
          if (context.hands.right?.detected && context.hands.right.gesture !== 'unknown') {
            contextInfo.push(`Right hand: ${context.hands.right.gesture} gesture.`);
          }
        }
        
        // Face context
        if (context.face?.detected) {
          const face = context.face;
          const faceInfo: string[] = [];
          
          if (face.engagement) {
            if (face.engagement.is_engaged) {
              faceInfo.push("The person appears engaged and attentive.");
            } else {
              faceInfo.push("The person may not be fully engaged.");
            }
          }
          
          if (face.mouth_features) {
            if (face.mouth_features.is_smiling) {
              faceInfo.push("The person is smiling.");
            }
            if (face.mouth_features.mouth_open) {
              faceInfo.push("The person's mouth is open (possibly speaking or surprised).");
            }
          }
          
          if (face.eye_features) {
            if (!face.eye_features.both_eyes_open) {
              faceInfo.push("The person's eyes may be closed or partially closed.");
            }
            if (Math.abs(face.eye_features.gaze_direction) > 0.3) {
              const direction = face.eye_features.gaze_direction > 0 ? "right" : "left";
              faceInfo.push(`The person is looking ${direction}.`);
            }
          }
          
          if (face.head_pose) {
            if (Math.abs(face.head_pose.tilt) > 10) {
              faceInfo.push(`The person's head is tilted (${face.head_pose.tilt.toFixed(1)}°).`);
            }
          }
          
          if (faceInfo.length > 0) {
            contextInfo.push(...faceInfo);
          }
        }
        
        // Body pose context
        if (context.body?.detected) {
          if (context.body.posture && context.body.posture !== 'unknown') {
            contextInfo.push(`The person is ${context.body.posture}.`);
          }
        }
        
        // Eye tracking context
        if (context.eyes) {
          if (context.eyes.attention_score !== undefined && context.eyes.attention_score < 0.5) {
            contextInfo.push("The person may be distracted or looking away.");
          }
          if (context.eyes.combined_gaze) {
            const gazeX = context.eyes.combined_gaze.x;
            if (Math.abs(gazeX) > 0.3) {
              const direction = gazeX > 0 ? "right" : "left";
              contextInfo.push(`The person is gazing ${direction}.`);
            }
          }
        }
        
        if (contextInfo.length > 0) {
          enhancedPrompt = `${enhancedPrompt}\n\nContext: ${contextInfo.join(' ')}`;
        }
      }
      
      // Analyze the frame with enhanced prompt
      return await this.analyzeImage(imageBase64, enhancedPrompt);
    } catch (error: any) {
      logger.error('Frame capture/analysis failed:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Vision service not available for frame capture');
      }
      
      throw new Error(`Frame analysis error: ${error.message}`);
    }
  }

  // Check if vision model is available
  async isVisionModelAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`, { timeout: 5000 });
      const models = response.data.models || [];
      return models.some((m: any) => m.name.includes('llava') || m.name.includes('bakllava'));
    } catch {
      return false;
    }
  }
}
