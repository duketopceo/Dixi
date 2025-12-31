import React, { useRef, useEffect } from 'react';

export interface LogEntry {
  timestamp: number;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
}

interface Props {
  logs: LogEntry[];
  onClear: () => void;
}

const typeColors: Record<string, string> = {
  info: '#00F5FF',
  error: '#FF006E',
  success: '#00FF87',
  warning: '#FFA500'
};

export const DebugLogs: React.FC<Props> = ({ logs, onClear }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="cp-section">
      <div className="cp-section-header">
        <span className="cp-section-icon">📋</span>
        <span className="cp-section-title">Logs</span>
        <button className="cp-btn-small" onClick={onClear}>Clear</button>
      </div>

      <div className="cp-logs">
        {logs.length === 0 ? (
          <div className="cp-logs-empty">No logs yet...</div>
        ) : (
          logs.map((log, i) => (
            <div 
              key={i} 
              className="cp-log-entry"
              style={{ borderLeftColor: typeColors[log.type] || '#888' }}
            >
              <span className="cp-log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span 
                className="cp-log-type"
                style={{ color: typeColors[log.type] || '#fff' }}
              >
                [{log.type.toUpperCase()}]
              </span>
              <span className="cp-log-msg">{log.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
