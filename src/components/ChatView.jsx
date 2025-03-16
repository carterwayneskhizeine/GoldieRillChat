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
import '../styles/message-editor.css';
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
  sidebarOpen = true,
  sidebarMode = 'chat'
}) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const dropZoneRef = useRef(null);
  const textareaRef = useRef(null);
  const localFileInputRef = useRef(null);
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);
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

  // 在组件挂载或重新渲染后设置正确的初始高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '100px';
    }
  }, []);

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

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

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

          /* 增强拖放区域样式 */
          .drag-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: all;
            transition: all 0.3s ease;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
          }

          .drag-overlay.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
          }

          .drag-icon {
            width: 100px;
            height: 100px;
            margin-bottom: 2rem;
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
            animation: pulse 1.5s infinite alternate;
          }

          .drag-icon svg {
            width: 100%;
            height: 100%;
            stroke: var(--primary);
            stroke-width: 1;
            fill: transparent;
          }

          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 0.7;
            }
            100% {
              transform: scale(1.1);
              opacity: 1;
            }
          }

          .drag-overlay .drag-text {
            font-size: 1.5rem;
            font-weight: 600;
            color: white;
            margin-bottom: 1rem;
            text-align: center;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          }

          .drag-overlay .drag-subtext {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.8);
            text-align: center;
            max-width: 400px;
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
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
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7 7m0 0l7-7m-7-7v18" />
            </svg>
          </button>
        </div>
      )}

      {/* 消息列表容器 */}
      <div
        id="chat-view-messages"
        className={`flex-1 overflow-y-auto p-4 ${isCompact ? 'compact-scroll' : ''} chat-view-messages`}
        style={{
          paddingBottom: isCompact ? '100px' : '140px',
          marginBottom: isCompact ? '60px' : '0px'
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="space-y-4 max-w-[1200px] mx-auto">
          {messages.map((message, index) => (
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
                            <div className="media-content flex flex-col">
                              {/* 先显示消息内容（如果有） */}
                              {message.content && (
                                <div className="mb-0">
                                  <MarkdownRenderer
                                    content={message.content || ''}
                                    isCompact={false}
                                    onCopyCode={(code) => {
                                      console.log('Code copied:', code);
                                    }}
                                    onLinkClick={(href) => {
                                      openUrl(href, true, true);
                                    }}
                                  />
                                </div>
                              )}
                              {/* 然后显示图片 */}
                              {message.files
                                .filter(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                                .map(file => renderMediaContent(file, handleImageClick))
                              }
                            </div>
                          ) : message.files?.some(file => 
                            file.name && file.name.match(/\.mp4$/i)
                          ) ? (
                            <div className="media-content flex flex-col">
                              {/* 先显示消息内容（如果有） */}
                              {message.content && (
                                <div className="mb-0">
                                  <MarkdownRenderer
                                    content={message.content || ''}
                                    isCompact={false}
                                    onCopyCode={(code) => {
                                      console.log('Code copied:', code);
                                    }}
                                    onLinkClick={(href) => {
                                      openUrl(href, true, true);
                                    }}
                                  />
                                </div>
                              )}
                              {/* 然后显示视频 */}
                              {message.files
                                .filter(file => file.name && file.name.match(/\.mp4$/i))
                                .map(file => {
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
                              {/* 先显示消息内容（如果有） */}
                              {message.content && (
                                <div className="mb-4">
                                  <MarkdownRenderer
                                    content={message.content || ''}
                                    isCompact={false}
                                    onCopyCode={(code) => {
                                      console.log('Code copied:', code);
                                    }}
                                    onLinkClick={(href) => {
                                      openUrl(href, true, true);
                                    }}
                                  />
                                </div>
                              )}
                              {/* 显示文件消息 */}
                              {message.files.map((file, index) => (
                                <div key={index} className="file-item">
                                  <span className="file-name">{file.name}</span>
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
                                      openUrl(href, true, true);
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
                      className={`btn btn-xs ${
                        currentBackground === message.files.find(file => 
                          file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                        )?.path 
                          ? 'btn-primary' 
                          : 'btn-ghost'
                      }`}
                      onClick={() => {
                        console.log('BG按钮点击，消息ID:', message.id);
                        // 获取第一个图片文件
                        const imageFile = message.files.find(file => 
                          file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                        );
                        
                        if (imageFile) {
                          // 使用 eventBus 切换背景
                          eventBus.toggleBackground(imageFile.path);
                        }
                      }}
                      title="设置/取消背景图片"
                    >
                      BG
                    </button>
                  )}
                  {/* 添加MBG按钮 - 只在视频消息下显示 */}
                  {message.files?.some(file => file.name && file.name.match(/\.mp4$/i)) && (
                    <button
                      className={`btn btn-xs ${
                        currentVideoBackground === message.files.find(file => 
                          file.name && file.name.match(/\.mp4$/i)
                        )?.path 
                          ? 'btn-primary' 
                          : 'btn-ghost'
                      }`}
                      onClick={() => {
                        console.log('MBG按钮点击，消息ID:', message.id);
                        // 获取第一个视频文件
                        const videoFile = message.files.find(file => 
                          file.name && file.name.match(/\.mp4$/i)
                        );
                        
                        if (videoFile) {
                          // 使用 eventBus 切换视频背景
                          eventBus.toggleBackground(videoFile.path, true);
                        }
                      }}
                      title="设置/取消视频背景"
                    >
                      MBG
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleCopyClick(message)}
                  >
                    {copiedMessageIds.has(message.id) ? "Copied" : "Copy"}
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
                      title="上移消息（按住Ctrl快速移到顶部）"
                      onClick={(e) => {
                        // 检查是否按住Ctrl键
                        if (e.ctrlKey) {
                          // 移动到最顶部（第一条消息之后）
                          moveMessage(message.id, 'top');
                        } else {
                          // 普通上移
                          moveMessage(message.id, 'up');
                        }
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
                      title="下移消息（按住Ctrl快速移到底部）"
                      onClick={(e) => {
                        // 检查是否按住Ctrl键
                        if (e.ctrlKey) {
                          // 移动到最底部（最后一条消息之前）
                          moveMessage(message.id, 'bottom');
                        } else {
                          // 普通下移
                          moveMessage(message.id, 'down');
                        }
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
          {/* 添加底部引用元素，用于滚动定位 */}
          <div ref={messagesEndRef} style={{ height: '1px', clear: 'both' }} />
        </div>
      </div>

      {/* 输入区域 */}
      {!editingMessage && (
        <div className={`absolute bottom-0 left-0 right-0 ${isCompact ? 'p-2 pointer-events-none bg-transparent' : 'p-4 bg-transparent'}`} style={{ 
          bottom: isCompact ? '63px' : '0px'
        }}>
          <div className={`${isCompact ? 'max-w-[300px] mx-auto pointer-events-auto' : 'max-w-[770px] mx-auto'}`}>
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
                  e.target.style.height = '100px'; // 重置为初始高度（3行文字高度）
                  const scrollHeight = Math.max(e.target.scrollHeight, 100);
                  e.target.style.height = `${scrollHeight}px`;
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
                    e.target.style.height = '100px'; // 保持3行高度一致性
                    e.target.style.overflowY = 'hidden';
                  }
                }}
                onPaste={(e) => handlePaste(e, currentConversation, setSelectedFiles, window.electron)}
                onContextMenu={handleContextMenu}
                placeholder="Send a message..."
                className={`textarea textarea-bordered w-full min-h-[100px] max-h-[480px] rounded-3xl resize-none pb-10 scrollbar-hide bg-transparent ${
                  isCompact ? 'text-sm shadow-lg' : ''
                }`}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  backgroundColor: 'transparent',
                  backdropFilter: 'blur(8px)'
                }}
                rows="2"
                ref={textareaRef}
              />
              {/* 左侧按钮容器 - 放置上传文件按钮 */}
              <div className="absolute bottom-3 left-[15px] flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => (externalFileInputRef || localFileInputRef).current?.click()}
                  title="上传文件"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
                  </svg>
                </button>
              </div>
              {/* 右侧按钮容器 - 保持发送按钮在右侧 */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
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

      {editingMessage &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 message-editor-backdrop" onClick={exitEditMode}></div>
            <div className="relative message-editor-container w-[90vw] max-w-[1200px] h-[80vh] flex flex-col">
              <div className="flex-none message-editor-toolbar flex items-center justify-between">
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

                  <div className="flex items-center gap-1 font-size-selector">
                    <button 
                      className="font-size-btn"
                      onClick={() => setFontSize(prev => Math.max(8, prev - 2))}
                    >
                      -
                    </button>
                    <span className="font-size-display">{fontSize}</span>
                    <button 
                      className="font-size-btn"
                      onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  className="close-btn"
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

              <div className="flex-none message-editor-actions flex justify-end gap-2">
                <button 
                  className="shader-btn"
                  onClick={exitEditMode}
                >
                  取消
                </button>
                <button 
                  className="shader-btn gold-save-btn"
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