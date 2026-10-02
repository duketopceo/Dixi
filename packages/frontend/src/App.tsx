import React, { useEffect } from 'react';
import ProjectionCanvas from './components/ProjectionCanvas';
import GestureShapes from './components/GestureShapes';
import DrawScene from './scenes/DrawScene';
import Launcher from './components/Launcher';
import Dock from './components/Dock';
import CalibrationOverlay from './components/CalibrationOverlay';
import CameraPreview from './components/CameraPreview';
import VisionHUD from './components/VisionHUD';
import ControlPanel from './components/ControlPanel/index';
import MinimalHUD from './components/HUD/MinimalHUD';
import AIInputBar from './components/HUD/AIInputBar';
import { useWebSocket } from './hooks/useWebSocket';
import { useVisionStore } from './vision/visionStore';
import { useAppStore } from './app/appStore';
import { useTrackingStore } from './store/trackingStore';
import { browserTrackingSource } from './vision/browserTrackingSource';
import './config/firebase'; // Initialize Firebase
import './App.css';

// Debug handle for calibration/perf inspection from devtools or automation
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__stores = {
    vision: useVisionStore,
    tracking: useTrackingStore,
    app: useAppStore,
  };
}

const App: React.FC = () => {
  const { connect, disconnect } = useWebSocket();
  const mode = useVisionStore((s) => s.mode);
  const activeScene = useAppStore((s) => s.activeScene);
  const menuOpen = useAppStore((s) => s.menuOpen);

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
      {/* Legacy R3F scene only makes sense against the Python service feed */}
      {mode === 'server' && <ProjectionCanvas />}

      {!menuOpen && activeScene === 'shapes' && <GestureShapes />}
      {!menuOpen && activeScene === 'draw' && <DrawScene />}

      <CalibrationOverlay />
      <CameraPreview />
      <VisionHUD />
      <Dock />
      <Launcher />
      <MinimalHUD />
      <AIInputBar />
      <ControlPanel />
    </div>
  );
};

export default App;
