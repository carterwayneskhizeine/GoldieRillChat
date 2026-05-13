import React, { useRef, useEffect, useState } from 'react';
import useUIStore from '../stores/useUIStore';
import '../styles/markdown-preview.css';
import MessageList from './MessageList';
import ChatInputArea from './ChatInputArea';
import MessageEditorPortal from './MessageEditorPortal';
import '../styles/chat.css';
import '../styles/message-editor.css';
import '../styles/chatview.css';
import { ReactPhotoEditor } from '../components/CustomPhotoEditor';
import { copyMessageContent } from './messageUtils';
import useFileDrop from '../hooks/useFileDrop';
import useImageEdit from '../hooks/useImageEdit';
import useBackgroundState from '../hooks/useBackgroundState';
import useScrollBehavior from '../hooks/useScrollBehavior';
import { handleRenameFile } from '../utils/fileRenameHandler';

export function ChatView({
  messages = [],
  currentConversation,
  editingMessage,
  setEditingMessage,
  messageInput,
  setMessageInput,
  selectedFiles,
  setSelectedFiles,
  sendMessage,
  deleteMessage,
  updateMessage,
  moveMessage,
  enterEditMode,
  exitEditMode,
  collapsedMessages,
  setCollapsedMessages,
  handleImageClick,
  fileInputRef: externalFileInputRef,
  editingFileName,
  setEditingFileName,
  fileNameInput,
  setFileNameInput,
  renameMessageFile,
  openFileLocation,
  deletingMessageId,
  setDeletingMessageId,
  cancelDeleteMessage,
  confirmDeleteMessage,
  scrollToMessage,
  window,
  isCompact = false,
  sendToMonaco,
  sendToEditor,
  shouldScrollToBottom = false,
  setShouldScrollToBottom,
  setMessages,
}) {
  const { sidebarOpen, sidebarMode } = useUIStore();
  const localFileInputRef = useRef(null);
  const [copiedMessageIds, setCopiedMessageIds] = useState(new Set());

  const { isDragging, isUploading, uploadProgress, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handleFileInputChange } =
    useFileDrop({ messages, setMessages, currentConversation, setShouldScrollToBottom, selectedFiles, setSelectedFiles });

  const { showInlineEditor, editingImage, handleEditImage, handleSaveEditedImage, handleCancelEdit } =
    useImageEdit({ currentConversation, messages, setMessages, setShouldScrollToBottom });

  const { currentBackground, currentVideoBackground } = useBackgroundState();

  const { messagesEndRef, userScrolled, setUserScrolled, scrollToBottom, handleMouseMove, handleMouseLeave } =
    useScrollBehavior({ messages, isCompact, shouldScrollToBottom, setShouldScrollToBottom });

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'c') {
        const selectedText = window.getSelection().toString();
        if (selectedText) navigator.clipboard.writeText(selectedText);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 's' && localStorage.getItem('active_tool') === 'chat') {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('open-chat-settings'));
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const selectedText = window.getSelection().toString();
    const target = e.target;
    window.dispatchEvent(new CustomEvent('showContextMenu', {
      detail: {
        x: e.pageX, y: e.pageY, type: 'text',
        data: {
          text: selectedText || target.value || target.textContent,
          onPaste: (text) => {
            if (target.tagName === 'TEXTAREA') {
              const start = target.selectionStart;
              const end = target.selectionEnd;
              target.value = target.value.substring(0, start) + text + target.value.substring(end);
              setMessageInput(target.value);
            }
          }
        }
      }
    }));
  };

  const handleCopyClick = async (message) => {
    const success = await copyMessageContent(message);
    if (success) {
      setCopiedMessageIds(prev => new Set([...prev, message.id]));
      setTimeout(() => {
        setCopiedMessageIds(prev => { const s = new Set(prev); s.delete(message.id); return s; });
      }, 1000);
    }
  };

  const onRenameFile = async (message, newFileName) => {
    try {
      await handleRenameFile({ message, newFileName, currentConversation, messages, setMessages, setEditingFileName, setFileNameInput });
    } catch (error) {
      alert('重命名失败: ' + error.message);
    }
  };

  return (
    <div className={`flex flex-col h-full relative ${isCompact ? 'chat-view-compact' : ''}`} style={{ userSelect: 'text' }}>
      <div className={`drag-overlay ${isDragging ? '' : 'hidden'}`} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
        <div className="drag-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="drag-text">拖放文件到这里上传</div>
        <div className="drag-subtext">支持图片、视频、音频和其他文件类型</div>
      </div>

      {userScrolled && messages.length > 0 && sidebarMode !== 'settings' && (
        <div className="fixed w-full flex justify-center items-center z-50 pointer-events-none"
          style={{ bottom: '140px', right: sidebarOpen ? '-106px' : '0px' }}>
          <button
            className="btn btn-ghost btn-sm btn-circle bg-transparent backdrop-blur-sm pointer-events-auto shadow-md"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setUserScrolled(false); setTimeout(scrollToBottom, 50); }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7 7m0 0l7-7m-7 7V3" />
            </svg>
          </button>
        </div>
      )}

      <MessageList
        messages={messages}
        messagesEndRef={messagesEndRef}
        isCompact={isCompact}
        editingMessage={editingMessage}
        editingFileName={editingFileName}
        setEditingFileName={setEditingFileName}
        fileNameInput={fileNameInput}
        setFileNameInput={setFileNameInput}
        collapsedMessages={collapsedMessages}
        setCollapsedMessages={setCollapsedMessages}
        deletingMessageId={deletingMessageId}
        setDeletingMessageId={setDeletingMessageId}
        copiedMessageIds={copiedMessageIds}
        setCopiedMessageIds={setCopiedMessageIds}
        currentBackground={currentBackground}
        currentVideoBackground={currentVideoBackground}
        currentConversation={currentConversation}
        handleRenameFile={onRenameFile}
        handleImageClick={handleImageClick}
        handleEditImage={handleEditImage}
        openFileLocation={openFileLocation}
        enterEditMode={enterEditMode}
        moveMessage={moveMessage}
        handleCopyClick={handleCopyClick}
        sendToMonaco={sendToMonaco}
        setMessages={setMessages}
        handleDragEnter={handleDragEnter}
        handleDragLeave={handleDragLeave}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        handleMouseMove={handleMouseMove}
        handleMouseLeave={handleMouseLeave}
      />

      <ChatInputArea
        editingMessage={editingMessage}
        isCompact={isCompact}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        sendMessage={sendMessage}
        currentConversation={currentConversation}
        handleContextMenu={handleContextMenu}
        fileInputRef={externalFileInputRef}
      />

      {isUploading && (
        <div className="fixed bottom-4 right-4 bg-base-200 p-3 rounded-lg shadow-lg z-50">
          <div className="text-sm mb-2">正在上传文件... {uploadProgress}%</div>
          <progress className="progress progress-primary w-56" value={uploadProgress} max="100"></progress>
        </div>
      )}

      {deletingMessageId && (
        isCompact ? (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div role="alert" className="alert bg-base-200 shadow-lg">
              <span className="text-sm">Delete this message?</span>
              <div>
                <button className="btn btn-xs" onClick={cancelDeleteMessage}>No</button>
                <button className="btn btn-xs btn-error ml-2" onClick={deleteMessage}>Yes</button>
              </div>
            </div>
            <div className="absolute inset-0 bg-black opacity-50 -z-10"></div>
          </div>
        ) : (
          <div className="modal modal-open flex items-center justify-center">
            <div role="alert" className="alert w-[400px]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info h-6 w-6 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Delete this message?</span>
              <div>
                <button className="btn btn-sm" onClick={cancelDeleteMessage}>No</button>
                <button className="btn btn-sm btn-primary ml-2" onClick={deleteMessage}>Yes</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={cancelDeleteMessage}></div>
          </div>
        )
      )}

      <MessageEditorPortal
        editingMessage={editingMessage}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        exitEditMode={exitEditMode}
        updateMessage={updateMessage}
      />

      {showInlineEditor && editingImage && (
        <ReactPhotoEditor
          open={true}
          onClose={handleCancelEdit}
          file={editingImage}
          onSaveImage={handleSaveEditedImage}
          allowColorEditing={true}
          allowRotate={true}
          allowFlip={true}
          allowZoom={true}
          allowResolutionSettings={true}
          allowAspectRatioSettings={true}
          downloadOnSave={false}
          resolution={{ width: 512, height: 512 }}
          resolutionOptions={[
            { width: 512, height: 512 },
            { width: 512, height: 288 },
            { width: 768, height: 320 },
            { width: 768, height: 512 },
            { width: 1024, height: 576 }
          ]}
          aspectRatioOptions={['16:9', '9:16', '21:9', '4:3', '1:1']}
          labels={{
            close: '关闭', save: '保存', rotate: '旋转', brightness: '亮度',
            contrast: '对比度', saturate: '饱和度', grayscale: '灰度', reset: '重置',
            flipHorizontal: '水平翻转', flipVertical: '垂直翻转', zoomIn: '放大',
            zoomOut: '缩小', resolution: '分辨率', aspectRatio: '宽高比', apply: '应用'
          }}
        />
      )}

      <input
        type="file"
        ref={externalFileInputRef || localFileInputRef}
        style={{ display: 'none' }}
        multiple
        onChange={(e) => handleFileInputChange(e, currentConversation)}
      />
    </div>
  );
}
