/**
 * Type definitions for projection calibration
 */

export type CalibrationPointId = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface CalibrationPoint {
  id: CalibrationPointId;
  cameraX: number;  // normalized 0-1
  cameraY: number;  // normalized 0-1
}

export interface CalibrationPayload {
  points: CalibrationPoint[];
  createdAt: string; // ISO timestamp
}

export interface CalibrationResponse {
  calibrated: boolean;
  points?: CalibrationPoint[];
  createdAt?: string;
}
