import React, { useState, useEffect, useCallback } from 'react'
import { listOpenClawSessions, createOpenClawSession, deleteOpenClawSession, renameOpenClawSession } from '../../../services/openclawService'

export function OpenClawSessionSelector({ currentSessionKey, onSessionChange, connectionStatus }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [renamingKey, setRenamingKey] = useState(null)
  const [renameLabel, setRenameLabel] = useState('')

  const loadSessions = useCallback(async () => {
    if (connectionStatus !== 'connected') return
    setLoading(true)
    setError(null)
    try {
      const list = await listOpenClawSessions()
      setSessions(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [connectionStatus])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleCreate = async () => {
    if (!newLabel.trim()) return
    try {
      const res = await createOpenClawSession(newLabel.trim())
      setNewLabel('')
      setCreating(false)
      await loadSessions()
      if (res.key && onSessionChange) onSessionChange(res.key)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (key, e) => {
    e.stopPropagation()
    if (key === 'main') return
    if (!window.confirm(`删除会话 "${key}"？`)) return
    try {
      await deleteOpenClawSession(key)
      await loadSessions()
      if (currentSessionKey === key && onSessionChange) onSessionChange('main')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRenameSubmit = async (key) => {
    if (!renameLabel.trim()) { setRenamingKey(null); return }
    try {
      await renameOpenClawSession(key, renameLabel.trim())
      setRenamingKey(null)
      await loadSessions()
    } catch (e) {
      setError(e.message)
    }
  }

  if (connectionStatus !== 'connected') {
    return (
      <div className="px-2 py-1 text-xs text-base-content/50">
        {connectionStatus === 'connecting' ? '连接中…' : '未连接'}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 min-w-0">
      <select
        className="select select-xs select-bordered max-w-[140px] text-xs"
        value={currentSessionKey || 'main'}
        onChange={(e) => onSessionChange && onSessionChange(e.target.value)}
      >
        <option value="main">主会话</option>
        {sessions.filter((s) => s.key !== 'main').map((s) => (
          <option key={s.key} value={s.key}>{s.label || s.key}</option>
        ))}
      </select>

      {renamingKey ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            className="input input-xs input-bordered w-24"
            value={renameLabel}
            onChange={(e) => setRenameLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(renamingKey); if (e.key === 'Escape') setRenamingKey(null) }}
          />
          <button className="btn btn-xs btn-primary" onClick={() => handleRenameSubmit(renamingKey)}>保存</button>
          <button className="btn btn-xs btn-ghost" onClick={() => setRenamingKey(null)}>取消</button>
        </div>
      ) : creating ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            className="input input-xs input-bordered w-24"
            placeholder="会话名称"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
          />
          <button className="btn btn-xs btn-primary" onClick={handleCreate}>创建</button>
          <button className="btn btn-xs btn-ghost" onClick={() => setCreating(false)}>取消</button>
        </div>
      ) : (
        <>
          <button className="btn btn-xs btn-ghost" title="新建会话" onClick={() => setCreating(true)}>＋</button>
          {currentSessionKey && currentSessionKey !== 'main' && (
            <>
              <button className="btn btn-xs btn-ghost" title="重命名" onClick={() => { setRenamingKey(currentSessionKey); setRenameLabel('') }}>✎</button>
              <button className="btn btn-xs btn-ghost text-error" title="删除会话" onClick={(e) => handleDelete(currentSessionKey, e)}>✕</button>
            </>
          )}
          <button className="btn btn-xs btn-ghost" title="刷新" onClick={loadSessions}>↻</button>
        </>
      )}
      {error && <span className="text-xs text-error ml-1">{error}</span>}
    </div>
  )
}
