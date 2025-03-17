import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Editor from "@monaco-editor/react";
import ReactAudioPlayer from 'react-audio-player';
import { MarkdownRenderer } from '../../shared/MarkdownRenderer';
import { shouldCollapseMessage, getMessageContentStyle } from '../utils/messageCollapse';
import '../styles/messages.css';
import { openUrl } from '../../../utils/browserUtils';
import { ExclamationIcon } from '../../shared/ExclamationIcon';
import { CODE_THEME_LIGHT, CODE_THEME_DARK, MESSAGE_STATES } from '../constants';
import TextareaAutosize from 'react-textarea-autosize';
import { ThumbUpIcon, ThumbDownIcon } from '../../shared/icons';
import '../../../styles/message-editor.css'; // 导入消息编辑器样式
import eventBus from '../../../components/ThreeBackground/utils/eventBus'; // 修正eventBus导入路径

// 添加TTS相关常量
const TTS_SERVER_URL = 'http://127.0.0.1:2047';

const SearchSources = ({ sources, openInBrowserTab }) => {
  const [showSources, setShowSources] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (showSources && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 计算列表宽度（320px）是否会超出右侧边界
      const willOverflowRight = buttonRect.left + 320 > viewportWidth;
      
      // 计算下方空间和上方空间
      const spaceBelow = viewportHeight - buttonRect.bottom - 8;
      const spaceAbove = buttonRect.top - 8;
      
      // 判断是否应该向上显示（当下方空间不足且上方空间足够时）
      const shouldShowAbove = spaceBelow < 300 && spaceAbove > 300;
      
      setPosition({
        // 如果应该向上显示，则定位到按钮上方
        top: shouldShowAbove ? buttonRect.top - 8 - 300 : buttonRect.bottom + 8,
        // 如果按钮在右侧，列表左对齐；如果按钮在左侧，列表右对齐
        left: willOverflowRight ? buttonRect.right - 320 : buttonRect.left
      });
    }
  }, [showSources]);

  // 处理链接点击
  const handleLinkClick = (url) => {
    openUrl(url, true, false);
    setShowSources(false); // 关闭弹窗
  };

  if (!sources || sources.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className="btn btn-xs btn-ghost bg-base-100 hover:bg-base-200"
        onClick={() => setShowSources(!showSources)}
      >
        {showSources ? '隐藏来源' : '查看来源'} ({sources.length})
      </button>
      {showSources && createPortal(
        <div 
          className="fixed bg-base-100 rounded-lg shadow-lg border border-base-300 p-2"
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            width: '320px',
            height: '300px',
            overflowY: 'auto',
            zIndex: 9999
          }}
        >
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-base-content/60 flex-none">[{index + 1}]</span>
                  <div className="flex-1">
                    <a
                      href={source.link}
                      className="link link-primary hover:link-primary-focus block"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick(source.link);
                      }}
                    >
                      {source.title}
                    </a>
                    <div className="text-xs text-base-content/70 mt-1">
                      {source.snippet}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const MessageItem = ({
  message,
  selectedModel,
  editingMessageId,
  editContent,
  setEditContent,
  handleEditStart,
  handleEditCancel,
  handleEditSave,
  handleDeleteMessage,
  handleRetry,
  handleStop,
  handleHistoryNavigation,
  isCollapsed,
  onToggleCollapse,
  onImageClick,
  openFileLocation,
  openInBrowserTab,
  currentConversation,
  setMessages,
  messages,
  handleThumbUp,
  handleThumbDown,
  isCompact = false,
  onSendToEditor,
}) => {
  // 添加推理过程折叠状态
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [isCopied, setIsCopied] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const editorRef = useRef(null);
  
  // 添加处理搜索图片的状态
  const [processedSearchImages, setProcessedSearchImages] = useState([]);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  // 添加背景状态跟踪
  const [currentBackground, setCurrentBackground] = useState(null);
  const [currentVideoBackground, setCurrentVideoBackground] = useState(null);
  
  // 添加TTS播放相关状态
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [ttsSessionId, setTtsSessionId] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('longxiaochun');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isPlayingLocked, setIsPlayingLocked] = useState(false); // 添加播放锁定状态
  const voiceSelectorRef = useRef(null);
  const ttsIntervalRef = useRef(null);
  const audioQueueRef = useRef([]); // 添加音频队列引用
  const currentPlayingAudioRef = useRef(null); // 添加当前播放音频引用
  
  // 添加TTS流式播放相关状态
  const [lastPlayedText, setLastPlayedText] = useState('');
  const [isStreamTtsEnabled, setIsStreamTtsEnabled] = useState(false);
  const lastContentRef = useRef('');
  
  // 获取消息内容的样式
  const contentStyle = getMessageContentStyle(isCollapsed);
  
  // 添加eventBus监听
  useEffect(() => {
    // 监听背景变化
    const handleBackgroundChange = (data) => {
      if (data.isVideo) {
        setCurrentVideoBackground(data.path);
      } else {
        setCurrentBackground(data.path);
      }
    };
    
    eventBus.on('backgroundChange', handleBackgroundChange);
    
    return () => {
      eventBus.off('backgroundChange', handleBackgroundChange);
    };
  }, []);
  
  // 加载可用的TTS音色
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch(`${TTS_SERVER_URL}/api/tts/voices`);
        const data = await response.json();
        if (data.status === 'success' && data.voices) {
          setAvailableVoices(data.voices);
        }
      } catch (error) {
        console.error('获取TTS音色失败:', error);
      }
    };
    
    fetchVoices();
  }, []);
  
  // 清理TTS相关资源
  useEffect(() => {
    // 组件卸载时清理资源
    return () => {
      // 停止定时器
      if (ttsIntervalRef.current) {
        clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = null;
      }
      
      // 清空音频队列
      audioQueueRef.current = [];
      
      // 停止当前播放的音频
      if (currentPlayingAudioRef.current) {
        currentPlayingAudioRef.current.pause();
        currentPlayingAudioRef.current.onended = null;
        currentPlayingAudioRef.current.onerror = null;
        currentPlayingAudioRef.current = null;
      }
      
      // 如果有正在进行的TTS会话，尝试停止它
      if (ttsSessionId) {
        fetch(`${TTS_SERVER_URL}/api/tts/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: ttsSessionId
          }),
        }).catch(err => console.error('停止TTS会话失败:', err));
      }
    };
  }, [ttsSessionId]);
  
  // 处理点击外部关闭音色选择器
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (voiceSelectorRef.current && !voiceSelectorRef.current.contains(event.target)) {
        setShowVoiceSelector(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 检测并处理消息中的file://链接
  useEffect(() => {
    //console.log("MessageItem useEffect - 检查消息内容是否包含file://链接");
    
    if (message.searchImages && message.searchImages.length > 0) {
      console.log("消息已包含searchImages:", message.searchImages.length, "张图片");
      // 预处理searchImages中的图片URL，确保它们有正确的格式
      const processedImages = message.searchImages.map(img => {
        // 创建新对象，避免修改原始对象
        const processedImg = { ...img };
        
        // 判断是否已有本地文件
        const hasLocalFile = img.url && typeof img.url === 'string' && img.url.startsWith('file://');
        
        if (hasLocalFile) {
          // 如果url是本地文件，使用local-file://格式
          processedImg.src = img.url.replace('file://', 'local-file://');
          processedImg.isLocal = true;
          //console.log(`处理本地图片URL->src: ${processedImg.src}`);
        } else if (img.src && img.src.startsWith('file://')) {
          // 如果src是本地文件，也使用local-file://格式
          processedImg.src = img.src.replace('file://', 'local-file://');
          processedImg.isLocal = true;
          //console.log(`处理本地图片src: ${processedImg.src}`);
        } else {
          // 如果不是本地文件
          processedImg.src = img.src || img.url;
          processedImg.isLocal = false;
          //console.log(`处理网络图片: ${processedImg.src}`);
        }
        
        return processedImg;
      });
      
      //console.log("处理后的searchImages:", processedImages);
      setProcessedSearchImages(processedImages);
    }
    
    if (message.content && message.content.includes('file://')) {
      // 使用正则表达式找出所有Markdown格式的图片链接
      const imgRegex = /!\[(.*?)\]\((file:\/\/[^)]+)\)/g;
      let match;
      let searchImages = [];
      
      // 收集所有file://开头的图片URL
      while ((match = imgRegex.exec(message.content)) !== null) {
        const [fullMatch, altText, imgUrl] = match;
        
        // 将file://转换为local-file://以便在Electron中显示
        const localFileUrl = imgUrl.replace('file://', 'local-file://');
        
        searchImages.push({
          src: localFileUrl,
          title: altText || '搜索图片',
          isLocal: true
        });
      }
      
      if (searchImages.length > 0) {
        console.log("从消息内容中提取到的searchImages:", searchImages);
        setProcessedSearchImages(searchImages);
        
        // 如果消息中没有searchImages属性，添加一个
        if (!message.searchImages) {
          // 深拷贝消息对象
          const updatedMessage = {...message, searchImages};
          
          // 更新消息列表中的这条消息
          if (setMessages && messages) {
            const updatedMessages = messages.map(msg => 
              msg.id === message.id ? updatedMessage : msg
            );
            setMessages(updatedMessages);
          }
        }
      }
    }
  }, [message.content, message.searchImages]);

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

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // 渲染媒体文件
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
          </div>
          <video
            src={`local-file://${file.path}`}
            controls
            className="rounded-lg max-w-full"
            style={{ maxHeight: '300px' }}
            preload="metadata"
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

  // 添加视频消息渲染函数
  const renderVideoMessage = (message) => {
    const videoFile = message.files?.find(file => file.type === 'video/mp4');
    if (!videoFile) return null;

    return (
      <div className="video-container flex flex-col">
        {/* 先显示消息内容（如果有） */}
        {message.content && (
          <div className="mb-4">
            <MarkdownRenderer
              content={message.content || ''}
              isCompact={false}
              searchImages={message.searchImages || processedSearchImages || []}
              onCopyCode={(code) => {
                console.log('Code copied:', code);
                if (window.electron) {
                  window.electron.copyToClipboard(code);
                } else {
                  navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                }
              }}
              onLinkClick={(href) => {
                if (href.startsWith('http://') || href.startsWith('https://')) {
                  openInBrowserTab(href);
                }
              }}
            />
          </div>
        )}
        <div className="video-info mb-4">
          <div className="font-medium mb-2">提示词：{message.originalPrompt}</div>
          <div className="text-sm opacity-70">
            <span className="mr-4">模型：{message.model}</span>
            <span>种子：{message.seed}</span>
          </div>
        </div>
        <div className="video-player relative rounded-lg overflow-hidden bg-base-200">
          <video
            controls
            className="w-full max-h-[70vh] object-contain"
            preload="metadata"
          >
            <source src={`local-file://${videoFile.path}`} type="video/mp4" />
            您的浏览器不支持视频播放。
          </video>
        </div>
        <div className="video-actions mt-2 flex justify-end gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => openFileLocation(videoFile)}
            title="打开文件位置"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            <span className="ml-1">打开位置</span>
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => handleRetry(message.id)}
            title="重新生成"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="ml-1">重新生成</span>
          </button>
        </div>
      </div>
    );
  };

  // 添加音频消息渲染函数
  const renderAudioMessage = (message) => {
    const audioFile = message.files?.find(file => file.type && file.type.startsWith('audio/'));
    if (!audioFile) return null;

    return (
      <div className="audio-message flex flex-col">
        {/* 先显示消息内容（如果有） */}
        {message.content && (
          <div className="mb-4">
            <MarkdownRenderer
              content={message.content || ''}
              isCompact={false}
              searchImages={message.searchImages || processedSearchImages || []}
              onCopyCode={(code) => {
                console.log('Code copied:', code);
                if (window.electron) {
                  window.electron.copyToClipboard(code);
                } else {
                  navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                }
              }}
              onLinkClick={(href) => {
                if (href.startsWith('http://') || href.startsWith('https://')) {
                  openInBrowserTab(href);
                }
              }}
            />
          </div>
        )}
        
        {/* 显示搜索图片 */}
        {message.searchImages && message.searchImages.length > 0 && 
          renderSearchImages(message.searchImages, onImageClick)
        }
        
        <div className="audio-info mb-4">
          <div className="font-medium mb-2">文本：{message.audioParams?.text}</div>
          <div className="text-sm opacity-70">
            <span className="mr-4">音色：{message.audioParams?.voice}</span>
            <span className="mr-4">音量：{message.audioParams?.volume}</span>
            <span>语速：{message.audioParams?.speed}</span>
          </div>
        </div>
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

  // 添加处理搜索图片的函数
  const renderSearchImages = (searchImages, onImageClick) => {
    //console.log('renderSearchImages调用，图片数量:', searchImages?.length);
    //console.log('searchImages详细信息:', JSON.stringify(searchImages, null, 2));
    
    if (!searchImages || searchImages.length === 0) {
      console.log('没有搜索图片可显示');
      return null;
    }
    
    // 处理图片数组，确保优先使用本地图片
    const processedImages = searchImages.map(img => {
      // 创建一个新对象，避免修改原始对象
      const processedImg = { ...img };
      
      // 判断是否已有本地文件
      const hasLocalFile = img.url && typeof img.url === 'string' && img.url.startsWith('file://');
      
      if (hasLocalFile) {
        // 如果有本地文件，转换为local-file://格式
        processedImg.src = img.url.replace('file://', 'local-file://');
        processedImg.isLocal = true;
        //console.log(`使用本地图片: ${processedImg.src}, 原始URL: ${img.originalUrl || '无'}`);
      } else if (img.src && img.src.startsWith('file://')) {
        // 如果src是本地文件，也转换为local-file://格式
        processedImg.src = img.src.replace('file://', 'local-file://');
        processedImg.isLocal = true;
        console.log(`使用本地图片: ${processedImg.src}, 原始URL: ${img.originalUrl || '无'}`);
      } else {
        // 如果没有本地文件，使用原始URL
        processedImg.src = img.src || img.url;
        processedImg.isLocal = false;
      }
      
      return processedImg;
    });
    
    // 检查图片URL的格式
    processedImages.forEach((img, index) => {
      //console.log(`图片 ${index} 的URL:`, img.src);
      //console.log(`图片 ${index} 是否本地:`, img.isLocal ? '是' : '否');
      //console.log(`图片 ${index} 的描述:`, img.description || img.title);
    });
    
    return (
      <div className="search-images-container mt-3 border-t pt-3 border-base-300">
        <h3 className="text-base font-medium mb-2">搜索相关图片：</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {processedImages.map((img, index) => (
            <div key={`search-img-${index}`} className="flex flex-col">
              <img
                src={img.src}
                alt={img.title || img.description || '搜索图片'}
                className={`w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover ${img.isLocal ? 'border-2 border-primary' : ''}`}
                style={{ maxHeight: '200px' }}
                onClick={(e) => {
                  handleImageClick(e, img);
                }}
                loading="lazy"
                onError={(e) => {
                  console.error('图片加载错误:', img.src);
                  
                  // 如果本地图片加载失败，尝试使用原始网络链接
                  if (img.isLocal && img.originalUrl) {
                    console.log('本地图片加载失败，尝试加载原始URL:', img.originalUrl);
                    e.target.src = img.originalUrl;
                    return;
                  }
                  
                  // 如果还是失败，显示错误占位图
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgMTNoLTJWN2gydjZabTAgNGgtMnYtMmgydjJabTktNVYxOEE1IDUgMCAwIDEgMTcgMjJINy4zM0ExMC42MSAxMC42MSAwIDAgMSAyIDEzLjQzQzIgOC4wNSA2LjA0IDQgMTAuNCA0YzIuMjUgMCA0LjI1Ljg2IDUuNiAyLjJMMTUuNTMgNUgyMHYzaC0zLjUzYTguNDYgOC40NiAwIDAgMSAtMi4zLTJBNi41MyA2LjUzIDAgMCAwIDEwLjRBNi41IDYuNSAwIDAgMCA0IDEzLjU5QzcuMDMgMTMuNjggOS43NiAxNiAxMCAxOWE4LjM4IDguMzggMCAwIDAgNC40LTMuMjNBNyA3IDAgMCAxIDIxIDEyWiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+'
                  e.target.style.padding = '10px';
                  e.target.style.backgroundColor = 'rgba(0,0,0,0.1)';
                }}
              />
              {(img.title || img.description) && (
                <p className="text-xs mt-1 text-base-content/80 line-clamp-2">
                  {img.title || img.description}
                  {img.isLocal && <span className="text-primary ml-1">[本地]</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 处理图片点击
  const handleImageClick = (e, img) => {
    console.log('图片被点击:', img);
    e.preventDefault();
    e.stopPropagation();
    
    // 如果是本地图片，需要处理路径
    if (img.isLocal && img.src && img.src.startsWith('local-file://')) {
      // 创建一个新对象，避免修改原始对象
      const processedImg = { ...img };
      
      // 处理路径，确保中文路径不会有问题
      let localPath = img.src.replace('local-file://', '');
      
      // 解码 URL 编码的路径
      try {
        localPath = decodeURIComponent(localPath);
      } catch (e) {
        console.error('解码路径失败:', e);
      }
      
      // 将路径格式标准化（处理斜杠方向）
      localPath = localPath.replace(/\\/g, '/');
      
      console.log('处理后的图片路径:', localPath);
      
      // 使用onImageClick回调函数，将图片传递给MessageList的handleImageClick
      if (typeof onImageClick === 'function') {
        // 创建一个规范的文件对象，以便MessageList的handleImageClick可以处理
        onImageClick(e, {
          path: localPath,
          name: img.title || '搜索图片',
          type: 'image'
        });
      }
    } else if (img.url) {
      // 对于非本地图片（网络图片），也使用onImageClick回调
      if (typeof onImageClick === 'function') {
        onImageClick(e, {
          path: img.url.replace('file://', ''),
          name: img.title || '搜索图片',
          type: 'image'
        });
      }
    }
  };

  // 处理复制消息内容
  const handleCopyMessage = (messageId, content) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    
    // 1秒后重置状态
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 1000);
  };

  // 添加MessageStatus组件显示消息状态
  const MessageStatus = ({ message, messageState }) => {
    // 确定消息状态
    if (message.generating && messageState === MESSAGE_STATES.THINKING) {
      return (
        <div className="flex items-center mt-2">
          <div className="loading loading-spinner loading-xs mr-2"></div>
          <span className="text-sm text-opacity-70">思考中...</span>
        </div>
      );
    } else if (message.generating && messageState === MESSAGE_STATES.SEARCHING) {
      return (
        <div className="flex items-center mt-2">
          <div className="loading loading-spinner loading-xs mr-2"></div>
          <span className="text-sm text-opacity-70">搜索网络中...</span>
        </div>
      );
    } else if (messageState === MESSAGE_STATES.ERROR) {
      return (
        <div className="flex items-center mt-2">
          <ExclamationIcon className="w-4 h-4 mr-2 text-error" />
          <span className="text-sm text-error">出错了</span>
        </div>
      );
    }
    
    return null;
  };

  // 监听消息生成，实现流式TTS播报
  useEffect(() => {
    // 只处理正在生成的AI助手消息
    if (message.type === 'assistant' && message.generating && isStreamTtsEnabled) {
      // 获取新增内容
      const currentContent = message.content || '';
      const lastContent = lastContentRef.current || '';
      
      // 如果内容有更新，发送新内容进行TTS合成
      if (currentContent.length > lastContent.length) {
        const newContent = currentContent.substring(lastContent.length);
        console.log('检测到新内容:', newContent);
        
        // 更新上次播放的文本
        lastContentRef.current = currentContent;
        
        // 检查是否是完整的句子
        const isCompleteSentence = /[。！？\.!?]$/.test(newContent);
        
        // 积累足够长的文本或遇到句子结束符号时进行播报
        if (newContent.length >= 10 || isCompleteSentence) {
          // 返回清理函数，确保资源在组件更新前被清理
          const cleanup = streamTtsPlayback(newContent);
          if (cleanup && typeof cleanup === 'function') {
            return cleanup;
          }
        }
      }
    }
    
    // 如果消息停止生成但流式TTS开启中，确保最后的内容也能播放
    if (message.type === 'assistant' && !message.generating && isStreamTtsEnabled) {
      const currentContent = message.content || '';
      const lastContent = lastContentRef.current || '';
      
      if (currentContent.length > lastContent.length) {
        const newContent = currentContent.substring(lastContent.length);
        const cleanup = streamTtsPlayback(newContent);
        lastContentRef.current = currentContent;
        
        // 返回清理函数，确保资源在组件更新前被清理
        if (cleanup && typeof cleanup === 'function') {
          const originalCleanup = cleanup;
          return () => {
            originalCleanup();
            // 消息生成结束，关闭流式TTS
            setIsStreamTtsEnabled(false);
          };
        }
      }
      
      // 消息生成结束，关闭流式TTS
      setIsStreamTtsEnabled(false);
    }
    
    // 提供空的清理函数以避免react hooks警告
    return () => {};
  }, [message.content, message.generating, isStreamTtsEnabled]);
  
  // 实现流式TTS播报
  const streamTtsPlayback = async (text) => {
    if (!text || text.trim() === '') return;
    
    try {
      let sessionId = ttsSessionId;
      
      // 如果没有会话ID，创建新会话
      if (!sessionId) {
        // 设置状态
        setIsTtsPlaying(true);
        setIsPlayingLocked(true); // 设置播放锁定状态
        
        // 创建新会话
        const newSessionId = await createTtsSession();
        if (!newSessionId) {
          // 如果创建会话失败，直接返回
          setIsStreamTtsEnabled(false);
          setIsTtsPlaying(false);
          setIsPlayingLocked(false);
          return;
        }
        
        // 立即更新本地变量，避免异步状态更新的问题
        sessionId = newSessionId;
        
        // 同时更新状态
        setTtsSessionId(newSessionId);
        
        // 确保会话ID被正确设置
        console.log('创建新TTS会话:', newSessionId);
      }
      
      try {
        // 确保使用正确的会话ID（本地变量，而不是状态）
        if (!sessionId) {
          console.error('无法获取有效的会话ID，取消合成请求');
          setIsPlayingLocked(false);
          return;
        }
        
        // 发送文本进行合成
        const synthesizeResponse = await fetch(`${TTS_SERVER_URL}/api/tts/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId, // 使用本地变量
            text: text,
            is_complete: false
          }),
        });
        
        // 检查响应是否成功
        if (!synthesizeResponse.ok) {
          const errorText = await synthesizeResponse.text().catch(() => '未知错误');
          console.error(`TTS合成错误 (${synthesizeResponse.status}): ${errorText}`);
          
          // 如果是会话未启动错误，尝试重新创建会话
          if (errorText.includes('not been started') || errorText.includes('会话不存在')) {
            console.log('TTS会话不存在，尝试重新创建...');
            await stopTtsPlayback(); // 先清理现有资源
            
            // 重新创建会话
            const newSessionId = await createTtsSession();
            if (newSessionId) {
              // 更新本地变量和状态
              sessionId = newSessionId;
              setTtsSessionId(newSessionId);
              console.log('已重新创建TTS会话:', newSessionId);
              
              // 再次尝试发送合成请求
              const retryResponse = await fetch(`${TTS_SERVER_URL}/api/tts/synthesize`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  session_id: newSessionId,
                  text: text,
                  is_complete: false
                }),
              });
              
              if (!retryResponse.ok) {
                const retryErrorText = await retryResponse.text().catch(() => '未知错误');
                console.error(`重试TTS合成错误 (${retryResponse.status}): ${retryErrorText}`);
                setIsPlayingLocked(false);
                return;
              }
            } else {
              console.error('重新创建TTS会话失败');
              setIsPlayingLocked(false);
              return;
            }
          } else {
            // 其他错误则直接返回
            setIsPlayingLocked(false);
            return;
          }
        }
        
        // 获取音频 - 设置一个仅执行一次的超时
        let audioCheckTimeout = setTimeout(async () => {
          try {
            // 再次检查会话ID是否有效
            if (!sessionId) {
              console.log('没有有效的会话ID，取消获取音频');
              setIsPlayingLocked(false);
              return;
            }
            
            const audioResponse = await fetch(`${TTS_SERVER_URL}/api/tts/audio/${sessionId}`);
            
            // 检查Response的内容类型
            const contentType = audioResponse.headers.get('content-type');
            
            // 如果是JSON响应，处理状态信息
            if (contentType && contentType.includes('application/json')) {
              const jsonData = await audioResponse.json();
              if (jsonData.status === 'success' && jsonData.message === '暂无音频数据') {
                // 没有新的音频数据，不再继续轮询
                console.log('暂无音频数据，结束检查');
                return;
              }
              
              // 如果成功获取到音频文件路径
              if (jsonData.status === 'success' && jsonData.file_url) {
                // 创建音频URL
                const serverUrl = new URL(TTS_SERVER_URL);
                const audioUrl = `${serverUrl.origin}${jsonData.file_url}`;
                console.log('流式TTS获取到音频:', audioUrl);
                
                // 添加到播放队列
                addToAudioQueue(audioUrl);
              }
            }
          } catch (error) {
            console.error('获取流式TTS音频失败:', error);
            setIsPlayingLocked(false);
          }
        }, 500);
        
        // 确保超时会被清理
        return () => {
          if (audioCheckTimeout) {
            clearTimeout(audioCheckTimeout);
            audioCheckTimeout = null;
          }
        };
      } catch (error) {
        console.error('合成请求发送失败:', error);
        setIsPlayingLocked(false);
      }
    } catch (error) {
      console.error('流式TTS播放失败:', error);
      setIsTtsPlaying(false);
      setIsStreamTtsEnabled(false);
      setIsPlayingLocked(false);
    }
  };
  
  // 停止TTS播放
  const stopTtsPlayback = async () => {
    try {
      // 先获取当前会话ID，避免状态更新导致的不一致
      const currentSessionId = ttsSessionId;
      
      // 停止任何现有的定时器
      if (ttsIntervalRef.current) {
        clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = null;
      }
      
      // 清空音频队列
      audioQueueRef.current = [];
      
      // 停止当前播放的音频
      if (currentPlayingAudioRef.current) {
        currentPlayingAudioRef.current.pause();
        currentPlayingAudioRef.current.onended = null;
        currentPlayingAudioRef.current.onerror = null;
        currentPlayingAudioRef.current = null;
      }
      
      // 如果有会话ID，则通知服务器停止TTS
      if (currentSessionId) {
        try {
          console.log('停止TTS会话:', currentSessionId);
          const response = await fetch(`${TTS_SERVER_URL}/api/tts/stop`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: currentSessionId
            }),
          });
          
          // 检查响应
          if (response.ok) {
            console.log('TTS会话已停止');
          } else {
            const errorText = await response.text().catch(() => '未知错误');
            console.error(`停止TTS会话失败 (${response.status}): ${errorText}`);
          }
        } catch (error) {
          console.error('停止TTS会话请求失败:', error);
        }
      } else {
        console.log('没有活跃的TTS会话需要停止');
      }
      
      // 重置状态
      setIsTtsPlaying(false);
      setTtsSessionId(null);
      setIsPlayingLocked(false);
    } catch (error) {
      console.error('停止TTS播放失败:', error);
      // 即使出错也重置状态
      setIsTtsPlaying(false);
      setTtsSessionId(null);
      setIsPlayingLocked(false);
    }
  };
  
  // 创建TTS会话
  const createTtsSession = async () => {
    console.log('开始创建TTS会话，选择的音色:', selectedVoice);
    
    try {
      // 发起新的TTS会话
      const startResponse = await fetch(`${TTS_SERVER_URL}/api/tts/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: selectedVoice,
          format: 'pcm'  // 使用pcm格式，而不是mp3
        }),
      });
      
      // 检查HTTP错误
      if (!startResponse.ok) {
        const errorText = await startResponse.text().catch(() => '未知错误');
        console.error(`TTS服务器错误 (${startResponse.status}): ${errorText}`);
        throw new Error(`服务器返回 ${startResponse.status} 错误: ${errorText}`);
      }
      
      const startData = await startResponse.json();
      if (startData.status !== 'success') {
        throw new Error(startData.message || '启动TTS会话失败');
      }
      
      // 返回会话ID，但不立即设置状态
      // 调用者应该保存会话ID到本地变量并手动设置状态
      console.log('TTS会话创建成功:', startData.session_id);
      return startData.session_id;
    } catch (error) {
      console.error('创建TTS会话失败:', error);
      
      // 清理任何现有的状态
      setIsTtsPlaying(false);
      setIsPlayingLocked(false);
      
      // 显示一个简短的错误提示
      if (window.electron && window.electron.showNotification) {
        window.electron.showNotification('语音合成错误', error.message || '无法启动语音合成');
      } else {
        alert(`语音合成错误: ${error.message || '无法启动语音合成'}`);
      }
      return null;
    }
  };
  
  // 启用流式TTS
  const enableStreamTts = async () => {
    try {
      // 重置状态
      lastContentRef.current = '';
      setLastPlayedText('');
      
      // 停止任何现有的播放
      await stopTtsPlayback();
      
      // 开启流式TTS状态
      setIsStreamTtsEnabled(true);
      setIsTtsPlaying(true);
      setIsPlayingLocked(true);
      
      // 创建新会话
      console.log('开始创建流式TTS会话');
      const sessionId = await createTtsSession();
      if (!sessionId) {
        console.error('无法创建TTS会话，禁用流式TTS');
        setIsStreamTtsEnabled(false);
        setIsTtsPlaying(false);
        setIsPlayingLocked(false);
        return false;
      }
      
      // 立即设置会话ID
      setTtsSessionId(sessionId);
      console.log('成功创建流式TTS会话:', sessionId);
      
      // 向服务器发送初始化请求
      try {
        const initResponse = await fetch(`${TTS_SERVER_URL}/api/tts/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            text: ' ', // 发送一个空格作为初始文本，确保会话被正确初始化
            is_complete: false
          }),
        });
        
        if (!initResponse.ok) {
          const errorText = await initResponse.text().catch(() => '未知错误');
          console.error(`流式TTS初始化错误 (${initResponse.status}): ${errorText}`);
          
          // 如果初始化失败，禁用流式TTS
          await stopTtsPlayback();
          setIsStreamTtsEnabled(false);
          return false;
        }
        
        console.log('流式TTS初始化成功');
        return true;
      } catch (error) {
        console.error('流式TTS初始化请求失败:', error);
        await stopTtsPlayback();
        setIsStreamTtsEnabled(false);
        return false;
      }
    } catch (error) {
      console.error('启用流式TTS失败:', error);
      setIsStreamTtsEnabled(false);
      setIsTtsPlaying(false);
      setIsPlayingLocked(false);
      return false;
    }
  };

  // 关闭流式TTS
  const disableStreamTts = async () => {
    console.log('正在关闭流式TTS...');
    setIsStreamTtsEnabled(false);
    
    // 重置流式TTS的记忆状态
    lastContentRef.current = '';
    setLastPlayedText('');
    
    // 停止TTS会话和清理资源
    await stopTtsPlayback();
    console.log('流式TTS已关闭');
  };
  
  // 添加TTS播放功能
  const startTtsPlayback = async (text) => {
    if (!text || text.trim() === '') return;
    
    try {
      // 设置播放状态
      setIsTtsPlaying(true);
      setIsPlayingLocked(true);
      
      // 清空音频队列
      audioQueueRef.current = [];
      
      // 停止当前播放的音频
      if (currentPlayingAudioRef.current) {
        currentPlayingAudioRef.current.pause();
        currentPlayingAudioRef.current.onended = null;
        currentPlayingAudioRef.current.onerror = null;
        currentPlayingAudioRef.current = null;
      }
      
      // 清除现有的定时器
      if (ttsIntervalRef.current) {
        clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = null;
      }
      
      // 创建新的TTS会话
      const sessionId = await createTtsSession();
      if (!sessionId) {
        // 如果创建会话失败，重置状态
        setIsTtsPlaying(false);
        setIsPlayingLocked(false);
        return;
      }
      
      // 设置会话ID - 使用本地变量，避免状态更新的异步问题
      setTtsSessionId(sessionId);
      
      // 发送文本进行合成
      try {
        const synthesizeResponse = await fetch(`${TTS_SERVER_URL}/api/tts/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId, // 使用本地变量而不是状态
            text: text,
            is_complete: true
          }),
        });
        
        if (!synthesizeResponse.ok) {
          const errorText = await synthesizeResponse.text().catch(() => '未知错误');
          console.error(`TTS合成错误 (${synthesizeResponse.status}): ${errorText}`);
          
          // 如果是会话错误，尝试重新创建
          if (errorText.includes('not been started') || errorText.includes('会话不存在')) {
            console.log('TTS会话不存在，尝试重新创建...');
            await stopTtsPlayback(); // 先清理现有资源
            
            // 重新创建会话
            const newSessionId = await createTtsSession();
            if (newSessionId) {
              setTtsSessionId(newSessionId);
              
              // 再次尝试发送合成请求
              const retryResponse = await fetch(`${TTS_SERVER_URL}/api/tts/synthesize`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  session_id: newSessionId,
                  text: text,
                  is_complete: true
                }),
              });
              
              if (!retryResponse.ok) {
                const retryErrorText = await retryResponse.text().catch(() => '未知错误');
                console.error(`重试TTS合成错误 (${retryResponse.status}): ${retryErrorText}`);
                setIsTtsPlaying(false);
                setIsPlayingLocked(false);
                return;
              }
              
              // 使用新的会话ID设置轮询
              startPollingAudio(newSessionId);
              return;
            }
          }
          
          // 其他错误则重置状态
          setIsTtsPlaying(false);
          setIsPlayingLocked(false);
          return;
        }
        
        const synthesizeData = await synthesizeResponse.json();
        if (synthesizeData.status !== 'success') {
          throw new Error(synthesizeData.message || '合成文本失败');
        }
        
        // 开始轮询音频
        startPollingAudio(sessionId);
      } catch (error) {
        console.error('合成请求发送失败:', error);
        setIsTtsPlaying(false);
        setIsPlayingLocked(false);
        return;
      }
    } catch (error) {
      console.error('TTS播放失败:', error);
      setIsTtsPlaying(false);
      setIsPlayingLocked(false);
    }
  };
  
  // 轮询音频数据的函数
  const startPollingAudio = (sessionId) => {
    if (!sessionId) {
      console.error('无法开始轮询：会话ID为空');
      setIsTtsPlaying(false);
      setIsPlayingLocked(false);
      return;
    }
    
    // 设置定时获取音频数据
    let hasReceivedAudio = false;
    let pollCount = 0;
    const MAX_POLLS = 60; // 最多轮询30秒（60次，每次500ms）
    
    ttsIntervalRef.current = setInterval(async () => {
      try {
        // 检查会话ID是否有效
        if (!sessionId) {
          console.log('TTS会话ID无效，停止轮询');
          clearInterval(ttsIntervalRef.current);
          ttsIntervalRef.current = null;
          if (!hasReceivedAudio) {
            setIsTtsPlaying(false);
            setIsPlayingLocked(false);
          }
          return;
        }
        
        // 增加轮询计数
        pollCount++;
        
        // 如果超过最大轮询次数，停止轮询
        if (pollCount >= MAX_POLLS) {
          console.log('超过最大轮询次数，停止轮询');
          clearInterval(ttsIntervalRef.current);
          ttsIntervalRef.current = null;
          if (!hasReceivedAudio) {
            setIsTtsPlaying(false);
            setIsPlayingLocked(false);
          }
          return;
        }
        
        const audioResponse = await fetch(`${TTS_SERVER_URL}/api/tts/audio/${sessionId}`);
        
        // 检查Response的内容类型
        const contentType = audioResponse.headers.get('content-type');
        
        // 如果是JSON响应，处理状态信息
        if (contentType && contentType.includes('application/json')) {
          const jsonData = await audioResponse.json();
          
          // 处理已完成状态 - 服务端已完成所有合成
          if (jsonData.status === 'success' && jsonData.message === '合成已完成' && hasReceivedAudio) {
            console.log('TTS合成已完成，停止轮询');
            clearInterval(ttsIntervalRef.current);
            ttsIntervalRef.current = null;
            return;
          }
          
          if (jsonData.status === 'success' && jsonData.message === '暂无音频数据') {
            // 没有新的音频数据，继续等待
            console.log(`轮询 ${pollCount}/${MAX_POLLS}: 暂无音频数据`);
            return;
          }
          
          // 如果成功获取到音频文件路径
          if (jsonData.status === 'success' && jsonData.file_url) {
            hasReceivedAudio = true;
            
            // 创建音频URL
            const serverUrl = new URL(TTS_SERVER_URL);
            const audioUrl = `${serverUrl.origin}${jsonData.file_url}`;
            console.log('获取到音频文件:', audioUrl);
            
            // 添加到播放队列
            addToAudioQueue(audioUrl);
          }
        }
      } catch (error) {
        console.error('获取TTS音频失败:', error);
        // 错误计数，连续错误超过3次则停止轮询
        pollCount += 3;
      }
    }, 500);
  };
  
  // 处理TTS播放按钮点击
  const handleTtsPlayback = async () => {
    if (isTtsPlaying) {
      // 如果当前正在播放，则停止
      await stopTtsPlayback();
      
      // 如果流式TTS正在运行，也停止它
      if (isStreamTtsEnabled) {
        setIsStreamTtsEnabled(false);
      }
    } else {
      // 如果消息正在生成中，使用流式TTS
      if (message.generating) {
        // 尝试启用流式TTS
        const success = await enableStreamTts();
        if (!success) {
          console.error('启用流式TTS失败');
          // 可以显示一个简短的错误提示
          if (window.electron && window.electron.showNotification) {
            window.electron.showNotification('语音合成错误', '无法启动流式语音合成');
          }
        }
      } else {
        // 否则使用普通TTS播放
        startTtsPlayback(message.content);
      }
    }
  };
  
  // 处理音色选择
  const handleVoiceSelect = (voiceId) => {
    setSelectedVoice(voiceId);
    setShowVoiceSelector(false);
  };

  // 播放音频函数 - 处理队列
  const playNextAudio = () => {
    // 如果有正在播放的音频，先停止
    if (currentPlayingAudioRef.current) {
      currentPlayingAudioRef.current.pause();
      currentPlayingAudioRef.current.onended = null;
      currentPlayingAudioRef.current.onerror = null;
      currentPlayingAudioRef.current = null;
    }
    
    // 如果队列为空，重置状态
    if (!audioQueueRef.current || audioQueueRef.current.length === 0) {
      console.log('音频队列为空，停止播放');
      setIsTtsPlaying(false);
      setIsPlayingLocked(false);
      return;
    }
    
    // 从队列中取出下一个音频URL
    const nextAudioUrl = audioQueueRef.current.shift();
    if (!nextAudioUrl) {
      console.log('从队列中取出的音频URL为空');
      setIsTtsPlaying(false);
      setIsPlayingLocked(false);
      return;
    }
    
    console.log('开始播放音频:', nextAudioUrl);
    const audio = new Audio(nextAudioUrl);
    
    // 设置音频结束事件
    audio.onended = () => {
      console.log('音频播放完成，检查队列中是否有下一段');
      
      // 检查是否还有音频在队列中
      if (audioQueueRef.current && audioQueueRef.current.length > 0) {
        // 继续播放下一个
        console.log(`队列中还有 ${audioQueueRef.current.length} 段音频待播放`);
        playNextAudio();
      } else {
        // 队列为空，重置状态
        console.log('音频播放队列已清空，重置播放状态');
        setIsTtsPlaying(false);
        setIsPlayingLocked(false);
        
        // 解除引用
        currentPlayingAudioRef.current = null;
      }
    };
    
    // 设置错误处理
    audio.onerror = (error) => {
      console.error('音频播放错误:', error);
      
      // 将错误信息记录到控制台以便调试
      console.error(`音频URL: ${nextAudioUrl}, 错误代码: ${audio.error ? audio.error.code : '未知'}`);
      
      // 出错时也尝试播放下一个
      playNextAudio();
    };
    
    // 添加调试代码以检测音频播放时可能的问题
    audio.onloadstart = () => console.log('音频开始加载');
    audio.oncanplay = () => console.log('音频可以播放');
    audio.onwaiting = () => console.log('音频等待加载更多数据');
    
    // 开始播放
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(err => {
        console.error('无法播放音频:', err);
        // 尝试使用更大的延迟重试
        setTimeout(() => {
          // 如果队列中还有音频，继续播放
          playNextAudio();
        }, 300);
      });
    }
    
    // 保存当前播放的音频引用
    currentPlayingAudioRef.current = audio;
    setAudioElement(audio);
  };
  
  // 添加到音频播放队列
  const addToAudioQueue = (audioUrl) => {
    if (!audioUrl) {
      console.error('尝试添加空URL到音频队列');
      return;
    }
    
    console.log(`添加音频到队列: ${audioUrl}`);
    
    // 检查URL格式是否正确
    try {
      new URL(audioUrl);
    } catch (e) {
      console.error('无效的音频URL:', audioUrl, e);
      return;
    }
    
    // 先检查是否队列已经被初始化
    if (!audioQueueRef.current) {
      audioQueueRef.current = [];
    }
    
    // 添加到队列
    audioQueueRef.current.push(audioUrl);
    console.log(`添加后队列长度: ${audioQueueRef.current.length}`);
    
    // 如果没有正在播放的音频，开始播放
    if (!currentPlayingAudioRef.current) {
      console.log('当前没有正在播放的音频，立即开始播放');
      playNextAudio();
    } else {
      console.log('已有音频在播放，新添加的音频将加入队列');
    }
  };

  return (
    <>
      <div
        className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container ${
          isCollapsed ? 'aichat-message-collapsed' : ''
        }`}
        data-message-id={message.id}
        data-aichat-message="true"
        style={{ userSelect: 'text' }}
      >
        {/* 消息头部 */}
        <div className="chat-header opacity-70" style={{ userSelect: 'text' }}>
          <span className="text-xs" style={{ userSelect: 'text' }}>
            {new Date(message.timestamp).toLocaleString()}
            {message.type === 'assistant' && (
              <>
                {' • '}模型: {message.model || selectedModel}
                {message.tokens ? ` • Token: ${message.tokens}` : message.usage?.total_tokens ? ` • Token: ${message.usage.total_tokens}` : ''}
                {message.error && ' • 错误'}
              </>
            )}
          </span>
        </div>

        {/* 消息内容 */}
        <div className={`chat-bubble ${
          message.type === 'user' ? 'chat-bubble-primary' : 
          message.error ? 'chat-bubble-error' : 'chat-bubble-secondary'
        }`}
        style={{ userSelect: 'text', position: 'relative', overflow: 'visible' }}
        >
          {/* 添加搜索结果来源 */}
          {message.searchResults && (
            <div className="absolute bottom-0 right-0 -mb-[30px]" style={{ zIndex: 50 }}>
              <SearchSources 
                sources={message.searchResults} 
                openInBrowserTab={openInBrowserTab}
              />
            </div>
          )}

          {/* 添加折叠按钮 */}
          {shouldCollapseMessage(message) && (
            <button
              className="aichat-collapse-btn"
              onClick={() => onToggleCollapse(message.id)}
              style={{ zIndex: 40 }}
            >
              {isCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          )}
          <div className="message-content" style={{ overflow: 'visible' }}>
            <div className="response-content" style={{ ...contentStyle, overflow: 'visible' }}>
              {editingMessageId === message.id ? (
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
                      {/* 显示推理过程 */}
                      {message.type === 'assistant' && message.reasoning_content && (
                        <div className="mb-4 p-4 bg-base-200 rounded-lg border border-base-300 reasoning-bubble relative">
                          <div 
                            className={`typing-content ${message.generating ? 'generating' : ''}`}
                            style={isReasoningCollapsed ? {
                              maxHeight: '100px',
                              overflow: 'hidden',
                              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
                            } : {}}
                          >
                            {message.reasoning_content && message.generating ? (
                              <div className="reasoning-markdown-container">
                                <MarkdownRenderer
                                  content={message.reasoning_content || ''}
                                  isCompact={true}
                                  onCopyCode={(code) => {
                                    console.log('Code copied:', code);
                                    if (window.electron) {
                                      window.electron.copyToClipboard(code);
                                    } else {
                                      navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              message.reasoning_content
                            )}
                          </div>
                          <div className="flex justify-center mt-2">
                            <button 
                              className="btn btn-xs btn-ghost bg-base-100 hover:bg-base-200 min-w-[80px]"
                              onClick={() => setIsReasoningCollapsed(!isReasoningCollapsed)}
                            >
                              {isReasoningCollapsed ? (
                                <div className="flex items-center gap-1">
                                  <span>Expand</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span>Collapse</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
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
                                searchImages={processedSearchImages || (message.searchImages ? message.searchImages.map(img => {
                                  // 处理本地图片路径
                                  if ((img.url && img.url.startsWith('file://')) || (img.src && img.src.startsWith('file://'))) {
                                    return {
                                      ...img,
                                      src: (img.src || img.url).replace('file://', 'local-file://'),
                                      isLocal: true
                                    };
                                  }
                                  return img;
                                }) : [])}
                                onCopyCode={(code) => {
                                  console.log('Code copied:', code);
                                  if (window.electron) {
                                    window.electron.copyToClipboard(code);
                                  } else {
                                    navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                  }
                                }}
                                onLinkClick={(href) => {
                                  if (href.startsWith('http://') || href.startsWith('https://')) {
                                    openInBrowserTab(href);
                                  }
                                }}
                              />
                              
                              {/* 显示搜索图片 */}
                              {message.searchImages && message.searchImages.length > 0 && 
                                renderSearchImages(message.searchImages, onImageClick)
                              }
                            </div>
                          )}
                          {/* 然后显示图片 */}
                          {message.files
                            .filter(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                            .map(file => renderMediaContent(file, onImageClick))
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
                                searchImages={processedSearchImages || (message.searchImages ? message.searchImages.map(img => {
                                  // 处理本地图片路径
                                  if ((img.url && img.url.startsWith('file://')) || (img.src && img.src.startsWith('file://'))) {
                                    return {
                                      ...img,
                                      src: (img.src || img.url).replace('file://', 'local-file://'),
                                      isLocal: true
                                    };
                                  }
                                  return img;
                                }) : [])}
                                onCopyCode={(code) => {
                                  console.log('Code copied:', code);
                                  if (window.electron) {
                                    window.electron.copyToClipboard(code);
                                  } else {
                                    navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                  }
                                }}
                                onLinkClick={(href) => {
                                  if (href.startsWith('http://') || href.startsWith('https://')) {
                                    openInBrowserTab(href);
                                  }
                                }}
                              />
                              
                              {/* 显示搜索图片 */}
                              {message.searchImages && message.searchImages.length > 0 && 
                                renderSearchImages(message.searchImages, onImageClick)
                              }
                            </div>
                          )}
                          {/* 然后显示视频 */}
                          {message.files
                            .filter(file => file.name && file.name.match(/\.mp4$/i))
                            .map(file => renderMediaContent(file, onImageClick))
                          }
                        </div>
                      ) : message.files?.some(file => 
                        file.name && !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                      ) ? (
                        <div className="file-message">
                          {/* 先显示消息内容（如果有） */}
                          {message.content && (
                            <div className="mb-0">
                              <MarkdownRenderer
                                content={message.content || ''}
                                isCompact={false}
                                searchImages={processedSearchImages || (message.searchImages ? message.searchImages.map(img => {
                                  // 处理本地图片路径
                                  if ((img.url && img.url.startsWith('file://')) || (img.src && img.src.startsWith('file://'))) {
                                    return {
                                      ...img,
                                      src: (img.src || img.url).replace('file://', 'local-file://'),
                                      isLocal: true
                                    };
                                  }
                                  return img;
                                }) : [])}
                                onCopyCode={(code) => {
                                  console.log('Code copied:', code);
                                  if (window.electron) {
                                    window.electron.copyToClipboard(code);
                                  } else {
                                    navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                  }
                                }}
                                onLinkClick={(href) => {
                                  if (href.startsWith('http://') || href.startsWith('https://')) {
                                    openInBrowserTab(href);
                                  }
                                }}
                              />
                            </div>
                          )}
                          {/* 显示文件消息 */}
                          {message.files.map((file, index) => (
                            <div key={index} className="file-item">
                              <span className="file-name">{file.name}</span>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => openFileLocation(file)}
                                title="打开文件位置"
                              >
                                Open
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={message.type === 'assistant' && message.reasoning_content ? 'mt-4' : ''}>
                          {message.generating ? (
                            <div className="typing-effect-container">
                              <MarkdownRenderer
                                content={message.content || ''}
                                isCompact={false}
                                searchImages={processedSearchImages || (message.searchImages ? message.searchImages.map(img => {
                                  // 处理本地图片路径
                                  if ((img.url && img.url.startsWith('file://')) || (img.src && img.src.startsWith('file://'))) {
                                    return {
                                      ...img,
                                      src: (img.src || img.url).replace('file://', 'local-file://'),
                                      isLocal: true
                                    };
                                  }
                                  return img;
                                }) : [])}
                                onCopyCode={(code) => {
                                  console.log('Code copied:', code);
                                  if (window.electron) {
                                    window.electron.copyToClipboard(code);
                                  } else {
                                    navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                  }
                                }}
                                onLinkClick={(href) => {
                                  if (href.startsWith('http://') || href.startsWith('https://')) {
                                    openInBrowserTab(href);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              <MarkdownRenderer
                                content={message.content || ''}
                                isCompact={false}
                                searchImages={processedSearchImages || (message.searchImages ? message.searchImages.map(img => {
                                  // 处理本地图片路径
                                  if ((img.url && img.url.startsWith('file://')) || (img.src && img.src.startsWith('file://'))) {
                                    return {
                                      ...img,
                                      src: (img.src || img.url).replace('file://', 'local-file://'),
                                      isLocal: true
                                    };
                                  }
                                  return img;
                                }) : [])}
                                onCopyCode={(code) => {
                                  console.log('Code copied:', code);
                                  if (window.electron) {
                                    window.electron.copyToClipboard(code);
                                  } else {
                                    navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                  }
                                }}
                                onLinkClick={(href) => {
                                  if (href.startsWith('http://') || href.startsWith('https://')) {
                                    openInBrowserTab(href);
                                  }
                                }}
                              />
                              
                              {/* 显示搜索图片 */}
                              {message.searchImages && message.searchImages.length > 0 && 
                                renderSearchImages(message.searchImages, onImageClick)
                              }
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 消息操作按钮 */}
        {!editingMessageId && (
          <div className="message-actions">
            {/* 仅当消息没有附件文件且是用户消息时显示编辑按钮 */}
            {!message.files?.length && message.type === 'user' && (
              <button className="btn btn-ghost btn-xs" onClick={() => handleEditStart(message)}>Edit</button>
            )}
            <button className="btn btn-ghost btn-xs" onClick={() => handleDeleteMessage(message.id)}>Delete</button>
            {/* 仅当消息没有附件文件时显示复制按钮 */}
            {!message.files?.length && (
              <button 
                className="btn btn-ghost btn-xs" 
                onClick={() => handleCopyMessage(message.id, message.content)}
              >
                {copiedMessageId === message.id ? "Copied" : "Copy"}
              </button>
            )}
            {/* AI 消息的编辑按钮 */}
            {!message.files?.length && message.type === 'assistant' && (
              <button className="btn btn-ghost btn-xs" onClick={() => handleEditStart(message)}>Edit</button>
            )}
            {message.type === 'assistant' && (
              <>
                <button className="btn btn-ghost btn-xs" onClick={() => handleRetry(message.id)}>Retry</button>
                {message.generating && (
                  <button 
                    className="btn btn-ghost btn-xs" 
                    onClick={() => handleStop(message.id)}
                    title="停止生成"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                
                {/* 添加TTS播放按钮 - 根据消息状态决定显示哪种按钮 */}
                {message.type === 'assistant' && !message.files?.length && (
                  <div className="relative inline-block">
                    <button
                      className={`btn btn-xs ${isTtsPlaying ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={handleTtsPlayback}
                      title={isTtsPlaying ? "停止语音播放" : message.generating ? "实时语音播报" : "播放语音"}
                    >
                      {isTtsPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.414a5 5 0 001.414 1.414m0 0l4.243 4.242-1.415 1.415L4 16.657v-2.829l5.414-5.414 4.242 4.242-1.414 1.415L7.414 9.242" />
                        </svg>
                      )}
                    </button>
                    
                    {/* 音色选择按钮 */}
                    <button
                      className="btn btn-ghost btn-xs ml-1"
                      onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                      title="选择语音音色"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* 音色选择菜单 */}
                    {showVoiceSelector && (
                      <div
                        ref={voiceSelectorRef}
                        className="absolute mt-1 bg-base-100 rounded-lg shadow-lg border border-base-300 p-2 z-50"
                        style={{ minWidth: '200px', right: 0 }}
                      >
                        <div className="font-bold text-sm mb-2">选择音色</div>
                        <div className="max-h-60 overflow-y-auto">
                          {availableVoices.map((voice) => (
                            <div
                              key={voice.id}
                              className={`p-2 hover:bg-base-200 cursor-pointer rounded ${
                                voice.id === selectedVoice ? 'bg-primary bg-opacity-20' : ''
                              }`}
                              onClick={() => handleVoiceSelect(voice.id)}
                            >
                              <div className="text-sm font-medium">{voice.name}</div>
                              <div className="text-xs text-base-content/70">{voice.language}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
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
            {/* 添加文件按钮 */}
            {message.files?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.files.map((file, index) => (
                  <button
                    key={index}
                    className="btn btn-ghost btn-xs"
                    onClick={() => openFileLocation(file)}
                    title="打开文件位置"
                  >
                    File
                  </button>
                ))}
              </div>
            )}
            {message.history && message.history.length > 0 && (
              <>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleHistoryNavigation(message.id, 'prev')}
                  disabled={message.currentHistoryIndex === 0}
                >
                  Previous
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleHistoryNavigation(message.id, 'next')}
                  disabled={message.currentHistoryIndex >= message.history.length}
                >
                  Next
                </button>
                <span className="text-xs opacity-50">
                  {message.currentHistoryIndex + 1}/{message.history.length + 1}
                </span>
              </>
            )}
            
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
                if (currentConversation?.path) {
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

      {/* 使用 Portal 将编辑框渲染到 body */}
      {editingMessageId === message.id &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
            <div className="absolute inset-0 message-editor-backdrop" onClick={handleEditCancel}></div>
            <div className="relative message-editor-container w-[90vw] max-w-[1200px] h-[80vh] flex flex-col">
              {/* 编辑器头部 */}
              <div className="flex-none message-editor-toolbar flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* 语言选择 */}
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

                  {/* 主题选择 */}
                  <select 
                    className="select select-bordered select-sm"
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value)}
                  >
                    <option value="vs-dark">vs-dark</option>
                    <option value="light">light</option>
                    <option value="hc-black">hc-black</option>
                  </select>

                  {/* 字体大小调整 */}
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

                {/* 关闭按钮 */}
                <button 
                  className="close-btn"
                  onClick={handleEditCancel}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 编辑器内容 */}
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={editorLanguage}
                  theme={editorTheme}
                  value={editContent}
                  onChange={(value) => {
                    if (value !== undefined) {
                      setEditContent(value);
                    }
                  }}
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: fontSize,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true
                  }}
                />
              </div>

              {/* 编辑器底部 */}
              <div className="flex-none message-editor-actions flex justify-end gap-2">
                <button 
                  className="shader-btn"
                  onClick={handleEditCancel}
                >
                  取消
                </button>
                <button 
                  className="shader-btn gold-save-btn"
                  onClick={() => handleEditSave(message.id, editContent)}
                >
                  保存
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}; 