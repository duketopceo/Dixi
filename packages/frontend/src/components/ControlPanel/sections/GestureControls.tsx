import React, { useState } from 'react';
import { apiService } from '../../../services/api';

interface GestureData {
  type: string;
  position: { x: number; y: number; z?: number };
  confidence: number;
  timestamp: number;
  fingers?: Record<string, boolean>;
}

interface Props {
  currentGesture: GestureData | null;
  onLog: (type: string, message: string) => void;
}

export const GestureControls: React.FC<Props> = ({ currentGesture, onLog }) => {
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleTracking = async () => {
    setLoading(true);
    try {
      if (tracking) {
        const result = await apiService.stopTracking();
        if (result?.status === 'stopped') {
          setTracking(false);
          onLog('success', 'Tracking stopped');
        } else {
          onLog('error', 'Failed to stop tracking');
        }
      } else {
        const result = await apiService.startTracking();
        if (result?.status === 'started' || result?.status === 'already_running') {
          setTracking(true);
          onLog('success', 'Tracking started');
        } else {
          onLog('error', 'Failed to start tracking');
        }
      }
    } catch (e) {
      onLog('error', `Error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-section">
      <div className="cp-section-header">
        <span className="cp-section-icon">👋</span>
        <span className="cp-section-title">Gestures</span>
      </div>
      
      <button 
        className={`cp-btn ${tracking ? 'active' : ''}`}
        onClick={toggleTracking}
        disabled={loading}
      >
        {loading ? 'Loading...' : tracking ? '⏹ Stop Tracking' : '▶ Start Tracking'}
      </button>

      {currentGesture && currentGesture.type !== 'none' && (
        <div className="cp-gesture-display">
          <div className="cp-gesture-type">{currentGesture.type}</div>
          <div className="cp-gesture-meta">
            <span>Confidence: {(currentGesture.confidence * 100).toFixed(0)}%</span>
            <span>
              Pos: ({currentGesture.position.x.toFixed(2)}, {currentGesture.position.y.toFixed(2)})
            </span>
          </div>
        </div>
      )}

      {tracking && (
        <div className="cp-video-container">
          <img 
            src={`${import.meta.env.VITE_VISION_SERVICE_URL || 'http://localhost:5001'}/video_feed?t=${Date.now()}`} 
            alt="Camera feed"
            className="cp-video-feed"
          />
        </div>
      )}
    </div>
  );
};
