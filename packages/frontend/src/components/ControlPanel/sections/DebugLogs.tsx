import React, { useRef, useEffect, useState, useMemo } from 'react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'error' | 'success' | 'warning'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [pausedScroll, setPausedScroll] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesLevel = filterLevel === 'all' || log.type === filterLevel;
      const matchesSearch = searchQuery === '' || 
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [logs, searchQuery, filterLevel]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter(l => l.type === 'error').length;
    const warnings = logs.filter(l => l.type === 'warning').length;
    const info = logs.filter(l => l.type === 'info').length;
    const success = logs.filter(l => l.type === 'success').length;
    return { total, errors, warnings, info, success };
  }, [logs]);

  useEffect(() => {
    if (autoScroll && !pausedScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll, pausedScroll]);

  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isNearBottom && autoScroll) {
      setPausedScroll(true);
    } else if (isNearBottom) {
      setPausedScroll(false);
    }
  };

  const exportLogs = () => {
    const logText = filteredLogs.map(log => {
      const date = new Date(log.timestamp);
      return `[${date.toISOString()}] [${log.type.toUpperCase()}] ${log.message}`;
    }).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dixi-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cp-section">
      <div className="cp-section-header">
        <span className="cp-section-icon">📋</span>
        <span className="cp-section-title">Logs</span>
        <div className="cp-section-actions">
          <button 
            className="cp-btn-small" 
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          >
            {autoScroll ? '📜' : '⏸️'}
          </button>
          <button className="cp-btn-small" onClick={exportLogs} title="Export logs">
            💾
          </button>
          <button className="cp-btn-small" onClick={onClear}>Clear</button>
        </div>
      </div>

      {/* Statistics */}
      <div className="cp-logs-stats">
        <span className="cp-stat-item">Total: {stats.total}</span>
        <span className="cp-stat-item" style={{ color: typeColors.error }}>Errors: {stats.errors}</span>
        <span className="cp-stat-item" style={{ color: typeColors.warning }}>Warnings: {stats.warnings}</span>
        <span className="cp-stat-item" style={{ color: typeColors.info }}>Info: {stats.info}</span>
        <span className="cp-stat-item" style={{ color: typeColors.success }}>Success: {stats.success}</span>
      </div>

      {/* Filters and Search */}
      <div className="cp-logs-controls">
        <input
          type="text"
          className="cp-logs-search"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="cp-logs-filter"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as any)}
        >
          <option value="all">All Levels</option>
          <option value="error">Errors</option>
          <option value="warning">Warnings</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
        </select>
      </div>

      <div 
        className="cp-logs" 
        ref={logsContainerRef}
        onScroll={handleScroll}
      >
        {filteredLogs.length === 0 ? (
          <div className="cp-logs-empty">
            {logs.length === 0 ? 'No logs yet...' : 'No logs match your filters'}
          </div>
        ) : (
          filteredLogs.map((log, i) => (
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
