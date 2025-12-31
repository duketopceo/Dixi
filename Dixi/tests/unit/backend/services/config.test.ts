import { ConfigService, configService } from '../../../../packages/backend/src/services/config';

describe('Config Service', () => {
  let service: ConfigService;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv };
    service = new ConfigService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return full configuration', () => {
      const config = service.getConfig();
      expect(config).toHaveProperty('server');
      expect(config).toHaveProperty('services');
      expect(config).toHaveProperty('frontend');
      expect(config).toHaveProperty('cache');
    });
  });

  describe('getServerConfig', () => {
    it('should return server configuration', () => {
      const config = service.getServerConfig();
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('wsPort');
      expect(config).toHaveProperty('nodeEnv');
      expect(typeof config.port).toBe('number');
      expect(typeof config.wsPort).toBe('number');
    });
  });

  describe('getServicesConfig', () => {
    it('should return services configuration', () => {
      const config = service.getServicesConfig();
      expect(config).toHaveProperty('ollamaBaseUrl');
      expect(config).toHaveProperty('ollamaModel');
      expect(config).toHaveProperty('visionServiceUrl');
    });
  });

  describe('getFrontendConfig', () => {
    it('should return frontend configuration', () => {
      const config = service.getFrontendConfig();
      expect(config).toHaveProperty('url');
    });
  });

  describe('getCacheConfig', () => {
    it('should return cache configuration', () => {
      const config = service.getCacheConfig();
      expect(config).toHaveProperty('aiCacheSize');
      expect(config).toHaveProperty('aiCacheTTL');
      expect(config).toHaveProperty('gestureCacheSize');
      expect(config).toHaveProperty('gestureCacheTTL');
      expect(typeof config.aiCacheSize).toBe('number');
    });
  });

  describe('validateConfig', () => {
    it('should return valid for default configuration', () => {
      const result = service.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid port numbers', () => {
      process.env.PORT = '70000'; // Invalid port
      service.reloadConfig();
      const result = service.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('port'))).toBe(true);
    });

    it('should detect invalid URLs', () => {
      process.env.OLLAMA_BASE_URL = 'not-a-url';
      service.reloadConfig();
      const result = service.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('URL'))).toBe(true);
    });

    it('should detect invalid cache sizes', () => {
      process.env.AI_CACHE_SIZE = '0';
      service.reloadConfig();
      const result = service.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cache size'))).toBe(true);
    });
  });

  describe('reloadConfig', () => {
    it('should reload configuration from environment', () => {
      process.env.PORT = '4000';
      service.reloadConfig();
      const config = service.getServerConfig();
      expect(config.port).toBe(4000);
    });

    it('should throw error if validation fails', () => {
      process.env.PORT = '70000'; // Invalid
      expect(() => service.reloadConfig()).toThrow('Invalid configuration');
    });
  });

  describe('configService singleton', () => {
    it('should be an instance of ConfigService', () => {
      expect(configService).toBeInstanceOf(ConfigService);
    });
  });
});

