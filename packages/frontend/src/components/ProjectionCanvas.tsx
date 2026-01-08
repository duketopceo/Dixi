import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import ProjectionScene from './ProjectionScene';
import { FaceOverlay } from './ProjectionCanvas/FaceOverlay';
import logger from '../utils/logger';
import { apiService } from '../services/api';
import { useTrackingStore } from '../store/trackingStore';
import './ProjectionCanvas.css';

const VISION_SERVICE_URL = import.meta.env.VITE_VISION_SERVICE_URL || 'http://10.100.0.2:5000';

const ProjectionCanvas: React.FC = () => {
  const [cameraError, setCameraError] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [trackingStarted, setTrackingStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fps, setFps] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const fpsRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const currentTracking = useTrackingStore((state) => state.currentTracking);
  const MAX_RETRIES = 5;
  const BASE_RETRY_DELAY = 2000; // 2 seconds

  // Auto-start gesture tracking on mount to enable camera feed
  useEffect(() => {
    let isMounted = true;
    let cancelled = false;
    
    const startTracking = async () => {
      if (cancelled || !isMounted) return;
      
      try {
        // Call vision service directly to start gesture tracking
        const response = await fetch(`${VISION_SERVICE_URL}/gesture/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok && isMounted && !cancelled) {
          setTrackingStarted(true);
          logger.log('Gesture tracking started successfully');
          // Wait a moment for camera to initialize before trying to load video feed
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        // Silently fail - vision service might not be running yet
        // User can manually start tracking via ControlPanel
        if (isMounted && !cancelled && import.meta.env.DEV) {
          logger.debug('Auto-start gesture tracking skipped (vision service may not be running)');
        }
      }
    };

    // Delay auto-start slightly to ensure app is fully mounted
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        startTracking().catch(() => {
          // Ignore all errors - gracefully degrade
        });
      }
    }, 500);

    return () => {
      cancelled = true;
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      // Abort any pending image loads
      if (imgRef.current) {
        imgRef.current.src = '';
        imgRef.current = null;
      }
    };
  }, []);

  const refreshCamera = async () => {
    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    setIsRefreshing(true);
    setCameraError(false);
    setRetryCount(0);
    setIsRetrying(false);
    
    // Step 1: Completely clear the image src and handlers
    if (imgRef.current) {
      // Stop current load
      imgRef.current.src = '';
      imgRef.current.onload = null;
      imgRef.current.onerror = null;
    }
    
    // Step 2: Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Step 3: Verify vision service is healthy
    try {
      const healthResponse = await fetch(`${VISION_SERVICE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
        cache: 'no-store'
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Vision service unhealthy: ${healthResponse.status}`);
      }
      
      const healthData = await healthResponse.json();
      logger.log('Vision service health check:', healthData);
    } catch (error) {
      logger.warn('Vision service health check failed:', error);
      // Continue anyway - might just be a temporary issue
    }
    
    // Step 4: Force complete reload with new connection
    // Use timestamp as key to force React to create new img element
    const timestamp = Date.now();
    setCameraKey(timestamp);
    
    // Step 5: Reset refreshing state after reload
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleCameraError = () => {
    setCameraError(true);
    
    // Only auto-retry if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES && !isRetrying) {
      setIsRetrying(true);
      const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsRetrying(false);
        // Force reload
        setCameraKey(prev => prev + 1);
      }, delay);
    }
  };

  const handleCameraLoad = () => {
    setCameraError(false);
    setRetryCount(0);
    setIsRetrying(false);
    setConnectionStatus('connected');
    
    // Calculate FPS
    const now = Date.now();
    const frameTime = now - lastFrameTimeRef.current;
    if (frameTime > 0) {
      const currentFps = Math.round(1000 / frameTime);
      fpsRef.current.push(currentFps);
      if (fpsRef.current.length > 30) {
        fpsRef.current.shift();
      }
      const avgFps = Math.round(
        fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length
      );
      setFps(avgFps);
    }
    lastFrameTimeRef.current = now;
    
    // Clear any pending retries on successful load
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  // Poll tracking data periodically (WebSocket should handle this, but polling as backup)
  useEffect(() => {
    if (!trackingStarted) return;
    
    const setTracking = useTrackingStore.getState().setTracking;
    const interval = setInterval(async () => {
      try {
        const trackingData = await apiService.getTrackingData();
        if (trackingData) {
          setTracking(trackingData);
        }
      } catch (error) {
        // Silently fail - tracking data might not be available
      }
    }, 2000); // Poll every 2 seconds (WebSocket is primary)
    
    return () => clearInterval(interval);
  }, [trackingStarted]);

  const handleScreenshot = () => {
    if (!imgRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = imgRef.current.naturalWidth || imgRef.current.width;
    canvas.height = imgRef.current.naturalHeight || imgRef.current.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(imgRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dixi-screenshot-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  useEffect(() => {
    // Only test camera feed on mount or manual refresh (cameraKey change)
    // Don't create new connections on every render
    // Wait for tracking to start before trying to load video feed
    if (cameraKey === 0 && trackingStarted) {
      // Initial test - wait a bit for camera to initialize
      const testTimeout = setTimeout(() => {
        const testImg = new Image();
        testImg.onerror = () => setCameraError(true);
        testImg.onload = () => setCameraError(false);
        testImg.src = `${VISION_SERVICE_URL}/video_feed`;
      }, 1500); // Wait 1.5 seconds after tracking starts
      
      return () => clearTimeout(testTimeout);
    }
  }, [cameraKey, trackingStarted]);

  return (
    <div className="projection-canvas">
      {/* Camera controls */}
      <div className="camera-controls">
        <button
          className="camera-control-button"
          onClick={refreshCamera}
          title="Refresh camera feed"
          disabled={isRefreshing}
        >
          {isRefreshing ? '⏳' : '🔄'}
        </button>
        <button
          className="camera-control-button"
          onClick={() => setIsPaused(!isPaused)}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>
        <button
          className="camera-control-button"
          onClick={handleScreenshot}
          title="Take screenshot"
        >
          📸
        </button>
        {fps > 0 && (
          <div className="camera-fps-indicator">
            {fps} FPS
          </div>
        )}
        <div className={`camera-connection-status ${connectionStatus}`}>
          {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'connecting' ? '🟡' : '🔴'}
        </div>
      </div>

      {/* Camera feed background - full screen */}
      <div className="camera-background">
        {!cameraError && !isPaused ? (
          <>
            <img
              key={cameraKey}
              ref={imgRef}
              src={`${VISION_SERVICE_URL}/video_feed?refresh=${cameraKey}`}
              alt="Camera feed"
              className="camera-feed"
              onError={handleCameraError}
              onLoad={handleCameraLoad}
            />
            {/* Face tracking overlay */}
            <FaceOverlay />
          </>
        ) : isPaused ? (
          <div className="camera-placeholder">
            <div className="camera-error-message">
              <p>⏸️ Video Paused</p>
              <button
                className="camera-retry-button"
                onClick={() => setIsPaused(false)}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(0, 245, 255, 0.2)',
                  border: '1px solid rgba(0, 245, 255, 0.5)',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                ▶️ Resume
              </button>
            </div>
          </div>
        ) : (
          <div className="camera-placeholder">
            <div className="camera-error-message">
              <p>📹 Camera feed unavailable</p>
              <p>Vision service: {VISION_SERVICE_URL}</p>
              {!trackingStarted && (
                <p style={{ fontSize: '0.9rem', color: '#FFA500', marginTop: '0.5rem' }}>
                  Starting camera... (this may take a few seconds)
                </p>
              )}
              {trackingStarted && (
                <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '0.5rem' }}>
                  Camera started. If video doesn't appear, check:
                  <br />• Vision service is running on port 5001
                  <br />• Camera permissions are enabled
                  <br />• No other app is using the camera
                </p>
              )}
              {retryCount > 0 && retryCount < MAX_RETRIES && (
                <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '0.5rem' }}>
                  Retrying... ({retryCount}/{MAX_RETRIES})
                </p>
              )}
              {retryCount >= MAX_RETRIES && (
                <p style={{ fontSize: '0.9rem', color: '#FF006E', marginTop: '0.5rem' }}>
                  Max retries reached. Please check vision service.
                </p>
              )}
              <button
                className="camera-retry-button"
                onClick={refreshCamera}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(0, 245, 255, 0.2)',
                  border: '1px solid rgba(0, 245, 255, 0.5)',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                🔄 Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3D Canvas overlay - transparent, covering camera area */}
      <Canvas
        gl={{ alpha: true, antialias: true }}
        frameloop="demand"
        dpr={[1, 1.5]}
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
