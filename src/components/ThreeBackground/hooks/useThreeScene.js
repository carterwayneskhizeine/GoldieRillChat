import { useState, useCallback } from 'react';
import * as THREE from 'three';

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
    float n = noise(uv * 3.0 + u_time * 0.5);
    vec3 color1 = vec3(0.5, 0.8, 1.0);
    vec3 color2 = vec3(0.2, 0.4, 0.8);
    vec3 finalColor = mix(color1, color2, n);
    float alpha = 0.8 + 0.2 * sin(u_time + uv.x * 5.0);
    gl_FragColor = vec4(finalColor, alpha);
}
`;

export const useThreeScene = () => {
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [uniforms, setUniforms] = useState(null);

  const initScene = useCallback((container) => {
    console.log('Initializing Three.js scene with container:', container);
    if (!container) {
      console.error('No container provided for Three.js scene');
      return;
    }

    try {
      // 创建场景
      const newScene = new THREE.Scene();
      console.log('Scene created:', newScene);
      
      // 创建相机
      const newCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      newCamera.position.z = 1;
      console.log('Camera created:', newCamera);

      // 创建渲染器
      const newRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas: container
      });
      console.log('Renderer created:', newRenderer);
      
      // 设置像素比和尺寸
      newRenderer.setPixelRatio(window.devicePixelRatio);
      const width = window.innerWidth;
      const height = window.innerHeight;
      newRenderer.setSize(width, height, false);
      console.log('Renderer size set to:', width, height);
      
      // 创建着色器材质
      const newUniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(width, height) },
        u_mouse: { value: new THREE.Vector2() }
      };
      console.log('Uniforms created:', newUniforms);

      // 创建平面几何体
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

      // 更新状态
      setScene(newScene);
      setCamera(newCamera);
      setRenderer(newRenderer);
      setUniforms(newUniforms);

      // 添加窗口大小变化监听
      const handleResize = () => {
        if (newRenderer && newCamera) {
          const width = window.innerWidth;
          const height = window.innerHeight;
          console.log('Resizing to:', width, height);
          newRenderer.setSize(width, height, false);
          newUniforms.u_resolution.value.set(width, height);
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      // 添加鼠标移动监听
      const handleMouseMove = (event) => {
        const x = event.clientX / window.innerWidth;
        const y = 1.0 - event.clientY / window.innerHeight;
        newUniforms.u_mouse.value.set(x, y);
      };

      window.addEventListener('mousemove', handleMouseMove);

      // 立即渲染一帧
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