import React from 'react';
import { useVisionStore } from '../vision/visionStore';

const STATUS_COLOR: Record<string, string> = {
  idle: '#888',
  starting: '#FFB800',
  ready: '#00F5FF',
  running: '#00FF87',
  error: '#FF006E',
};

/** Bottom-left pill: vision source status, fps, calibrate/recalibrate. */
export const VisionHUD: React.FC = () => {
  const { mode, status, fps, inferenceMs, homography, error } = useVisionStore();
  const beginCalibration = useVisionStore((s) => s.beginCalibration);
  const clearCalibration = useVisionStore((s) => s.clearCalibration);
  const calibrating = useVisionStore((s) => s.calibrating);

  if (mode !== 'browser' || calibrating) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 1500,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '8px 14px',
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 20,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        color: '#fff',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: STATUS_COLOR[status] ?? '#888',
          boxShadow: `0 0 8px ${STATUS_COLOR[status] ?? '#888'}`,
        }}
      />
      <span>
        {status === 'error' ? `vision error: ${error}` : `vision ${status}`}
      </span>
      {status === 'running' && (
        <span style={{ opacity: 0.7 }}>
          {fps.toFixed(0)} fps · {inferenceMs.toFixed(0)}ms
        </span>
      )}
      <button
        onClick={beginCalibration}
        style={{
          padding: '4px 10px',
          fontSize: 11,
          color: homography ? '#00FF87' : '#FFB800',
          background: 'rgba(255,255,255,0.08)',
          border: `1px solid ${homography ? 'rgba(0,255,135,0.4)' : 'rgba(255,184,0,0.4)'}`,
          borderRadius: 10,
          cursor: 'pointer',
        }}
      >
        {homography ? 'Recalibrate' : 'Calibrate'}
      </button>
      {homography && (
        <button
          onClick={clearCalibration}
          title="Clear calibration"
          style={{
            padding: '4px 8px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default VisionHUD;
