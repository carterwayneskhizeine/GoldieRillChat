import React, { useState, useEffect } from 'react';
import '../styles/embedding.css';
import { useKnowledgeBases, useKnowledge } from '../hooks/useKnowledgeBase';
import AddKnowledgeBaseDialog from './AddKnowledgeBaseDialog';

// 定义嵌入模型选项
const modelOptions = [
  { id: 'BAAI/bge-m3', name: 'BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 },
  { id: 'netease-youdao/bce-embedding-base_v1', name: 'netease-youdao/bce-embedding-base_v1', provider: 'SiliconFlow', dimensions: 768, tokens: 512 },
  { id: 'BAAI/bge-large-zh-v1.5', name: 'BAAI/bge-large-zh-v1.5', provider: 'SiliconFlow', dimensions: 1024, tokens: 512 },
  { id: 'BAAI/bge-large-en-v1.5', name: 'BAAI/bge-large-en-v1.5', provider: 'SiliconFlow', dimensions: 1024, tokens: 512 },
  { id: 'Pro/BAAI/bge-m3', name: 'Pro/BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 },
];

const Embedding = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState('knowledge');
  const [activeContentTab, setActiveContentTab] = useState('items');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [knowledgeBaseToDelete, setKnowledgeBaseToDelete] = useState(null);
  const [addContentType, setAddContentType] = useState('file');
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
  const { items = [], loading: itemsLoading, refreshBase, addFile, addUrl, addNote, removeItem } = 
    useKnowledge(selectedKnowledgeBase?.id);
  
  // 存储选中的知识库项
  const [selectedItems, setSelectedItems] = useState([]);
  
  // 当选中的知识库变化时，清空选中的项目
  useEffect(() => {
    setSelectedItems([]);
  }, [knowledgeBases, selectedKnowledgeBase]);
  
  // 当选中的知识库变化时，更新处理队列
  useEffect(() => {
    if (items && items.length > 0) {
      // 过滤出正在处理中的项目
      const processing = items.filter(item => 
        item.status === 'processing' || 
        item.status === 'pending' || 
        item.status === 'indexing'
      );
      
      if (processing.length > 0) {
        setProcessingQueue(processing);
      }
    }
  }, [items]);
  
  // 当选中的知识库改变或设置对话框打开时，更新设置状态
  useEffect(() => {
    if (selectedKnowledgeBase && showSettingsDialog) {
      setKnowledgeBaseName(selectedKnowledgeBase.name || '');
      setThreshold(selectedKnowledgeBase.threshold || 0.7);
      setChunkSize(selectedKnowledgeBase.chunkSize || '');
      setChunkOverlap(selectedKnowledgeBase.chunkOverlap || '');
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
  
  // 添加内容到知识库
  const addContentToKnowledgeBase = async (knowledgeBaseId, content) => {
    if (!knowledgeBaseId) return;
    
    try {
      let newItem;
      
      switch (content.type) {
        case 'file':
          newItem = await addFile(content.file);
          break;
        case 'url':
          newItem = await addUrl(content.url);
          break;
        case 'note':
          newItem = await addNote(content.title, content.content);
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
      <div className="h-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-base-content/60">
            <div className="loading loading-spinner loading-lg mb-4"></div>
            <p>加载知识库...</p>
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-base-content/60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mb-4">尚未创建知识库</p>
            <button 
              className="btn btn-sm btn-outline btn-accent gap-2"
              onClick={() => setShowAddDialog(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建知识库
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {knowledgeBases.map(kb => (
              <div 
                key={kb.id}
                className={`knowledge-base-item p-3 rounded-lg transition-all cursor-pointer
                  ${selectedKnowledgeBase?.id === kb.id 
                    ? 'border-2 border-accent/40'
                    : 'border border-base-content/10 hover:border-base-content/20'}
                  shadow-sm hover:shadow-md`}
                onClick={() => setSelectedKnowledgeBase(kb)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-base">{kb.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge badge-sm badge-neutral font-normal">
                        {kb.itemCount || kb.documentCount || 0} 项
                      </span>
                      <span className="text-xs text-base-content/60">
                        {kb.model.name}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-square btn-ghost btn-xs text-error hover:bg-error/10"
                    onClick={(e) => handleDeleteKnowledgeBase(kb, e)}
                    title="删除知识库"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex justify-between items-center text-xs text-base-content/40 mt-2">
                  <span>{kb.model.provider}</span>
                  <span>维度: {kb.model.dimensions}</span>
                  <span>{new Date(kb.updatedAt).toLocaleDateString()}</span>
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
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddDialog(true)}
          >
            创建知识库
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="tabs tabs-boxed bg-base-200 p-1">
          <a 
            className={`tab ${addContentType === 'file' ? 'tab-active' : ''}`}
            onClick={() => setAddContentType('file')}
          >
            文件
          </a>
          <a 
            className={`tab ${addContentType === 'url' ? 'tab-active' : ''}`}
            onClick={() => setAddContentType('url')}
          >
            网址
          </a>
          <a 
            className={`tab ${addContentType === 'note' ? 'tab-active' : ''}`}
            onClick={() => setAddContentType('note')}
          >
            笔记
          </a>
        </div>
        
        {addContentType === 'file' && (
          <div className="flex flex-col">
            <div className="border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center p-10 mb-4">
              <div className="text-5xl mb-4">📄</div>
              <p className="mb-4 text-center">拖放文件到此处或点击上传</p>
              <button 
                className="btn btn-outline"
                onClick={() => {
                  // 这里应该触发文件选择对话框
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.docx,.txt,.md';
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
                支持 PDF, DOCX, TXT, MD 等文件格式
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
              className="btn btn-primary"
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
              className="btn btn-primary"
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
              className="btn btn-sm"
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
                  opacity: 1
                }}>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="tabs tabs-boxed bg-base-200 p-1 w-fit mb-4">
          <a 
            className={`tab ${activeContentTab === 'items' ? 'tab-active' : ''}`}
            onClick={() => setActiveContentTab('items')}
          >
            内容项
          </a>
          <a 
            className={`tab ${activeContentTab === 'add' ? 'tab-active' : ''}`}
            onClick={() => setActiveContentTab('add')}
          >
            添加内容
          </a>
          <a 
            className={`tab ${activeContentTab === 'search' ? 'tab-active' : ''}`}
            onClick={() => setActiveContentTab('search')}
          >
            搜索
          </a>
          <a 
            className={`tab ${activeContentTab === 'stats' ? 'tab-active' : ''}`}
            onClick={() => setActiveContentTab('stats')}
          >
            统计
          </a>
        </div>
        
        {activeContentTab === 'items' && (
          <div className="flex-1 overflow-auto flex flex-col">
            <div className="mb-4">
              <div className="form-control w-full max-w-xs">
                <div className="input-group flex">
                  <input type="text" placeholder="搜索内容项..." className="input input-bordered input-sm flex-1" />
                  <button className="btn btn-square btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>类型</th>
                    <th>添加时间</th>
                    <th>状态</th>
                    <th>操作</th>
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
                        <td>
                          <div className="flex items-center space-x-3">
                            {item.type === 'file' && <span>📄</span>}
                            {item.type === 'url' && <span>🔗</span>}
                            {item.type === 'note' && <span>📝</span>}
                            <div>
                              <div className="font-bold">{item.name || item.title}</div>
                            </div>
                          </div>
                        </td>
                        <td>{item.type}</td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div>
                            {item.status === 'ready' && <span className="badge badge-success">已完成</span>}
                            {item.status === 'completed' && <span className="badge badge-success">已完成</span>}
                            {item.status === 'processing' && <span className="badge badge-warning">处理中</span>}
                            {item.status === 'pending' && <span className="badge badge-info">等待中</span>}
                            {item.status === 'error' && <span className="badge badge-error">失败</span>}
                          </div>
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
                                opacity: 1,
                                position: "absolute"
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
          setShowAddDialog(false);
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
          chunkOverlap: chunkOverlap || undefined
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
            className="btn btn-sm btn-circle absolute right-2 top-2"
            onClick={() => setShowSettingsDialog(false)}
            style={{backgroundColor: "#1e1e28", color: "white", border: "1px solid rgba(255, 255, 255, 0.1)"}}
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
                    onChange={(e) => setChunkCount(parseInt(e.target.value))} 
                    className="range range-xs range-primary w-full" 
                  />
                </div>
                <span className="text-xl font-medium text-white">{chunkCount}</span>
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
                    onChange={(e) => setThreshold(parseFloat(e.target.value))} 
                    className="range range-xs range-primary w-full" 
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
              className="btn"
              onClick={() => setShowSettingsDialog(false)}
              style={{backgroundColor: "#353551", color: "white", border: "1px solid rgba(255, 255, 255, 0.15)"}}
            >
              取消
            </button>
            <button 
              className="btn btn-primary"
              onClick={saveSettings}
              style={{backgroundColor: "#4554b4", color: "white"}}
            >
              确定
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

  return (
    <div className="embedding-container h-screen flex flex-col relative" style={{backgroundColor: "#000000"}}>
      {/* 背景覆盖层 */}
      <div className="absolute inset-0 bg-black" style={{zIndex: -1}}></div>
      
      {/* 顶部搜索栏 */}
      <div className="p-3 border-b border-base-content/10 flex justify-between items-center embedding-top-bar bg-[#08080c] relative">
        <div className="relative w-full max-w-xs">
          <input 
            type="text" 
            placeholder="搜索知识库..." 
            className="input input-sm w-full bg-[#14141e] focus:outline-none border-none"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-3 top-2.5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
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
      </div>

      {/* 主体内容区域 */}
      <div className="flex flex-1 overflow-hidden relative" style={{backgroundColor: "#000000"}}>
        {/* 左侧面板 */}
        <div className="w-1/3 border-r border-base-content/10 flex flex-col overflow-hidden embedding-left-panel bg-[#0a0a0f]">
          {/* 搜索框 */}
          <div className="p-3 border-b border-base-content/5">
            <div className="relative">
              <input 
                type="text" 
                placeholder="搜索知识库..." 
                className="input input-sm w-full bg-[rgba(30,30,40,0.6)] focus:outline-none border-none"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-3 top-2.5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 选项卡内容 - 修改这里确保滚动正常 */}
          <div className="flex-1 overflow-y-auto p-3">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-[rgba(30,30,40,0.95)] p-6 rounded-lg shadow-xl max-w-md w-full border border-base-content/10">
            <h3 className="font-bold text-lg mb-4">确认删除</h3>
            <p className="mb-6">
              您确定要删除知识库 "{knowledgeBaseToDelete?.name}" 吗？
              <br />
              <span className="text-error">此操作不可逆，知识库中的所有内容将被永久删除。</span>
            </p>
            <div className="flex justify-end gap-2">
              <button 
                className="btn btn-sm btn-ghost"
                onClick={cancelDeleteKnowledgeBase}
              >
                取消
              </button>
              <button 
                className="btn btn-sm btn-error"
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