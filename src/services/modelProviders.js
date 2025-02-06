// OpenAI API 调用实现
export const callOpenAI = async ({ apiKey, apiHost, model, messages }) => {
  try {
    const response = await fetch(`${apiHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '请求失败');
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('OpenAI API 调用失败:', error);
    throw new Error(`OpenAI API 调用失败: ${error.message}`);
  }
};

// Claude API 调用实现
export const callClaude = async ({ apiKey, apiHost, model, messages }) => {
  try {
    const response = await fetch(`${apiHost}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '请求失败');
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: data.usage
    };
  } catch (error) {
    console.error('Claude API 调用失败:', error);
    throw new Error(`Claude API 调用失败: ${error.message}`);
  }
};

// SiliconFlow API 调用实现
export const callSiliconCloud = async ({ apiKey, apiHost, model, messages }) => {
  const maxRetries = 3;  // 最大重试次数
  const baseDelay = 1000;  // 基础延迟时间（毫秒）
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      const response = await fetch(`${apiHost}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Version': '2024-02'
        },
        body: JSON.stringify({
          model,
          messages: messages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          stream: false,
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 0.95,
          stop: null,
          presence_penalty: 0,
          frequency_penalty: 0
        })
      });

      // 处理速率限制错误
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, retryCount);
        
        if (retryCount < maxRetries) {
          console.warn(`触发速率限制，等待 ${waitTime/1000} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        } else {
          throw new Error('已达到速率限制，请稍后再试。如需更高速率限制，请考虑升级您的用量级别。');
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.message || '请求失败');
      }

      const data = await response.json();
      
      // 检查响应格式
      if (!data.choices?.[0]?.message?.content) {
        console.error('API 响应格式错误:', data);
        throw new Error('API 响应格式错误');
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage || {}
      };
    } catch (error) {
      if (error.message.includes('速率限制') && retryCount < maxRetries) {
        retryCount++;
        continue;
      }
      
      console.error('SiliconFlow API 调用失败:', error);
      // 如果是网络错误，提供更友好的错误信息
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('网络连接失败，请检查网络连接或 API 地址是否正确');
      }
      throw new Error(`SiliconFlow API 调用失败: ${error.message}`);
    }
  }
};

// OpenRouter API 调用实现
export const callOpenRouter = async ({ apiKey, apiHost, model, messages }) => {
  try {
    const response = await fetch(`${apiHost}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'GoldieRillChat'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '请求失败');
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('OpenRouter API 调用失败:', error);
    throw new Error(`OpenRouter API 调用失败: ${error.message}`);
  }
};

// DeepSeek API 调用实现
export const callDeepSeek = async ({ apiKey, apiHost, model, messages, onUpdate }) => {
  try {
    const response = await fetch(`${apiHost}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
          ...(msg.reasoning_content ? {} : {})
        })),
        stream: true,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '请求失败');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let reasoning_content = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      // 将新的数据添加到缓冲区
      buffer += decoder.decode(value, { stream: true });
      
      // 查找完整的数据块（使用实际的换行符）
      let chunks = buffer.split('\n');
      
      // 保留最后一个可能不完整的块
      buffer = chunks.pop() || '';
      
      for (const chunk of chunks) {
        // 跳过空行
        if (!chunk.trim()) continue;

        // 处理数据行
        try {
          // 移除 "data: " 前缀（如果存在）
          const jsonStr = chunk.replace(/^data:\s*/, '').trim();
          
          // 跳过特殊标记
          if (jsonStr === '[DONE]') continue;
          
          // 尝试解析 JSON
          const json = JSON.parse(jsonStr);
          
          if (json.choices && json.choices[0] && json.choices[0].delta) {
            const delta = json.choices[0].delta;
            
            // 处理推理内容
            if (delta.reasoning_content !== undefined) {
              reasoning_content += delta.reasoning_content || '';
              onUpdate?.({
                type: 'reasoning',
                content: reasoning_content
              });
            }
            
            // 处理主要内容
            if (delta.content !== undefined) {
              content += delta.content || '';
              onUpdate?.({
                type: 'content',
                content,
                reasoning_content
              });
            }
          }
        } catch (e) {
          // 如果解析失败，记录详细信息以便调试
          console.warn('解析数据块失败:', {
            chunk,
            error: e.message,
            bufferState: buffer
          });
          continue;
        }
      }
    }

    return {
      content,
      reasoning_content,
      usage: {} // 流式响应可能没有 usage 信息
    };
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error);
    throw new Error(`DeepSeek API 调用失败: ${error.message}`);
  }
};

// 统一的 API 调用函数
export const callModelAPI = async ({ provider, apiKey, apiHost, model, messages }) => {
  // 验证必要的参数
  if (!apiKey) {
    throw new Error('请先配置 API 密钥');
  }

  if (!apiHost) {
    throw new Error('请先配置 API 地址');
  }

  if (!model) {
    throw new Error('请先选择模型');
  }

  // 根据提供方调用对应的 API
  switch (provider) {
    case 'openai':
      return callOpenAI({ apiKey, apiHost, model, messages });
    case 'claude':
      return callClaude({ apiKey, apiHost, model, messages });
    case 'siliconflow':
      return callSiliconCloud({ apiKey, apiHost, model, messages });
    case 'openrouter':
      return callOpenRouter({ apiKey, apiHost, model, messages });
    case 'deepseek':
      return callDeepSeek({ apiKey, apiHost, model, messages });
    default:
      throw new Error(`不支持的模型提供方: ${provider}`);
  }
}; 