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
      <div className="hud-section">
        <div className="hud-item">
          <span className="hud-label">Status:</span>
          <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        </div>
        {currentGesture && (
          <div className="hud-item">
            <span className="hud-label">Gesture:</span>
            <span className="hud-value">
              {currentGesture.type} ({(currentGesture.confidence * 100).toFixed(0)}%)
            </span>
          </div>
        )}
        <div className="hud-item">
          <span className="hud-label">FPS:</span>
          <span className="hud-value">{fps}</span>
        </div>
        {isProcessing && (
          <div className="hud-item">
            <span className="loading-dot" />
            <span className="hud-value">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinimalHUD;

