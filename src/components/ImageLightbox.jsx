import React from 'react';
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
  // 自定义渲染函数
  const renderSlide = ({ slide }) => {
    if (slide.type === 'video') {
      return <VideoSlide slide={slide} />;
    }
    return null; // 返回 null 使用默认渲染
  };

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={images}
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
      }}
      render={{
        iconCaptionsOn: () => '显示标题',
        iconCaptionsOff: () => '隐藏标题',
        slide: renderSlide
      }}
    />
  );
};

// 为了向后兼容，导出时仍使用 ImageLightbox 名称
export { MediaLightbox as ImageLightbox }; 