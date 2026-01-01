import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import './ModelConfig.css';

interface VisionConfig {
  frame_skip_interval: number;
  enable_face_tracking: boolean;
  enable_pose_tracking: boolean;
  backend_push_cooldown_ms: number;
  adaptive_fps: boolean;
  adaptive_idle_fps: number;
  adaptive_active_fps: number;
  adaptive_idle_timeout_seconds: number;
}

interface Props {
  onLog: (type: string, message: string) => void;
}

export const ModelConfig: React.FC<Props> = ({ onLog }) => {
  const [config, setConfig] = useState<VisionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      const response = await apiService.getVisionConfig();
      setConfig(response.config || response);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load config: ${msg}`);
      onLog('error', `Config load error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const updateConfig = async (updates: Partial<VisionConfig>) => {
    if (!config) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const newConfig = { ...config, ...updates };
      await apiService.updateVisionConfig(newConfig);
      setConfig(newConfig);
      onLog('success', 'Configuration updated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to update config: ${msg}`);
      onLog('error', `Config update error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="cp-section">
        <div className="cp-section-header">
          <span className="cp-section-icon">⚙️</span>
          <span className="cp-section-title">Model Config</span>
        </div>
        <div className="config-loading">Loading configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="cp-section">
        <div className="cp-section-header">
          <span className="cp-section-icon">⚙️</span>
          <span className="cp-section-title">Model Config</span>
        </div>
        <div className="config-error">
          {error || 'Failed to load configuration'}
        </div>
      </div>
    );
  }

  return (
    <div className="cp-section model-config">
      <div className="cp-section-header">
        <span className="cp-section-icon">⚙️</span>
        <span className="cp-section-title">Model Config</span>
        <button 
          className="cp-btn-small" 
          onClick={fetchConfig}
          title="Refresh config"
          disabled={saving}
        >
          🔄
        </button>
      </div>

      {error && <div className="config-message error">{error}</div>}

      <div className="config-controls">
        {/* Frame Skip Interval */}
        <div className="config-control">
          <label className="config-label">
            Frame Skip Interval: {config.frame_skip_interval}
            <span className="config-hint">(Process every Nth frame, higher = less compute)</span>
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={config.frame_skip_interval}
            onChange={(e) => updateConfig({ frame_skip_interval: parseInt(e.target.value) })}
            disabled={saving}
            className="config-slider"
          />
          <div className="config-slider-labels">
            <span>1 (30 FPS)</span>
            <span>2 (15 FPS)</span>
            <span>3 (10 FPS)</span>
            <span>4 (7.5 FPS)</span>
            <span>5 (6 FPS)</span>
          </div>
        </div>

        {/* Model Toggles */}
        <div className="config-control">
          <label className="config-label">Model Processing</label>
          <div className="config-toggles">
            <label className="config-toggle">
              <input
                type="checkbox"
                checked={config.enable_face_tracking}
                onChange={(e) => updateConfig({ enable_face_tracking: e.target.checked })}
                disabled={saving}
              />
              <span>Face Tracking</span>
            </label>
            <label className="config-toggle">
              <input
                type="checkbox"
                checked={config.enable_pose_tracking}
                onChange={(e) => updateConfig({ enable_pose_tracking: e.target.checked })}
                disabled={saving}
              />
              <span>Pose Tracking</span>
            </label>
          </div>
          <div className="config-note">
            Note: Hand tracking is always enabled. Disabling face/pose reduces compute by ~30-50%.
          </div>
        </div>

        {/* Adaptive FPS */}
        <div className="config-control">
          <label className="config-toggle">
            <input
              type="checkbox"
              checked={config.adaptive_fps}
              onChange={(e) => updateConfig({ adaptive_fps: e.target.checked })}
              disabled={saving}
            />
            <span>Adaptive FPS</span>
          </label>
          <div className="config-note">
            Automatically reduces to {config.adaptive_idle_fps} FPS when idle, increases to {config.adaptive_active_fps} FPS when active
          </div>
        </div>

        {/* Backend Push Cooldown */}
        <div className="config-control">
          <label className="config-label">
            Backend Push Cooldown: {config.backend_push_cooldown_ms}ms
            <span className="config-hint">(Time between backend updates)</span>
          </label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={config.backend_push_cooldown_ms}
            onChange={(e) => updateConfig({ backend_push_cooldown_ms: parseInt(e.target.value) })}
            disabled={saving}
            className="config-slider"
          />
          <div className="config-slider-labels">
            <span>100ms</span>
            <span>500ms</span>
            <span>1000ms</span>
          </div>
        </div>
      </div>

      {saving && (
        <div className="config-saving">Saving configuration...</div>
      )}
    </div>
  );
};
