import React, { useState } from 'react';
import { apiService } from '../../../services/api';

interface AIResponse {
  query: string;
  response: string;
  timestamp: number;
}

interface Props {
  onLog: (type: string, message: string) => void;
}

export const AIChat: React.FC<Props> = ({ onLog }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    onLog('info', `Sending query: ${query}`);

    try {
      const result = await apiService.sendAIQuery(query, {});
      
      if (result) {
        setResponse({
          query,
          response: result.text || result.response || 'No response',
          timestamp: Date.now()
        });
        onLog('success', 'AI response received');
      }
      setQuery('');
    } catch (e) {
      onLog('error', `AI error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-section">
      <div className="cp-section-header">
        <span className="cp-section-icon">🤖</span>
        <span className="cp-section-title">AI Chat</span>
      </div>

      <form onSubmit={handleSubmit} className="cp-ai-form">
        <textarea
          className="cp-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything..."
          rows={3}
          disabled={loading}
        />
        <button 
          type="submit" 
          className="cp-btn"
          disabled={loading || !query.trim()}
        >
          {loading ? '⏳ Thinking...' : '🚀 Send'}
        </button>
      </form>

      {response && (
        <div className="cp-ai-response">
          <div className="cp-ai-query">You: {response.query}</div>
          <div className="cp-ai-answer">{response.response}</div>
        </div>
      )}
    </div>
  );
};
