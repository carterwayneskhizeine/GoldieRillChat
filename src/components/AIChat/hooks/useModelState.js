import { useState, useEffect } from 'react';
import { STORAGE_KEYS, MODEL_PROVIDERS, DEFAULT_SETTINGS } from '../constants';

export const useModelState = () => {
  // 模型相关状态
  const [selectedProvider, setSelectedProvider] = useState(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER);
    return savedProvider && MODEL_PROVIDERS[savedProvider] ? savedProvider : DEFAULT_SETTINGS.PROVIDER;
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    const savedModel = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
    const provider = localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER) || DEFAULT_SETTINGS.PROVIDER;
    return savedModel && MODEL_PROVIDERS[provider]?.models.includes(savedModel) 
      ? savedModel 
      : MODEL_PROVIDERS[provider]?.models[0] || DEFAULT_SETTINGS.MODEL;
  });

  const [availableModels, setAvailableModels] = useState(() => {
    const provider = localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER) || DEFAULT_SETTINGS.PROVIDER;
    return MODEL_PROVIDERS[provider]?.models || [];
  });
  
  // API 设置状态
  const [apiHost, setApiHost] = useState(() => {
    const savedApiHost = localStorage.getItem(STORAGE_KEYS.API_HOST);
    const provider = localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER) || DEFAULT_SETTINGS.PROVIDER;
    return savedApiHost || MODEL_PROVIDERS[provider]?.apiHost || DEFAULT_SETTINGS.API_HOST;
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    // 初始化时从 localStorage 加载 API 密钥
    const provider = localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER) || DEFAULT_SETTINGS.PROVIDER;
    return localStorage.getItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${provider}`) || '';
  });
  
  // 设置弹窗状态
  const [showSettings, setShowSettings] = useState(false);

  // 当提供商改变时更新可用模型列表和 API 主机
  useEffect(() => {
    if (MODEL_PROVIDERS[selectedProvider]) {
      setAvailableModels(MODEL_PROVIDERS[selectedProvider].models);
      
      // 如果当前选择的模型不在新提供商的模型列表中，选择第一个可用的模型
      if (!MODEL_PROVIDERS[selectedProvider].models.includes(selectedModel)) {
        setSelectedModel(MODEL_PROVIDERS[selectedProvider].models[0]);
      }

      // 更新 API 主机
      const savedApiHost = localStorage.getItem(`${STORAGE_KEYS.API_HOST}_${selectedProvider}`);
      setApiHost(savedApiHost || MODEL_PROVIDERS[selectedProvider].apiHost);

      // 加载对应提供商的 API 密钥
      const savedApiKey = localStorage.getItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${selectedProvider}`);
      setApiKey(savedApiKey || '');
    }
  }, [selectedProvider]);

  // 当 API 密钥变更时保存到 localStorage
  useEffect(() => {
    if (selectedProvider && apiKey !== undefined) {
      if (apiKey.trim()) {
        localStorage.setItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${selectedProvider}`, apiKey);
      } else {
        localStorage.removeItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${selectedProvider}`);
      }
    }
  }, [selectedProvider, apiKey]);

  // 当 API 密钥变更时更新模型列表
  useEffect(() => {
    const updateModelList = async () => {
      if (!apiKey || !selectedProvider) return;

      try {
        let response;
        let data;

        // 移除可能重复的 v1 路径
        const baseUrl = apiHost.endsWith('/v1') ? apiHost : `${apiHost}/v1`;

        if (selectedProvider === 'openrouter') {
          // OpenRouter的apiHost已经包含了api/v1，所以直接拼接models
          response = await fetch(`${apiHost}/models`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'GoldieRillChat'
            }
          });
        } else {
          response = await fetch(`${baseUrl}/models`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
        }

        if (!response.ok) {
          console.error('获取模型列表失败:', response.status);
          // 如果获取失败，使用默认的模型列表
          setAvailableModels(MODEL_PROVIDERS[selectedProvider]?.models || []);
          return;
        }

        data = await response.json();
        let models = [];

        switch (selectedProvider) {
          case 'openai':
            models = data.data.filter(model => model.id.includes('gpt')).map(model => model.id);
            break;
          case 'claude':
            models = data.models.map(model => model.name);
            break;
          case 'openrouter':
            models = data.data.map(model => model.id);
            break;
          case 'siliconflow':
          case 'deepseek':
          case 'stepfun':
            models = data.data.map(model => model.id);
            break;
          default:
            models = MODEL_PROVIDERS[selectedProvider]?.models || [];
        }

        if (models.length > 0) {
          setAvailableModels(models);
          // 如果当前选择的模型不在新的列表中，选择第一个可用的模型
          if (!models.includes(selectedModel)) {
            setSelectedModel(models[0]);
          }
        } else {
          // 如果没有获取到模型列表，使用默认的
          setAvailableModels(MODEL_PROVIDERS[selectedProvider]?.models || []);
        }
      } catch (error) {
        console.error('获取模型列表失败:', error);
        // 如果发生错误，使用默认的模型列表
        setAvailableModels(MODEL_PROVIDERS[selectedProvider]?.models || []);
      }
    };

    updateModelList();
  }, [apiKey, selectedProvider, apiHost]);

  // 保存设置到本地存储
  useEffect(() => {
    if (selectedProvider && MODEL_PROVIDERS[selectedProvider]) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_PROVIDER, selectedProvider);
      localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, selectedModel);
      localStorage.setItem(STORAGE_KEYS.API_HOST, apiHost);
      localStorage.setItem(`${STORAGE_KEYS.API_HOST}_${selectedProvider}`, apiHost);
      
      // 只有当API密钥不为空时才保存
      if (apiKey.trim()) {
        localStorage.setItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${selectedProvider}`, apiKey);
      } else {
        // 如果API密钥为空，则删除存储的密钥
        localStorage.removeItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${selectedProvider}`);
      }
    }
  }, [selectedProvider, selectedModel, apiHost, apiKey]);

  return {
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    availableModels,
    setAvailableModels,
    apiHost,
    setApiHost,
    apiKey,
    setApiKey,
    showApiKey,
    setShowApiKey,
    showSettings,
    setShowSettings
  };
}; 