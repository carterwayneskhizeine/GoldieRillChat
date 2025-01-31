/**
 * 开始拖动对话
 * @param {Object} conversation - 被拖动的对话
 * @param {Function} setDraggedConversation - 设置被拖动对话的函数
 */
export const handleDragStart = (conversation, setDraggedConversation) => {
  setDraggedConversation(conversation)
}

/**
 * 拖动对话过程中
 * @param {DragEvent} e - 拖动事件对象
 */
export const handleDragOver = (e) => {
  e.preventDefault()
}

/**
 * 放下对话（重新排序）
 * @param {Object} targetConversation - 目标对话
 * @param {Object} draggedConversation - 被拖动的对话
 * @param {Array} conversations - 对话列表
 * @param {Function} setConversations - 设置对话列表的函数
 * @param {Function} setDraggedConversation - 设置被拖动对话的函数
 */
export const handleDrop = async (targetConversation, draggedConversation, conversations, setConversations, setDraggedConversation) => {
  if (!draggedConversation || draggedConversation.id === targetConversation.id) return

  const oldIndex = conversations.findIndex(c => c.id === draggedConversation.id)
  const newIndex = conversations.findIndex(c => c.id === targetConversation.id)
  
  const newConversations = [...conversations]
  newConversations.splice(oldIndex, 1)
  newConversations.splice(newIndex, 0, draggedConversation)
  
  setConversations(newConversations)
  setDraggedConversation(null)
  
  // 保存新的顺序到存储
  localStorage.setItem('conversations', JSON.stringify(newConversations))
} 