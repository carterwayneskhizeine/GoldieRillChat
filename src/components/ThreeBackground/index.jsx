import React, { useEffect, useRef, useState } from 'react';
import { useThreeScene } from './hooks/useThreeScene';
import { useAnimationFrame } from './hooks/useAnimationFrame';
import { useInputEvents } from './hooks/useInputEvents';
import eventBus from './utils/eventBus';

const ThreeBackground = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const { scene, initScene, updateScene, isCustomBackground } = useThreeScene();
  const [backgroundInfo, setBackgroundInfo] = useState({ 
    path: null, 
    isCustom: false,
    theme: null,
    isVideo: false
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
        theme: data.theme,
        isVideo: data.isVideo || false
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

  // 视频背景加载和控制
  useEffect(() => {
    if (backgroundInfo.isCustom && backgroundInfo.isVideo && videoRef.current) {
      console.log('Loading video background:', backgroundInfo.path);
      videoRef.current.src = `local-file://${backgroundInfo.path}`;
      videoRef.current.load();
      videoRef.current.play().catch(err => {
        console.error('Error autoplay video:', err);
      });
    } else if (videoRef.current) {
      // 停止并清空视频源
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, [backgroundInfo.isCustom, backgroundInfo.isVideo, backgroundInfo.path]);

  // 图片背景加载
  useEffect(() => {
    if (backgroundInfo.isCustom && !backgroundInfo.isVideo && backgroundInfo.path && imgRef.current) {
      console.log('Loading image background:', backgroundInfo.path);
      imgRef.current.src = `local-file://${backgroundInfo.path}`;
    }
  }, [backgroundInfo.isCustom, backgroundInfo.isVideo, backgroundInfo.path]);

  // 根据当前主题确定显示状态
  const isHidden = backgroundInfo.isCustom && 
                   backgroundInfo.theme === 'bg-theme';
  
  // 使用图片或视频背景时隐藏Canvas
  const showCanvas = !backgroundInfo.isCustom;
  
  // 判断是否显示图片背景
  const showImageBackground = backgroundInfo.isCustom && !backgroundInfo.isVideo;
  
  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          opacity: isHidden ? 0 : 1, // 将0.2改为1，确保完全可见
          pointerEvents: 'none',
          background: isCustomBackground ? 'transparent' : 'rgba(0,0,0,0)',
          transition: 'opacity 0.3s ease',
          display: showCanvas ? 'block' : 'none'
        }}
      />
      
      {/* 图片背景 */}
      {showImageBackground && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 0,
            opacity: backgroundInfo.isCustom ? 1 : 0,
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease',
            overflow: 'hidden',
            backgroundColor: 'rgba(0,0,0,0.1)' // 添加一个轻微的背景色
          }}
        >
          <img
            ref={imgRef}
            src={backgroundInfo.path ? `local-file://${backgroundInfo.path}` : ''}
            alt="背景"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover', // 固定使用铺满模式
              objectPosition: 'center center',
              display: 'block'
            }}
          />
        </div>
      )}
      
      {/* 视频背景 */}
      {backgroundInfo.isVideo && (
        <video
          ref={videoRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: 0,
            opacity: backgroundInfo.isCustom ? 1 : 0,
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease'
          }}
          autoPlay
          loop
          muted
          playsInline
        />
      )}
    </>
  );
};

export default ThreeBackground; 