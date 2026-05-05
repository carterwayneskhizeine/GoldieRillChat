import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import Editor from '@monaco-editor/react'

export default function MessageEditorPortal({
  editingMessage,
  messageInput,
  setMessageInput,
  exitEditMode,
  updateMessage,
}) {
  const [editorLanguage, setEditorLanguage] = useState('plaintext')
  const [editorTheme, setEditorTheme] = useState('vs-dark')
  const [fontSize, setFontSize] = useState(14)
  const editorRef = { current: null }

  if (!editingMessage) return null

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 message-editor-backdrop" onClick={exitEditMode}></div>
      <div className="relative message-editor-container w-[90vw] max-w-[1200px] h-[80vh] flex flex-col">
        <div className="flex-none message-editor-toolbar flex items-center justify-between">
          <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 9999 }}>
            <select
              className="select select-bordered select-sm"
              value={editorLanguage}
              onChange={(e) => setEditorLanguage(e.target.value)}
            >
              {['plaintext','javascript','typescript','python','java','cpp','csharp','html','css','json','markdown','sql','xml','yaml'].map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            <select
              className="select select-bordered select-sm"
              value={editorTheme}
              onChange={(e) => setEditorTheme(e.target.value)}
            >
              <option value="vs-dark">vs-dark</option>
              <option value="light">light</option>
              <option value="hc-black">hc-black</option>
            </select>

            <div className="flex items-center gap-1 font-size-selector">
              <button className="font-size-btn" onClick={() => setFontSize(prev => Math.max(8, prev - 2))}>-</button>
              <span className="font-size-display">{fontSize}</span>
              <button className="font-size-btn" onClick={() => setFontSize(prev => Math.min(32, prev + 2))}>+</button>
            </div>
          </div>

          <button className="close-btn" onClick={exitEditMode}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={editorLanguage}
            theme={editorTheme}
            value={messageInput}
            onChange={setMessageInput}
            onMount={(editor) => { editorRef.current = editor }}
            options={{
              fontSize,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>

        <div className="flex-none message-editor-actions flex justify-end gap-2">
          <button className="shader-btn" onClick={exitEditMode}>取消</button>
          <button
            className="shader-btn gold-save-btn"
            onClick={() => updateMessage(editingMessage.id, messageInput)}
          >
            保存
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
