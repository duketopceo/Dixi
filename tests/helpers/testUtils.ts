/**
 * Test utility functions for Dixi test suite
 */

import axios, { AxiosRequestConfig } from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const VISION_URL = process.env.VISION_URL || 'http://localhost:5000';
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Check if a service is available
 */
export async function isServiceAvailable(
  url: string, 
  timeout: number = 2000
): Promise<boolean> {
  try {
    await axios.get(url, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if backend is available
 */
export async function isBackendAvailable(): Promise<boolean> {
  return isServiceAvailable(`${BACKEND_URL}/health`);
}

/**
 * Check if vision service is available
 */
export async function isVisionAvailable(): Promise<boolean> {
  return isServiceAvailable(`${VISION_URL}/health`);
}

/**
 * Check if Ollama is available
 */
export async function isOllamaAvailable(): Promise<boolean> {
  return isServiceAvailable(`${OLLAMA_URL}/api/tags`);
}

/**
 * Check if all services are available
 */
export async function areAllServicesAvailable(): Promise<{
  backend: boolean;
  vision: boolean;
  ollama: boolean;
  all: boolean;
}> {
  const [backend, vision, ollama] = await Promise.all([
    isBackendAvailable(),
    isVisionAvailable(),
    isOllamaAvailable()
  ]);

  return {
    backend,
    vision,
    ollama,
    all: backend && vision && ollama
  };
}

/**
 * Wait for a service to become available
 */
export async function waitForService(
  url: string,
  maxWaitMs: number = 30000,
  intervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await isServiceAvailable(url, 1000)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return false;
}

/**
 * Generate random gesture data
 */
export function generateRandomGesture(): {
  type: string;
  position: { x: number; y: number; z: number };
  confidence: number;
  timestamp: number;
} {
  const gestureTypes = [
    'wave', 'point', 'pinch', 'fist', 'open_palm', 'peace',
    'thumbs_up', 'swipe_left', 'swipe_right'
  ];

  return {
    type: gestureTypes[Math.floor(Math.random() * gestureTypes.length)],
    position: {
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.5
    },
    confidence: 0.7 + Math.random() * 0.3,
    timestamp: Date.now()
  };
}

/**
 * Make a request with retry logic
 */
export async function requestWithRetry<T>(
  config: AxiosRequestConfig,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios(config);
      return response.data as T;
    } catch (error: any) {
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  return null;
}

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - start
  };
}

/**
 * Run a function multiple times and collect statistics
 */
export async function benchmark(
  fn: () => Promise<void>,
  iterations: number = 10
): Promise<{
  min: number;
  max: number;
  avg: number;
  median: number;
  times: number[];
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { durationMs } = await measureTime(fn);
    times.push(durationMs);
  }

  times.sort((a, b) => a - b);

  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    median: times[Math.floor(times.length / 2)],
    times
  };
}

/**
 * Create a test timeout promise
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Test timeout after ${ms}ms`)), ms);
  });
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  return Promise.race([promise, createTimeout(ms)]);
}

/**
 * Skip test if services not available
 */
export function skipIfServicesUnavailable(
  servicesAvailable: boolean,
  testFn: () => void | Promise<void>
): () => void | Promise<void> {
  return () => {
    if (!servicesAvailable) {
      console.log('Skipping - services not available');
      return;
    }
    return testFn();
  };
}

