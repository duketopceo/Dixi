import React, { useEffect, useState } from 'react';
import ProjectionCanvas from './components/ProjectionCanvas';
import ControlPanel from './components/ControlPanel';
import GestureIndicator from './components/GestureIndicator';
import AIResponseDisplay from './components/AIResponseDisplay';
import DebugLog from './components/DebugLog';
import { useWebSocket } from './hooks/useWebSocket';
import { useGestureStore } from './store/gestureStore';
import { useAIStore } from './store/aiStore';
import './App.css';

const App: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const { connect, disconnect } = useWebSocket();
  const currentGesture = useGestureStore((state) => state.currentGesture);
  const aiResponse = useAIStore((state) => state.latestResponse);

  useEffect(() => {
    // Connect to WebSocket on mount
    connect();
    setConnected(true);

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎨 Dixi</h1>
        <p>Digital Exploration and Curiosity</p>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>

      <main className="app-main">
        <ProjectionCanvas />
        <GestureIndicator gesture={currentGesture} />
        <AIResponseDisplay response={aiResponse} />
      </main>

      <aside className="app-sidebar">
        <ControlPanel />
      </aside>

      <DebugLog />
    </div>
  );
};

export default App;
