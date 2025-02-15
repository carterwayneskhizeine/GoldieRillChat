import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { SettingsModal } from './components/SettingsModal';

import { useMessageState } from './hooks/useMessageState';
import { useModelState } from './hooks/useModelState';
import { useInputState } from './hooks/useInputState';

import { createMessageHandlers } from './handlers/messageHandlers';
import { createSettingsHandlers } from './handlers/settingsHandlers';
import { createInputHandlers } from './handlers/inputHandlers';

import { MODEL_PROVIDERS } from './constants';
import './styles/messages.css';
import './styles/settings.css';

export const AIChat = ({
  sendToSidebar,
  createNewConversation,
  storagePath,
  currentConversation,
  conversations,
  onConversationSelect,
  onConversationDelete,
  onConversationRename,
  window,
  electron
}) => {
  // 使用状态管理 hooks
  const messageState = useMessageState(currentConversation);
  const modelState = useModelState();
  const inputState = useInputState();

  // 添加新的状态
  const [maxTokens, setMaxTokens] = useState(() => {
    return parseInt(localStorage.getItem('aichat_max_tokens')) || 2000;
  });

  const [temperature, setTemperature] = useState(() => {
    return parseFloat(localStorage.getItem('aichat_temperature')) || 0.7;
  });

  // 添加创建新对话的函数
  const handleCreateNewConversation = async () => {
    try {
      // 直接调用父组件传入的创建函数
      await createNewConversation();
    } catch (error) {
      console.error('创建新对话失败:', error);
      alert('创建新对话失败: ' + error.message);
    }
  };

  // 添加滚动到底部的函数
  const scrollToBottom = () => {
    const messagesContainer = document.querySelector('#ai-chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  // 监听消息变化和对话切换，自动滚动到底部
  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messageState.messages, currentConversation]);

  // 在组件挂载时将创建新对话的函数绑定到 window.aichat
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.aichat = window.aichat || {};
      window.aichat.createNewConversation = handleCreateNewConversation;
      window.aichat.setShowSettings = modelState.setShowSettings;
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.aichat) {
        delete window.aichat.createNewConversation;
        delete window.aichat.setShowSettings;
      }
    };
  }, [createNewConversation, modelState.setShowSettings]);

  // 创建消息处理函数
  const messageHandlers = createMessageHandlers({
    messages: messageState.messages,
    setMessages: messageState.setMessages,
    setEditingMessageId: messageState.setEditingMessageId,
    setEditContent: messageState.setEditContent,
    setRetryingMessageId: messageState.setRetryingMessageId,
    setFailedMessages: messageState.setFailedMessages,
    selectedModel: modelState.selectedModel,
    selectedProvider: modelState.selectedProvider,
    apiKey: modelState.apiKey,
    apiHost: modelState.apiHost,
    setMessageStates: messageState.setMessageStates,
    currentConversation,
    window,
    maxTokens,
    temperature,
    editContent: messageState.editContent
  });

  // 创建设置处理函数
  const settingsHandlers = createSettingsHandlers({
    setSelectedProvider: modelState.setSelectedProvider,
    setSelectedModel: modelState.setSelectedModel,
    setApiHost: modelState.setApiHost,
    setShowSettings: modelState.setShowSettings
  });

  // 创建输入处理函数
  const inputHandlers = createInputHandlers({
    messageInput: inputState.messageInput,
    setMessageInput: inputState.setMessageInput,
    setIsGenerating: inputState.setIsGenerating,
    selectedFile: inputState.selectedFile,
    setSelectedFile: inputState.setSelectedFile,
    addToHistory: inputState.addToHistory,
    handleHistoryNavigation: inputState.handleHistoryNavigation,
    addMessage: messageHandlers.addMessage,
    currentConversation,
    messages: messageState.messages,
    setMessages: messageState.setMessages,
    selectedProvider: modelState.selectedProvider,
    selectedModel: modelState.selectedModel,
    apiKey: modelState.apiKey,
    apiHost: modelState.apiHost,
    setMessageStates: messageState.setMessageStates,
    setAnimationStates: messageState.setAnimationStates,
    setFailedMessages: messageState.setFailedMessages,
    setRetryingMessageId: messageState.setRetryingMessageId,
    maxTokens,
    temperature
  });

  // 添加 openFileLocation 函数
  const openFileLocation = async (file) => {
    try {
      await electron.openFileLocation(file.path);
    } catch (error) {
      console.error('Failed to open file location:', error);
      alert('打开文件位置失败');
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* 顶部标题栏 */}
      <div className="flex-none">
        <Header
          selectedModel={modelState.selectedModel}
          setSelectedModel={modelState.setSelectedModel}
          availableModels={modelState.availableModels}
          currentConversation={currentConversation}
          setShowSettings={modelState.setShowSettings}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
          temperature={temperature}
          setTemperature={setTemperature}
        />
      </div>

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-auto">
        <MessageList
          messages={messageState.messages}
          selectedModel={modelState.selectedModel}
          editingMessageId={messageState.editingMessageId}
          editContent={messageState.editContent}
          setEditContent={messageState.setEditContent}
          handleEditStart={messageHandlers.startEditing}
          handleEditCancel={messageHandlers.cancelEditing}
          handleEditSave={messageHandlers.saveEdit}
          handleDeleteMessage={messageHandlers.deleteMessage}
          handleRetry={messageHandlers.handleRetry}
          handleHistoryNavigation={messageHandlers.handleHistoryNavigation}
          openFileLocation={openFileLocation}
        />
      </div>

      {/* 底部输入区域 */}
      <div className="flex-none">
        <InputArea
          messageInput={inputState.messageInput}
          setMessageInput={inputState.setMessageInput}
          handleSendMessage={inputHandlers.handleSendMessage}
          handleKeyDown={inputHandlers.handleKeyDown}
          fileInputRef={inputState.fileInputRef}
        />
      </div>

      {/* 设置弹窗 */}
      {modelState.showSettings && (
        <SettingsModal
          selectedProvider={modelState.selectedProvider}
          setSelectedProvider={modelState.setSelectedProvider}
          selectedModel={modelState.selectedModel}
          handleModelChange={settingsHandlers.handleModelChange}
          availableModels={modelState.availableModels}
          apiHost={modelState.apiHost}
          handleApiHostChange={settingsHandlers.handleApiHostChange}
          apiKey={modelState.apiKey}
          setApiKey={modelState.setApiKey}
          showApiKey={modelState.showApiKey}
          setShowApiKey={modelState.setShowApiKey}
          handleSettingsClose={settingsHandlers.handleSettingsClose}
          MODEL_PROVIDERS={MODEL_PROVIDERS}
        />
      )}
    </div>
  );
}; 