/**
 * useProjectorCalibration - Hook for managing projector calibration status
 * 
 * Fetches calibration status from the backend and provides methods
 * to check and manage calibration state.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

interface CalibrationStatus {
  calibrated: boolean;
  points?: Array<{ id: string; cameraX: number; cameraY: number }>;
  homographyMatrix?: number[][];
  createdAt?: string;
}

interface UseProjectorCalibrationResult {
  calibrated: boolean;
  loading: boolean;
  error: string | null;
  calibrationData: CalibrationStatus | null;
  refresh: () => Promise<void>;
}

export const useProjectorCalibration = (): UseProjectorCalibrationResult => {
  const [calibrated, setCalibrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calibrationData, setCalibrationData] = useState<CalibrationStatus | null>(null);

  const fetchCalibration = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getProjectionMapping();
      
      if (response && typeof response.calibrated === 'boolean') {
        setCalibrated(response.calibrated);
        setCalibrationData(response);
      } else {
        // If response is malformed, assume not calibrated
        setCalibrated(false);
        setCalibrationData({ calibrated: false });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calibration status');
      setCalibrated(false);
      setCalibrationData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch calibration status on mount
  useEffect(() => {
    fetchCalibration();
  }, [fetchCalibration]);

  // Listen for calibration updates via WebSocket
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'projection' && message.data?.type === 'mapping_update') {
          // Calibration was updated, refresh
          fetchCalibration();
        }
      } catch {
        // Ignore parse errors
      }
    };

    // Try to access the WebSocket
    const ws = (window as any).__dixi_websocket;
    if (ws) {
      ws.addEventListener('message', handleMessage);
      return () => ws.removeEventListener('message', handleMessage);
    }
    
    return undefined;
  }, [fetchCalibration]);

  return {
    calibrated,
    loading,
    error,
    calibrationData,
    refresh: fetchCalibration
  };
};

export default useProjectorCalibration;
