import { useState, useRef } from 'react';

export const useInputState = () => {
  // 输入框状态
  const [messageInput, setMessageInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 文件输入相关
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // 输入历史记录
  const [inputHistory, setInputHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 处理输入历史导航
  const handleHistoryNavigation = (direction) => {
    if (direction === 'up' && historyIndex < inputHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setMessageInput(inputHistory[inputHistory.length - 1 - newIndex]);
    } else if (direction === 'down' && historyIndex > -1) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (newIndex === -1) {
        setMessageInput('');
      } else {
        setMessageInput(inputHistory[inputHistory.length - 1 - newIndex]);
      }
    }
  };

  // 添加新的输入到历史记录
  const addToHistory = (input) => {
    if (input.trim()) {
      setInputHistory(prev => [...prev, input]);
      setHistoryIndex(-1);
    }
  };

  return {
    messageInput,
    setMessageInput,
    isGenerating,
    setIsGenerating,
    fileInputRef,
    selectedFile,
    setSelectedFile,
    inputHistory,
    setInputHistory,
    historyIndex,
    setHistoryIndex,
    handleHistoryNavigation,
    addToHistory
  };
}; 