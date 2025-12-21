/**
 * Monitoring Service
 * 
 * Standalone service for collecting and exposing system metrics.
 * Tracks CPU, memory, requests, errors, and application-specific metrics.
 * 
 * DO NOT integrate this file into existing code yet.
 * This is a standalone implementation ready for future integration.
 */

import os from 'os';
import process from 'process';

interface SystemMetrics {
  cpu: {
    usage: number;
    count: number;
    model: string;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  uptime: {
    system: number;
    process: number;
  };
  timestamp: number;
}

interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
}

interface GestureMetrics {
  total: number;
  byType: Record<string, number>;
  averageConfidence: number;
  gesturesPerSecond: number;
  lastGesture: string | null;
}

interface AIMetrics {
  totalInferences: number;
  averageLatency: number;
  cacheHitRate: number;
  modelInUse: string;
  tokensGenerated: number;
}

interface WebSocketMetrics {
  connectedClients: number;
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
}

/**
 * MonitoringService - Collects and exposes system and application metrics
 */
export class MonitoringService {
  private requestLatencies: number[] = [];
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  
  private gestureCount = 0;
  private gesturesByType: Record<string, number> = {};
  private gestureConfidences: number[] = [];
  private lastGestureTime = Date.now();
  private lastGesture: string | null = null;
  
  private aiInferenceCount = 0;
  private aiLatencies: number[] = [];
  private aiCacheHits = 0;
  private aiCacheMisses = 0;
  private aiTokensGenerated = 0;
  private currentModel = 'llama3.2:latest';
  
  private wsClientCount = 0;
  private wsMessageCount = 0;
  private wsLatencies: number[] = [];
  private lastWsTime = Date.now();

  /**
   * Get current system metrics (CPU, memory, uptime)
   */
  getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);

    return {
      cpu: {
        usage: cpuUsage,
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usagePercent: (usedMemory / totalMemory) * 100
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get HTTP request metrics
   */
  getRequestMetrics(): RequestMetrics {
    const now = Date.now();
    const runtimeSeconds = (now - this.startTime) / 1000;
    
    const sorted = this.requestLatencies.slice().sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      total: this.requestCount,
      successful: this.successCount,
      failed: this.errorCount,
      averageLatency: this.calculateAverage(this.requestLatencies),
      p95Latency: sorted[p95Index] || 0,
      p99Latency: sorted[p99Index] || 0,
      requestsPerSecond: this.requestCount / runtimeSeconds
    };
  }

  /**
   * Get gesture detection metrics
   */
  getGestureMetrics(): GestureMetrics {
    const now = Date.now();
    const runtimeSeconds = (now - this.lastGestureTime) / 1000 || 1;

    return {
      total: this.gestureCount,
      byType: { ...this.gesturesByType },
      averageConfidence: this.calculateAverage(this.gestureConfidences),
      gesturesPerSecond: this.gestureCount / runtimeSeconds,
      lastGesture: this.lastGesture
    };
  }

  /**
   * Get AI inference metrics
   */
  getAIMetrics(): AIMetrics {
    const totalRequests = this.aiCacheHits + this.aiCacheMisses;
    const cacheHitRate = totalRequests > 0 
      ? (this.aiCacheHits / totalRequests) * 100 
      : 0;

    return {
      totalInferences: this.aiInferenceCount,
      averageLatency: this.calculateAverage(this.aiLatencies),
      cacheHitRate,
      modelInUse: this.currentModel,
      tokensGenerated: this.aiTokensGenerated
    };
  }

  /**
   * Get WebSocket metrics
   */
  getWebSocketMetrics(): WebSocketMetrics {
    const now = Date.now();
    const runtimeSeconds = (now - this.lastWsTime) / 1000 || 1;

    return {
      connectedClients: this.wsClientCount,
      totalMessages: this.wsMessageCount,
      messagesPerSecond: this.wsMessageCount / runtimeSeconds,
      averageLatency: this.calculateAverage(this.wsLatencies)
    };
  }

  /**
   * Record an HTTP request
   */
  recordRequest(latency: number, success: boolean): void {
    this.requestCount++;
    this.requestLatencies.push(latency);
    
    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }

    // Keep only last 1000 latencies to prevent memory growth
    if (this.requestLatencies.length > 1000) {
      this.requestLatencies.shift();
    }
  }

  /**
   * Record a gesture detection
   */
  recordGesture(type: string, confidence: number): void {
    this.gestureCount++;
    this.gesturesByType[type] = (this.gesturesByType[type] || 0) + 1;
    this.gestureConfidences.push(confidence);
    this.lastGesture = type;
    this.lastGestureTime = Date.now();

    // Keep only last 1000 confidences
    if (this.gestureConfidences.length > 1000) {
      this.gestureConfidences.shift();
    }
  }

  /**
   * Record an AI inference
   */
  recordAIInference(latency: number, tokens: number, cached: boolean): void {
    this.aiInferenceCount++;
    this.aiLatencies.push(latency);
    this.aiTokensGenerated += tokens;

    if (cached) {
      this.aiCacheHits++;
    } else {
      this.aiCacheMisses++;
    }

    // Keep only last 1000 latencies
    if (this.aiLatencies.length > 1000) {
      this.aiLatencies.shift();
    }
  }

  /**
   * Update WebSocket client count
   */
  updateWebSocketClients(count: number): void {
    this.wsClientCount = count;
  }

  /**
   * Record a WebSocket message
   */
  recordWebSocketMessage(latency: number): void {
    this.wsMessageCount++;
    this.wsLatencies.push(latency);
    this.lastWsTime = Date.now();

    // Keep only last 1000 latencies
    if (this.wsLatencies.length > 1000) {
      this.wsLatencies.shift();
    }
  }

  /**
   * Set current AI model
   */
  setAIModel(model: string): void {
    this.currentModel = model;
  }

  /**
   * Get all metrics in one call
   */
  getAllMetrics() {
    return {
      system: this.getSystemMetrics(),
      requests: this.getRequestMetrics(),
      gestures: this.getGestureMetrics(),
      ai: this.getAIMetrics(),
      websocket: this.getWebSocketMetrics()
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const system = this.getSystemMetrics();
    const requests = this.getRequestMetrics();
    const gestures = this.getGestureMetrics();
    const ai = this.getAIMetrics();
    const ws = this.getWebSocketMetrics();

    const lines: string[] = [];

    // System metrics
    lines.push(`# HELP dixi_cpu_usage_percent CPU usage percentage`);
    lines.push(`# TYPE dixi_cpu_usage_percent gauge`);
    lines.push(`dixi_cpu_usage_percent ${system.cpu.usage}`);

    lines.push(`# HELP dixi_memory_usage_bytes Memory usage in bytes`);
    lines.push(`# TYPE dixi_memory_usage_bytes gauge`);
    lines.push(`dixi_memory_usage_bytes ${system.memory.used}`);

    // Request metrics
    lines.push(`# HELP dixi_http_requests_total Total HTTP requests`);
    lines.push(`# TYPE dixi_http_requests_total counter`);
    lines.push(`dixi_http_requests_total ${requests.total}`);

    lines.push(`# HELP dixi_http_request_duration_ms HTTP request duration in milliseconds`);
    lines.push(`# TYPE dixi_http_request_duration_ms histogram`);
    lines.push(`dixi_http_request_duration_ms_sum ${requests.averageLatency * requests.total}`);
    lines.push(`dixi_http_request_duration_ms_count ${requests.total}`);

    // Gesture metrics
    lines.push(`# HELP dixi_gestures_total Total gestures detected`);
    lines.push(`# TYPE dixi_gestures_total counter`);
    lines.push(`dixi_gestures_total ${gestures.total}`);

    lines.push(`# HELP dixi_gesture_confidence Average gesture confidence`);
    lines.push(`# TYPE dixi_gesture_confidence gauge`);
    lines.push(`dixi_gesture_confidence ${gestures.averageConfidence}`);

    // AI metrics
    lines.push(`# HELP dixi_ai_inferences_total Total AI inferences`);
    lines.push(`# TYPE dixi_ai_inferences_total counter`);
    lines.push(`dixi_ai_inferences_total ${ai.totalInferences}`);

    lines.push(`# HELP dixi_ai_cache_hit_rate AI cache hit rate percentage`);
    lines.push(`# TYPE dixi_ai_cache_hit_rate gauge`);
    lines.push(`dixi_ai_cache_hit_rate ${ai.cacheHitRate}`);

    // WebSocket metrics
    lines.push(`# HELP dixi_websocket_clients WebSocket connected clients`);
    lines.push(`# TYPE dixi_websocket_clients gauge`);
    lines.push(`dixi_websocket_clients ${ws.connectedClients}`);

    return lines.join('\n');
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.requestLatencies = [];
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    
    this.gestureCount = 0;
    this.gesturesByType = {};
    this.gestureConfidences = [];
    this.lastGesture = null;
    
    this.aiInferenceCount = 0;
    this.aiLatencies = [];
    this.aiCacheHits = 0;
    this.aiCacheMisses = 0;
    this.aiTokensGenerated = 0;
    
    this.wsMessageCount = 0;
    this.wsLatencies = [];
  }

  /**
   * Calculate average of number array
   */
  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Example usage (commented out):
/*
// In your routes:
const startTime = Date.now();
// ... handle request ...
const latency = Date.now() - startTime;
monitoringService.recordRequest(latency, success);

// For gestures:
monitoringService.recordGesture('wave', 0.92);

// For AI:
monitoringService.recordAIInference(1234, 45, false);

// For WebSocket:
monitoringService.updateWebSocketClients(wss.clients.size);
monitoringService.recordWebSocketMessage(5);

// Get metrics:
const metrics = monitoringService.getAllMetrics();
console.log(metrics);

// Export for Prometheus:
const prometheus = monitoringService.exportPrometheusMetrics();
res.set('Content-Type', 'text/plain');
res.send(prometheus);
*/
