import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoggingDashboard } from '../LoggingDashboard';
import { apiService } from '../../../../services/api';
import { useLogStore } from '../../../../store/logStore';

// Mock apiService
vi.mock('../../../../services/api', () => ({
  apiService: {
    getBackendLogs: vi.fn(),
    getVisionLogs: vi.fn(),
    getLogStats: vi.fn(),
  },
}));

// Mock logStore
vi.mock('../../../../store/logStore', () => ({
  useLogStore: vi.fn(),
}));

const mockOnLog = vi.fn();

describe('LoggingDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock logStore state
    (useLogStore as any).mockReturnValue({
      backendErrors: [
        {
          id: '1',
          timestamp: Date.now(),
          level: 'error',
          message: 'Test error',
          source: 'backend',
        },
      ],
      backendLogs: [
        {
          id: '2',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test info log',
          source: 'backend',
        },
      ],
      frontendErrors: [],
      visionLogs: [],
      websocketLogs: [],
      apiLogs: [],
      healthLogs: [],
      clearSection: vi.fn(),
      clearAll: vi.fn(),
    });
  });

  it('should render logging dashboard with tabs', () => {
    (apiService.getBackendLogs as any).mockResolvedValueOnce([]);
    (apiService.getVisionLogs as any).mockResolvedValueOnce([]);
    (apiService.getLogStats as any).mockResolvedValueOnce({
      total: 0,
      errors: 0,
      warnings: 0,
      bySource: {},
    });

    render(<LoggingDashboard onLog={mockOnLog} />);

    expect(screen.getByText('Backend Errors')).toBeInTheDocument();
    expect(screen.getByText('Backend Logs')).toBeInTheDocument();
    expect(screen.getByText('Frontend Errors')).toBeInTheDocument();
    expect(screen.getByText('Vision Service')).toBeInTheDocument();
  });

  it('should display logs from current section', async () => {
    (apiService.getBackendLogs as any).mockResolvedValueOnce([]);
    (apiService.getVisionLogs as any).mockResolvedValueOnce([]);
    (apiService.getLogStats as any).mockResolvedValueOnce({
      total: 1,
      errors: 1,
      warnings: 0,
      bySource: { backend: 1 },
    });

    render(<LoggingDashboard onLog={mockOnLog} />);

    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  it('should filter logs by level', async () => {
    (apiService.getBackendLogs as any).mockResolvedValueOnce([]);
    (apiService.getVisionLogs as any).mockResolvedValueOnce([]);
    (apiService.getLogStats as any).mockResolvedValueOnce({
      total: 2,
      errors: 1,
      warnings: 0,
      bySource: { backend: 2 },
    });

    render(<LoggingDashboard onLog={mockOnLog} />);

    await waitFor(() => {
      const levelSelect = screen.getByDisplayValue('All Levels');
      fireEvent.change(levelSelect, { target: { value: 'error' } });
    });

    // Should only show error logs
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should search logs by query', async () => {
    (apiService.getBackendLogs as any).mockResolvedValueOnce([]);
    (apiService.getVisionLogs as any).mockResolvedValueOnce([]);
    (apiService.getLogStats as any).mockResolvedValueOnce({
      total: 2,
      errors: 1,
      warnings: 0,
      bySource: { backend: 2 },
    });

    render(<LoggingDashboard onLog={mockOnLog} />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'error' } });
    });

    // Should filter to logs containing "error"
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should switch between sections', async () => {
    (apiService.getBackendLogs as any).mockResolvedValueOnce([]);
    (apiService.getVisionLogs as any).mockResolvedValueOnce([]);
    (apiService.getLogStats as any).mockResolvedValueOnce({
      total: 0,
      errors: 0,
      warnings: 0,
      bySource: {},
    });

    render(<LoggingDashboard onLog={mockOnLog} />);

    await waitFor(() => {
      const backendLogsTab = screen.getByText('Backend Logs');
      fireEvent.click(backendLogsTab);
    });

    // Should switch to backend logs section
    expect(screen.getByText('Backend Logs').closest('button')).toHaveClass('active');
  });

  it('should export logs', async () => {
    // Mock URL.createObjectURL and document.createElement
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    const mockClick = vi.fn();
    const mockCreateElement = vi.fn(() => ({
      click: mockClick,
      href: '',
      download: '',
    }));
    document.createElement = mockCreateElement as any;

    (apiService.getBackendLogs as any).mockResolvedValueOnce([]);
    (apiService.getVisionLogs as any).mockResolvedValueOnce([]);
    (apiService.getLogStats as any).mockResolvedValueOnce({
      total: 1,
      errors: 1,
      warnings: 0,
      bySource: { backend: 1 },
    });

    render(<LoggingDashboard onLog={mockOnLog} />);

    await waitFor(() => {
      const exportButton = screen.getByTitle('Export logs');
      fireEvent.click(exportButton);
    });

    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockClick).toHaveBeenCalled();
  });
});
