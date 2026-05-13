import React from 'react'
import useToolStore from '../stores/useToolStore'
import { ChatView } from './ChatView'
import { AIChat } from './AIChat'
import { MonacoEditor } from './MonacoEditor'

import ThreeJSShaders from './ThreeJSShaders'
import GoldieTalk from './GoldieTalk'
import LivePortrait from './LivePortrait'

export default function ToolRouter({
  // Chat props
  messages,
  setMessages,
  currentConversation,
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
  // AIChat props
  handleSendToSidebar,
  createNewConversation,
  storagePath,
  conversations,
  handleConversationSelect,
  handleConversationDelete,
  handleConversationRename,
  openInBrowserTab,
  selectedModel,
  setSelectedModel,
  availableModels,
  setAvailableModels,
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature,
  selectedProvider,
  setSelectedProvider,
  isCompact,
  // Monaco props
  currentNote,
  saveNote,
}) {
  const { activeTool } = useToolStore()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat */}
      <div
        style={{ display: activeTool === 'chat' ? 'flex' : 'none', height: 'calc(100vh - 74px)' }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <ChatView
          messages={messages}
          setMessages={setMessages}
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
          shouldScrollToBottom={shouldScrollToBottom}
          setShouldScrollToBottom={setShouldScrollToBottom}
        />
      </div>

      {/* Browser (view managed by main process) */}
      <div
        style={{ display: activeTool === 'browser' ? 'flex' : 'none' }}
        className="flex-1 flex flex-col relative"
      >
        <div className="flex-1 bg-base-100 overflow-auto" style={{ height: 'calc(100vh - 62px)' }} />
      </div>

      {/* Monaco Editor */}
      <div
        style={{ display: activeTool === 'monaco' ? 'flex' : 'none' }}
        className="flex-1 overflow-hidden"
      >
        <MonacoEditor currentNote={currentNote} saveNote={saveNote} />
      </div>

      {/* ThreeJS Shaders */}
      <div
        style={{ display: activeTool === 'threejs-shaders' ? 'flex' : 'none' }}
        className="flex-1 overflow-hidden"
      >
        <ThreeJSShaders />
      </div>

      {/* Goldie Talk — disabled (webrtc server not running)
      <div
        style={{ display: activeTool === 'goldie-talk' ? 'flex' : 'none' }}
        className="flex-1 overflow-hidden"
      >
        <GoldieTalk />
      </div>
      */}

      {/* AI Chat */}
      <div
        style={{ display: activeTool === 'aichat' ? 'flex' : 'none' }}
        className="flex-1 overflow-hidden"
      >
        <AIChat
          sendToSidebar={handleSendToSidebar}
          createNewConversation={createNewConversation}
          storagePath={storagePath}
          currentConversation={currentConversation}
          conversations={conversations}
          onConversationSelect={handleConversationSelect}
          onConversationDelete={handleConversationDelete}
          onConversationRename={handleConversationRename}
          window={window}
          electron={window.electron}
          openInBrowserTab={openInBrowserTab}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          availableModels={availableModels}
          setAvailableModels={setAvailableModels}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
          temperature={temperature}
          setTemperature={setTemperature}
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          isCompact={isCompact}
        />
      </div>

      {/* LivePortrait */}
      <div
        style={{ display: activeTool === 'liveportrait' ? 'flex' : 'none' }}
        className="flex-1 overflow-hidden"
      >
        <LivePortrait storagePath={storagePath} />
      </div>
    </div>
  )
}
