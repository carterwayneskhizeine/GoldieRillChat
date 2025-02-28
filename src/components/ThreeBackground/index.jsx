import React, { useEffect, useRef, useState } from 'react';
import { useThreeScene } from './hooks/useThreeScene';
import { useAnimationFrame } from './hooks/useAnimationFrame';
import { useInputEvents } from './hooks/useInputEvents';
import eventBus from './utils/eventBus';

const ThreeBackground = () => {
  const canvasRef = useRef(null);
  const { scene, initScene, updateScene, isCustomBackground } = useThreeScene();
  const [backgroundInfo, setBackgroundInfo] = useState({ 
    path: null, 
    isCustom: false,
    theme: null
  });
  
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
        isCustom: data.isCustomBackground,
        theme: data.theme
      });
    };
    
    eventBus.on('backgroundChange', handleBackgroundChange);
    return () => {
      eventBus.off('backgroundChange', handleBackgroundChange);
    };
  }, []);

  // 组件加载时初始化ThreeJS场景
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

  // 根据当前主题确定显示状态
  const isHidden = backgroundInfo.isCustom && 
                   backgroundInfo.theme === 'bg-theme';

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
        opacity: isHidden ? 1 : 0.2, // 当使用图片背景时降低不透明度
        pointerEvents: 'none',
        background: isCustomBackground ? 'transparent' : 'rgba(0,0,0,0)',
        transition: 'opacity 0.3s ease'
      }}
    />
  );
};

export default ThreeBackground; 