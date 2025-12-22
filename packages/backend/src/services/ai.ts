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
  // Note: num_batch and num_gpu are not standard Ollama API parameters
  
  // System Prompt (CRITICAL)
  system: `You are Dixi, an AI assistant for an interactive gesture-controlled whiteboard. 
Rules:
- Keep responses to 1-3 sentences maximum
- Be conversational and helpful
- Acknowledge gestures naturally
- Never say "based on your gesture" - just respond naturally
- Use emojis sparingly (1 per response max)
- Focus on actionable insights`
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

  constructor() {
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    // Use gemma3:4b if available, otherwise fallback to llama3.2
    this.modelName = process.env.OLLAMA_MODEL || 'gemma3:4b';
    logger.info('🤖 AI Service initialized');
    logger.info(`🔗 Ollama Base URL: ${this.ollamaBaseUrl}`);
    logger.info(`📦 Ollama Model: ${this.modelName}`);
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
      backend: 'ollama'
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

  async infer(query: string, context?: GestureContext): Promise<InferenceResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = generateQueryCacheKey(query, this.modelName);
      const cached = aiResponseCache.get(cacheKey);
      
      if (cached) {
        logger.debug('AI response cache hit', { cacheKey });
        return {
          text: cached,
          metadata: {
            inferenceTime: 0, // Cached, no inference time
            tokenCount: cached.split(' ').length,
            confidence: 0.95,
            model: this.modelName,
            context: this.buildOptimizedContext(context),
            tokens: cached.split(' ').length,
          }
        };
      }

      // Build optimized context (minimal, essential only)
      const optimizedContext = this.buildOptimizedContext(context);
      const prompt = this.buildPrompt(query, context);

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
}
