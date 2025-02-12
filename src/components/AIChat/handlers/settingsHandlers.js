import { STORAGE_KEYS } from '../constants/storageKeys';

export const createSettingsHandlers = ({
  setSelectedProvider,
  setSelectedModel,
  setApiHost,
  setShowSettings
}) => {
  // 处理提供商变更
  const handleProviderChange = (provider) => {
    setSelectedProvider(provider);
    localStorage.setItem(STORAGE_KEYS.SELECTED_PROVIDER, provider);
  };

  // 处理模型变更
  const handleModelChange = (model) => {
    setSelectedModel(model);
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
  };

  // 处理 API 地址变更
  const handleApiHostChange = (host) => {
    setApiHost(host);
    localStorage.setItem(STORAGE_KEYS.API_HOST, host);
  };

  // 处理 API Key 粘贴
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const provider = localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER);
      localStorage.setItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${provider}`, text);
    } catch (error) {
      console.error('粘贴失败:', error);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    // 处理粘贴快捷键
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      e.preventDefault();
      handlePaste();
    }
  };

  // 关闭设置
  const handleSettingsClose = () => {
    setShowSettings(false);
  };

  return {
    handleProviderChange,
    handleModelChange,
    handleApiHostChange,
    handlePaste,
    handleKeyDown,
    handleSettingsClose
  };
}; 