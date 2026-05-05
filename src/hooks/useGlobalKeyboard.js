import { useEffect } from 'react'
import useToolStore from '../stores/useToolStore'
import useUIStore from '../stores/useUIStore'
import { tools } from '../config/toolsConfig'

export function useGlobalKeyboard({
  editingMessage,
  conversations,
  currentConversation,
  keyboardSelectedConversationId,
  isKeyboardNavigating,
  setKeyboardSelectedConversationId,
  setIsKeyboardNavigating,
  handleConversationSelect,
}) {
  const { activeTool, setActiveTool, switchTool } = useToolStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        editingMessage ||
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) {
        return
      }

      // Ctrl+G: toggle sidebar
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault()
        setSidebarOpen(!sidebarOpen)
        return
      }

      // Ctrl+1-7: switch to tool by index
      if (e.ctrlKey && /^[1-7]$/.test(e.key)) {
        const index = parseInt(e.key) - 1
        if (index >= 0 && index < tools.length) {
          setActiveTool(tools[index])
        }
        return
      }

      // Ctrl+Arrow left/right: cycle tools
      if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        switchTool(e.key === 'ArrowLeft' ? 'prev' : 'next')
        return
      }

      // Ctrl+Arrow up/down: keyboard-navigate conversations
      if (
        e.ctrlKey &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        (activeTool === 'aichat' || activeTool === 'chat') &&
        conversations.length > 0
      ) {
        e.preventDefault()
        setIsKeyboardNavigating(true)

        let currentIndex = -1
        if (keyboardSelectedConversationId) {
          currentIndex = conversations.findIndex((c) => c.id === keyboardSelectedConversationId)
        } else if (currentConversation) {
          currentIndex = conversations.findIndex((c) => c.id === currentConversation.id)
        }

        const newIndex =
          e.key === 'ArrowUp'
            ? currentIndex <= 0 ? conversations.length - 1 : currentIndex - 1
            : currentIndex >= conversations.length - 1 ? 0 : currentIndex + 1

        setKeyboardSelectedConversationId(conversations[newIndex].id)
        setTimeout(() => {
          const el = document.querySelector(`.conversation-item-${conversations[newIndex].id}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 50)
        return
      }

      // Enter: confirm keyboard-selected conversation
      if (e.key === 'Enter' && isKeyboardNavigating && keyboardSelectedConversationId) {
        const selected = conversations.find((c) => c.id === keyboardSelectedConversationId)
        if (selected) {
          handleConversationSelect(keyboardSelectedConversationId)
          setIsKeyboardNavigating(false)
        }
        return
      }

      // Escape: cancel keyboard navigation
      if (e.key === 'Escape' && isKeyboardNavigating) {
        setIsKeyboardNavigating(false)
        setKeyboardSelectedConversationId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    sidebarOpen,
    setSidebarOpen,
    activeTool,
    setActiveTool,
    switchTool,
    editingMessage,
    conversations,
    currentConversation,
    keyboardSelectedConversationId,
    isKeyboardNavigating,
    setKeyboardSelectedConversationId,
    setIsKeyboardNavigating,
    handleConversationSelect,
  ])
}
