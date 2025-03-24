import React, { useEffect, useRef, useState } from 'react';
import '../styles/goldie-talk.css';

const GoldieTalk = () => {
  const iframeRef = useRef(null);
  const [messageInput, setMessageInput] = useState('');
  const [sessionId, setSessionId] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const textareaRef = useRef(null);
  
  useEffect(() => {
    // 确保iframe正确加载
    if (iframeRef.current) {
      iframeRef.current.onload = () => {
        console.log('LiveTalking iframe loaded successfully');
        
        // 给iframe加载完成后一些时间来初始化
        setTimeout(() => {
          const iframe = iframeRef.current;
          if (!iframe) return;
          
          try {
            // 获取sessionId
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const sessionIdElem = iframeDoc.getElementById('sessionid');
            if (sessionIdElem) {
              setSessionId(parseInt(sessionIdElem.value) || 0);
            }
            
            // 向iframe注入CSS隐藏原始输入框
            const style = iframeDoc.createElement('style');
            style.textContent = `
              #echo-form { 
                display: none !important; 
              }
            `;
            iframeDoc.head.appendChild(style);
            
            // 点击开始按钮启动连接
            const startButton = iframeDoc.getElementById('start');
            if (startButton && !isConnected) {
              startButton.click();
              setIsConnected(true);
            }
          } catch (e) {
            console.error('无法访问iframe内容:', e);
          }
        }, 1000);
      };
    }
  }, [isConnected]);
  
  const sendMessage = () => {
    if (!messageInput.trim()) return;
    
    // 直接调用LiveTalking的API
    fetch('http://127.0.0.1:8010/human', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: messageInput,
        type: 'chat',
        interrupt: true,
        sessionid: sessionId
      })
    }).then(() => {
      console.log('消息已发送:', messageInput);
      setMessageInput('');
    }).catch(err => {
      console.error('发送消息失败:', err);
    });
  };

  return (
    <div className="goldie-talk-container">
      <div className="goldie-talk-iframe-container">
        <iframe
          ref={iframeRef}
          src="http://127.0.0.1:8010/webrtcchat.html"
          title="LiveTalking Digital Human"
          className="goldie-talk-iframe"
          allow="camera; microphone; display-capture; autoplay"
        />
      </div>
      
      {/* 自定义输入区域 */}
      <div className="goldie-talk-input-container">
        <div className="input-wrapper">
          <textarea 
            ref={textareaRef}
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              // 自动调整高度
              e.target.style.height = '100px';
              const scrollHeight = Math.max(e.target.scrollHeight, 100);
              e.target.style.height = `${scrollHeight}px`;
              if (e.target.scrollHeight > 480) {
                e.target.style.overflowY = 'scroll';
              } else {
                e.target.style.overflowY = 'hidden';
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                e.target.style.height = '100px';
                e.target.style.overflowY = 'hidden';
              }
            }}
            placeholder="和数字人对话..."
            className="goldie-talk-textarea"
          />
          
          {/* 发送按钮 */}
          <div className="send-button-container">
            <button
              className="send-button"
              onClick={sendMessage}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoldieTalk; 