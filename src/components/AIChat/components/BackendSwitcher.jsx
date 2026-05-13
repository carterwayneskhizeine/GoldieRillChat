import React from 'react'
import { BACKEND_TYPES } from '../constants/storageKeys'
import { OpenClawSessionSelector } from './OpenClawSessionSelector'
import { HermesSessionSelector } from './HermesSessionSelector'
import '../styles/contentBlocks.css'

const BACKEND_LABELS = {
  [BACKEND_TYPES.DIRECT]: '直连',
  [BACKEND_TYPES.OPENCLAW]: 'OpenClaw',
  [BACKEND_TYPES.HERMES]: 'Hermes',
}

function StatusDot({ status }) {
  const cls = status === 'connected' ? 'backend-status-dot--connected'
    : status === 'connecting' ? 'backend-status-dot--connecting'
    : 'backend-status-dot--disconnected'
  return <span className={`backend-status-dot ${cls}`} />
}

export function BackendSwitcher({
  backend,
  setBackend,
  openclawStatus,
  hermesHealthy,
  openclawSessionKey,
  setOpenclawSessionKey,
  hermesSessionId,
  setHermesSessionId,
  onNewHermesChat,
}) {
  return (
    <div className="backend-switcher">
      {/* Backend tabs */}
      <div className="flex gap-1 mr-2">
        {Object.values(BACKEND_TYPES).map((type) => (
          <button
            key={type}
            className={`backend-tab${backend === type ? ' backend-tab--active' : ''}`}
            onClick={() => setBackend(type)}
          >
            {type === BACKEND_TYPES.OPENCLAW && (
              <StatusDot status={openclawStatus} />
            )}
            {type === BACKEND_TYPES.HERMES && (
              <StatusDot status={hermesHealthy ? 'connected' : 'disconnected'} />
            )}
            {BACKEND_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Session selectors */}
      {backend === BACKEND_TYPES.OPENCLAW && (
        <OpenClawSessionSelector
          currentSessionKey={openclawSessionKey}
          onSessionChange={setOpenclawSessionKey}
          connectionStatus={openclawStatus}
        />
      )}
      {backend === BACKEND_TYPES.HERMES && (
        <HermesSessionSelector
          currentSessionId={hermesSessionId}
          onSessionChange={(id) => { setHermesSessionId(id); if (!id && onNewHermesChat) onNewHermesChat() }}
          isHealthy={hermesHealthy}
        />
      )}
    </div>
  )
}
