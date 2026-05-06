import React, { useState } from 'react'
import toastManager from '../../utils/toastManager'

const updateRangeProgress = (el) => {
  if (!el) return
  const min = parseFloat(el.min) || 0
  const max = parseFloat(el.max) || 100
  const val = parseFloat(el.value) || min
  const pct = ((val - min) / (max - min)) * 100
  el.style.setProperty('--range-shdw', `${pct}%`)
  el.style.background = `linear-gradient(to right, rgba(255, 215, 0, 0.35) 0%, rgba(255, 215, 0, 0.35) ${pct}%, rgba(0, 0, 0, 0.15) ${pct}%, rgba(0, 0, 0, 0.15) 100%)`
}

const rangeStyle = (pct) => ({
  position: 'relative', zIndex: 5,
  '--range-shdw': `${pct}%`,
  backgroundColor: 'rgba(0, 0, 0, 0.15)', borderRadius: '4px', height: '6px',
  '--range-thumb-bg': 'rgb(255, 215, 0)', '--range-thumb-shadow': '0 0 8px rgba(255, 215, 0, 0.5)'
})

const labelStyle = (isImgBg) => isImgBg
  ? { color: 'white', textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)' } : {}

const valueStyle = (isImgBg) => isImgBg
  ? { color: 'white', textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '2px 6px', borderRadius: '3px' }
  : {}

export default function ParameterPanel({
  isImageBackground, safeTemperature, setTemperature, safeMaxTokens, setMaxTokens,
  maxHistoryMessages, setMaxHistoryMessages
}) {
  const [bubbleBackground, setBubbleBackground] = useState(
    localStorage.getItem('chat-bubble-solid') === 'true' ? 'black' : 'transparent'
  )

  const handleMaxHistoryChange = (value) => {
    const num = parseInt(value)
    if (isNaN(num) || num < 0 || num > 21) return
    setMaxHistoryMessages(num)
    localStorage.setItem('aichat_max_history_messages', num.toString())
    toastManager.success(`历史消息数量已设置为${num === 21 ? '全部' : num}条`)
  }

  const toggleBubbleBackground = () => {
    const next = bubbleBackground === 'transparent' ? 'black' : 'transparent'
    setBubbleBackground(next)
    localStorage.setItem('chat-bubble-solid', next === 'black' ? 'true' : 'false')
    if (next === 'black') document.documentElement.classList.add('chat-bubble-solid')
    else document.documentElement.classList.remove('chat-bubble-solid')
  }

  const toggleUnlimitedTokens = () => {
    const value = safeMaxTokens === 999999 ? 4096 : 999999
    setMaxTokens(value)
    localStorage.setItem('aichat_max_tokens', value.toString())
    const rangeEl = document.querySelector('.dropdown-content input[type="range"][min="1024"]')
    if (rangeEl) { rangeEl.value = Math.min(value, 163840); updateRangeProgress(rangeEl) }
  }

  const ibg = isImageBackground

  return (
    <div className="p-2">
      {/* History messages */}
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium" style={labelStyle(ibg)}>Number of message:</span>
          <span className="text-sm min-w-[40px] text-right" style={valueStyle(ibg)}>
            {maxHistoryMessages === 21 ? '全部' : maxHistoryMessages}
          </span>
        </div>
        <input type="range" min="0" max="21" value={maxHistoryMessages} step="1"
          className="range range-xs w-full" style={rangeStyle((maxHistoryMessages / 21) * 100)}
          onChange={(e) => { handleMaxHistoryChange(e.target.value); updateRangeProgress(e.target) }}
          onInput={(e) => updateRangeProgress(e.target)} />
      </div>

      {/* Temperature */}
      <div className="flex flex-col gap-0.5 mb-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium" style={labelStyle(ibg)}>Temperature:</span>
          <span className="text-sm min-w-[40px] text-right" style={valueStyle(ibg)}>{safeTemperature.toFixed(1)}</span>
        </div>
        <input type="range" min="0" max="2" step="0.1" value={safeTemperature}
          className="range range-xs w-full" style={rangeStyle((safeTemperature / 2) * 100)}
          onChange={(e) => {
            setTemperature(parseFloat(e.target.value))
            localStorage.setItem('aichat_temperature', e.target.value)
            updateRangeProgress(e.target)
          }}
          onInput={(e) => updateRangeProgress(e.target)} />
      </div>

      {/* Max Tokens */}
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium" style={labelStyle(ibg)}>Max Tokens:</span>
          <span className="text-sm min-w-[40px] text-right" style={valueStyle(ibg)}>
            {safeMaxTokens === 999999 ? '∞' : safeMaxTokens}
          </span>
        </div>
        <input type="range" min="1024" max="163840" step="1024"
          value={safeMaxTokens > 163840 ? 163840 : safeMaxTokens}
          className="range range-xs w-full"
          style={rangeStyle(((Math.min(safeMaxTokens, 163840) - 1024) / (163840 - 1024)) * 100)}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            setMaxTokens(v)
            localStorage.setItem('aichat_max_tokens', v.toString())
            updateRangeProgress(e.target)
          }}
          onInput={(e) => updateRangeProgress(e.target)} />
        <div className="flex justify-between mt-0.5">
          <button className="btn btn-ghost" onClick={toggleBubbleBackground}
            title={bubbleBackground === 'transparent' ? '使用黑色背景' : '使用透明背景'}
            style={{
              ...(ibg ? { backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' } : {}),
              borderColor: 'rgb(255, 215, 0)', color: 'rgb(255, 215, 0)'
            }}>
            {bubbleBackground === 'transparent' ? 'Transparent' : 'Black'}
          </button>
          <button className="btn btn-ghost" onClick={toggleUnlimitedTokens}
            title={safeMaxTokens === 999999 ? '点击设置为默认值' : '点击设置为无限制'}
            style={ibg ? { backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' } : {}}>
            {safeMaxTokens === 999999 ? 'default' : 'unlimited'}
          </button>
        </div>
      </div>
    </div>
  )
}
