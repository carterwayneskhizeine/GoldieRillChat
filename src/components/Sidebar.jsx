import React, { useEffect, useState, useMemo } from 'react';
import useToolStore from '../stores/useToolStore';
import useUIStore from '../stores/useUIStore';
import { getToolDisplayName } from '../config/toolsConfig';
import { BrowserTabs } from './BrowserTabs';
import ConversationTimeGrouping, { TruncatedName } from './ConversationTimeGrouping';
import { SettingsPanelContent } from './SettingsModal';
import '../styles/sidebar-buttons.css';

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function Sidebar({
  conversations, currentConversation, draggedConversation, setDraggedConversation,
  editingFolderName, folderNameInput, setEditingFolderName, setFolderNameInput,
  setContextMenu, loadConversation, createNewConversation,
  handleDragStart, handleDragOver, handleDrop,
  handleConversationDelete, handleConversationRename, renameChatFolder,
  setConversations, setCurrentConversation,
  messages, editingMessage, setEditingMessage, messageInput, setMessageInput,
  selectedFiles, setSelectedFiles, sendMessage, confirmDeleteMessage,
  updateMessageInApp, moveMessageInApp, enterEditMode, exitEditMode,
  collapsedMessages, setCollapsedMessages, handleImageClick, fileInputRef,
  browserTabs, activeTabId, window: win,
  editingFileName, setEditingFileName, fileNameInput, setFileNameInput,
  renameMessageFile, openFileLocation, copyMessageContent,
  deletingMessageId, setDeletingMessageId, cancelDeleteMessage, scrollToMessage,
  sendToMonaco, sendToEditor, shouldScrollToBottom, setShouldScrollToBottom,
  notes, currentNote, loadNote, handleRenameConfirm,
  shaderPresets, setShaderPresets, currentShaderPreset, setCurrentShaderPreset,
  keyboardSelectedConversationId, isKeyboardNavigating,
  storagePath, setStoragePath
}) {
  const { activeTool, switchTool } = useToolStore();
  const { sidebarOpen, sidebarMode, setSidebarMode, showSettings, setShowSettings } = useUIStore();

  const [isImageBackground, setIsImageBackground] = useState(false);
  const [expandedFolderId, setExpandedFolderId] = useState(null);
  const [autoHideTimer, setAutoHideTimer] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickId, setLastClickId] = useState(null);

  useEffect(() => {
    if (window.isImageBackgroundMode !== undefined) setIsImageBackground(window.isImageBackgroundMode);
    const handler = (e) => { if (e.detail?.isImageBackground !== undefined) setIsImageBackground(e.detail.isImageBackground) };
    window.addEventListener('backgroundModeChange', handler);
    return () => window.removeEventListener('backgroundModeChange', handler);
  }, []);

  useEffect(() => {
    if (showSettings) return;
    setSidebarMode('default');
  }, [activeTool, showSettings, setSidebarMode]);

  useEffect(() => {
    const handlePresetsLoaded = (e) => { if (e.detail?.presets) setShaderPresets(e.detail.presets) };
    const handlePresetLoaded = (e) => { if (e.detail?.presetId) setCurrentShaderPreset(e.detail.presetId) };
    window.addEventListener('shaderPresetsLoaded', handlePresetsLoaded);
    window.addEventListener('shaderPresetLoaded', handlePresetLoaded);
    return () => {
      window.removeEventListener('shaderPresetsLoaded', handlePresetsLoaded);
      window.removeEventListener('shaderPresetLoaded', handlePresetLoaded);
    };
  }, []);

  useEffect(() => {
    if (isKeyboardNavigating && keyboardSelectedConversationId) {
      setExpandedFolderId(keyboardSelectedConversationId);
      if (autoHideTimer) clearTimeout(autoHideTimer);
    }
  }, [isKeyboardNavigating, keyboardSelectedConversationId, autoHideTimer]);

  useEffect(() => {
    return () => { if (autoHideTimer) clearTimeout(autoHideTimer) };
  }, [autoHideTimer]);

  const handleSettingsClick = () => {
    if (showSettings && sidebarMode === 'settings') {
      setShowSettings(false);
      setSidebarMode('default');
      window.aichat?.setShowSettings?.(false);
      return;
    }

    setShowSettings(true);
    setSidebarMode('settings');
    if (activeTool === 'aichat') {
      window.aichat?.setShowSettings?.(true);
    }
  };

  const handleConversationClick = (conversation) => {
    if (editingFolderName === conversation.id) return;
    const now = new Date().getTime();
    const timeDiff = now - lastClickTime;

    if (timeDiff < 300 && lastClickId === conversation.id) {
      if (expandedFolderId === conversation.id) {
        setExpandedFolderId(null);
      } else {
        setExpandedFolderId(conversation.id);
        if (autoHideTimer) clearTimeout(autoHideTimer);
        setAutoHideTimer(setTimeout(() => setExpandedFolderId(null), 3000));
      }
      setLastClickTime(0);
      setLastClickId(null);
    } else {
      setLastClickTime(now);
      setLastClickId(conversation.id);
      if (isKeyboardNavigating) {
        window.dispatchEvent(new CustomEvent('exit-keyboard-nav', { detail: { conversationId: conversation.id } }));
      }
      loadConversation(conversation.id);
      setTimeout(() => {
        const el = document.querySelector('.chat-view-messages');
        if (el) el.scrollTop = el.scrollHeight;
      }, 100);
    }
  };

  // Shared ConversationTimeGrouping props (must be after handleConversationClick definition)
  const convGroupingProps = useMemo(() => ({
    conversations, currentConversation, draggedConversation,
    handleDragStart, handleDragOver, handleDrop,
    handleConversationClick, handleConversationRename, handleConversationDelete,
    setDraggedConversation, editingFolderName, setEditingFolderName,
    folderNameInput, setFolderNameInput, setContextMenu, expandedFolderId,
    setDeletingFolder, isKeyboardNavigating, keyboardSelectedConversationId,
    handleRenameConfirm,
  }), [conversations, currentConversation, draggedConversation, expandedFolderId,
    editingFolderName, folderNameInput, isKeyboardNavigating, keyboardSelectedConversationId]);

  const handleNoteClick = async (noteId) => {
    try {
      await loadNote(noteId);
      if (activeTool !== 'monaco') switchTool('monaco');
    } catch (error) {
      console.error('加载笔记失败:', error);
      window.toastManager?.error('加载笔记失败: ' + error.message);
    }
  };

  const handleShaderPresetClick = (presetId) => {
    if (presetId === currentShaderPreset) return;
    window.dispatchEvent(new CustomEvent('selectShaderPreset', { detail: { presetId } }));
    setCurrentShaderPreset(presetId);
    if (activeTool !== 'threejs-shaders') switchTool('threejs-shaders');
  };

  return (
    <div className={`${sidebarOpen ? (sidebarMode === 'settings' ? 'w-[460px]' : 'w-[200px]') : 'w-0'} bg-base-300 text-base-content overflow-y-auto overflow-x-hidden transition-all duration-300 flex flex-col`}>
      <div className={`${sidebarMode === 'settings' ? 'w-[460px]' : 'w-[200px]'} flex flex-col h-full overflow-x-hidden`}>
        <div className="p-2 flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          {/* New conversation buttons */}
          {activeTool === 'chat' && (
            <div className="flex justify-end mb-2">
              <button className="btn btn-circle btn-ghost btn-sm" onClick={() => createNewConversation?.()}>
                <PlusIcon />
              </button>
            </div>
          )}
          {activeTool === 'browser' && sidebarMode === 'default' && (
            <div className="flex justify-end mb-2">
              <button className="btn btn-circle btn-ghost btn-sm" onClick={() => window.electron.browser.newTab()}>
                <PlusIcon />
              </button>
            </div>
          )}
          {activeTool === 'aichat' && sidebarMode === 'default' && (
            <div className="flex justify-end mb-2">
              <button className="btn btn-circle btn-ghost btn-sm"
                onClick={() => window.aichat?.createNewConversation?.()}>
                <PlusIcon />
              </button>
            </div>
          )}

          {/* === Tool panels === */}

          {sidebarMode === 'settings' && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1">
              {activeTool === 'aichat' ? (
                <div id="aichat-settings-sidebar-root" />
              ) : (
                <SettingsPanelContent
                  storagePath={storagePath}
                  setStoragePath={setStoragePath}
                  currentConversation={currentConversation}
                  messages={messages}
                  setConversations={setConversations}
                  setCurrentConversation={setCurrentConversation}
                  onClose={handleSettingsClick}
                />
              )}
            </div>
          )}

          {/* Chat */}
          {activeTool === 'chat' && sidebarMode !== 'settings' && (
            <div className="flex-1 mt-2 overflow-hidden h-full flex flex-col">
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50">
                <ConversationTimeGrouping {...convGroupingProps} />
              </div>
            </div>
          )}

          {/* Browser */}
          {activeTool === 'browser' && sidebarMode !== 'settings' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <BrowserTabs tabs={browserTabs} activeTabId={activeTabId}
                    onTabClick={(tabId) => window.electron.browser.switchTab(tabId)}
                    onTabClose={(tabId) => window.electron.browser.closeTab(tabId)}
                    onNewTab={() => window.electron.browser.newTab()} />
                ) : null}
              </div>
            </div>
          )}

          {/* AI Chat */}
          {activeTool === 'aichat' && sidebarMode !== 'settings' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50">
                      <ConversationTimeGrouping {...convGroupingProps} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Monaco */}
          {activeTool === 'monaco' && sidebarMode !== 'settings' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar h-full flex flex-col">
                    <div className="p-2 flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50">
                      <div className="flex flex-col gap-2">
                        {notes && notes.map(note => (
                          <div key={note.id}
                            className={`btn btn-ghost justify-between ${currentNote?.id === note.id ? 'btn-active' : ''}`}
                            onClick={() => handleNoteClick(note.id)}>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="truncate">{note.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* ThreeJS Shaders */}
          {activeTool === 'threejs-shaders' && sidebarMode !== 'settings' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {sidebarMode === 'default' ? (
                  <div className="empty-sidebar h-full flex flex-col">
                    <div className="p-2 flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-base-content scrollbar-thumb-opacity-20 hover:scrollbar-thumb-opacity-50">
                      <div className="flex flex-col gap-2">
                        {shaderPresets.map((preset) => (
                          <div key={preset.id}
                            className={`btn btn-ghost justify-between ${currentShaderPreset === preset.id ? 'btn-active' : ''}`}
                            onClick={() => handleShaderPresetClick(preset.id)}>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="truncate">{preset.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* LivePortrait */}
          {activeTool === 'liveportrait' && sidebarMode !== 'settings' && (
            <div className="flex-1 mt-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-hidden">
                {null}
              </div>
            </div>
          )}

          {/* Delete folder confirmation */}
          {deletingFolder && (
            <div className="modal modal-open flex items-center justify-center">
              <div role="alert" className="alert w-[400px]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info h-6 w-6 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Delete this folder?</span>
                <div>
                  <button className="btn btn-sm" onClick={() => setDeletingFolder(null)}>No</button>
                  <button className="btn btn-sm btn-primary ml-2" onClick={() => { handleConversationDelete(deletingFolder); setDeletingFolder(null) }}>Yes</button>
                </div>
              </div>
              <div className="modal-backdrop" onClick={() => setDeletingFolder(null)}></div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="p-2 border-t border-base-content/10">
          <button className="btn btn-ghost btn-sm w-full flex justify-start gap-2" onClick={handleSettingsClick}>
            <SettingsIcon /><span>{sidebarMode === 'settings' ? 'Back' : 'Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
