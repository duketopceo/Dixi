import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import '../ControlPanel.css';
import './CalibrationPanel.css';

interface CalibrationPoint {
  id: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  cameraX: number;
  cameraY: number;
}

interface CalibrationResponse {
  calibrated: boolean;
  points?: CalibrationPoint[];
  createdAt?: string;
}

interface Props {
  onLog: (type: string, message: string) => void;
}

export const CalibrationPanel: React.FC<Props> = ({ onLog }) => {
  const [calibration, setCalibration] = useState<CalibrationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<CalibrationPoint[]>([
    { id: 'topLeft', cameraX: 0.1, cameraY: 0.1 },
    { id: 'topRight', cameraX: 0.9, cameraY: 0.1 },
    { id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 },
    { id: 'bottomRight', cameraX: 0.9, cameraY: 0.9 }
  ]);

  useEffect(() => {
    loadCalibration();
  }, []);

  const loadCalibration = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getProjectionMapping();
      setCalibration(data);
      if (data.calibrated && data.points) {
        setPoints(data.points);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to load calibration';
      setError(errorMessage);
      onLog('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePointChange = (id: CalibrationPoint['id'], field: 'cameraX' | 'cameraY', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 1) {
      return; // Invalid value, don't update
    }
    
    setPoints(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: numValue } : p
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const result = await apiService.updateProjectionMapping(points);
      setCalibration(result);
      onLog('success', 'Calibration saved successfully');
      // Reload to get the full response
      await loadCalibration();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to save calibration';
      setError(errorMessage);
      onLog('error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoCalibration = async () => {
    setSubmitting(true);
    setError(null);
    
    const demoPoints: CalibrationPoint[] = [
      { id: 'topLeft', cameraX: 0.0, cameraY: 0.0 },
      { id: 'topRight', cameraX: 1.0, cameraY: 0.0 },
      { id: 'bottomLeft', cameraX: 0.0, cameraY: 1.0 },
      { id: 'bottomRight', cameraX: 1.0, cameraY: 1.0 }
    ];
    
    try {
      const result = await apiService.updateProjectionMapping(demoPoints);
      setCalibration(result);
      setPoints(demoPoints);
      onLog('success', 'Demo calibration applied');
      await loadCalibration();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to apply demo calibration';
      setError(errorMessage);
      onLog('error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cp-section">
      <div className="cp-section-header">
        <span className="cp-section-icon">🎯</span>
        <span className="cp-section-title">Calibration</span>
        <button 
          className="cp-refresh-btn"
          onClick={loadCalibration}
          disabled={loading}
          title="Refresh calibration status"
        >
          🔄
        </button>
      </div>

      {loading && (
        <div className="cp-status">Loading...</div>
      )}

      {error && (
        <div className="cp-error">{error}</div>
      )}

      {!loading && calibration && (
        <div className="cp-status">
          {calibration.calibrated ? (
            <div>
              <div className="cp-status-success">✓ Calibrated</div>
              {calibration.createdAt && (
                <div className="cp-status-meta">
                  {new Date(calibration.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="cp-status-warning">Not calibrated yet</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="calibration-form">
        {points.map((point) => (
          <div key={point.id} className="calibration-point">
            <label className="calibration-point-label">
              {point.id.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <div className="calibration-point-inputs">
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={point.cameraX}
                onChange={(e) => handlePointChange(point.id, 'cameraX', e.target.value)}
                placeholder="X (0-1)"
                className="calibration-input"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={point.cameraY}
                onChange={(e) => handlePointChange(point.id, 'cameraY', e.target.value)}
                placeholder="Y (0-1)"
                className="calibration-input"
              />
            </div>
          </div>
        ))}

        <div className="calibration-actions">
          <button 
            type="submit" 
            className="cp-btn cp-btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Calibrate'}
          </button>
          <button 
            type="button"
            className="cp-btn cp-btn-secondary"
            onClick={handleDemoCalibration}
            disabled={submitting}
          >
            Demo Calibration
          </button>
        </div>
      </form>
    </div>
  );
};
