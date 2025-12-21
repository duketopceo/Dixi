/**
 * Mock Ollama API responses for testing
 */

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface StreamChunk {
  text: string;
  done: boolean;
}

/**
 * Create a mock Ollama response
 */
export const mockOllamaResponse = (prompt: string): OllamaResponse => ({
  model: 'gemma3:4b',
  created_at: new Date().toISOString(),
  response: `Mocked response for: ${prompt.substring(0, 50)}...`,
  done: true,
  total_duration: 1000000000,
  load_duration: 100000000,
  prompt_eval_count: 10,
  prompt_eval_duration: 200000000,
  eval_count: 20,
  eval_duration: 500000000
});

/**
 * Create a mock streaming response generator
 */
export function* mockOllamaStream(prompt: string): Generator<StreamChunk> {
  const responseText = `Mocked streaming response for: ${prompt.substring(0, 30)}`;
  const words = responseText.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    yield {
      text: words[i] + (i < words.length - 1 ? ' ' : ''),
      done: i === words.length - 1
    };
  }
}

/**
 * Create mock Ollama tags response (for /api/tags)
 */
export const mockOllamaTags = () => ({
  models: [
    {
      name: 'gemma3:4b',
      modified_at: new Date().toISOString(),
      size: 4000000000,
      digest: 'sha256:mock-digest',
      details: {
        format: 'gguf',
        family: 'gemma',
        families: ['gemma'],
        parameter_size: '4B',
        quantization_level: 'Q4_0'
      }
    }
  ]
});

/**
 * Mock axios for Ollama requests
 */
export const createOllamaMock = () => {
  return {
    post: jest.fn().mockImplementation((url: string, data: any) => {
      if (url.includes('/api/generate')) {
        if (data.stream) {
          // Return mock stream
          const mockStream = {
            data: {
              on: jest.fn((event: string, callback: (chunk: Buffer) => void) => {
                if (event === 'data') {
                  const response = mockOllamaResponse(data.prompt);
                  callback(Buffer.from(JSON.stringify({ response: response.response, done: true })));
                }
                if (event === 'end') {
                  setTimeout(() => callback(Buffer.from('')), 10);
                }
              })
            }
          };
          return Promise.resolve(mockStream);
        }
        return Promise.resolve({ data: mockOllamaResponse(data.prompt) });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }),
    get: jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/tags')) {
        return Promise.resolve({ data: mockOllamaTags() });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    })
  };
};

/**
 * Mock WebSocket service
 */
export const createWebSocketMock = () => ({
  broadcastGestureUpdate: jest.fn(),
  broadcastAIResponse: jest.fn(),
  getClientCount: jest.fn().mockReturnValue(0),
  broadcast: jest.fn()
});

/**
 * Mock vision service responses
 */
export const mockVisionServiceResponse = {
  gesture: {
    type: 'wave',
    position: { x: 0.5, y: 0.5, z: 0 },
    confidence: 0.85,
    timestamp: Date.now()
  },
  health: {
    status: 'healthy',
    timestamp: Date.now(),
    service: 'vision',
    version: '1.0.0'
  },
  tracking: {
    status: 'started',
    message: 'Tracking started successfully'
  }
};

