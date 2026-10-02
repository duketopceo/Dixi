import React, { useEffect } from 'react';
import ProjectionCanvas from './components/ProjectionCanvas';
import GestureShapes from './components/GestureShapes';
import CalibrationOverlay from './components/CalibrationOverlay';
import VisionHUD from './components/VisionHUD';
import ControlPanel from './components/ControlPanel/index';
import MinimalHUD from './components/HUD/MinimalHUD';
import AIInputBar from './components/HUD/AIInputBar';
import { useWebSocket } from './hooks/useWebSocket';
import { useVisionStore } from './vision/visionStore';
import { browserTrackingSource } from './vision/browserTrackingSource';
import './config/firebase'; // Initialize Firebase
import './App.css';

const App: React.FC = () => {
  const { connect, disconnect } = useWebSocket();
  const mode = useVisionStore((s) => s.mode);

  useEffect(() => {
    if (mode === 'browser') {
      // Vision runs locally — camera + MediaPipe WASM in a Web Worker.
      // WebSocket/backend stays connected for AI features only if configured.
      browserTrackingSource.start().catch(() => {
        // camera denied/unavailable — status already 'error' in the store
      });
      if (import.meta.env.VITE_WS_URL) connect();
      return () => {
        browserTrackingSource.stop();
        disconnect();
      };
    }
    connect();
    return () => disconnect();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      <ProjectionCanvas />
      <GestureShapes />
      <CalibrationOverlay />
      <VisionHUD />
      <MinimalHUD />
      <AIInputBar />
      <ControlPanel />
    </div>
  );
};

export default App;
