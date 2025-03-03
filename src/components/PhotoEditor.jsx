import React, { useState, useEffect, useRef } from 'react';
import { ReactPhotoEditor } from 'react-photo-editor';
import 'react-photo-editor/dist/style.css';

/**
 * 基于 react-photo-editor 的图片编辑器组件
 * 
 * @param {Object} props - 组件属性
 * @param {Object} props.currentConversation - 当前会话
 * @param {Array} props.messages - 消息列表
 * @param {Function} props.setMessages - 设置消息的函数
 * @param {Function} props.setActiveTool - 设置活动工具的函数
 * @param {Object} props.window - 窗口对象
 */
export default function PhotoEditor({
  currentConversation,
  messages,
  setMessages,
  setActiveTool,
  window
}) {
  // 状态管理
  const [file, setFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [editedFile, setEditedFile] = useState(null);
  const [editedImagePreview, setEditedImagePreview] = useState(null);
  // 添加分辨率和宽高比状态
  const [editorResolution, setEditorResolution] = useState({ width: 512, height: 512 });
  const [editorAspectRatio, setEditorAspectRatio] = useState("16:9");
  // 添加自定义编辑器状态
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  // 添加边缘处理和保持宽高比选项
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(true);
  const [edgeSmoothing, setEdgeSmoothing] = useState(true);
  // 添加图片加载状态
  const [imageLoading, setImageLoading] = useState(false);
  // 添加图片原始尺寸
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  
  // 引用预览图片元素
  const previewImageRef = useRef(null);
  const editedImageRef = useRef(null);

  // 处理文件选择
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageLoading(true);
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        
        // 获取图片原始尺寸
        const img = new Image();
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height });
          
          // 根据原始尺寸设置编辑器分辨率，保持宽高比
          const aspectRatio = img.width / img.height;
          let newWidth = editorResolution.width;
          let newHeight = Math.round(newWidth / aspectRatio);
          
          // 如果高度超过限制，则调整宽度
          if (newHeight > 4096) {
            newHeight = 4096;
            newWidth = Math.round(newHeight * aspectRatio);
          }
          
          // 如果宽度超过限制，则调整高度
          if (newWidth > 4096) {
            newWidth = 4096;
            newHeight = Math.round(newWidth / aspectRatio);
          }
          
          setEditorResolution({ width: newWidth, height: newHeight });
          setImageLoading(false);
          setShowCustomEditor(true);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // 处理文件拖放
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImageLoading(true);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        
        // 创建预览
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
          
          // 获取图片原始尺寸
          const img = new Image();
          img.onload = () => {
            setOriginalDimensions({ width: img.width, height: img.height });
            
            // 根据原始尺寸设置编辑器分辨率，保持宽高比
            const aspectRatio = img.width / img.height;
            let newWidth = editorResolution.width;
            let newHeight = Math.round(newWidth / aspectRatio);
            
            // 如果高度超过限制，则调整宽度
            if (newHeight > 4096) {
              newHeight = 4096;
              newWidth = Math.round(newHeight * aspectRatio);
            }
            
            // 如果宽度超过限制，则调整高度
            if (newWidth > 4096) {
              newWidth = 4096;
              newHeight = Math.round(newWidth / aspectRatio);
            }
            
            setEditorResolution({ width: newWidth, height: newHeight });
            setImageLoading(false);
            setShowCustomEditor(true);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(droppedFile);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理保存图片
  const handleSaveImage = (editedImage) => {
    setEditedFile(editedImage);
    
    // 创建编辑后图片的预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setEditedImagePreview(e.target.result);
    };
    reader.readAsDataURL(editedImage);
    
    setShowEditor(false);
    setShowCustomEditor(false);
  };

  // 发送图片到聊天
  const sendToChat = () => {
    if (currentConversation && editedFile) {
      // 创建新消息对象
      const newMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: `编辑后的图片: ${editedFile.name || '图片.png'}`,
        files: [editedFile],
        timestamp: new Date().toISOString()
      };
      
      // 添加到消息列表
      setMessages(prev => [...prev, newMessage]);
      
      // 切换回聊天工具
      setActiveTool('chat');
    }
  };

  // 下载编辑后的图片
  const downloadImage = () => {
    if (editedFile) {
      const url = URL.createObjectURL(editedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = editedFile.name || 'edited-image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // 应用分辨率设置
  const applyEditorResolution = () => {
    // 这里可以添加分辨率验证逻辑
    if (editorResolution.width < 50 || editorResolution.height < 50) {
      alert('分辨率不能小于 50x50');
      return;
    }
    
    if (editorResolution.width > 4096 || editorResolution.height > 4096) {
      alert('分辨率不能大于 4096x4096');
      return;
    }
    
    // 应用分辨率设置的逻辑
    console.log('应用分辨率设置:', editorResolution);
    // 重新打开编辑器以应用新的分辨率
    if (showCustomEditor) {
      setShowCustomEditor(false);
      setTimeout(() => setShowCustomEditor(true), 100);
    }
  };
  
  // 设置宽高比
  const handleAspectRatioChange = (ratio) => {
    // 保存当前选择的宽高比
    const currentRatio = ratio;
    
    // 根据宽高比和当前宽度计算新的高度
    const [width, height] = ratio.split(':').map(Number);
    if (width && height) {
      const newHeight = Math.round((editorResolution.width * height) / width);
      setEditorResolution({ ...editorResolution, height: newHeight });
      
      // 更新宽高比状态
      setEditorAspectRatio(currentRatio);
      
      // 应用新的分辨率
      setTimeout(() => applyEditorResolution(), 100);
    }
  };
  
  // 重置为原始尺寸
  const resetToOriginalSize = () => {
    if (originalDimensions.width > 0 && originalDimensions.height > 0) {
      // 如果原始尺寸超过限制，则按比例缩小
      let newWidth = originalDimensions.width;
      let newHeight = originalDimensions.height;
      
      if (newWidth > 4096) {
        const ratio = 4096 / newWidth;
        newWidth = 4096;
        newHeight = Math.round(newHeight * ratio);
      }
      
      if (newHeight > 4096) {
        const ratio = 4096 / newHeight;
        newHeight = 4096;
        newWidth = Math.round(newWidth * ratio);
      }
      
      setEditorResolution({ width: newWidth, height: newHeight });
      setTimeout(() => applyEditorResolution(), 100);
    }
  };

  // 添加样式到 head
  useEffect(() => {
    // 创建样式元素
    const style = document.createElement('style');
    style.textContent = `
      .custom-editor-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      
      .custom-editor-container {
        background-color: var(--b1);
        border-radius: 8px;
        width: 90%;
        max-width: 1200px;
        height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .custom-editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--b3);
      }
      
      .custom-editor-title {
        font-size: 1.25rem;
        font-weight: bold;
      }
      
      .custom-editor-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      
      .custom-editor-settings {
        padding: 1rem;
        border-bottom: 1px solid var(--b3);
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }
      
      .settings-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .custom-editor-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }
      
      .custom-editor-content > div {
        height: 100%;
      }
      
      /* 覆盖 ReactPhotoEditor 的样式 */
      .react-photo-editor {
        position: relative !important;
        z-index: auto !important;
      }
      
      .react-photo-editor-backdrop {
        position: absolute !important;
        background: transparent !important;
      }
      
      .react-photo-editor-container {
        position: relative !important;
        height: 100% !important;
        width: 100% !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        transform: none !important;
      }
      
      /* 添加图片容器样式 */
      .image-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        max-height: 70vh;
        overflow: auto;
      }
      
      .image-preview {
        position: relative;
        border: 2px solid var(--p);
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .image-preview img {
        max-width: 100%;
        max-height: 60vh;
        object-fit: contain;
      }
      
      .image-info {
        font-size: 0.875rem;
        color: var(--bc);
        text-align: center;
      }
      
      /* 加载动画 */
      .loading-spinner {
        display: inline-block;
        width: 50px;
        height: 50px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: var(--p);
        animation: spin 1s ease-in-out infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    
    // 添加到 head
    document.head.appendChild(style);
    
    // 清理函数
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 渲染图片函数
  const renderImage = (src, alt, ref) => (
    <div className="image-preview">
      <img 
        ref={ref}
        src={src} 
        alt={alt} 
        style={{
          maxWidth: '100%',
          maxHeight: '60vh',
          objectFit: 'contain'
        }}
        onLoad={(e) => {
          console.log(`图片加载完成: ${alt}`, {
            naturalWidth: e.target.naturalWidth,
            naturalHeight: e.target.naturalHeight,
            displayWidth: e.target.width,
            displayHeight: e.target.height
          });
        }}
      />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      {/* 工具栏 */}
      <div className="max-w-[1200px] w-full mx-auto flex flex-wrap gap-2 items-center">
        <div className="flex-1 flex justify-start items-center gap-2">
          <input
            type="file"
            id="imageInput"
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
          <button 
            className="btn btn-sm"
            onClick={() => document.getElementById('imageInput').click()}
          >
            导入图片
          </button>
          
          {editedFile && (
            <>
              <button 
                className="btn btn-sm"
                onClick={sendToChat}
                disabled={!currentConversation}
              >
                发送到聊天
              </button>
              <button 
                className="btn btn-sm"
                onClick={downloadImage}
              >
                下载图片
              </button>
            </>
          )}
        </div>
      </div>

      {/* 拖放区域 */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden border-2 border-dashed border-base-300 rounded-lg"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {imageLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="loading-spinner"></div>
            <p>正在加载图片...</p>
          </div>
        ) : editedFile ? (
          <div className="image-container">
            {renderImage(editedImagePreview, "编辑后的图片", editedImageRef)}
            <div className="image-info">
              <p>图片已编辑完成，可以发送到聊天或下载</p>
              <p>尺寸: {editorResolution.width} x {editorResolution.height}</p>
            </div>
          </div>
        ) : imagePreview ? (
          <div className="image-container">
            {renderImage(imagePreview, "图片预览", previewImageRef)}
            <div className="image-info">
              <p>原始尺寸: {originalDimensions.width} x {originalDimensions.height}</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCustomEditor(true)}
            >
              编辑图片
            </button>
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-lg mb-2">拖放图片到此处，或点击"导入图片"按钮</p>
            <p className="text-sm opacity-70">支持 JPG、PNG、GIF 等常见图片格式</p>
          </div>
        )}
      </div>

      {/* 自定义编辑器模态框 */}
      {showCustomEditor && (
        <div className="custom-editor-modal">
          <div className="custom-editor-container">
            <div className="custom-editor-header">
              <div className="custom-editor-title">编辑图片</div>
              <div className="custom-editor-controls">
                <button 
                  className="btn btn-sm btn-circle"
                  onClick={() => {
                    setShowCustomEditor(false);
                    setShowEditor(false);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="custom-editor-settings">
              <div className="settings-group">
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-sm">分辨率</label>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><a onClick={() => setEditorResolution({ width: 512, height: 512 })}>512 x 512</a></li>
                    <li><a onClick={() => setEditorResolution({ width: 512, height: 288 })}>512 x 288</a></li>
                    <li><a onClick={() => setEditorResolution({ width: 768, height: 320 })}>768 x 320</a></li>
                    <li><a onClick={() => setEditorResolution({ width: 768, height: 512 })}>768 x 512</a></li>
                    <li><a onClick={() => setEditorResolution({ width: 1024, height: 576 })}>1024 x 576</a></li>
                    <li><a onClick={resetToOriginalSize}>原始尺寸</a></li>
                  </ul>
                </div>
                
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-sm">宽高比</label>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><a onClick={() => handleAspectRatioChange("16:9")}>16:9</a></li>
                    <li><a onClick={() => handleAspectRatioChange("9:16")}>9:16</a></li>
                    <li><a onClick={() => handleAspectRatioChange("21:9")}>21:9</a></li>
                    <li><a onClick={() => handleAspectRatioChange("4:3")}>4:3</a></li>
                    <li><a onClick={() => handleAspectRatioChange("1:1")}>1:1</a></li>
                  </ul>
                </div>
              </div>
              
              <div className="settings-group">
                <span>当前分辨率: {editorResolution.width} x {editorResolution.height}</span>
              </div>
              
              <div className="settings-group">
                <input 
                  type="number" 
                  className="input input-bordered input-sm w-20" 
                  placeholder="宽度" 
                  value={editorResolution.width}
                  onChange={(e) => setEditorResolution({ ...editorResolution, width: parseInt(e.target.value) || 512 })}
                />
                <span>x</span>
                <input 
                  type="number" 
                  className="input input-bordered input-sm w-20" 
                  placeholder="高度" 
                  value={editorResolution.height}
                  onChange={(e) => setEditorResolution({ ...editorResolution, height: parseInt(e.target.value) || 512 })}
                />
                <button 
                  className="btn btn-sm"
                  onClick={applyEditorResolution}
                >
                  应用
                </button>
              </div>
              
              <div className="settings-group">
                <label className="label cursor-pointer">
                  <span className="label-text mr-2">保持宽高比</span>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary" 
                    checked={preserveAspectRatio}
                    onChange={(e) => setPreserveAspectRatio(e.target.checked)}
                  />
                </label>
              </div>
              
              <div className="settings-group">
                <label className="label cursor-pointer">
                  <span className="label-text mr-2">边缘平滑</span>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary" 
                    checked={edgeSmoothing}
                    onChange={(e) => setEdgeSmoothing(e.target.checked)}
                  />
                </label>
              </div>
            </div>
            
            <div className="custom-editor-content">
              {showCustomEditor && (
                <ReactPhotoEditor
                  open={true}
                  onClose={() => {
                    setShowCustomEditor(false);
                    setShowEditor(false);
                  }}
                  file={file}
                  onSaveImage={handleSaveImage}
                  allowColorEditing={true}
                  allowRotate={true}
                  allowFlip={true}
                  allowZoom={true}
                  allowResolutionSettings={true}
                  allowAspectRatioSettings={true}
                  downloadOnSave={false}
                  resolution={editorResolution}
                  resolutionOptions={[
                    { width: 512, height: 512 },
                    { width: 512, height: 288 },
                    { width: 768, height: 320 },
                    { width: 768, height: 512 },
                    { width: 1024, height: 576 },
                    { width: originalDimensions.width, height: originalDimensions.height }
                  ]}
                  aspectRatioOptions={['16:9', '9:16', '21:9', '4:3', '1:1']}
                  preserveAspectRatio={preserveAspectRatio}
                  smoothEdges={edgeSmoothing}
                  labels={{
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
                    apply: '应用'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 