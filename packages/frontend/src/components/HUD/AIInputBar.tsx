import React, { useState, useEffect } from 'react';
import { useAIStore } from '../../store/aiStore';
import './AIInputBar.css';

const AIInputBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState('');
  const { sendQuery, isLoading } = useAIStore();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    try {
      await sendQuery(input);
      setInput('');
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to send query:', error);
    }
  };

  if (!isVisible) {
    return (
      <div className="ai-input-hint">
        ⌨ SPACE TO QUERY
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="ai-input-bar">
      <div className="ai-input-wrapper">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
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
  );
};

export default AIInputBar;

