import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import eventBus from '../utils/eventBus';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { vertexShader, fragmentShader } from '../utils/shaders';

// 自定义对比度着色器
const ContrastShader = {
  uniforms: {
    "tDiffuse": { value: null },
    "contrast": { value: 1 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;
      // 应用对比度
      color = (color - 0.5) * contrast + 0.5;
      gl_FragColor = vec4(color, texel.a);
    }
  `
};

// 这里移除了原有的vertexShader和fragmentShader定义
// 通过import从shaders.js导入

export const useThreeScene = () => {
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [uniforms, setUniforms] = useState(null);
  const [isCustomBackground, setIsCustomBackground] = useState(false);
  
  // 保存原始材质和网格引用
  const originalMaterialRef = useRef(null);
  const meshRef = useRef(null);
  const textureRef = useRef(null);
  // 添加后处理引用
  const composerRef = useRef(null);
  const contrastPassRef = useRef(null);
  // 添加着色器材质引用
  const shaderMaterialRef = useRef(null);

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

  // 添加着色器更新事件监听
  useEffect(() => {
    if (!meshRef.current || !shaderMaterialRef.current) return;
    
    const handleShaderUpdate = (data) => {
      try {
        console.log('Updating shaders:', data);
        
        // 检查着色器代码是否都为空
        const isVertexEmpty = !data.vertexShader || !data.vertexShader.trim();
        const isFragmentEmpty = !data.fragmentShader || !data.fragmentShader.trim();
        const isShaderEmpty = isVertexEmpty && isFragmentEmpty;
        
        if (isShaderEmpty) {
          console.log('Empty shaders detected, hiding shader effects');
          
          // 如果着色器为空，隐藏着色器平面
          if (meshRef.current) {
            meshRef.current.visible = false;
          }
          
          // 立即渲染一次
          if (composerRef.current) {
            composerRef.current.render();
          } else if (renderer && camera && scene) {
            renderer.render(scene, camera);
          }
          
          return;
        }
        
        // 确保着色器平面是可见的
        if (meshRef.current) {
          meshRef.current.visible = true;
        }
        
        // 创建新的着色器材质
        const newMaterial = new THREE.ShaderMaterial({
          uniforms: shaderMaterialRef.current.uniforms,
          vertexShader: data.vertexShader,
          fragmentShader: data.fragmentShader,
          transparent: true
        });
        
        // 更新网格材质
        meshRef.current.material = newMaterial;
        
        // 更新引用
        shaderMaterialRef.current = newMaterial;
        originalMaterialRef.current = newMaterial;
        
        // 如果处于图片背景模式，切换回默认背景
        if (isCustomBackground) {
          setIsCustomBackground(false);
        }
        
        // 立即渲染一次
        if (composerRef.current) {
          composerRef.current.render();
        } else if (renderer && camera && scene) {
          renderer.render(scene, camera);
        }
      } catch (error) {
        console.error('Error updating shaders:', error);
        // 如果更新失败，可以考虑重置为原始着色器
      }
    };
    
    eventBus.on('shaderUpdate', handleShaderUpdate);
    return () => eventBus.off('shaderUpdate', handleShaderUpdate);
  }, [scene, camera, renderer, isCustomBackground]);

  // 添加背景切换事件监听
  useEffect(() => {
    if (!scene || !meshRef.current || !originalMaterialRef.current) return;

    const handleBackgroundChange = (data) => {
      if (data.isCustomBackground) {
        // 切换到图片背景
        setImageBackground(data.path);
      } else {
        // 恢复默认着色器背景
        resetToDefaultBackground();
      }
    };

    eventBus.on('backgroundChange', handleBackgroundChange);
    return () => eventBus.off('backgroundChange', handleBackgroundChange);
  }, [scene]);

  // 设置图片背景
  const setImageBackground = async (imagePath) => {
    if (!scene || !meshRef.current) return;

    try {
      console.log('Setting image background:', imagePath);
      setIsCustomBackground(true);

      // 通过Electron API读取图片文件
      const fileData = await window.electron.readBinaryFile(imagePath);
      const blob = new Blob([fileData], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);

      // 创建纹理加载器
      const loader = new THREE.TextureLoader();
      
      // 加载图片纹理
      loader.load(
        imageUrl,
        (texture) => {
          // 清理之前的纹理
          if (textureRef.current) {
            textureRef.current.dispose();
          }
          
          // 保存新纹理引用以便后续清理
          textureRef.current = texture;

          // 创建新材质 - 使用完全不透明度
          const imageMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1.0 // 完全不透明
          });

          // 应用新材质
          meshRef.current.material = imageMaterial;
          
          // 设置适当的缩放比例以保持图片比例
          const imageAspect = texture.image.width / texture.image.height;
          const screenAspect = window.innerWidth / window.innerHeight;
          
          if (imageAspect > screenAspect) {
            // 图片更宽，填满宽度
            meshRef.current.scale.set(1, screenAspect / imageAspect, 1);
          } else {
            // 图片更高，填满高度
            meshRef.current.scale.set(imageAspect / screenAspect, 1, 1);
          }

          // 应用对比度效果
          if (composerRef.current && contrastPassRef.current) {
            // 调整对比度
            contrastPassRef.current.uniforms.contrast.value = 1;
            // 立即渲染一次
            composerRef.current.render();
          } else if (renderer && camera) {
            // 如果没有后处理，直接渲染
            renderer.render(scene, camera);
          }
          
          // 清理URL
          URL.revokeObjectURL(imageUrl);
        },
        undefined,
        (error) => {
          console.error('Error loading image texture:', error);
          resetToDefaultBackground();
        }
      );
    } catch (error) {
      console.error('Error setting image background:', error);
      resetToDefaultBackground();
    }
  };

  // 恢复默认背景
  const resetToDefaultBackground = () => {
    if (!meshRef.current || !originalMaterialRef.current) return;
    
    console.log('Resetting to default background');
    setIsCustomBackground(false);
    
    // 恢复原始材质
    meshRef.current.material = originalMaterialRef.current;
    
    // 重置缩放
    meshRef.current.scale.set(1, 1, 1);
    
    // 重置对比度效果
    if (contrastPassRef.current) {
      contrastPassRef.current.uniforms.contrast.value = 1.0; // 重置为正常对比度
    }
    
    // 立即渲染一次
    if (composerRef.current) {
      composerRef.current.render();
    } else if (renderer && camera && scene) {
      renderer.render(scene, camera);
    }
  };

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
      
      // 保存原始材质和网格引用
      originalMaterialRef.current = material;
      meshRef.current = mesh;
      shaderMaterialRef.current = material;
      
      // 保存原始着色器代码到eventBus
      eventBus.saveOriginalShaders(vertexShader, fragmentShader);

      setScene(newScene);
      setCamera(newCamera);
      setRenderer(newRenderer);
      setUniforms(newUniforms);

      // 设置后处理效果
      const composer = new EffectComposer(newRenderer);
      const renderPass = new RenderPass(newScene, newCamera);
      composer.addPass(renderPass);

      // 添加对比度效果
      const contrastPass = new ShaderPass(ContrastShader);
      contrastPass.uniforms.contrast.value = 1.2; // 增加对比度
      composer.addPass(contrastPass);

      // 保存引用
      composerRef.current = composer;
      contrastPassRef.current = contrastPass;

      const handleResize = () => {
        if (newRenderer && newCamera) {
          const width = window.innerWidth;
          const height = window.innerHeight;
          console.log('Resizing to:', width, height);
          newRenderer.setSize(width, height, false);
          newUniforms.u_resolution.value.set(width, height);
          
          // 更新后处理效果的大小
          if (composerRef.current) {
            composerRef.current.setSize(width, height);
          }
          
          // 如果是自定义背景，需要更新缩放
          if (isCustomBackground && textureRef.current && meshRef.current) {
            const imageAspect = textureRef.current.image.width / textureRef.current.image.height;
            const screenAspect = width / height;
            
            if (imageAspect > screenAspect) {
              meshRef.current.scale.set(1, screenAspect / imageAspect, 1);
            } else {
              meshRef.current.scale.set(imageAspect / screenAspect, 1, 1);
            }
          }
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
        
        // 清理后处理效果
        if (composerRef.current) {
          composerRef.current.dispose();
          composerRef.current = null;
        }
        
        if (contrastPassRef.current) {
          contrastPassRef.current = null;
        }
        
        newRenderer.dispose();
        if (textureRef.current) {
          textureRef.current.dispose();
        }
      };
    } catch (error) {
      console.error('Error initializing Three.js scene:', error);
    }
  }, [isCustomBackground]);

  const updateScene = useCallback((deltaTime) => {
    if (scene && camera && renderer && uniforms) {
      try {
        // 只在非图片背景模式下更新时间
        if (!isCustomBackground) {
          uniforms.u_time.value += deltaTime * 0.5;
        }
        
        // 更新输入强度的自然衰减
        uniforms.u_intensity.value = eventBus.getInputIntensity();
        
        // 使用后处理效果渲染
        if (composerRef.current) {
          composerRef.current.render();
        } else {
          // 如果没有后处理，使用普通渲染
          renderer.render(scene, camera);
        }
      } catch (error) {
        console.error('Error in render loop:', error);
      }
    }
  }, [scene, camera, renderer, uniforms, isCustomBackground]);

  // 提供背景切换API
  const toggleBackground = useCallback((imagePath) => {
    return eventBus.toggleBackground(imagePath);
  }, []);
  
  // 提供着色器更新API
  const updateShaders = useCallback((vertexShader, fragmentShader) => {
    eventBus.updateShaders(vertexShader, fragmentShader);
  }, []);
  
  // 提供着色器重置API
  const resetShaders = useCallback(() => {
    eventBus.resetShaders();
  }, []);

  return {
    scene,
    camera,
    renderer,
    uniforms,
    initScene,
    updateScene,
    toggleBackground,
    updateShaders,
    resetShaders,
    isCustomBackground
  };
}; 