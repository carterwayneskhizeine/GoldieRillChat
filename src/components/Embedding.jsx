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
  { id: 'text-embedding-3-small', name: 'text-embedding-3-small', provider: 'OpenAI', dimensions: 1536, tokens: 8191 },
  { id: 'text-embedding-3-large', name: 'text-embedding-3-large', provider: 'OpenAI', dimensions: 3072, tokens: 8191 },
  { id: 'text-embedding-ada-002', name: 'text-embedding-ada-002', provider: 'OpenAI', dimensions: 1536, tokens: 8191 }
];

const Embedding = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState('knowledgeBases');
  const [activeContentTab, setActiveContentTab] = useState('items');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [addContentType, setAddContentType] = useState('file');
  // 添加分段数量状态到组件顶层，默认值改为6
  const [segmentCount, setSegmentCount] = useState(6);
  
  // 从钩子获取知识库数据
  const { bases: knowledgeBases, loading, refreshBases, addBase, renameBase, deleteBase, updateBase } = useKnowledgeBases();
  
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
  
  // 使用useKnowledge钩子获取选中知识库的详细信息和处理队列
  const { items = [], loading: itemsLoading, refreshBase, addFile, addUrl, addNote, removeItem } = 
    useKnowledge(selectedKnowledgeBase?.id);
  
  // 当选中的知识库变化时，更新处理队列
  useEffect(() => {
    if (items.length > 0) {
      const queue = items.filter(item => 
        item.status === 'pending' || item.status === 'processing' || item.status === 'completed'
      );
      setProcessingQueue(queue);
    } else {
      setProcessingQueue([]);
    }
  }, [items]);
  
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
      <div className="space-y-2">
        <div className="flex justify-between">
          <h3 className="font-bold">我的知识库</h3>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => setShowAddDialog(true)}
          >
            新建
          </button>
        </div>
        
        <div className="overflow-auto max-h-full">
          {loading ? (
            <div className="text-center py-8 text-base-content text-opacity-60">
              <div className="loading loading-spinner loading-md"></div>
              <p>加载知识库...</p>
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="text-center py-8 text-base-content text-opacity-60">
              <p className="mb-4">尚未创建知识库</p>
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => setShowAddDialog(true)}
              >
                创建知识库
              </button>
            </div>
          ) : (
            knowledgeBases.map(kb => (
              <div 
                key={kb.id} 
                className={`knowledge-base-item p-3 cursor-pointer ${selectedKnowledgeBase?.id === kb.id ? 'border-primary border-2' : ''}`}
                onClick={() => setSelectedKnowledgeBase(kb)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{kb.name}</h3>
                  <span className="badge badge-sm">{kb.itemCount || kb.documentCount || 0} 项</span>
                </div>
                <div className="text-sm opacity-70 mt-1">
                  模型: {kb.model.name}
                </div>
                <div className="text-xs opacity-50 mt-1 flex justify-between">
                  <span>提供商: {kb.model.provider}</span>
                  <span>维度: {kb.model.dimensions}</span>
                </div>
                <div className="text-xs opacity-50 mt-1">
                  更新于: {new Date(kb.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
              <path d="M8 7h6"></path>
              <path d="M8 11h8"></path>
              <path d="M8 15h6"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-4">选择一个知识库</h3>
          <p className="text-base-content text-opacity-70 mb-6">
            从左侧选择一个知识库查看其内容，或创建一个新的知识库
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddDialog(true)}
          >
            创建知识库
          </button>
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
              <label tabIndex={0} className="btn btn-sm">操作</label>
              <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow rounded-box w-40 right-0 left-auto" 
                style={{
                  backgroundColor: "#1a1a2e", 
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: "0 0 15px rgba(0, 0, 0, 0.8)",
                  opacity: 1
                }}>
                <li><a style={{color: "white"}} onClick={refreshBase}>刷新数据</a></li>
                <li><a style={{color: "white"}}>导出数据</a></li>
                <li>
                  <a 
                    className="text-error" 
                    onClick={async () => {
                      // 删除知识库前确认
                      if (window.confirm(`确定要删除知识库 "${selectedKnowledgeBase.name}" 吗？此操作不可逆。`)) {
                        try {
                          await deleteBase(selectedKnowledgeBase.id);
                          // 删除成功后会通过钩子自动更新知识库列表
                        } catch (error) {
                          console.error('删除知识库失败:', error);
                          // 显示错误提示
                        }
                      }
                    }}
                  >
                    删除知识库
                  </a>
                </li>
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
                              <li><a style={{color: "white"}}>重新处理</a></li>
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
    
    // 本地状态管理
    const [knowledgeBaseName, setKnowledgeBaseName] = useState(selectedKnowledgeBase.name);
    const [threshold, setThreshold] = useState(selectedKnowledgeBase.threshold || 0.7);
    const [chunkSize, setChunkSize] = useState(selectedKnowledgeBase.chunkSize || '');
    const [chunkOverlap, setChunkOverlap] = useState(selectedKnowledgeBase.chunkOverlap || '');
    
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
      <div className="modal modal-open">
        <div className="modal-box max-w-lg" style={{
          backgroundColor: "#1a1a2e", 
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 0 30px rgba(0, 0, 0, 0.8)",
          opacity: 1,
          backdropFilter: "none",
          transform: "scale(1)",
          transition: "transform 0.2s ease"
        }}>
          <h3 className="font-bold text-lg text-white">知识库设置</h3>
          <button 
            className="btn btn-sm btn-circle absolute right-2 top-2"
            onClick={() => setShowSettingsDialog(false)}
            style={{backgroundColor: "rgba(60, 60, 60, 0.9)", color: "white"}}
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
                style={{backgroundColor: "#292941", color: "white", border: "1px solid rgba(255, 255, 255, 0.2)"}}
              />
            </div>
            
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white"><span className="text-error">*</span> 嵌入模型 <span className="text-xs opacity-70">ⓘ</span></span>
              </label>
              <div className="bg-base-300 p-3 rounded-md">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{selectedKnowledgeBase.model.name}</span>
                  <span className="badge badge-sm">{selectedKnowledgeBase.model.provider}</span>
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
                <span className="label-text text-white">请求文档分段数量 <span className="text-xs opacity-70">ⓘ</span></span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={segmentCount}
                    onChange={(e) => setSegmentCount(parseInt(e.target.value))} 
                    className="range range-xs range-primary w-full" 
                  />
                </div>
                <span className="text-xl font-medium text-white">{segmentCount}</span>
              </div>
            </div>
            
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white">分段大小 <span className="text-xs opacity-70">ⓘ</span></span>
              </label>
              <input 
                type="text" 
                placeholder="默认值（不建议修改）" 
                value={chunkSize}
                onChange={(e) => setChunkSize(e.target.value)}
                className="input input-bordered w-full h-10" 
                style={{backgroundColor: "#292941", color: "white", border: "1px solid rgba(255, 255, 255, 0.2)"}}
              />
            </div>

            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white">重叠大小 <span className="text-xs opacity-70">ⓘ</span></span>
              </label>
              <input 
                type="text" 
                placeholder="默认值（不建议修改）" 
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(e.target.value)}
                className="input input-bordered w-full h-10" 
                style={{backgroundColor: "#292941", color: "white", border: "1px solid rgba(255, 255, 255, 0.2)"}}
              />
            </div>

            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text text-white">匹配度阈值 <span className="text-xs opacity-70">ⓘ</span></span>
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

  return (
    <div className="flex flex-col h-full embedding-container overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex items-center p-2 border-b border-base-300 embedding-top-bar">
        <h2 className="text-xl font-semibold px-2">知识库</h2>
        <div className="flex-grow"></div>
        <div className="btn-group">
          <button className="btn btn-sm" onClick={refreshBases}>刷新</button>
          <button className="btn btn-sm">帮助</button>
        </div>
      </div>

      {/* 主体内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板 */}
        <div className="w-1/3 border-r border-base-300 flex flex-col overflow-hidden embedding-left-panel">
          {/* 选项卡导航 */}
          <div className="tabs tabs-boxed bg-base-200 p-1 m-2">
            <a 
              className={`tab ${activeTab === 'knowledgeBases' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('knowledgeBases')}
            >
              知识库
            </a>
            <a 
              className={`tab ${activeTab === 'queue' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              处理队列
            </a>
          </div>

          {/* 选项卡内容 */}
          <div className="flex-1 overflow-auto p-2">
            {activeTab === 'knowledgeBases' && renderKnowledgeBaseList()}
            {activeTab === 'queue' && renderProcessingQueue()}
          </div>
        </div>

        {/* 右侧主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 embedding-content-panel">
          {renderKnowledgeBaseContent()}
        </div>
      </div>

      {/* 弹窗组件 */}
      {renderAddKnowledgeBaseDialog()}
      {renderSettingsDialog()}

      {/* 底部状态栏 */}
      <div className="p-2 border-t border-base-300 text-sm text-base-content text-opacity-60 flex justify-between embedding-bottom-bar">
        <span>已加载 {knowledgeBases.length} 个知识库</span>
        <span>
          {processingQueue.filter(item => item.status === 'processing').length} 个项目处理中, 
          {processingQueue.filter(item => item.status === 'pending').length} 个等待处理
        </span>
      </div>
    </div>
  );
};

export default Embedding; 