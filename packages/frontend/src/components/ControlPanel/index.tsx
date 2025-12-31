import React, { useState, useCallback } from 'react';
import { useSystemStatus } from './hooks/useSystemStatus';
import { ConnectionStatus } from './sections/ConnectionStatus';
import { GestureControls } from './sections/GestureControls';
import { AIChat } from './sections/AIChat';
import { DebugLogs, LogEntry } from './sections/DebugLogs';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useGestureStore } from '../../store/gestureStore';
import './ControlPanel.css';

const ControlPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const { status, isChecking, refresh } = useSystemStatus(10000);
  const { isConnected: wsConnected } = useWebSocket();
  const currentGesture = useGestureStore((state) => state.currentGesture);

  const addLog = useCallback((type: string, message: string) => {
    const entry: LogEntry = {
      timestamp: Date.now(),
      type: type as LogEntry['type'],
      message
    };
    setLogs(prev => [...prev.slice(-49), entry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  }, [addLog]);

  if (!isOpen) {
    return (
      <button
        className="cp-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Control Panel"
      >
        ⚙️
      </button>
    );
  }

  return (
    <div className="cp-container">
      <div className="cp-header">
        <h2 className="cp-title">Control Panel</h2>
        <button 
          className="cp-close"
          onClick={() => setIsOpen(false)}
          title="Close"
        >
          ×
        </button>
      </div>

      <div className="cp-content">
        <ConnectionStatus 
          status={status}
          wsConnected={wsConnected}
          onRefresh={refresh}
          isChecking={isChecking}
        />
        
        <GestureControls 
          currentGesture={currentGesture}
          onLog={addLog}
        />
        
        <AIChat onLog={addLog} />
        
        <DebugLogs 
          logs={logs}
          onClear={clearLogs}
        />
      </div>
    </div>
  );
};

export default ControlPanel;
