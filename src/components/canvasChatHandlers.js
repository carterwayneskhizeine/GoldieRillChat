/**
 * 将画布图片发送到聊天
 * @param {Object} currentConversation - 当前对话
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {Array} messages - 消息列表
 * @param {Function} setMessages - 设置消息列表的函数
 * @param {Function} setActiveTool - 设置当前工具的函数
 * @param {Object} window - 窗口对象，用于访问electron API
 */
import toastManager from '../utils/toastManager';

export const sendCanvasToChat = async (currentConversation, canvas, messages, setMessages, setActiveTool, window) => {
  if (!currentConversation) {
    toastManager.warning('请先选择或创建一个对话');
    return
  }

  if (!canvas) return

  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const timestamp = Date.now()
    const fileName = `canvas_image_${timestamp}.png`
    
    // 将blob转换为Uint8Array
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // 保存文件
    const result = await window.electron.saveFile(currentConversation.path, {
      name: fileName,
      data: Array.from(uint8Array)
    })
    
    // 创建新消息
    const newMessage = {
      id: Date.now().toString(),
      content: '',
      timestamp: new Date().toISOString(),
      files: [{
        name: fileName,
        path: result.path
      }]
    }
    
    // 更新消息列表
    setMessages(prev => [...prev, newMessage])
    
    // 保存到storage
    await window.electron.saveMessages(
      currentConversation.path,
      currentConversation.id,
      [...messages, newMessage]
    )
    
    // 切换到chat面板
    setActiveTool('chat')
  } catch (error) {
    console.error('Failed to send canvas image:', error)
    toastManager.error('发送失败');
  }
} 