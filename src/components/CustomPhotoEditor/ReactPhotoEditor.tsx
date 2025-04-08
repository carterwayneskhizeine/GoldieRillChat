import React, { useEffect, useState, useRef } from 'react';
import { usePhotoEditor } from './usePhotoEditor';
import { ReactPhotoEditorProps, Resolution } from './interface';
import './styles.css';

const defaultLabels = {
  close: '关闭',
  save: '保存',
  rotate: '旋转',
  brightness: '亮度',
  contrast: '对比度',
  saturate: '饱和度',
  grayscale: '灰度',
  reset: '重置',
  flipHorizontal: '水平翻转',
  flipVertical: '垂直翻转',
  zoomIn: '放大',
  zoomOut: '缩小',
  resolution: '分辨率',
  aspectRatio: '宽高比',
  apply: '应用',
  fitHeight: '适应高度',
  cancel: '取消',
  editPicture: '编辑图片',
  color: '颜色调整'
};

const defaultResolutionOptions: Resolution[] = [
  // 按宽度排序的分辨率预设
  { width: 512, height: 288 },
  { width: 512, height: 512 },
  { width: 768, height: 320 },
  { width: 768, height: 512 },
  { width: 1024, height: 576 },
  { width: 1024, height: 768 },
  { width: 1152, height: 768 },
  { width: 1280, height: 720 },
  { width: 1600, height: 1200 },
  { width: 1920, height: 800 },
  { width: 1920, height: 1080 },
  { width: 2048, height: 858 },
  { width: 2560, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3000, height: 2000 },
  { width: 3440, height: 1440 },
  { width: 3840, height: 2160 }
];

const defaultAspectRatioOptions: string[] = [
  '16:9',
  '16:10',
  '16:11',
  '4:3',
  '2:1',
  '21:9',
  '3:2',
  '19.5:9',
  '2.39:1',
  '2.76:1',
  '12:5',
  '4:1',
  '9:16',
  '1:1'
];

// 添加一个检测图片尺寸的辅助函数
const getImageDimensions = (fileUrl: string): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = () => {
      // 加载失败时返回默认尺寸
      resolve({ width: 512, height: 512 });
    };
    img.src = fileUrl;
  });
};

// 更新范围进度的辅助函数
const updateRangeProgress = (rangeElement: HTMLInputElement | null) => {
  if (!rangeElement) return;
  
  const min = Number(rangeElement.min) || 0;
  const max = Number(rangeElement.max) || 100;
  const val = Number(rangeElement.value) || 0;
  
  const percentage = ((val - min) / (max - min)) * 100;
  rangeElement.style.setProperty('--range-shdw', `${percentage}%`);
};

export const ReactPhotoEditor: React.FC<ReactPhotoEditorProps> = ({
  file,
  allowColorEditing = true,
  allowRotate = true,
  allowFlip = true,
  allowZoom = true,
  allowResolutionSettings = true,
  allowAspectRatioSettings = true,
  downloadOnSave = false,
  open = false,
  onClose,
  onSaveImage,
  modalHeight = '100vh',
  modalWidth = '100vw',
  canvasWidth = 'auto',
  canvasHeight = 'auto',
  maxCanvasHeight = '70vh',
  maxCanvasWidth = '90vw',
  labels = defaultLabels,
  resolution = { width: 512, height: 512 },
  resolutionOptions = defaultResolutionOptions,
  aspectRatioOptions = defaultAspectRatioOptions
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(open);
  const [widthInput, setWidthInput] = useState<string>(resolution.width.toString());
  const [heightInput, setHeightInput] = useState<string>(resolution.height.toString());
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('1:1');
  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);
  const [rotationStartAngle, setRotationStartAngle] = useState<number | null>(null);
  const [rotationStartPoint, setRotationStartPoint] = useState<{x: number, y: number} | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'edit' | 'color'>('edit');

  const {
    canvasRef,
    imageRef,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    saturate,
    setSaturate,
    grayscale,
    setGrayscale,
    flipHorizontal,
    setFlipHorizontal,
    flipVertical,
    setFlipVertical,
    zoom,
    setZoom,
    rotate,
    setRotate,
    resolution: currentResolution,
    handleResolutionChange,
    handleAspectRatioChange,
    applyPresetResolution,
    originalImageSize,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    generateEditedFile,
    downloadImage,
    resetEdits,
    applyFilter,
    fitToHeight,
    position,
    setPosition
  } = usePhotoEditor({
    file,
    defaultResolution: resolution
  });

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    setWidthInput(currentResolution.width.toString());
    setHeightInput(currentResolution.height.toString());
  }, [currentResolution]);

  // 添加键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 调整画布预览分辨率
  useEffect(() => {
    if (canvasContainerRef.current && currentResolution.width && currentResolution.height) {
      const containerWidth = canvasContainerRef.current.clientWidth;
      const containerHeight = canvasContainerRef.current.clientHeight;
      
      // 计算适合容器的缩放比例
      const scaleX = containerWidth / currentResolution.width;
      const scaleY = containerHeight / currentResolution.height;
      
      // 使用较小的缩放比例，确保画布完全显示在容器内
      const scale = Math.min(scaleX, scaleY, 1); // 最大不超过原始大小
      
      setPreviewScale(scale);
    }
  }, [currentResolution, canvasContainerRef.current]);

  // 处理缩放按钮
  const handleZoom = (value: number) => {
    setZoom(prev => {
      const newZoom = Math.max(0.1, prev + value);
      return newZoom;
    });
    
    // 使用requestAnimationFrame优化滤镜应用
    requestAnimationFrame(() => {
      applyFilter();
    });
  };

  // 处理鼠标滚轮缩放
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    // 计算缩放因子（使用更小的增量使缩放更平滑）
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newZoom = Math.max(0.1, Math.min(10, zoom + delta));
    
    // 更新缩放
    setZoom(newZoom);
    
    // 使用requestAnimationFrame优化滤镜应用
    requestAnimationFrame(() => {
    applyFilter();
    });
  };

  // 处理Ctrl+点击旋转
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCtrlPressed) {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      setRotationStartAngle(rotate);
      setRotationStartPoint({
        x: e.clientX - centerX,
        y: e.clientY - centerY
      });
    } else {
      handlePointerDown(e as any);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCtrlPressed && rotationStartPoint && rotationStartAngle !== null) {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const startAngle = Math.atan2(rotationStartPoint.y, rotationStartPoint.x);
      const currentAngle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      );
      
      const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
      setRotate(rotationStartAngle + angleDiff);
    } else {
      handlePointerMove(e as any);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCtrlPressed) {
      setRotationStartAngle(null);
      setRotationStartPoint(null);
    } else {
      handlePointerUp();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const handleSave = async () => {
    try {
      const editedFile = await generateEditedFile();
      onSaveImage(editedFile);
      if (downloadOnSave) {
        downloadImage();
      }
      handleClose();
    } catch (error) {
      console.error('Error saving image:', error);
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWidthInput(value);
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHeightInput(value);
  };

  const applyResolution = () => {
    const width = parseInt(widthInput, 10);
    const height = parseInt(heightInput, 10);
    
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      // 如果输入无效，重置为当前分辨率
      setWidthInput(currentResolution.width.toString());
      setHeightInput(currentResolution.height.toString());
      return;
    }
    
    // 限制最大分辨率，防止性能问题
    const maxWidth = 4096;
    const maxHeight = 4096;
    
    const newWidth = Math.min(width, maxWidth);
    const newHeight = Math.min(height, maxHeight);
    
    // 应用新分辨率
    handleResolutionChange({ width: newWidth, height: newHeight });
    
    // 短暂延迟后自动调整图片以适应新分辨率
    setTimeout(() => {
      // 重置位置
      fitToCanvas();
    }, 100);
  };

  // 添加新函数：自动调整图片以适应画布
  const fitToCanvas = () => {
    if (!canvasRef.current || !imageRef.current || !imageRef.current.complete) return;
    
    // 获取画布和图片尺寸
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    const imageWidth = imageRef.current.naturalWidth;
    const imageHeight = imageRef.current.naturalHeight;
    
    if (imageWidth <= 0 || imageHeight <= 0) return;
    
    // 计算图像和画布的宽高比
    const imageAspect = imageWidth / imageHeight;
    const canvasAspect = canvasWidth / canvasHeight;
    
    // 确定最佳缩放比例，考虑画布和图像比例
    let newZoom = 1.0;
    
    // 对于极端宽高比（宽度/高度 > 4 或 < 0.25）进行特殊处理
    const isExtremeAspect = (imageAspect > 4 || imageAspect < 0.25) || 
                          (canvasAspect > 4 || canvasAspect < 0.25);
    
    if (isExtremeAspect) {
      // 对极端宽高比，使用较保守的缩放
      newZoom = 0.8;
    }
    
    // 应用新的缩放比例
    setZoom(newZoom);
    
    // 重置位置，使图片居中
    setPosition({ x: 0, y: 0 });
    
    // 强制重绘，确保应用所有更改
    setTimeout(() => {
      const newZoomValue = newZoom * 1.01;  // 略微调整缩放值，强制重绘
      setZoom(newZoomValue);
      
      setTimeout(() => {
        setZoom(newZoom);  // 恢复原来的精确缩放值
      applyFilter();
      }, 20);
    }, 10);
  };

  const handleAspectRatioSelect = (ratio: string) => {
    setSelectedAspectRatio(ratio);
    handleAspectRatioChange(ratio);
  };

  // 参考原生库实现方式，直接使用handleInputChange函数处理滑块变化
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setValue: React.Dispatch<React.SetStateAction<number>>,
    min: number,
    max: number
  ) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= min && value <= max) {
      setValue(value);
      // 原生库通过useEffect自动应用滤镜，这里我们手动调用
      setTimeout(() => applyFilter(), 0);
    }
  };

  // 处理重置的函数
  const handleResetColors = () => {
    // 恢复默认值
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setGrayscale(0);
    // 确保应用滤镜
    setTimeout(() => applyFilter(), 0);
  };

  // 在分辨率变化后自动调整图片
  useEffect(() => {
    // 当分辨率变化时，自动调整图片
    if (imageRef.current && imageRef.current.complete) {
      fitToCanvas();
    }
  }, [currentResolution]);

  // 添加图片分辨率检测逻辑
  useEffect(() => {
    if (file && isOpen) {
      const detectImageSize = async () => {
        try {
          // 创建文件URL
          const fileUrl = URL.createObjectURL(file);
          
          // 获取图片真实尺寸
          const dimensions = await getImageDimensions(fileUrl);
          
          // 更新分辨率设置
          if (dimensions.width > 0 && dimensions.height > 0) {
            // 使用handleResolutionChange而不是setCurrentResolution
            handleResolutionChange(dimensions);
            setWidthInput(dimensions.width.toString());
            setHeightInput(dimensions.height.toString());
          }
          
          // 释放URL
          URL.revokeObjectURL(fileUrl);
        } catch (error) {
          console.error('Error detecting image size:', error);
        }
      };
      
      detectImageSize();
    }
  }, [file, isOpen, handleResolutionChange]);

  // 垂直滑块的事件处理函数，用于亮度、对比度和饱和度（0-200%）
  const handleVerticalSliderMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    setter: React.Dispatch<React.SetStateAction<number>>,
    min: number,
    max: number
  ) => {
    const slider = event.currentTarget.parentElement;
    if (!slider) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = slider.getBoundingClientRect();
      const height = rect.height;
      // 对于0-200%范围，需要适当调整计算方式
      const offsetY = Math.min(Math.max(0, height - (e.clientY - rect.top)), height);
      const percentage = Math.round((offsetY / height) * (max - min) + min);
      setter(percentage);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 计算滑块CSS变量，控制橙色轨道高度
  useEffect(() => {
    document.documentElement.style.setProperty('--brightness-height', `${brightness}%`);
    document.documentElement.style.setProperty('--contrast-height', `${contrast}%`);
    document.documentElement.style.setProperty('--saturate-height', `${saturate}%`);
    document.documentElement.style.setProperty('--grayscale-height', `${grayscale}%`);
  }, [brightness, contrast, saturate, grayscale]);

  // 添加一个处理适应高度的自定义函数
  const handleFitToHeight = () => {
    // 直接调用我们优化过的fitToCanvas函数
    fitToCanvas();
  };

  if (!isOpen) {
    return null;
  }

  // 合并默认标签和用户提供的标签，确保cancel属性存在
  const mergedLabels = { ...defaultLabels, ...labels };

  return (
    <div className="rpe-overlay">
      <div className="rpe-modal">
        {/* 标签页切换 - 垂直排列在最左侧 */}
        <div className="rpe-tabs">
          <button 
            className={`rpe-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            title={mergedLabels.editPicture}
          >
            <span className="rpe-tab-text">Edit</span>
          </button>
          <button 
            className={`rpe-tab ${activeTab === 'color' ? 'active' : ''}`}
            onClick={() => setActiveTab('color')}
            title={mergedLabels.color}
          >
            <span className="rpe-tab-text">Color</span>
          </button>
        </div>

        {/* 主区域 - 水平分布：左侧控制面板(1/4)，右侧画布(3/4) */}
        <div className="rpe-main-container">
          {/* 左侧控制面板 - 根据选项卡显示不同内容 */}
          <div className="rpe-top-controls">
            {activeTab === 'edit' && (
              <div className="rpe-edit-controls">
                {/* 按钮按两列排列 */}
                <div className="rpe-button-row">
                  {/* 旋转按钮 */}
                  {allowRotate && (
                    <>
                      <button className="monaco-style-btn" onClick={() => setRotate((prev) => prev - 90)}>
                        Rotate Left
                      </button>
                      <button className="monaco-style-btn" onClick={() => setRotate((prev) => prev + 90)}>
                        Rotate Right
                      </button>
                    </>
                  )}

                  {/* 翻转按钮 */}
                  {allowFlip && (
                    <>
                      <button 
                        className={`monaco-style-btn ${flipHorizontal ? 'active' : ''}`}
                        onClick={() => setFlipHorizontal((prev) => !prev)}
                      >
                        Flip Horizontal
                      </button>
                      <button 
                        className={`monaco-style-btn ${flipVertical ? 'active' : ''}`}
                        onClick={() => setFlipVertical((prev) => !prev)}
                      >
                        Flip Vertical
                      </button>
                    </>
                  )}

                  {/* 缩放按钮 */}
                  {allowZoom && (
                    <>
                      <button className="monaco-style-btn" onClick={() => handleZoom(0.1)}>
                        Zoom In
                      </button>
                      <button className="monaco-style-btn" onClick={() => handleZoom(-0.1)}>
                        Zoom Out
                      </button>
                    </>
                  )}

                  {/* 分辨率输入框 - 两列 */}
                  {allowResolutionSettings && (
                    <div className="rpe-two-column-group">
                    <input 
                      type="number" 
                        className="monaco-style-input"
                      value={widthInput}
                      onChange={handleWidthChange}
                    />
                    <input 
                      type="number" 
                        className="monaco-style-input"
                      value={heightInput}
                      onChange={handleHeightChange}
                    />
                    </div>
                  )}

                  {/* 分辨率信息 */}
                  {allowResolutionSettings && (
                    <div className="rpe-canvas-info" style={{ gridColumn: 'span 2' }}>
                      Resolution: {currentResolution.width} x {currentResolution.height}
                    </div>
                  )}

                  {/* 应用和适应高度按钮 */}
                  {allowResolutionSettings && (
                    <>
                      <button className="monaco-style-btn" onClick={applyResolution}>
                        Apply
                      </button>
                      <button className="monaco-style-btn" onClick={handleFitToHeight}>
                        Fit
                      </button>
                    </>
                  )}

                  {/* 分辨率预设和宽高比按钮排在同一行 */}
                  <div className="rpe-buttons-inline">
                    {/* 分辨率预设按钮 */}
                    {allowResolutionSettings && (
                      <div className="rpe-dropdown-container">
                        <button className="monaco-style-btn" onClick={() => {
                          const dropdown = document.getElementById('resolution-dropdown');
                          if (dropdown) {
                            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                            // 隐藏另一个下拉菜单
                            const otherDropdown = document.getElementById('aspect-ratio-dropdown');
                            if (otherDropdown) {
                              otherDropdown.style.display = 'none';
                            }
                          }
                        }}>
                          Res
                        </button>
                        {/* 分辨率预设下拉内容 */}
                        <div 
                          id="resolution-dropdown" 
                          className="settings-style-dropdown-content" 
                          style={{ display: 'none', maxHeight: '350px' }}
                        >
                          {defaultResolutionOptions.map((option, index) => (
                            <a key={index} onClick={() => {
                              applyPresetResolution(option);
                              document.getElementById('resolution-dropdown')!.style.display = 'none';
                            }}>
                              {option.width} x {option.height}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 宽高比按钮 */}
                    {allowAspectRatioSettings && (
                      <div className="rpe-dropdown-container">
                        <button className="monaco-style-btn" onClick={() => {
                          const dropdown = document.getElementById('aspect-ratio-dropdown');
                          if (dropdown) {
                            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                            // 隐藏另一个下拉菜单
                            const otherDropdown = document.getElementById('resolution-dropdown');
                            if (otherDropdown) {
                              otherDropdown.style.display = 'none';
                            }
                          }
                        }}>
                          AR
                    </button>
                        {/* 宽高比下拉内容 */}
                        <div 
                          id="aspect-ratio-dropdown" 
                          className="settings-style-dropdown-content" 
                          style={{ display: 'none', maxHeight: '350px' }}
                        >
                          {defaultAspectRatioOptions.map((ratio, index) => (
                            <a key={index} onClick={() => {
                              handleAspectRatioSelect(ratio);
                              document.getElementById('aspect-ratio-dropdown')!.style.display = 'none';
                            }}>
                              {ratio}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'color' && (
              <div className="rpe-color-controls">
                {/* 使用垂直滑动条布局，类似截图 */}
                <div className="vertical-slider-container">
                  {/* 亮度滑块 - 范围0-200% */}
                  <div className="vertical-slider-group">
                    <div className="vertical-slider brightness-slider">
                      <div 
                        className="vertical-slider-thumb"
                        style={{ bottom: `${brightness / 2}%` }} // 调整为0-200%范围
                        title={`亮度: ${brightness}%`}
                        onMouseDown={(e) => handleVerticalSliderMouseDown(e, setBrightness, 0, 200)}
                      >
                        <div className="vertical-slider-value">{brightness}%</div>
                      </div>
                    </div>
                    <div className="vertical-slider-label">B</div>
                  </div>

                  {/* 对比度滑块 - 范围0-200% */}
                  <div className="vertical-slider-group">
                    <div className="vertical-slider contrast-slider">
                      <div 
                        className="vertical-slider-thumb"
                        style={{ bottom: `${contrast / 2}%` }} // 调整为0-200%范围
                        title={`对比度: ${contrast}%`}
                        onMouseDown={(e) => handleVerticalSliderMouseDown(e, setContrast, 0, 200)}
                      >
                        <div className="vertical-slider-value">{contrast}%</div>
                      </div>
                    </div>
                    <div className="vertical-slider-label">C</div>
                  </div>

                  {/* 饱和度滑块 - 范围0-200% */}
                  <div className="vertical-slider-group">
                    <div className="vertical-slider saturate-slider">
                      <div 
                        className="vertical-slider-thumb"
                        style={{ bottom: `${saturate / 2}%` }} // 调整为0-200%范围
                        title={`饱和度: ${saturate}%`}
                        onMouseDown={(e) => handleVerticalSliderMouseDown(e, setSaturate, 0, 200)}
                      >
                        <div className="vertical-slider-value">{saturate}%</div>
                      </div>
                    </div>
                    <div className="vertical-slider-label">S</div>
                  </div>

                  {/* 灰度滑块 - 保持范围0-100% */}
                  <div className="vertical-slider-group">
                    <div className="vertical-slider grayscale-slider">
                      <div 
                        className="vertical-slider-thumb"
                        style={{ bottom: `${grayscale}%` }} // 保持原样
                        title={`灰度: ${grayscale}%`}
                        onMouseDown={(e) => handleVerticalSliderMouseDown(e, setGrayscale, 0, 100)}
                      >
                        <div className="vertical-slider-value">{grayscale}%</div>
                      </div>
                    </div>
                    <div className="vertical-slider-label">G</div>
                  </div>
                </div>

                {/* 隐藏的实际滑动条控件 */}
                <div style={{ display: 'none' }}>
                      <input 
                        type="range" 
                        min="0" 
                        max="200" 
                        value={brightness} 
                    onChange={(e) => {
                      handleInputChange(e, setBrightness, 0, 200);
                      updateRangeProgress(e.target);
                    }}
                    className="hidden-range"
                    style={{ ["--range-shdw" as any]: `${brightness/2}%` }}
                  />
                      <input 
                        type="range" 
                        min="0" 
                        max="200" 
                        value={contrast} 
                    onChange={(e) => {
                      handleInputChange(e, setContrast, 0, 200);
                      updateRangeProgress(e.target);
                    }}
                    className="hidden-range"
                    style={{ ["--range-shdw" as any]: `${contrast/2}%` }}
                  />
                      <input 
                        type="range" 
                        min="0" 
                        max="200" 
                        value={saturate} 
                    onChange={(e) => {
                      handleInputChange(e, setSaturate, 0, 200);
                      updateRangeProgress(e.target);
                    }}
                    className="hidden-range"
                    style={{ ["--range-shdw" as any]: `${saturate/2}%` }}
                  />
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={grayscale} 
                    onChange={(e) => {
                      handleInputChange(e, setGrayscale, 0, 100);
                      updateRangeProgress(e.target);
                    }}
                    className="hidden-range"
                    style={{ ["--range-shdw" as any]: `${grayscale}%` }}
                  />
                </div>
                
                {/* 重置按钮 */}
                  <button 
                  className="monaco-style-btn" 
                    onClick={handleResetColors}
                  style={{ width: '100%', marginTop: '20px' }}
                  >
                  Reset
                  </button>
              </div>
            )}
          </div>

          {/* 右侧画布区域 */}
          <div className="rpe-content">
            <div 
              className="rpe-canvas-wrapper"
              onWheel={handleWheel}
              ref={canvasContainerRef}
            >
              <div className="rpe-canvas-container">
                <div 
                  className="rpe-canvas-preview" 
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'center',
                    width: currentResolution.width,
                    height: currentResolution.height,
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    className="rpe-canvas"
                    width={currentResolution.width}
                    height={currentResolution.height}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  />
                  <img ref={imageRef} src="" alt="source" style={{ display: 'none' }} />
                </div>
              </div>
            </div>

            {/* 底部操作按钮 */}
            <div className="rpe-bottom-controls">
              <button className="bottom-btn" onClick={handleClose}>
                Cancel
                </button>
              <button 
                className="bottom-btn save-btn" 
                onClick={handleSave}
                style={{ marginLeft: '10px' }}
              >
                Save
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 