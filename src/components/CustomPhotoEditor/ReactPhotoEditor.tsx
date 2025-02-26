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
  { width: 512, height: 512 },
  { width: 512, height: 288 },
  { width: 768, height: 320 },
  { width: 768, height: 512 },
  { width: 1024, height: 576 }
];

const defaultAspectRatioOptions: string[] = ['16:9', '9:16', '21:9', '4:3', '1:1'];

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
    fitToHeight
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
      const scaleX = (containerWidth * 0.9) / currentResolution.width;
      const scaleY = (containerHeight * 0.9) / currentResolution.height;
      
      // 使用较小的缩放比例，确保画布完全显示在容器内
      const scale = Math.min(scaleX, scaleY, 1); // 最大不超过原始大小
      
      setPreviewScale(scale);
    }
  }, [currentResolution, canvasContainerRef.current]);

  // 处理缩放
  const handleZoom = (value: number) => {
    setZoom(prev => Math.max(0.1, prev + value));
  };

  // 处理鼠标滚轮缩放
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.01 : 0.01;
    setZoom(prev => Math.max(0.1, prev + delta));
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
    
    handleResolutionChange({ width: newWidth, height: newHeight });
  };

  const handleAspectRatioSelect = (ratio: string) => {
    setSelectedAspectRatio(ratio);
    handleAspectRatioChange(ratio);
  };

  if (!isOpen) {
    return null;
  }

  // 合并默认标签和用户提供的标签，确保cancel属性存在
  const mergedLabels = { ...defaultLabels, ...labels };

  return (
    <div className="rpe-overlay">
      <div className="rpe-modal">
        {/* 标签页切换 */}
        <div className="rpe-tabs">
          <button 
            className={`rpe-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            {mergedLabels.editPicture}
          </button>
          <button 
            className={`rpe-tab ${activeTab === 'color' ? 'active' : ''}`}
            onClick={() => setActiveTab('color')}
          >
            {mergedLabels.color}
          </button>
        </div>

        {/* 编辑图片标签页 */}
        {activeTab === 'edit' && (
          <div className="rpe-top-controls">
            {/* 按钮行 */}
            <div className="rpe-button-row">
              {allowResolutionSettings && (
                <div className="dropdown dropdown-bottom">
                  <label tabIndex={0} className="btn btn-sm">Res</label>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52">
                    {resolutionOptions.map((option, index) => (
                      <li key={index}>
                        <a onClick={() => applyPresetResolution(option)}>
                          {option.width} x {option.height}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {allowRotate && (
                <>
                  <button className="btn btn-sm btn-circle" onClick={() => setRotate((prev) => prev - 90)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9,4 L4,9 L9,14 M4,9 C7.86599045,9 11,12.1340096 11,16 C11,19.8659904 7.86599045,23 4,23" />
                    </svg>
                  </button>
                  <button className="btn btn-sm btn-circle" onClick={() => setRotate((prev) => prev + 90)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15,4 L20,9 L15,14 M20,9 C16.1340096,9 13,12.1340096 13,16 C13,19.8659904 16.1340096,23 20,23" />
                    </svg>
                  </button>
                </>
              )}

              {allowFlip && (
                <>
                  <button 
                    className={`btn btn-sm btn-circle ${flipHorizontal ? 'btn-primary' : ''}`}
                    onClick={() => setFlipHorizontal((prev) => !prev)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12,2 L12,22 M3,12 L21,12" />
                    </svg>
                  </button>
                  <button className="btn btn-sm btn-circle" onClick={fitToHeight}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2,5 L22,5 L22,19 L2,19 L2,5 Z M12,5 L12,19" />
                    </svg>
                  </button>
                  <button 
                    className={`btn btn-sm btn-circle ${flipVertical ? 'btn-primary' : ''}`}
                    onClick={() => setFlipVertical((prev) => !prev)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2,12 L22,12 M12,2 L12,22" />
                    </svg>
                  </button>
                </>
              )}

              {allowZoom && (
                <>
                  <button className="btn btn-sm btn-circle" onClick={() => handleZoom(0.01)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12,2 L12,22 M2,12 L22,12" />
                    </svg>
                  </button>
                  <button className="btn btn-sm btn-circle" onClick={() => handleZoom(-0.01)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2,12 L22,12" />
                    </svg>
                  </button>
                </>
              )}

              {allowAspectRatioSettings && (
                <div className="dropdown dropdown-bottom">
                  <label tabIndex={0} className="btn btn-sm">AR</label>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52">
                    {aspectRatioOptions.map((ratio, index) => (
                      <li key={index}>
                        <a onClick={() => handleAspectRatioSelect(ratio)}>
                          {ratio}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 分辨率信息 */}
            <div className="rpe-canvas-info">
              <p>分辨率: <span id="currentResolution">{currentResolution.width} x {currentResolution.height}</span></p>
            </div>

            {/* 分辨率输入控制 */}
            <div className="rpe-control-panel">
              <div className="rpe-control-group">
                <input 
                  type="number" 
                  className="input input-bordered input-sm w-24"
                  placeholder="宽度" 
                  value={widthInput}
                  onChange={handleWidthChange}
                />
                <input 
                  type="number" 
                  className="input input-bordered input-sm w-24"
                  placeholder="高度" 
                  value={heightInput}
                  onChange={handleHeightChange}
                />
                <button className="btn btn-sm btn-primary" onClick={applyResolution}>
                  {mergedLabels.apply}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 颜色调整标签页 */}
        {activeTab === 'color' && (
          <div className="rpe-top-controls">
            <div className="rpe-color-controls">
              <div className="rpe-slider-row">
                {/* 亮度滑块 */}
                <div className="rpe-slider-group">
                  <div className="rpe-slider-label-row">
                    <span>{mergedLabels.brightness}: {brightness}%</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="200" 
                      value={brightness} 
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="range range-sm"
                    />
                  </div>
                </div>
                
                {/* 对比度滑块 */}
                <div className="rpe-slider-group">
                  <div className="rpe-slider-label-row">
                    <span>{mergedLabels.contrast}: {contrast}%</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="200" 
                      value={contrast} 
                      onChange={(e) => setContrast(parseInt(e.target.value))}
                      className="range range-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="rpe-slider-row">
                {/* 饱和度滑块 */}
                <div className="rpe-slider-group">
                  <div className="rpe-slider-label-row">
                    <span>{mergedLabels.saturate}: {saturate}%</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="200" 
                      value={saturate} 
                      onChange={(e) => setSaturate(parseInt(e.target.value))}
                      className="range range-sm"
                    />
                  </div>
                </div>
                
                {/* 灰度滑块 */}
                <div className="rpe-slider-group">
                  <div className="rpe-slider-label-row">
                    <span>{mergedLabels.grayscale}: {grayscale}%</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={grayscale} 
                      onChange={(e) => setGrayscale(parseInt(e.target.value))}
                      className="range range-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* 重置按钮行 */}
              <div className="rpe-reset-row">
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={resetEdits}
                >
                  {mergedLabels.reset}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rpe-content">
          {/* 画布区域 - 放在中间 */}
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
                  width: currentResolution.width,
                  height: currentResolution.height
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
            <div className="rpe-action-buttons">
              <button className="btn btn-sm" onClick={handleClose}>
                {mergedLabels.cancel}
              </button>
              <button className="btn btn-sm btn-primary" onClick={handleSave}>
                {mergedLabels.save}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 