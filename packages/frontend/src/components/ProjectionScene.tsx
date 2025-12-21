import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { GestureCursor } from './GestureCursor';
import { AIResponseText } from './AIResponseText';
import { useGestureStore } from '../../store/gestureStore';
import { useAIStore } from '../../store/aiStore';

const ProjectionScene: React.FC = () => {
  const { scene } = useThree();
  const currentGesture = useGestureStore((state) => state.currentGesture);
  const lastGestureTypeRef = useRef<string | null>(null);
  const gestureCooldownRef = useRef<{ [key: string]: number }>({});
  const { clearResponse, sendQuery } = useAIStore();

  // Set scene background to transparent
  useEffect(() => {
    scene.background = null;
  }, [scene]);

  // Handle gesture actions
  useEffect(() => {
    if (!currentGesture) {
      lastGestureTypeRef.current = null;
      return;
    }

    const gestureType = currentGesture.type;
    const currentTime = Date.now();
    const COOLDOWN_MS = 2000; // 2 second cooldown per gesture type

    // Only trigger if gesture type changed and cooldown expired
    if (
      gestureType !== lastGestureTypeRef.current &&
      (!gestureCooldownRef.current[gestureType] || 
       currentTime - gestureCooldownRef.current[gestureType] > COOLDOWN_MS)
    ) {
      gestureCooldownRef.current[gestureType] = currentTime;
      lastGestureTypeRef.current = gestureType;

      switch (gestureType) {
        case 'wave':
          // Clear AI response
          clearResponse();
          console.log('Wave gesture: Cleared AI response');
          break;

        case 'pinch':
          // Log position for future zoom/selection
          console.log('Pinch gesture detected at', {
            x: currentGesture.position.x,
            y: currentGesture.position.y,
            confidence: currentGesture.confidence
          });
          break;

        case 'point':
          // Auto-query AI about pointed location
          const x = currentGesture.position.x.toFixed(2);
          const y = currentGesture.position.y.toFixed(2);
          const query = `What might the user be pointing at coordinates [${x}, ${y}]?`;
          sendQuery(query, {
            gesture: {
              type: 'point',
              coordinates: {
                x: currentGesture.position.x,
                y: currentGesture.position.y
              }
            }
          }).catch((error) => {
            console.error('Failed to send point gesture query:', error);
          });
          break;

        default:
          break;
      }
    }
  }, [currentGesture?.type, clearResponse, sendQuery]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <GestureCursor />
      <AIResponseText />
    </>
  );
};

export default ProjectionScene;
