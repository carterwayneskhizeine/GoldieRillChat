import React, { useEffect, useState } from 'react';
import '../styles/settings.css';
import { getTranslationApiConfig, setTranslationApiConfig } from '../../../services/translationService';
import { getImageGenApiConfig, setImageGenApiConfig } from '../../../services/imageGenerationService';

export const SettingsModal = ({
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  handleModelChange,
  availableModels,
  apiHost,
  handleApiHostChange,
  apiKey,
  setApiKey,
  showApiKey,
  setShowApiKey,
  handleSettingsClose,
  MODEL_PROVIDERS,
  onImageSettingsUpdate,
  systemPrompt,
  setSystemPrompt,
  systemPromptEnabled,
  setSystemPromptEnabled,
  systemPromptTemplates,
  setSystemPromptTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  applyTemplate,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  resetTemplates
}) => {
  // 确保 selectedProvider 是有效的
  const currentProvider = MODEL_PROVIDERS[selectedProvider] || MODEL_PROVIDERS.openai;

  // 添加 tabs 状态
  const [activeTab, setActiveTab] = useState('provider');
  
  // 添加翻译 API 设置相关状态
  const [translationApiKey, setTranslationApiKey] = useState(() => {
    const { apiKey } = getTranslationApiConfig();
    return apiKey || '';
  });
  
  const [translationApiHost, setTranslationApiHost] = useState(() => {
    const { apiHost } = getTranslationApiConfig();
    return apiHost || 'https://api.siliconflow.cn';
  });
  
  const [showTranslationApiKey, setShowTranslationApiKey] = useState(false);
  
  // 添加 Google Search 相关状态
  const [googleApiKey, setGoogleApiKey] = useState(() => {
    return localStorage.getItem('aichat_google_api_key') || '';
  });
  const [searchEngineId, setSearchEngineId] = useState(() => {
    return localStorage.getItem('aichat_search_engine_id') || '';
  });
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);
  
  // 添加最大搜索数量状态
  const [maxSearchResults, setMaxSearchResults] = useState(() => {
    return parseInt(localStorage.getItem('aichat_max_search_results')) || 5;
  });

  // 添加消息历史记录数量状态
  const [maxHistoryMessages, setMaxHistoryMessages] = useState(() => {
    const saved = localStorage.getItem('aichat_max_history_messages');
    return saved ? parseInt(saved) : 5;  // 默认5条
  });

  // 添加系统提示词模板编辑状态
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  // 添加生图模型状态
  const [imageModel, setImageModel] = useState(() => {
    return localStorage.getItem('aichat_image_model') || 'black-forest-labs/FLUX.1-schnell';
  });

  // 添加视频模型状态
  const [videoModel, setVideoModel] = useState(() => {
    return localStorage.getItem('aichat_video_model') || 'Lightricks/LTX-Video';
  });

  // 添加视频随机种子状态
  const [videoSeed, setVideoSeed] = useState(() => 
    parseInt(localStorage.getItem('aichat_video_seed')) || Math.floor(Math.random() * 9999999999)
  );

  // 添加图片分辨率状态
  const [imageSize, setImageSize] = useState(() => {
    return localStorage.getItem('aichat_image_size') || '1024x576';
  });

  // 添加 FLUX.1-pro 模型的参数状态
  const [imageWidth, setImageWidth] = useState(() => 
    parseInt(localStorage.getItem('aichat_image_width')) || 1024
  );
  const [imageHeight, setImageHeight] = useState(() => 
    parseInt(localStorage.getItem('aichat_image_height')) || 768
  );
  const [imageSteps, setImageSteps] = useState(() => 
    parseInt(localStorage.getItem('aichat_image_steps')) || 20
  );
  const [imageGuidance, setImageGuidance] = useState(() => 
    parseFloat(localStorage.getItem('aichat_image_guidance')) || 3
  );
  const [imageSafety, setImageSafety] = useState(() => 
    parseInt(localStorage.getItem('aichat_image_safety')) || 2
  );
  const [imageInterval, setImageInterval] = useState(() => 
    parseFloat(localStorage.getItem('aichat_image_interval')) || 2
  );
  const [promptUpsampling, setPromptUpsampling] = useState(() => 
    localStorage.getItem('aichat_prompt_upsampling') === 'true'
  );

  // 添加 FLUX.1-dev 模型的参数状态
  const [devImageSteps, setDevImageSteps] = useState(() => 
    parseInt(localStorage.getItem('aichat_dev_image_steps')) || 20
  );
  const [devPromptEnhancement, setDevPromptEnhancement] = useState(() => 
    localStorage.getItem('aichat_dev_prompt_enhancement') === 'true'
  );

  // 添加其他模型的提示增强状态
  const [sdPromptEnhancement, setSdPromptEnhancement] = useState(() => 
    localStorage.getItem('aichat_sd_prompt_enhancement') === 'true'
  );
  const [schnellPromptEnhancement, setSchnellPromptEnhancement] = useState(() => 
    localStorage.getItem('aichat_schnell_prompt_enhancement') === 'true'
  );

  // 添加图片生成 API 相关状态
  const [imageGenApiKey, setImageGenApiKey] = useState('');
  const [imageGenApiHost, setImageGenApiHost] = useState('');
  const [showImageGenApiKey, setShowImageGenApiKey] = useState(false);

  // 生图模型列表
  const IMAGE_MODELS = [
    'black-forest-labs/FLUX.1-schnell',
    'black-forest-labs/FLUX.1-dev',
    'black-forest-labs/FLUX.1-pro',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'stabilityai/stable-diffusion-3-5-large',
    'stabilityai/stable-diffusion-3-5-large-turbo',
    'deepseek-ai/Janus-Pro-7B',
    'stabilityai/stable-diffusion-3-medium',
    'stabilityai/stable-diffusion-2-1',
    'Pro/black-forest-labs/FLUX.1-schnell',
    'LoRA/black-forest-labs/FLUX.1-dev'
  ];

  // 视频模型列表
  const VIDEO_MODELS = [
    'Lightricks/LTX-Video',
    'tencent/HunyuanVideo',
    'genmo/mochi-1-preview'
  ];

  // 图片分辨率列表
  const IMAGE_SIZES = [
    // 16:9 分辨率选项
    { value: '1024x576', label: '1024×576 (16:9 横版)' },
    { value: '1280x720', label: '1280×720 (16:9 横版)' },
    // FLUX.1-dev 官方支持的分辨率
    { value: '1024x1024', label: '1024×1024 (1:1 方形)' },
    { value: '960x1280', label: '960×1280 (3:4 竖版)' },
    { value: '768x1024', label: '768×1024 (3:4 竖版)' },
    { value: '720x1440', label: '720×1440 (1:2 竖版)' },
    { value: '720x1280', label: '720×1280 (9:16 竖版)' }
  ];

  // 初始化时加载翻译 API 配置
  useEffect(() => {
    const { apiKey, apiHost } = getTranslationApiConfig();
    setTranslationApiKey(apiKey || '');
    setTranslationApiHost(apiHost || '');
    
    // 加载图片生成 API 配置
    const { apiKey: imgApiKey, apiHost: imgApiHost } = getImageGenApiConfig();
    setImageGenApiKey(imgApiKey || '');
    setImageGenApiHost(imgApiHost || '');
  }, []);

  // 处理翻译 API 密钥变更
  const handleTranslationApiKeyChange = (value) => {
    setTranslationApiKey(value);
    setTranslationApiConfig(value, translationApiHost);
  };

  // 处理翻译 API 地址变更
  const handleTranslationApiHostChange = (value) => {
    setTranslationApiHost(value);
    setTranslationApiConfig(translationApiKey, value);
  };

  // 处理翻译 API 密钥粘贴
  const handleTranslationApiKeyPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleTranslationApiKeyChange(text);
    } catch (error) {
      console.error('粘贴失败:', error);
    }
  };

  // 处理 Google API 密钥变更
  const handleGoogleApiKeyChange = (value) => {
    setGoogleApiKey(value);
    localStorage.setItem('aichat_google_api_key', value);
  };

  // 处理搜索引擎 ID 变更
  const handleSearchEngineIdChange = (value) => {
    setSearchEngineId(value);
    localStorage.setItem('aichat_search_engine_id', value);
  };

  // 处理 Google API 密钥粘贴
  const handleGoogleApiKeyPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleGoogleApiKeyChange(text);
    } catch (error) {
      console.error('粘贴失败:', error);
    }
  };

  // 处理 API 密钥变更
  const handleApiKeyChange = (value) => {
    setApiKey(value);
  };

  // 处理粘贴
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKey(text);
    } catch (error) {
      console.error('粘贴失败:', error);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      e.preventDefault();
      handlePaste();
    }
  };

  // 处理最大搜索数量变更
  const handleMaxSearchResultsChange = (value) => {
    const numValue = parseInt(value);
    setMaxSearchResults(numValue);
    localStorage.setItem('aichat_max_search_results', numValue.toString());
  };

  // 处理消息历史记录数量变更
  const handleMaxHistoryMessagesChange = (value) => {
    const numValue = parseInt(value);
    setMaxHistoryMessages(numValue);
    localStorage.setItem('aichat_max_history_messages', numValue.toString());
  };

  // 处理生图模型变更
  const handleImageModelChange = (value) => {
    setImageModel(value);
    localStorage.setItem('aichat_image_model', value);
  };

  // 处理图片分辨率变更
  const handleImageSizeChange = (value) => {
    setImageSize(value);
    localStorage.setItem('aichat_image_size', value);
  };

  const openExternalLink = (url) => {
    try {
      // 首选使用 electron 的 shell.openExternal
      if (window.electron?.shell?.openExternal) {
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

  // 处理模板选择
  const handleTemplateSelect = (templateId) => {
    applyTemplate(templateId);
  };

  // 处理添加模板
  const handleAddTemplate = () => {
    setIsAddingTemplate(true);
    setTemplateName('');
    setTemplateContent(systemPrompt || '');
    setEditingTemplateId(null);
  };

  // 处理编辑模板
  const handleEditTemplate = (template) => {
    setIsAddingTemplate(false);
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateContent(template.content);
  };

  // 处理保存模板
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('请输入模板名称');
      return;
    }

    if (!templateContent.trim()) {
      alert('请输入模板内容');
      return;
    }

    if (isAddingTemplate) {
      const newTemplateId = addTemplate(templateName, templateContent);
      setSelectedTemplateId(newTemplateId);
    } else if (editingTemplateId) {
      updateTemplate(editingTemplateId, templateName, templateContent);
    }

    // 重置编辑状态
    setIsAddingTemplate(false);
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateContent('');
  };

  // 处理取消编辑模板
  const handleCancelEditTemplate = () => {
    setIsAddingTemplate(false);
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateContent('');
  };

  // 处理删除模板
  const handleDeleteTemplate = (templateId) => {
    if (confirm('确定要删除此模板吗？')) {
      deleteTemplate(templateId);
    }
  };

  // 修改 collectMediaSettings 函数
  const collectMediaSettings = () => {
    const imageSettings = {
      model: imageModel,
      ...(imageModel === 'black-forest-labs/FLUX.1-pro' ? {
        width: 1024,
        height: 768,
        steps: imageSteps,
        guidance: imageGuidance,
        safety_tolerance: imageSafety,
        interval: imageInterval,
        prompt_upsampling: promptUpsampling
      } : imageModel === 'black-forest-labs/FLUX.1-dev' ? {
        image_size: imageSize,
        num_inference_steps: devImageSteps,
        prompt_enhancement: devPromptEnhancement
      } : imageModel.includes('stable-diffusion-3') ? {
        image_size: imageSize,
        prompt_enhancement: sdPromptEnhancement
      } : imageModel.includes('FLUX.1-schnell') ? {
        image_size: imageSize,
        prompt_enhancement: schnellPromptEnhancement
      } : {
        image_size: imageSize
      })
    };

    const videoSettings = {
      model: videoModel,
      seed: videoSeed
    };
    
    return {
      image: imageSettings,
      video: videoSettings
    };
  };

  // 修改关闭处理函数
  const handleClose = () => {
    // 收集并更新媒体设置
    const mediaSettings = collectMediaSettings();
    onImageSettingsUpdate?.(mediaSettings);
    
    // 调用原有的关闭处理函数
    handleSettingsClose();
  };

  // 处理图片生成 API 密钥变更
  const handleImageGenApiKeyChange = (value) => {
    setImageGenApiKey(value);
    setImageGenApiConfig(value, imageGenApiHost);
  };

  // 处理图片生成 API 地址变更
  const handleImageGenApiHostChange = (value) => {
    setImageGenApiHost(value);
    setImageGenApiConfig(imageGenApiKey, value);
  };

  // 处理图片生成 API 密钥粘贴
  const handleImageGenApiKeyPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setImageGenApiKey(text);
        setImageGenApiConfig(text, imageGenApiHost);
      }
    } catch (error) {
      console.error('粘贴失败:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-4 w-[650px] max-h-[80vh] overflow-y-auto settings-panel">
        {/* 标题和关闭按钮 */}
        <div className="flex justify-between items-center mb-6 px-2">
          <h1 className="text-2xl font-bold">Settings</h1>
          <button 
            type="button"
            className="btn btn-ghost btn-circle"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="space-y-4 px-2">
          {/* 标签页 */}
          <div className="tabs tabs-bordered w-full">
            <a 
              className={`tab ${activeTab === 'provider' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('provider')}
            >
              API
            </a>
            <a 
              className={`tab ${activeTab === 'system' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              Prompt
            </a>
            <a 
              className={`tab ${activeTab === 'media_gen' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('media_gen')}
            >
              Media
            </a>
            <a 
              className={`tab ${activeTab === 'search' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Search
            </a>
          </div>
          
          {/* Tab 1: 模型设置 */}
          <div className={activeTab === 'provider' ? '' : 'hidden'}>
            {/* 模型提供方 */}
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">模型提供方</h3>
              <select 
                className="select select-bordered w-full"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                {Object.entries(MODEL_PROVIDERS).map(([key, provider]) => (
                  <option key={key} value={key}>{provider.name}</option>
                ))}
              </select>
            </div>

            {/* 具体模型选择 */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">模型</h3>
              <select 
                className="select select-bordered w-full"
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {availableModels
                  .filter(model => !IMAGE_MODELS.includes(model))
                  .map(model => (
                  <option key={model} value={model}>{model}</option>
                  ))
                }
              </select>
            </div>

            {/* API 设置 */}
            <div className="space-y-4 px-0">
              {/* API Host */}
              <div>
                <div className="form-control w-full max-w-full">
                  <label className="label">
                    <span className="label-text font-medium text-base">API 地址</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full h-11 px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                    value={apiHost}
                    onChange={(e) => handleApiHostChange(e.target.value)}
                    placeholder="请输入 API 地址..."
                  />
                  <label className="label">
                    <span className="label-text-alt text-opacity-70">例如：https://api.openai.com</span>
                  </label>
                </div>
              </div>

              {/* API Key */}
              <div>
                <div className="form-control w-full max-w-none">
                  <label className="label">
                    <span className="label-text font-medium text-base">API 密钥</span>
                    {currentProvider.needsApiKey && (
                      <span className="label-text-alt text-error">必填</span>
                    )}
                  </label>
                  <div className="input-group w-full max-w-none flex">
                    <input
                      type={showApiKey ? "text" : "password"}
                      className="input input-bordered flex-grow h-11 px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary min-w-0"
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder={`请输入 ${currentProvider.name} API 密钥...`}
                      onKeyDown={handleKeyDown}
                    />
                    <button 
                      type="button"
                      className="btn btn-square btn-outline h-11 min-w-[3.5rem]"
                      onClick={handlePaste}
                      title="点击粘贴"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                    <button 
                      type="button"
                      className="btn btn-square btn-outline h-11 min-w-[3.5rem]"
                      onClick={() => setShowApiKey(!showApiKey)}
                      title={showApiKey ? "隐藏密钥" : "显示密钥"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                  {currentProvider.apiKeyHelp && (
                    <label className="label">
                      <span className="label-text-alt flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {currentProvider.apiKeyHelp.split(': ').map((part, index, array) => {
                          if (index === array.length - 1) {
                            return (
                              <a
                                key={index}
                                className="text-primary hover:text-primary-focus cursor-pointer"
                                onClick={() => openExternalLink(part.trim())}
                              >
                                {part.trim()}
                              </a>
                            );
                          }
                          return part + ': ';
                        })}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* 添加翻译设置到提供商设置 */}
              <div className="divider my-6"></div>
              <div className="space-y-4 px-0">
                <h3 className="text-lg font-medium">翻译设置</h3>
                
                {/* 翻译 API 主机地址 */}
                <div className="mb-4">
                  <div className="form-control w-full max-w-none">
                    <label className="label">
                      <span className="label-text font-medium text-base">SiliconFlow API 地址</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full h-11 px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                      value={translationApiHost}
                      onChange={(e) => handleTranslationApiHostChange(e.target.value)}
                      placeholder="https://api.siliconflow.cn"
                    />
                    <label className="label">
                      <span className="label-text-alt text-opacity-70">翻译功能使用的API地址</span>
                    </label>
                  </div>
                </div>
                
                {/* 翻译 API 密钥 */}
                <div className="mb-4">
                  <div className="form-control w-full max-w-none">
                    <label className="label">
                      <span className="label-text font-medium text-base">SiliconFlow API 密钥</span>
                    </label>
                    <div className="input-group w-full max-w-none flex">
                      <input
                        type={showTranslationApiKey ? "text" : "password"}
                        className="input input-bordered flex-grow h-11 px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary min-w-0"
                        value={translationApiKey}
                        onChange={(e) => handleTranslationApiKeyChange(e.target.value)}
                        placeholder="请输入用于翻译功能的 SiliconFlow API 密钥..."
                      />
                      <button 
                        type="button"
                        className="btn btn-square btn-outline h-11 min-w-[3.5rem]"
                        onClick={handleTranslationApiKeyPaste}
                        title="点击粘贴"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </button>
                      <button 
                        type="button"
                        className="btn btn-square btn-outline h-11 min-w-[3.5rem]"
                        onClick={() => setShowTranslationApiKey(!showTranslationApiKey)}
                        title={showTranslationApiKey ? "隐藏密钥" : "显示密钥"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showTranslationApiKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                        </svg>
                      </button>
                    </div>
                    <label className="label">
                      <span className="label-text-alt text-opacity-70">SiliconFlow API 密钥，用于图片和视频生成功能</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 2: 系统提示词设置 */}
          <div className={activeTab === 'system' ? '' : 'hidden'}>
            <div className="space-y-4">
              {/* 系统提示词启用开关 */}
              <div>
                <h3 className="text-lg font-medium mb-2">系统提示词</h3>
                <div className="form-control bg-base-200 rounded-lg p-3">
                  <label className="label cursor-pointer">
                    <span className="label-text font-medium">启用系统提示词</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={systemPromptEnabled}
                      onChange={(e) => setSystemPromptEnabled(e.target.checked)}
                    />
                  </label>
                  <div className="text-xs opacity-70 mt-1">
                    启用后，系统提示词将应用于所有对话，帮助AI更好地理解你的需求
                  </div>
                </div>
              </div>

              {/* 当前使用的模板信息 */}
              <div>
                <h3 className="text-lg font-medium mb-2">当前模板</h3>
                <div className="bg-base-200 p-3 rounded-lg">
                  <div className="font-medium">
                    {selectedTemplateId ? 
                      systemPromptTemplates.find(t => t.id === selectedTemplateId)?.name || '小葵女友模式' 
                      : '小葵女友模式'}
                  </div>
                </div>
              </div>

              {/* 系统提示词编辑 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">系统提示词内容</h3>
                </div>
                <textarea
                  className="textarea textarea-bordered w-full h-32"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="输入系统提示词..."
                  disabled={!systemPromptEnabled}
                />
                <div className="text-xs opacity-70 mt-2">
                  系统提示词会在每次对话开始时发送给AI，用于设定AI的行为和回答方式
                </div>
              </div>

              {/* 模板管理 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">模板管理</h3>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={handleAddTemplate}
                    disabled={!systemPromptEnabled}
                  >
                    添加新模板
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {systemPromptTemplates.map(template => (
                    <div key={template.id} className="flex justify-between items-center p-2 bg-base-200 rounded-lg">
                      <div className="flex-1 truncate">{template.name}</div>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-xs btn-outline"
                          onClick={() => handleTemplateSelect(template.id)}
                          disabled={selectedTemplateId === template.id}
                        >
                          使用
                        </button>
                        <button 
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleEditTemplate(template)}
                        >
                          编辑
                        </button>
                        <button 
                          className="btn btn-xs btn-ghost text-error"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={resetTemplates}
                  >
                    重置为默认模板
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 3: 媒体生成设置 */}
          <div className={activeTab === 'media_gen' ? '' : 'hidden'}>
            <div className="space-y-6">
              {/* 图片生成API设置 */}
              <div className="space-y-4">
                {/* SiliconFlow API 地址 */}
                <div>
                  <div className="form-control w-full max-w-none">
                    <label className="label">
                      <span className="label-text font-medium text-base">SiliconFlow API 地址</span>
                    </label>
                    <input 
                      type="text" 
                      className="input input-bordered w-full h-11 px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary" 
                      value={imageGenApiHost}
                      onChange={(e) => handleImageGenApiHostChange(e.target.value)}
                      placeholder="https://api.siliconflow.cn"
                    />
                    <label className="label">
                      <span className="label-text-alt text-opacity-70">媒体生成功能使用的API地址</span>
                    </label>
                  </div>
                </div>

                {/* SiliconFlow API 密钥 */}
                <div>
                  <div className="form-control w-full max-w-none">
                    <label className="label">
                      <span className="label-text font-medium text-base">SiliconFlow API 密钥</span>
                    </label>
                    <div className="input-group w-full max-w-none flex">
                      <input 
                        type={showImageGenApiKey ? "text" : "password"} 
                        className="input input-bordered flex-grow h-11 px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary min-w-0" 
                        value={imageGenApiKey}
                        onChange={(e) => handleImageGenApiKeyChange(e.target.value)}
                        placeholder="sk-..."
                      />
                      <button 
                        className="btn btn-square btn-outline h-11 min-w-[3.5rem]" 
                        onClick={handleImageGenApiKeyPaste}
                        title="点击粘贴"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </button>
                      <button 
                        className="btn btn-square btn-outline h-11 min-w-[3.5rem]" 
                        onClick={() => setShowImageGenApiKey(!showImageGenApiKey)}
                        title={showImageGenApiKey ? "隐藏密钥" : "显示密钥"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showImageGenApiKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="divider"></div>

              {/* 图片参数设置 */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold">图片参数设置</h3>
                
                {/* 生图模型选择 */}
                <div>
                  <h3 className="text-lg font-medium mb-2">生图模型</h3>
                  <select 
                    className="select select-bordered w-full"
                    value={imageModel}
                    onChange={(e) => handleImageModelChange(e.target.value)}
                  >
                    {IMAGE_MODELS.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <div className="text-xs opacity-70 mt-2">
                    选择用于图片生成的模型，使用 /image 命令时会使用此模型
                    {imageModel === 'black-forest-labs/FLUX.1-pro' && (
                      <div className="mt-1 text-info">
                        使用固定分辨率：1024×768
                      </div>
                    )}
                  </div>
                </div>

                {/* 根据不同的模型显示不同的设置选项 */}
                {imageModel === 'black-forest-labs/FLUX.1-pro' ? (
                  <>
                    {/* 步数设置 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">步数 (Steps)</h3>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="2"
                          max="50"
                          step="1"
                          value={imageSteps}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setImageSteps(value);
                            localStorage.setItem('aichat_image_steps', value.toString());
                          }}
                          className="range range-primary flex-1"
                        />
                        <div className="w-12 text-center font-medium bg-base-200 px-2 py-1 rounded">
                          {imageSteps}
                        </div>
                      </div>
                      <div className="text-xs opacity-70 mt-1">生成步数范围：2-50，步数越高，生成质量越好，但速度更慢</div>
                    </div>

                    {/* 引导系数设置 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">引导系数 (Guidance)</h3>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1.5"
                          max="5"
                          step="0.1"
                          value={imageGuidance}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setImageGuidance(value);
                            localStorage.setItem('aichat_image_guidance', value.toString());
                          }}
                          className="range range-primary flex-1"
                        />
                        <div className="w-12 text-center font-medium bg-base-200 px-2 py-1 rounded">
                          {imageGuidance}
                        </div>
                      </div>
                      <div className="text-xs opacity-70 mt-1">值越高越严格遵循提示词，值越低创造性越强</div>
                    </div>

                    {/* 安全容忍度设置 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">安全容忍度 (Safety Tolerance)</h3>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="6"
                          step="1"
                          value={imageSafety}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setImageSafety(value);
                            localStorage.setItem('aichat_image_safety', value.toString());
                          }}
                          className="range range-primary flex-1"
                        />
                        <div className="w-12 text-center font-medium bg-base-200 px-2 py-1 rounded">
                          {imageSafety}
                        </div>
                      </div>
                      <div className="text-xs opacity-70 mt-1">0 最严格，6 最宽松，控制内容过滤级别</div>
                    </div>

                    {/* 间隔参数设置 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">间隔参数 (Interval)</h3>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="4"
                          step="0.1"
                          value={imageInterval}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setImageInterval(value);
                            localStorage.setItem('aichat_image_interval', value.toString());
                          }}
                          className="range range-primary flex-1"
                        />
                        <div className="w-12 text-center font-medium bg-base-200 px-2 py-1 rounded">
                          {imageInterval}
                        </div>
                      </div>
                      <div className="text-xs opacity-70 mt-1">引导控制的间隔参数，范围：1-4</div>
                    </div>

                    {/* 提示词上采样开关 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">提示词上采样</h3>
                      <div className="form-control bg-base-200 rounded-lg p-3">
                        <label className="label cursor-pointer">
                          <span className="label-text font-medium">启用提示词上采样</span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={promptUpsampling}
                            onChange={(e) => {
                              setPromptUpsampling(e.target.checked);
                              localStorage.setItem('aichat_prompt_upsampling', e.target.checked.toString());
                            }}
                          />
                        </label>
                        <div className="text-xs opacity-70 mt-1">启用后将自动调整提示词以生成更具创意的内容</div>
                      </div>
                    </div>
                  </>
                ) : imageModel === 'black-forest-labs/FLUX.1-dev' ? (
                  <>
                    {/* 默认分辨率设置 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">默认分辨率</h3>
                      <select 
                        className="select select-bordered w-full"
                        value={imageSize}
                        onChange={(e) => handleImageSizeChange(e.target.value)}
                      >
                        {IMAGE_SIZES.map(size => (
                          <option key={size.value} value={size.value}>{size.label}</option>
                        ))}
                      </select>
                      <div className="text-xs opacity-70 mt-2">
                        选择图片生成的默认分辨率，也可以使用 /image 命令时通过 --size 参数指定其他分辨率
                      </div>
                    </div>

                    {/* 推理步骤数设置 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">推理步骤数 (Steps)</h3>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="2"
                          max="29"
                          step="1"
                          value={devImageSteps}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setDevImageSteps(value);
                            localStorage.setItem('aichat_dev_image_steps', value.toString());
                          }}
                          className="range range-primary flex-1"
                        />
                        <div className="w-12 text-center font-medium bg-base-200 px-2 py-1 rounded">
                          {devImageSteps}
                        </div>
                      </div>
                      <div className="text-xs opacity-70 mt-1">推理步骤数范围：2-29，步数越高细节越丰富</div>
                    </div>

                    {/* 提示增强开关 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">提示增强</h3>
                      <div className="form-control bg-base-200 rounded-lg p-3">
                        <label className="label cursor-pointer">
                          <span className="label-text font-medium">启用提示增强</span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={devPromptEnhancement}
                            onChange={(e) => {
                              setDevPromptEnhancement(e.target.checked);
                              localStorage.setItem('aichat_dev_prompt_enhancement', e.target.checked.toString());
                            }}
                          />
                        </label>
                        <div className="text-xs opacity-70 mt-1">启用后将自动优化提示词以生成更好的结果</div>
                      </div>
                    </div>
                  </>
                ) : imageModel.includes('stable-diffusion-3') ? (
                  <>
                    {/* 默认分辨率设置 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">默认分辨率</h3>
                      <select 
                        className="select select-bordered w-full"
                        value={imageSize}
                        onChange={(e) => handleImageSizeChange(e.target.value)}
                      >
                        {IMAGE_SIZES.map(size => (
                          <option key={size.value} value={size.value}>{size.label}</option>
                        ))}
                      </select>
                      <div className="text-xs opacity-70 mt-2">
                        选择图片生成的默认分辨率，也可以使用 /image 命令时通过 --size 参数指定其他分辨率
                      </div>
                    </div>

                    {/* 提示增强开关 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">提示增强</h3>
                      <div className="form-control bg-base-200 rounded-lg p-3">
                        <label className="label cursor-pointer">
                          <span className="label-text font-medium">启用提示增强</span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={sdPromptEnhancement}
                            onChange={(e) => {
                              setSdPromptEnhancement(e.target.checked);
                              localStorage.setItem('aichat_sd_prompt_enhancement', e.target.checked.toString());
                            }}
                          />
                        </label>
                        <div className="text-xs opacity-70 mt-1">启用后将自动优化提示词以生成更好的结果</div>
                      </div>
                    </div>
                  </>
                ) : imageModel.includes('FLUX.1-schnell') ? (
                  <>
                    {/* 默认分辨率设置 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">默认分辨率</h3>
                      <select 
                        className="select select-bordered w-full"
                        value={imageSize}
                        onChange={(e) => handleImageSizeChange(e.target.value)}
                      >
                        {IMAGE_SIZES.map(size => (
                          <option key={size.value} value={size.value}>{size.label}</option>
                        ))}
                      </select>
                      <div className="text-xs opacity-70 mt-2">
                        选择图片生成的默认分辨率，也可以使用 /image 命令时通过 --size 参数指定其他分辨率
                      </div>
                    </div>

                    {/* 提示增强开关 */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">提示增强</h3>
                      <div className="form-control bg-base-200 rounded-lg p-3">
                        <label className="label cursor-pointer">
                          <span className="label-text font-medium">启用提示增强</span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={schnellPromptEnhancement}
                            onChange={(e) => {
                              setSchnellPromptEnhancement(e.target.checked);
                              localStorage.setItem('aichat_schnell_prompt_enhancement', e.target.checked.toString());
                            }}
                          />
                        </label>
                        <div className="text-xs opacity-70 mt-1">启用后将自动优化提示词以生成更好的结果</div>
                      </div>
                    </div>
                  </>
                ) : (
                  // 其他模型的默认分辨率设置
                  <div>
                    <h3 className="text-lg font-medium mb-2">默认分辨率</h3>
                    <select 
                      className="select select-bordered w-full"
                      value={imageSize}
                      onChange={(e) => handleImageSizeChange(e.target.value)}
                    >
                      {IMAGE_SIZES.map(size => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                      ))}
                    </select>
                    <div className="text-xs opacity-70 mt-2">
                      选择图片生成的默认分辨率，也可以使用 /image 命令时通过 --size 参数指定其他分辨率
                    </div>
                  </div>
                )}
              </div>

              <div className="divider"></div>

              {/* 视频参数设置 */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold">视频参数设置</h3>
                
                {/* 视频模型选择 */}
                <div>
                  <h3 className="text-lg font-medium mb-2">视频生成模型</h3>
                  <select 
                    className="select select-bordered w-full"
                    value={videoModel}
                    onChange={(e) => {
                      const value = e.target.value;
                      setVideoModel(value);
                      localStorage.setItem('aichat_video_model', value);
                    }}
                  >
                    {VIDEO_MODELS.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <div className="text-xs opacity-70 mt-2">
                    选择用于视频生成的模型，使用 /video 命令时会使用此模型
                  </div>
                </div>

                {/* 随机种子设置 */}
                <div>
                  <h3 className="text-lg font-medium mb-2">随机种子 (Seed)</h3>
                  <div className="flex items-center gap-0 w-full input-group flex">
                    <input
                      type="number"
                      min="0"
                      max="9999999999"
                      value={videoSeed}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 0 && value <= 9999999999) {
                          setVideoSeed(value);
                          localStorage.setItem('aichat_video_seed', value.toString());
                        }
                      }}
                      className="input input-bordered flex-grow h-11 px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary min-w-0"
                    />
                    <button
                      className="btn btn-square btn-outline h-11 min-w-[3.5rem]"
                      onClick={() => {
                        const newSeed = Math.floor(Math.random() * 9999999999);
                        setVideoSeed(newSeed);
                        localStorage.setItem('aichat_video_seed', newSeed.toString());
                      }}
                      title="生成新的随机种子"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-xs opacity-70 mt-1">设置随机种子以获得可重复的结果（0-9999999999），留空则随机生成</div>
                </div>

                {/* 帮助信息 */}
                <div className="text-xs opacity-70 space-y-2">
                  <div className="settings-help-text">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      生成的视频链接有效期为1小时，请及时下载保存
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 4: 搜索设置 */}
          <div className={activeTab === 'search' ? '' : 'hidden'}>
            <div className="space-y-4">
              {/* Google Search API Key */}
              <div>
                <div className="form-control w-full max-w-none">
                  <label className="label">
                    <span className="label-text font-medium text-base">Google Custom Search JSON API</span>
                  </label>
                  <div className="input-group w-full max-w-none flex">
                    <input
                      type={showGoogleApiKey ? "text" : "password"}
                      className="input input-bordered flex-grow h-11 px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary min-w-0"
                      value={googleApiKey}
                      onChange={(e) => handleGoogleApiKeyChange(e.target.value)}
                      placeholder="Google Custom Search JSON API..."
                    />
                    <button 
                      type="button"
                      className="btn btn-square btn-outline h-11 min-w-[3.5rem]"
                      onClick={handleGoogleApiKeyPaste}
                      title="点击粘贴"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                    <button 
                      type="button"
                      className="btn btn-square btn-outline h-11 min-w-[3.5rem]"
                      onClick={() => setShowGoogleApiKey(!showGoogleApiKey)}
                      title={showGoogleApiKey ? "隐藏密钥" : "显示密钥"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showGoogleApiKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                      </svg>
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-opacity-70">用于网络搜索功能的 Google API 密钥</span>
                  </label>
                </div>
              </div>

              {/* Search Engine ID */}
              <div>
                <h3 className="text-lg font-medium mb-2">搜索引擎 ID</h3>
                <div className="flex flex-col gap-2 w-full max-w-none">
                  <div className="flex w-full max-w-none gap-0">
                    <input
                      type="text"
                      className="input input-bordered w-full min-w-0"
                      value={searchEngineId}
                      onChange={(e) => handleSearchEngineIdChange(e.target.value)}
                      placeholder="请输入搜索引擎 ID..."
                    />
                  </div>
                </div>
              </div>

              {/* 最大搜索数量滑块 */}
              <div>
                <h3 className="text-lg font-medium mb-2">最大搜索结果数量</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={maxSearchResults}
                      onChange={(e) => handleMaxSearchResultsChange(e.target.value)}
                      className="range range-primary"
                      step="1"
                    />
                    <span className="text-lg font-medium min-w-[3ch]">{maxSearchResults}</span>
                  </div>
                  <div className="text-xs opacity-70">
                    设置每次搜索返回的最大结果数量（1-10），免费用户每次搜索最多返回10条结果
                  </div>
                </div>
              </div>

              {/* 帮助信息 */}
              <div className="text-xs opacity-70 space-y-2">
                <div className="settings-help-text">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    每天免费提供100次搜索查询，超出部分按每1000次查询收费$5
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 模板编辑对话框 */}
      {(isAddingTemplate || editingTemplateId) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg p-4 w-[650px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 px-2">
              {isAddingTemplate ? '添加新模板' : '编辑模板'}
            </h2>
            
            <div className="space-y-4 px-2">
              <div>
                <label className="label">
                  <span className="label-text">模板名称</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="输入模板名称..."
                />
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text">模板内容</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-48"
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="输入模板内容..."
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  className="btn btn-ghost"
                  onClick={handleCancelEditTemplate}
                >
                  取消
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveTemplate}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 