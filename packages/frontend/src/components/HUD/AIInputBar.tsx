import React, { useState, useEffect, useRef } from 'react';
import { useAIStore } from '../../store/aiStore';
import './AIInputBar.css';

const AIInputBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState('');
  const { sendQuery, isLoading, latestResponse, chatHistory } = useAIStore();
  const responseScrollRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const queryText = input.trim();
    setInput('');
    
    try {
      await sendQuery(queryText);
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

  return (
    <div className="ai-input-container">
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
                  <span className="ai-response-content">{msg.response}</span>
                </div>
              )}
            </div>
          ))}
          {latestResponse && latestResponse.analysisType === 'query' && (
            <div className="ai-response-message assistant">
              <div className="ai-response-assistant">
                <span className="ai-response-label">AI:</span>
                <span className="ai-response-content">{latestResponse.response}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="ai-input-bar">
        <div className="ai-input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Press Enter to send)"
            autoFocus
            disabled={isLoading}
            onBlur={(e) => {
              // Don't hide if clicking submit button
              if (!e.relatedTarget || (e.relatedTarget as HTMLElement).type !== 'submit') {
                // Small delay to allow submit
                setTimeout(() => {
                  if (!input.trim()) {
                    setIsVisible(false);
                  }
                }, 100);
              }
            }}
          />
          {isLoading && (
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

