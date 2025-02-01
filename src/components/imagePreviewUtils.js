// 将消息中的图片文件转换为 Lightbox 可用的格式
export const prepareImagesForLightbox = (message) => {
  if (!message.files) return [];
  
  return message.files
    .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
    .map(file => ({
      src: `local-file://${file.path}`
    }));
};

// 获取当前消息中所有图片的集合
export const getAllMessageImages = (messages) => {
  const allImages = [];
  
  messages.forEach(message => {
    if (message.files) {
      const messageImages = message.files
        .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        .map(file => ({
          src: `local-file://${file.path}`
        }));
      allImages.push(...messageImages);
    }
  });
  
  return allImages;
};

// 查找图片在所有消息图片中的索引
export const findImageIndex = (messages, targetImage) => {
  const allImages = getAllMessageImages(messages);
  return allImages.findIndex(img => img.src === targetImage.src);
}; 