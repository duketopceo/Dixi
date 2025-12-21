import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MinimalHUD from './MinimalHUD';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useGestureStore } from '../../store/gestureStore';
import { useAIStore } from '../../store/aiStore';

// Mock the hooks
vi.mock('../../hooks/useWebSocket');
vi.mock('../../store/gestureStore');
vi.mock('../../store/aiStore');

describe('MinimalHUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders connection status when connected', () => {
    (useWebSocket as any).mockReturnValue({ isConnected: true });
    (useGestureStore as any).mockReturnValue({ currentGesture: null });
    (useAIStore as any).mockReturnValue({ isProcessing: false });

    render(<MinimalHUD />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('renders connection status when disconnected', () => {
    (useWebSocket as any).mockReturnValue({ isConnected: false });
    (useGestureStore as any).mockReturnValue({ currentGesture: null });
    (useAIStore as any).mockReturnValue({ isProcessing: false });

    render(<MinimalHUD />);
    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });

  it('displays gesture information when available', () => {
    (useWebSocket as any).mockReturnValue({ isConnected: true });
    (useGestureStore as any).mockReturnValue({
      currentGesture: {
        type: 'point',
        confidence: 0.85,
        position: { x: 0.5, y: 0.5 }
      }
    });
    (useAIStore as any).mockReturnValue({ isProcessing: false });

    render(<MinimalHUD />);
    expect(screen.getByText(/POINT/)).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('displays processing indicator when AI is processing', () => {
    (useWebSocket as any).mockReturnValue({ isConnected: true });
    (useGestureStore as any).mockReturnValue({ currentGesture: null });
    (useAIStore as any).mockReturnValue({ isProcessing: true });

    render(<MinimalHUD />);
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();
  });

  it('displays FPS counter', () => {
    (useWebSocket as any).mockReturnValue({ isConnected: true });
    (useGestureStore as any).mockReturnValue({ currentGesture: null });
    (useAIStore as any).mockReturnValue({ isProcessing: false });

    render(<MinimalHUD />);
    expect(screen.getByText(/FPS:/)).toBeInTheDocument();
  });
});

