/**
 * 知识库组件
 * 用于管理和使用向量知识库
 */
import React, { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import '../styles/Embedding.css';
import '../styles/settings-modal.css';
import { useKnowledgeBases, useKnowledge } from '../hooks/useKnowledgeBase';
import AddKnowledgeBaseDialog from './AddKnowledgeBaseDialog';
import { detectFileType, TEXT_FILE_TYPES, DOCUMENT_FILE_TYPES } from '../utils/fileTypes';

// 更新滑动条进度的辅助函数
const updateRangeProgress = (rangeElement) => {
  if (!rangeElement) return;
  const min = parseFloat(rangeElement.min) || 0;
  const max = parseFloat(rangeElement.max) || 100;
  const value = parseFloat(rangeElement.value) || min;
  const percentage = ((value - min) / (max - min)) * 100;
  rangeElement.style.setProperty('--range-shdw', `${percentage}%`);
};

// 自定义样式，解决滚动条问题
const customStyles = {
  kbListContainer: {
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  // 使用内容自动高度
  autoHeight: {
    height: 'auto',
    minHeight: 'min-content',
  }
};

// 定义嵌入模型选项
const modelOptions = [
  { id: 'BAAI/bge-m3', name: 'BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 },
  { id: 'netease-youdao/bce-embedding-base_v1', name: 'netease-youdao/bce-embedding-base_v1', provider: 'SiliconFlow', dimensions: 768, tokens: 512 },
  { id: 'BAAI/bge-large-zh-v1.5', name: 'BAAI/bge-large-zh-v1.5', provider: 'SiliconFlow', dimensions: 1024, tokens: 512 },
  { id: 'BAAI/bge-large-en-v1.5', name: 'BAAI/bge-large-en-v1.5', provider: 'SiliconFlow', dimensions: 1024, tokens: 512 },
  { id: 'Pro/BAAI/bge-m3', name: 'Pro/BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 },
];

/**
 * 知识库组件
 * @param {Object} props 组件属性
 * @param {boolean} props.isActive 是否激活
 * @returns {JSX.Element} 知识库组件
 */
const Embedding = ({ isActive = false }) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState('knowledge');
  const [activeContentTab, setActiveContentTab] = useState('add');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [knowledgeBaseToDelete, setKnowledgeBaseToDelete] = useState(null);
  const [addContentType, setAddContentType] = useState('note');
  // 添加分段数量状态到组件顶层，默认值改为6
  const [chunkCount, setChunkCount] = useState(6);
  
  // 设置对话框状态管理（移至顶层）
  const [knowledgeBaseName, setKnowledgeBaseName] = useState('');
  const [threshold, setThreshold] = useState(0.7);
  const [chunkSize, setChunkSize] = useState('');
  const [chunkOverlap, setChunkOverlap] = useState('');
  
  // 从钩子获取知识库数据
  const {
    bases: knowledgeBases = [],
    loading,
    refreshBases,
    addBase,
    renameBase,
    deleteBase,
    updateBase
  } = useKnowledgeBases();
  
  // 使用useKnowledge钩子获取选中知识库的详细信息和处理队列
  const { items = [], loading: itemsLoading, refreshBase, addFile, addUrl, addNote, addDirectory, removeItem } = 
    useKnowledge(selectedKnowledgeBase?.id);
  
  // 存储选中的知识库项
  const [selectedItems, setSelectedItems] = useState([]);
  
  // 当选中的知识库变化时，清空选中的项目
  useEffect(() => {
    setSelectedItems([]);
  }, [knowledgeBases, selectedKnowledgeBase]);
  
  // 添加面板可见状态的跟踪
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const isActiveRef = useRef(isActive);
  
  // 更新活动状态引用
  useEffect(() => {
    isActiveRef.current = isActive;
    console.log('Embedding活动状态变化:', isActive);
  }, [isActive]);
  
  // 检测面板可见性
  useEffect(() => {
    // 初始设置为可见
    setIsPanelVisible(true);
    
    // 添加可见性变化监听器
    const handleVisibilityChange = () => {
      setIsPanelVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 清理监听器
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // 创建一个ref来跟踪定时器状态
  const refreshTimerRef = useRef(null);
  const hasProcessingItemsRef = useRef(false);
  
  // 检查是否有正在处理的项目
  const checkProcessingItems = () => {
    // 查找是否有正在处理中的项目
    const processingItems = items.filter(item => 
      item.status === 'processing' || 
      item.status === 'pending' || 
      item.status === 'indexing'
    );
    
    hasProcessingItemsRef.current = processingItems.length > 0;
    return hasProcessingItemsRef.current;
  };
  
  // 安全地调用refreshBase函数并返回Promise
  const safeRefreshBase = () => {
    if (refreshBase && typeof refreshBase === 'function') {
      try {
        const result = refreshBase();
        if (result && typeof result.then === 'function') {
          return result;
        }
      } catch (error) {
        console.error('刷新知识库失败:', error);
      }
    }
    // 如果refreshBase不存在或出错，返回一个已解析的Promise
    return Promise.resolve();
  };
  
  // 当选中的知识库变化时，检查并开始或停止刷新
  useEffect(() => {
    if (selectedKnowledgeBase?.id && isActiveRef.current) {
      // 初始刷新一次，然后检查是否需要持续刷新
      safeRefreshBase().then(() => {
        if (checkProcessingItems()) {
          startRefreshTimer();
        }
      });
    } else {
      stopRefreshTimer();
    }
    
    // 在组件卸载或选中的知识库变化时清除定时器
    return stopRefreshTimer;
  }, [selectedKnowledgeBase?.id, isActive]);
  
  // 当items变化时，检查是否有处理中的项目，必要时启动定时器
  useEffect(() => {
    if (selectedKnowledgeBase?.id && isActiveRef.current && items.length > 0) {
      if (checkProcessingItems()) {
        startRefreshTimer();
      }
    }
  }, [items, selectedKnowledgeBase?.id, isActive]);
  
  // 当可见性或活动状态变化时，可能需要重新评估刷新逻辑
  useEffect(() => {
    if (!isPanelVisible || !isActiveRef.current) {
      stopRefreshTimer();
    } else if (selectedKnowledgeBase?.id && hasProcessingItemsRef.current) {
      startRefreshTimer();
    }
  }, [isPanelVisible, isActive, selectedKnowledgeBase?.id]);
  
  // 当选中的知识库改变或设置对话框打开时，更新设置状态
  useEffect(() => {
    if (selectedKnowledgeBase && showSettingsDialog) {
      setKnowledgeBaseName(selectedKnowledgeBase.name || '');
      setThreshold(selectedKnowledgeBase.threshold || 0.7);
      setChunkSize(selectedKnowledgeBase.chunkSize || '');
      setChunkOverlap(selectedKnowledgeBase.chunkOverlap || '');
      // 设置分段数量，如果知识库中有此值则使用，否则使用默认值6
      setChunkCount(selectedKnowledgeBase.chunkCount || 6);
    }
  }, [selectedKnowledgeBase, showSettingsDialog]);
  
  // 处理队列相关
  const [processingQueue, setProcessingQueue] = useState([]);
  
  // 当知识库列表发生变化时，更新选中的知识库
  useEffect(() => {
    if (knowledgeBases.length > 0 && !selectedKnowledgeBase) {
      setSelectedKnowledgeBase(knowledgeBases[0]);
    } else if (selectedKnowledgeBase && knowledgeBases.length > 0) {
      // 检查选中的知识库是否仍然存在
      const stillExists = knowledgeBases.some(kb => kb.id === selectedKnowledgeBase.id);
      if (!stillExists) {
        setSelectedKnowledgeBase(knowledgeBases[0]);
      } else {
        // 更新选中的知识库信息
        const updatedBase = knowledgeBases.find(kb => kb.id === selectedKnowledgeBase.id);
        if (updatedBase) {
          setSelectedKnowledgeBase(updatedBase);
        }
      }
    } else if (knowledgeBases.length === 0) {
      setSelectedKnowledgeBase(null);
    }
  }, [knowledgeBases, selectedKnowledgeBase]);
  
  // 创建新知识库
  const createKnowledgeBase = async (name, modelId) => {
    try {
      const newBase = await addBase(name, modelId);
      return newBase;
    } catch (error) {
      console.error('创建知识库失败:', error);
      throw error;
    }
  };
  
  // 修改addContentToKnowledgeBase函数，直接使用顶层已获取的钩子方法
  const addContentToKnowledgeBase = async (knowledgeBaseId, content) => {
    if (!knowledgeBaseId) return;
    
    try {
      let newItem;
      // 已经移除了对useKnowledge的错误调用
      
      switch (content.type) {
        case 'file':
          // 获取文件类型
          const fileType = detectFileType(content.file.name);
          console.log(`添加文件: ${content.file.name}, 类型: ${fileType}`);
          
          // 直接使用顶层获取的addFile方法
          newItem = await addFile(content.file);
          break;
          
        case 'url':
          // 检查是否为站点地图
          if (content.url.toLowerCase().includes('sitemap.xml')) {
            console.log(`添加站点地图: ${content.url}`);
          }
          // 直接使用顶层获取的addUrl方法
          newItem = await addUrl(content.url);
          break;
          
        case 'note':
          // 直接使用顶层获取的addNote方法
          newItem = await addNote(content.title, content.content);
          break;
          
        case 'directory':
          console.log(`添加目录: ${content.path}`);
          // 直接使用顶层获取的addDirectory方法
          newItem = await addDirectory(content.path);
          break;
          
        default:
          console.error('不支持的内容类型:', content.type);
          return;
      }
      
      return newItem;
    } catch (error) {
      console.error('添加内容到知识库失败:', error);
      throw error;
    }
  };
  
  // 渲染知识库列表
  const renderKnowledgeBaseList = () => {
    return (
      <div style={customStyles.autoHeight}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-base-content/60">
            <div className="loading loading-spinner loading-lg mb-4"></div>
            <p>加载知识库...</p>
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-base-content/60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mb-4">尚未创建知识库</p>
          </div>
        ) : (
          <div className="space-y-2" style={customStyles.autoHeight}>
          {knowledgeBases.map(kb => (
            <div 
              key={kb.id} 
              className={`knowledge-base-item p-3 rounded-lg transition-all cursor-pointer relative
                ${selectedKnowledgeBase?.id === kb.id 
                  ? 'border-2 border-accent/40 bg-accent/5'
                  : 'border border-base-content/10 hover:border-base-content/20 hover:bg-base-200/30'}
                shadow-sm`}
              onClick={() => setSelectedKnowledgeBase(kb)}
            >
              {/* 删除按钮 - 绝对定位在右上角 */}
              <div className="absolute top-2 right-2">
                <button 
                  className="sidebar-black-btn icon-only"
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止事件冒泡，避免触发卡片的点击事件
                    handleDeleteKnowledgeBase(kb, e);
                  }}
                  title="删除知识库"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* 知识库标题和基本信息 */}
              <div className="pr-6">
                <h3 className="font-medium text-sm truncate">{kb.name}</h3>
                <div className="flex items-center mt-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    {selectedKnowledgeBase?.id === kb.id && (
                      <span className="text-base-content/60">
                        {kb.itemCount || kb.documentCount || items.length || 0} 项
                      </span>
                    )}
                    <span className="text-base-content/60">
                      {kb.model.name}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end text-xs text-base-content/40 mt-1">
                  <span>
                    更新于 {new Date(kb.updatedAt).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    );
  };
  
  // 渲染处理队列
  const renderProcessingQueue = () => {
    const filteredQueue = selectedKnowledgeBase 
      ? processingQueue.filter(item => item.baseId === selectedKnowledgeBase.id)
      : processingQueue;
      
    return (
      <div className="space-y-3">
        <h3 className="font-medium mb-3">处理队列</h3>
        {filteredQueue.length === 0 ? (
          <p className="text-center py-4 text-base-content text-opacity-60">
            没有正在处理的项目
          </p>
        ) : (
          filteredQueue.map(item => (
            <div key={item.id} className="border border-base-300 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  {item.type === 'file' && <span className="mr-2">📄</span>}
                  {item.type === 'url' && <span className="mr-2">🔗</span>}
                  {item.type === 'note' && <span className="mr-2">📝</span>}
                  {item.type === 'folder' && <span className="mr-2">📁</span>}
                  <span className="font-medium">{item.name || item.title}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="badge badge-sm">
                  {item.status === 'ready' && <span className="text-success">已完成</span>}
                  {item.status === 'completed' && <span className="text-success">已完成</span>}
                  {item.status === 'processing' && <span className="text-warning">处理中</span>}
                  {item.status === 'pending' && <span className="text-info">等待中</span>}
                  {item.status === 'error' && <span className="text-error">失败</span>}
                </div>
              </div>
              
              {item.status === 'processing' && (
                <progress 
                  className="progress progress-primary w-full mt-2" 
                  value={50} 
                  max="100"
                ></progress>
              )}
            </div>
          ))
        )}
      </div>
    );
  };
  
  // 添加内容组件
  const renderAddContent = () => {
    if (!selectedKnowledgeBase) {
      return (
        <div className="text-center py-8">
          <p className="text-base-content text-opacity-60 mb-4">
            请先选择或创建一个知识库
          </p>
          <button 
            className="shader-btn"
            onClick={() => setShowAddDialog(true)}
          >
            创建知识库
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <a 
            className={`shader-btn flex-1 text-center min-w-[100px] ${addContentType === 'note' ? 'active' : ''}`}
            onClick={() => setAddContentType('note')}
          >
            笔记
          </a>
          <a 
            className={`shader-btn flex-1 text-center min-w-[100px] ${addContentType === 'file' ? 'active' : ''}`}
            onClick={() => setAddContentType('file')}
          >
            文件
          </a>
          <a 
            className={`shader-btn flex-1 text-center min-w-[100px] ${addContentType === 'url' ? 'active' : ''}`}
            onClick={() => setAddContentType('url')}
          >
            网址
          </a>
          <a 
            className={`shader-btn flex-1 text-center min-w-[100px] ${addContentType === 'directory' ? 'active' : ''}`}
            onClick={() => setAddContentType('directory')}
          >
            目录
          </a>
          <a 
            className={`shader-btn flex-1 text-center min-w-[100px] ${addContentType === 'sitemap' ? 'active' : ''}`}
            onClick={() => setAddContentType('sitemap')}
          >
            站点地图
          </a>
        </div>
        
        {addContentType === 'file' && (
          <div className="flex flex-col">
            <div className="border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center p-10 mb-4">
              <div className="text-5xl mb-4">📄</div>
              <p className="mb-4 text-center">拖放文件到此处或点击上传</p>
              <button 
                className="shader-btn"
                onClick={() => {
                  // 这里应该触发文件选择对话框
                  const input = document.createElement('input');
                  input.type = 'file';
                  // 支持更多文件类型
                  const supportedExtensions = [...TEXT_FILE_TYPES, ...DOCUMENT_FILE_TYPES]
                    .map(ext => ext.replace('.', ''))
                    .join(',');
                  input.accept = supportedExtensions;
                  
                  input.onchange = async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      try {
                        await addContentToKnowledgeBase(selectedKnowledgeBase.id, {
                          type: 'file',
                          file: file
                        });
                        // 刷新知识库
                        refreshBase();
                      } catch (error) {
                        console.error('添加文件失败:', error);
                        // 显示错误提示
                      }
                    }
                  };
                  input.click();
                }}
              >
                选择文件
              </button>
              <p className="mt-4 text-sm text-base-content text-opacity-60">
                支持 PDF, DOCX, TXT, MD, ODT, PPTX, XLSX 等文件格式
              </p>
            </div>
          </div>
        )}
        
        {addContentType === 'url' && (
          <div className="flex flex-col">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">输入网址</span>
              </label>
              <input 
                type="text" 
                placeholder="https://example.com" 
                className="input input-bordered" 
                id="url-input"
              />
              <label className="label">
                <span className="label-text-alt">网页内容将被抓取并添加到知识库</span>
              </label>
            </div>
            <button 
              className="shader-btn gold-save-btn"
              onClick={async () => {
                const urlInput = document.getElementById('url-input');
                if (urlInput && urlInput.value) {
                  try {
                    await addContentToKnowledgeBase(selectedKnowledgeBase.id, {
                      type: 'url',
                      url: urlInput.value
                    });
                    // 清空输入框
                    urlInput.value = '';
                    // 刷新知识库
                    refreshBase();
                  } catch (error) {
                    console.error('添加URL失败:', error);
                    // 显示错误提示
                  }
                }
              }}
            >
              添加到知识库
            </button>
          </div>
        )}
        
        {addContentType === 'sitemap' && (
          <div className="flex flex-col">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">站点地图URL</span>
              </label>
              <input 
                type="text" 
                placeholder="https://example.com/sitemap.xml" 
                className="input input-bordered" 
                id="sitemap-url-input"
              />
              <label className="label">
                <span className="label-text-alt">站点地图中的所有URL将被抓取并添加到知识库</span>
              </label>
            </div>
            <button 
              className="shader-btn gold-save-btn"
              onClick={async () => {
                const urlInput = document.getElementById('sitemap-url-input');
                if (urlInput && urlInput.value) {
                  try {
                    await addContentToKnowledgeBase(selectedKnowledgeBase.id, {
                      type: 'url', // URL类型，内部会检测是否为站点地图
                      url: urlInput.value
                    });
                    // 清空输入框
                    urlInput.value = '';
                    // 刷新知识库
                    refreshBase();
                  } catch (error) {
                    console.error('添加站点地图失败:', error);
                  }
                }
              }}
            >
              添加到知识库
            </button>
          </div>
        )}
        
        {addContentType === 'directory' && (
          <div className="flex flex-col">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">选择文件夹</span>
              </label>
              <div className="flex items-center">
                <input 
                  type="text" 
                  placeholder="选择文件夹路径..." 
                  className="input input-bordered flex-1" 
                  id="directory-path-input"
                  readOnly
                />
                <button 
                  className="shader-btn ml-2"
                  onClick={() => {
                    // 调用Electron的选择文件夹对话框
                    window.electronAPI?.selectDirectory?.().then(result => {
                      if (result && !result.canceled) {
                        document.getElementById('directory-path-input').value = result.filePaths[0];
                      }
                    });
                  }}
                >
                  浏览...
                </button>
              </div>
            </div>
            <button 
              className="shader-btn gold-save-btn"
              onClick={async () => {
                const pathInput = document.getElementById('directory-path-input');
                if (pathInput && pathInput.value) {
                  try {
                    await addContentToKnowledgeBase(selectedKnowledgeBase.id, {
                      type: 'directory',
                      path: pathInput.value
                    });
                    // 清空输入框
                    pathInput.value = '';
                    // 刷新知识库
                    refreshBase();
                  } catch (error) {
                    console.error('添加目录失败:', error);
                  }
                }
              }}
            >
              添加到知识库
            </button>
          </div>
        )}
        
        {addContentType === 'note' && (
          <div className="flex flex-col">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">笔记标题</span>
              </label>
              <input 
                type="text" 
                placeholder="输入笔记标题" 
                className="input input-bordered mb-2" 
                id="note-title-input"
              />
              <label className="label">
                <span className="label-text">笔记内容</span>
              </label>
              <textarea 
                className="textarea textarea-bordered h-32" 
                placeholder="输入笔记内容..."
                id="note-content-input"
              ></textarea>
            </div>
            <button 
              className="shader-btn gold-save-btn"
              onClick={async () => {
                const titleInput = document.getElementById('note-title-input');
                const contentInput = document.getElementById('note-content-input');
                if (contentInput && contentInput.value) {
                  try {
                    await addContentToKnowledgeBase(selectedKnowledgeBase.id, {
                      type: 'note',
                      title: titleInput ? titleInput.value : '未命名笔记',
                      content: contentInput.value
                    });
                    // 清空输入框
                    if (titleInput) titleInput.value = '';
                    contentInput.value = '';
                    // 刷新知识库
                    refreshBase();
                  } catch (error) {
                    console.error('添加笔记失败:', error);
                    // 显示错误提示
                  }
                }
              }}
            >
              添加到知识库
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // 渲染知识库内容
  const renderKnowledgeBaseContent = () => {
    if (!selectedKnowledgeBase) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-6xl mb-6">
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{selectedKnowledgeBase.name}</h2>
          <div className="flex gap-2">
            <button 
              className="shader-btn"
              onClick={() => setShowSettingsDialog(true)}
            >
              设置
            </button>
            <div className="dropdown dropdown-bottom">
              <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow rounded-box w-40 right-0 left-auto" 
                style={{
                  backgroundColor: "#1a1a2e", 
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: "0 0 15px rgba(0, 0, 0, 0.8)",
                  opacity: 1,
                  maxHeight: "300px",
                  overflowY: "auto",
                  overflowX: "hidden"
                }}>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mb-4 gap-2 w-full">
          <a 
            className={`shader-btn flex-1 text-center ${activeContentTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveContentTab('add')}
          >
            添加内容
          </a>
          <a 
            className={`shader-btn flex-1 text-center ${activeContentTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveContentTab('items')}
          >
            内容项
          </a>
          {/* 注释掉搜索选项卡
          <a 
            className={`tab ${activeContentTab === 'search' ? 'tab-active' : ''}`}
            onClick={() => setActiveContentTab('search')}
          >
            搜索
          </a>
          */}
          <a 
            className={`shader-btn flex-1 text-center ${activeContentTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveContentTab('stats')}
          >
            统计
          </a>
        </div>
        
        {activeContentTab === 'items' && (
          <div className="flex-1 overflow-auto flex flex-col">
            <div className="overflow-x-auto flex-1 rounded-lg border border-base-300 bg-base-100/50">
              <table className="table table-zebra w-full table-compact">
                <thead>
                  <tr>
                    <th className="w-[45%]">名称</th>
                    <th className="w-[10%]">类型</th>
                    <th className="w-[20%]">添加时间</th>
                    <th className="w-[15%]">状态</th>
                    <th className="w-[10%]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        <div className="loading loading-spinner loading-md"></div>
                        <p>加载内容项...</p>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        <p>暂无内容项，请添加内容</p>
                      </td>
                    </tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.id}>
                        <td className="max-w-0">
                          <div className="truncate" title={item.name || item.url || '未命名项目'}>
                            {item.name || item.url || '未命名项目'}
                          </div>
                        </td>
                        <td>
                          {item.type === 'file' && <span>File</span>}
                          {item.type === 'url' && <span>URL</span>}
                          {item.type === 'note' && <span>Note</span>}
                          {item.type === 'sitemap' && <span>SiteMap</span>}
                          {item.type === 'directory' && <span>TOC</span>}
                        </td>
                        <td className="whitespace-nowrap">{new Date(item.createdAt || item.created_at).toLocaleString()}</td>
                        <td>
                          {console.log(`项目状态: ${item.id}, 状态: ${item.status}`, item)}
                          {item.status === 'ready' && <span className="text-xs text-success">已完成</span>}
                          {item.status === 'completed' && <span className="text-xs text-success">已完成</span>}
                          {item.status === 'processing' && <span className="text-xs text-warning">处理中</span>}
                          {item.status === 'pending' && <span className="text-xs text-info">等待中</span>}
                          {item.status === 'error' && <span className="text-xs text-error">失败</span>}
                          {!item.status && <span className="text-xs text-gray-500">未知</span>}
                        </td>
                        <td>
                          <div className="dropdown dropdown-left">
                            <label tabIndex={0} className="btn btn-sm btn-ghost">⋮</label>
                            <ul tabIndex={0} className="dropdown-content z-[500] menu p-2 shadow rounded-box w-40 right-auto left-auto"
                              style={{
                                backgroundColor: "#1a1a2e", 
                                color: "white",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                boxShadow: "0 0 15px rgba(0, 0, 0, 0.8)",
                                maxHeight: "300px",
                                overflowY: "auto",
                                overflowX: "hidden"
                              }}>
                              <li><a style={{color: "white"}}>查看详情</a></li>
                              <li>
                                <a 
                                  className="text-error" 
                                  onClick={async () => {
                                    // 删除项目前确认
                                    if (window.confirm(`确定要删除 "${item.name || item.title}" 吗？`)) {
                                      try {
                                        await removeItem(item.id);
                                        // 刷新知识库
                                        refreshBase();
                                      } catch (error) {
                                        console.error('删除项目失败:', error);
                                        // 显示错误提示
                                      }
                                    }
                                  }}
                                >
                                  删除
                                </a>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeContentTab === 'add' && renderAddContent()}
        
        {/* 注释掉搜索内容区域
        {activeContentTab === 'search' && (
          <div className="flex-1 flex flex-col">
            <div className="form-control mb-4">
              <div className="input-group flex">
                <input type="text" placeholder="搜索知识库内容..." className="input input-bordered flex-1" />
                <button className="btn btn-square">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-base-200 rounded-lg">
              <p className="text-center py-8 text-base-content text-opacity-60">
                在上方输入关键词搜索知识库内容
              </p>
            </div>
          </div>
        )}
        */}
        
        {activeContentTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h3 className="card-title">知识库信息</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>名称:</span>
                    <span>{selectedKnowledgeBase.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>嵌入模型:</span>
                    <span>{selectedKnowledgeBase.model.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>内容项数量:</span>
                    <span>{selectedKnowledgeBase.itemCount || selectedKnowledgeBase.documentCount || items.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>创建时间:</span>
                    <span>{new Date(selectedKnowledgeBase.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最后更新:</span>
                    <span>{new Date(selectedKnowledgeBase.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h3 className="card-title">存储统计</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>向量数量:</span>
                    <span>{items.filter(item => item.embedding).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>维度:</span>
                    <span>{selectedKnowledgeBase.model.dimensions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>文本块数:</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>相似度阈值:</span>
                    <span>{selectedKnowledgeBase.threshold || 0.7}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 创建知识库对话框
  const renderAddKnowledgeBaseDialog = () => {
    if (!showAddDialog) return null;
    
    return (
      <AddKnowledgeBaseDialog 
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={(newBase) => {
          // 选中新创建的知识库
          setSelectedKnowledgeBase(newBase);
          // 关闭对话框
          setShowAddDialog(false);
          // 刷新知识库列表
          refreshBases();
          console.log("刷新知识库列表", newBase);
        }}
      />
    );
  };
  
  // 知识库设置对话框
  const renderSettingsDialog = () => {
    if (!showSettingsDialog || !selectedKnowledgeBase) return null;
    
    // 保存设置
    const saveSettings = async () => {
      try {
        const updatedBase = {
          ...selectedKnowledgeBase,
          name: knowledgeBaseName,
          threshold: threshold,
          chunkSize: chunkSize || undefined,
          chunkOverlap: chunkOverlap || undefined,
          chunkCount: chunkCount
        };
        
        await updateBase(selectedKnowledgeBase.id, updatedBase);
        setShowSettingsDialog(false);
      } catch (error) {
        console.error('更新知识库设置失败:', error);
        // 显示错误提示
      }
    };
    
    return (
      <div className="modal modal-open" style={{backgroundColor: "rgba(0,0,0,0.95)"}}>
        <div className="modal-box max-w-lg" style={{
          backgroundColor: "#0a0a0f", 
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 0 30px rgba(0, 0, 0, 0.8)",
          opacity: 1,
          backdropFilter: "none",
          transform: "scale(1)",
          transition: "transform 0.2s ease",
          position: "relative",
        }}>
          <h3 className="font-bold text-lg text-white">知识库设置</h3>
          <button 
            className="close-btn"
            onClick={() => setShowSettingsDialog(false)}
          >✕</button>
          
          <div className="py-2">
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white"><span className="text-error">*</span> 名称</span>
              </label>
              <input 
                type="text" 
                value={knowledgeBaseName}
                onChange={(e) => setKnowledgeBaseName(e.target.value)}
                className="input input-bordered w-full h-10" 
                style={{backgroundColor: "#14141e", color: "white", border: "1px solid rgba(255, 255, 255, 0.15)"}}
              />
            </div>
            
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white"><span className="text-error">*</span> 嵌入模型</span>
              </label>
              <div style={{backgroundColor: "#14141e", border: "1px solid rgba(255, 255, 255, 0.05)"}} className="p-3 rounded-md">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{selectedKnowledgeBase.model.name}</span>
                  <span className="badge badge-sm" style={{backgroundColor: "#32323c", color: "white"}}>{selectedKnowledgeBase.model.provider}</span>
                </div>
                <div className="text-sm opacity-70">
                  <div>维度: {selectedKnowledgeBase.model.dimensions}</div>
                  <div>最大Token: {selectedKnowledgeBase.model.tokens}</div>
                </div>
                <div className="text-xs opacity-50 mt-1">
                  创建知识库后无法更改嵌入模型
                </div>
              </div>
            </div>
            
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white">请求文档分段数量</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={chunkCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setChunkCount(value);
                      updateRangeProgress(e.target);
                    }} 
                    className="range range-xs range-primary w-full" 
                    style={{
                      "--range-shdw": `${((chunkCount - 1) / (30 - 1)) * 100}%`
                    }}
                    onInput={(e) => updateRangeProgress(e.target)}
                  />
                </div>
                <span className="text-xl font-medium text-white">{chunkCount}</span>
              </div>
              <div className="text-xs opacity-70 mt-1 text-[#cccccc]">
                设置为1表示不分段，大于1时将强制分段。
                <br />
                <span className="text-yellow-300">注意: 设置生效需要保存并重新上传文档。</span>
              </div>
            </div>
            
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white">分段大小</span>
              </label>
              <input 
                type="text" 
                placeholder="默认值（不建议修改）" 
                value={chunkSize}
                onChange={(e) => setChunkSize(e.target.value)}
                className="input input-bordered w-full h-10" 
                style={{backgroundColor: "#14141e", color: "white", border: "1px solid rgba(255, 255, 255, 0.15)"}}
              />
            </div>

            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white">重叠大小</span>
              </label>
              <input 
                type="text" 
                placeholder="默认值（不建议修改）" 
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(e.target.value)}
                className="input input-bordered w-full h-10" 
                style={{backgroundColor: "#14141e", color: "white", border: "1px solid rgba(255, 255, 255, 0.15)"}}
              />
            </div>

            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white">匹配度阈值</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
              <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={threshold}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setThreshold(value);
                      updateRangeProgress(e.target);
                    }} 
                    className="range range-xs range-primary w-full" 
                    style={{
                      "--range-shdw": `${(threshold / 1) * 100}%`
                    }}
                    onInput={(e) => updateRangeProgress(e.target)}
                  />
                </div>
                <span className="text-xl font-medium text-white">{threshold}</span>
              </div>
              <label className="label">
                <span className="label-text-alt text-gray-300">较高的阈值会过滤掉更多不太相关的内容</span>
              </label>
            </div>
          </div>
          
          <div className="modal-action">
            <button 
              className="shader-btn"
              onClick={() => setShowSettingsDialog(false)}
            >
              取消
            </button>
            <button 
              className="shader-btn gold-save-btn"
              onClick={() => saveSettings()}
            >
              保存
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={() => setShowSettingsDialog(false)}></div>
      </div>
    );
  };

  // 处理删除知识库
  const handleDeleteKnowledgeBase = (kb, e) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发选择知识库
    setKnowledgeBaseToDelete(kb);
    setShowDeleteDialog(true);
  };
  
  // 执行删除知识库
  const confirmDeleteKnowledgeBase = async () => {
    if (!knowledgeBaseToDelete) return;
    
    try {
      await deleteBase(knowledgeBaseToDelete.id);
      
      // 如果删除的是当前选中的知识库，则清除选中状态
      if (selectedKnowledgeBase?.id === knowledgeBaseToDelete.id) {
        setSelectedKnowledgeBase(null);
      }
      
      // 关闭对话框
      setShowDeleteDialog(false);
      setKnowledgeBaseToDelete(null);
    } catch (error) {
      console.error('删除知识库失败:', error);
    }
  };
  
  // 关闭删除对话框
  const cancelDeleteKnowledgeBase = () => {
    setShowDeleteDialog(false);
    setKnowledgeBaseToDelete(null);
  };

  // 开始刷新定时器
  const startRefreshTimer = () => {
    if (refreshTimerRef.current) return; // 已经存在定时器，不重复创建
    
    console.log('启动知识库状态刷新...');
    refreshTimerRef.current = setInterval(() => {
      // 只有在文档可见且Embedding是活动工具时才刷新
      if (isPanelVisible && !document.hidden && isActiveRef.current) {
        console.log('刷新知识库状态...');
        safeRefreshBase().then(() => {
          // 刷新后检查是否还有处理中的项目
          if (!checkProcessingItems() && refreshTimerRef.current) {
            console.log('所有项目处理完成，停止自动刷新');
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
        });
      }
    }, 3000); // 每3秒刷新一次
  };

  // 停止刷新定时器
  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      console.log('停止知识库状态刷新');
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  return (
    <div className="embedding-container h-screen flex flex-col relative" style={{backgroundColor: "#000000"}}>
      {/* 背景覆盖层 */}
      <div className="absolute inset-0 bg-black" style={{zIndex: -1}}></div>
      
      {/* 顶部搜索栏 */}
      {/* <div className="p-3 border-b border-base-content/10 flex justify-between items-center embedding-top-bar bg-[#08080c] relative">
        <div className="relative w-full max-w-xs">
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-sm btn-outline gap-2 border-none hover:bg-[#14141e]"
            onClick={() => setShowAddDialog(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建
          </button>
          <button 
            className="btn btn-sm btn-square btn-ghost text-base-content/70 hover:bg-[#14141e]"
            onClick={() => {
              // 触发刷新
              refreshBases();
            }}
          >
            {loading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>
      </div> */}

      {/* 主体内容区域 */}
      <div className="flex flex-1 overflow-hidden relative" style={{backgroundColor: "#000000"}}>
        {/* 左侧面板 */}
        <div className="w-1/4 border-r border-base-content/10 flex flex-col overflow-hidden embedding-left-panel bg-[#0a0a0f]">
          {/* 新建和刷新按钮 */}
          <div className="p-3 border-b border-base-content/5">
            <div className="flex gap-2">
              <button 
                className="sidebar-black-btn"
                onClick={() => setShowAddDialog(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新建
              </button>
              <button 
                className="sidebar-black-btn icon-only"
                onClick={() => {
                  // 触发刷新
                  refreshBases();
                }}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 选项卡内容 - 修改这里确保滚动正常 */}
          <div className="flex-1 p-3 kb-list-container" style={customStyles.kbListContainer}>
            {renderKnowledgeBaseList()}
          </div>
        </div>

        {/* 右侧主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 embedding-content-panel bg-[rgba(25,25,35,0.4)]">
          {renderKnowledgeBaseContent()}
        </div>
      </div>

      {/* 弹窗组件 */}
      {renderAddKnowledgeBaseDialog()}
      {renderSettingsDialog()}
      
      {/* 删除知识库确认对话框 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-[#1e1e1e] p-6 rounded-sm shadow-xl max-w-md w-full border border-[#3c3c3c]">
            <h3 className="font-medium text-[#cccccc] text-base mb-4 border-b border-[#3c3c3c] pb-2">确认删除</h3>
            <p className="mb-6 text-[#cccccc] text-sm">
              您确定要删除知识库 "<span className="text-[#9cdcfe]">{knowledgeBaseToDelete?.name}</span>" 吗？
              <br />
              <span className="text-[#ce9178] text-xs mt-2 block">此操作不可逆，知识库中的所有内容将被永久删除。</span>
            </p>
            <div className="flex justify-end gap-2">
              <button 
                className="px-4 py-1 text-sm rounded-sm"
                style={{backgroundColor: "#3c3c3c", color: "#cccccc", border: "1px solid #3c3c3c"}}
                onClick={cancelDeleteKnowledgeBase}
              >
                取消
              </button>
              <button 
                className="px-4 py-1 text-sm rounded-sm"
                style={{backgroundColor: "#9d8a12", color: "#ffffff", border: "1px solid #9d8a12"}}
                onClick={confirmDeleteKnowledgeBase}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      <div className="p-2 border-t border-base-content/10 text-xs text-base-content/50 flex justify-between embedding-bottom-bar bg-[#08080c]">
        <span>共 {knowledgeBases.length} 个知识库</span>
        <span>
          {processingQueue.filter(item => item.status === 'processing').length} 个处理中 | 
          {processingQueue.filter(item => item.status === 'pending').length} 个待处理
        </span>
      </div>
    </div>
  );
};

export default Embedding; 