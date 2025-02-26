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

  // 处理文件选择
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setShowEditor(true);
      
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
        setShowEditor(true);
        
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
              onClick={() => setShowEditor(true)}
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

      {/* 图片编辑器模态框 */}
      <ReactPhotoEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        file={file}
        onSaveImage={handleSaveImage}
        allowColorEditing={true}
        allowRotate={true}
        allowFlip={true}
        allowZoom={true}
        downloadOnSave={false}
      />
    </div>
  );
} 