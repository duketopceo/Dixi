import React, { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GestureCursor } from './Scene/GestureCursor';
import { AIResponseText } from './Scene/AIResponseText';
import { AIResponseCards } from './Scene/AIResponseCards';
import { InteractiveObject } from './Scene/InteractiveObject';
import { ParticleBurst, ParticleRing } from './Scene/ParticleEffect';
import { GestureActionIndicator, GestureAction } from './Scene/GestureActionIndicator';
import { GroupVisualization } from './Scene/GroupVisualization';
import { useTrackingStore } from '../store/trackingStore';
import { useAIStore } from '../store/aiStore';
import { useSceneStore } from '../store/sceneStore';
import { createObject, gestureTo3DPosition, getRandomColor } from './Scene/ObjectLibrary';
import { raycastFromGesture, getObjectIdFromThreeObject } from '../utils/raycasting';
import { validateGesture, validateObjectExists, sanitizeTransform, MAX_OBJECTS } from '../utils/validation';
import { GestureSmoother } from '../utils/gestureSmoothing';
import logger from '../utils/logger';

const ProjectionScene: React.FC = () => {
  const { scene, camera, gl } = useThree();
  const currentTracking = useTrackingStore((state) => state.currentTracking);
  const currentGesture = currentTracking?.hands?.right?.detected 
    ? { type: currentTracking.hands.right.gesture, position: currentTracking.hands.right.position, confidence: currentTracking.hands.right.confidence, timestamp: currentTracking.hands.right.timestamp }
    : currentTracking?.hands?.left?.detected
    ? { type: currentTracking.hands.left.gesture, position: currentTracking.hands.left.position, confidence: currentTracking.hands.left.confidence, timestamp: currentTracking.hands.left.timestamp }
    : null;
  const objects = useSceneStore((state) => state.objects);
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId);
  const addObject = useSceneStore((state) => state.addObject);
  const removeObject = useSceneStore((state) => state.removeObject);
  const selectObject = useSceneStore((state) => state.selectObject);
  const addToSelection = useSceneStore((state) => state.addToSelection);
  const clearSelection = useSceneStore((state) => state.clearSelection);
  const updateObject = useSceneStore((state) => state.updateObject);
  const updateSelectedObjects = useSceneStore((state) => state.updateSelectedObjects);
  const duplicateObject = useSceneStore((state) => state.duplicateObject);
  const selectedObjectIds = useSceneStore((state) => state.selectedObjectIds);
  const isSelected = useSceneStore((state) => state.isSelected);
  const groups = useSceneStore((state) => state.groups);
  const createGroup = useSceneStore((state) => state.createGroup);
  const { clearResponse, sendQuery } = useAIStore();

  // Gesture state tracking
  const lastGestureTypeRef = useRef<string | null>(null);
  const gestureCooldownRef = useRef<{ [key: string]: number }>({});
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<THREE.Vector3 | null>(null);
  const lastSwipeDirectionRef = useRef<string | null>(null);
  const scaleStartRef = useRef<number | null>(null);
  
  // Gesture smoothing
  const positionSmootherRef = useRef<GestureSmoother>(new GestureSmoother(0.3));
  const rotationSmootherRef = useRef<GestureSmoother>(new GestureSmoother(0.25));
  const scaleSmootherRef = useRef<GestureSmoother>(new GestureSmoother(0.2));

  // Particle effects state
  const [particles, setParticles] = useState<Array<{
    id: number;
    position: [number, number, number];
    color: string;
    type: 'burst' | 'ring';
  }>>([]);
  
  // Gesture action indicator state
  const [currentAction, setCurrentAction] = useState<GestureAction>(null);
  const [actionPosition, setActionPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Set scene background to transparent
  useEffect(() => {
    scene.background = null;
  }, [scene]);
  
  // Expose performance metrics (for ControlPanel)
  useEffect(() => {
    const metrics = {
      objectCount: objects.length,
      particleCount: particles.length,
    };
    window.dispatchEvent(new CustomEvent('dixi:performance', { detail: metrics }));
  }, [objects.length, particles.length]);
  
  // Track frame time for performance monitoring
  const frameTimeRef = useRef<number>(16.67);
  const lastFrameTimeDispatchRef = useRef<number>(0);
  useFrame((state, delta) => {
    frameTimeRef.current = delta * 1000; // Convert to milliseconds
    // Dispatch frame time update (throttled to once per second)
    const now = Date.now();
    if (now - lastFrameTimeDispatchRef.current >= 1000) {
      window.dispatchEvent(new CustomEvent('dixi:frameTime', { detail: { frameTime: frameTimeRef.current } }));
      lastFrameTimeDispatchRef.current = now;
    }
  });

  // Get all raycastable objects from scene
  const getRaycastableObjects = (): THREE.Object3D[] => {
    const raycastableObjects: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.userData.type === 'sceneObject' && child.userData.id) {
        // Prefer mesh objects for raycasting (more accurate)
        if (child instanceof THREE.Mesh) {
          raycastableObjects.push(child);
        } else if (child instanceof THREE.Group) {
          // If it's a group, find the mesh child
          child.children.forEach((mesh) => {
            if (mesh instanceof THREE.Mesh) {
              raycastableObjects.push(mesh);
            }
          });
        }
      }
    });
    return raycastableObjects;
  };

  // Add particle effect
  const addParticle = (position: [number, number, number], color: string, type: 'burst' | 'ring' = 'burst') => {
    const id = Date.now() + Math.random();
    setParticles((prev) => [...prev, { id, position, color, type }]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 2000);
  };

  // Handle continuous gesture actions (drag, rotate, scale)
  useFrame(() => {
    if (!currentGesture) {
      isDraggingRef.current = false;
      dragStartPosRef.current = null;
      lastSwipeDirectionRef.current = null;
      scaleStartRef.current = null;
      // Reset smoothers when gesture ends
      positionSmootherRef.current.reset();
      rotationSmootherRef.current.reset();
      scaleSmootherRef.current.reset();
      return;
    }

    // Validate gesture before processing
    if (!validateGesture(currentGesture)) {
      return;
    }

    const gestureType = currentGesture.type;
    const selectedObject = objects.find((obj) => obj.id === selectedObjectId);
    
    // Validate selected object exists
    if (selectedObjectId && !validateObjectExists(selectedObjectId, objects)) {
      selectObject(null);
      logger.warn('Selected object no longer exists, clearing selection');
      return;
    }

    // Continuous drag with pinch gesture
    if (gestureType === 'pinch' && selectedObject) {
      try {
        const [x, y, z] = gestureTo3DPosition(
          currentGesture.position.x,
          currentGesture.position.y,
          selectedObject.position[2]
        );
        
        // Update action indicator
        setCurrentAction('drag');
        setActionPosition([x, y, z]);
        
        // Smooth position
        const rawPosition = new THREE.Vector3(x, y, z);
        const smoothedPosition = positionSmootherRef.current.smoothPosition(rawPosition);
        
        // Sanitize position
        const sanitized = sanitizeTransform([smoothedPosition.x, smoothedPosition.y, smoothedPosition.z]);
        if (sanitized.position) {
          if (!isDraggingRef.current) {
            isDraggingRef.current = true;
            addParticle(sanitized.position, '#FF006E', 'burst');
          }
          
          updateObject(selectedObjectId, {
            position: sanitized.position,
          });
        }
      } catch (error) {
        logger.error('Error during drag operation:', error);
        isDraggingRef.current = false;
        positionSmootherRef.current.reset();
        setCurrentAction(null);
      }
    } else if (gestureType !== 'pinch') {
      isDraggingRef.current = false;
      positionSmootherRef.current.reset();
      if (currentAction === 'drag') {
        setCurrentAction(null);
      }
    }

    // Continuous rotation with swipe gestures
    if (selectedObject && (gestureType.startsWith('swipe_') || gestureType.startsWith('point_'))) {
      try {
        const direction = gestureType.replace('swipe_', '').replace('point_', '');
        const rotationSpeed = 0.02;
        
        // Update action indicator
        setCurrentAction('rotate');
        setActionPosition(selectedObject.position);
        
        let deltaRotation: [number, number, number] = [0, 0, 0];
        
        if (direction === 'left') {
          deltaRotation = [0, rotationSpeed, 0];
        } else if (direction === 'right') {
          deltaRotation = [0, -rotationSpeed, 0];
        } else if (direction === 'up') {
          deltaRotation = [-rotationSpeed, 0, 0];
        } else if (direction === 'down') {
          deltaRotation = [rotationSpeed, 0, 0];
        }

        if (deltaRotation.some((r) => r !== 0)) {
          // Smooth rotation for Y-axis (most common rotation)
          const currentYRotation = selectedObject.rotation[1];
          const targetYRotation = currentYRotation + deltaRotation[1];
          const smoothedY = rotationSmootherRef.current.smoothRotation(targetYRotation);
          
          const newRotation: [number, number, number] = [
            selectedObject.rotation[0] + deltaRotation[0],
            smoothedY,
            selectedObject.rotation[2] + deltaRotation[2],
          ];
          
          const sanitized = sanitizeTransform(undefined, newRotation);
          if (sanitized.rotation) {
            updateObject(selectedObjectId, {
              rotation: sanitized.rotation,
            });
          }
        }
      } catch (error) {
        logger.error('Error during rotation operation:', error);
        setCurrentAction(null);
      }
    } else if (!gestureType.startsWith('swipe_') && !gestureType.startsWith('point_')) {
      if (currentAction === 'rotate') {
        setCurrentAction(null);
      }
    }

    // Continuous scaling with open palm / fist
    if (selectedObject && (gestureType === 'open_palm' || gestureType === 'fist')) {
      try {
        // Update action indicator
        setCurrentAction('scale');
        setActionPosition(selectedObject.position);
        
        const scaleDelta = gestureType === 'open_palm' ? 0.01 : -0.01;
        const currentScale = selectedObject.scale[0];
        const targetScale = Math.max(0.1, Math.min(2.0, currentScale + scaleDelta));
        
        // Smooth scale
        const smoothedScale = scaleSmootherRef.current.smoothScale(targetScale);
        const finalScale = Math.max(0.1, Math.min(2.0, smoothedScale));
        
        if (finalScale < 0.15 && gestureType === 'fist') {
          // Delete object if scaled too small
          removeObject(selectedObjectId);
          addParticle(selectedObject.position as [number, number, number], '#FF006E', 'burst');
          selectObject(null);
          scaleSmootherRef.current.reset();
          setCurrentAction(null);
        } else {
          const sanitized = sanitizeTransform(undefined, undefined, [finalScale, finalScale, finalScale]);
          if (sanitized.scale) {
            updateObject(selectedObjectId, {
              scale: sanitized.scale,
            });
          }
        }
      } catch (error) {
        logger.error('Error during scale operation:', error);
        scaleSmootherRef.current.reset();
        setCurrentAction(null);
      }
    } else if (gestureType !== 'open_palm' && gestureType !== 'fist') {
      scaleSmootherRef.current.reset();
      if (currentAction === 'scale') {
        setCurrentAction(null);
      }
    }
  });

  // Handle discrete gesture actions (selection, creation, etc.)
  useEffect(() => {
    if (!currentGesture) {
      lastGestureTypeRef.current = null;
      return;
    }

    // Validate gesture before processing
    if (!validateGesture(currentGesture)) {
      return;
    }

    const gestureType = currentGesture.type;
    const currentTime = Date.now();
    const COOLDOWN_MS = 500; // Reduced cooldown for better responsiveness

    // Only trigger discrete actions if gesture type changed and cooldown expired
    if (
      gestureType !== lastGestureTypeRef.current &&
      (!gestureCooldownRef.current[gestureType] ||
        currentTime - gestureCooldownRef.current[gestureType] > COOLDOWN_MS)
    ) {
      gestureCooldownRef.current[gestureType] = currentTime;
      lastGestureTypeRef.current = gestureType;

      switch (gestureType) {
        case 'point': {
          try {
            // Get raycastable objects from scene
            const sceneObjects = getRaycastableObjects();
            
            // Select object via raycasting
            const result = raycastFromGesture(
              currentGesture.position.x,
              currentGesture.position.y,
              camera,
              sceneObjects
            );

            if (result.hit && result.object) {
              const objectId = getObjectIdFromThreeObject(result.object);
            if (objectId && validateObjectExists(objectId, objects)) {
              selectObject(objectId);
              const particlePos = result.point 
                ? [result.point.x, result.point.y, result.point.z] as [number, number, number]
                : gestureTo3DPosition(currentGesture.position.x, currentGesture.position.y);
              addParticle(particlePos, '#00F5FF', 'ring');
              
              // Show select action indicator
              setCurrentAction('select');
              setActionPosition(particlePos);
            }
            } else {
              // No object hit - query AI about location (original behavior)
              const x = currentGesture.position.x.toFixed(2);
              const y = currentGesture.position.y.toFixed(2);
              const query = `What might the user be pointing at coordinates [${x}, ${y}]?`;
              sendQuery(query, {
                gesture: {
                  type: 'point',
                  coordinates: {
                    x: currentGesture.position.x,
                    y: currentGesture.position.y,
                  },
                },
              }).catch((error) => {
                logger.error('Failed to send point gesture query:', error);
              });
            }
          } catch (error) {
            logger.error('Error during raycast selection:', error);
            // Fallback: just use gesture position
            const [x, y, z] = gestureTo3DPosition(
              currentGesture.position.x,
              currentGesture.position.y
            );
            addParticle([x, y, z], '#00F5FF', 'burst');
          }
          break;
        }

        case 'pinch': {
          // Create object if none selected, otherwise drag is handled in useFrame
          if (!selectedObjectId) {
            try {
              // Check object limit
              if (objects.length >= MAX_OBJECTS) {
                logger.warn(`Cannot create object: limit of ${MAX_OBJECTS} reached`);
                // Show user feedback via particle effect
                const [x, y, z] = gestureTo3DPosition(
                  currentGesture.position.x,
                  currentGesture.position.y,
                  -2
                );
                addParticle([x, y, z], '#FF006E', 'burst');
                break;
              }
              
              const [x, y, z] = gestureTo3DPosition(
                currentGesture.position.x,
                currentGesture.position.y,
                -2
              );
              const sanitized = sanitizeTransform([x, y, z]);
              if (sanitized.position) {
                const newObject = createObject('box', sanitized.position, getRandomColor());
                const result = addObject(newObject);
                if (result.success) {
                  addParticle(sanitized.position, newObject.color, 'burst');
                  
                  // Show create action indicator
                  setCurrentAction('create');
                  setActionPosition(sanitized.position);
                } else {
                  logger.warn('Failed to add object:', result.error);
                  addParticle(sanitized.position, '#FF006E', 'burst');
                }
              }
            } catch (error) {
              logger.error('Error creating object:', error);
            }
          }
          break;
        }

        case 'wave': {
          // Clear selection (both single and multi-select) and AI response
          clearSelection();
          clearResponse();
          addParticle(
            gestureTo3DPosition(currentGesture.position.x, currentGesture.position.y),
            '#00F5FF',
            'burst'
          );
          break;
        }

        case 'thumbs_up': {
          // Save scene (will be handled by UI button, but gesture can trigger it)
          console.log('Thumbs up: Save scene gesture detected');
          break;
        }

        case 'thumbs_down': {
          // Load scene (will be handled by UI button)
          console.log('Thumbs down: Load scene gesture detected');
          break;
        }

        case 'double_tap': {
          // Duplicate selected object
          if (selectedObjectId) {
            try {
              const result = duplicateObject(selectedObjectId, [0.5, 0.5, 0]);
              if (result.success && result.duplicatedId) {
                const duplicatedObj = objects.find((obj) => obj.id === result.duplicatedId);
                if (duplicatedObj) {
                  addParticle(duplicatedObj.position as [number, number, number], duplicatedObj.color, 'burst');
                  setCurrentAction('create');
                  setActionPosition(duplicatedObj.position as [number, number, number]);
                }
              } else {
                logger.warn('Failed to duplicate object:', result.error);
              }
            } catch (error) {
              logger.error('Error duplicating object:', error);
            }
          }
          break;
        }

        default:
          break;
      }
    }
  }, [currentGesture?.type, camera, selectedObjectId, addObject, selectObject, removeObject, clearResponse, sendQuery]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      {/* Render all scene objects */}
      {objects.map((object) => (
        <InteractiveObject key={object.id} object={object} />
      ))}
      
      {/* Render group visualizations */}
      {groups.map((group) => (
        <GroupVisualization key={group.id} group={group} />
      ))}
      
      {/* Particle effects */}
      {particles.map((particle) =>
        particle.type === 'burst' ? (
          <ParticleBurst
            key={particle.id}
            position={particle.position}
            color={particle.color}
          />
        ) : (
          <ParticleRing
            key={particle.id}
            position={particle.position}
            color={particle.color}
          />
        )
      )}
      
      <GestureCursor />
      <AIResponseText />
      <AIResponseCards />
      
      {/* Gesture action indicator */}
      {currentAction && (
        <GestureActionIndicator
          action={currentAction}
          position={actionPosition}
          visible={!!currentGesture}
        />
      )}
    </>
  );
};

export default ProjectionScene;
