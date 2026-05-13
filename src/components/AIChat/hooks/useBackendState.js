import { useState, useEffect, useRef, useCallback } from 'react'
import { BACKEND_TYPES, BACKEND_STORAGE_KEY } from '../constants/storageKeys'
import { connectOpenClaw, onOpenClawConnectionState, getOpenClawConfig } from '../../../services/openclawService'
import { checkHermesHealth } from '../../../services/hermesService'

function loadBackend() {
  return localStorage.getItem(BACKEND_STORAGE_KEY) || BACKEND_TYPES.DIRECT
}

export function useBackendState() {
  const [backend, setBackendState] = useState(loadBackend)
  const [openclawStatus, setOpenclawStatus] = useState('disconnected')
  const [hermesHealthy, setHermesHealthy] = useState(false)
  const [openclawSessionKey, setOpenclawSessionKey] = useState('main')
  const [hermesSessionId, setHermesSessionId] = useState(null)
  const unsubscribeRef = useRef(null)

  const setBackend = useCallback((type) => {
    setBackendState(type)
    localStorage.setItem(BACKEND_STORAGE_KEY, type)
  }, [])

  // Subscribe to OpenClaw connection state changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.openclawAPI) return

    const unsub = onOpenClawConnectionState(({ state }) => {
      setOpenclawStatus(state)
    })
    unsubscribeRef.current = unsub
    return () => { if (unsubscribeRef.current) unsubscribeRef.current() }
  }, [])

  // Auto-connect OpenClaw when backend switches to it
  useEffect(() => {
    if (backend !== BACKEND_TYPES.OPENCLAW) return
    const cfg = getOpenClawConfig()
    if (!cfg.url) return
    if (openclawStatus === 'connected' || openclawStatus === 'connecting') return
    connectOpenClaw(cfg).catch(() => {})
  }, [backend, openclawStatus])

  // Poll Hermes health when backend is Hermes
  useEffect(() => {
    if (backend !== BACKEND_TYPES.HERMES) return
    let cancelled = false
    const check = async () => {
      const healthy = await checkHermesHealth()
      if (!cancelled) setHermesHealthy(healthy)
    }
    check()
    const interval = setInterval(check, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [backend])

  return {
    backend,
    setBackend,
    openclawStatus,
    hermesHealthy,
    openclawSessionKey,
    setOpenclawSessionKey,
    hermesSessionId,
    setHermesSessionId,
  }
}
