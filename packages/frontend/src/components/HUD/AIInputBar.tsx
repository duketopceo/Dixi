import React, { useState, useEffect, useRef } from 'react';
import { useAIStore } from '../../store/aiStore';
import { apiService } from '../../services/api';
import { useFaceStore } from '../../store/faceStore';
import { useGestureStore } from '../../store/gestureStore';
import './AIInputBar.css';

const AIInputBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState('');
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const { 
    sendQuery, 
    sendQueryWithTracking,
    analyzeTracking,
    isProcessing, 
    latestResponse, 
    chatHistory, 
    setLatestResponse,
    autoAnalysisEnabled,
    setAutoAnalysis,
    autoAnalysisInterval,
    getContextSummary
  } = useAIStore();
  const currentFace = useFaceStore((state) => state.currentFace);
  const currentGesture = useGestureStore((state) => state.currentGesture);
  const responseScrollRef = useRef<HTMLDivElement>(null);
  const autoAnalysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Only handle Space if not already in an input field
      if (e.code === 'Space' && !isVisible && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsVisible(true);
      }
      if (e.code === 'Escape') {
        setIsVisible(false);
        setInput('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  // Auto-scroll response area to bottom when new response arrives
  useEffect(() => {
    if (responseScrollRef.current && latestResponse) {
      responseScrollRef.current.scrollTop = responseScrollRef.current.scrollHeight;
    }
  }, [latestResponse, chatHistory]);

  // Auto-analysis effect
  useEffect(() => {
    if (autoAnalysisEnabled) {
      autoAnalysisIntervalRef.current = setInterval(() => {
        analyzeTracking().catch(console.error);
      }, autoAnalysisInterval);
    } else {
      if (autoAnalysisIntervalRef.current) {
        clearInterval(autoAnalysisIntervalRef.current);
        autoAnalysisIntervalRef.current = null;
      }
    }
    return () => {
      if (autoAnalysisIntervalRef.current) {
        clearInterval(autoAnalysisIntervalRef.current);
      }
    };
  }, [autoAnalysisEnabled, autoAnalysisInterval, analyzeTracking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const queryText = input.trim();
    setInput('');
    
    try {
      // Use tracking-aware query that includes face and gesture context
      await sendQueryWithTracking(queryText, true);
      // Keep input bar visible after sending
    } catch (error) {
      console.error('Failed to send query:', error);
      // Restore input on error
      setInput(queryText);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleVisionAnalysis = async () => {
    if (isProcessing || isAnalyzingVision) return;
    
    setIsAnalyzingVision(true);
    console.log('👁️ Starting vision analysis...');
    try {
      const response = await apiService.analyzeVision();
      console.log('👁️ Vision analysis complete:', response);
      setLatestResponse({
        query: '👁️ What do you see?',
        response: response.text,
        metadata: response.metadata,
        timestamp: Date.now(),
        analysisType: 'vision'
      });
    } catch (error: any) {
      const errorMsg = error.message || 'Vision analysis failed';
      console.error('👁️ Vision analysis failed:', errorMsg, error);
      setLatestResponse({
        query: '👁️ What do you see?',
        response: `❌ ${errorMsg}. Try again in a moment or check if llava model is installed (ollama pull llava:7b).`,
        timestamp: Date.now(),
        analysisType: 'error'
      });
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  const handleAnalyzeTracking = async () => {
    if (isProcessing || isAnalyzingVision) return;
    
    setIsAnalyzingVision(true);
    try {
      await analyzeTracking(input.trim() || undefined);
      setInput('');
    } catch (error) {
      console.error('Failed to analyze tracking:', error);
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  const toggleAutoAnalysis = () => {
    setAutoAnalysis(!autoAnalysisEnabled, autoAnalysisInterval);
  };

  if (!isVisible) {
    return (
      <div className="ai-input-hint">
        ⌨ SPACE TO QUERY
      </div>
    );
  }

  // Get query responses (user queries with AI responses)
  // chatHistory is ChatMessage[] with query/response structure
  const queryResponses = chatHistory.slice(-10); // Last 10 messages

  const contextSummary = getContextSummary();

  return (
    <div className="ai-input-container">
      {/* Context Summary */}
      {isVisible && contextSummary !== 'No context available' && (
        <div className="ai-context-indicator">
          <span className="context-label">Context:</span>
          <span className="context-value">{contextSummary}</span>
        </div>
      )}

      {/* AI Response Area with Scrolling */}
      {isVisible && (latestResponse || queryResponses.length > 0) && (
        <div className="ai-response-container" ref={responseScrollRef}>
          {queryResponses.map((msg, idx) => (
            <div key={msg.id || idx} className="ai-response-message">
              <div className="ai-response-user">
                <span className="ai-response-label">You:</span>
                <span className="ai-response-content">{msg.query}</span>
              </div>
              {msg.response && (
                <div className="ai-response-assistant">
                  <span className="ai-response-label">AI:</span>
                  <div className="ai-response-content-wrapper">
                    <div className="ai-response-content">{msg.response}</div>
                    {msg.metadata?.context && (
                      <div className="ai-response-metadata">
                        {msg.metadata.context.face && (
                          <span className="metadata-badge">👤 Face</span>
                        )}
                        {msg.metadata.context.gesture && (
                          <span className="metadata-badge">✋ Gesture</span>
                        )}
                        {msg.metadata.inferenceTime && (
                          <span className="metadata-badge">⏱️ {msg.metadata.inferenceTime}ms</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {latestResponse && (
            <div className={`ai-response-message ${latestResponse.analysisType || 'assistant'}`}>
              <div className="ai-response-assistant">
                <span className="ai-response-label">AI:</span>
                <div className="ai-response-content-wrapper">
                  <div className="ai-response-content">{latestResponse.response}</div>
                  {latestResponse.metadata && (
                    <div className="ai-response-metadata">
                      {latestResponse.metadata.context?.face && (
                        <span className="metadata-badge">👤 Face</span>
                      )}
                      {latestResponse.metadata.context?.gesture && (
                        <span className="metadata-badge">✋ Gesture</span>
                      )}
                      {latestResponse.metadata.inferenceTime && (
                        <span className="metadata-badge">⏱️ {latestResponse.metadata.inferenceTime}ms</span>
                      )}
                      {latestResponse.metadata.model && (
                        <span className="metadata-badge">🤖 {latestResponse.metadata.model}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="ai-input-bar">
        <div className="ai-input-wrapper">
          <button
            type="button"
            className="ai-vision-button"
            onClick={handleVisionAnalysis}
            disabled={isProcessing || isAnalyzingVision}
            title="What do you see? (Vision AI)"
          >
            {isAnalyzingVision ? '⏳' : '👁️'}
          </button>
          <button
            type="button"
            className={`ai-tracking-button ${autoAnalysisEnabled ? 'active' : ''}`}
            onClick={handleAnalyzeTracking}
            disabled={isProcessing || isAnalyzingVision}
            title="Analyze current scene with tracking context"
          >
            📊
          </button>
          <button
            type="button"
            className={`ai-auto-button ${autoAnalysisEnabled ? 'active' : ''}`}
            onClick={toggleAutoAnalysis}
            title={`Auto-analysis: ${autoAnalysisEnabled ? 'ON' : 'OFF'}`}
          >
            🔄
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Press Enter to send)"
            autoFocus
            disabled={isProcessing}
            onBlur={(e) => {
              // Don't hide if clicking submit button or vision button
              const related = e.relatedTarget as HTMLElement;
              if (!related || (related.type !== 'submit' && !related.classList.contains('ai-vision-button') && !related.classList.contains('ai-tracking-button') && !related.classList.contains('ai-auto-button'))) {
                // Small delay to allow submit
                setTimeout(() => {
                  if (!input.trim()) {
                    setIsVisible(false);
                  }
                }, 100);
              }
            }}
          />
          {(isProcessing || isAnalyzingVision) && (
            <div className="ai-loading-indicator">
              <span className="loading-dot" />
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default AIInputBar;

