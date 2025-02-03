import React from 'react'
import { tools, getToolDisplayName } from '../config/toolsConfig'
import { CompactChatView } from './CompactChatView'
import { BrowserTabs } from './BrowserTabs'

export default function Sidebar({
  activeTool,
  sidebarOpen,
  setSidebarOpen,
  sidebarMode,
  conversations,
  currentConversation,
  editingFolderName,
  folderNameInput,
  setFolderNameInput,
  loadConversation,
  switchTool,
  handleSidebarModeToggle,
  createNewConversation,
  setEditingFolderName,
  renameChatFolder,
  // Chat相关props
  messages,
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
  // Browser相关props
  browserTabs,
  activeTabId
}) {
  return (
    <>
      {/* Sidebar toggle bar */}
      <div
        className="h-full w-[10px] cursor-pointer hover:bg-base-300 flex items-center justify-center no-drag"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <div className="text-base-content">
          {sidebarOpen ? '◂' : '▸'}
        </div>
      </div>

      {/* Sidebar content */}
      <div className={`${sidebarOpen ? (sidebarMode === 'chat' ? 'w-[400px]' : 'w-[200px]') : 'w-0'} bg-base-300 text-base-content overflow-hidden transition-all duration-300 flex flex-col`}>
        <div className={`${sidebarMode === 'chat' ? 'w-[400px]' : 'w-[200px]'} flex flex-col h-full`}>
          <div className="p-2 flex-1 flex flex-col overflow-hidden">
            {/* Tool switcher */}
            <div className="join grid grid-cols-2 mb-2">
              <button className="join-item btn btn-outline btn-sm" onClick={() => switchTool('prev')}>
                Previous
              </button>
              <button className="join-item btn btn-outline btn-sm" onClick={() => switchTool('next')}>
                Next
              </button>
            </div>

            {/* Tool indicators */}
            <div className="flex justify-center gap-2 mb-2">
              {tools.map(tool => (
                <div
                  key={tool}
                  className={`w-2 h-2 rounded-full ${activeTool === tool ? 'bg-primary' : 'bg-base-content opacity-20'}`}
                />
              ))}
            </div>

            {/* Tool header */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <span className="font-semibold">
                  {getToolDisplayName(activeTool)}
                </span>
              </div>
              {activeTool === 'chat' && (
                <button
                  className="btn btn-circle btn-ghost btn-sm"
                  onClick={createNewConversation}
                >
                  <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              )}
              {activeTool === 'browser' && (
                <button
                  className="btn btn-circle btn-ghost btn-sm"
                  onClick={() => window.electron.browser.newTab()}
                >
                  <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              )}
            </div>

            {/* Tool specific content */}
            {activeTool === 'chat' && (
              <div className="flex-1 mt-2 overflow-y-auto">
                <div className="flex flex-col gap-2">
                  {conversations.map(conversation => (
                    <div
                      key={conversation.id}
                      className={`btn btn-ghost justify-between ${
                        currentConversation?.id === conversation.id ? 'btn-active' : ''
                      }`}
                      onClick={() => {
                        if (editingFolderName === conversation.id) return
                        loadConversation(conversation.id)
                      }}
                    >
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
                                renameChatFolder(conversation)
                              }
                            }}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => renameChatFolder(conversation)}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-xs"
                              onClick={() => {
                                setEditingFolderName(null)
                                setFolderNameInput('')
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
                    <CompactChatView
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
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar mode toggle */}
          <button
            className="btn btn-ghost btn-sm w-full flex justify-start gap-2 p-2 border-t border-base-content/10"
            onClick={handleSidebarModeToggle}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{sidebarMode === 'default' ? 'Open Chat' : 'Back'}</span>
          </button>
        </div>
      </div>
    </>
  )
} 