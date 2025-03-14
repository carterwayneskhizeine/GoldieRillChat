import React, { useEffect, useState } from 'react';
import { getToolDisplayName, tools } from '../config/toolsConfig';
import { BrowserTabs } from './BrowserTabs';
import { ChatView } from './ChatView';
import '../styles/sidebar-buttons.css';

export default function Sidebar({
  sidebarOpen,
  sidebarMode,
  activeTool,
  conversations,
  currentConversation,
  draggedConversation,
  setDraggedConversation,
  editingFolderName,
  folderNameInput,
  setEditingFolderName,
  setFolderNameInput,
  setContextMenu,
  loadConversation,
  createNewConversation,
  switchTool,
  handleSidebarModeToggle,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleConversationDelete,
  handleConversationRename,
  renameChatFolder,
  setConversations,
  setCurrentConversation,
  messages,
  editingMessage,
  setEditingMessage,
  messageInput,
  setMessageInput,
  selectedFiles,
  setSelectedFiles,
  sendMessage,
  confirmDeleteMessage,
  updateMessageInApp,
  moveMessageInApp,
  enterEditMode,
  exitEditMode,
  collapsedMessages,
  setCollapsedMessages,
  handleImageClick,
  fileInputRef,
  browserTabs,
  activeTabId,
  previousMode,
  window,
  setShowSettings,
  setSidebarMode,
  setPreviousMode,
  editingFileName,
  setEditingFileName,
  fileNameInput,
  setFileNameInput,
  renameMessageFile,
  openFileLocation,
  copyMessageContent,
  deletingMessageId,
  setDeletingMessageId,
  cancelDeleteMessage,
  scrollToMessage,
  sendToMonaco,
  sendToEditor,
  shouldScrollToBottom,
  setShouldScrollToBottom,
  notes,
  currentNote,
  loadNote,
  handleRenameConfirm,
  shaderPresets,
  setShaderPresets,
  currentShaderPreset,
  setCurrentShaderPreset,
  keyboardSelectedConversationId,
  isKeyboardNavigating
}) {
  const [openChatFolder, setOpenChatFolder] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isImageBackground, setIsImageBackground] = useState(false);

  // 检测图片背景模式
  useEffect(() => {
    // 检查是否有图片背景标志
    const checkImageBackgroundMode = () => {
      // 从 window 对象检查
      if (window.isImageBackgroundMode !== undefined) {
        setIsImageBackground(window.isImageBackgroundMode);
      }
    };
    
    // 立即检查一次
    checkImageBackgroundMode();
    
    // 监听背景模式变化的事件
    const handleBackgroundModeChange = (event) => {
      if (event.detail && event.detail.isImageBackground !== undefined) {
        setIsImageBackground(event.detail.isImageBackground);
      }
    };
    
    window.addEventListener('backgroundModeChange', handleBackgroundModeChange);
    
    return () => {
      window.removeEventListener('backgroundModeChange', handleBackgroundModeChange);
    };
  }, []);

  useEffect(() => {
    if (activeTool === 'chat' || activeTool === 'aichat') {
      setSidebarMode('default');
    } else if (previousMode) {
      setSidebarMode('chat');
    }
  }, [activeTool, previousMode]);

  // 监听着色器预设加载事件
  useEffect(() => {
    // 处理预设列表加载
    const handlePresetsLoaded = (event) => {
      if (event.detail && event.detail.presets) {
        setShaderPresets(event.detail.presets);
      }
    };
    
    // 处理单个预设加载
    const handlePresetLoaded = (event) => {
      if (event.detail && event.detail.presetId) {
        setCurrentShaderPreset(event.detail.presetId);
      }
    };
    
    // 添加事件监听
    window.addEventListener('shaderPresetsLoaded', handlePresetsLoaded);
    window.addEventListener('shaderPresetLoaded', handlePresetLoaded);
    
    // 清理函数
    return () => {
      window.removeEventListener('shaderPresetsLoaded', handlePresetsLoaded);
      window.removeEventListener('shaderPresetLoaded', handlePresetLoaded);
    };
  }, []);

  const handleSidebarModeToggleLocal = () => {
    if (sidebarMode === 'default') {
      if (activeTool === 'chat' || activeTool === 'aichat') {
        return;
      }
      setPreviousMode('default');
      setSidebarMode('chat');
      
      if (activeTool !== 'chat' && !openChatFolder && conversations.length > 0) {
        setOpenChatFolder(conversations[0]);
        loadConversation(conversations[0].id);
      } else if (activeTool === 'chat' && !currentConversation && conversations.length > 0) {
        loadConversation(conversations[0].id);
      }
    } else {
      setSidebarMode('default');
      setPreviousMode(null);
    }
  };

  const handleOpenChatFolderChange = (conversationId) => {
    const selectedConversation = conversations.find(c => c.id === conversationId);
    if (selectedConversation) {
      setOpenChatFolder(selectedConversation);
      loadConversation(conversationId);
      setTimeout(() => {
        const messagesContainer = document.querySelector('.chat-view-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    }
  };

  const handleConversationClick = (conversation) => {
    if (editingFolderName === conversation.id) return;
    
    // 点击时退出键盘导航模式
    if (isKeyboardNavigating) {
      // 这里只通过事件触发，使App.jsx中的状态更新
      window.dispatchEvent(new CustomEvent('exit-keyboard-nav', {
        detail: { conversationId: conversation.id }
      }));
    }
    
    loadConversation(conversation.id);
    setTimeout(() => {
      const messagesContainer = document.querySelector('.chat-view-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  };

  const handleNoteClick = async (noteId) => {
    try {
      await loadNote(noteId);
      
      if (activeTool !== 'monaco') {
        switchTool('monaco');
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      window.toastManager?.error('加载笔记失败: ' + error.message);
    }
  };

  // 处理着色器预设点击
  const handleShaderPresetClick = (presetId) => {
    if (presetId === currentShaderPreset) return;
    
    // 触发预设选择事件
    window.dispatchEvent(new CustomEvent('selectShaderPreset', {
      detail: { presetId }
    }));
    
    // 更新当前选中的预设
    setCurrentShaderPreset(presetId);
    
    // 如果当前不是着色器工具，切换到着色器工具
    if (activeTool !== 'threejs-shaders') {
      switchTool('threejs-shaders');
    }
  };

  return (
    <div className={`${sidebarOpen ? (sidebarMode === 'chat' ? 'w-[400px]' : 'w-[200px]') : 'w-0'} bg-base-300 text-base-content overflow-y-auto overflow-x-hidden transition-all duration-300 flex flex-col`}>
      <div className={`${sidebarMode === 'chat' ? 'w-[400px]' : 'w-[200px]'} flex flex-col h-full overflow-x-hidden`}>
        <div className="p-2 flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          <div className="join grid grid-cols-2 mb-2">
            <button 
              className="join-item btn btn-outline btn-sm prev-next-btn" 
              onClick={() => switchTool('prev')}
              style={{
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = 'rgb(255, 215, 0)';
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
                e.currentTarget.style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '';
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.textShadow = '';
              }}
            >
              Previous
            </button>
            <button 
              className="join-item btn btn-outline btn-sm prev-next-btn" 
              onClick={() => switchTool('next')}
              style={{
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = 'rgb(255, 215, 0)';
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
                e.currentTarget.style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '';
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.textShadow = '';
              }}
            >
              Next
            </button>
          </div>

          <div className="flex justify-center gap-2 mb-2">
            {tools.map(tool => (
              <div key={tool} className={`w-2 h-2 rounded-full ${activeTool === tool ? 'bg-primary' : 'bg-base-content opacity-20'}`} />
            ))}
          </div>

          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <span className="font-semibold">{getToolDisplayName(activeTool)}</span>
            </div>
            {activeTool === 'chat' && (
              <button 
                className="btn btn-circle btn-ghost btn-sm" 
                onClick={() => {
                  if (typeof createNewConversation === 'function') {
                    createNewConversation();
                  }
                }}
              >
                <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
            {activeTool === 'browser' && sidebarMode === 'default' && (
              <button className="btn btn-circle btn-ghost btn-sm" onClick={() => window.electron.browser.newTab()}>
                <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
            {activeTool === 'aichat' && sidebarMode === 'default' && (
              <button 
                className="btn btn-circle btn-ghost btn-sm" 
                onClick={() => {
                  if (window.aichat && window.aichat.createNewConversation) {
                    window.aichat.createNewConversation();
                  }
                }}
              >
                <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>

          {sidebarMode === 'chat' && activeTool !== 'chat' && (
            <div className="dropdown dropdown-bottom w-full mb-4">
              <label 
                tabIndex={0} 
                className="btn btn-outline btn-sm w-full flex justify-between items-center"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="truncate">{openChatFolder?.name || '选择对话文件夹'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </label>
              <ul 
                tabIndex={0} 
                className={`dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50 ${dropdownOpen ? '' : 'hidden'}`}
                onBlur={() => setDropdownOpen(false)}
              >
                {conversations.map(conversation => (
                  <li key={conversation.id}>
                    <a 
                      className={openChatFolder?.id === conversation.id ? 'active' : ''}
                      onClick={() => {
                        handleOpenChatFolderChange(conversation.id);
                        setDropdownOpen(false);
                      }}
                    >
                      {conversation.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTool === 'chat' && (
            <div className="flex-1 mt-2 overflow-hidden h-full flex flex-col">
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50">
                <div className="flex flex-col gap-2 p-2">
                  {conversations.map(conversation => (
                    <div
                      key={conversation.id}
                      className={`btn btn-ghost justify-between mb-4
                        ${currentConversation?.id === conversation.id ? 'btn-active' : ''} 
                        ${draggedConversation?.id === conversation.id ? 'opacity-50' : ''}
                        ${isKeyboardNavigating && keyboardSelectedConversationId === conversation.id ? 'keyboard-selected-conversation' : ''}
                        conversation-item conversation-item-${conversation.id}`}
                      draggable={editingFolderName === null}
                      onDragStart={() => {
                        if (editingFolderName !== null) return;
                        handleDragStart(conversation, setDraggedConversation);
                      }}
                      onDragOver={(e) => {
                        if (editingFolderName !== null) return;
                        handleDragOver(e);
                      }}
                      onDrop={(e) => {
                        if (editingFolderName !== null) return;
                        handleDrop(conversation, draggedConversation, conversations, setConversations, setDraggedConversation);
                      }}
                      onContextMenu={(e) => {
                        if (editingFolderName !== null) return;
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setContextMenu({
                          visible: true,
                          x: rect.right,
                          y: rect.top,
                          type: 'chat',
                          data: conversation,
                          options: [
                            {
                              label: 'Delete',
                              onClick: () => handleConversationDelete(conversation)
                            },
                            {
                              label: 'Rename',
                              onClick: () => handleConversationRename(conversation)
                            }
                          ]
                        });
                      }}
                      onClick={() => handleConversationClick(conversation)}
                      style={isKeyboardNavigating && keyboardSelectedConversationId === conversation.id ? {
                        borderColor: 'gold',
                        borderWidth: '2px',
                        boxShadow: '0 0 4px gold'
                      } : {}}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {editingFolderName === conversation.id ? (
                          <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={folderNameInput}
                              onChange={(e) => setFolderNameInput(e.target.value)}
                              className="input input-xs input-bordered w-full"
                              placeholder="输入新的文件夹名称"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameConfirm(
                                    conversation,
                                    folderNameInput
                                  );
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                className="btn btn-xs btn-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameConfirm(
                                    conversation,
                                    folderNameInput
                                  );
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                className="btn btn-xs"
                                onClick={() => {
                                  setEditingFolderName(null);
                                  setFolderNameInput('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="truncate">{conversation.name}</span>
                          </>
                        )}
                      </div>
                      {!editingFolderName && (
                        <div className="folder-actions absolute left-0 right-0 p-1 flex justify-center gap-2" style={{zIndex: 100, borderTop: '1px solid rgba(255, 215, 0, 0.1)'}}>
                          <button 
                            className="btn btn-xs flex items-center gap-1 hover:bg-gold hover:bg-opacity-30 hover:text-white hover:border-gold hover:border-opacity-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConversationRename(conversation);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Rename
                          </button>
                          <button 
                            className="btn btn-xs btn-ghost flex items-center gap-1 hover:bg-gold hover:bg-opacity-30 hover:text-white hover:border-gold hover:border-opacity-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConversationDelete(conversation);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m5-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTool === 'browser' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <BrowserTabs
                    tabs={browserTabs}
                    activeTabId={activeTabId}
                    onTabClick={(tabId) => window.electron.browser.switchTab(tabId)}
                    onTabClose={(tabId) => window.electron.browser.closeTab(tabId)}
                    onNewTab={() => window.electron.browser.newTab()}
                  />
                ) : (
                  <ChatView
                    messages={messages}
                    currentConversation={currentConversation}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    sendMessage={sendMessage}
                    deleteMessage={confirmDeleteMessage}
                    updateMessage={updateMessageInApp}
                    moveMessage={moveMessageInApp}
                    enterEditMode={enterEditMode}
                    exitEditMode={exitEditMode}
                    collapsedMessages={collapsedMessages}
                    setCollapsedMessages={setCollapsedMessages}
                    isCompact={true}
                    handleImageClick={handleImageClick}
                    fileInputRef={fileInputRef}
                    editingFileName={editingFileName}
                    setEditingFileName={setEditingFileName}
                    fileNameInput={fileNameInput}
                    setFileNameInput={setFileNameInput}
                    renameMessageFile={renameMessageFile}
                    openFileLocation={openFileLocation}
                    copyMessageContent={copyMessageContent}
                    deletingMessageId={deletingMessageId}
                    setDeletingMessageId={setDeletingMessageId}
                    cancelDeleteMessage={cancelDeleteMessage}
                    confirmDeleteMessage={confirmDeleteMessage}
                    scrollToMessage={scrollToMessage}
                    window={window}
                    sendToMonaco={sendToMonaco}
                    sendToEditor={sendToEditor}
                    sidebarMode={sidebarMode}
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'aichat' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50">
                      <div className="flex flex-col gap-2 p-2">
                        {conversations.map(conversation => (
                          <div
                            key={conversation.id}
                            className={`btn btn-ghost justify-between mb-4
                              ${currentConversation?.id === conversation.id ? 'btn-active' : ''} 
                              ${draggedConversation?.id === conversation.id ? 'opacity-50' : ''}
                              ${isKeyboardNavigating && keyboardSelectedConversationId === conversation.id ? 'keyboard-selected-conversation' : ''}
                              conversation-item conversation-item-${conversation.id}`}
                            draggable={editingFolderName === null}
                            onDragStart={() => {
                              if (editingFolderName !== null) return;
                              handleDragStart(conversation, setDraggedConversation);
                            }}
                            onDragOver={(e) => {
                              if (editingFolderName !== null) return;
                              handleDragOver(e);
                            }}
                            onDrop={(e) => {
                              if (editingFolderName !== null) return;
                              handleDrop(conversation, draggedConversation, conversations, setConversations, setDraggedConversation);
                            }}
                            onContextMenu={(e) => {
                              if (editingFolderName !== null) return;
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setContextMenu({
                                visible: true,
                                x: rect.right,
                                y: rect.top,
                                type: 'chat',
                                data: conversation,
                                options: [
                                  {
                                    label: 'Delete',
                                    onClick: () => handleConversationDelete(conversation)
                                  },
                                  {
                                    label: 'Rename',
                                    onClick: () => handleConversationRename(conversation)
                                  }
                                ]
                              });
                            }}
                            onClick={() => handleConversationClick(conversation)}
                            style={isKeyboardNavigating && keyboardSelectedConversationId === conversation.id ? {
                              borderColor: 'gold',
                              borderWidth: '2px',
                              boxShadow: '0 0 4px gold'
                            } : {}}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {editingFolderName === conversation.id ? (
                                <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={folderNameInput}
                                    onChange={(e) => setFolderNameInput(e.target.value)}
                                    className="input input-xs input-bordered w-full"
                                    placeholder="输入新的文件夹名称"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleRenameConfirm(
                                          conversation,
                                          folderNameInput
                                        );
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      className="btn btn-xs btn-primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRenameConfirm(
                                          conversation,
                                          folderNameInput
                                        );
                                      }}
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      className="btn btn-xs"
                                      onClick={() => {
                                        setEditingFolderName(null);
                                        setFolderNameInput('');
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="truncate">{conversation.name}</span>
                                </>
                              )}
                            </div>
                            {!editingFolderName && (
                              <div className="folder-actions absolute left-0 right-0 p-1 flex justify-center gap-2" style={{zIndex: 100, borderTop: '1px solid rgba(255, 215, 0, 0.1)'}}>
                                <button 
                                  className="btn btn-xs flex items-center gap-1 hover:bg-gold hover:bg-opacity-30 hover:text-white hover:border-gold hover:border-opacity-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConversationRename(conversation);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Rename
                                </button>
                                <button 
                                  className="btn btn-xs btn-ghost flex items-center gap-1 hover:bg-gold hover:bg-opacity-30 hover:text-white hover:border-gold hover:border-opacity-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConversationDelete(conversation);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m5-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChatView
                    messages={messages}
                    currentConversation={currentConversation}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    sendMessage={sendMessage}
                    deleteMessage={confirmDeleteMessage}
                    updateMessage={updateMessageInApp}
                    moveMessage={moveMessageInApp}
                    enterEditMode={enterEditMode}
                    exitEditMode={exitEditMode}
                    collapsedMessages={collapsedMessages}
                    setCollapsedMessages={setCollapsedMessages}
                    isCompact={true}
                    handleImageClick={handleImageClick}
                    fileInputRef={fileInputRef}
                    editingFileName={editingFileName}
                    setEditingFileName={setEditingFileName}
                    fileNameInput={fileNameInput}
                    setFileNameInput={setFileNameInput}
                    renameMessageFile={renameMessageFile}
                    openFileLocation={openFileLocation}
                    copyMessageContent={copyMessageContent}
                    deletingMessageId={deletingMessageId}
                    setDeletingMessageId={setDeletingMessageId}
                    cancelDeleteMessage={cancelDeleteMessage}
                    confirmDeleteMessage={confirmDeleteMessage}
                    scrollToMessage={scrollToMessage}
                    window={window}
                    sendToMonaco={sendToMonaco}
                    sendToEditor={sendToEditor}
                    sidebarMode={sidebarMode}
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'monaco' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar h-full flex flex-col">
                    <div className="p-2 flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50">
                      <div className="flex flex-col gap-2">
                        {notes && notes.map(note => (
                          <div
                            key={note.id}
                            className={`btn btn-ghost justify-between ${currentNote?.id === note.id ? 'btn-active' : ''}`}
                            onClick={() => handleNoteClick(note.id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="truncate">{note.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChatView
                    messages={messages}
                    currentConversation={currentConversation}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    sendMessage={sendMessage}
                    deleteMessage={confirmDeleteMessage}
                    updateMessage={updateMessageInApp}
                    moveMessage={moveMessageInApp}
                    enterEditMode={enterEditMode}
                    exitEditMode={exitEditMode}
                    collapsedMessages={collapsedMessages}
                    setCollapsedMessages={setCollapsedMessages}
                    isCompact={true}
                    handleImageClick={handleImageClick}
                    fileInputRef={fileInputRef}
                    editingFileName={editingFileName}
                    setEditingFileName={setEditingFileName}
                    fileNameInput={fileNameInput}
                    setFileNameInput={setFileNameInput}
                    renameMessageFile={renameMessageFile}
                    openFileLocation={openFileLocation}
                    copyMessageContent={copyMessageContent}
                    deletingMessageId={deletingMessageId}
                    setDeletingMessageId={setDeletingMessageId}
                    cancelDeleteMessage={cancelDeleteMessage}
                    confirmDeleteMessage={confirmDeleteMessage}
                    scrollToMessage={scrollToMessage}
                    window={window}
                    sendToMonaco={sendToMonaco}
                    sendToEditor={sendToEditor}
                    sidebarMode={sidebarMode}
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'threejs-shaders' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar h-full flex flex-col">
                    <div className="p-2 flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50">
                      <div className="flex flex-col gap-2">
                        {shaderPresets.map((preset) => (
                          <div
                            key={preset.id}
                            className={`btn btn-ghost justify-between ${currentShaderPreset === preset.id ? 'btn-active' : ''}`}
                            onClick={() => handleShaderPresetClick(preset.id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="truncate">
                                {preset.id}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChatView
                    messages={messages}
                    currentConversation={currentConversation}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    sendMessage={sendMessage}
                    deleteMessage={confirmDeleteMessage}
                    updateMessage={updateMessageInApp}
                    moveMessage={moveMessageInApp}
                    enterEditMode={enterEditMode}
                    exitEditMode={exitEditMode}
                    collapsedMessages={collapsedMessages}
                    setCollapsedMessages={setCollapsedMessages}
                    isCompact={true}
                    handleImageClick={handleImageClick}
                    fileInputRef={fileInputRef}
                    editingFileName={editingFileName}
                    setEditingFileName={setEditingFileName}
                    fileNameInput={fileNameInput}
                    setFileNameInput={setFileNameInput}
                    renameMessageFile={renameMessageFile}
                    openFileLocation={openFileLocation}
                    copyMessageContent={copyMessageContent}
                    deletingMessageId={deletingMessageId}
                    setDeletingMessageId={setDeletingMessageId}
                    cancelDeleteMessage={cancelDeleteMessage}
                    confirmDeleteMessage={confirmDeleteMessage}
                    scrollToMessage={scrollToMessage}
                    window={window}
                    sendToMonaco={sendToMonaco}
                    sendToEditor={sendToEditor}
                    sidebarMode={sidebarMode}
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'embedding' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar">
                    {/* embedding侧边栏的内容可以在这里添加 */}
                  </div>
                ) : (
                  <ChatView
                    messages={messages}
                    currentConversation={currentConversation}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    sendMessage={sendMessage}
                    deleteMessage={confirmDeleteMessage}
                    updateMessage={updateMessageInApp}
                    moveMessage={moveMessageInApp}
                    enterEditMode={enterEditMode}
                    exitEditMode={exitEditMode}
                    collapsedMessages={collapsedMessages}
                    setCollapsedMessages={setCollapsedMessages}
                    isCompact={true}
                    handleImageClick={handleImageClick}
                    fileInputRef={fileInputRef}
                    editingFileName={editingFileName}
                    setEditingFileName={setEditingFileName}
                    fileNameInput={fileNameInput}
                    setFileNameInput={setFileNameInput}
                    renameMessageFile={renameMessageFile}
                    openFileLocation={openFileLocation}
                    copyMessageContent={copyMessageContent}
                    deletingMessageId={deletingMessageId}
                    setDeletingMessageId={setDeletingMessageId}
                    cancelDeleteMessage={cancelDeleteMessage}
                    confirmDeleteMessage={confirmDeleteMessage}
                    scrollToMessage={scrollToMessage}
                    window={window}
                    sendToMonaco={sendToMonaco}
                    sendToEditor={sendToEditor}
                    sidebarMode={sidebarMode}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`p-2 border-t border-base-content/10`}>
          {activeTool === 'chat' ? (
            <button
              className="btn btn-ghost btn-sm w-full flex justify-start gap-2"
              onClick={() => setShowSettings(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </button>
          ) : activeTool === 'aichat' ? (
            <button
              className="btn btn-ghost btn-sm w-full flex justify-start gap-2"
              onClick={() => {
                if (window.aichat && window.aichat.setShowSettings) {
                  window.aichat.setShowSettings(true);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </button>
          ) : (
            <button
              className="btn btn-ghost btn-sm w-full flex justify-start gap-2"
              onClick={handleSidebarModeToggleLocal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{sidebarMode === 'default' ? 'Open Chat' : 'Back'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 