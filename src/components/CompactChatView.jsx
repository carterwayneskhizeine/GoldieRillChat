import React from 'react'
import { ChatView } from './ChatView'

export default function CompactChatView({
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
  fileInputRef
}) {
  return (
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
      isCompact={true}
      handleImageClick={handleImageClick}
      fileInputRef={fileInputRef}
    />
  )
} 