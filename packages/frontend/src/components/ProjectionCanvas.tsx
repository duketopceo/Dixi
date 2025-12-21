import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import ProjectionScene from './ProjectionScene';
import './ProjectionCanvas.css';

const ProjectionCanvas: React.FC = () => {
  return (
    <div className="projection-canvas">
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
