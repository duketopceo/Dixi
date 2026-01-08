import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelConfig } from '../ModelConfig';
import { apiService } from '../../../../services/api';

// Mock apiService
vi.mock('../../../../services/api', () => ({
  apiService: {
    getVisionConfig: vi.fn(),
    updateVisionConfig: vi.fn(),
  },
}));

const mockOnLog = vi.fn();

describe('ModelConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    (apiService.getVisionConfig as any).mockImplementation(() => new Promise(() => {}));
    
    render(<ModelConfig onLog={mockOnLog} />);
    
    expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
  });

  it('should display current configuration', async () => {
    const mockConfig = {
      frame_skip_interval: 2,
      enable_face_tracking: true,
      enable_pose_tracking: true,
      backend_push_cooldown_ms: 500,
      adaptive_fps: false,
    };

    (apiService.getVisionConfig as any).mockResolvedValueOnce({ config: mockConfig });

    render(<ModelConfig onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByLabelText(/Face Tracking/i)).toBeChecked();
      expect(screen.getByLabelText(/Pose Tracking/i)).toBeChecked();
    });
  });

  it('should update configuration when slider changes', async () => {
    const mockConfig = {
      frame_skip_interval: 2,
      enable_face_tracking: true,
      enable_pose_tracking: true,
      backend_push_cooldown_ms: 500,
      adaptive_fps: false,
    };

    (apiService.getVisionConfig as any).mockResolvedValueOnce({ config: mockConfig });
    (apiService.updateVisionConfig as any).mockResolvedValueOnce({ 
      message: 'Configuration updated',
      config: { ...mockConfig, frame_skip_interval: 3 }
    });

    render(<ModelConfig onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    const slider = screen.getByRole('slider', { name: /Frame Skip Interval/i });
    fireEvent.change(slider, { target: { value: '3' } });

    await waitFor(() => {
      expect(apiService.updateVisionConfig).toHaveBeenCalledWith(
        expect.objectContaining({ frame_skip_interval: 3 })
      );
    });
  });

  it('should toggle face tracking', async () => {
    const mockConfig = {
      frame_skip_interval: 2,
      enable_face_tracking: true,
      enable_pose_tracking: true,
      backend_push_cooldown_ms: 500,
      adaptive_fps: false,
    };

    (apiService.getVisionConfig as any).mockResolvedValueOnce({ config: mockConfig });
    (apiService.updateVisionConfig as any).mockResolvedValueOnce({ 
      message: 'Configuration updated',
      config: { ...mockConfig, enable_face_tracking: false }
    });

    render(<ModelConfig onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Face Tracking/i)).toBeChecked();
    });

    const checkbox = screen.getByLabelText(/Face Tracking/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(apiService.updateVisionConfig).toHaveBeenCalledWith(
        expect.objectContaining({ enable_face_tracking: false })
      );
    });
  });

  it('should display error message on failure', async () => {
    (apiService.getVisionConfig as any).mockRejectedValueOnce(new Error('Network error'));

    render(<ModelConfig onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load config/)).toBeInTheDocument();
    });
  });
});
