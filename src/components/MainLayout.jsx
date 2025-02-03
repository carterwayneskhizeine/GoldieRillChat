import React from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import MainChatView from './MainChatView'
import Editor from './Editor'
import BrowserView from './BrowserView'
import MarkdownEditor from './MarkdownEditor'
import { globalStyles } from '../styles/globalStyles'
import { createToolSwitcher } from '../config/toolsConfig'

export default function MainLayout({
  // 全局状态
  activeTool,
  sidebarOpen,
  sidebarMode,
  showSettings,
  isCtrlPressed,
  // 组件状态
  conversations,
  currentConversation,
  messages,
  editingMessage,
  messageInput,
  selectedFiles,
  editingFileName,
  fileNameInput,
  editingFolderName,
  folderNameInput,
  deletingConversation,
  deletingMessageId,
  shouldScrollToBottom,
  browserTabs,
  activeTabId,
  currentUrl,
  isLoading,
  pageTitle,
  editorState,
  canvasSize,
  tempCanvasSize,
  imageSize,
  lightboxOpen,
  lightboxImages,
  lightboxIndex,
  collapsedMessages,
  currentTheme,
  // Refs
  messagesEndRef,
  fileInputRef,
  canvasRef,
  canvasSizeTimeoutRef,
  // 状态更新函数
  setActiveTool,
  setSidebarOpen,
  setSidebarMode,
  setShowSettings,
  setIsCtrlPressed,
  setConversations,
  setCurrentConversation,
  setMessages,
  setMessageInput,
  setSelectedFiles,
  setEditingMessage,
  setEditingFileName,
  setFileNameInput,
  setEditingFolderName,
  setFolderNameInput,
  setDeletingConversation,
  setDeletingMessageId,
  setShouldScrollToBottom,
  setBrowserTabs,
  setActiveTabId,
  setCurrentUrl,
  setIsLoading,
  setPageTitle,
  setEditorState,
  setCanvasSize,
  setTempCanvasSize,
  setImageSize,
  setLightboxOpen,
  setLightboxImages,
  setLightboxIndex,
  setCollapsedMessages,
  setCurrentTheme,
  // 事件处理函数
  handleSidebarModeToggle,
  createNewConversation,
  loadConversation,
  sendMessage,
  confirmDeleteMessage,
  updateMessage,
  moveMessage,
  enterEditMode,
  exitEditMode,
  handleImageClick,
  handleSelectFolder,
  handleUpdateFolders,
  toggleTheme,
  themes,
  storagePath,
  setStoragePath,
  renameChatFolder,
  handleResolutionChange,
  sendCanvasToChat
}) {
  // 创建工具切换函数
  const switchTool = createToolSwitcher(setActiveTool)

  return (
    <div className="h-screen flex flex-col">
      <style>{globalStyles}</style>
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTool={activeTool}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarMode={sidebarMode}
          conversations={conversations}
          currentConversation={currentConversation}
          editingFolderName={editingFolderName}
          folderNameInput={folderNameInput}
          setFolderNameInput={setFolderNameInput}
          loadConversation={loadConversation}
          switchTool={switchTool}
          handleSidebarModeToggle={handleSidebarModeToggle}
          createNewConversation={createNewConversation}
          setEditingFolderName={setEditingFolderName}
          renameChatFolder={renameChatFolder}
          messages={messages}
          editingMessage={editingMessage}
          setEditingMessage={setEditingMessage}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          sendMessage={sendMessage}
          confirmDeleteMessage={confirmDeleteMessage}
          updateMessage={updateMessage}
          moveMessage={moveMessage}
          enterEditMode={enterEditMode}
          exitEditMode={exitEditMode}
          collapsedMessages={collapsedMessages}
          setCollapsedMessages={setCollapsedMessages}
          handleImageClick={handleImageClick}
          fileInputRef={fileInputRef}
          browserTabs={browserTabs}
          activeTabId={activeTabId}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTool === 'chat' && (
            <MainChatView
              messages={messages}
              currentConversation={currentConversation}
              editingMessage={editingMessage}
              setEditingMessage={setEditingMessage}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              sendMessage={sendMessage}
              confirmDeleteMessage={confirmDeleteMessage}
              updateMessage={updateMessage}
              moveMessage={moveMessage}
              enterEditMode={enterEditMode}
              exitEditMode={exitEditMode}
              collapsedMessages={collapsedMessages}
              setCollapsedMessages={setCollapsedMessages}
              handleImageClick={handleImageClick}
              fileInputRef={fileInputRef}
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              storagePath={storagePath}
              setStoragePath={setStoragePath}
              currentTheme={currentTheme}
              conversations={conversations}
              setConversations={setConversations}
              handleSelectFolder={handleSelectFolder}
              handleUpdateFolders={handleUpdateFolders}
              toggleTheme={toggleTheme}
              themes={themes}
            />
          )}

          {activeTool === 'editor' && (
            <Editor
              editorState={editorState}
              setEditorState={setEditorState}
              canvasRef={canvasRef}
              canvasSize={canvasSize}
              setCanvasSize={setCanvasSize}
              tempCanvasSize={tempCanvasSize}
              setTempCanvasSize={setTempCanvasSize}
              imageSize={imageSize}
              setImageSize={setImageSize}
              isCtrlPressed={isCtrlPressed}
              setIsCtrlPressed={setIsCtrlPressed}
              sendCanvasToChat={sendCanvasToChat}
              handleResolutionChange={handleResolutionChange}
              canvasSizeTimeoutRef={canvasSizeTimeoutRef}
            />
          )}

          {activeTool === 'browser' && (
            <BrowserView
              sidebarMode={sidebarMode}
              browserTabs={browserTabs}
              activeTabId={activeTabId}
              onTabClick={(tabId) => window.electron.browser.switchTab(tabId)}
              onTabClose={(tabId) => window.electron.browser.closeTab(tabId)}
              onNewTab={() => window.electron.browser.newTab()}
              messages={messages}
              currentConversation={currentConversation}
              editingMessage={editingMessage}
              setEditingMessage={setEditingMessage}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              sendMessage={sendMessage}
              confirmDeleteMessage={confirmDeleteMessage}
              updateMessage={updateMessage}
              moveMessage={moveMessage}
              enterEditMode={enterEditMode}
              exitEditMode={exitEditMode}
              collapsedMessages={collapsedMessages}
              setCollapsedMessages={setCollapsedMessages}
              fileInputRef={fileInputRef}
            />
          )}

          {activeTool === 'markdown' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <MarkdownEditor />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 