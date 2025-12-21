import React, { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { useAIStore } from '../../store/aiStore';
import { useGestureStore } from '../../store/gestureStore';

export const AIResponseText: React.FC = () => {
  const textRef = useRef<any>(null);
  const { latestResponse } = useAIStore();
  const currentGesture = useGestureStore((state) => state.currentGesture);

  useEffect(() => {
    if (textRef.current && currentGesture && latestResponse) {
      // Position text near gesture location
      const x = (currentGesture.position.x - 0.5) * 10;
      const y = -(currentGesture.position.y - 0.5) * 10 + 1; // Offset above cursor
      textRef.current.position.set(x, y, 0.5);
    }
  }, [currentGesture, latestResponse]);

  if (!latestResponse || !latestResponse.response) return null;

  return (
    <Text
      ref={textRef}
      fontSize={0.3}
      color="#00f2ff"
      maxWidth={5}
      lineHeight={1.2}
      letterSpacing={0.02}
      textAlign="left"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#000000"
    >
      {latestResponse.response}
    </Text>
  );
};

