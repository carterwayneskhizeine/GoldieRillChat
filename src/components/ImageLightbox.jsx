import React from 'react';
import Lightbox from "yet-another-react-lightbox";

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
    />
  );
}; 