import React, { useEffect, useRef } from 'react';
import './AIResponseDisplay.css';

interface AIResponse {
  query: string;
  response: string;
  metadata?: any;
  timestamp: number;
}

interface Props {
  response: AIResponse | null;
}

const AIResponseDisplay: React.FC<Props> = ({ response }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && response) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [response]);

  if (!response) {
    return (
      <div className="ai-response-display empty">
        <p>🤖 AI responses will appear here</p>
      </div>
    );
  }

  return (
    <div className="ai-response-display" ref={containerRef}>
      <div className="response-header">
        <span className="response-query">❓ {response.query}</span>
        <span className="response-time">
          {new Date(response.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="response-content">
        <p>{response.response}</p>
      </div>
      {response.metadata && (
        <div className="response-metadata">
          <span>⚡ {response.metadata.inferenceTime}ms</span>
          {response.metadata.confidence && (
            <span>🎯 {(response.metadata.confidence * 100).toFixed(0)}%</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AIResponseDisplay;
