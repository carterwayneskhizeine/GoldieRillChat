import React, { useRef, useEffect, useState } from 'react';
import { formatMessageTime } from '../utils/timeFormat';
import { ImageLightbox } from './ImageLightbox';
import { getAllMessageImages, findImageIndex } from './imagePreviewUtils';
import { handlePaste } from './pasteHandler';
import { copyMessageContent } from './messageUtils';
import { toggleMessageCollapse } from './messageCollapse';
import { handleFileSelect, removeFile, handleFileDrop } from './fileHandlers';
import { SidebarCollapseButton, shouldShowCollapseButton, getMessageContentStyle } from './sidebarMessageCollapse.jsx';
import { MarkdownRenderer } from './shared/MarkdownRenderer';
import ReactAudioPlayer from 'react-audio-player';
import '../styles/markdown-preview.css';
import { createPortal } from 'react-dom';
import Editor from "@monaco-editor/react";
import '../styles/chat.css';
// 导入自定义图像编辑器
import { ReactPhotoEditor } from '../components/CustomPhotoEditor';
// 不再需要导入原始的样式
// import 'react-photo-editor/dist/style.css';

// 添加辅助函数，使用 Electron API 加载图片
const loadImageFromPath = async (filePath, fileName, fileType) => {
  try {
    // 使用 Electron 的 readBinaryFile API 读取二进制文件
    const fileData = await window.electron.readBinaryFile(filePath);
    
    // 将 ArrayBuffer 转换为 Blob
    const blob = new Blob([fileData], { type: fileType || 'image/png' });
    
    // 创建 File 对象
    const file = new File([blob], fileName || 'image.png', { type: fileType || 'image/png' });
    
    return file;
  } catch (error) {
    console.error('加载图片失败:', error);
    throw error;
  }
};

export function ChatView({
  messages = [],
  currentConversation,
  editingMessage,
  setEditingMessage,
  messageInput,
  setMessageInput,
  selectedFiles,
  setSelectedFiles,
  sendMessage,
  deleteMessage,
  updateMessage,
  moveMessage,
  enterEditMode,
  exitEditMode,
  collapsedMessages,
  setCollapsedMessages,
  handleImageClick,
  fileInputRef,
  editingFileName,
  setEditingFileName,
  fileNameInput,
  setFileNameInput,
  renameMessageFile,
  openFileLocation,
  copyMessageContent,
  deletingMessageId,
  setDeletingMessageId,
  cancelDeleteMessage,
  confirmDeleteMessage,
  scrollToMessage,
  window,
  isCompact = false,
  sendToMonaco,
  sendToEditor,
  shouldScrollToBottom = false,
  setShouldScrollToBottom,
  setMessages
}) {
  const messagesEndRef = useRef(null);
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editingImageMessage, setEditingImageMessage] = useState(null);

  // 添加复制功能
  const handleCopySelectedText = (e) => {
    if (e.ctrlKey && e.key === 'c') {
      const selectedText = window.getSelection().toString();
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
      }
    }
  };

  // 添加键盘事件监听
  useEffect(() => {
    document.addEventListener('keydown', handleCopySelectedText);
    return () => {
      document.removeEventListener('keydown', handleCopySelectedText);
    };
  }, []);

  // 滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 每次消息列表变化或组件挂载时滚动到底部
  useEffect(() => {
    if (shouldScrollToBottom) {
      setTimeout(() => {
        scrollToBottom();
        if (typeof setShouldScrollToBottom === 'function') {
          setShouldScrollToBottom(false);
        }
      }, 50);
    }
  }, [messages, isCompact, shouldScrollToBottom, setShouldScrollToBottom]);

  // 添加对 editImage 事件的监听
  useEffect(() => {
    const handleEditImageEvent = (e) => {
      const { message, file } = e.detail;
      handleEditImage(message, file);
    };
    
    window.addEventListener('editImage', handleEditImageEvent);
    
    return () => {
      window.removeEventListener('editImage', handleEditImageEvent);
    };
  }, []);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 获取选中的文本
    const selectedText = window.getSelection().toString();
    const target = e.target;
    
    // 创建一个自定义事件并触发
    const contextMenuEvent = new CustomEvent('showContextMenu', {
      detail: {
        x: e.pageX,
        y: e.pageY,
        type: 'text',
        data: {
          text: selectedText || target.value || target.textContent,
          onPaste: (text) => {
            if (target.tagName === 'TEXTAREA') {
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const currentValue = target.value;
              target.value = currentValue.substring(0, start) + text + currentValue.substring(end);
              setMessageInput(target.value);
            }
          }
        }
      }
    });
    window.dispatchEvent(contextMenuEvent);
  };

  // 确保 messages 是数组
  const messageList = Array.isArray(messages) ? messages : [];

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // 添加拖拽处理函数
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentConversation) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!currentConversation) {
      alert('请先选择或创建一个对话');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      // 对每个文件单独处理并发送消息
      for (const file of files) {
        // 创建文件的副本并保存到对话文件夹
        const result = await window.electron.saveFile(currentConversation.path, {
          name: file.name,
          data: await file.arrayBuffer()
        });
        
        const processedFile = {
          name: result.name,
          path: result.path,
          type: file.type
        };

        // 构建消息内容
        let messageContent = '';
        if (file.type.startsWith('image/')) {
          messageContent = `图片文件: ${file.name}`;
        } else if (file.type.startsWith('video/')) {
          messageContent = `视频文件: ${file.name}`;
        } else if (file.type.startsWith('audio/')) {
          messageContent = `音频文件: ${file.name}`;
        } else if (file.type === 'application/pdf') {
          messageContent = `PDF文档: ${file.name}`;
        } else if (file.type.includes('document') || file.type.includes('sheet') || file.type.includes('presentation')) {
          messageContent = `办公文档: ${file.name}`;
        } else if (file.type.includes('text/')) {
          messageContent = `文本文件: ${file.name}`;
        } else {
          messageContent = `文件: ${file.name}`;
        }

        // 直接发送包含单个文件的消息
        const tempMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content: messageContent,
          type: 'user',
          timestamp: new Date().toISOString(),
          files: [processedFile]
        };

        // 保存消息
        const updatedMessages = [...messages, tempMessage];
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          updatedMessages
        );

        // 更新消息列表
        setMessages(updatedMessages);
        if (typeof setShouldScrollToBottom === 'function') {
          setShouldScrollToBottom(true);
        }
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败: ' + error.message);
    }
  };

  const handleRenameFile = async (message, newFileName) => {
    try {
      if (!currentConversation) {
        throw new Error('无效的会话');
      }

      // 获取文件扩展名
      const file = message.files[0];
      const fileExt = file.name.split('.').pop();
      const newName = `${newFileName}.${fileExt}`;

      // 重命名文件
      const result = await window.electron.renameFile(
        currentConversation.path,
        file.name,
        newName
      );

      // 更新消息内容中的文件名
      let updatedContent = message.content;
      if (message.content.startsWith('文件:') || 
          message.content.startsWith('图片文件:') || 
          message.content.startsWith('视频文件:') ||
          message.content.startsWith('音频文件:') ||
          message.content.startsWith('PDF文档:') ||
          message.content.startsWith('办公文档:') ||
          message.content.startsWith('文本文件:')) {
        updatedContent = message.content.replace(/: .+$/, `: ${newName}`);
      }

      // 更新消息
      const updatedMessages = messages.map(msg => {
        if (msg.id === message.id) {
          return {
            ...msg,
            files: [{ ...file, name: result.name, path: result.path }],
            content: updatedContent
          };
        }
        return msg;
      });

      setMessages(updatedMessages);
      setEditingFileName(null);
      setFileNameInput('');

    } catch (error) {
      console.error('重命名失败:', error);
      alert('重命名失败: ' + error.message);
    }
  };

  const openExternalLink = (url) => {
    try {
      // 首选使用 electron 的 shell.openExternal
      if (window?.electron?.shell?.openExternal) {
        window.electron.shell.openExternal(url);
      }
      // 回退到 window.open
      else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('打开链接失败:', error);
      // 最后的回退方案
      window.open(url, '_blank');
    }
  };

  // 添加音频消息渲染函数
  const renderAudioMessage = (message) => {
    const audioFile = message.files?.find(file => file.type && file.type.startsWith('audio/'));
    if (!audioFile) return null;

    return (
      <div className="audio-message">
        <div className="audio-info mb-4">
          <div className="font-medium mb-2">文本：{message.audioParams?.text}</div>
          <div className="text-sm opacity-70">
            <span className="mr-4">音色：{message.audioParams?.voice}</span>
            <span className="mr-4">音量：{message.audioParams?.volume}</span>
            <span>语速：{message.audioParams?.speed}</span>
          </div>
        </div>
        <div className="audio-player relative rounded-lg overflow-hidden bg-base-100/50 p-4">
          <ReactAudioPlayer
            src={`local-file://${audioFile.path}`}
            controls
            autoPlay={false}
            className="w-full"
            controlsList="nodownload"
            preload="metadata"
          />
        </div>
      </div>
    );
  };

  // 添加 renderMediaContent 函数
  const renderMediaContent = (file, onImageClick) => {
    if (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <div key={file.path} className="media-container my-2">
          <img
            src={`local-file://${file.path}`}
            alt={file.name}
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => onImageClick(e, file)}
            style={{ maxHeight: '300px', objectFit: 'contain' }}
            loading="lazy"
          />
        </div>
      );
    } else if (file.name && file.name.match(/\.mp4$/i)) {
      return (
        <div key={file.path} className="chat-media-container my-2">
          <div className="video-info mb-2">
            <div className="text-sm opacity-70">
              视频文件: {file.name}
            </div>
          </div>
          <video
            src={`local-file://${file.path}`}
            controls
            className="rounded-lg max-w-full"
            style={{ maxHeight: '300px' }}
            preload="none"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(e, file);
            }}
            onError={(e) => {
              console.error('视频加载失败:', e);
              e.target.outerHTML = `<div class="p-2 bg-error text-error-content rounded-lg">视频加载失败: ${file.path}</div>`;
            }}
          >
            您的浏览器不支持视频播放。
          </video>
        </div>
      );
    }
    return null;
  };

  // 添加处理内联图片编辑的函数
  const handleEditImage = (message, file) => {
    console.log('开始编辑图片:', file.path);
    
    // 检查文件是否存在于文件系统中
    window.electron.access(file.path)
      .then(async () => {
        try {
          console.log('文件存在，开始加载图片');
          // 使用辅助函数加载图片
          const fileObj = await loadImageFromPath(file.path, file.name, file.type);
          console.log('图片加载成功:', fileObj);
          setEditingImage(fileObj);
          setEditingImageMessage(message);
          setShowInlineEditor(true);
        } catch (error) {
          console.error('加载图片失败:', error);
          alert('无法编辑图片: 加载图片失败 - ' + error.message);
        }
      })
      .catch(error => {
        console.error('读取图片文件失败:', error);
        alert('无法编辑图片: 文件不存在或无法访问 - ' + error.message);
      });
  };
  
  // 添加保存编辑后图片的函数
  const handleSaveEditedImage = (editedImage) => {
    if (!editedImage || !editingImageMessage || !currentConversation) return;
    
    // 将 File 对象转换为 ArrayBuffer，然后转换为可序列化的数组
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      
      try {
        // 生成新的文件名，添加 edited_ 前缀和时间戳后缀
        const originalFileName = editedImage.name || '';
        const fileExt = originalFileName.split('.').pop() || 'png';
        const baseName = originalFileName.replace(/\.[^/.]+$/, "") || 'image';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const newFileName = `edited_${baseName}_${timestamp}.${fileExt}`;
        
        // 先保存文件到磁盘
        const savedFile = await window.electron.saveFile(currentConversation.path, {
          name: newFileName,
          data: Array.from(uint8Array)
        });
        
        // 创建新消息对象，使用保存后的文件信息
        const newMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: `编辑后的图片: ${savedFile.name}`,
          files: [savedFile], // 使用保存后的文件信息
          timestamp: new Date().toISOString()
        };
        
        // 添加到消息列表
        setMessages(prev => [...prev, newMessage]);
        
        // 保存消息到存储
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          [...messages, newMessage]
        );
        
        // 关闭编辑器
        setShowInlineEditor(false);
        setEditingImage(null);
        setEditingImageMessage(null);
        
        // 滚动到底部
        setShouldScrollToBottom(true);
      } catch (error) {
        console.error('保存消息失败:', error);
        alert('保存消息失败: ' + error.message);
      }
    };
    
    reader.onerror = (error) => {
      console.error('读取文件失败:', error);
      alert('读取文件失败');
    };
    
    // 开始读取文件
    reader.readAsArrayBuffer(editedImage);
  };
  
  // 添加取消编辑的函数
  const handleCancelEdit = () => {
    setShowInlineEditor(false);
    setEditingImage(null);
    setEditingImageMessage(null);
  };

  return (
    <div 
      className={`flex flex-col h-full relative ${isCompact ? 'chat-view-compact' : ''}`}
      style={{ userSelect: 'text' }}
    >
      <style>
        {`
          .chat-view-messages {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          .chat-bubble {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          .chat-bubble * {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          .message-content {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          .prose {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          .prose * {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          .mask-bottom {
            mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
          }
          .compact-scroll {
            margin-right: -10px;
            padding-right: 20px;
          }
          .message-container {
            position: relative;
            contain: paint;
            isolation: isolate;
            padding-bottom: 32px;
          }
          .collapse-button {
            position: sticky;
            top: -15px;
            float: right;
            margin-left: 8px;
            margin-right: 0px;
            z-index: 100;
            pointer-events: all;
          }
          .collapse-button button {
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
            background-color: var(--b1);
            border: 1px solid var(--b3);
          }
          .collapse-button button:hover {
            transform: scale(1.1);
            background-color: var(--b2);
          }
          .message-actions {
            display: none;
            position: absolute;
            bottom: 0;
            left: 4px;
            gap: 4px;
            z-index: 10;
            background-color: var(--b1);
            padding: 4px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .message-container:hover .message-actions {
            display: flex;
          }
          .message-actions button {
            background-color: var(--b1);
            border: 1px solid var(--b3);
            transition: all 0.2s;
          }
          .message-actions button:hover {
            transform: scale(1.05);
            background-color: var(--b2);
          }
          /* 拖拽上传样式 */
          .drag-overlay {
            position: fixed;
            inset: 0;
            background-color: var(--b1);
            opacity: 0.9;
            z-index: 100;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }

          .drag-overlay.hidden {
            opacity: 0;
            visibility: hidden;
          }

          .drag-icon {
            width: 64px;
            height: 64px;
            margin-bottom: 1rem;
            color: var(--p);
            animation: bounce 1s infinite;
          }

          @keyframes bounce {
            0%, 100% {
              transform: translateY(-10%);
              animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
            }
            50% {
              transform: translateY(0);
              animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
            }
          }

          /* 视频容器样式 */
          .video-wrapper {
            position: relative;
            margin: 0.5rem 0;
          }
          
          /* 图片编辑器样式 */
          .editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--b3);
          }
          
          .editor-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }
          
          .resolution-info {
            font-size: 0.875rem;
            color: var(--bc);
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .resolution-inputs {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .editor-content {
            flex: 1;
            overflow: auto;
            border-radius: 0.5rem;
            background-color: var(--b2);
            padding: 1rem;
          }
        `}
      </style>

      {/* 拖拽上传遮罩 */}
      <div 
        className={`drag-overlay ${isDragging ? '' : 'hidden'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="drag-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-lg font-medium">拖放文件到这里上传</div>
        <div className="text-sm opacity-70 mt-2">支持图片、视频、文档等文件格式</div>
      </div>

      {/* 消息列表容器 */}
      <div 
        id="ai-chat-messages"
        className={`flex-1 overflow-y-auto p-4 ${isCompact ? 'compact-scroll' : ''} chat-view-messages`}
        style={{
          paddingBottom: isCompact ? '100px' : '140px',
          marginBottom: isCompact ? '60px' : '0px'
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-4 max-w-[1200px] mx-auto">
          {messageList.map(message => (
            <div
              key={message.id}
              className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container`}
              data-message-id={message.id}
            >
              <div className="chat-header opacity-70">
                {message.txtFile ? (
                  editingFileName === message.id ? (
                    <div className="join">
                      <input
                        type="text"
                        value={fileNameInput}
                        onChange={(e) => {
                          setFileNameInput(e.target.value);
                        }}
                        className="input input-xs input-bordered join-item"
                        placeholder="Enter new file name"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameFile(message, fileNameInput);
                          }
                        }}
                      />
                      <button
                        className="btn btn-xs join-item"
                        onClick={() => handleRenameFile(message, fileNameInput)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-xs join-item"
                        onClick={() => {
                          setEditingFileName(null);
                          setFileNameInput('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="cursor-pointer hover:underline" onClick={() => {
                        setEditingFileName(message.id);
                        setFileNameInput(message.txtFile.displayName);
                      }}>
                        {message.txtFile.displayName}
                      </span>
                      <span className="text-xs opacity-50">
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                  )
                ) : message.files?.some(file => 
                  !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                ) ? (
                  <div className="flex items-center gap-2">
                    {editingFileName === message.id ? (
                      <div className="join">
                        <input
                          type="text"
                          value={fileNameInput}
                          onChange={(e) => {
                            setFileNameInput(e.target.value);
                          }}
                          className="input input-xs input-bordered join-item"
                          placeholder="Enter new file name"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameFile(message, fileNameInput);
                            }
                          }}
                        />
                        <button
                          className="btn btn-xs join-item"
                          onClick={() => handleRenameFile(message, fileNameInput)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-xs join-item"
                          onClick={() => {
                            setEditingFileName(null);
                            setFileNameInput('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span 
                          className="text-xs cursor-pointer hover:underline"
                          onClick={() => {
                            // 找到第一个非图片/视频文件
                            const firstFileIndex = message.files.findIndex(file => 
                              file.name && !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                            );
                            if (firstFileIndex !== -1) {
                              setEditingFileName(message.id);
                              setFileNameInput(message.files[firstFileIndex].name.replace(/\.[^/.]+$/, ""));
                            }
                          }}
                        >
                          {message.files.map(file => file.name).join(', ')}
                        </span>
                        <span className="text-xs opacity-50">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </>
                    )}
                  </div>
                ) : message.files?.some(file => 
                  file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                ) ? (
                  <div className="flex items-center gap-2">
                    {editingFileName?.startsWith(message.id) ? (
                      <div className="join">
                        <input
                          type="text"
                          value={fileNameInput}
                          onChange={(e) => {
                            setFileNameInput(e.target.value);
                          }}
                          className="input input-xs input-bordered join-item"
                          placeholder="Enter new file name"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameFile(message, fileNameInput);
                            }
                          }}
                        />
                        <button
                          className="btn btn-xs join-item"
                          onClick={() => handleRenameFile(message, fileNameInput)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-xs join-item"
                          onClick={() => {
                            setEditingFileName(null);
                            setFileNameInput('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span 
                          className="text-xs cursor-pointer hover:underline"
                          onClick={() => {
                            // 找到第一个图片或视频文件的索引
                            const firstMediaIndex = message.files.findIndex(file => 
                              file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                            );
                            if (firstMediaIndex !== -1) {
                              setEditingFileName(`${message.id}_${firstMediaIndex}`);
                              setFileNameInput(message.files[firstMediaIndex].name.replace(/\.[^/.]+$/, ""));
                            }
                          }}
                        >
                          {message.files.map(file => file.name).join(', ')}
                        </span>
                        <span className="text-xs opacity-50">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs opacity-50">
                    {formatMessageTime(message.timestamp)}
                  </span>
                )}
              </div>
              <div className={`chat-bubble ${
                message.type === 'user' ? 'chat-bubble-primary' : 
                message.error ? 'chat-bubble-error' : 'chat-bubble-secondary'
              }`}>
                {/* 添加折叠按钮 */}
                {shouldShowCollapseButton(message.content, message) && (
                  <SidebarCollapseButton
                    messageId={message.id}
                    collapsedMessages={collapsedMessages}
                    setCollapsedMessages={setCollapsedMessages}
                  />
                )}
                <div className="message-content">
                  {editingMessage?.id === message.id ? (
                    null // 不在这里渲染编辑框
                  ) : (
                    <div className={`prose max-w-none`}>
                      {message.generating && !message.content ? (
                        <div className="thinking-animation">
                          <span className="thinking-text">Thinking</span>
                          <div className="thinking-dots">
                            <div className="thinking-dot"></div>
                            <div className="thinking-dot"></div>
                            <div className="thinking-dot"></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* 判断是否是音频消息 */}
                          {message.files?.some(file => file.type && file.type.startsWith('audio/')) ? (
                            renderAudioMessage(message)
                          ) : message.files?.some(file => 
                            file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                          ) ? (
                            <div className="media-content">
                              {message.files
                                .filter(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                                .map(file => renderMediaContent(file, handleImageClick))
                              }
                            </div>
                          ) : message.files?.some(file => 
                            file.name && file.name.match(/\.mp4$/i)
                          ) ? (
                            <div className="media-content">
                              {console.log('渲染视频文件:', message.files.filter(file => file.name && file.name.match(/\.mp4$/i)))}
                              {message.files
                                .filter(file => file.name && file.name.match(/\.mp4$/i))
                                .map(file => {
                                  console.log('处理视频文件:', file);
                                  return (
                                    <div key={file.path} className="video-wrapper relative">
                                      {renderMediaContent(file, handleImageClick)}
                                    </div>
                                  );
                                })
                              }
                            </div>
                          ) : message.files?.some(file => 
                            file.name && !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                          ) ? (
                            <div className="file-message">
                              {/* 显示文件消息 */}
                              {message.files.map((file, index) => (
                                <div key={index} className="file-item">
                                  <span className="file-name">{file.name}</span>
                                  <button
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => openFileLocation(file)}
                                    title="打开文件位置"
                                  >
                                    打开
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={message.type === 'assistant' && message.reasoning_content ? 'mt-4' : ''}>
                              {message.generating ? (
                                <div className="typing-effect">
                                  {message.content}
                                </div>
                              ) : (
                                <div className={collapsedMessages.has(message.id) ? 'max-h-[100px] overflow-hidden mask-bottom' : ''}>
                                  <MarkdownRenderer
                                    content={message.content || ''}
                                    isCompact={false}
                                    onCopyCode={(code) => {
                                      console.log('Code copied:', code);
                                    }}
                                    onLinkClick={(href) => {
                                      window.electron.openExternal(href);
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {editingMessage?.id !== message.id && (
                <div className="message-actions">
                  {/* 仅当没有附件文件时显示AI和Edit按钮 */}
                  {!message.files?.length && (
                    <>
                      {message.content && (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => enterEditMode(message)}
                        >
                          Edit
                        </button>
                      )}
                    </>
                  )}
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setDeletingMessageId(message.id)}
                  >
                    Delete
                  </button>
                  {/* 添加BG按钮 - 只在图片消息下显示 */}
                  {message.files?.some(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        console.log('BG按钮点击，消息ID:', message.id);
                        // 功能暂未定义，可以在此添加处理逻辑
                      }}
                      title="背景处理"
                    >
                      BG
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => copyMessageContent(message)}
                  >
                    Copy
                  </button>
                  {/* 添加文件按钮 */}
                  {message.files?.length > 0 && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => openFileLocation(message.files[0])}
                      title="打开文件位置"
                    >
                      File
                    </button>
                  )}
                  {messages.indexOf(message) > 0 && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        moveMessage(message.id, 'up');
                        // 获取消息元素
                        const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                        // 判断是否是长对话
                        const isLongMessage = message.content && (
                          message.content.split('\n').length > 6 || 
                          message.content.length > 300
                        );
                        
                        // 如果是长对话，先折叠
                        if (isLongMessage) {
                          setCollapsedMessages(prev => new Set([...prev, message.id]));
                        }
                        
                        // 滚动到中间
                        setTimeout(() => {
                          messageElement?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                          });
                        }, 100);
                      }}
                    >
                      Up
                    </button>
                  )}
                  {messages.indexOf(message) < messages.length - 1 && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        moveMessage(message.id, 'down');
                        // 获取消息元素
                        const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                        // 判断是否是长对话
                        const isLongMessage = message.content && (
                          message.content.split('\n').length > 6 || 
                          message.content.length > 300
                        );
                        
                        // 如果是长对话，先折叠
                        if (isLongMessage) {
                          setCollapsedMessages(prev => new Set([...prev, message.id]));
                        }
                        
                        // 滚动到中间
                        setTimeout(() => {
                          messageElement?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                          });
                        }, 100);
                      }}
                    >
                      Down
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      // 如果消息包含图片，打开内联编辑器
                      if (message.files?.some(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                        // 获取第一个图片文件
                        const imageFile = message.files.find(file => 
                          file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                        );
                        if (imageFile) {
                          handleEditImage(message, imageFile);
                        }
                      } else {
                        // 否则发送到 Monaco 编辑器
                        sendToMonaco(message);
                      }
                    }}
                  >
                    {message.files?.some(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) 
                      ? "Edit" 
                      : "Send"}
                  </button>
                  
                  {/* 添加类型切换按钮 */}
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      // 切换消息类型
                      let newType;
                      if (!message.type) {
                        newType = 'user'; // TypeN -> TypeU
                      } else if (message.type === 'user') {
                        newType = 'assistant'; // TypeU -> TypeA
                      } else {
                        newType = null; // TypeA -> TypeN
                      }
                      
                      // 创建更新后的消息对象
                      const updatedMessage = {...message};
                      
                      if (newType) {
                        updatedMessage.type = newType;
                      } else {
                        delete updatedMessage.type;
                      }
                      
                      // 更新消息列表
                      const updatedMessages = messages.map(msg => 
                        msg.id === message.id ? updatedMessage : msg
                      );
                      
                      // 保存到存储
                      if (currentConversation) {
                        window.electron.saveMessages(
                          currentConversation.path,
                          currentConversation.id,
                          updatedMessages
                        ).then(() => {
                          // 更新状态
                          setMessages(updatedMessages);
                        }).catch(error => {
                          console.error('保存消息类型失败:', error);
                          alert('保存消息类型失败: ' + error.message);
                        });
                      }
                    }}
                  >
                    {!message.type ? "TypeN" : message.type === 'user' ? "TypeU" : "TypeA"}
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      {!editingMessage && (
        <div className={`absolute bottom-0 left-0 ${isCompact ? 'right-[20px] p-2 pointer-events-none bg-transparent' : 'right-[20px] p-4 bg-transparent'}`} style={{ 
          bottom: isCompact ? '48px' : '0px'
        }}>
          <div className={`${isCompact ? 'max-w-[300px] mx-auto pointer-events-auto' : 'max-w-3xl mx-auto'}`}>
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="badge badge-outline gap-2">
                    {file.name}
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => removeFile(file, setSelectedFiles)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <textarea 
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  if (e.target.scrollHeight > 480) {
                    e.target.style.overflowY = 'scroll';
                  } else {
                    e.target.style.overflowY = 'hidden';
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                    e.target.style.height = '64px';
                    e.target.style.overflowY = 'hidden';
                  }
                }}
                onPaste={(e) => handlePaste(e, currentConversation, setSelectedFiles, window.electron)}
                onContextMenu={handleContextMenu}
                placeholder="Send a message..."
                className={`textarea textarea-bordered w-full min-h-[64px] max-h-[480px] rounded-3xl resize-none pr-24 scrollbar-hide bg-transparent ${
                  isCompact ? 'text-sm shadow-lg' : ''
                }`}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  backgroundColor: 'transparent',
                  backdropFilter: 'blur(8px)'
                }}
                rows="2"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={sendMessage}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {deletingMessageId && (
        isCompact ? (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div role="alert" className="alert bg-base-200 shadow-lg">
              <span className="text-sm">Delete this message?</span>
              <div>
                <button className="btn btn-xs" onClick={cancelDeleteMessage}>No</button>
                <button className="btn btn-xs btn-error ml-2" onClick={confirmDeleteMessage}>Yes</button>
              </div>
            </div>
            <div className="absolute inset-0 bg-black opacity-50 -z-10"></div>
          </div>
        ) : (
          <div className="modal modal-open flex items-center justify-center">
            <div role="alert" className="alert w-[400px]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info h-6 w-6 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Delete this message?</span>
              <div>
                <button className="btn btn-sm" onClick={cancelDeleteMessage}>No</button>
                <button className="btn btn-sm btn-primary ml-2" onClick={confirmDeleteMessage}>Yes</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={cancelDeleteMessage}></div>
          </div>
        )
      )}

      {editingMessage &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-base-300/50 backdrop-blur-sm" onClick={exitEditMode}></div>
            <div className="relative bg-base-100 rounded-lg shadow-xl w-[90vw] max-w-[1200px] h-[80vh] flex flex-col">
              <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-base-300">
                <div className="flex items-center gap-2">
                  <select 
                    className="select select-bordered select-sm"
                    value={editorLanguage}
                    onChange={(e) => setEditorLanguage(e.target.value)}
                  >
                    <option value="plaintext">plaintext</option>
                    <option value="javascript">javascript</option>
                    <option value="typescript">typescript</option>
                    <option value="python">python</option>
                    <option value="java">java</option>
                    <option value="cpp">cpp</option>
                    <option value="csharp">csharp</option>
                    <option value="html">html</option>
                    <option value="css">css</option>
                    <option value="json">json</option>
                    <option value="markdown">markdown</option>
                    <option value="sql">sql</option>
                    <option value="xml">xml</option>
                    <option value="yaml">yaml</option>
                  </select>

                  <select 
                    className="select select-bordered select-sm"
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value)}
                  >
                    <option value="vs-dark">vs-dark</option>
                    <option value="light">light</option>
                    <option value="hc-black">hc-black</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button 
                      className="btn btn-sm btn-square"
                      onClick={() => setFontSize(prev => Math.max(8, prev - 2))}
                    >
                      -
                    </button>
                    <span className="text-sm min-w-[3ch] text-center">{fontSize}</span>
                    <button 
                      className="btn btn-sm btn-square"
                      onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={exitEditMode}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={editorLanguage}
                  theme={editorTheme}
                  value={messageInput}
                  onChange={setMessageInput}
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: fontSize,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 8, bottom: 8 }
                  }}
                />
              </div>

              <div className="flex-none flex justify-end gap-2 px-4 py-3 border-t border-base-300">
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={exitEditMode}
                >
                  取消
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => updateMessage(editingMessage.id, messageInput)}
                >
                  保存
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 内联图片编辑器 */}
      {showInlineEditor && editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-base-100 rounded-lg p-4 max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 editor-header">
              <h3 className="text-lg font-bold">编辑图片</h3>
              <div className="flex items-center gap-2 editor-controls">
                <button 
                  className="btn btn-sm btn-circle"
                  onClick={handleCancelEdit}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto editor-content">
              <ReactPhotoEditor
                open={true}
                onClose={handleCancelEdit}
                file={editingImage}
                onSaveImage={handleSaveEditedImage}
                allowColorEditing={true}
                allowRotate={true}
                allowFlip={true}
                allowZoom={true}
                allowResolutionSettings={true}
                allowAspectRatioSettings={true}
                downloadOnSave={false}
                resolution={{ width: 512, height: 512 }}
                resolutionOptions={[
                  { width: 512, height: 512 },
                  { width: 512, height: 288 },
                  { width: 768, height: 320 },
                  { width: 768, height: 512 },
                  { width: 1024, height: 576 }
                ]}
                aspectRatioOptions={['16:9', '9:16', '21:9', '4:3', '1:1']}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 