import React, { useState, useEffect } from 'react';
import '../styles/embedding.css';

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
  
  // 模拟数据 - 实际应用中应从后端获取
  const [knowledgeBases, setKnowledgeBases] = useState([
    { id: 1, name: '工作文档', model: 'text-embedding-3-small', itemCount: 12, lastUpdated: '2023-10-15' },
    { id: 2, name: '学习资料', model: 'text-embedding-3-small', itemCount: 8, lastUpdated: '2023-11-20' },
  ]);
  
  const [processingQueue, setProcessingQueue] = useState([
    { id: 101, type: 'file', name: '项目说明.pdf', status: 'completed', progress: 100, knowledgeBaseId: 1 },
    { id: 102, type: 'url', name: 'https://example.com/docs', status: 'processing', progress: 65, knowledgeBaseId: 1 },
    { id: 103, type: 'folder', name: '研究文献', status: 'pending', progress: 0, knowledgeBaseId: 2 }
  ]);
  
  // 创建新知识库
  const createKnowledgeBase = (name, model) => {
    const newKnowledgeBase = {
      id: Date.now(),
      name,
      model,
      itemCount: 0,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setKnowledgeBases([...knowledgeBases, newKnowledgeBase]);
    return newKnowledgeBase;
  };
  
  // 添加内容到知识库
  const addContentToKnowledgeBase = (knowledgeBaseId, content) => {
    const newItem = {
      id: Date.now(),
      type: content.type,
      name: content.name,
      status: 'pending',
      progress: 0,
      knowledgeBaseId
    };
    setProcessingQueue([...processingQueue, newItem]);
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
          {knowledgeBases.map(kb => (
            <div 
              key={kb.id} 
              className={`knowledge-base-item p-3 cursor-pointer ${selectedKnowledgeBase?.id === kb.id ? 'border-primary border-2' : ''}`}
              onClick={() => setSelectedKnowledgeBase(kb)}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{kb.name}</h3>
                <span className="badge badge-sm">{kb.itemCount} 项</span>
              </div>
              <div className="text-sm opacity-70 mt-1">
                模型: {kb.model}
              </div>
              <div className="text-xs opacity-50 mt-1">
                更新于: {kb.lastUpdated}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // 渲染处理队列
  const renderProcessingQueue = () => {
    const filteredQueue = selectedKnowledgeBase 
      ? processingQueue.filter(item => item.knowledgeBaseId === selectedKnowledgeBase.id)
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
                  {item.type === 'folder' && <span className="mr-2">📁</span>}
                  <span className="font-medium">{item.name}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="badge badge-sm">
                  {item.status === 'completed' && <span className="text-success">已完成</span>}
                  {item.status === 'processing' && <span className="text-warning">处理中</span>}
                  {item.status === 'pending' && <span className="text-info">等待中</span>}
                  {item.status === 'failed' && <span className="text-error">失败</span>}
                </div>
              </div>
              
              {item.status === 'processing' && (
                <progress 
                  className="progress progress-primary w-full mt-2" 
                  value={item.progress} 
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
            className={`tab ${addContentType === 'folder' ? 'tab-active' : ''}`}
            onClick={() => setAddContentType('folder')}
          >
            文件夹
          </a>
          <a 
            className={`tab ${addContentType === 'sitemap' ? 'tab-active' : ''}`}
            onClick={() => setAddContentType('sitemap')}
          >
            网站地图
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
              <button className="btn btn-outline">选择文件</button>
              <p className="mt-4 text-sm text-base-content text-opacity-60">
                支持 PDF, DOCX, TXT, MD 等文件格式
              </p>
            </div>
            <button className="btn btn-primary">添加到知识库</button>
          </div>
        )}
        
        {addContentType === 'url' && (
          <div className="flex flex-col">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">输入网址</span>
              </label>
              <input type="text" placeholder="https://example.com" className="input input-bordered" />
              <label className="label">
                <span className="label-text-alt">网页内容将被抓取并添加到知识库</span>
              </label>
            </div>
            <button className="btn btn-primary">添加到知识库</button>
          </div>
        )}
        
        {addContentType === 'folder' && (
          <div className="flex flex-col">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">选择文件夹</span>
              </label>
              <div className="flex">
                <input type="text" placeholder="选择文件夹路径" className="input input-bordered flex-1" readOnly />
                <button className="btn ml-2">浏览...</button>
              </div>
              <label className="label">
                <span className="label-text-alt">文件夹中的所有支持文件类型都将被处理</span>
              </label>
            </div>
            <button className="btn btn-primary">添加到知识库</button>
          </div>
        )}
        
        {addContentType === 'sitemap' && (
          <div className="flex flex-col">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">网站地图 URL</span>
              </label>
              <input type="text" placeholder="https://example.com/sitemap.xml" className="input input-bordered" />
              <label className="label">
                <span className="label-text-alt">网站地图中的所有 URL 将被抓取</span>
              </label>
            </div>
            <button className="btn btn-primary">添加到知识库</button>
          </div>
        )}
        
        {addContentType === 'note' && (
          <div className="flex flex-col">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">笔记内容</span>
              </label>
              <textarea className="textarea textarea-bordered h-32" placeholder="输入笔记内容..."></textarea>
            </div>
            <button className="btn btn-primary">添加到知识库</button>
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
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40 right-0 left-auto">
                <li><a>重新构建索引</a></li>
                <li><a>导出数据</a></li>
                <li><a className="text-error">删除知识库</a></li>
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
                  {processingQueue
                    .filter(item => item.knowledgeBaseId === selectedKnowledgeBase.id)
                    .map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center space-x-3">
                            {item.type === 'file' && <span>📄</span>}
                            {item.type === 'url' && <span>🔗</span>}
                            {item.type === 'folder' && <span>📁</span>}
                            <div>
                              <div className="font-bold">{item.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{item.type}</td>
                        <td>2023-12-05</td>
                        <td>
                          <div>
                            {item.status === 'completed' && <span className="badge badge-success">已完成</span>}
                            {item.status === 'processing' && <span className="badge badge-warning">处理中</span>}
                            {item.status === 'pending' && <span className="badge badge-info">等待中</span>}
                            {item.status === 'failed' && <span className="badge badge-error">失败</span>}
                          </div>
                        </td>
                        <td>
                          <div className="dropdown dropdown-bottom">
                            <label tabIndex={0} className="btn btn-sm btn-ghost">⋮</label>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40 right-0 left-auto">
                              <li><a>查看详情</a></li>
                              <li><a>重新处理</a></li>
                              <li><a className="text-error">删除</a></li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                    <span>{selectedKnowledgeBase.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>内容项数量:</span>
                    <span>{selectedKnowledgeBase.itemCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>创建时间:</span>
                    <span>2023-09-01</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最后更新:</span>
                    <span>{selectedKnowledgeBase.lastUpdated}</span>
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
                    <span>1,248</span>
                  </div>
                  <div className="flex justify-between">
                    <span>维度:</span>
                    <span>1,536</span>
                  </div>
                  <div className="flex justify-between">
                    <span>文本块数:</span>
                    <span>356</span>
                  </div>
                  <div className="flex justify-between">
                    <span>总存储大小:</span>
                    <span>24.5 MB</span>
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
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg">创建新知识库</h3>
          <button 
            className="btn btn-sm btn-circle absolute right-2 top-2"
            onClick={() => setShowAddDialog(false)}
          >✕</button>
          
          <div className="py-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">知识库名称</span>
              </label>
              <input type="text" placeholder="输入知识库名称" className="input input-bordered w-full" />
            </div>
            
            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">嵌入模型</span>
              </label>
              <select className="select select-bordered w-full">
                <option value="text-embedding-3-small">text-embedding-3-small (OpenAI)</option>
                <option value="text-embedding-3-large">text-embedding-3-large (OpenAI)</option>
                <option value="text-embedding-ada-002">text-embedding-ada-002 (OpenAI)</option>
                <option value="bge-large-zh-v1.5">bge-large-zh-v1.5</option>
                <option value="m3e-large">m3e-large</option>
              </select>
              <label className="label">
                <span className="label-text-alt">不同模型的向量维度和性能各不相同</span>
              </label>
            </div>
          </div>
          
          <div className="modal-action">
            <button 
              className="btn btn-ghost"
              onClick={() => setShowAddDialog(false)}
            >
              取消
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                createKnowledgeBase('新知识库', 'text-embedding-3-small');
                setShowAddDialog(false);
              }}
            >
              创建
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={() => setShowAddDialog(false)}></div>
      </div>
    );
  };
  
  // 知识库设置对话框
  const renderSettingsDialog = () => {
    if (!showSettingsDialog || !selectedKnowledgeBase) return null;
    
    return (
      <div className="modal modal-open">
        <div className="modal-box max-w-lg bg-base-100">
          <h3 className="font-bold text-lg">知识库设置</h3>
          <button 
            className="btn btn-sm btn-circle absolute right-2 top-2"
            onClick={() => setShowSettingsDialog(false)}
          >✕</button>
          
          <div className="py-2">
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text"><span className="text-error">*</span> 名称</span>
              </label>
              <input 
                type="text" 
                defaultValue={selectedKnowledgeBase.name} 
                className="input input-bordered w-full bg-base-200 h-10" 
              />
            </div>
            
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text"><span className="text-error">*</span> 嵌入模型 <span className="text-xs opacity-70">ⓘ</span></span>
              </label>
              <select 
                className="select select-bordered w-full bg-base-200 h-10"
                defaultValue={selectedKnowledgeBase.model}
                disabled
              >
                <option value="text-embedding-3-small">text-embedding-3-small (OpenAI)</option>
                <option value="text-embedding-3-large">text-embedding-3-large (OpenAI)</option>
                <option value="text-embedding-ada-002">text-embedding-ada-002 (OpenAI)</option>
                <option value="bge-m3">BAAI/bge-m3</option>
              </select>
            </div>
            
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text">请求文档分段数量 <span className="text-xs opacity-70">ⓘ</span></span>
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
                <span className="text-xl font-medium">{segmentCount}</span>
              </div>
            </div>
            
            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text">分段大小 <span className="text-xs opacity-70">ⓘ</span></span>
              </label>
              <input 
                type="text" 
                placeholder="默认值（不建议修改）" 
                className="input input-bordered w-full bg-base-200 h-10" 
              />
            </div>

            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text">重叠大小 <span className="text-xs opacity-70">ⓘ</span></span>
              </label>
              <input 
                type="text" 
                placeholder="默认值（不建议修改）" 
                className="input input-bordered w-full bg-base-200 h-10" 
              />
            </div>

            <div className="form-control w-full mb-2">
              <label className="label py-1">
                <span className="label-text">匹配度阈值 <span className="text-xs opacity-70">ⓘ</span></span>
              </label>
              <input 
                type="text" 
                placeholder="未设置" 
                className="input input-bordered w-full bg-base-200 h-10" 
              />
            </div>
          </div>
          
          <div className="modal-action">
            <button 
              className="btn btn-outline"
              onClick={() => setShowSettingsDialog(false)}
            >
              取消
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setShowSettingsDialog(false)}
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
          <button className="btn btn-sm">刷新</button>
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