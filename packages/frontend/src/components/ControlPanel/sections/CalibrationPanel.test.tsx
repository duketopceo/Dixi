import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CalibrationPanel } from './CalibrationPanel';
import { apiService } from '../../../services/api';

// Mock the API service
vi.mock('../../../services/api', () => ({
  apiService: {
    getProjectionMapping: vi.fn(),
    updateProjectionMapping: vi.fn()
  }
}));

describe('CalibrationPanel', () => {
  const mockOnLog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "Not calibrated yet" when API returns calibrated: false', async () => {
    (apiService.getProjectionMapping as any).mockResolvedValue({
      calibrated: false
    });

    render(<CalibrationPanel onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByText(/not calibrated yet/i)).toBeInTheDocument();
    });
  });

  it('should show "Calibrated" status when API returns calibrated: true', async () => {
    const mockCalibration = {
      calibrated: true,
      points: [
        { id: 'topLeft', cameraX: 0.1, cameraY: 0.1 },
        { id: 'topRight', cameraX: 0.9, cameraY: 0.1 },
        { id: 'bottomLeft', cameraX: 0.1, cameraY: 0.9 },
        { id: 'bottomRight', cameraX: 0.9, cameraY: 0.9 }
      ],
      createdAt: new Date().toISOString()
    };

    (apiService.getProjectionMapping as any).mockResolvedValue(mockCalibration);

    render(<CalibrationPanel onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByText(/calibrated/i)).toBeInTheDocument();
    });
  });

  it('should successfully submit calibration and update UI', async () => {
    // Initial state: not calibrated
    (apiService.getProjectionMapping as any)
      .mockResolvedValueOnce({ calibrated: false })
      .mockResolvedValueOnce({
        calibrated: true,
        points: [
          { id: 'topLeft', cameraX: 0.0, cameraY: 0.0 },
          { id: 'topRight', cameraX: 1.0, cameraY: 0.0 },
          { id: 'bottomLeft', cameraX: 0.0, cameraY: 1.0 },
          { id: 'bottomRight', cameraX: 1.0, cameraY: 1.0 }
        ],
        createdAt: new Date().toISOString()
      });

    // Mock successful POST
    (apiService.updateProjectionMapping as any).mockResolvedValue({
      calibrated: true,
      points: [
        { id: 'topLeft', cameraX: 0.0, cameraY: 0.0 },
        { id: 'topRight', cameraX: 1.0, cameraY: 0.0 },
        { id: 'bottomLeft', cameraX: 0.0, cameraY: 1.0 },
        { id: 'bottomRight', cameraX: 1.0, cameraY: 1.0 }
      ],
      createdAt: new Date().toISOString()
    });

    render(<CalibrationPanel onLog={mockOnLog} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/not calibrated yet/i)).toBeInTheDocument();
    });

    // Find and click the "Calibrate" button
    const calibrateButton = screen.getByRole('button', { name: /calibrate/i });
    fireEvent.click(calibrateButton);

    // Wait for calibration to complete
    await waitFor(() => {
      expect(apiService.updateProjectionMapping).toHaveBeenCalled();
      expect(mockOnLog).toHaveBeenCalledWith('success', expect.stringContaining('Calibration saved'));
    });

    // Should show calibrated status
    await waitFor(() => {
      expect(screen.getByText(/calibrated/i)).toBeInTheDocument();
    });
  });

  it('should display error message when POST returns 400', async () => {
    // Initial state: not calibrated
    (apiService.getProjectionMapping as any).mockResolvedValue({
      calibrated: false
    });

    // Mock POST error
    const error = new Error('Validation failed: Points array must contain exactly 4 points');
    (apiService.updateProjectionMapping as any).mockRejectedValue(error);

    render(<CalibrationPanel onLog={mockOnLog} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/not calibrated yet/i)).toBeInTheDocument();
    });

    // Submit form
    const calibrateButton = screen.getByRole('button', { name: /calibrate/i });
    fireEvent.click(calibrateButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(mockOnLog).toHaveBeenCalledWith('error', expect.stringContaining('Failed to save'));
    });
  });

  it('should handle demo calibration button', async () => {
    (apiService.getProjectionMapping as any)
      .mockResolvedValueOnce({ calibrated: false })
      .mockResolvedValueOnce({
        calibrated: true,
        points: [
          { id: 'topLeft', cameraX: 0.0, cameraY: 0.0 },
          { id: 'topRight', cameraX: 1.0, cameraY: 0.0 },
          { id: 'bottomLeft', cameraX: 0.0, cameraY: 1.0 },
          { id: 'bottomRight', cameraX: 1.0, cameraY: 1.0 }
        ],
        createdAt: new Date().toISOString()
      });

    (apiService.updateProjectionMapping as any).mockResolvedValue({
      calibrated: true,
      points: [
        { id: 'topLeft', cameraX: 0.0, cameraY: 0.0 },
        { id: 'topRight', cameraX: 1.0, cameraY: 0.0 },
        { id: 'bottomLeft', cameraX: 0.0, cameraY: 1.0 },
        { id: 'bottomRight', cameraX: 1.0, cameraY: 1.0 }
      ],
      createdAt: new Date().toISOString()
    });

    render(<CalibrationPanel onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByText(/not calibrated yet/i)).toBeInTheDocument();
    });

    const demoButton = screen.getByRole('button', { name: /demo calibration/i });
    fireEvent.click(demoButton);

    await waitFor(() => {
      expect(apiService.updateProjectionMapping).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'topLeft' }),
          expect.objectContaining({ id: 'topRight' }),
          expect.objectContaining({ id: 'bottomLeft' }),
          expect.objectContaining({ id: 'bottomRight' })
        ]),
        expect.any(String)
      );
      expect(mockOnLog).toHaveBeenCalledWith('success', expect.stringContaining('Demo calibration'));
    });
  });
});
