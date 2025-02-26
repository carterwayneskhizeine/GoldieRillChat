import { useCallback, useEffect, useRef, useState } from 'react';
import { Resolution } from './interface';

interface UsePhotoEditorParams {
  file: File | undefined;
  defaultBrightness?: number;
  defaultContrast?: number;
  defaultSaturate?: number;
  defaultGrayscale?: number;
  defaultFlipHorizontal?: boolean;
  defaultFlipVertical?: boolean;
  defaultZoom?: number;
  defaultRotate?: number;
  defaultResolution?: Resolution;
}

export const usePhotoEditor = ({
  file,
  defaultBrightness = 100,
  defaultContrast = 100,
  defaultSaturate = 100,
  defaultGrayscale = 0,
  defaultFlipHorizontal = false,
  defaultFlipVertical = false,
  defaultZoom = 1,
  defaultRotate = 0,
  defaultResolution = { width: 512, height: 512 }
}: UsePhotoEditorParams) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [brightness, setBrightness] = useState<number>(defaultBrightness);
  const [contrast, setContrast] = useState<number>(defaultContrast);
  const [saturate, setSaturate] = useState<number>(defaultSaturate);
  const [grayscale, setGrayscale] = useState<number>(defaultGrayscale);
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(defaultFlipHorizontal);
  const [flipVertical, setFlipVertical] = useState<boolean>(defaultFlipVertical);
  const [zoom, setZoom] = useState<number>(defaultZoom);
  const [rotate, setRotate] = useState<number>(defaultRotate);
  const [resolution, setResolution] = useState<Resolution>(defaultResolution);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // 更新图像源
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImageSrc(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  // 加载图像时获取原始尺寸
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        setOriginalImageSize({ width: img.width, height: img.height });
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  // 应用滤镜和变换
  const applyFilter = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image || !image.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸为当前分辨率
    canvas.width = resolution.width;
    canvas.height = resolution.height;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 填充白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 保存当前状态
    ctx.save();

    // 移动到画布中心
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // 应用旋转
    ctx.rotate((rotate * Math.PI) / 180);

    // 应用翻转
    ctx.scale(
      flipHorizontal ? -1 : 1,
      flipVertical ? -1 : 1
    );

    // 应用缩放
    ctx.scale(zoom, zoom);

    // 应用平移
    ctx.translate(position.x, position.y);

    // 绘制图像，居中
    ctx.drawImage(
      image,
      -image.width / 2,
      -image.height / 2,
      image.width,
      image.height
    );

    // 恢复状态
    ctx.restore();

    // 应用滤镜
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%)`;
    
    // 重新绘制带滤镜的图像
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 再次填充白色背景
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }, [
    brightness,
    contrast,
    saturate,
    grayscale,
    flipHorizontal,
    flipVertical,
    zoom,
    rotate,
    position,
    resolution
  ]);

  // 当图像加载或变换参数变化时应用滤镜
  useEffect(() => {
    if (imageSrc) {
      const image = imageRef.current;
      if (image) {
        image.onload = applyFilter;
        image.src = imageSrc;
      }
    }
  }, [imageSrc, applyFilter]);

  // 生成编辑后的文件
  const generateEditedFile = useCallback(
    async (fileName = 'edited-image.png', fileType = 'image/png'): Promise<File> => {
      return new Promise((resolve, reject) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          reject(new Error('Canvas not found'));
          return;
        }

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to generate blob'));
            return;
          }

          const file = new File([blob], fileName, { type: fileType });
          resolve(file);
        }, fileType);
      });
    },
    []
  );

  // 下载图像
  const downloadImage = useCallback(async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  }, []);

  // 重置所有编辑
  const resetEdits = useCallback(() => {
    setBrightness(defaultBrightness);
    setContrast(defaultContrast);
    setSaturate(defaultSaturate);
    setGrayscale(defaultGrayscale);
    setFlipHorizontal(defaultFlipHorizontal);
    setFlipVertical(defaultFlipVertical);
    setZoom(defaultZoom);
    setRotate(defaultRotate);
    setPosition({ x: 0, y: 0 });
  }, [
    defaultBrightness,
    defaultContrast,
    defaultSaturate,
    defaultGrayscale,
    defaultFlipHorizontal,
    defaultFlipVertical,
    defaultZoom,
    defaultRotate
  ]);

  // 处理缩放
  const handleZoom = useCallback((value: number) => {
    setZoom((prevZoom) => {
      const newZoom = prevZoom + value;
      return newZoom > 0.1 ? newZoom : 0.1;
    });
  }, []);

  // 处理指针按下事件
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  // 处理指针移动事件
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;

      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;

      setPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart, zoom]
  );

  // 处理指针抬起事件
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 处理分辨率变化
  const handleResolutionChange = useCallback((newResolution: Resolution) => {
    setResolution(newResolution);
  }, []);

  // 处理宽高比变化
  const handleAspectRatioChange = useCallback((ratio: string) => {
    setAspectRatio(ratio);
    
    // 根据宽高比和当前宽度计算新的高度
    const [widthRatio, heightRatio] = ratio.split(':').map(Number);
    if (widthRatio && heightRatio) {
      const newHeight = Math.round((resolution.width * heightRatio) / widthRatio);
      setResolution(prev => ({ ...prev, height: newHeight }));
    }
  }, [resolution.width]);

  // 应用预设分辨率
  const applyPresetResolution = useCallback((preset: Resolution) => {
    setResolution(preset);
  }, []);

  // 按画布高度匹配图片高度
  const fitToHeight = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image || !image.complete) return;
    
    // 计算当前画布高度与图片高度的比例
    const canvasHeight = canvas.height;
    const imageHeight = image.height;
    
    if (imageHeight <= 0) return;
    
    // 计算新的缩放比例，使图片高度与画布高度匹配
    const newZoom = canvasHeight / (imageHeight * zoom);
    
    // 应用新的缩放比例
    setZoom(newZoom);
    
    // 重置位置，使图片居中
    setPosition({ x: 0, y: 0 });
  }, [zoom]);

  return {
    canvasRef,
    imageRef,
    imageSrc,
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
    resolution,
    setResolution,
    aspectRatio,
    setAspectRatio,
    handleResolutionChange,
    handleAspectRatioChange,
    applyPresetResolution,
    originalImageSize,
    handleZoom,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    generateEditedFile,
    downloadImage,
    resetEdits,
    applyFilter,
    fitToHeight
  };
}; 