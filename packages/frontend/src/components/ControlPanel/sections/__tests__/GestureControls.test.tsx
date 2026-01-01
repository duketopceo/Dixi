import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GestureControls } from '../GestureControls';
import { apiService } from '../../../../services/api';

// Mock apiService
vi.mock('../../../../services/api', () => ({
  apiService: {
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
  },
}));

const mockOnLog = vi.fn();

describe('GestureControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render gesture controls', () => {
    render(<GestureControls currentGesture={null} onLog={mockOnLog} />);

    expect(screen.getByText('Gestures')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Tracking/i })).toBeInTheDocument();
  });

  it('should start tracking when button clicked', async () => {
    (apiService.startTracking as any).mockResolvedValueOnce({
      status: 'started',
      message: 'Tracking started',
    });

    render(<GestureControls currentGesture={null} onLog={mockOnLog} />);

    const startButton = screen.getByRole('button', { name: /Start Tracking/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(apiService.startTracking).toHaveBeenCalledTimes(1);
      expect(mockOnLog).toHaveBeenCalledWith('success', 'Tracking started');
    });
  });

  it('should stop tracking when button clicked', async () => {
    (apiService.stopTracking as any).mockResolvedValueOnce({
      status: 'stopped',
      message: 'Tracking stopped',
    });

    // Start with tracking active
    const { rerender } = render(<GestureControls currentGesture={null} onLog={mockOnLog} />);
    
    const startButton = screen.getByRole('button', { name: /Start Tracking/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(apiService.startTracking).toHaveBeenCalled();
    });

    // Now stop
    const stopButton = screen.getByRole('button', { name: /Stop Tracking/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(apiService.stopTracking).toHaveBeenCalledTimes(1);
      expect(mockOnLog).toHaveBeenCalledWith('success', 'Tracking stopped');
    });
  });

  it('should display current gesture when available', () => {
    const mockGesture = {
      type: 'point',
      position: { x: 0.5, y: 0.5 },
      confidence: 0.9,
      timestamp: Date.now(),
    };

    render(<GestureControls currentGesture={mockGesture} onLog={mockOnLog} />);

    expect(screen.getByText('point')).toBeInTheDocument();
    expect(screen.getByText(/90%/)).toBeInTheDocument();
  });

  it('should handle tracking errors', async () => {
    (apiService.startTracking as any).mockRejectedValueOnce(new Error('Network error'));

    render(<GestureControls currentGesture={null} onLog={mockOnLog} />);

    const startButton = screen.getByRole('button', { name: /Start Tracking/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockOnLog).toHaveBeenCalledWith('error', expect.stringContaining('Network error'));
    });
  });
});
