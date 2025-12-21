import axios from 'axios';
import { createOllamaMock, mockOllamaResponse, mockOllamaTags } from '../../../helpers/mockOllama';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Import the AIService class
import { AIService } from '../../../../packages/backend/src/services/ai';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockOllamaTags() });
      
      await expect(aiService.initialize()).resolves.not.toThrow();
    });

    it('should handle Ollama not available', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));
      
      // Should not throw, but log warning
      await expect(aiService.initialize()).resolves.not.toThrow();
    });
  });

  describe('checkConnection', () => {
    it('should return true when Ollama is available', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockOllamaTags() });
      
      const result = await aiService.checkConnection();
      
      expect(result).toBe(true);
    });

    it('should return false when Ollama is down', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));
      
      const result = await aiService.checkConnection();
      
      expect(result).toBe(false);
    });

    it('should timeout after 5 seconds', async () => {
      mockedAxios.get.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 6000)
        )
      );
      
      const startTime = Date.now();
      const result = await aiService.checkConnection();
      const duration = Date.now() - startTime;
      
      expect(result).toBe(false);
      // Should timeout before 6 seconds
      expect(duration).toBeLessThan(6000);
    }, 10000);
  });

  describe('infer', () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValue({ data: mockOllamaTags() });
      await aiService.initialize();
    });

    it('should generate string response', async () => {
      mockedAxios.post.mockResolvedValue({ 
        data: mockOllamaResponse('test prompt') 
      });
      
      const result = await aiService.infer('What is 2+2?', {});
      
      expect(result).toHaveProperty('text');
      expect(typeof result.text).toBe('string');
    });

    it('should include context in prompt', async () => {
      mockedAxios.post.mockResolvedValue({ 
        data: mockOllamaResponse('test prompt') 
      });
      
      const context = {
        gesture: {
          type: 'wave',
          confidence: 0.85,
          coordinates: { x: 0.5, y: 0.5 }
        }
      };
      
      await aiService.infer('What gesture was that?', context);
      
      expect(mockedAxios.post).toHaveBeenCalled();
      const callArgs = mockedAxios.post.mock.calls[0];
      expect(callArgs[1].prompt).toContain('wave');
    });

    it('should handle empty prompt', async () => {
      await expect(aiService.infer('', {})).rejects.toThrow();
    });

    it('should handle null context', async () => {
      mockedAxios.post.mockResolvedValue({ 
        data: mockOllamaResponse('test prompt') 
      });
      
      const result = await aiService.infer('Simple question', null as any);
      
      expect(result).toHaveProperty('text');
    });

    it('should timeout on long inferences', async () => {
      mockedAxios.post.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 35000)
        )
      );
      
      await expect(aiService.infer('Long query', {}))
        .rejects.toThrow();
    }, 40000);
  });

  describe('inferStream', () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValue({ data: mockOllamaTags() });
      await aiService.initialize();
    });

    it('should stream response chunks', async () => {
      const chunks: string[] = [];
      
      // Mock streaming response
      mockedAxios.post.mockResolvedValue({
        data: {
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              callback(Buffer.from(JSON.stringify({ response: 'Hello ', done: false }) + '\n'));
              callback(Buffer.from(JSON.stringify({ response: 'world', done: true }) + '\n'));
            }
            if (event === 'end') {
              setTimeout(() => callback(Buffer.from('')), 10);
            }
            if (event === 'error') {
              // No error
            }
          }
        }
      });
      
      await aiService.inferStream(
        'Say hello',
        {},
        (chunk) => {
          chunks.push(chunk.text);
        }
      );
      
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should signal done=true at end', async () => {
      let lastChunk: { text: string; done: boolean } | null = null;
      
      mockedAxios.post.mockResolvedValue({
        data: {
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              callback(Buffer.from(JSON.stringify({ response: 'Final', done: true }) + '\n'));
            }
            if (event === 'end') {
              // noop
            }
          }
        }
      });
      
      await aiService.inferStream(
        'Test',
        {},
        (chunk) => {
          lastChunk = chunk;
        }
      );
      
      expect(lastChunk).not.toBeNull();
      expect(lastChunk!.done).toBe(true);
    });

    it('should handle callback errors gracefully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              callback(Buffer.from(JSON.stringify({ response: 'Test', done: true }) + '\n'));
            }
            if (event === 'end') {
              // noop
            }
            if (event === 'error') {
              // noop
            }
          }
        }
      });
      
      // Callback that throws
      const errorCallback = () => {
        throw new Error('Callback error');
      };
      
      // Should not crash the service
      await expect(
        aiService.inferStream('Test', {}, errorCallback)
      ).rejects.toThrow();
    });
  });
});

