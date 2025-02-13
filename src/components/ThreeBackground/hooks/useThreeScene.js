import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import eventBus from '../utils/eventBus';

// 直接在代码中定义着色器
const vertexShader = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_intensity;

float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    
    float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), 
        u.y);
    return res * res;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // 添加垂直移动
    float moveSpeed = 0.2; // 基础移动速度
    float moveAmount = 1.5; // 移动幅度
    float verticalOffset = u_time * moveSpeed;
    
    // 添加波浪效果
    float waveFreq = 2.0; // 波浪频率
    float waveAmp = 0.1; // 波浪幅度
    float horizontalWave = sin(uv.x * waveFreq * 3.14159 + u_time) * waveAmp;
    
    // 将垂直移动和波浪效果结合
    vec2 distortedUV = vec2(
        uv.x,
        mod(uv.y + verticalOffset + horizontalWave, 1.0)
    );
    
    // 降低基础噪声缩放，使图案更大更柔和
    float noiseScale = 2.0 + u_intensity * 1.5;
    float n = noise(distortedUV * noiseScale);
    
    // 使用更柔和的基础颜色
    vec3 color1 = vec3(0.4, 0.6, 0.9); // 柔和的蓝色
    vec3 color2 = vec3(0.2, 0.3, 0.7); // 深蓝色
    vec3 activeColor = vec3(0.6, 0.8, 1.0); // 活跃状态的颜色
    
    // 添加垂直渐变
    float gradientFactor = smoothstep(0.0, 1.0, distortedUV.y);
    vec3 baseColor = mix(color2, color1, gradientFactor);
    
    // 减小颜色混合强度
    vec3 finalColor = mix(
        mix(baseColor, color2, n),
        activeColor,
        u_intensity * 0.3
    );
    
    // 减小透明度变化幅度，添加垂直变化
    float alpha = 0.7 + 
                 0.15 * sin(u_time + distortedUV.y * 3.0) + 
                 u_intensity * 0.15;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

export const useThreeScene = () => {
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [uniforms, setUniforms] = useState(null);

  // 添加输入事件监听
  useEffect(() => {
    if (!uniforms) return;

    const handleInput = (data) => {
      if (uniforms) {
        uniforms.u_intensity.value = data.intensity;
      }
    };

    eventBus.on('input', handleInput);
    return () => eventBus.off('input', handleInput);
  }, [uniforms]);

  const initScene = useCallback((container) => {
    console.log('Initializing Three.js scene with container:', container);
    if (!container) {
      console.error('No container provided for Three.js scene');
      return;
    }

    try {
      const newScene = new THREE.Scene();
      console.log('Scene created:', newScene);
      
      const newCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      newCamera.position.z = 1;
      console.log('Camera created:', newCamera);

      const newRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas: container
      });
      console.log('Renderer created:', newRenderer);
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      newRenderer.setPixelRatio(window.devicePixelRatio);
      newRenderer.setSize(width, height, false);
      console.log('Renderer size set to:', width, height);
      
      const newUniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(width, height) },
        u_mouse: { value: new THREE.Vector2() },
        u_intensity: { value: 0.0 } // 添加输入强度uniform
      };
      console.log('Uniforms created:', newUniforms);

      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        uniforms: newUniforms,
        vertexShader,
        fragmentShader,
        transparent: true
      });
      console.log('Geometry and material created');

      const mesh = new THREE.Mesh(geometry, material);
      newScene.add(mesh);
      console.log('Mesh added to scene');

      setScene(newScene);
      setCamera(newCamera);
      setRenderer(newRenderer);
      setUniforms(newUniforms);

      const handleResize = () => {
        if (newRenderer && newCamera) {
          const width = window.innerWidth;
          const height = window.innerHeight;
          console.log('Resizing to:', width, height);
          newRenderer.setSize(width, height, false);
          newUniforms.u_resolution.value.set(width, height);
        }
      };

      const handleMouseMove = (event) => {
        const x = event.clientX / window.innerWidth;
        const y = 1.0 - event.clientY / window.innerHeight;
        newUniforms.u_mouse.value.set(x, y);
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('mousemove', handleMouseMove);
      handleResize();

      newRenderer.render(newScene, newCamera);
      console.log('Initial render completed');

      return () => {
        console.log('Cleaning up Three.js scene');
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        newRenderer.dispose();
      };
    } catch (error) {
      console.error('Error initializing Three.js scene:', error);
    }
  }, []);

  const updateScene = useCallback((deltaTime) => {
    if (scene && camera && renderer && uniforms) {
      try {
        uniforms.u_time.value += deltaTime * 0.5;
        // 更新输入强度的自然衰减
        uniforms.u_intensity.value = eventBus.getInputIntensity();
        renderer.render(scene, camera);
      } catch (error) {
        console.error('Error in render loop:', error);
      }
    }
  }, [scene, camera, renderer, uniforms]);

  return {
    scene,
    camera,
    renderer,
    uniforms,
    initScene,
    updateScene
  };
}; 