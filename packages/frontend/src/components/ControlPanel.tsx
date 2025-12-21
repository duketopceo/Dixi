import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { useGestureStore } from '../store/gestureStore';
import { useAIStore } from '../store/aiStore';
import { useWebSocket } from '../hooks/useWebSocket';
import './ControlPanel.css';

interface DebugLog {
  timestamp: number;
  type: 'info' | 'error' | 'warning' | 'success' | 'websocket' | 'api' | 'gesture' | 'ai';
  message: string;
  data?: any;
}

const ControlPanel: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [gestureTracking, setGestureTracking] = useState(false);
  const [continuousAnalysis, setContinuousAnalysis] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [systemStatus, setSystemStatus] = useState<any>({});
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const currentGesture = useGestureStore((state) => state.currentGesture);
  const gestureHistory = useGestureStore((state) => state.gestureHistory);
  const latestResponse = useAIStore((state) => state.latestResponse);
  const responseHistory = useAIStore((state) => state.responseHistory);
  const isProcessing = useAIStore((state) => state.isProcessing);
  const { isConnected: wsConnected, error: wsError } = useWebSocket();

  const addDebugLog = (type: DebugLog['type'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: Date.now(),
      type,
      message,
      data
    };
    setDebugLogs((prev) => [...prev.slice(-99), log]); // Keep last 100 logs
    console.log(`[${type.toUpperCase()}]`, message, data || '');
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

    // Periodic system status check - actually verifies services are working
    const checkSystemStatus = async () => {
      // Cancel any in-flight requests before starting new ones
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
          if ((err as Error).name === 'AbortError') return; // Request was cancelled
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
          if ((err as Error).name === 'AbortError') return; // Request was cancelled
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
          if ((err as Error).name === 'AbortError') return; // Request was cancelled
          ollamaHealth = { status: 'unavailable', error: err instanceof Error ? err.message : 'Connection failed' };
        }
        
        // DISABLED: Gesture status polling removed to prevent camera freeze
        // The gesture data is received via WebSocket, no need to poll
        const gestureStatus = null;
        
        // Get AI status (if backend is up) - only check model status, not trigger inference
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
          gesture: gestureStatus,
          ai: aiStatus,
          timestamp: Date.now()
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // Request was cancelled
        addDebugLog('error', 'Failed to check system status', err);
        setSystemStatus({
          backend: { status: 'error', error: 'Status check failed' },
          timestamp: Date.now()
        });
      }
    };
    
    // Initial check
    checkSystemStatus();
    
    // Periodic checks every 10 seconds (reduced from 5 to lower request frequency)
    const statusInterval = setInterval(checkSystemStatus, 10000);

    return () => {
      unsubscribe();
      unsubscribeAI();
      clearInterval(statusInterval);
      // Cancel any in-flight requests on unmount
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
      console.error('Failed to toggle gesture tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinuousAnalysisToggle = async () => {
    if (loading) return; // Prevent double-clicks
    setError(null);
    const newState = !continuousAnalysis;
    addDebugLog('api', `Attempting to ${newState ? 'enable' : 'disable'} continuous analysis`);
    
    // Optimistic update for better UX
    setContinuousAnalysis(newState);
    
    try {
      await apiService.toggleContinuousAnalysis(newState);
      addDebugLog('success', `Continuous analysis ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      // Revert on error
      setContinuousAnalysis(!newState);
      const message = error instanceof Error ? error.message : 'Failed to toggle continuous analysis';
      setError(message);
      addDebugLog('error', 'Failed to toggle continuous analysis', error);
      console.error('Failed to toggle continuous analysis:', error);
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
      console.error('Failed to send AI query:', error);
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
        >
          ×
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ 
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '4px',
          color: '#c33'
        }}>
          ⚠️ {error}
        </div>
      )}

      <section className="control-section">
        <h3>Connection Status</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">WebSocket:</span>
            <span className="info-value" style={{ color: wsConnected ? '#00FF87' : '#FF006E' }}>
              {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Backend:</span>
            <span className="info-value" style={{ color: systemStatus.backend?.status === 'healthy' ? '#00FF87' : '#FF006E' }}>
              {systemStatus.backend?.status === 'healthy' ? '🟢 Online' : '🔴 Offline'}
              {systemStatus.backend?.error && ` (${systemStatus.backend.error})`}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Vision Service:</span>
            <span className="info-value" style={{ color: systemStatus.vision?.status === 'healthy' ? '#00FF87' : '#FF006E' }}>
              {systemStatus.vision?.status === 'healthy' ? '🟢 Connected' : '🔴 Disconnected'}
              {systemStatus.vision?.error && ` (${systemStatus.vision.error})`}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Ollama:</span>
            <span className="info-value" style={{ color: systemStatus.ollama?.status === 'available' ? '#00FF87' : '#FF006E' }}>
              {systemStatus.ollama?.status === 'available' ? '🟢 Available' : '🔴 Unavailable'}
              {systemStatus.ollama?.error && ` (${systemStatus.ollama.error})`}
            </span>
          </div>
          {wsError && (
            <div className="info-item">
              <span className="info-label">WS Error:</span>
              <span className="info-value" style={{ color: '#FF006E', fontSize: '0.8rem' }}>
                {wsError}
              </span>
            </div>
          )}
        </div>
        <button className="control-button" onClick={testConnections} style={{ marginTop: '10px' }}>
          🔍 Test Connections
        </button>
      </section>

      <section className="control-section">
        <h3>👋 Gesture Tracking</h3>
        <button
          className={`control-button ${gestureTracking ? 'active' : ''}`}
          onClick={handleGestureToggle}
          disabled={loading}
        >
          {gestureTracking ? '⏸️ Stop Tracking' : '▶️ Start Tracking'}
        </button>
        <p className="control-status">
          Status: {gestureTracking ? '🟢 Active' : '🔴 Inactive'}
        </p>
        {currentGesture && (
          <div className="info-grid" style={{ marginTop: '10px' }}>
            <div className="info-item">
              <span className="info-label">Type:</span>
              <span className="info-value">{currentGesture.type}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Confidence:</span>
              <span className="info-value">{(currentGesture.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="info-item">
              <span className="info-label">Position:</span>
              <span className="info-value">
                ({currentGesture.position.x.toFixed(2)}, {currentGesture.position.y.toFixed(2)})
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">History:</span>
              <span className="info-value">{gestureHistory.length} gestures</span>
            </div>
          </div>
        )}
      </section>

      <section className="control-section">
        <h3>Continuous AI Analysis</h3>
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
        <p className="control-status" style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '10px' }}>
          {continuousAnalysis 
            ? '🟢 AI analyzes gestures every 10 seconds automatically' 
            : '🔴 Manual analysis only (use button below)'}
        </p>
        
        {/* Manual Analysis Button - Only show when continuous is OFF */}
        {!continuousAnalysis && (
          <button
            className="control-button"
            onClick={async () => {
              try {
                setLoading(true);
                setError(null);
                addDebugLog('info', 'Triggering manual gesture analysis...');
                const result = await apiService.triggerManualAnalysis();
                addDebugLog('success', 'Manual analysis triggered', result);
              } catch (err: any) {
                const message = err.message || 'Failed to trigger analysis';
                setError(message);
                addDebugLog('error', 'Manual analysis failed', err);
                console.error('Failed to trigger manual analysis:', err);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || isProcessing}
            style={{ marginTop: '12px', width: '100%' }}
          >
            {loading || isProcessing ? '⏳ Analyzing...' : '🔍 Analyze Gestures Now'}
          </button>
        )}
      </section>

      <section className="control-section">
        <h3>🤖 AI Query</h3>
        <form onSubmit={handleAIQuery}>
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
          <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <div className="info-item">
              <span className="info-label">Last Response:</span>
              <span className="info-value" style={{ fontSize: '0.85rem' }}>
                {latestResponse.response.substring(0, 100)}...
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">History:</span>
              <span className="info-value">{responseHistory.length} responses</span>
            </div>
            <div className="info-item">
              <span className="info-label">Processing:</span>
              <span className="info-value" style={{ color: isProcessing ? '#00F5FF' : '#888' }}>
                {isProcessing ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="control-section">
        <h3>⚙️ System Info</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Environment:</span>
            <span className="info-value">{import.meta.env.MODE}</span>
          </div>
          <div className="info-item">
            <span className="info-label">API URL:</span>
            <span className="info-value" style={{ fontSize: '0.8rem' }}>
              {import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">WS URL:</span>
            <span className="info-value" style={{ fontSize: '0.8rem' }}>
              {import.meta.env.VITE_WS_URL || 'ws://localhost:3002'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Vision URL:</span>
            <span className="info-value" style={{ fontSize: '0.8rem' }}>
              {import.meta.env.VITE_VISION_SERVICE_URL || 'http://localhost:5000'}
            </span>
          </div>
        </div>
      </section>

      <section className="control-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>📊 Debug Logs ({debugLogs.length})</h3>
          <div>
            <button 
              className="control-button" 
              onClick={() => setShowDebug(!showDebug)}
              style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px' }}
            >
              {showDebug ? 'Hide' : 'Show'}
            </button>
            <button 
              className="control-button" 
              onClick={clearDebugLogs}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              Clear
            </button>
          </div>
        </div>
        {showDebug && (
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            background: 'rgba(0,0,0,0.5)', 
            padding: '10px', 
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '11px'
          }}>
            {debugLogs.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No debug logs yet...</div>
            ) : (
              debugLogs.map((log, idx) => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                const colorMap = {
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
                    style={{ 
                      marginBottom: '5px', 
                      padding: '4px',
                      borderLeft: `3px solid ${colorMap[log.type] || '#888'}`,
                      background: 'rgba(255,255,255,0.05)'
                    }}
                  >
                    <span style={{ color: '#888' }}>[{time}]</span>{' '}
                    <span style={{ color: colorMap[log.type] || '#fff', fontWeight: 'bold' }}>
                      [{log.type.toUpperCase()}]
                    </span>{' '}
                    <span style={{ color: '#fff' }}>{log.message}</span>
                    {log.data && (
                      <details style={{ marginTop: '4px', marginLeft: '20px' }}>
                        <summary style={{ cursor: 'pointer', color: '#888' }}>Data</summary>
                        <pre style={{ 
                          margin: '4px 0', 
                          padding: '4px', 
                          background: 'rgba(0,0,0,0.3)',
                          overflow: 'auto',
                          fontSize: '10px'
                        }}>
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </section>
    </div>
  );
};

export default ControlPanel;
