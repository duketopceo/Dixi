import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import ProjectionScene from './ProjectionScene';
import './ProjectionCanvas.css';

const VISION_SERVICE_URL = import.meta.env.VITE_VISION_SERVICE_URL || 'http://localhost:5000';

const ProjectionCanvas: React.FC = () => {
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    // Test camera feed availability
    const img = new Image();
    img.onerror = () => setCameraError(true);
    img.onload = () => setCameraError(false);
    img.src = `${VISION_SERVICE_URL}/video_feed?t=${Date.now()}`;
  }, []);

  return (
    <div className="projection-canvas">
      {/* Camera feed background */}
      <div className="camera-background">
        {!cameraError ? (
          <img
            src={`${VISION_SERVICE_URL}/video_feed`}
            alt="Camera feed"
            className="camera-feed"
            onError={() => setCameraError(true)}
          />
        ) : (
          <div className="camera-placeholder">
            <p>📹 Camera feed unavailable</p>
            <p>Check vision service at {VISION_SERVICE_URL}</p>
          </div>
        )}
      </div>

      {/* 3D Canvas overlay */}
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enableZoom={true} enablePan={true} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        <ProjectionScene />
      </Canvas>
      
      <div className="canvas-overlay">
        <div className="info-panel">
          <p>👋 Use gestures to interact</p>
          <p>🎨 Interactive knowledge canvas</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectionCanvas;
