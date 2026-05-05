import React, { useRef, useEffect, useState } from 'react';
import useUIStore from '../stores/useUIStore';
import { formatMessageTime } from '../utils/timeFormat';
import { ImageLightbox } from './ImageLightbox';
import { getAllMessageImages, findImageIndex } from './imagePreviewUtils';
import { copyMessageContent } from './messageUtils';
import { toggleMessageCollapse } from './messageCollapse';
import { handleFileSelect, removeFile, handleFileDrop } from './fileHandlers';
import { SidebarCollapseButton, shouldShowCollapseButton, getMessageContentStyle } from './sidebarMessageCollapse.jsx';
import { MarkdownRenderer } from './shared/MarkdownRenderer';
import ReactAudioPlayer from 'react-audio-player';
import '../styles/markdown-preview.css';
import MessageList from './MessageList';
import ChatInputArea from './ChatInputArea';
import MessageEditorPortal from './MessageEditorPortal';
import '../styles/chat.css';
import '../styles/message-editor.css';
import '../styles/chatview.css';
// 导入自定义图像编辑器
import { ReactPhotoEditor } from '../components/CustomPhotoEditor';
// 导入 eventBus
import eventBus from '../components/ThreeBackground/utils/eventBus';
// 不再需要导入原始的样式
// import 'react-photo-editor/dist/style.css';
import { openUrl } from '../utils/browserUtils';

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
  fileInputRef: externalFileInputRef,
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
  setMessages,
}) {
  const { sidebarOpen, sidebarMode } = useUIStore();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const dropZoneRef = useRef(null);
  const localFileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editingImageMessage, setEditingImageMessage] = useState(null);
  // 添加背景状态追踪
  const [currentBackground, setCurrentBackground] = useState(null);
  // 添加视频背景状态追踪
  const [currentVideoBackground, setCurrentVideoBackground] = useState(null);
  // 添加文件上传状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // 添加拖放计数器引用
  const dragCounterRef = useRef(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // 添加用户滚动状态
  const [userScrolled, setUserScrolled] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const [copiedMessageIds, setCopiedMessageIds] = useState(new Set());

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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      // 备用方案：如果引用不存在，直接滚动容器
      const container = document.querySelector('#chat-view-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
    console.log('执行滚动到底部操作');
  };

  // 添加滚动事件监听
  useEffect(() => {
    const container = document.querySelector('#chat-view-messages');
    if (!container) return;
    
    const handleScroll = () => {
      // 获取滚动位置
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 30; // 30px 容差
      
      // 清除之前的超时
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // 如果不在底部，标记为用户已滚动
      if (!isAtBottom) {
        setUserScrolled(true);
      } else {
        // 如果回到底部，重新启用自动滚动
        scrollTimeoutRef.current = setTimeout(() => {
          setUserScrolled(false);
        }, 1000);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages]);

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

  // 添加拖拽处理函数
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('拖放进入事件');
    dragCounterRef.current++;
    
    if (!currentConversation) return;
    
    // 只有当拖放的是文件时才显示拖放区
    if (e.dataTransfer.types && 
       (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file'))) {
      setIsDragging(true);
      console.log('拖放状态已激活');
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('拖放离开事件');
    dragCounterRef.current--;
    
    // 只有当所有拖放事件都离开时才取消拖放状态
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
      console.log('拖放状态已取消');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 保持拖放状态
    if (!isDragging && e.dataTransfer.types && 
        (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file'))) {
      setIsDragging(true);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('拖放释放事件');
    // 重置拖放状态和计数器
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (!currentConversation) {
      alert('请先选择或创建一个对话');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      console.log('没有检测到文件');
      return;
    }

    console.log(`检测到 ${files.length} 个文件`);

    try {
      // 显示上传状态
      setIsUploading(true);
      setUploadProgress(0);
      
      // 记录总文件数和已处理文件数
      const totalFiles = files.length;
      let processedCount = 0;
      
      // 对每个文件单独处理并发送消息
      for (const file of files) {
        console.log(`处理拖放文件: ${file.name} (${file.type}), 大小: ${(file.size/1024/1024).toFixed(2)}MB`);
        
        try {
          // 创建文件的副本并保存到对话文件夹
          const result = await window.electron.saveFile(currentConversation.path, {
            name: file.name,
            data: await file.arrayBuffer()
          });
          
          // 更新进度
          processedCount++;
          setUploadProgress(Math.floor((processedCount / totalFiles) * 100));
          
          console.log(`文件保存成功: ${result.path}`);
          
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
        } catch (error) {
          console.error(`处理文件 ${file.name} 失败:`, error);
          alert(`文件 ${file.name} 上传失败: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('文件上传过程中发生错误:', error);
      alert('文件上传失败: ' + error.message);
    } finally {
      // 无论成功与否，都完成上传状态
      setIsUploading(false);
    }
  };

  const handleRenameFile = async (message, newFileName) => {
    try {
      if (!currentConversation) {
        throw new Error('无效的会话');
      }

      // 处理文本文件 (txtFile)
      if (message.txtFile) {
        try {
          // 构建新的文件名
          const newFileNameWithExt = `${newFileName}.txt`;
          // 重命名文件
          const result = await window.electron.renameFile(
            currentConversation.path,
            message.txtFile.name,
            newFileNameWithExt
          );

          // 更新消息
          const updatedMessages = messages.map(msg => {
            if (msg.id === message.id) {
              return {
                ...msg,
                txtFile: {
                  ...msg.txtFile,
                  name: result.name,
                  displayName: newFileName,
                  path: result.path
                }
              };
            }
            return msg;
          });

          setMessages(updatedMessages);
          setEditingFileName(null);
          setFileNameInput('');
          return;
        } catch (error) {
          console.error('重命名文本文件失败:', error);
          throw error;
        }
      }

      // 处理普通文件
      if (!message.files || message.files.length === 0) {
        throw new Error('找不到要重命名的文件');
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

  // 打开外部链接
  const openExternalLink = (url) => {
    openUrl(url);
  };

  // 添加音频消息渲染函数
  const renderAudioMessage = (message) => {
    const audioFile = message.files?.find(file => file.type && file.type.startsWith('audio/'));
    if (!audioFile) return null;

    return (
      <div className="audio-message">
        {message.audioParams && (
          <div className="audio-info mb-4">
            <div className="font-medium mb-2">文本：{message.audioParams?.text}</div>
            <div className="text-sm opacity-70">
              <span className="mr-4">音色：{message.audioParams?.voice}</span>
              <span className="mr-4">音量：{message.audioParams?.volume}</span>
              <span>语速：{message.audioParams?.speed}</span>
            </div>
          </div>
        )}
        <div className="audio-player relative overflow-hidden p-4 rounded-md">
          <ReactAudioPlayer
            src={`local-file://${audioFile.path}`}
            controls
            autoPlay={false}
            className="w-full"
            controlsList="nodownload"
            preload="metadata"
            style={{ width: '380px', maxWidth: '100%' }}
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
          <video
            src={`local-file://${file.path}`}
            controls
            className="rounded-lg max-w-full"
            style={{ maxHeight: '300px' }}
            preload="metadata"
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
    setShowInlineEdit(false);
    setEditingImage(null);
    setEditingImageMessage(null);
  };

  // 添加背景变化监听
  useEffect(() => {
    const handleBackgroundChange = (data) => {
      const { isCustomBackground, path, theme, isVideo } = data;
      
      // 如果切换了主题或取消了图片背景，更新状态
      if (theme !== 'bg-theme' || !isCustomBackground) {
        setCurrentBackground(null);
        setCurrentVideoBackground(null);
      } else if (isVideo) {
        setCurrentVideoBackground(path);
        setCurrentBackground(null);
      } else {
        setCurrentBackground(path);
        setCurrentVideoBackground(null);
      }
    };
    
    // 组件初始化时，检查当前背景状态
    const currentState = eventBus.getBackgroundState();
    if (currentState.isCustomBackground && currentState.theme === 'bg-theme') {
      if (currentState.isVideo) {
        setCurrentVideoBackground(currentState.path);
      } else {
        setCurrentBackground(currentState.path);
      }
    }
    
    eventBus.on('backgroundChange', handleBackgroundChange);
    return () => {
      eventBus.off('backgroundChange', handleBackgroundChange);
    };
  }, []);

  // 处理鼠标移动检测滚动条距离
  const handleMouseMove = (e) => {
    const chatMessages = document.getElementById('chat-view-messages');
    if (!chatMessages) return;
    
    const containerRect = chatMessages.getBoundingClientRect();
    const distanceToRightEdge = containerRect.right - e.clientX;
    
    // 如果鼠标距离容器右边缘20px以内，添加滚动条放大类
    if (distanceToRightEdge <= 20 && distanceToRightEdge >= 0) {
      chatMessages.classList.add('scrollbar-expanded');
    } else {
      chatMessages.classList.remove('scrollbar-expanded');
    }
  };

  // 处理鼠标离开聊天区域
  const handleMouseLeave = () => {
    const chatMessages = document.getElementById('chat-view-messages');
    if (chatMessages) {
      chatMessages.classList.remove('scrollbar-expanded');
    }
  };

  const handleCopyClick = async (message) => {
    // 调用复制函数
    const success = await copyMessageContent(message);
    
    if (success) {
      // 标记当前消息为已复制
      setCopiedMessageIds(prev => new Set([...prev, message.id]));
      
      // 1秒后重置状态
      setTimeout(() => {
        setCopiedMessageIds(prev => {
          const newSet = new Set([...prev]);
          newSet.delete(message.id);
          return newSet;
        });
      }, 1000);
    }
  };

  // 添加键盘事件处理，处理Ctrl+S快捷键
  useEffect(() => {
    const handleKeyPress = (e) => {
      // 检测是否是 Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        // 获取当前活动工具
        const activeTool = localStorage.getItem('active_tool');
        
        // 只有当前是Chat页面才处理快捷键
        if (activeTool === 'chat') {
          e.preventDefault();
          e.stopPropagation(); // 阻止事件冒泡，确保App.jsx中的处理也能正确工作

          // 直接触发自定义设置事件，确保在Chat界面可以打开设置
          const event = new CustomEvent('open-chat-settings');
          window.dispatchEvent(event);
        }
      }
    };
    
    // 添加事件监听
    window.addEventListener('keydown', handleKeyPress, true); // 使用捕获阶段
    
    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyPress, true);
    };
  }, []);

  return (
    <div 
      className={`flex flex-col h-full relative ${isCompact ? 'chat-view-compact' : ''}`}
      style={{ userSelect: 'text' }}
    >
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
        <div className="drag-text">拖放文件到这里上传</div>
        <div className="drag-subtext">支持图片、视频、音频和其他文件类型</div>
      </div>

      {/* 添加ChatView界面滚动到底部按钮 - 放在消息容器外，固定位置 */}
      {userScrolled && messages.length > 0 && sidebarMode !== 'chat' && (
        <div 
          className="fixed w-full flex justify-center items-center z-50 pointer-events-none"
          style={{ 
            bottom: '140px', 
            right: sidebarOpen ? '-106px' : '0px'
          }} // 根据侧边栏状态调整位置
        >
          <button 
            className="btn btn-ghost btn-sm btn-circle bg-transparent backdrop-blur-sm pointer-events-auto shadow-md"
            onClick={(e) => {
              // 阻止事件冒泡和默认行为
              e.stopPropagation();
              e.preventDefault();
              setUserScrolled(false);
              setTimeout(scrollToBottom, 50);
            }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7 7m0 0l7-7m-7 7V3" />
            </svg>
          </button>
        </div>
      )}

      {/* 消息列表 */}
      <MessageList
        messages={messages}
        messagesEndRef={messagesEndRef}
        isCompact={isCompact}
        editingMessage={editingMessage}
        editingFileName={editingFileName}
        setEditingFileName={setEditingFileName}
        fileNameInput={fileNameInput}
        setFileNameInput={setFileNameInput}
        collapsedMessages={collapsedMessages}
        setCollapsedMessages={setCollapsedMessages}
        deletingMessageId={deletingMessageId}
        setDeletingMessageId={setDeletingMessageId}
        copiedMessageIds={copiedMessageIds}
        setCopiedMessageIds={setCopiedMessageIds}
        currentBackground={currentBackground}
        currentVideoBackground={currentVideoBackground}
        currentConversation={currentConversation}
        handleRenameFile={handleRenameFile}
        renderAudioMessage={renderAudioMessage}
        renderMediaContent={renderMediaContent}
        handleImageClick={handleImageClick}
        handleEditImage={handleEditImage}
        openFileLocation={openFileLocation}
        enterEditMode={enterEditMode}
        moveMessage={moveMessage}
        handleCopyClick={handleCopyClick}
        sendToMonaco={sendToMonaco}
        setMessages={setMessages}
        handleDragEnter={handleDragEnter}
        handleDragLeave={handleDragLeave}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        handleMouseMove={handleMouseMove}
        handleMouseLeave={handleMouseLeave}
      />

      {/* 输入区域 */}
      <ChatInputArea
        editingMessage={editingMessage}
        isCompact={isCompact}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        sendMessage={sendMessage}
        currentConversation={currentConversation}
        handleContextMenu={handleContextMenu}
        fileInputRef={externalFileInputRef}
      />

      {/* 上传进度指示器 */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 bg-base-200 p-3 rounded-lg shadow-lg z-50">
          <div className="text-sm mb-2">正在上传文件... {uploadProgress}%</div>
          <progress className="progress progress-primary w-56" value={uploadProgress} max="100"></progress>
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
                <button className="btn btn-xs btn-error ml-2" onClick={deleteMessage}>Yes</button>
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
                <button className="btn btn-sm btn-primary ml-2" onClick={deleteMessage}>Yes</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={cancelDeleteMessage}></div>
          </div>
        )
      )}

      {/* 消息编辑器 Portal */}
      <MessageEditorPortal
        editingMessage={editingMessage}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        exitEditMode={exitEditMode}
        updateMessage={updateMessage}
      />

      {/* 内联图片编辑器 */}
      {showInlineEditor && editingImage && (
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
      )}

      {/* 隐藏的文件输入元素 */}
      <input
        type="file"
        ref={externalFileInputRef || localFileInputRef}
        style={{ display: 'none' }}
        multiple
        onChange={(e) => {
          console.log('文件选择事件触发', e.target.files);
          if (!currentConversation) {
            alert('请先选择或创建一个对话');
            return;
          }

          if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            
            // 显示上传状态
            setIsUploading(true);
            setUploadProgress(0);
            
            // 记录总文件数和已处理文件数
            const totalFiles = files.length;
            let processedCount = 0;
            
            Promise.all(
              files.map(async (file) => {
                try {
                  console.log(`处理文件: ${file.name} (${file.type}), 大小: ${(file.size/1024/1024).toFixed(2)}MB`);
                  
                  // 将文件保存到对话文件夹
                  const result = await window.electron.saveFile(currentConversation.path, {
                    name: file.name,
                    data: await file.arrayBuffer()
                  });
                  
                  // 更新进度
                  processedCount++;
                  setUploadProgress(Math.floor((processedCount / totalFiles) * 100));
                  
                  console.log(`文件保存成功: ${result.path}`);
                  return {
                    name: result.name,
                    path: result.path,
                    type: file.type
                  };
                } catch (error) {
                  console.error('保存文件失败:', error);
                  throw error;
                }
              })
            )
            .then((processedFiles) => {
              // 更新选中的文件列表
              setSelectedFiles([...selectedFiles, ...processedFiles]);
              // 重置文件输入元素，允许再次选择相同文件
              e.target.value = '';
              // 完成上传
              setIsUploading(false);
              console.log(`成功上传 ${processedFiles.length} 个文件`);
            })
            .catch((error) => {
              console.error('处理文件时出错:', error);
              alert('上传文件失败: ' + error.message);
              e.target.value = '';
              setIsUploading(false);
            });
          }
        }}
      />
    </div>
  );
} 
