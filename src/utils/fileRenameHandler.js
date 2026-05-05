export async function handleRenameFile({ message, newFileName, currentConversation, messages, setMessages, setEditingFileName, setFileNameInput }) {
  if (!currentConversation) throw new Error('无效的会话')

  if (message.txtFile) {
    const newFileNameWithExt = `${newFileName}.txt`
    const result = await window.electron.renameFile(currentConversation.path, message.txtFile.name, newFileNameWithExt)
    const updatedMessages = messages.map(msg =>
      msg.id === message.id
        ? { ...msg, txtFile: { ...msg.txtFile, name: result.name, displayName: newFileName, path: result.path } }
        : msg
    )
    setMessages(updatedMessages)
    setEditingFileName(null)
    setFileNameInput('')
    return
  }

  if (!message.files || message.files.length === 0) throw new Error('找不到要重命名的文件')

  const file = message.files[0]
  const fileExt = file.name.split('.').pop()
  const newName = `${newFileName}.${fileExt}`
  const result = await window.electron.renameFile(currentConversation.path, file.name, newName)

  let updatedContent = message.content
  if (/^(文件|图片文件|视频文件|音频文件|PDF文档|办公文档|文本文件):/.test(message.content)) {
    updatedContent = message.content.replace(/: .+$/, `: ${newName}`)
  }

  const updatedMessages = messages.map(msg =>
    msg.id === message.id
      ? { ...msg, files: [{ ...file, name: result.name, path: result.path }], content: updatedContent }
      : msg
  )
  setMessages(updatedMessages)
  setEditingFileName(null)
  setFileNameInput('')
}
