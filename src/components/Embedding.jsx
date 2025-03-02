import React, { useState } from 'react';

const Embedding = () => {
  const [activeTab, setActiveTab] = useState('textInput');

  return (
    <div className="flex flex-col h-full bg-base-100 overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex items-center p-2 border-b border-base-300">
        <h2 className="text-xl font-semibold px-2">Embedding</h2>
        <div className="flex-grow"></div>
        <div className="btn-group">
          <button className="btn btn-sm">模型设置</button>
          <button className="btn btn-sm">知识库</button>
          <button className="btn btn-sm">导出</button>
        </div>
      </div>

      {/* 主体内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板 */}
        <div className="w-1/3 border-r border-base-300 flex flex-col overflow-hidden">
          {/* 选项卡导航 */}
          <div className="tabs tabs-boxed bg-base-200 p-1 m-2">
            <a 
              className={`tab ${activeTab === 'textInput' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('textInput')}
            >
              文本输入
            </a>
            <a 
              className={`tab ${activeTab === 'fileUpload' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('fileUpload')}
            >
              文件上传
            </a>
            <a 
              className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              历史记录
            </a>
          </div>

          {/* 选项卡内容 */}
          <div className="flex-1 overflow-auto p-2">
            {activeTab === 'textInput' && (
              <div className="flex flex-col h-full">
                <textarea 
                  className="textarea textarea-bordered flex-1 mb-2" 
                  placeholder="输入要生成嵌入的文本..."
                ></textarea>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">文本分块方式</span>
                  </label>
                  <select className="select select-bordered w-full">
                    <option>按段落</option>
                    <option>按句子</option>
                    <option>自定义长度</option>
                  </select>
                </div>
                <button className="btn btn-primary mt-4">生成嵌入</button>
              </div>
            )}

            {activeTab === 'fileUpload' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center p-6">
                  <div className="text-5xl mb-4">📄</div>
                  <p className="mb-4 text-center">拖放文件到此处或点击上传</p>
                  <button className="btn btn-outline">选择文件</button>
                </div>
                <button className="btn btn-primary mt-4">处理文件</button>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex flex-col h-full">
                <p className="text-center py-8 text-base-content text-opacity-60">
                  历史记录将在此显示
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 结果选项卡 */}
          <div className="tabs tabs-boxed bg-base-200 p-1 m-2">
            <a className="tab tab-active">向量结果</a>
            <a className="tab">相似度分析</a>
            <a className="tab">可视化</a>
          </div>

          {/* 结果内容区 */}
          <div className="flex-1 overflow-auto p-4">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">嵌入向量</h2>
                <p className="text-base-content text-opacity-60">
                  生成的嵌入向量将在此显示
                </p>
                <div className="flex justify-between mt-4">
                  <div>
                    <p><span className="font-semibold">模型:</span> 未选择</p>
                    <p><span className="font-semibold">维度:</span> --</p>
                  </div>
                  <div>
                    <p><span className="font-semibold">生成时间:</span> --</p>
                    <p><span className="font-semibold">文本长度:</span> 0 字符</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="alert bg-base-300 mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>请在左侧输入文本或上传文件后生成嵌入向量</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="p-2 border-t border-base-300 text-sm text-base-content text-opacity-60">
        准备就绪
      </div>
    </div>
  );
};

export default Embedding; 