import axios from 'axios';
import logger from '../utils/logger';

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
  };
}

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

  async infer(query: string, context?: any): Promise<InferenceResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Build prompt with context if provided
      let prompt = query;
      if (context) {
        if (context.gesture) {
          prompt = `User performed a ${context.gesture.type} gesture${context.gesture.coordinates ? ` at coordinates (${context.gesture.coordinates.x}, ${context.gesture.coordinates.y})` : ''}. ${query}`;
        }
      }

      const response = await axios.post(
        `${this.ollamaBaseUrl}/api/generate`,
        {
          model: this.modelName,
          prompt: prompt,
          stream: false
        },
        {
          timeout: 60000 // 60 second timeout
        }
      );

      const inferenceTime = Date.now() - startTime;
      const responseText = response.data.response || '';

      return {
        text: responseText,
        metadata: {
          inferenceTime,
          tokenCount: responseText.split(' ').length,
          confidence: 0.95
        }
      };
    } catch (error: any) {
      logger.error('Ollama inference failed:', error);
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Ollama service is not available. Please ensure Ollama is running.');
      }
      throw new Error(`Ollama inference error: ${error.message}`);
    }
  }

  async inferStream(
    query: string, 
    context: any, 
    onChunk: (chunk: any) => void
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Build prompt with context if provided
      let prompt = query;
      if (context) {
        if (context.gesture) {
          prompt = `User performed a ${context.gesture.type} gesture${context.gesture.coordinates ? ` at coordinates (${context.gesture.coordinates.x}, ${context.gesture.coordinates.y})` : ''}. ${query}`;
        }
      }

      const response = await axios.post(
        `${this.ollamaBaseUrl}/api/generate`,
        {
          model: this.modelName,
          prompt: prompt,
          stream: true
        },
        {
          timeout: 120000, // 2 minute timeout for streaming
          responseType: 'stream'
        }
      );

      let buffer = '';
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
      });

      response.data.on('error', (error: Error) => {
        logger.error('Ollama streaming error:', error);
        onChunk({ text: '', done: true });
      });
    } catch (error: any) {
      logger.error('Ollama streaming failed:', error);
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
