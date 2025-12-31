import React, { useMemo } from 'react';
import { useTrackingStore } from '../../store/trackingStore';
import './FaceOverlay.css';

/**
 * Unified tracking overlay component that displays face, body, and eye tracking visualization
 * on top of the camera feed
 */
export const FaceOverlay: React.FC = React.memo(() => {
  const currentTracking = useTrackingStore((state) => state.currentTracking);

  if (!currentTracking) {
    return null;
  }

  const { face, body, eyes, hands } = currentTracking;

  // Face overlay
  if (!face || !face.detected || !face.bounding_box) {
    return null;
  }

  const { bounding_box, key_points, eye_features, mouth_features, engagement } = face;

  // Convert normalized coordinates (0-1) to percentages
  const left = bounding_box.x_min * 100;
  const top = bounding_box.y_min * 100;
  const width = bounding_box.width * 100;
  const height = bounding_box.height * 100;

  return (
    <div className="face-overlay">
      {/* Face bounding box */}
      <div
        className="face-bounding-box"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      >
        {/* Key points */}
        {key_points && (
          <>
            {/* Eyes */}
            {key_points.left_eye && (
              <div
                className="face-key-point face-eye"
                style={{
                  left: `${(key_points.left_eye.x - bounding_box.x_min) / bounding_box.width * 100}%`,
                  top: `${(key_points.left_eye.y - bounding_box.y_min) / bounding_box.height * 100}%`,
                }}
              />
            )}
            {key_points.right_eye && (
              <div
                className="face-key-point face-eye"
                style={{
                  left: `${(key_points.right_eye.x - bounding_box.x_min) / bounding_box.width * 100}%`,
                  top: `${(key_points.right_eye.y - bounding_box.y_min) / bounding_box.height * 100}%`,
                }}
              />
            )}
            {/* Nose */}
            {key_points.nose_tip && (
              <div
                className="face-key-point face-nose"
                style={{
                  left: `${(key_points.nose_tip.x - bounding_box.x_min) / bounding_box.width * 100}%`,
                  top: `${(key_points.nose_tip.y - bounding_box.y_min) / bounding_box.height * 100}%`,
                }}
              />
            )}
            {/* Mouth */}
            {key_points.mouth_center && (
              <div
                className="face-key-point face-mouth"
                style={{
                  left: `${(key_points.mouth_center.x - bounding_box.x_min) / bounding_box.width * 100}%`,
                  top: `${(key_points.mouth_center.y - bounding_box.y_min) / bounding_box.height * 100}%`,
                }}
              />
            )}
          </>
        )}

        {/* Engagement indicator */}
        {engagement && (
          <div className="face-engagement-indicator">
            <div className="engagement-bar">
              <div
                className="engagement-fill"
                style={{
                  width: `${engagement.score * 100}%`,
                  backgroundColor: engagement.is_engaged ? '#00FF87' : '#FFA500',
                }}
              />
            </div>
            <span className="engagement-text">
              {engagement.is_engaged ? '👁️ Engaged' : '😴 Not Engaged'}
            </span>
          </div>
        )}

        {/* Expression indicators */}
        {mouth_features?.is_smiling && (
          <div className="face-expression-badge face-smile">😊</div>
        )}
        {eye_features && !eye_features.both_eyes_open && (
          <div className="face-expression-badge face-blink">😴</div>
        )}
      </div>

      {/* Face metrics display */}
      <div className="face-metrics-panel">
        {engagement && (
          <div className="face-metric">
            <span className="metric-label">Engagement:</span>
            <span className="metric-value">{(engagement.score * 100).toFixed(0)}%</span>
          </div>
        )}
        {eye_features && (
          <div className="face-metric">
            <span className="metric-label">Eyes:</span>
            <span className="metric-value">
              {eye_features.both_eyes_open ? '👀 Open' : '😴 Closed'}
            </span>
          </div>
        )}
        {mouth_features && (
          <div className="face-metric">
            <span className="metric-label">Mouth:</span>
            <span className="metric-value">
              {mouth_features.is_smiling ? '😊 Smiling' : mouth_features.mouth_open ? '😮 Open' : '😐 Closed'}
            </span>
          </div>
        )}
      </div>

      {/* Body pose skeleton overlay */}
      {body && body.detected && body.landmarks && (
        <div className="body-pose-overlay">
          {useMemo(() => {
            // Only render key landmarks for performance (every 3rd landmark)
            const keyLandmarks = body.landmarks.filter((_: any, idx: number) => idx % 3 === 0);
            return keyLandmarks.map((landmark: any, idx: number) => (
              <div
                key={idx}
                className="pose-landmark"
                style={{
                  left: `${landmark.x * 100}%`,
                  top: `${landmark.y * 100}%`,
                }}
              />
            ));
          }, [body.landmarks])}
          {body.posture && (
            <div className="body-posture-indicator">
              Posture: {body.posture}
            </div>
          )}
        </div>
      )}

      {/* Eye gaze direction indicator */}
      {eyes && eyes.combined_gaze && (
        <div className="eye-gaze-overlay">
          <div
            className="gaze-indicator"
            style={{
              left: `${50 + eyes.combined_gaze.x * 20}%`,
              top: `${50 + eyes.combined_gaze.y * 20}%`,
            }}
          >
            👁️
          </div>
          {eyes.attention_score > 0.7 && (
            <div className="attention-indicator">
              Attention: {(eyes.attention_score * 100).toFixed(0)}%
            </div>
          )}
        </div>
      )}

      {/* Hand tracking overlays */}
      {hands && (
        <>
          {hands.left && hands.left.detected && hands.left.position && (
            <div
              className="hand-overlay hand-left"
              style={{
                left: `${(hands.left.position.x + 1) * 50}%`,
                top: `${(1 - hands.left.position.y) * 50}%`,
              }}
            >
              <div className="hand-label">L: {hands.left.gesture}</div>
            </div>
          )}
          {hands.right && hands.right.detected && hands.right.position && (
            <div
              className="hand-overlay hand-right"
              style={{
                left: `${(hands.right.position.x + 1) * 50}%`,
                top: `${(1 - hands.right.position.y) * 50}%`,
              }}
            >
              <div className="hand-label">R: {hands.right.gesture}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
});
