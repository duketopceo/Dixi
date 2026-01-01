import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceDashboard } from '../PerformanceDashboard';
import { apiService } from '../../../../services/api';

// Mock apiService
vi.mock('../../../../services/api', () => ({
  apiService: {
    getPerformanceMetrics: vi.fn(),
  },
}));

const mockOnLog = vi.fn();

describe('PerformanceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    (apiService.getPerformanceMetrics as any).mockImplementation(() => new Promise(() => {}));
    
    render(<PerformanceDashboard onLog={mockOnLog} />);
    
    expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
  });

  it('should display performance metrics when loaded', async () => {
    const mockMetrics = {
      vision: {
        fps: 15.5,
        status: 'connected',
        models: {
          hands: true,
          face: true,
          pose: true,
        },
      },
      backend: {
        latency: 45,
        requestsPerSecond: 2.5,
        p95Latency: 120,
        p99Latency: 250,
      },
      websocket: {
        connected: true,
        clients: 1,
        messagesPerSecond: 10.5,
        latency: 15,
      },
      system: {
        cpu: 25.5,
        memory: 45.2,
        memoryUsed: 8192000000,
        memoryTotal: 17179869184,
      },
      timestamp: Date.now(),
    };

    (apiService.getPerformanceMetrics as any).mockResolvedValueOnce(mockMetrics);

    render(<PerformanceDashboard onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByText(/15\.5/)).toBeInTheDocument();
      expect(screen.getByText(/45ms/)).toBeInTheDocument();
      expect(screen.getByText(/25\.5%/)).toBeInTheDocument();
    });
  });

  it('should display error message on failure', async () => {
    (apiService.getPerformanceMetrics as any).mockRejectedValueOnce(new Error('Network error'));

    render(<PerformanceDashboard onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load metrics/)).toBeInTheDocument();
    });
  });

  it('should show model status indicators', async () => {
    const mockMetrics = {
      vision: {
        fps: 15,
        status: 'connected',
        models: {
          hands: true,
          face: false,
          pose: true,
        },
      },
      backend: { latency: 50, requestsPerSecond: 2, p95Latency: 100, p99Latency: 200 },
      websocket: { connected: true, clients: 1, messagesPerSecond: 10, latency: 15 },
      system: { cpu: 30, memory: 50, memoryUsed: 8000000000, memoryTotal: 16000000000 },
      timestamp: Date.now(),
    };

    (apiService.getPerformanceMetrics as any).mockResolvedValueOnce(mockMetrics);

    render(<PerformanceDashboard onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByText('Hands')).toBeInTheDocument();
      expect(screen.getByText('Face')).toBeInTheDocument();
      expect(screen.getByText('Pose')).toBeInTheDocument();
    });
  });
});
