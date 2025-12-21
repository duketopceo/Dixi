import React, { useEffect } from 'react';
import ProjectionCanvas from './components/ProjectionCanvas';
import ControlPanel from './components/ControlPanel';
import MinimalHUD from './components/HUD/MinimalHUD';
import AIInputBar from './components/HUD/AIInputBar';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

const App: React.FC = () => {
  const { connect, disconnect } = useWebSocket();

  useEffect(() => {
    // Connect to WebSocket on mount
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <div className="app">
      <ProjectionCanvas />
      <MinimalHUD />
      <AIInputBar />
      <ControlPanel />
    </div>
  );
};

export default App;
