/**
 * Configuration Management Service
 * 
 * Centralized configuration management with validation and defaults.
 */

interface ServerConfig {
  port: number;
  wsPort: number;
  nodeEnv: string;
}

interface ServicesConfig {
  ollamaBaseUrl: string;
  ollamaModel: string;
  visionServiceUrl: string;
}

interface FrontendConfig {
  url: string;
}

interface CacheConfig {
  aiCacheSize: number;
  aiCacheTTL: number;
  gestureCacheSize: number;
  gestureCacheTTL: number;
}

interface AppConfig {
  server: ServerConfig;
  services: ServicesConfig;
  frontend: FrontendConfig;
  cache: CacheConfig;
}

export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from environment variables with defaults
   */
  private loadConfig(): AppConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || '3001', 10),
        wsPort: parseInt(process.env.WS_PORT || '3002', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
      },
      services: {
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        ollamaModel: process.env.OLLAMA_MODEL || 'gemma3:4b',
        visionServiceUrl: process.env.VISION_SERVICE_URL || 'http://localhost:5000',
      },
      frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
      },
      cache: {
        aiCacheSize: parseInt(process.env.AI_CACHE_SIZE || '100', 10),
        aiCacheTTL: parseInt(process.env.AI_CACHE_TTL || '3600000', 10),
        gestureCacheSize: parseInt(process.env.GESTURE_CACHE_SIZE || '200', 10),
        gestureCacheTTL: parseInt(process.env.GESTURE_CACHE_TTL || '1800000', 10),
      },
    };
  }

  /**
   * Get full configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get server configuration
   */
  getServerConfig(): ServerConfig {
    return { ...this.config.server };
  }

  /**
   * Get services configuration
   */
  getServicesConfig(): ServicesConfig {
    return { ...this.config.services };
  }

  /**
   * Get frontend configuration
   */
  getFrontendConfig(): FrontendConfig {
    return { ...this.config.frontend };
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): CacheConfig {
    return { ...this.config.cache };
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate server config
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('Server port must be between 1 and 65535');
    }
    if (this.config.server.wsPort < 1 || this.config.server.wsPort > 65535) {
      errors.push('WebSocket port must be between 1 and 65535');
    }

    // Validate URLs
    try {
      new URL(this.config.services.ollamaBaseUrl);
    } catch {
      errors.push('Invalid Ollama base URL');
    }

    try {
      new URL(this.config.services.visionServiceUrl);
    } catch {
      errors.push('Invalid Vision service URL');
    }

    try {
      new URL(this.config.frontend.url);
    } catch {
      errors.push('Invalid frontend URL');
    }

    // Validate cache config
    if (this.config.cache.aiCacheSize < 1) {
      errors.push('AI cache size must be at least 1');
    }
    if (this.config.cache.gestureCacheSize < 1) {
      errors.push('Gesture cache size must be at least 1');
    }
    if (this.config.cache.aiCacheTTL < 0) {
      errors.push('AI cache TTL must be non-negative');
    }
    if (this.config.cache.gestureCacheTTL < 0) {
      errors.push('Gesture cache TTL must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Reload configuration from environment
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
  }
}

// Singleton instance
export const configService = new ConfigService();

