import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { useGestureStore } from '../store/gestureStore';
import { useAIStore } from '../store/aiStore';
import { useSceneStore } from '../store/sceneStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePerformance } from '../hooks/usePerformance';
import { serializeScene, deserializeScene } from '../utils/sceneSerializer';
import { MAX_OBJECTS } from '../utils/validation';
import { ObjectPropertiesPanel } from './Scene/ObjectPropertiesPanel';
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
  
  // Scene management state
  const objects = useSceneStore((state) => state.objects);
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId);
  const clearScene = useSceneStore((state) => state.clearScene);
  const undo = useSceneStore((state) => state.undo);
  const redo = useSceneStore((state) => state.redo);
  const duplicateObject = useSceneStore((state) => state.duplicateObject);
  const history = useSceneStore((state) => state.history);
  const clearHistory = useSceneStore((state) => state.clearHistory);
  const [sceneName, setSceneName] = useState('');
  const [savedScenes, setSavedScenes] = useState<Array<{ id: string; name: string; objectCount: number }>>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  
  // Performance metrics using hook
  const performanceMetrics = usePerformance();

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

  // Scene management handlers
  const loadScenes = async () => {
    setLoadingScenes(true);
    try {
      const response = await apiService.listScenes();
      if (response?.scenes) {
        setSavedScenes(response.scenes);
        addDebugLog('success', `Loaded ${response.scenes.length} saved scenes`);
      }
    } catch (error) {
      // Silently fail if backend isn't available - scenes are optional
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('No response from server') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        // Backend not available - this is OK, scenes will load when backend starts
        logger.debug('Backend not available for scene loading (this is OK)');
      } else {
        addDebugLog('error', 'Failed to load scenes', error);
      }
    } finally {
      setLoadingScenes(false);
    }
  };

  const handleSaveScene = async () => {
    if (objects.length === 0) {
      setError('Cannot save empty scene');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const serialized = serializeScene(objects, sceneName || undefined);
      const response = await apiService.saveScene(serialized, sceneName || undefined);
      addDebugLog('success', `Scene saved: ${response.sceneId}`, { objectCount: objects.length });
      setSceneName('');
      clearHistory(); // Clear history on save
      await loadScenes();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save scene';
      setError(message);
      addDebugLog('error', 'Failed to save scene', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadScene = async (sceneId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.loadScene(sceneId);
      if (response?.scene?.objects) {
        const deserialized = deserializeScene(response.scene);
        clearScene();
        // Add objects without creating history entries (batch add)
        const store = useSceneStore.getState();
        deserialized.forEach((obj) => {
          store.addObject(obj);
        });
        clearHistory(); // Clear history on load
        addDebugLog('success', `Scene loaded: ${response.scene.name || sceneId}`, { objectCount: deserialized.length });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load scene';
      setError(message);
      addDebugLog('error', 'Failed to load scene', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearScene = () => {
    if (window.confirm('Are you sure you want to clear the scene? This cannot be undone.')) {
      clearScene();
      addDebugLog('info', 'Scene cleared');
    }
  };

  // Load scenes on mount
  useEffect(() => {
    loadScenes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (history.past.length > 0) {
          undo();
          addDebugLog('info', 'Undo performed');
        }
      }
      // Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (history.future.length > 0) {
          redo();
          addDebugLog('info', 'Redo performed');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, undo, redo]);
  
  // Performance metrics are now handled by usePerformance hook

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

        {/* Scene Management */}
        <AccordionSection id="scene" title="Scene Management" icon="🎨" defaultExpanded={false}>
          <div className="scene-controls">
            <div className="scene-info">
              <span className="info-label">Objects in Scene:</span>
              <span className={`info-value ${objects.length >= MAX_OBJECTS ? 'warning' : ''}`}>
                {objects.length} / {MAX_OBJECTS}
              </span>
            </div>
            {objects.length >= MAX_OBJECTS && (
              <div className="scene-warning">
                ⚠️ Maximum object limit reached. Remove objects to create new ones.
              </div>
            )}
            
            <div className="scene-save">
              <input
                type="text"
                className="scene-name-input"
                placeholder="Scene name (optional)"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveScene()}
              />
              <button
                className="control-button"
                onClick={handleSaveScene}
                disabled={loading || objects.length === 0}
              >
                {loading ? 'Saving...' : 'Save Scene'}
              </button>
            </div>

            <div className="scene-actions">
              <button
                className="control-button"
                onClick={handleClearScene}
                disabled={objects.length === 0}
              >
                Clear Scene
              </button>
              <button
                className="control-button"
                onClick={loadScenes}
                disabled={loadingScenes}
              >
                {loadingScenes ? 'Loading...' : 'Refresh Scenes'}
              </button>
            </div>
            
            <div className="scene-undo-redo">
              <button
                className="control-button"
                onClick={() => {
                  undo();
                  addDebugLog('info', 'Undo performed');
                }}
                disabled={history.past.length === 0}
                title="Undo (Ctrl+Z)"
              >
                ↶ Undo ({history.past.length})
              </button>
              <button
                className="control-button"
                onClick={() => {
                  redo();
                  addDebugLog('info', 'Redo performed');
                }}
                disabled={history.future.length === 0}
                title="Redo (Ctrl+Shift+Z)"
              >
                ↷ Redo ({history.future.length})
              </button>
            </div>

            <div className="scene-actions">
              <button
                className="control-button"
                onClick={() => {
                  if (selectedObjectId) {
                    const result = duplicateObject(selectedObjectId, [0.5, 0.5, 0]);
                    if (result.success) {
                      addDebugLog('success', 'Object duplicated');
                    } else {
                      addDebugLog('error', result.error || 'Failed to duplicate object');
                    }
                  } else {
                    addDebugLog('warning', 'No object selected for duplication');
                  }
                }}
                disabled={!selectedObjectId || objects.length >= MAX_OBJECTS}
                title="Duplicate selected object (or use double-tap gesture)"
              >
                📋 Duplicate
              </button>
            </div>

            {savedScenes.length > 0 && (
              <div className="scene-list">
                <div className="scene-list-header">Saved Scenes:</div>
                <div className="scene-list-items">
                  {savedScenes.map((scene) => (
                    <div key={scene.id} className="scene-list-item">
                      <div className="scene-item-info">
                        <span className="scene-item-name">{scene.name}</span>
                        <span className="scene-item-count">{scene.objectCount} objects</span>
                      </div>
                      <button
                        className="control-button small"
                        onClick={() => handleLoadScene(scene.id)}
                        disabled={loading}
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Object Properties */}
        <AccordionSection id="properties" title="Object Properties" icon="🎛️" defaultExpanded={false}>
          <ObjectPropertiesPanel objectId={selectedObjectId} />
        </AccordionSection>

        {/* Performance Metrics */}
        <AccordionSection id="performance" title="Performance" icon="📊" defaultExpanded={false}>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">FPS:</span>
              <span className={`info-value ${performanceMetrics.fps < 30 ? 'warning' : performanceMetrics.fps >= 60 ? 'success' : ''}`}>
                {performanceMetrics.fps}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Frame Time:</span>
              <span className={`info-value ${performanceMetrics.frameTime > 33 ? 'warning' : performanceMetrics.frameTime < 17 ? 'success' : ''}`}>
                {performanceMetrics.frameTime.toFixed(2)} ms
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Objects:</span>
              <span className="info-value">{performanceMetrics.objectCount}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Particles:</span>
              <span className="info-value">{performanceMetrics.particleCount}</span>
            </div>
            {performanceMetrics.fps < 30 && (
              <div className="info-row warning">
                <span className="info-label">⚠️ Performance Warning:</span>
                <span className="info-value">FPS below 30. Consider reducing object count.</span>
              </div>
            )}
          </div>
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
