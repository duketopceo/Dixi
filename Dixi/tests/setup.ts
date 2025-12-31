/**
 * Global test setup for Jest
 */

// Set test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
  process.env.VISION_SERVICE_URL = 'http://localhost:5000';
  process.env.PORT = '3001';
  process.env.WS_PORT = '3002';
});

// Clean up after all tests
afterAll(() => {
  // Any global cleanup
});

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console.log/error in tests to reduce noise
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

