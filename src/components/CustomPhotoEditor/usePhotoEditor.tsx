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
    if (!canvasRef.current || !imageRef.current || !imageRef.current.complete) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // 设置画布尺寸为当前分辨率
    canvasRef.current.width = resolution.width;
    canvasRef.current.height = resolution.height;

    // 填充白色背景 - 始终填充整个画布
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // 获取画布和图像的宽高信息
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    const imgWidth = imageRef.current.naturalWidth;
    const imgHeight = imageRef.current.naturalHeight;

    // 计算原始图像的宽高比
    const imageAspectRatio = imgWidth / imgHeight;
    // 计算画布的宽高比
    const canvasAspectRatio = canvasWidth / canvasHeight;

    // 计算绘制尺寸和位置，保持图像宽高比
    let drawWidth, drawHeight, drawX, drawY;

    if (imageAspectRatio > canvasAspectRatio) {
      // 图像比画布更宽，以宽度为基准
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imageAspectRatio;
      drawX = 0;
      drawY = (canvasHeight - drawHeight) / 2;
    } else {
      // 图像比画布更高，以高度为基准
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imageAspectRatio;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = 0;
    }

    // 保存当前状态
    ctx.save();

    // 移动到画布中心
    ctx.translate(canvasWidth / 2, canvasHeight / 2);

    // 应用滤镜 - 在绘制图像前应用滤镜
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%)`;

    // 应用旋转
    ctx.rotate((rotate * Math.PI) / 180);

    // 应用翻转
    ctx.scale(
      flipHorizontal ? -1 : 1,
      flipVertical ? -1 : 1
    );

    // 应用缩放和平移
    ctx.scale(zoom, zoom);
    ctx.translate(position.x / zoom, position.y / zoom);

    // 绘制图像，居中
    ctx.drawImage(
      imageRef.current,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    // 恢复状态
    ctx.restore();
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

  // 当缩放或位置变化时重新应用滤镜
  useEffect(() => {
    applyFilter();
  }, [zoom, position, rotate, flipHorizontal, flipVertical]);

  // 生成编辑后的文件
  const generateEditedFile = useCallback(
    async (fileName = 'edited-image.png', fileType = 'image/png'): Promise<File> => {
      return new Promise((resolve, reject) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          reject(new Error('Canvas not found'));
          return;
        }

        // 确保最终导出前重新应用一次滤镜和背景
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 确保白色背景被正确应用到整个画布
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  // 自动调整图像高度填满画布
  const fitToHeight = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageRef.current.complete) return;
    
    // 重置缩放和位置
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    
    // 等待状态更新后再应用滤镜
    setTimeout(() => {
      applyFilter();
    }, 50);
  }, [applyFilter]);

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
    fitToHeight,
    position,
    setPosition
  };
}; 