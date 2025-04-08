import React, { useState, useEffect } from 'react';
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";

// 自定义视频渲染组件
const VideoSlide = ({ slide }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  return (
    <div className="flex items-center justify-center h-full">
      <video
        src={slide.src}
        controls
        autoPlay={isPlaying}
        className="max-h-[80vh] max-w-full"
        style={{ objectFit: "contain" }}
        onClick={() => setIsPlaying(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        您的浏览器不支持视频播放。
      </video>
    </div>
  );
};

// 媒体查看器组件（支持图片和视频）
const MediaLightbox = ({ 
  isOpen, 
  onClose, 
  images, 
  startIndex = 0 
}) => {
  // 增加状态来存储图片尺寸信息
  const [slidesWithDimensions, setSlidesWithDimensions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载图片并获取尺寸
  useEffect(() => {
    if (!images || images.length === 0) return;
    
    setIsLoading(true);
    
    // 创建一个包含尺寸信息的新slides数组
    const loadDimensions = async () => {
      const slidesWithSize = await Promise.all(images.map(async (slide) => {
        // 如果是视频，直接返回原始slide
        if (slide.type === 'video') return slide;
        
        // 对图片，尝试获取尺寸
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            // 创建新的slide对象，添加宽高信息
            const enhancedSlide = {
              ...slide,
              width: img.naturalWidth,
              height: img.naturalHeight,
              // 更新描述，添加尺寸信息
              description: slide.description 
                ? `${slide.description}\n分辨率: ${img.naturalWidth} × ${img.naturalHeight}` 
                : `分辨率: ${img.naturalWidth} × ${img.naturalHeight}`
            };
            resolve(enhancedSlide);
          };
          img.onerror = () => {
            // 加载失败时，返回原始slide
            resolve({
              ...slide,
              description: slide.description 
                ? `${slide.description}\n分辨率: 未知` 
                : `分辨率: 未知`
            });
          };
          img.src = slide.src;
        });
      }));
      
      setSlidesWithDimensions(slidesWithSize);
      setIsLoading(false);
    };
    
    loadDimensions();
  }, [images]);

  // 自定义渲染函数
  const renderSlide = ({ slide }) => {
    if (slide.type === 'video') {
      return <VideoSlide slide={slide} />;
    }
    return null; // 返回 null 使用默认渲染
  };

  // 自定义标题组件，显示图片分辨率
  const renderCaption = ({ slide, currentIndex }) => {
    return (
      <div>
        {slide.title && <h2 className="text-lg font-bold">{slide.title}</h2>}
        {slide.description && (
          <p className="text-sm mt-1">
            {slide.description.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < slide.description.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )}
      </div>
    );
  };

  if (isLoading) return null;

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slidesWithDimensions}
      index={startIndex}
      plugins={[Zoom, Captions]}
      zoom={{
        maxZoomPixelRatio: 10, // 最大缩放比例
        zoomInMultiplier: 2,   // 每次放大的倍数
        doubleTapDelay: 300,   // 双击缩放的延迟时间
        doubleClickDelay: 300, // 双击缩放的延迟时间
        keyboardMoveDistance: 50, // 使用键盘移动时的距离
        wheelZoomDistanceFactor: 100, // 滚轮缩放的距离因子
        pinchZoomDistanceFactor: 100, // 触摸缩放的距离因子
        scrollToZoom: true,    // 启用滚轮缩放
      }}
      captions={{
        showToggle: true,      // 显示切换按钮
        descriptionTextAlign: 'center', // 描述文本对齐方式
        descriptionMaxLines: 3, // 描述最大行数
        captionContent: renderCaption, // 自定义标题内容
      }}
      render={{
        iconCaptionsOn: () => '显示信息',
        iconCaptionsOff: () => '隐藏信息',
        slide: renderSlide
      }}
    />
  );
};

// 为了向后兼容，导出时仍使用 ImageLightbox 名称
export { MediaLightbox as ImageLightbox }; 