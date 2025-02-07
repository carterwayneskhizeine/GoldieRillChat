import React, { useState, useEffect, useRef } from 'react';

const TypingText = ({ text, onComplete, speed = 50 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef(null);
  
  useEffect(() => {
    if (!text) return;
    
    setIsTyping(true);
    setDisplayedText('');
    let currentIndex = 0;
    let buffer = '';
    
    const typeNextChar = () => {
      if (currentIndex >= text.length) {
        setIsTyping(false);
        onComplete?.();
        return;
      }
      
      // 获取当前字符
      const char = text[currentIndex];
      buffer += char;
      currentIndex++;
      
      // 更新显示的文本
      setDisplayedText(buffer);
      
      // 计算下一个字符的延迟
      let delay = speed;
      
      // 根据字符类型调整速度
      if (char === ' ') {
        delay = speed * 0.5; // 空格更快
      } else if (/[,.!?]/.test(char)) {
        delay = speed * 1.5; // 标点符号更慢
      } else if (char === '\n') {
        delay = speed * 2; // 换行更慢
      } else if (/[a-zA-Z]/.test(char)) {
        delay = speed * 0.8; // 英文字母稍快
      } else if (/[\u4e00-\u9fa5]/.test(char)) {
        delay = speed * 1.2; // 中文字符稍慢
      }
      
      // 随机调整速度,模拟真实打字
      delay *= 0.8 + Math.random() * 0.4; // 在 80% - 120% 之间随机
      
      timeoutRef.current = setTimeout(typeNextChar, delay);
    };
    
    timeoutRef.current = setTimeout(typeNextChar, speed);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsTyping(false);
    };
  }, [text, speed, onComplete]);
  
  return (
    <span className={`typing-content ${isTyping ? 'typing' : ''}`}>
      {displayedText}
    </span>
  );
};

export default TypingText; 