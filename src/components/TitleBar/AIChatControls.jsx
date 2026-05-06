import React, { useState } from 'react'
import useAvailableModels from '../../hooks/useAvailableModels'
import ParameterPanel from './ParameterPanel'

export default function AIChatControls({
  isImageBackground, currentConversation, selectedModel, setSelectedModel,
  availableModels, selectedProvider, temperature, setTemperature, maxTokens, setMaxTokens
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const localAvailableModels = useAvailableModels(availableModels, selectedProvider)

  const safeTemperature = temperature !== undefined ? temperature : parseFloat(localStorage.getItem('aichat_temperature') || '0.7')
  const safeMaxTokens = maxTokens !== undefined ? maxTokens : parseInt(localStorage.getItem('aichat_max_tokens') || '4096')
  const [maxHistoryMessages, setMaxHistoryMessages] = useState(() =>
    parseInt(localStorage.getItem('aichat_max_history_messages') || '5')
  )

  const getTitleStyle = () => ({
    color: '#bababa',
    textShadow: '0px 0px 3px rgba(0, 0, 0, 0.7), 0px 0px 5px rgba(255, 215, 0, 0.5)',
    fontSize: '0.95rem', fontWeight: 'medium', display: 'inline-block',
    padding: '2px 6px', borderRadius: '4px',
    backgroundColor: isImageBackground ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
    opacity: 1, position: 'relative', zIndex: 5
  })

  const ibg = isImageBackground

  return (
    <div className="w-full flex items-center">
      <div className="flex-1 h-full flex items-center justify-center">
        <h2 className="text-sm text-center font-medium" style={getTitleStyle()}>
          {currentConversation?.name || 'Current session'}
        </h2>
      </div>

      <div className="flex-none flex items-center gap-4 mr-4" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex-none" style={{ width: '280px' }}>
          <select className="select select-bordered select-sm w-full"
            value={selectedModel || ''}
            onChange={(e) => {
              setSelectedModel && setSelectedModel(e.target.value)
              localStorage.setItem('aichat_model', e.target.value)
            }}
            style={ibg ? { backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' } : {}}>
            {localAvailableModels.map(model => (
              <option key={model} value={model}
                style={ibg ? { backgroundColor: 'rgba(0, 0, 0, 0.9)', color: 'white' } : {}}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown dropdown-bottom dropdown-end">
          <label tabIndex={0}
            className="btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
            style={ibg ? { backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' } : {}}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
              <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="16" strokeWidth="2" />
            </svg>
          </label>
          {isDropdownOpen && (
            <div tabIndex={0}
              className="dropdown-content z-[99] menu p-2 shadow bg-base-100 rounded-md w-[380px]"
              style={{
                ...(ibg ? {
                  backgroundColor: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white'
                } : {}),
                right: 0, maxHeight: 'unset', height: 'auto', overflow: 'visible'
              }}
              onClick={(e) => e.stopPropagation()}>
              <ParameterPanel
                isImageBackground={ibg}
                safeTemperature={safeTemperature}
                setTemperature={setTemperature}
                safeMaxTokens={safeMaxTokens}
                setMaxTokens={setMaxTokens}
                maxHistoryMessages={maxHistoryMessages}
                setMaxHistoryMessages={setMaxHistoryMessages}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
