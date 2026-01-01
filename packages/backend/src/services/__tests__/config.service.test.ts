import { ConfigService } from '../config';

describe('ConfigService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Default configuration', () => {
    it('should use default vision service URL of http://localhost:5001', () => {
      delete process.env.VISION_SERVICE_URL;
      const configService = new ConfigService();
      const config = configService.getServicesConfig();
      
      expect(config.visionServiceUrl).toBe('http://localhost:5001');
    });

    it('should use default server port 3001', () => {
      delete process.env.PORT;
      const configService = new ConfigService();
      const config = configService.getServerConfig();
      
      expect(config.port).toBe(3001);
    });

    it('should use default WebSocket port 3002', () => {
      delete process.env.WS_PORT;
      const configService = new ConfigService();
      const config = configService.getServerConfig();
      
      expect(config.wsPort).toBe(3002);
    });
  });

  describe('Environment variable override', () => {
    it('should use VISION_SERVICE_URL from environment', () => {
      process.env.VISION_SERVICE_URL = 'http://localhost:9999';
      const configService = new ConfigService();
      const config = configService.getServicesConfig();
      
      expect(config.visionServiceUrl).toBe('http://localhost:9999');
    });

    it('should use PORT from environment', () => {
      process.env.PORT = '8080';
      const configService = new ConfigService();
      const config = configService.getServerConfig();
      
      expect(config.port).toBe(8080);
    });
  });

  describe('Config validation', () => {
    it('should validate correct configuration', () => {
      const configService = new ConfigService();
      const validation = configService.validateConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid vision service URL', () => {
      process.env.VISION_SERVICE_URL = 'not-a-valid-url';
      const configService = new ConfigService();
      // Note: validateConfig checks URL validity, but loadConfig doesn't throw
      // The validation will catch invalid URLs
      const validation = configService.validateConfig();
      
      // The validation should catch the invalid URL format
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid Vision service URL');
    });

    it('should detect invalid port range', () => {
      process.env.PORT = '99999'; // Invalid port
      const configService = new ConfigService();
      const validation = configService.validateConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Server port must be between 1 and 65535');
    });
  });

  describe('Config getters', () => {
    it('should return full config', () => {
      const configService = new ConfigService();
      const config = configService.getConfig();
      
      expect(config).toHaveProperty('server');
      expect(config).toHaveProperty('services');
      expect(config).toHaveProperty('frontend');
      expect(config).toHaveProperty('cache');
    });

    it('should return services config with vision service URL', () => {
      const configService = new ConfigService();
      const servicesConfig = configService.getServicesConfig();
      
      expect(servicesConfig).toHaveProperty('visionServiceUrl');
      expect(servicesConfig.visionServiceUrl).toBeTruthy();
    });
  });
});
