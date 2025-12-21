import React, { useState, useEffect } from 'react';
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
      {/* Camera feed background - full screen */}
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
            <div className="camera-error-message">
              <p>📹 Camera feed unavailable</p>
              <p>Check vision service at {VISION_SERVICE_URL}</p>
            </div>
          </div>
        )}
      </div>

      {/* 3D Canvas overlay - transparent, covering camera area */}
      <Canvas
        gl={{ alpha: true, antialias: true }}
        frameloop="always"
        dpr={[1, 2]}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70vw',
          maxWidth: '1200px',
          height: '70vh',
          maxHeight: '800px',
          zIndex: 10,
          pointerEvents: 'none'
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enableZoom={false} enablePan={false} />
        
        <ambientLight intensity={0.5} />
        
        <ProjectionScene />
      </Canvas>
    </div>
  );
};

export default ProjectionCanvas;
