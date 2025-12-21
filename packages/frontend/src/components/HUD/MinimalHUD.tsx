import React, { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useGestureStore } from '../../store/gestureStore';
import { useAIStore } from '../../store/aiStore';
import './MinimalHUD.css';

const MinimalHUD: React.FC = () => {
  const { isConnected } = useWebSocket();
  const currentGesture = useGestureStore((state) => state.currentGesture);
  const isProcessing = useAIStore((state) => state.isProcessing);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;
    let lastUpdate = performance.now();

    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastUpdate;

      if (elapsed >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastUpdate = now;
      }

      animationFrameId = requestAnimationFrame(updateFPS);
    };

    animationFrameId = requestAnimationFrame(updateFPS);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="minimal-hud">
      <div className="hud-item">
        <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="hud-label">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
      </div>
      {currentGesture && (
        <div className="hud-item">
          <span className="hud-label">GESTURE:</span>
          <span className="hud-value">
            {currentGesture.type.toUpperCase()} {(currentGesture.confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}
      <div className="hud-item fps-item">
        <span className="hud-label">FPS:</span>
        <span className="hud-value">{fps}</span>
      </div>
      {isProcessing && (
        <div className="hud-item">
          <span className="loading-dot" />
          <span className="hud-value">PROCESSING</span>
        </div>
      )}
    </div>
  );
};

export default MinimalHUD;

