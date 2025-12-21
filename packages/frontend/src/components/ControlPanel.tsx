import React, { useState } from 'react';
import { apiService } from '../services/api';
import './ControlPanel.css';

const ControlPanel: React.FC = () => {
  const [gestureTracking, setGestureTracking] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGestureToggle = async () => {
    setLoading(true);
    try {
      if (gestureTracking) {
        await apiService.stopGestureTracking();
      } else {
        await apiService.startGestureTracking();
      }
      setGestureTracking(!gestureTracking);
    } catch (error) {
      console.error('Failed to toggle gesture tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAIQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setLoading(true);
    try {
      await apiService.sendAIQuery(aiQuery);
      setAiQuery('');
    } catch (error) {
      console.error('Failed to send AI query:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="control-panel">
      <h2>Control Panel</h2>

      <section className="control-section">
        <h3>Gesture Tracking</h3>
        <button
          className={`control-button ${gestureTracking ? 'active' : ''}`}
          onClick={handleGestureToggle}
          disabled={loading}
        >
          {gestureTracking ? '⏸️ Stop Tracking' : '▶️ Start Tracking'}
        </button>
        <p className="control-status">
          Status: {gestureTracking ? '🟢 Active' : '🔴 Inactive'}
        </p>
      </section>

      <section className="control-section">
        <h3>AI Query</h3>
        <form onSubmit={handleAIQuery}>
          <textarea
            className="query-input"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="Ask anything..."
            rows={4}
            disabled={loading}
          />
          <button
            type="submit"
            className="control-button"
            disabled={loading || !aiQuery.trim()}
          >
            {loading ? '⏳ Processing...' : '🚀 Send Query'}
          </button>
        </form>
      </section>

      <section className="control-section">
        <h3>System Info</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">GPU:</span>
            <span className="info-value">NVIDIA 5070 Ti</span>
          </div>
          <div className="info-item">
            <span className="info-label">Model:</span>
            <span className="info-value">7B Quantized</span>
          </div>
          <div className="info-item">
            <span className="info-label">Render:</span>
            <span className="info-value">WebGL</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ControlPanel;
