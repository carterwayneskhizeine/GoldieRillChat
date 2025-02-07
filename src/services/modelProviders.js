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
      if (done) {
        // 发送完成信号
        onUpdate?.({
          type: 'complete',
          content,
          reasoning_content
        });
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n');
      buffer = chunks.pop() || '';
      
      for (const chunk of chunks) {
        if (!chunk.trim() || chunk.includes('keep-alive')) continue;
        
        try {
          const jsonStr = chunk.replace(/^data:\s*/, '').trim();
          if (jsonStr === '[DONE]') continue;
          
          // 尝试解析 JSON，如果失败则跳过这个块
          let json;
          try {
            json = JSON.parse(jsonStr);
          } catch (e) {
            console.warn('跳过无效的 JSON 数据块:', jsonStr);
            continue;
          }
          
          if (json.choices && json.choices[0] && json.choices[0].delta) {
            const delta = json.choices[0].delta;
            
            if (delta.reasoning_content !== undefined) {
              reasoning_content += delta.reasoning_content || '';
              onUpdate?.({
                type: 'reasoning',
                content: reasoning_content
              });
            }
            
            if (delta.content !== undefined) {
              content += delta.content || '';
              // 不要在这里发送content更新
            }
          }
        } catch (e) {
          console.warn('解析数据块失败:', e, '数据块:', chunk);
          continue;
        }
      }
    }

    return {
      content,
      reasoning_content,
      usage: {}
    };
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error);
    throw new Error(`DeepSeek API 调用失败: ${error.message}`);
  }
};

// OpenRouter API 调用实现
export const callOpenRouter = async ({ apiKey, apiHost, model, messages, onUpdate }) => {
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
        stream: true,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || '请求失败';
      } catch (e) {
        errorMessage = `请求失败 (${response.status}): ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    // 发送初始状态
    onUpdate?.({
      type: 'reasoning',
      content: '',
      reasoning_content: '思考中...'
    });

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        // 发送完成信号，但不设置为完成状态
        onUpdate?.({
          type: 'content',
          content: content,
          reasoning_content: null,
          done: true
        });
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        if (!chunk.trim() || chunk.includes('OPENROUTER PROCESSING')) continue;

        try {
          const jsonStr = chunk.replace(/^data:\s*/, '').trim();
          if (jsonStr === '[DONE]') continue;

          const json = JSON.parse(jsonStr);
          if (json.choices && json.choices[0] && json.choices[0].delta) {
            const delta = json.choices[0].delta;
            if (delta.content) {
              content += delta.content;
              
              // 发送实时更新
              onUpdate?.({
                type: 'content',
                content: content,
                reasoning_content: null,
                done: false
              });
            }
          }
        } catch (e) {
          console.warn('解析数据块失败:', e, '数据块:', chunk);
          continue;
        }
      }
    }

    return {
      content: content,
      usage: {
        total_tokens: Math.ceil(content.length / 4)  // 简单估算token数
      }
    };
  } catch (error) {
    console.error('OpenRouter API 调用失败:', error);
    throw new Error(`OpenRouter API 调用失败: ${error.message}`);
  }
};

// 统一的 API 调用函数
export const callModelAPI = async ({ provider, apiKey, apiHost, model, messages, onUpdate }) => {
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
      return callOpenRouter({ apiKey, apiHost, model, messages, onUpdate });
    case 'deepseek':
      return callDeepSeek({ apiKey, apiHost, model, messages, onUpdate });
    default:
      throw new Error(`不支持的模型提供方: ${provider}`);
  }
}; 