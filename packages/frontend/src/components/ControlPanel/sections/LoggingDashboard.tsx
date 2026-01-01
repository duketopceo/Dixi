import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiService } from '../../../services/api';
import { useLogStore, LogEntry } from '../../../store/logStore';
import './LoggingDashboard.css';

interface Props {
  onLog: (type: string, message: string) => void;
}

type LogSection = 'backend-errors' | 'backend-logs' | 'frontend-errors' | 'vision' | 'websocket' | 'api' | 'health';

export const LoggingDashboard: React.FC<Props> = ({ onLog }) => {
  const [activeSection, setActiveSection] = useState<LogSection>('backend-errors');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info' | 'debug'>('all');
  const [timeRange, setTimeRange] = useState<'5min' | '15min' | '1hr' | '24hr' | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pausedScroll, setPausedScroll] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const {
    backendErrors,
    backendLogs,
    frontendErrors,
    visionLogs,
    websocketLogs,
    apiLogs,
    healthLogs,
    clearSection,
    clearAll,
  } = useLogStore();

  // Fetch logs from backend
  const fetchBackendLogs = async () => {
    try {
      const since = getTimeRangeTimestamp(timeRange);
      const logs = await apiService.getBackendLogs({
        level: filterLevel !== 'all' ? filterLevel : undefined,
        since,
        search: searchQuery || undefined,
        limit: 500,
      });

      // Parse and add to store
      logs.forEach((log: any) => {
        const entry: Omit<LogEntry, 'id' | 'source'> = {
          timestamp: new Date(log.timestamp).getTime(),
          level: log.level || 'info',
          message: log.message || '',
          stack: log.stack,
          metadata: log,
        };

        if (log.level === 'error') {
          useLogStore.getState().addBackendError(entry);
        } else {
          useLogStore.getState().addBackendLog(entry);
        }
      });
    } catch (err) {
      onLog('error', `Failed to fetch backend logs: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const fetchVisionLogs = async () => {
    try {
      const logs = await apiService.getVisionLogs({
        level: filterLevel !== 'all' ? filterLevel : undefined,
        limit: 500,
      });

      logs.forEach((log: string | any) => {
        const entry: Omit<LogEntry, 'id' | 'source'> = {
          timestamp: Date.now(),
          level: typeof log === 'string' ? (log.toLowerCase().includes('error') ? 'error' : 'info') : 'info',
          message: typeof log === 'string' ? log : JSON.stringify(log),
        };
        useLogStore.getState().addVisionLog(entry);
      });
    } catch (err) {
      onLog('error', `Failed to fetch vision logs: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const getTimeRangeTimestamp = (range: string): number | undefined => {
    const now = Date.now();
    switch (range) {
      case '5min':
        return now - 5 * 60 * 1000;
      case '15min':
        return now - 15 * 60 * 1000;
      case '1hr':
        return now - 60 * 60 * 1000;
      case '24hr':
        return now - 24 * 60 * 60 * 1000;
      default:
        return undefined;
    }
  };

  // Auto-refresh logs
  useEffect(() => {
    if (!autoRefresh) return;

    fetchBackendLogs();
    fetchVisionLogs();

    const interval = setInterval(() => {
      fetchBackendLogs();
      fetchVisionLogs();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, filterLevel, timeRange, searchQuery]);

  // Get current section logs
  const getCurrentLogs = (): LogEntry[] => {
    switch (activeSection) {
      case 'backend-errors':
        return backendErrors;
      case 'backend-logs':
        return backendLogs;
      case 'frontend-errors':
        return frontendErrors;
      case 'vision':
        return visionLogs;
      case 'websocket':
        return websocketLogs;
      case 'api':
        return apiLogs;
      case 'health':
        return healthLogs;
      default:
        return [];
    }
  };

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    const logs = getCurrentLogs();
    return logs.filter(log => {
      const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
      const matchesSearch = !searchQuery || 
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.level.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [activeSection, filterLevel, searchQuery, backendErrors, backendLogs, frontendErrors, visionLogs, websocketLogs, apiLogs, healthLogs]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && !pausedScroll && endRef.current && endRef.current.scrollIntoView) {
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

  // Statistics
  const stats = useMemo(() => {
    const allLogs = [...backendErrors, ...backendLogs, ...frontendErrors, ...visionLogs, ...websocketLogs, ...apiLogs, ...healthLogs];
    const total = allLogs.length;
    const errors = allLogs.filter(l => l.level === 'error').length;
    const warnings = allLogs.filter(l => l.level === 'warn').length;
    const bySource = {
      backend: backendErrors.length + backendLogs.length,
      frontend: frontendErrors.length,
      vision: visionLogs.length,
      websocket: websocketLogs.length,
      api: apiLogs.length,
      health: healthLogs.length,
    };
    return { total, errors, warnings, bySource };
  }, [backendErrors, backendLogs, frontendErrors, visionLogs, websocketLogs, apiLogs, healthLogs]);

  // Export logs
  const exportLogs = () => {
    const logText = filteredLogs.map(log => {
      const date = new Date(log.timestamp);
      return `[${date.toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.stack ? '\n' + log.stack : ''}`;
    }).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dixi-logs-${activeSection}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onLog('success', `Exported ${filteredLogs.length} logs`);
  };

  // Copy log to clipboard
  const copyLog = (log: LogEntry) => {
    const text = `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.stack ? '\n' + log.stack : ''}`;
    navigator.clipboard.writeText(text);
    onLog('success', 'Log copied to clipboard');
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'error':
        return '#FF006E';
      case 'warn':
        return '#FFA500';
      case 'info':
        return '#00F5FF';
      case 'debug':
        return '#888';
      default:
        return '#fff';
    }
  };

  const sections: Array<{ id: LogSection; label: string; icon: string }> = [
    { id: 'backend-errors', label: 'Backend Errors', icon: '🔴' },
    { id: 'backend-logs', label: 'Backend Logs', icon: '📋' },
    { id: 'frontend-errors', label: 'Frontend Errors', icon: '⚠️' },
    { id: 'vision', label: 'Vision Service', icon: '👁️' },
    { id: 'websocket', label: 'WebSocket', icon: '🔌' },
    { id: 'api', label: 'API Requests', icon: '🌐' },
    { id: 'health', label: 'System Health', icon: '💚' },
  ];

  return (
    <div className="cp-section logging-dashboard">
      <div className="cp-section-header">
        <span className="cp-section-icon">📊</span>
        <span className="cp-section-title">Logging Dashboard</span>
        <div className="cp-section-actions">
          <button 
            className="cp-btn-small" 
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
          >
            {autoRefresh ? '⏸️' : '▶️'}
          </button>
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
          <button className="cp-btn-small" onClick={() => clearSection(activeSection === 'backend-errors' ? 'backendErrors' : activeSection === 'backend-logs' ? 'backendLogs' : activeSection === 'frontend-errors' ? 'frontendErrors' : activeSection === 'vision' ? 'visionLogs' : activeSection === 'websocket' ? 'websocketLogs' : activeSection === 'api' ? 'apiLogs' : 'healthLogs')}>
            Clear
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="logging-stats">
        <span className="stat-item">Total: {stats.total}</span>
        <span className="stat-item" style={{ color: '#FF006E' }}>Errors: {stats.errors}</span>
        <span className="stat-item" style={{ color: '#FFA500' }}>Warnings: {stats.warnings}</span>
        <span className="stat-item">Backend: {stats.bySource.backend}</span>
        <span className="stat-item">Frontend: {stats.bySource.frontend}</span>
        <span className="stat-item">Vision: {stats.bySource.vision}</span>
      </div>

      {/* Section Tabs */}
      <div className="logging-tabs">
        {sections.map(section => (
          <button
            key={section.id}
            className={`logging-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="logging-filters">
        <input
          type="text"
          className="logging-search"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="logging-filter"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as any)}
        >
          <option value="all">All Levels</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <select
          className="logging-filter"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
        >
          <option value="all">All Time</option>
          <option value="5min">Last 5 min</option>
          <option value="15min">Last 15 min</option>
          <option value="1hr">Last 1 hour</option>
          <option value="24hr">Last 24 hours</option>
        </select>
      </div>

      {/* Logs Display */}
      <div 
        className="logging-content" 
        ref={logsContainerRef}
        onScroll={handleScroll}
      >
        {filteredLogs.length === 0 ? (
          <div className="logging-empty">
            {getCurrentLogs().length === 0 ? 'No logs in this section yet...' : 'No logs match your filters'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className="logging-entry"
              style={{ borderLeftColor: getLevelColor(log.level) }}
            >
              <div className="logging-entry-header">
                <span className="logging-time">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span 
                  className="logging-level"
                  style={{ color: getLevelColor(log.level) }}
                >
                  [{log.level.toUpperCase()}]
                </span>
                <span className="logging-source">[{log.source}]</span>
                <button 
                  className="logging-copy-btn"
                  onClick={() => copyLog(log)}
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
              <div className="logging-message">{log.message}</div>
              {log.stack && (
                <details className="logging-stack">
                  <summary>Stack trace</summary>
                  <pre className="logging-stack">{log.stack}</pre>
                </details>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
