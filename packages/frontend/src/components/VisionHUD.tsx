import React, { useEffect, useState } from 'react';
import { useVisionStore } from '../vision/visionStore';
import { browserTrackingSource } from '../vision/browserTrackingSource';

const STATUS_COLOR: Record<string, string> = {
  idle: '#888',
  starting: '#FFB800',
  ready: '#00F5FF',
  running: '#00FF87',
  error: '#FF006E',
};

/** Bottom-left pill: vision source status, fps, calibrate/recalibrate. */
export const VisionHUD: React.FC = () => {
  // Narrow selectors: perf values are rounded so the HUD re-renders only
  // when the displayed numbers actually change, not every inference frame.
  const mode = useVisionStore((s) => s.mode);
  const status = useVisionStore((s) => s.status);
  const fps = useVisionStore((s) => Math.round(s.fps));
  const inferenceMs = useVisionStore((s) => Math.round(s.inferenceMs));
  const homography = useVisionStore((s) => s.homography);
  const error = useVisionStore((s) => s.error);
  const beginCalibration = useVisionStore((s) => s.beginCalibration);
  const clearCalibration = useVisionStore((s) => s.clearCalibration);
  const calibrating = useVisionStore((s) => s.calibrating);
  const previewVisible = useVisionStore((s) => s.previewVisible);
  const togglePreview = useVisionStore((s) => s.togglePreview);
  const cameraId = useVisionStore((s) => s.cameraId);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);

  // Device labels only populate after a camera grant — refresh when running.
  useEffect(() => {
    if (status !== 'running') return;
    let cancelled = false;
    browserTrackingSource.listCameras().then((cams) => {
      if (!cancelled) setCameras(cams);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

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
          {fps} fps ·{' '}
          <span style={{ color: inferenceMs > 25 ? '#FFB800' : undefined }}>
            {inferenceMs}ms
          </span>
        </span>
      )}
      {cameras.length > 1 && (
        <select
          value={cameraId ?? ''}
          onChange={(e) => {
            browserTrackingSource.setCamera(e.target.value || null).catch(() => {});
          }}
          title="Camera source"
          style={{
            fontSize: 11,
            color: '#fff',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '3px 6px',
            maxWidth: 140,
          }}
        >
          <option value="">Default camera</option>
          {cameras.map((c) => (
            <option key={c.deviceId} value={c.deviceId}>
              {c.label || `Camera ${c.deviceId.slice(0, 6)}`}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={togglePreview}
        title="Toggle camera preview"
        style={{
          padding: '4px 10px',
          fontSize: 11,
          color: previewVisible ? '#00F5FF' : 'rgba(255,255,255,0.6)',
          background: previewVisible ? 'rgba(0,245,255,0.12)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${previewVisible ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 10,
          cursor: 'pointer',
        }}
      >
        📷
      </button>
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
