export const copyMessageContent = async (message) => {
  try {
    // 如果消息包含图片文件
    if (message.files?.some(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
      // 获取第一个图片文件
      const imageFile = message.files.find(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));
      if (imageFile) {
        // 创建一个 img 元素来加载图片
        const img = new Image();
        img.src = `local-file://${imageFile.path}`;
        
        // 等待图片加载完成
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // 创建 canvas 并绘制图片
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        try {
          // 尝试直接复制到剪贴板
          await canvas.toBlob(async (blob) => {
            try {
              const item = new ClipboardItem({ [blob.type]: blob });
              await navigator.clipboard.write([item]);
            } catch (clipboardError) {
              console.error('Failed to use Clipboard API:', clipboardError);
              // 如果 Clipboard API 失败，尝试使用 execCommand
              document.body.appendChild(canvas);
              canvas.focus();
              try {
                document.execCommand('copy');
              } catch (execError) {
                console.error('Failed to use execCommand:', execError);
              }
              document.body.removeChild(canvas);
            }
          }, 'image/png');
        } catch (error) {
          console.error('Failed to copy image:', error);
        }
        
        return true;
      }
    }
    
    // 如果没有图片文件,则复制文本内容
    if (message.content) {
      await navigator.clipboard.writeText(message.content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to copy content:', error);
    return false;
  }
}; 