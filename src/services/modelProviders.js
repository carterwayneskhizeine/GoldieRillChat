// OpenAI API 调用实现
export const callOpenAI = async ({ apiKey, apiHost, model, messages, maxTokens = 2000, temperature = 0.7 }) => {
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
        stream: false,
        max_tokens: maxTokens,
        temperature: temperature
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
export const callClaude = async ({ apiKey, apiHost, model, messages, maxTokens = 2000, temperature = 0.7 }) => {
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
        max_tokens: maxTokens,
        temperature: temperature
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
export const callSiliconCloud = async ({ apiKey, apiHost, model, messages, onUpdate, maxTokens = 2000, temperature = 0.7, signal }) => {
  const maxRetries = 3;  // 最大重试次数
  const baseDelay = 1000;  // 基础延迟时间（毫秒）
  let retryCount = 0;

  // 添加调试日志
  console.log('callSiliconCloud 被调用，使用的 API 主机地址:', apiHost);
  
  // 确保 apiHost 是 SiliconFlow 的 API 地址
  if (!apiHost || !apiHost.includes('siliconflow.cn')) {
    console.warn('强制使用默认的 SiliconFlow API 地址，原地址:', apiHost);
    apiHost = 'https://api.siliconflow.cn'; // 强制使用 SiliconFlow 默认地址
  }

  // 检查是否是 DeepSeek-R1 系列模型
  const isDeepseekR1Model = model.toLowerCase().includes('deepseek-r1') || 
                           model.toLowerCase().includes('deepseek-ai/deepseek-r1');
  console.log('是否为 DeepSeek-R1 模型:', isDeepseekR1Model);

  while (retryCount <= maxRetries) {
    try {
      // 发送初始状态
      onUpdate?.({
        type: 'assistant',
        content: '',
        reasoning_content: '',
        done: false,
        generating: true
      });

      // 再次确认实际使用的 API 地址
      console.log('实际发送请求到的 API 地址:', `${apiHost}/v1/chat/completions`);
      
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
            role: msg.role || (msg.type === 'user' ? 'user' : 'assistant'),
            content: msg.content
          })),
          stream: true,  // 启用流式输出
          temperature: temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          stop: null,
          presence_penalty: 0,
          frequency_penalty: 0
        }),
        signal
      });

      // 处理错误响应
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = `请求失败 (${response.status})`;
        
        if (errorData) {
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        }

        // 特殊错误处理
        if (response.status === 400) {
          errorMessage = `请求参数错误: ${errorMessage}`;
        } else if (response.status === 401) {
          errorMessage = 'API 密钥无效或已过期，请检查设置';
        } else if (response.status === 429) {
          errorMessage = '已达到速率限制，请稍后再试';
        } else if (response.status === 500) {
          errorMessage = '服务器内部错误，请稍后重试';
        }

        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      let reasoning_content = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // 发送完成信号，包含所有内容
          onUpdate?.({
            type: 'assistant',
            content: content,
            reasoning_content: reasoning_content,
            done: true,
            generating: false
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
            
            const json = JSON.parse(jsonStr);
            console.log('收到的数据块:', json);
            
            if (json.choices && json.choices[0] && json.choices[0].delta) {
              const delta = json.choices[0].delta;
              console.log('Delta 对象:', delta); // 添加调试日志
              let contentUpdated = false;
              
              // 处理推理内容（逐字符打印，不设置 contentUpdated 标志以免被后续调用覆盖）
              if (delta.reasoning_content !== undefined) {
                const newReasoning = delta.reasoning_content || '';
                for (let i = 0; i < newReasoning.length; i++) {
                  reasoning_content += newReasoning[i];
                  onUpdate?.({
                    type: 'reasoning',
                    content: reasoning_content
                  });
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              }
              
              // 处理普通内容
              if (delta.content !== undefined) {
                const newContent = delta.content || '';
                for (let i = 0; i < newContent.length; i++) {
                  content += newContent[i];
                  onUpdate?.({
                    type: 'assistant',
                    content: content,
                    reasoning_content: reasoning_content,
                    done: false,
                    generating: true
                  });
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
                contentUpdated = true;
              }

              // 只在普通内容有更新时，再发送一次完整更新
              if (contentUpdated) {
                onUpdate?.({
                  type: 'assistant',
                  content: content,
                  reasoning_content: reasoning_content,
                  done: false,
                  generating: true
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
        reasoning_content: reasoning_content,
        type: 'assistant',
        generating: false,
        usage: {
          total_tokens: Math.ceil((content.length + reasoning_content.length) / 4)
        }
      };
    } catch (error) {
      if (error.message.includes('速率限制') && retryCount < maxRetries) {
        retryCount++;
        const waitTime = baseDelay * Math.pow(2, retryCount);
        console.log(`触发速率限制，等待 ${waitTime/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      console.error('SiliconFlow API 调用失败:', error);
      // 如果是网络错误，提供更友好的错误信息
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        const errorMessage = '网络连接失败，请检查网络连接或 API 地址是否正确';
        toastManager.error(errorMessage, { duration: 3000 }); // 3秒后自动消失
        throw new Error(errorMessage);
      }
      throw error;
    }
  }
};

// DeepSeek API 调用实现
export const callDeepSeek = async ({ apiKey, apiHost, model, messages, onUpdate, maxTokens = 2000, temperature = 0.7, signal }) => {
  try {
    // 发送初始状态，显示 "Thinking..." 动画
    onUpdate?.({
      type: 'assistant',
      content: '',
      reasoning_content: '',
      done: false,
      generating: true
    });
    
    // 检查是否是 reasoner 模型
    const isReasonerModel = model === 'deepseek-reasoner';
    
    // 确保消息列表中有 system 消息
    let processedMessages = [...messages];
    if (!processedMessages.some(msg => msg.role === 'system' || msg.type === 'system')) {
      processedMessages.unshift({
        role: 'system',
        content: 'You are a helpful assistant.'
      });
    }
    
    // 构建请求体
    const requestBody = {
      model,
      messages: processedMessages.map(msg => ({
        role: msg.role || (msg.type === 'user' ? 'user' : 'assistant'),
        content: msg.content,
        ...(msg.reasoning_content ? {} : {}),
        // 如果是 reasoner 模型且最后一条消息是 assistant，添加 prefix 参数
        ...(isReasonerModel && msg === processedMessages[processedMessages.length - 1] && 
            (msg.type === 'assistant' || msg.role === 'assistant') ? { prefix: true } : {})
      })),
      stream: true,
      temperature: temperature,
      max_tokens: maxTokens
    };
    
    // 使用标准端点，不添加 /beta 或 /v1
    const endpoint = `${apiHost}/chat/completions`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: signal // 添加 signal 参数，用于中止请求
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = `DeepSeek API 错误: ${errorJson.error?.message || errorJson.message || '未知错误'}\n`;
        if (errorJson.error?.code) {
          errorMessage += `错误代码: ${errorJson.error.code}\n`;
        }
        if (errorJson.error?.type) {
          errorMessage += `错误类型: ${errorJson.error.type}`;
        }
        if (response.status === 402) {
          errorMessage = 'DeepSeek API 余额不足，请充值后再试。';
        }
      } catch (e) {
        errorMessage = `请求失败 (${response.status}): ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let reasoning_content = '';
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // 发送完成信号
          onUpdate?.({
            type: 'assistant',
            content,
            reasoning_content,
            done: true,
            generating: false
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
                const newReasoning = delta.reasoning_content || '';
                for (let i = 0; i < newReasoning.length; i++) {
                  reasoning_content += newReasoning[i];
                  onUpdate?.({
                    type: 'reasoning',
                    content: reasoning_content
                  });
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              }
              
              if (delta.content !== undefined) {
                const newContent = delta.content || '';
                for (let i = 0; i < newContent.length; i++) {
                  content += newContent[i];
                  onUpdate?.({
                    type: 'assistant',
                    content: content,
                    reasoning_content: reasoning_content,
                    done: false,
                    generating: true
                  });
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
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
      // 如果是中止错误，抛出 AbortError
      if (error.name === 'AbortError') {
        throw error;
      }
      throw new Error(`DeepSeek API 调用失败: ${error.message}`);
    }
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error);
    throw new Error(`DeepSeek API 调用失败: ${error.message}`);
  }
};

// OpenRouter API 调用实现
export const callOpenRouter = async ({ apiKey, apiHost, model, messages, onUpdate, maxTokens = 2000, temperature = 0.7 }) => {
  try {
    // 检查是否是 deepseek 系列模型
    const isDeepseekModel = model.toLowerCase().includes('deepseek');
    console.log('是否为 Deepseek 模型:', isDeepseekModel); // 添加日志

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
        temperature: temperature,
        max_tokens: maxTokens,
        include_reasoning: isDeepseekModel  // 对 Deepseek 模型启用推理
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = `(OpenRouter) ${errorJson.error?.message || errorJson.message || '请求失败'}\n`;
        if (errorJson.error?.code) {
          errorMessage += `错误代码: ${errorJson.error.code}\n`;
        }
        if (errorJson.error?.type) {
          errorMessage += `错误类型: ${errorJson.error.type}`;
        }
      } catch (e) {
        errorMessage = `请求失败 (${response.status}): ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let reasoning_content = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        // 发送最终完成信号
        onUpdate?.({
          type: 'assistant',
          content: content,
          reasoning_content: reasoning_content,
          done: true,
          generating: false
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
          console.log('收到的数据块:', json); // 添加日志
          
          if (json.choices && json.choices[0]) {
            const delta = json.choices[0].delta;
            
            // 处理推理过程 - 检查 reasoning 字段
            if (delta.reasoning !== undefined) {
              reasoning_content += delta.reasoning || '';
              console.log('收到推理内容:', delta.reasoning);
              console.log('当前推理内容:', reasoning_content);
              onUpdate?.({
                type: 'reasoning',
                content: reasoning_content
              });
            }
            
            // 处理普通内容
            if (delta.content) {
              content += delta.content;
              onUpdate?.({
                type: 'content',
                content: content,
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
      reasoning_content: reasoning_content,
      usage: {
        total_tokens: Math.ceil((content.length + reasoning_content.length) / 4)
      }
    };
  } catch (error) {
    console.error('OpenRouter API 调用失败:', error);
    throw new Error(`OpenRouter API 调用失败: ${error.message}`);
  }
};

// StepFun API 调用实现
export const callStepFun = async ({ apiKey, apiHost, model, messages, maxTokens = 2000, temperature = 0.7, onUpdate, signal }) => {
  try {
    // 发送初始状态
    onUpdate?.({
      type: 'assistant',
      content: '',
      done: false,
      generating: true
    });

    // 构建消息数组，确保角色格式正确
    const formattedMessages = messages.map(msg => ({
      role: msg.role || (msg.type === 'user' ? 'user' : 'assistant'),
      content: msg.content || ''
    }));

    // 如果第一条消息不是 system，添加默认的 system 消息
    if (formattedMessages.length > 0 && formattedMessages[0].role !== 'system') {
      formattedMessages.unshift({
        role: 'system',
        content: '你是阶跃星辰大模型助手'
      });
    }

    // 移除可能重复的 v1 路径
    const baseUrl = apiHost.endsWith('/v1') ? apiHost : `${apiHost}/v1`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.95
      }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      let errorMessage = `请求失败 (${response.status})`;
      
      if (errorData) {
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }

      throw new Error(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        onUpdate?.({
          type: 'assistant',
          content: content,
          done: true,
          generating: false
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
          
          const json = JSON.parse(jsonStr);
          
          if (json.choices && json.choices[0]) {
            const delta = json.choices[0].delta;
            
            if (delta.content !== undefined) {
              const newContent = delta.content || '';
              for (let i = 0; i < newContent.length; i++) {
                content += newContent[i];
                onUpdate?.({
                  type: 'assistant',
                  content: content,
                  reasoning_content: reasoning_content,
                  done: false,
                  generating: true
                });
                await new Promise(resolve => setTimeout(resolve, 50));
              }
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
      type: 'assistant',
      generating: false,
      usage: {
        total_tokens: Math.ceil(content.length / 4)
      }
    };
  } catch (error) {
    console.error('StepFun API 调用失败:', error);
    throw error;
  }
};

// 统一的 API 调用函数
export const callModelAPI = async ({
  provider,
  apiKey,
  apiHost,
  model,
  messages,
  maxTokens,
  temperature,
  onUpdate,
  signal
}) => {
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
      return callOpenAI({ apiKey, apiHost, model, messages, maxTokens, temperature });
    case 'claude':
      return callClaude({ apiKey, apiHost, model, messages, maxTokens, temperature });
    case 'siliconflow':
      return await callSiliconCloud({
        apiKey,
        apiHost,
        model,
        messages,
        maxTokens,
        temperature,
        onUpdate,
        signal
      });
    case 'openrouter':
      return callOpenRouter({ apiKey, apiHost, model, messages, onUpdate, maxTokens, temperature });
    case 'deepseek':
      return callDeepSeek({ apiKey, apiHost, model, messages, onUpdate, maxTokens, temperature, signal });
    case 'stepfun':
      return callStepFun({ apiKey, apiHost, model, messages, maxTokens, temperature, onUpdate, signal });
    default:
      throw new Error(`不支持的模型提供方: ${provider}`);
  }
};

/**
 * 调用SiliconFlow的重排序API
 * @param {string} apiKey - API密钥
 * @param {string} apiHost - API主机地址
 * @param {string} query - 查询文本
 * @param {Array<string>} documents - 要重排序的文档内容数组
 * @param {number} topK - 返回的最相关文档数量
 * @returns {Promise<Object>} 重排序结果
 */
export const callSiliconFlowRerank = async ({ apiKey, apiHost, query, documents, topK = 5 }) => {
  try {
    // 固定使用BAAI/bge-reranker-v2-m3模型
    const model = 'BAAI/bge-reranker-v2-m3';
    
    console.log(`执行重排序，使用模型: ${model}, 查询: ${query}, 文档数量: ${documents.length}`);
    
    // 确保API主机地址正确
    if (!apiHost || !apiHost.includes('siliconflow.cn')) {
      console.warn('重排序API: 强制使用默认的SiliconFlow API地址，原地址:', apiHost);
      apiHost = 'https://api.siliconflow.cn';
    }

    console.log(`重排序API请求: ${apiHost}/v1/rerank, 使用API密钥: ${apiKey ? '已配置' : '未配置'}`);
    
    const response = await fetch(`${apiHost}/v1/rerank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Version': '2024-02' // 添加API版本头，与嵌入API保持一致
      },
      body: JSON.stringify({
        model,
        query,
        documents,
        topK,
        return_documents: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || `重排序请求失败 (${response.status})`;
        
        // 特殊错误处理
        if (response.status === 401) {
          errorMessage = 'API密钥无效或没有重排序权限，请确认您的密钥支持该模型';
          console.error('重排序API返回401错误，可能是密钥无效或没有权限');
        }
      } catch (e) {
        errorMessage = `重排序请求失败 (${response.status}): ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log(`重排序成功，结果数量: ${result.results?.length || 0}`);
    return result;
  } catch (error) {
    console.error('重排序API调用失败:', error);
    throw new Error(`重排序API调用失败: ${error.message}`);
  }
}; 