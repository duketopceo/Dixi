import React from 'react';
import './GestureIndicator.css';

interface GestureData {
  type: string;
  position: { x: number; y: number; z?: number };
  confidence: number;
  timestamp: number;
}

interface Props {
  gesture: GestureData | null;
}

const GestureIndicator: React.FC<Props> = ({ gesture }) => {
  if (!gesture) {
    return null;
  }

  return (
    <div className="gesture-indicator">
      <div className="gesture-badge">
        <span className="gesture-type">{gesture.type}</span>
        <span className="gesture-confidence">
          {(gesture.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="gesture-position">
        <span>X: {gesture.position.x.toFixed(2)}</span>
        <span>Y: {gesture.position.y.toFixed(2)}</span>
        {gesture.position.z !== undefined && (
          <span>Z: {gesture.position.z.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
};

export default GestureIndicator;
