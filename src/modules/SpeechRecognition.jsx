import React, { useState, useRef, useEffect, useCallback } from 'react';

// API基础URL
const API_BASE_URL = 'http://127.0.0.1:2047';

// 导出通知显示函数供其他组件使用
export const showNotification = (message, type = 'info') => {
  console.log(`[${type}] ${message}`);
  
  // 先删除可能存在的旧容器
  const existingContainer = document.getElementById('title-bar-notifications');
  if (existingContainer) {
    document.body.removeChild(existingContainer);
  }
  
  // 创建新的通知容器
  const notificationContainer = document.createElement('div');
  notificationContainer.id = 'title-bar-notifications';
  Object.assign(notificationContainer.style, {
    position: 'fixed',
    top: '60px',
    left: '20px', // 确保显示在左侧
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '180px', // 设置最大宽度
    transition: 'all 0.3s ease-in-out'
  });
  
  // 创建Alert元素
  const alertElement = document.createElement('div');
  
  // 使用DaisyUI的alert样式类
  alertElement.className = `alert ${
    type === 'error' ? 'alert-error' : 
    type === 'success' ? 'alert-success' : 
    'alert-info'
  } shadow-lg`;
  
  // 设置Alert元素样式
  Object.assign(alertElement.style, {
    width: '180px', // 固定宽度
    opacity: '0',
    transition: 'opacity 0.3s ease-in-out',
    padding: '0.75rem',
    borderRadius: '0.5rem'
  });
  
  // 根据不同类型设置不同的图标
  let iconSvg = '';
  if (type === 'error') {
    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
  } else if (type === 'success') {
    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
  } else {
    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
  }
  
  // 设置Alert内容
  alertElement.innerHTML = `
    <div class="flex items-center">
      ${iconSvg}
      <span class="ml-2">${message}</span>
    </div>
  `;
  
  // 添加到容器并附加到文档
  notificationContainer.appendChild(alertElement);
  document.body.appendChild(notificationContainer);
  
  // 强制重排以确保动画效果
  void alertElement.offsetWidth;
  
  // 淡入效果
  setTimeout(() => {
    alertElement.style.opacity = '1';
  }, 10);
  
  // 定时移除通知
  setTimeout(() => {
    alertElement.style.opacity = '0';
    
    setTimeout(() => {
      if (document.body.contains(notificationContainer)) {
        document.body.removeChild(notificationContainer);
      }
    }, 300);
  }, 3000);
};

// 辅助函数：将文本插入到当前活跃的输入框
export const insertTextToActiveElement = (text, isEnd) => {
  try {
    if (!text || text.trim() === '') {
      console.log('文本为空，不需要插入');
      return false;
    }
    
    console.log(`准备插入最终文本: "${text}", 是否句末: ${isEnd}`);
    
    // 获取当前活跃的元素
    let activeElement = document.activeElement;
    console.log(`当前活跃元素: ${activeElement?.tagName || '无'}, ID: ${activeElement?.id || '无'}, 类: ${activeElement?.className || '无'}`);
    
    // 检查活跃元素是否是文本输入框
    if (activeElement && 
        (activeElement.tagName === 'TEXTAREA' || 
         (activeElement.tagName === 'INPUT' && 
          (activeElement.type === 'text' || activeElement.type === 'search')))) {
      
      console.log('找到有效的活跃输入框元素');
      
      // 获取当前选中的文本范围
      const startPos = activeElement.selectionStart || 0;
      const endPos = activeElement.selectionEnd || 0;
      
      // 当前输入框的值
      const currentValue = activeElement.value || '';
      console.log(`当前值长度: ${currentValue.length}, 选中范围: ${startPos}-${endPos}`);
      
      // 如果是句子结束，添加空格
      const newText = isEnd ? text + ' ' : text;
      
      // 构建新的文本值（替换选中的文本或在光标位置插入）
      // 如果有选中文本则替换，否则在光标位置插入
      const newValue = endPos > startPos 
        ? currentValue.substring(0, startPos) + newText + currentValue.substring(endPos)
        : currentValue.substring(0, startPos) + newText + currentValue.substring(startPos);
      
      console.log(`组装新值，长度: ${newValue.length}`);
      
      // 记住原始值用于调试
      const originalValue = activeElement.value;
      
      // 更新输入框的值
      activeElement.value = newValue;
      
      // 打印值是否真的改变
      console.log(`值是否改变: ${originalValue !== activeElement.value}, 新值: "${activeElement.value}"`);
      
      // 更新光标位置
      const newCursorPos = startPos + newText.length;
      activeElement.setSelectionRange(newCursorPos, newCursorPos);
      
      console.log('准备派发事件...');
      
      // 创建并触发input事件（对所有类型的输入框）
      const inputEvent = new Event('input', { bubbles: true, composed: true });
      activeElement.dispatchEvent(inputEvent);
      console.log('已派发input事件');
      
      // 创建并触发change事件
      const changeEvent = new Event('change', { bubbles: true, composed: true });
      activeElement.dispatchEvent(changeEvent);
      console.log('已派发change事件');
      
      // 尝试使用React的合成事件方法更新值
      // 这对于有些React组件是必要的
      if (activeElement._valueTracker) {
        console.log('检测到React的_valueTracker，应用React特定更新');
        activeElement._valueTracker.setValue('');
      }
      
      // 特殊处理ChatView.jsx和InputArea.jsx的输入框
      if (activeElement.classList.contains('aichat-input') || 
          activeElement.closest('.textarea-bordered') || 
          activeElement.id === 'chat-input') {
        
        console.log('特殊处理特定组件的输入框');
        
        // 使用原生DOM属性设置器更新值
        try {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            activeElement.tagName === 'TEXTAREA' ? 
              window.HTMLTextAreaElement.prototype : 
              window.HTMLInputElement.prototype, 
            "value"
          ).set;
          
          // 使用原生setter更新值
          nativeInputValueSetter.call(activeElement, newValue);
          console.log('已使用原生setter更新值');
          
          // 再次触发事件以确保React捕获了变化
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          activeElement.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
          console.error('使用原生setter失败:', e);
        }
      }
      
      // 尝试额外的React绑定更新方法
      if (typeof activeElement.onInput === 'function') {
        console.log('调用元素自身的onInput方法');
        activeElement.onInput({ target: activeElement });
      }
      
      if (typeof activeElement.onChange === 'function') {
        console.log('调用元素自身的onChange方法');
        activeElement.onChange({ target: activeElement });
      }
      
      // 再次验证值是否更新
      console.log(`最终验证 - 值是否正确更新: "${activeElement.value}" === "${newValue}" ? ${activeElement.value === newValue}`);
      
      console.log('文本插入过程完成');
      return true;
    } else {
      // 如果没有活跃的文本输入框，尝试找到一个并聚焦到它
      console.log('未找到活跃的文本输入框，尝试查找页面上的输入框');
      
      // 首先尝试找到常见的输入元素
      const inputs = [
        ...document.querySelectorAll('textarea'), 
        ...document.querySelectorAll('input[type="text"]'),
        ...document.querySelectorAll('.aichat-input'),
        ...document.querySelectorAll('.textarea-bordered'),
        document.getElementById('chat-input')
      ].filter(Boolean); // 过滤掉null和undefined
      
      console.log(`找到${inputs.length}个潜在输入框元素`);
      
      if (inputs.length > 0) {
        // 找到第一个可见的输入框
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const style = window.getComputedStyle(input);
          
          console.log(`检查输入框 #${i}: ${input.tagName}, ID: ${input.id || '无ID'}, display: ${style.display}, visibility: ${style.visibility}`);
          
          if (style.display !== 'none' && style.visibility !== 'hidden' && input.offsetParent !== null) {
            console.log(`找到可见输入框: ${input.tagName}, ID: ${input.id || '无ID'}`);
            
            // 保存当前活跃元素
            const previousActive = document.activeElement;
            
            // 聚焦到这个输入框
            try {
              console.log('尝试聚焦到输入框');
              input.focus();
              // 确保DOM更新完成
              setTimeout(() => {
                // 验证聚焦是否成功
                if (document.activeElement === input) {
                  console.log('聚焦成功，递归调用自己');
                  // 递归调用自己，现在已经有活跃元素了
                  insertTextToActiveElement(text, isEnd);
                } else {
                  console.log(`聚焦失败: 当前活跃元素=${document.activeElement?.tagName || '无'}, 目标=${input.tagName}`);
                }
              }, 50);
              return true;
            } catch (focusError) {
              console.error('聚焦到输入框失败:', focusError);
              // 尝试回到原来的活跃元素
              if (previousActive) {
                previousActive.focus();
              }
            }
          }
        }
        
        console.log('未找到可以聚焦的输入框，尝试强制插入到第一个输入框');
        
        // 如果没有可聚焦的输入框，尝试强制插入到第一个输入框
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          // 只尝试文本框和文本区域
          if (input.tagName === 'TEXTAREA' || (input.tagName === 'INPUT' && input.type === 'text')) {
            console.log(`尝试强制插入到: ${input.tagName}, ID: ${input.id || '无ID'}`);
            
            try {
              // 插入最终文本
              const finalText = text + (isEnd ? ' ' : '');
              const originalValue = input.value || '';
              input.value = finalText;
              
              console.log(`强制插入 - 原值: "${originalValue}", 新值: "${input.value}"`);
              
              // 触发事件以通知React
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              
              // 特殊处理React组件
              if (input._valueTracker) {
                input._valueTracker.setValue('');
                console.log('应用React特定更新到强制插入的输入框');
              }
              
              showNotification(`已强制将文本"${text}"插入到输入框`, 'success');
              return true;
            } catch (err) {
              console.error('强制插入失败:', err);
            }
            
            break;
          }
        }
      }
      
      // 如果没有找到输入框，显示通知
      console.log('未找到可用的输入框，将文本复制到剪贴板');
      
      // 尝试复制到剪贴板
      try {
        navigator.clipboard.writeText(text);
        showNotification(`识别结果已复制到剪贴板: "${text}"`, 'info');
        return false;
      } catch (clipboardError) {
        console.error('复制到剪贴板失败:', clipboardError);
        showNotification(`识别结果: ${text}`, 'info');
        return false;
      }
    }
  } catch (error) {
    console.error('插入文本到活跃元素失败:', error);
    showNotification(`插入文本失败: ${error.message}`, 'error');
    return false;
  }
};

/**
 * 语音识别Hook - 提供语音识别功能和状态
 * @param {Object} options - 配置选项
 * @param {number} options.timeout - 录音超时时间（毫秒）
 * @param {number} options.pollingInterval - 轮询间隔（毫秒）
 * @returns {Object} 语音识别状态和方法
 */
export const useSpeechRecognition = (options = {}) => {
  // 默认配置
  const defaultOptions = {
    apiBaseUrl: '/api',  // API基础URL
    autoStart: false,    // 是否自动开始录音
    timeout: 60000,      // 录音超时时间（毫秒）
    silenceTimeout: 5000, // 静音检测超时时间（毫秒）
    pollingInterval: 1000, // 轮询间隔（毫秒）
  };
  
  // 合并选项
  const { timeout, pollingInterval, silenceTimeout } = { ...defaultOptions, ...options };
  
  // 状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState('');
  const [recordingSessionId, setRecordingSessionId] = useState('');
  
  // 引用（持久化的值）
  const pollingIntervalIdRef = useRef(null);
  const recordingTimeoutIdRef = useRef(null);
  const temporarySentenceRef = useRef('');
  const currentSessionIdRef = useRef('');
  
  // 静音检测计时器
  const silenceTimerRef = useRef(null);
  
  /**
   * 生成唯一的会话ID
   * @returns {string} 会话ID
   */
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };
  
  /**
   * 获取识别结果
   * @param {string} sessionId - 用于获取结果的会话ID
   */
  const fetchTranscriptionResultsWithSessionId = async (sessionId) => {
    if (!sessionId) {
      console.log('获取结果: 没有有效的会话ID，跳过轮询');
      return;
    }
    
    console.log(`获取会话 ${sessionId} 的语音识别结果`);
    
    try {
      console.log(`调用获取结果API: ${API_BASE_URL}/api/speech/results?session_id=${sessionId}`);
      
      // 使用AbortController实现超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      // 调用后端API获取语音识别结果
      const response = await fetch(`${API_BASE_URL}/api/speech/results?session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // 清除超时
      
      // 检查响应状态
      if (!response.ok) {
        console.error(`获取结果API返回错误状态: ${response.status} ${response.statusText}`);
        const text = await response.text(); // 尝试获取响应文本以便调试
        console.error(`响应内容: ${text.substring(0, 150)}...`);
        return;
      }
      
      // 尝试解析JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(`解析JSON响应失败:`, parseError);
        const text = await response.text();
        console.error(`非JSON响应内容: ${text.substring(0, 150)}...`);
        return;
      }
      
      console.log(`会话 ${sessionId} 的识别结果:`, data);
      
      // 检查API返回是否成功
      if (data.status !== 'success') {
        console.warn(`API返回非成功状态:`, data);
        if (data.error) {
          console.error('获取结果时出错:', data.error);
          showNotification(`获取结果失败: ${data.error}`, 'error');
        }
        return;
      }
      
      // 检查是否有结果并且是数组
      if (!data.results || !Array.isArray(data.results)) {
        console.log('未收到有效的识别结果');
        return;
      }
      
      // 处理结果
      if (data.results.length > 0) {
        console.log(`收到 ${data.results.length} 条识别结果`);
        
        // 遍历处理每一个结果
        for (const result of data.results) {
          if (!result) {
            console.warn('结果项为空');
            continue;
          }
          
          console.log('处理结果:', result);
          
          // 如果有文本字段，处理为文本结果
          if (result.text !== undefined) {
            // 创建适合handleTextResult处理的对象
            const textResult = {
              text: result.text,
              is_end: result.is_end || false
            };
            
            // 调用文本处理函数
            handleTextResult(textResult);
          } else if (result.type === 'complete') {
            console.log('语音识别完成信号');
          } else if (result.type === 'error') {
            console.error('语音识别错误:', result.error || '未知错误');
            showNotification(`语音识别错误: ${result.error || '未知错误'}`, 'error');
          } else {
            console.log('收到未知类型的结果:', result);
          }
        }
      }
    } catch (error) {
      console.error('获取语音识别结果失败:', error);
      showNotification(`获取语音识别结果失败: ${error.message}`, 'error');
    }
  };
  
  /**
   * 处理文本类型的结果
   * @param {Object} result - 结果对象
   */
  const handleTextResult = (result) => {
    // 重置静音计时器 - 每次收到结果都说明正在说话
    resetSilenceTimer();
    
    // 检查结果是否包含必要字段
    if (!result.text) {
      console.log('结果缺少文本字段:', result);
      return;
    }
    
    let text = result.text;
    const isEnd = result.is_end || false;
    
    console.log(`处理文本结果: "${text}", 句末: ${isEnd}`);
    
    // 如果是临时结果（非句末），仅存储但不插入
    if (!isEnd) {
      console.log(`临时结果，存储: "${text}"`);
      temporarySentenceRef.current = text;
      
      // 只更新状态，不插入
      setRecordedText(text);
      return;
    }
    
    // 如果是句末，清空临时句子引用
    console.log(`最终结果，清空临时句子`);
    temporarySentenceRef.current = '';
    
    // 更新状态
    setRecordedText(text);
    
    // 尝试插入文本
    const insertSuccess = insertTextToActiveElement(text, isEnd);
    
    // 如果插入失败且文本不为空，显示通知
    if (!insertSuccess && text.trim() !== '') {
      console.log(`插入文本失败，尝试复制到剪贴板: "${text}"`);
      
      try {
        // 尝试复制到剪贴板
        navigator.clipboard.writeText(text).then(() => {
          showNotification(`已复制识别文本: "${text}"`, 'info');
        });
      } catch (e) {
        console.error('复制到剪贴板失败:', e);
        showNotification(`识别结果: ${text}`, 'info');
      }
    }
  };
  
  /**
   * 重置静音计时器
   */
  const resetSilenceTimer = () => {
    // 清除现有计时器
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // 如果正在录音，设置新的静音计时器
    if (isRecording) {
      console.log(`设置${silenceTimeout/1000}秒静音自动停止计时器`);
      silenceTimerRef.current = setTimeout(() => {
        console.log(`检测到${silenceTimeout/1000}秒无语音，自动停止录音`);
        showNotification(`检测到${silenceTimeout/1000}秒无语音，自动停止录音`, 'info');
        stopRecording();
      }, silenceTimeout);
    }
  };
  
  /**
   * 使用轮询机制获取识别结果
   * @param {string} sessionId - 会话ID
   */
  const startPollingResults = (sessionId) => {
    if (!sessionId) {
      console.error('会话ID为空，无法开始轮询');
      return;
    }
    
    console.log(`开始轮询会话ID=${sessionId}的结果...`);
    
    // 先立即获取一次结果
    fetchTranscriptionResultsWithSessionId(sessionId);
    
    // 设置轮询定时器
    pollingIntervalIdRef.current = setInterval(() => {
      if (currentSessionIdRef.current === sessionId) {
        fetchTranscriptionResultsWithSessionId(sessionId);
      } else {
        console.log(`会话ID不匹配，停止轮询: 当前=${currentSessionIdRef.current}, 目标=${sessionId}`);
        clearInterval(pollingIntervalIdRef.current);
        pollingIntervalIdRef.current = null;
      }
    }, pollingInterval);
  };
  
  /**
   * 检查后端服务状态
   * @returns {Promise<boolean>} 服务是否可用
   */
  const checkServerStatus = async () => {
    try {
      console.log(`检查语音识别服务状态: ${API_BASE_URL}/api/speech/test`);
      
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
      
      const response = await fetch(`${API_BASE_URL}/api/speech/test`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      // 清除超时
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`服务器状态检查失败: ${response.status} ${response.statusText}`);
        showNotification('语音识别服务不可用', 'error');
        return false;
      }
      
      // 尝试解析响应
      try {
        const data = await response.json();
        console.log('服务器状态响应:', data);
        
        if (data.status === 'success') {
          showNotification('语音服务器连接成功', 'success');
          return true;
        } else {
          showNotification(`语音服务器响应异常: ${data.message || '未知错误'}`, 'error');
          return false;
        }
      } catch (parseError) {
        console.error('解析服务器状态响应失败:', parseError);
        return false;
      }
    } catch (error) {
      console.error('检查服务器状态失败:', error);
      if (error.name === 'AbortError') {
        showNotification('语音识别服务连接超时', 'error');
      } else {
        showNotification(`语音识别服务不可用: ${error.message}`, 'error');
      }
      return false;
    }
  };
  
  /**
   * 开始录音
   */
  const startRecording = async () => {
    try {
      // 首先检查服务器状态
      const serverAvailable = await checkServerStatus();
      if (!serverAvailable) {
        console.error('语音识别服务不可用，无法开始录音');
        return;
      }
      
      // 生成唯一的会话ID
      const sessionId = generateSessionId();
      console.log(`开始录音，新会话ID=${sessionId}`);
      
      // 更新会话ID引用和状态
      currentSessionIdRef.current = sessionId;
      setRecordingSessionId(sessionId);
      
      // 重置录音文本
      setRecordedText('');
      temporarySentenceRef.current = '';
      
      // 重要：确保状态更新完成后再进行其他操作
      setTimeout(async () => {
        try {
          // 更新录音状态
          setIsRecording(true);
          
          // 通知用户录音已开始
          showNotification('语音识别已开始，请说话...', 'info');
          
          console.log(`调用开始录音API: ${API_BASE_URL}/api/speech/start`);
          
          // 调用后端API开始录音
          const response = await fetch(`${API_BASE_URL}/api/speech/start`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ session_id: sessionId })
          });
          
          // 检查响应状态
          if (!response.ok) {
            console.error(`开始录音API返回错误状态: ${response.status} ${response.statusText}`);
            const text = await response.text(); // 尝试获取响应文本以便调试
            console.error(`响应内容: ${text.substring(0, 150)}...`);
            showNotification(`开始录音失败：服务器返回错误 ${response.status}`, 'error');
            stopRecording();
            return;
          }
          
          // 尝试解析JSON
          let data;
          try {
            data = await response.json();
          } catch (parseError) {
            console.error(`解析JSON响应失败:`, parseError);
            const text = await response.text();
            console.error(`非JSON响应内容: ${text.substring(0, 150)}...`);
            showNotification('开始录音失败：无法解析服务器响应', 'error');
            stopRecording();
            return;
          }
          
          console.log('录音开始响应:', data);
          
          // 检查API返回状态
          if (data.status !== 'success') {
            console.error('开始录音时出错:', data.message || '未知错误');
            showNotification(`开始录音失败: ${data.message || '服务器返回错误'}`, 'error');
            stopRecording();
            return;
          }
          
          // 开始轮询结果
          startPollingResults(sessionId);
          
          // 设置超时定时器
          recordingTimeoutIdRef.current = setTimeout(() => {
            console.log(`录音超时（${timeout}毫秒）`);
            showNotification('录音已超时自动停止', 'info');
            stopRecording();
          }, timeout);
        } catch (error) {
          console.error('开始录音请求失败:', error);
          showNotification(`开始录音请求失败: ${error.message}`, 'error');
          stopRecording();
        }
      }, 0);
    } catch (error) {
      console.error('开始录音时出错:', error);
      showNotification(`开始录音失败: ${error.message}`, 'error');
      stopRecording();
    }
  };
  
  /**
   * 停止录音
   */
  const stopRecording = async () => {
    // 保存当前会话ID
    const sessionId = currentSessionIdRef.current;
    
    console.log(`停止录音，会话ID=${sessionId}`);
    
    // 清除定时器
    if (recordingTimeoutIdRef.current) {
      clearTimeout(recordingTimeoutIdRef.current);
      recordingTimeoutIdRef.current = null;
    }
    
    if (pollingIntervalIdRef.current) {
      clearInterval(pollingIntervalIdRef.current);
      pollingIntervalIdRef.current = null;
    }
    
    // 如果有有效的会话ID，调用后端API停止录音
    if (sessionId) {
      try {
        console.log(`调用停止录音API: ${API_BASE_URL}/api/speech/stop`);
        
        // 调用后端API停止录音
        const response = await fetch(`${API_BASE_URL}/api/speech/stop`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ session_id: sessionId })
        });
        
        // 检查响应状态
        if (!response.ok) {
          console.error(`停止录音API返回错误状态: ${response.status} ${response.statusText}`);
          const text = await response.text(); // 尝试获取响应文本以便调试
          console.error(`响应内容: ${text.substring(0, 150)}...`);
          showNotification(`停止录音失败：服务器返回错误 ${response.status}`, 'error');
          return;
        }
        
        // 尝试解析JSON
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error(`解析JSON响应失败:`, parseError);
          const text = await response.text();
          console.error(`非JSON响应内容: ${text.substring(0, 150)}...`);
          showNotification('停止录音失败：无法解析服务器响应', 'error');
          return;
        }
        
        console.log('录音停止响应:', data);
        
        // 检查API返回状态
        if (data.status !== 'success') {
          console.error('停止录音时出错:', data.message || '未知错误');
          showNotification(`停止录音失败: ${data.message || '服务器返回错误'}`, 'error');
          return;
        }
        
        // 等待最后的结果
        console.log('获取最后的语音识别结果...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 调用获取结果函数一次，以获取最后的结果
        await fetchTranscriptionResultsWithSessionId(sessionId);
        
        // 显示录音已结束通知
        showNotification('语音识别已结束', 'success');
      } catch (error) {
        console.error('停止录音请求失败:', error);
        showNotification(`停止录音请求失败: ${error.message}`, 'error');
      }
    } else {
      console.log('没有有效的会话ID，跳过停止录音API调用');
    }
    
    // 重置状态
    setIsRecording(false);
    currentSessionIdRef.current = '';
  };
  
  /**
   * 处理语音快捷键
   * @param {KeyboardEvent} e - 键盘事件
   */
  const handleVoiceShortcut = (e) => {
    // 检查是否按下Ctrl+Shift+M
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault(); // 阻止默认行为
      
      console.log(`语音快捷键触发，当前录音状态: ${isRecording ? '录音中' : '未录音'}`);
      
      // 切换录音状态
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };
  
  // 添加和移除快捷键监听器
  useEffect(() => {
    console.log('设置语音快捷键监听器');
    document.addEventListener('keydown', handleVoiceShortcut);
    
    // 组件卸载时清理
    return () => {
      console.log('清理语音快捷键监听器和录音资源');
      document.removeEventListener('keydown', handleVoiceShortcut);
      
      // 确保停止录音和清理资源
      if (pollingIntervalIdRef.current) {
        clearInterval(pollingIntervalIdRef.current);
      }
      
      if (recordingTimeoutIdRef.current) {
        clearTimeout(recordingTimeoutIdRef.current);
      }
      
      // 如果组件卸载时仍在录音，停止录音
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);
  
  // 清理函数 - 将在组件卸载时执行
  useEffect(() => {
    return () => {
      console.log('清理语音识别资源');
      if (isRecording) {
        stopRecording(false);
      }
      
      // 清理所有计时器和间隔
      if (pollingIntervalIdRef.current) {
        clearInterval(pollingIntervalIdRef.current);
        pollingIntervalIdRef.current = null;
      }
      
      if (recordingTimeoutIdRef.current) {
        clearTimeout(recordingTimeoutIdRef.current);
        recordingTimeoutIdRef.current = null;
      }
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      setIsRecording(false);
    };
  }, []);
  
  // 返回语音识别状态和方法
  return {
    isRecording,
    recordedText,
    recordingSessionId,
    startRecording,
    stopRecording,
    handleVoiceShortcut
  };
}; 