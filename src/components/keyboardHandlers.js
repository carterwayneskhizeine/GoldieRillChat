import { useEffect } from 'react'

// 键盘事件处理的自定义Hook
export const useKeyboardEvents = ({
  setIsCtrlPressed
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(true)
      }
    }
    
    const handleKeyUp = (e) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(false)
      }
    }
    
    // 添加事件监听器
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setIsCtrlPressed]) // 添加依赖项

  return null
}

// 键盘按下事件处理函数
export const handleKeyDown = (e, setIsCtrlPressed) => {
  if (e.key === 'Control') {
    setIsCtrlPressed(true)
  }
}

// 键盘释放事件处理函数
export const handleKeyUp = (e, setIsCtrlPressed) => {
  if (e.key === 'Control') {
    setIsCtrlPressed(false)
  }
} 