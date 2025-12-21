import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIStore } from './aiStore';
import { apiService } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    sendAIQuery: vi.fn()
  }
}));

// Mock gesture store
vi.mock('./gestureStore', () => ({
  useGestureStore: {
    getState: () => ({ currentGesture: null })
  }
}));

describe('AIStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useAIStore());
    
    expect(result.current.latestResponse).toBeNull();
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.responseHistory).toEqual([]);
  });

  it('sets processing state correctly', () => {
    const { result } = renderHook(() => useAIStore());
    
    act(() => {
      result.current.setProcessing(true);
    });
    
    expect(result.current.isProcessing).toBe(true);
    
    act(() => {
      result.current.setProcessing(false);
    });
    
    expect(result.current.isProcessing).toBe(false);
  });

  it('clears responses', () => {
    const { result } = renderHook(() => useAIStore());
    
    act(() => {
      result.current.setLatestResponse({
        query: 'test',
        response: 'test response',
        timestamp: Date.now()
      });
    });
    
    expect(result.current.latestResponse).not.toBeNull();
    
    act(() => {
      result.current.clearResponse();
    });
    
    expect(result.current.latestResponse).toBeNull();
  });

  it('sends query and updates state', async () => {
    const mockResponse = { text: 'AI response', metadata: {} };
    (apiService.sendAIQuery as any).mockResolvedValue(mockResponse);
    
    const { result } = renderHook(() => useAIStore());
    
    await act(async () => {
      await result.current.sendQuery('test query');
    });
    
    expect(apiService.sendAIQuery).toHaveBeenCalledWith('test query', undefined);
    expect(result.current.latestResponse).not.toBeNull();
    expect(result.current.latestResponse?.response).toBe('AI response');
    expect(result.current.isProcessing).toBe(false);
  });
});

