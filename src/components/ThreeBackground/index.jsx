import React, { useEffect, useRef, useState } from 'react';
import { useThreeScene } from './hooks/useThreeScene';
import { useAnimationFrame } from './hooks/useAnimationFrame';
import { useInputEvents } from './hooks/useInputEvents';
import eventBus from './utils/eventBus';

const ThreeBackground = () => {
  const canvasRef = useRef(null);
  const { scene, initScene, updateScene, isCustomBackground } = useThreeScene();
  const [backgroundInfo, setBackgroundInfo] = useState({ path: null, isCustom: false });
  
  useInputEvents();
  
  useAnimationFrame((deltaTime) => {
    if (scene) {
      updateScene(deltaTime);
    }
  });

  // 监听背景变化事件
  useEffect(() => {
    const handleBackgroundChange = (data) => {
      console.log('Background change detected:', data);
      setBackgroundInfo({
        path: data.path,
        isCustom: data.isCustomBackground
      });
    };
    
    eventBus.on('backgroundChange', handleBackgroundChange);
    return () => {
      eventBus.off('backgroundChange', handleBackgroundChange);
    };
  }, []);

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
        background: isCustomBackground ? 'transparent' : 'rgba(0,0,255,0.1)'
      }}
    />
  );
};

export default ThreeBackground; 