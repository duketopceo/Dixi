import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIInputBar from './AIInputBar';
import { useAIStore } from '../../store/aiStore';

vi.mock('../../store/aiStore');

describe('AIInputBar', () => {
  const mockSendQuery = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAIStore as any).mockReturnValue({
      sendQuery: mockSendQuery,
      isLoading: false
    });
  });

  it('renders hint when not visible', () => {
    render(<AIInputBar />);
    expect(screen.getByText('⌨ SPACE TO QUERY')).toBeInTheDocument();
  });

  it('shows input when Space key is pressed', async () => {
    render(<AIInputBar />);
    
    await user.keyboard(' ');
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument();
    });
  });

  it('hides input when Escape key is pressed', async () => {
    render(<AIInputBar />);
    
    // Show input first
    await user.keyboard(' ');
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument();
    });

    // Hide with Escape
    await user.keyboard('{Escape}');
    
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Ask anything...')).not.toBeInTheDocument();
    });
  });

  it('submits query on Enter key', async () => {
    mockSendQuery.mockResolvedValue(undefined);
    
    render(<AIInputBar />);
    
    // Show input
    await user.keyboard(' ');
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument();
    });

    // Type and submit
    const input = screen.getByPlaceholderText('Ask anything...');
    await user.type(input, 'test query');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSendQuery).toHaveBeenCalledWith('test query');
    });
  });

  it('disables input when loading', () => {
    (useAIStore as any).mockReturnValue({
      sendQuery: mockSendQuery,
      isLoading: true
    });

    render(<AIInputBar />);
    
    // Show input
    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    
    const input = screen.getByPlaceholderText('Ask anything...');
    expect(input).toBeDisabled();
  });
});

