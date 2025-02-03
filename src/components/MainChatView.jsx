import React from 'react'
import { ChatView } from './ChatView'
import { Settings } from './Settings'

export default function MainChatView({
  messages,
  currentConversation,
  editingMessage,
  setEditingMessage,
  messageInput,
  setMessageInput,
  selectedFiles,
  setSelectedFiles,
  sendMessage,
  confirmDeleteMessage,
  updateMessage,
  moveMessage,
  enterEditMode,
  exitEditMode,
  collapsedMessages,
  setCollapsedMessages,
  handleImageClick,
  fileInputRef,
  showSettings,
  setShowSettings,
  storagePath,
  setStoragePath,
  currentTheme,
  conversations,
  setConversations,
  handleSelectFolder,
  handleUpdateFolders,
  toggleTheme,
  themes
}) {
  return (
    <div className="flex-1 flex flex-col relative">
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
        updateMessage={updateMessage}
        moveMessage={moveMessage}
        enterEditMode={enterEditMode}
        exitEditMode={exitEditMode}
        collapsedMessages={collapsedMessages}
        setCollapsedMessages={setCollapsedMessages}
        isCompact={false}
        handleImageClick={handleImageClick}
        fileInputRef={fileInputRef}
      />

      <Settings 
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        storagePath={storagePath}
        setStoragePath={setStoragePath}
        currentTheme={currentTheme}
        currentConversation={currentConversation}
        messages={messages}
        conversations={conversations}
        setConversations={setConversations}
        handleSelectFolder={handleSelectFolder}
        handleUpdateFolders={handleUpdateFolders}
        toggleTheme={toggleTheme}
        themes={themes}
      />
    </div>
  )
} 