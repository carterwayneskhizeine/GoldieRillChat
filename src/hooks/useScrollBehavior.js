import { useRef, useState, useEffect } from 'react'

export default function useScrollBehavior({ messages, isCompact, shouldScrollToBottom, setShouldScrollToBottom }) {
  const messagesEndRef = useRef(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const scrollTimeoutRef = useRef(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    } else {
      const container = document.querySelector('#chat-view-messages')
      if (container) container.scrollTop = container.scrollHeight
    }
  }

  useEffect(() => {
    const container = document.querySelector('#chat-view-messages')
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 30
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      if (!isAtBottom) {
        setUserScrolled(true)
      } else {
        scrollTimeoutRef.current = setTimeout(() => setUserScrolled(false), 1000)
      }
    }
    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [messages])

  useEffect(() => {
    if (shouldScrollToBottom) {
      setTimeout(() => {
        scrollToBottom()
        if (typeof setShouldScrollToBottom === 'function') setShouldScrollToBottom(false)
      }, 50)
    }
  }, [messages, isCompact, shouldScrollToBottom, setShouldScrollToBottom])

  const handleMouseMove = (e) => {
    const chatMessages = document.getElementById('chat-view-messages')
    if (!chatMessages) return
    const containerRect = chatMessages.getBoundingClientRect()
    const distanceToRightEdge = containerRect.right - e.clientX
    if (distanceToRightEdge <= 20 && distanceToRightEdge >= 0) {
      chatMessages.classList.add('scrollbar-expanded')
    } else {
      chatMessages.classList.remove('scrollbar-expanded')
    }
  }

  const handleMouseLeave = () => {
    const chatMessages = document.getElementById('chat-view-messages')
    if (chatMessages) chatMessages.classList.remove('scrollbar-expanded')
  }

  return { messagesEndRef, userScrolled, setUserScrolled, scrollToBottom, handleMouseMove, handleMouseLeave }
}
