import React, { useEffect, useRef } from 'react';
import { useThreeScene } from './hooks/useThreeScene';
import { useAnimationFrame } from './hooks/useAnimationFrame';
import { useInputEvents } from './hooks/useInputEvents';

const ThreeBackground = () => {
  const canvasRef = useRef(null);
  const { scene, initScene, updateScene } = useThreeScene();
  
  useInputEvents();
  
  useAnimationFrame((deltaTime) => {
    if (scene) {
      updateScene(deltaTime);
    }
  });

  useEffect(() => {
    console.log('ThreeBackground mounted, canvasRef:', canvasRef.current);
    if (canvasRef.current) {
      console.log('Initializing scene...');
      initScene(canvasRef.current);
    }

    return () => {
      console.log('ThreeBackground unmounting...');
      if (scene) {
        scene.dispose();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        opacity: 0.25,
        pointerEvents: 'none',
        background: 'rgba(0,0,255,0.1)'
      }}
    />
  );
};

export default ThreeBackground; 