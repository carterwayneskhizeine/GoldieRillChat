// 复制代码
export const copyCode = (selectedElement, selectedText) => {
  const pre = selectedElement?.closest('pre')
  const textarea = selectedElement?.closest('textarea')
  if (pre) {
    navigator.clipboard.writeText(pre.textContent)
  } else if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    if (selectedText) {
      navigator.clipboard.writeText(selectedText)
    }
  } else if (selectedText) {
    navigator.clipboard.writeText(selectedText)
  }
}

// 粘贴代码
export const pasteCode = async (selectedElement, setMessageInput) => {
  const pre = selectedElement?.closest('pre')
  const textarea = selectedElement?.closest('textarea')
  if (pre) {
    try {
      const text = await navigator.clipboard.readText()
      pre.querySelector('code').textContent = text
    } catch (error) {
      console.error('Failed to paste:', error)
    }
  } else if (textarea) {
    try {
      const text = await navigator.clipboard.readText()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentValue = textarea.value
      textarea.value = currentValue.substring(0, start) + text + currentValue.substring(end)
      setMessageInput(textarea.value)
    } catch (error) {
      console.error('Failed to paste:', error)
    }
  }
} 