import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import './PerformanceDashboard.css';

interface PerformanceMetrics {
  vision: {
    fps: number | null;
    status: string;
    models: {
      hands: boolean;
      face: boolean;
      pose: boolean;
    };
  };
  backend: {
    latency: number;
    requestsPerSecond: number;
    p95Latency: number;
    p99Latency: number;
  };
  websocket: {
    connected: boolean;
    clients: number;
    messagesPerSecond: number;
    latency: number;
  };
  system: {
    cpu: number;
    memory: number;
    memoryUsed: number;
    memoryTotal: number;
  };
  timestamp: number;
}

interface Props {
  onLog: (type: string, message: string) => void;
}

export const PerformanceDashboard: React.FC<Props> = ({ onLog }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const data = await apiService.getPerformanceMetrics();
      setMetrics(data);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load metrics: ${msg}`);
      onLog('error', `Performance metrics error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return '#00FF87';
      case 'disconnected':
      case 'unhealthy':
        return '#FF006E';
      default:
        return '#FFD700';
    }
  };

  const getHealthColor = (value: number, thresholds: { good: number; warn: number }): string => {
    if (value <= thresholds.good) return '#00FF87';
    if (value <= thresholds.warn) return '#FFD700';
    return '#FF006E';
  };

  if (loading && !metrics) {
    return (
      <div className="cp-section">
        <div className="cp-section-header">
          <span className="cp-section-icon">📊</span>
          <span className="cp-section-title">Performance</span>
        </div>
        <div className="performance-loading">Loading metrics...</div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="cp-section">
        <div className="cp-section-header">
          <span className="cp-section-icon">📊</span>
          <span className="cp-section-title">Performance</span>
        </div>
        <div className="performance-error">{error}</div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="cp-section performance-dashboard">
      <div className="cp-section-header">
        <span className="cp-section-icon">📊</span>
        <span className="cp-section-title">Performance</span>
        <button 
          className="cp-btn-small" 
          onClick={fetchMetrics}
          title="Refresh metrics"
        >
          🔄
        </button>
      </div>

      <div className="performance-grid">
        {/* Vision Service */}
        <div className="performance-card">
          <div className="performance-card-header">
            <span>Vision Service</span>
            <span 
              className="performance-status-dot"
              style={{ backgroundColor: getStatusColor(metrics.vision.status) }}
            />
          </div>
          <div className="performance-metric">
            <span className="metric-label">FPS:</span>
            <span className="metric-value">
              {metrics.vision.fps !== null ? metrics.vision.fps.toFixed(1) : 'N/A'}
            </span>
          </div>
          <div className="performance-models">
            <div className="model-status">
              <span className={metrics.vision.models.hands ? 'model-enabled' : 'model-disabled'}>
                Hands
              </span>
              <span className={metrics.vision.models.face ? 'model-enabled' : 'model-disabled'}>
                Face
              </span>
              <span className={metrics.vision.models.pose ? 'model-enabled' : 'model-disabled'}>
                Pose
              </span>
            </div>
          </div>
        </div>

        {/* Backend */}
        <div className="performance-card">
          <div className="performance-card-header">
            <span>Backend</span>
          </div>
          <div className="performance-metric">
            <span className="metric-label">Latency:</span>
            <span 
              className="metric-value"
              style={{ color: getHealthColor(metrics.backend.latency, { good: 50, warn: 200 }) }}
            >
              {metrics.backend.latency.toFixed(0)}ms
            </span>
          </div>
          <div className="performance-metric">
            <span className="metric-label">Req/s:</span>
            <span className="metric-value">{metrics.backend.requestsPerSecond.toFixed(1)}</span>
          </div>
          <div className="performance-metric">
            <span className="metric-label">P95:</span>
            <span className="metric-value">{metrics.backend.p95Latency.toFixed(0)}ms</span>
          </div>
        </div>

        {/* WebSocket */}
        <div className="performance-card">
          <div className="performance-card-header">
            <span>WebSocket</span>
            <span 
              className="performance-status-dot"
              style={{ backgroundColor: metrics.websocket.connected ? '#00FF87' : '#FF006E' }}
            />
          </div>
          <div className="performance-metric">
            <span className="metric-label">Clients:</span>
            <span className="metric-value">{metrics.websocket.clients}</span>
          </div>
          <div className="performance-metric">
            <span className="metric-label">Msg/s:</span>
            <span className="metric-value">{metrics.websocket.messagesPerSecond.toFixed(1)}</span>
          </div>
          <div className="performance-metric">
            <span className="metric-label">Latency:</span>
            <span className="metric-value">{metrics.websocket.latency.toFixed(0)}ms</span>
          </div>
        </div>

        {/* System */}
        <div className="performance-card">
          <div className="performance-card-header">
            <span>System</span>
          </div>
          <div className="performance-metric">
            <span className="metric-label">CPU:</span>
            <span 
              className="metric-value"
              style={{ color: getHealthColor(metrics.system.cpu, { good: 50, warn: 80 }) }}
            >
              {metrics.system.cpu.toFixed(1)}%
            </span>
          </div>
          <div className="performance-metric">
            <span className="metric-label">Memory:</span>
            <span 
              className="metric-value"
              style={{ color: getHealthColor(metrics.system.memory, { good: 60, warn: 85 }) }}
            >
              {metrics.system.memory.toFixed(1)}%
            </span>
          </div>
          <div className="performance-metric">
            <span className="metric-label">Used:</span>
            <span className="metric-value">
              {(metrics.system.memoryUsed / 1024 / 1024 / 1024).toFixed(2)} GB / {(metrics.system.memoryTotal / 1024 / 1024 / 1024).toFixed(2)} GB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
