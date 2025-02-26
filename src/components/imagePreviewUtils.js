// 将消息中的媒体文件（图片和视频）转换为 Lightbox 可用的格式
export const prepareMediaForLightbox = (message) => {
  if (!message.files) return [];
  
  return message.files
    .filter(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i))
    .map(file => ({
      src: `local-file://${file.path}`,
      title: file.name,
      description: `文件路径: ${file.path}`,
      type: file.name.match(/\.mp4$/i) ? 'video' : 'image'
    }));
};

// 获取当前消息中所有媒体文件（图片和视频）的集合
export const getAllMessageMedia = (messages) => {
  const allMedia = [];
  
  messages.forEach(message => {
    if (message.files) {
      const messageMedia = message.files
        .filter(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i))
        .map(file => ({
          src: `local-file://${file.path}`,
          title: file.name,
          description: `发送时间: ${new Date(message.timestamp).toLocaleString()}\n文件路径: ${file.path}`,
          type: file.name.match(/\.mp4$/i) ? 'video' : 'image'
        }));
      allMedia.push(...messageMedia);
    }
  });
  
  return allMedia;
};

// 查找媒体文件在所有消息媒体文件中的索引
export const findMediaIndex = (messages, targetMedia) => {
  const allMedia = getAllMessageMedia(messages);
  return allMedia.findIndex(media => media.src === targetMedia.src);
};

// 为了向后兼容，保留原来的函数名
export const prepareImagesForLightbox = prepareMediaForLightbox;
export const getAllMessageImages = getAllMessageMedia;
export const findImageIndex = findMediaIndex; 