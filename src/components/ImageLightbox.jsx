import React from 'react';
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";

export const ImageLightbox = ({ 
  isOpen, 
  onClose, 
  images, 
  startIndex = 0 
}) => {
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
      }}
    />
  );
}; 