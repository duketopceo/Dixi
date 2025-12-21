import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { useGestureStore } from '../store/gestureStore';
import { useAIStore } from '../store/aiStore';
import { useWebSocket } from '../hooks/useWebSocket';
import logger from '../utils/logger';
import './ControlPanel.css';

interface DebugLog {
  timestamp: number;
  type: 'info' | 'error' | 'warning' | 'success' | 'websocket' | 'api' | 'gesture' | 'ai';
  message: string;
  data?: unknown;
}

interface AccordionSectionProps {
  id: string;
  title: string;
  icon?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ id, title, icon, defaultExpanded = false, children }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<string>(defaultExpanded ? '1000px' : '0px');

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setMaxHeight(`${contentRef.current.scrollHeight}px`);
    } else {
      setMaxHeight('0px');
    }
  }, [isExpanded]);

  return (
    <div className={`accordion-section ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="accordion-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${id}`}
      >
        <div className="accordion-header-content">
          {icon && <span className="accordion-icon">{icon}</span>}
          <span className="accordion-title">{title}</span>
        </div>
        <span className="accordion-chevron">{isExpanded ? '▼' : '▶'}</span>
      </button>
      <div
        id={`accordion-content-${id}`}
        className="accordion-content"
        style={{ maxHeight }}
      >
        <div className="accordion-content-inner" ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
};

const ControlPanel: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [gestureTracking, setGestureTracking] = useState(false);
  const [continuousAnalysis, setContinuousAnalysis] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<Record<string, unknown>>({});
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const currentGesture = useGestureStore((state) => state.currentGesture);
  const gestureHistory = useGestureStore((state) => state.gestureHistory);
  const latestResponse = useAIStore((state) => state.latestResponse);
  const responseHistory = useAIStore((state) => state.responseHistory);
  const isProcessing = useAIStore((state) => state.isProcessing);
  const { isConnected: wsConnected, error: wsError } = useWebSocket();

  const addDebugLog = (type: DebugLog['type'], message: string, data?: unknown) => {
    const log: DebugLog = {
      timestamp: Date.now(),
      type,
      message,
      data
    };
    setDebugLogs((prev) => [...prev.slice(-99), log]); // Keep last 100 logs
    logger.log(`[${type.toUpperCase()}]`, message, data || '');
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [debugLogs]);

  useEffect(() => {
    addDebugLog('info', 'ControlPanel mounted');
    
    // Monitor gesture changes
    const unsubscribe = useGestureStore.subscribe(
      (state) => state.currentGesture,
      (gesture) => {
        if (gesture) {
          addDebugLog('gesture', `Gesture detected: ${gesture.type}`, gesture);
        }
      }
    );

    // Monitor AI responses
    const unsubscribeAI = useAIStore.subscribe(
      (state) => state.latestResponse,
      (response) => {
        if (response) {
          addDebugLog('ai', 'AI response received', response);
        }
      }
    );

    // Periodic system status check
    const checkSystemStatus = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      try {
        // Check backend health
        let backendHealth = null;
        try {
          const response = await fetch('http://localhost:3001/health', { 
            method: 'GET',
            signal
          });
          if (response.ok) {
            backendHealth = await response.json();
          } else {
            backendHealth = { status: 'unhealthy', error: `HTTP ${response.status}` };
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          backendHealth = { status: 'unavailable', error: err instanceof Error ? err.message : 'Connection failed' };
        }
        
        // Check vision service health
        let visionHealth = null;
        try {
          const response = await fetch('http://localhost:5000/health', {
            method: 'GET',
            signal
          });
          if (response.ok) {
            visionHealth = await response.json();
          } else {
            visionHealth = { status: 'unhealthy', error: `HTTP ${response.status}` };
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          visionHealth = { status: 'unavailable', error: err instanceof Error ? err.message : 'Connection failed' };
        }
        
        // Check Ollama
        let ollamaHealth = null;
        try {
          const response = await fetch('http://localhost:11434/api/tags', {
            method: 'GET',
            signal
          });
          if (response.ok) {
            ollamaHealth = { status: 'available', models: await response.json() };
          } else {
            ollamaHealth = { status: 'unhealthy', error: `HTTP ${response.status}` };
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          ollamaHealth = { status: 'unavailable', error: err instanceof Error ? err.message : 'Connection failed' };
        }
        
        // Get AI status
        let aiStatus = null;
        if (backendHealth?.status === 'healthy') {
          try {
            aiStatus = await apiService.getAIStatus();
          } catch (err) {
            aiStatus = { error: 'Failed to fetch' };
          }
        }
        
        setSystemStatus({
          backend: backendHealth,
          vision: visionHealth,
          ollama: ollamaHealth,
          ai: aiStatus,
          timestamp: Date.now()
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        addDebugLog('error', 'Failed to check system status', err);
        setSystemStatus({
          backend: { status: 'error', error: 'Status check failed' },
          timestamp: Date.now()
        });
      }
    };
    
    checkSystemStatus();
    const statusInterval = setInterval(checkSystemStatus, 10000);

    return () => {
      unsubscribe();
      unsubscribeAI();
      clearInterval(statusInterval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleGestureToggle = async () => {
    setLoading(true);
    setError(null);
    addDebugLog('api', `Attempting to ${gestureTracking ? 'stop' : 'start'} gesture tracking`);
    
    try {
      if (gestureTracking) {
        await apiService.stopGestureTracking();
        addDebugLog('success', 'Gesture tracking stopped');
      } else {
        await apiService.startGestureTracking();
        addDebugLog('success', 'Gesture tracking started');
      }
      setGestureTracking(!gestureTracking);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle gesture tracking';
      setError(message);
      addDebugLog('error', 'Failed to toggle gesture tracking', error);
      logger.error('Failed to toggle gesture tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinuousAnalysisToggle = async () => {
    if (loading) return;
    setError(null);
    const newState = !continuousAnalysis;
    addDebugLog('api', `Attempting to ${newState ? 'enable' : 'disable'} continuous analysis`);
    
    setContinuousAnalysis(newState);
    
    try {
      await apiService.toggleContinuousAnalysis(newState);
      addDebugLog('success', `Continuous analysis ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      setContinuousAnalysis(!newState);
      const message = error instanceof Error ? error.message : 'Failed to toggle continuous analysis';
      setError(message);
      addDebugLog('error', 'Failed to toggle continuous analysis', error);
      logger.error('Failed to toggle continuous analysis:', error);
    }
  };

  const handleAIQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setLoading(true);
    setError(null);
    addDebugLog('api', 'Sending AI query', { query: aiQuery, context: currentGesture });
    
    try {
      const startTime = Date.now();
      await apiService.sendAIQuery(aiQuery);
      const duration = Date.now() - startTime;
      addDebugLog('success', `AI query completed in ${duration}ms`, { query: aiQuery, duration });
      setAiQuery('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send AI query';
      setError(message);
      addDebugLog('error', 'Failed to send AI query', error);
      logger.error('Failed to send AI query:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
    addDebugLog('info', 'Debug logs cleared');
  };

  const testConnections = async () => {
    addDebugLog('info', 'Testing all connections...');
    
    const tests = [
      { name: 'Backend Health', url: 'http://localhost:3001/health' },
      { name: 'Vision Service', url: 'http://localhost:5000/health' },
      { name: 'Ollama', url: 'http://localhost:11434/api/tags' }
    ];

    for (const test of tests) {
      try {
        const start = Date.now();
        const response = await fetch(test.url, { method: 'GET', signal: AbortSignal.timeout(3000) });
        const duration = Date.now() - start;
        if (response.ok) {
          addDebugLog('success', `${test.name}: OK (${duration}ms)`);
        } else {
          addDebugLog('warning', `${test.name}: ${response.status} (${duration}ms)`);
        }
      } catch (error) {
        addDebugLog('error', `${test.name}: Failed`, error);
      }
    }
  };

  if (isCollapsed) {
    return (
      <button
        className="control-panel-toggle"
        onClick={() => setIsCollapsed(false)}
        title="Show Control Panel"
        aria-label="Open Control Panel"
      >
        ⚙️
      </button>
    );
  }

  return (
    <div className="control-panel">
      <div className="control-panel-header">
        <h2>Control Panel</h2>
        <button
          className="control-panel-close"
          onClick={() => setIsCollapsed(true)}
          title="Hide Control Panel"
          aria-label="Close Control Panel"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      <div className="accordion-container">
        {/* Connection Status */}
        <AccordionSection id="connections" title="Connection Status" icon="🔌" defaultExpanded={true}>
          <div className="status-grid">
            <div className="status-item">
              <div className="status-header">
                <span className="status-label">WebSocket</span>
                <span className={`status-dot ${wsConnected ? 'online' : 'offline'}`} />
              </div>
              <span className={`status-value ${wsConnected ? 'online' : 'offline'}`}>
                {wsConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="status-item">
              <div className="status-header">
                <span className="status-label">Backend</span>
                <span className={`status-dot ${systemStatus.backend?.status === 'healthy' ? 'online' : 'offline'}`} />
              </div>
              <span className={`status-value ${systemStatus.backend?.status === 'healthy' ? 'online' : 'offline'}`}>
                {systemStatus.backend?.status === 'healthy' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="status-item">
              <div className="status-header">
                <span className="status-label">Vision Service</span>
                <span className={`status-dot ${systemStatus.vision?.status === 'healthy' ? 'online' : 'offline'}`} />
              </div>
              <span className={`status-value ${systemStatus.vision?.status === 'healthy' ? 'online' : 'offline'}`}>
                {systemStatus.vision?.status === 'healthy' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="status-item">
              <div className="status-header">
                <span className="status-label">Ollama</span>
                <span className={`status-dot ${systemStatus.ollama?.status === 'available' ? 'online' : 'offline'}`} />
              </div>
              <span className={`status-value ${systemStatus.ollama?.status === 'available' ? 'online' : 'offline'}`}>
                {systemStatus.ollama?.status === 'available' ? 'Available' : 'Unavailable'}
              </span>
            </div>
            {wsError && (
              <div className="status-item error">
                <span className="status-label">Error</span>
                <span className="status-value error">{wsError}</span>
              </div>
            )}
          </div>
          <button className="control-button" onClick={testConnections}>
            Test Connections
          </button>
        </AccordionSection>

        {/* Gesture Tracking */}
        <AccordionSection id="gestures" title="Gesture Tracking" icon="👋" defaultExpanded={true}>
          <button
            className={`control-button ${gestureTracking ? 'active' : ''}`}
            onClick={handleGestureToggle}
            disabled={loading}
          >
            {gestureTracking ? '⏸️ Stop Tracking' : '▶️ Start Tracking'}
          </button>
          {currentGesture && (
            <div className="gesture-info">
              <div className="info-row">
                <span className="info-label">Type:</span>
                <span className="info-value">{currentGesture.type}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Confidence:</span>
                <span className="info-value">{(currentGesture.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="info-row">
                <span className="info-label">Position:</span>
                <span className="info-value">
                  ({currentGesture.position.x.toFixed(2)}, {currentGesture.position.y.toFixed(2)})
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">History:</span>
                <span className="info-value">{gestureHistory.length} gestures</span>
              </div>
            </div>
          )}
        </AccordionSection>

        {/* AI Analysis */}
        <AccordionSection id="ai-analysis" title="AI Analysis" icon="🤖" defaultExpanded={true}>
          <div className="toggle-switch-container">
            <div 
              className={`toggle-switch ${continuousAnalysis ? 'on' : 'off'}`}
              onClick={handleContinuousAnalysisToggle}
              role="switch"
              aria-checked={continuousAnalysis}
              aria-label="Continuous AI Analysis"
            >
              <div className="toggle-slider" />
              <span className="toggle-label">
                {continuousAnalysis ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          <p className="toggle-description">
            {continuousAnalysis 
              ? '🟢 AI analyzes gestures every 10 seconds automatically' 
              : '🔴 Manual analysis only'}
          </p>
          {!continuousAnalysis && (
            <button
              className="control-button"
              onClick={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  addDebugLog('info', 'Triggering manual gesture analysis...');
                  await apiService.triggerManualAnalysis();
                  addDebugLog('success', 'Manual analysis triggered');
                } catch (err: unknown) {
                  const message = (err as Error).message || 'Failed to trigger analysis';
                  setError(message);
                  addDebugLog('error', 'Manual analysis failed', err);
                  logger.error('Failed to trigger manual analysis:', err);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || isProcessing}
            >
              {loading || isProcessing ? '⏳ Analyzing...' : '🔍 Analyze Gestures Now'}
            </button>
          )}
        </AccordionSection>

        {/* AI Query */}
        <AccordionSection id="ai-query" title="AI Query" icon="💬" defaultExpanded={false}>
          <form onSubmit={handleAIQuery} className="ai-query-form">
            <textarea
              className="query-input"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask anything..."
              rows={4}
              disabled={loading}
            />
            <button
              type="submit"
              className="control-button"
              disabled={loading || !aiQuery.trim()}
            >
              {loading ? '⏳ Processing...' : '🚀 Send Query'}
            </button>
          </form>
          {latestResponse && (
            <div className="response-preview">
              <div className="info-row">
                <span className="info-label">Last Response:</span>
                <span className="info-value truncated">
                  {latestResponse.response.substring(0, 80)}...
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">History:</span>
                <span className="info-value">{responseHistory.length} responses</span>
              </div>
            </div>
          )}
        </AccordionSection>

        {/* System Info */}
        <AccordionSection id="system" title="System Info" icon="⚙️" defaultExpanded={false}>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Environment:</span>
              <span className="info-value">{import.meta.env.MODE}</span>
            </div>
            <div className="info-row">
              <span className="info-label">API URL:</span>
              <span className="info-value small">
                {import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">WS URL:</span>
              <span className="info-value small">
                {import.meta.env.VITE_WS_URL || 'ws://localhost:3002'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Vision URL:</span>
              <span className="info-value small">
                {import.meta.env.VITE_VISION_SERVICE_URL || 'http://localhost:5000'}
              </span>
            </div>
          </div>
        </AccordionSection>

        {/* Debug Logs */}
        <AccordionSection id="debug" title="Debug Logs" icon="📊" defaultExpanded={false}>
          <div className="debug-header">
            <span className="debug-count">{debugLogs.length} logs</span>
            <button 
              className="control-button small"
              onClick={clearDebugLogs}
            >
              Clear
            </button>
          </div>
          <div className="debug-logs">
            {debugLogs.length === 0 ? (
              <div className="debug-empty">No debug logs yet...</div>
            ) : (
              debugLogs.map((log, idx) => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                const colorMap: Record<string, string> = {
                  info: '#00F5FF',
                  error: '#FF006E',
                  warning: '#FFA500',
                  success: '#00FF87',
                  websocket: '#9D4EDD',
                  api: '#4A90E2',
                  gesture: '#FFD700',
                  ai: '#00CED1'
                };
                return (
                  <div 
                    key={idx} 
                    className="debug-log-item"
                    style={{ borderLeftColor: colorMap[log.type] || '#888' }}
                  >
                    <span className="debug-time">[{time}]</span>
                    <span className="debug-type" style={{ color: colorMap[log.type] || '#fff' }}>
                      [{log.type.toUpperCase()}]
                    </span>
                    <span className="debug-message">{log.message}</span>
                    {log.data && (
                      <details className="debug-details">
                        <summary>Data</summary>
                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </AccordionSection>
      </div>
    </div>
  );
};

export default ControlPanel;
