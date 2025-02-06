import React, { useEffect } from 'react';
import { getToolDisplayName, tools } from '../config/toolsConfig';
import { BrowserTabs } from './BrowserTabs';
import { ChatView } from './ChatView';

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
  sendToEditor
}) {
  useEffect(() => {
    if (activeTool === 'chat') {
      setSidebarMode('default');
    } else if (previousMode) {
      setSidebarMode('chat');
    }
  }, [activeTool, previousMode]);

  const handleSidebarModeToggleLocal = () => {
    if (sidebarMode === 'default') {
      setPreviousMode('default');
      setSidebarMode('chat');
      
      if (!currentConversation && conversations.length > 0) {
        loadConversation(conversations[0].id);
      }
    } else {
      setSidebarMode('default');
      setPreviousMode(null);
    }
  };

  return (
    <div className={`${sidebarOpen ? (sidebarMode === 'chat' ? 'w-[400px]' : 'w-[200px]') : 'w-0'} bg-base-300 text-base-content overflow-y-auto overflow-x-hidden transition-all duration-300 flex flex-col`}>
      <div className={`${sidebarMode === 'chat' ? 'w-[400px]' : 'w-[200px]'} flex flex-col h-full overflow-x-hidden`}>
        <div className="p-2 flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          {/* 顶部按钮行：前后工具切换 */}
          <div className="join grid grid-cols-2 mb-2">
            <button className="join-item btn btn-outline btn-sm" onClick={() => switchTool('prev')}>
              Previous
            </button>
            <button className="join-item btn btn-outline btn-sm" onClick={() => switchTool('next')}>
              Next
            </button>
          </div>

          {/* 工具页面指示器 */}
          <div className="flex justify-center gap-2 mb-2">
            {tools.map(tool => (
              <div key={tool} className={`w-2 h-2 rounded-full ${activeTool === tool ? 'bg-primary' : 'bg-base-content opacity-20'}`} />
            ))}
          </div>

          {/* 当前工具显示及新对话/标签页创建按钮 */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <span className="font-semibold">{getToolDisplayName(activeTool)}</span>
            </div>
            {activeTool === 'chat' && (
              <button className="btn btn-circle btn-ghost btn-sm" onClick={createNewConversation}>
                <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
            {activeTool === 'browser' && (
              <button className="btn btn-circle btn-ghost btn-sm" onClick={() => window.electron.browser.newTab()}>
                <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
            {activeTool === 'chatbox' && (
              <button className="btn btn-circle btn-ghost btn-sm" onClick={createNewConversation}>
                <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>

          {/* 工具特定内容：例如聊天室展示对话列表 */}
          {activeTool === 'chat' && (
            <div className="flex-1 mt-2 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {conversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`btn btn-ghost justify-between ${currentConversation?.id === conversation.id ? 'btn-active' : ''} ${draggedConversation?.id === conversation.id ? 'opacity-50' : ''}`}
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
                      setContextMenu({ visible: true, x: rect.right, y: rect.top, type: 'chat', data: conversation });
                    }}
                    onClick={() => {
                      if (editingFolderName === conversation.id) return;
                      loadConversation(conversation.id);
                    }}
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
                                renameChatFolder(
                                  conversation,
                                  folderNameInput,
                                  conversations,
                                  currentConversation,
                                  setConversations,
                                  setCurrentConversation,
                                  setEditingFolderName,
                                  setFolderNameInput,
                                  window
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
                                renameChatFolder(
                                  conversation,
                                  folderNameInput,
                                  conversations,
                                  currentConversation,
                                  setConversations,
                                  setCurrentConversation,
                                  setEditingFolderName,
                                  setFolderNameInput,
                                  window
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
                        <span className="truncate">{conversation.name}</span>
                      )}
                    </div>
                  </div>
                ))}
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
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'markdown' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar">
                    {/* Markdown侧边栏的内容可以在这里添加 */}
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
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'editor' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar">
                    {/* Editor 侧边栏的内容可以在这里添加 */}
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
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'webmarkdown' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar">
                    {/* WebMarkdown侧边栏的内容可以在这里添加 */}
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
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'monaco' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar">
                    {/* Monaco Editor 侧边栏的内容可以在这里添加 */}
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
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'screen' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar">
                    {/* Screen侧边栏的内容可以在这里添加 */}
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
                  />
                )}
              </div>
            </div>
          )}

          {activeTool === 'chatbox' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar">
                    {/* ChatBox侧边栏的内容可以在这里添加 */}
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
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部固定区域 - 统一处理按钮 */}
        <div className="p-2 border-t border-base-content/10">
          {activeTool === 'chat' ? (
            // Chat工具显示Settings按钮
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
          ) : (
            // 其他工具显示Open Chat按钮
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