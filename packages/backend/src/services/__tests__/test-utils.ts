import { AIService } from '../ai';
import { aiResponseCache } from '../cache';

/**
 * Create an AIService instance with specific environment variables
 * Temporarily sets env vars, creates service, then restores original env
 */
export function createAIServiceWithEnv(env: Partial<NodeJS.ProcessEnv> = {}): AIService {
  const oldEnv = { ...process.env };
  Object.assign(process.env, env);
  const service = new AIService();
  process.env = oldEnv;
  return service;
}

/**
 * Clear the AI response cache between tests
 */
export function clearAICache(): void {
  aiResponseCache.clear();
}

/**
 * Create a minimal valid JPEG base64 string for testing
 * This is a 1x1 pixel JPEG image (minimal valid JPEG)
 */
export function createMockImageBase64(): string {
  // Minimal valid JPEG base64 (1x1 pixel, RGB)
  // FF D8 FF E0 00 10 4A 46 49 46 00 01 01 00 00 01 00 01 00 00 FF DB 00 43 ...
  return '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
}
