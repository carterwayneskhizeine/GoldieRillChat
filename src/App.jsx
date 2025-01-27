import React, { useState, useEffect, useRef } from 'react'

const themes = ["light", "dark", "cupcake", "synthwave", "cyberpunk", "valentine", "halloween", "garden", "forest", "lofi", "pastel", "fantasy", "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "coffee", "winter"]

export default function App() {
  const [activeTool, setActiveTool] = useState('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [storagePath, setStoragePath] = useState(() => localStorage.getItem('storagePath') || '')
  
  // Chat related states
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [editingMessage, setEditingMessage] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImage, setCurrentImage] = useState(null)
  const [allImages, setAllImages] = useState([])
  const [editingFileName, setEditingFileName] = useState(null)
  const [fileNameInput, setFileNameInput] = useState('')

  // Add new state variables
  const [imageResolution, setImageResolution] = useState(null)
  const [editingImageName, setEditingImageName] = useState(null)
  const [imageNameInput, setImageNameInput] = useState('')

  // Add new state variables for folder renaming
  const [editingFolderName, setEditingFolderName] = useState(null)
  const [folderNameInput, setFolderNameInput] = useState('')

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
    localStorage.setItem('theme', currentTheme)
  }, [currentTheme])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const toggleTheme = () => {
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    setCurrentTheme(themes[nextIndex])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      // Implementation will depend on your storage method
      // For now, we'll use localStorage as an example
      const savedConversations = JSON.parse(localStorage.getItem('conversations') || '[]')
      setConversations(savedConversations)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const createNewConversation = async () => {
    if (!storagePath) {
      alert('请先在设置中选择存储文件夹')
      return
    }

    try {
      const result = await window.electron.createChatFolder(storagePath)
      
      const newConversation = {
        id: Date.now().toString(),
        name: result.name,
        timestamp: new Date().toISOString(),
        path: result.path
      }
      
      setConversations(prev => [...prev, newConversation])
      setCurrentConversation(newConversation)
      setMessages([])
      
      // Save to storage
      localStorage.setItem('conversations', JSON.stringify([...conversations, newConversation]))
    } catch (error) {
      console.error('Failed to create new conversation:', error)
      alert('创建新对话失败')
    }
  }

  const loadConversation = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      setCurrentConversation(conversation)
      try {
        const loadedMessages = await window.electron.loadMessages(conversation.path, conversationId)
        setMessages(loadedMessages || [])
      } catch (error) {
        console.error('Failed to load messages:', error)
        setMessages([])
      }
    }
  }

  const sendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return
    
    const newMessage = {
      id: Date.now().toString(),
      content: messageInput,
      timestamp: new Date().toISOString(),
      files: selectedFiles,
    }

    // Save message as txt file
    if (messageInput.trim() && currentConversation) {
      try {
        const txtFile = await window.electron.saveMessageAsTxt(currentConversation.path, newMessage)
        newMessage.txtFile = txtFile
      } catch (error) {
        console.error('Failed to save message as txt:', error)
      }
    }
    
    setMessages(prev => [...prev, newMessage])
    setMessageInput('')
    setSelectedFiles([])
    
    // Reset textarea height and scrollbar
    const textarea = document.querySelector('textarea')
    if (textarea) {
      textarea.style.height = '48px'
      textarea.style.overflowY = 'hidden'
    }
    
    // Save to storage
    if (currentConversation) {
      await window.electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        [...messages, newMessage]
      )
    }
  }

  const handleFileSelect = async (event) => {
    if (!currentConversation) {
      alert('请先选择或创建一个对话')
      return
    }

    const files = Array.from(event.target.files)
    
    // Save files to chat folder
    const savedFiles = await Promise.all(files.map(async file => {
      const reader = new FileReader()
      const fileData = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result)
        reader.readAsArrayBuffer(file)
      })
      
      const result = await window.electron.saveFile(currentConversation.path, {
        name: file.name,
        data: Array.from(new Uint8Array(fileData))
      })
      
      return {
        name: file.name,
        path: result.path
      }
    }))
    
    setSelectedFiles(prev => [...prev, ...savedFiles])
  }

  const removeFile = (fileToRemove) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileToRemove.name))
  }

  const deleteMessage = async (messageId) => {
    const message = messages.find(msg => msg.id === messageId)
    if (!message) return

    try {
      if (currentConversation) {
        // Move message file to recycle bin
        await window.electron.deleteMessage(currentConversation.path, message)
        
        // Update messages state and storage
        const updatedMessages = messages.filter(msg => msg.id !== messageId)
        setMessages(updatedMessages)
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          updatedMessages
        )
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
      alert('删除消息失败')
    }
  }

  const enterEditMode = (message) => {
    setEditingMessage(message)
    setMessageInput(message.content)
  }

  const exitEditMode = () => {
    setEditingMessage(null)
    setMessageInput('')
  }

  const updateMessage = async (messageId, newContent) => {
    // Get the message being edited
    const message = messages.find(msg => msg.id === messageId)
    if (!message) return

    // Update message in state
    const updatedMessage = { ...message, content: newContent }
    
    if (currentConversation) {
      try {
        // Update txt file
        const txtFile = await window.electron.saveMessageAsTxt(currentConversation.path, updatedMessage)
        updatedMessage.txtFile = txtFile

        // Update messages.json
        const updatedMessages = messages.map(msg => 
          msg.id === messageId ? updatedMessage : msg
        )
        
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          updatedMessages
        )

        // Update state after successful file operations
        setMessages(updatedMessages)
      } catch (error) {
        console.error('Failed to update message files:', error)
        alert('保存修改失败')
        return
      }
    }

    exitEditMode()
  }

  const deleteConversation = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation) return

    try {
      // Move conversation folder to recycle bin
      await window.electron.moveFolderToRecycle(conversation.path)
      
      // Update state
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null)
        setMessages([])
      }
      
      // Update storage
      localStorage.setItem('conversations', JSON.stringify(
        conversations.filter(c => c.id !== conversationId)
      ))
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('删除对话失败')
    }
  }

  const handleSelectFolder = async () => {
    try {
      const result = await window.electron.selectFolder()
      if (result) {
        setStoragePath(result)
        localStorage.setItem('storagePath', result)
        // Save current messages to the new location
        if (currentConversation) {
          await window.electron.saveMessages(
            result,
            currentConversation.id,
            messages
          )
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    }
  }

  // Function to get all images from messages
  const getAllImages = () => {
    const images = []
    messages.forEach(message => {
      message.files?.forEach(file => {
        if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          images.push(file)
        }
      })
    })
    return images
  }

  // Function to show next image
  const showNextImage = () => {
    const images = getAllImages()
    const currentIndex = images.findIndex(img => img.path === currentImage.path)
    const nextIndex = (currentIndex + 1) % images.length
    setCurrentImage(images[nextIndex])
  }

  // Function to show previous image
  const showPrevImage = () => {
    const images = getAllImages()
    const currentIndex = images.findIndex(img => img.path === currentImage.path)
    const prevIndex = (currentIndex - 1 + images.length) % images.length
    setCurrentImage(images[prevIndex])
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showImageModal) return
      if (e.key === 'ArrowRight') {
        showNextImage()
      } else if (e.key === 'ArrowLeft') {
        showPrevImage()
      } else if (e.key === 'Escape') {
        setShowImageModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showImageModal, currentImage])

  // Add renameMessageFile function
  const renameMessageFile = async (message, newFileName) => {
    if (!currentConversation || !message.txtFile) return
    
    try {
      // Find if there's an existing message with the target filename
      const existingMessage = messages.find(msg => 
        msg.txtFile && msg.txtFile.displayName === newFileName
      )

      const result = await window.electron.renameMessageFile(
        currentConversation.path,
        message.txtFile.displayName,
        newFileName
      )

      if (result.merged && existingMessage) {
        // Merge message contents
        const mergedMessage = {
          ...existingMessage,
          content: `${existingMessage.content}\n\n${message.content}`,
          txtFile: result
        }

        // Update messages array
        setMessages(prev => prev.map(msg => 
          msg.id === existingMessage.id ? mergedMessage : msg
        ).filter(msg => msg.id !== message.id))

        // Save to storage
        const updatedMessages = messages
          .map(msg => msg.id === existingMessage.id ? mergedMessage : msg)
          .filter(msg => msg.id !== message.id)

        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          updatedMessages
        )
      } else {
        // Just rename
        const updatedMessage = {
          ...message,
          txtFile: result
        }

        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? updatedMessage : msg
        ))

        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          messages.map(msg => msg.id === message.id ? updatedMessage : msg)
        )
      }
    } catch (error) {
      console.error('Failed to rename file:', error)
      alert('重命名失败')
    }
    
    setEditingFileName(null)
    setFileNameInput('')
  }

  // Add function to get image resolution
  const getImageResolution = (imgElement) => {
    setImageResolution({
      width: imgElement.naturalWidth,
      height: imgElement.naturalHeight
    })
  }

  // Add function to rename image file
  const renameImageFile = async (file, newFileName) => {
    if (!currentConversation) return
    
    try {
      const oldPath = file.path
      const oldDir = window.electron.path.dirname(oldPath)
      const extension = window.electron.path.extname(file.name)
      const newName = newFileName + extension
      
      const result = await window.electron.renameFile(
        currentConversation.path,
        file.name,
        newName,
        'files'
      )

      // Update messages with new file path
      const updatedMessages = messages.map(msg => {
        if (msg.files) {
          const updatedFiles = msg.files.map(f => 
            f.path === oldPath ? { ...f, name: newName, path: result.path } : f
          )
          return { ...msg, files: updatedFiles }
        }
        return msg
      })

      setMessages(updatedMessages)
      setCurrentImage({ ...currentImage, name: newName, path: result.path })
      
      // Save updated messages
      await window.electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        updatedMessages
      )
    } catch (error) {
      console.error('Failed to rename image:', error)
      alert('重命名失败')
    }
    
    setEditingImageName(null)
    setImageNameInput('')
  }

  // Add renameChatFolder function
  const renameChatFolder = async (conversation, newName) => {
    try {
      const result = await window.electron.renameChatFolder(conversation.path, newName)
      
      // Update conversations state
      const updatedConversations = conversations.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, name: result.name, path: result.path }
          : conv
      )
      
      setConversations(updatedConversations)
      if (currentConversation?.id === conversation.id) {
        setCurrentConversation({ ...currentConversation, name: result.name, path: result.path })
      }
      
      // Update storage
      localStorage.setItem('conversations', JSON.stringify(updatedConversations))
    } catch (error) {
      console.error('Failed to rename chat folder:', error)
      alert('重命名失败')
    }
    
    setEditingFolderName(null)
    setFolderNameInput('')
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-base-300 text-base-content p-2 flex flex-col">
        {/* Top buttons row */}
        <div className="flex justify-between mb-2">
          {/* Settings button */}
          <button className="btn btn-circle btn-ghost" onClick={() => setShowSettings(true)}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          {/* New chat button */}
          <button className="btn btn-circle btn-ghost" onClick={createNewConversation}>
            <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Chat history list */}
        <div className="flex-1 mt-2 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className={`btn btn-ghost justify-between ${currentConversation?.id === conversation.id ? 'btn-active' : ''}`}
              >
                <div 
                  className="flex items-center gap-2 flex-1"
                  onClick={() => {
                    if (editingFolderName === conversation.id) return
                    loadConversation(conversation.id)
                  }}
                >
                  <svg className="h-4 w-4" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  {editingFolderName === conversation.id ? (
                    <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={folderNameInput}
                        onChange={(e) => setFolderNameInput(e.target.value)}
                        className="input input-xs input-bordered w-full"
                        placeholder="Enter new folder name"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            renameChatFolder(conversation, folderNameInput)
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          className="btn btn-xs flex-1"
                          onClick={() => renameChatFolder(conversation, folderNameInput)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-xs flex-1"
                          onClick={() => {
                            setEditingFolderName(null)
                            setFolderNameInput('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span 
                      className="truncate cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingFolderName(conversation.id)
                        setFolderNameInput(conversation.name)
                      }}
                    >
                      {conversation.name}
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conversation.id)
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-base-100">
        {/* Top navigation bar */}
        <div className="navbar bg-base-200">
          <div className="flex-1">
            <div className="tabs tabs-boxed">
              <button 
                onClick={() => setActiveTool('chat')}
                className={`tab ${activeTool === 'chat' ? 'tab-active' : ''}`}
              >
                Chat
              </button>
              <button 
                onClick={() => setActiveTool('editor')}
                className={`tab ${activeTool === 'editor' ? 'tab-active' : ''}`}
              >
                Image Editor
              </button>
            </div>
          </div>
        </div>

        {/* Chat content area */}
        {activeTool === 'chat' && (
          <div className="flex-1 flex flex-col relative">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="max-w-3xl mx-auto py-4 px-6 pb-32">
                {messages.map(message => (
                  <div key={message.id} className="chat chat-start mb-8">
                    <div className="chat-bubble relative max-w-[800px]">
                      {editingMessage?.id === message.id ? (
                        <div className="join w-full">
                          <div className="mockup-code w-[650px] h-[550px] bg-base-300 relative">
                            <pre data-prefix=""></pre>
                            <textarea
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              className="absolute inset-0 top-[40px] bg-transparent text-current p-4 resize-none focus:outline-none w-full h-[calc(100%-40px)] font-mono"
                            />
                          </div>
                          <div className="absolute -bottom-8 -left-1 flex gap-1">
                            <button
                              className="btn btn-ghost btn-xs bg-base-100"
                              onClick={() => updateMessage(message.id, messageInput)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-ghost btn-xs bg-base-100"
                              onClick={exitEditMode}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {message.txtFile && (
                            <div className="text-sm opacity-70 mb-1">
                              {editingFileName === message.id ? (
                                <div className="join">
                                  <input
                                    type="text"
                                    value={fileNameInput}
                                    onChange={(e) => setFileNameInput(e.target.value)}
                                    className="input input-xs input-bordered join-item"
                                    placeholder="Enter new file name"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        renameMessageFile(message, fileNameInput)
                                      }
                                    }}
                                  />
                                  <button
                                    className="btn btn-xs join-item"
                                    onClick={() => renameMessageFile(message, fileNameInput)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="btn btn-xs join-item"
                                    onClick={() => {
                                      setEditingFileName(null)
                                      setFileNameInput('')
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline"
                                  onClick={() => {
                                    setEditingFileName(message.id)
                                    setFileNameInput(message.txtFile.displayName)
                                  }}
                                >
                                  {message.txtFile.displayName}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between items-start">
                            <div className="prose max-w-none whitespace-pre-wrap break-words w-full">
                              {message.content}
                            </div>
                          </div>
                          {message.files?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {message.files.map((file, index) => (
                                file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <div 
                                    key={index} 
                                    className="relative group cursor-pointer"
                                    onClick={() => {
                                      setCurrentImage(file)
                                      setShowImageModal(true)
                                    }}
                                  >
                                    <img 
                                      src={`local-file://${file.path}`} 
                                      alt={file.name}
                                      className="max-w-[200px] max-h-[200px] rounded-lg object-cover hover:opacity-90 transition-opacity"
                                    />
                                  </div>
                                ) : (
                                  <div key={index} className="badge badge-outline">
                                    {file.name}
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                          <div className="absolute -bottom-8 -left-1 flex gap-1">
                            <button
                              className="btn btn-ghost btn-xs bg-base-100"
                              onClick={() => enterEditMode(message)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-xs bg-base-100"
                              onClick={() => deleteMessage(message.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom input area - fixed */}
            <div className={`absolute bottom-0 left-0 right-0 bg-base-100 z-50 ${editingMessage ? 'hidden' : ''}`}>
              <div className="p-4">
                <div className="max-w-3xl mx-auto relative">
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="badge badge-outline gap-2">
                          {file.name}
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => removeFile(file)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="join w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                    />
                    <button
                      className="btn join-item"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </button>
                    <textarea 
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value)
                        // Reset height to auto to get the correct scrollHeight
                        e.target.style.height = 'auto'
                        // Set new height based on scrollHeight
                        const newHeight = Math.min(e.target.scrollHeight, window.innerHeight - 200)
                        e.target.style.height = `${newHeight}px`
                        // Show scrollbar when content exceeds max height
                        if (e.target.scrollHeight > window.innerHeight - 200) {
                          e.target.style.overflowY = 'auto'
                        } else {
                          e.target.style.overflowY = 'hidden'
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                          // Reset height after sending
                          e.target.style.height = '48px'
                          e.target.style.overflowY = 'hidden'
                        }
                      }}
                      placeholder="Send a message..."
                      className="textarea textarea-bordered join-item flex-1 min-h-[2.5rem] max-h-[calc(100vh-200px)] resize-none overflow-x-hidden"
                      rows="1"
                    />
                    <button
                      className="btn btn-primary join-item"
                      onClick={sendMessage}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image editor area */}
        {activeTool === 'editor' && (
          <div className="flex-1 flex flex-col p-4 gap-4">
            {/* Canvas area */}
            <div className="flex-1 bg-base-200 rounded-lg flex items-center justify-center">
              <div className="w-[512px] h-[288px] bg-base-300 rounded relative">
                {/* Canvas will be rendered here */}
                <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
                  Drop image here or click Import
                </div>
              </div>
            </div>

            {/* Resolution info */}
            <div className="flex gap-4 text-sm">
              <span className="opacity-70">Canvas: 512 × 288</span>
              <span className="opacity-70">Image: 1245 × 1210</span>
            </div>

            {/* Tools row */}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-sm">Import</button>

              <div className="dropdown">
                <button tabIndex={0} className="btn btn-sm">Res</button>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box">
                  <li><button>512 × 512</button></li>
                  <li><button>512 × 288</button></li>
                  <li><button>768 × 320</button></li>
                  <li><button>768 × 512</button></li>
                </ul>
              </div>

              <button className="btn btn-sm btn-square">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              <button className="btn btn-sm btn-square">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>

              <button className="btn btn-sm btn-square">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 8h16M4 16h16" />
                </svg>
              </button>

              <button className="btn btn-sm btn-square">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>

              <div className="dropdown">
                <button tabIndex={0} className="btn btn-sm btn-square">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box">
                  <li><button>JPG Format</button></li>
                  <li><button>PNG Format</button></li>
                </ul>
              </div>

              <div className="dropdown">
                <button tabIndex={0} className="btn btn-sm">AR</button>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box">
                  <li><button>16:9</button></li>
                  <li><button>9:16</button></li>
                  <li><button>4:3</button></li>
                  <li><button>1:1</button></li>
                </ul>
              </div>

              <button className="btn btn-sm btn-square">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>

              {/* Resolution inputs */}
              <div className="join">
                <input type="number" placeholder="Width" className="input input-bordered input-sm join-item w-20" />
                <span className="join-item flex items-center px-2 bg-base-200">×</span>
                <input type="number" placeholder="Height" className="input input-bordered input-sm join-item w-20" />
                <button className="btn btn-sm join-item">Apply</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button 
              onClick={() => setShowSettings(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Storage</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Folder</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm opacity-70">{storagePath || 'No folder selected'}</span>
                      <button className="btn btn-primary" onClick={handleSelectFolder}>
                        Modify Folder
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Update</h3>
                    <button className="btn btn-primary">
                      Update Folders
                    </button>
                  </div>

                  <div className="divider"></div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Theme</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm opacity-70">{currentTheme}</span>
                      <button onClick={toggleTheme} className="btn btn-primary">
                        Change Theme
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowSettings(false)}></div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && currentImage && (
        <div className="modal modal-open">
          <div className="modal-box relative max-w-5xl h-[80vh] p-0 bg-transparent shadow-none overflow-visible flex flex-col">
            <button 
              className="btn btn-circle btn-ghost absolute right-2 top-2 z-50 bg-base-100"
              onClick={() => setShowImageModal(false)}
            >
              ✕
            </button>
            
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16">
              <button 
                className="btn btn-circle btn-ghost bg-base-100"
                onClick={showPrevImage}
              >
                ❮
              </button>
            </div>
            
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16">
              <button 
                className="btn btn-circle btn-ghost bg-base-100"
                onClick={showNextImage}
              >
                ❯
              </button>
            </div>

            <div className="w-full flex-1 flex items-center justify-center">
              <img 
                src={`local-file://${currentImage.path}`}
                alt={currentImage.name}
                className="max-w-full max-h-full object-contain"
                onLoad={(e) => getImageResolution(e.target)}
              />
            </div>

            <div className="bg-base-100 p-4 flex items-center gap-4">
              {editingImageName === currentImage.path ? (
                <div className="join">
                  <input
                    type="text"
                    value={imageNameInput}
                    onChange={(e) => setImageNameInput(e.target.value)}
                    className="input input-bordered join-item"
                    placeholder="Enter new file name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        renameImageFile(currentImage, imageNameInput)
                      }
                    }}
                  />
                  <button
                    className="btn join-item"
                    onClick={() => renameImageFile(currentImage, imageNameInput)}
                  >
                    Save
                  </button>
                  <button
                    className="btn join-item"
                    onClick={() => {
                      setEditingImageName(null)
                      setImageNameInput('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span
                  className="cursor-pointer hover:underline"
                  onClick={() => {
                    setEditingImageName(currentImage.path)
                    setImageNameInput(currentImage.name.replace(/\.[^/.]+$/, ""))
                  }}
                >
                  {currentImage.name}
                </span>
              )}
              {imageResolution && (
                <span className="opacity-70">
                  Res: {imageResolution.width} × {imageResolution.height}
                </span>
              )}
            </div>
          </div>
          <div 
            className="modal-backdrop bg-black/80" 
            onClick={() => setShowImageModal(false)}
          ></div>
        </div>
      )}
    </div>
  )
}
