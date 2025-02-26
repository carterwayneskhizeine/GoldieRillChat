import React, { useState, useEffect } from 'react';
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
  // 添加分辨率和宽高比状态
  const [editorResolution, setEditorResolution] = useState({ width: 512, height: 512 });
  const [editorAspectRatio, setEditorAspectRatio] = useState("16:9");
  // 添加自定义编辑器状态
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // 处理文件选择
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setShowCustomEditor(true);
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // 处理文件拖放
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setShowCustomEditor(true);
        
        // 创建预览
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
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
        content: '',
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
    if (showEditor) {
      setShowEditor(false);
      setTimeout(() => setShowEditor(true), 100);
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
    `;
    
    // 添加到 head
    document.head.appendChild(style);
    
    // 清理函数
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
        {editedFile ? (
          <div className="flex flex-col items-center gap-4">
            <img 
              src={URL.createObjectURL(editedFile)} 
              alt="编辑后的图片" 
              className="max-w-full max-h-[70vh] object-contain"
            />
            <p className="text-sm opacity-70">
              图片已编辑完成，可以发送到聊天或下载
            </p>
          </div>
        ) : imagePreview ? (
          <div className="flex flex-col items-center gap-4">
            <img 
              src={imagePreview} 
              alt="图片预览" 
              className="max-w-full max-h-[70vh] object-contain"
            />
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
                  downloadOnSave={false}
                  resolution={editorResolution}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 