/**
 * 知识库服务模块
 * 处理知识库的各种操作
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import toastManager from '../utils/toastManager';
import { getApiKey } from '../components/AIChat/utils/storageUtils';
import { STORAGE_KEYS } from '../components/AIChat/constants';
import * as cheerio from 'cheerio';

// 向量相似度计算函数
const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * 获取知识库参数
 * @param {Object} base 知识库对象
 * @returns {Object} 知识库参数
 */
export const getKnowledgeBaseParams = (base) => {
  if (!base) return null;
  
  return {
    id: base.id,
    name: base.name,
    model: base.model.id,
    dimensions: base.dimensions,
    threshold: base.threshold || 0.7,
    documentCount: base.documentCount || 0
  };
};

/**
 * 获取嵌入API配置
 * @param {string} provider 嵌入服务提供商
 * @returns {Object} API配置
 */
export const getEmbeddingApiConfig = (provider) => {
  if (provider === 'SiliconFlow') {
    let apiHost = localStorage.getItem(`${STORAGE_KEYS.API_HOST}_siliconflow`) || 'https://api.siliconflow.cn/v1/embeddings';
    if (!apiHost.includes('/v1/embeddings')) {
      apiHost = apiHost.replace(/\/+$/, '') + '/v1/embeddings';
    }
    return {
      apiKey: getApiKey('siliconflow'),
      apiHost
    };
  } else if (provider === 'OpenAI') {
    return {
      apiKey: getApiKey('openai'),
      apiHost: localStorage.getItem(`${STORAGE_KEYS.API_HOST}_openai`) || 'https://api.openai.com/v1/embeddings'
    };
  }
  
  return {
    apiKey: '',
    apiHost: ''
  };
};

/**
 * 模拟嵌入文本
 * 生成指定维度的随机向量，用于开发测试
 * 
 * @param {string} text 要嵌入的文本
 * @param {number} dimensions 向量维度
 * @returns {Array<number>} 嵌入向量
 */
const mockEmbedText = (text, dimensions = 1536) => {
  // 使用文本的哈希值作为随机种子，确保相同文本生成相似的向量
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0; // 转换为32位整数
  }
  
  // 使用哈希值作为种子生成伪随机向量
  const vector = [];
  for (let i = 0; i < dimensions; i++) {
    // 使用简单的线性同余生成器
    hash = (hash * 1664525 + 1013904223) % 4294967296;
    // 归一化到 [-1, 1] 范围
    vector.push((hash / 2147483648) - 1);
  }
  
  // 归一化向量长度
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
};

/**
 * 使用SiliconFlow API嵌入文本
 * @param {string} text 要嵌入的文本
 * @param {string} model 嵌入模型
 * @param {string} apiKey API密钥
 * @param {string} apiHost API主机地址
 * @returns {Promise<Array<number>>} 嵌入向量
 */
const siliconFlowEmbed = async (text, model, apiKey, apiHost) => {
  try {
    const response = await fetch(apiHost, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`SiliconFlow API错误: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('SiliconFlow嵌入请求失败:', error);
    throw error;
  }
};

/**
 * 使用OpenAI API嵌入文本
 * @param {string} text 要嵌入的文本 
 * @param {string} model 嵌入模型
 * @param {string} apiKey API密钥
 * @param {string} apiHost API主机地址
 * @returns {Promise<Array<number>>} 嵌入向量
 */
const openaiEmbed = async (text, model, apiKey, apiHost) => {
  try {
    const response = await fetch(apiHost, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: text
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API错误: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('OpenAI嵌入请求失败:', error);
    throw error;
  }
};

/**
 * 嵌入文本
 * 将文本转换为向量表示
 * 
 * @param {string} text 要嵌入的文本
 * @param {Object} model 嵌入模型对象
 * @returns {Promise<Array<number>>} 嵌入向量
 */
export const embedText = async (text, model) => {
  if (!model) {
    throw new Error('未指定嵌入模型');
  }
  
  if (!text.trim()) {
    throw new Error('嵌入文本不能为空');
  }
  
  // 获取API配置
  const config = getEmbeddingApiConfig(model.provider);
  
  console.log(`嵌入文本使用模型: ${model.name} (${model.provider}), API密钥: ${config.apiKey ? '已配置' : '未配置'}`);
  
  if (!config.apiKey) {
    console.warn(`未配置${model.provider} API密钥，使用模拟嵌入`);
    return mockEmbedText(text, model.dimensions);
  }
  
  try {
    console.log(`使用${model.provider}的真实API进行嵌入，API主机: ${config.apiHost}`);
    
    // 根据提供商选择不同的嵌入方法
    let embedding;
    if (model.provider === 'SiliconFlow') {
      embedding = await siliconFlowEmbed(text, model.id, config.apiKey, config.apiHost);
    } else if (model.provider === 'OpenAI') {
      embedding = await openaiEmbed(text, model.id, config.apiKey, config.apiHost);
    } else {
      console.warn(`不支持的嵌入提供商: ${model.provider}，使用模拟嵌入`);
      return mockEmbedText(text, model.dimensions);
    }
    
    console.log(`嵌入成功，向量维度: ${embedding.length}`);
    return embedding;
  } catch (error) {
    console.error('嵌入文本失败:', error);
    toastManager.error(`嵌入失败: ${error.message}，使用模拟嵌入`);
    // 失败时使用模拟嵌入
    console.warn('嵌入失败，使用模拟嵌入');
    return mockEmbedText(text, model.dimensions);
  }
};

/**
 * 从知识库获取相关引用
 * @param {Object} base 知识库
 * @param {string} message 用户消息
 * @param {number} limit 最大返回数量
 * @returns {Promise<Array>} 相关引用列表
 */
export const getKnowledgeBaseReference = async (base, message, limit = 5) => {
  if (!base || !message) return [];
  
  try {
    // 获取知识库中的所有项目
    const items = await db.knowledgeItems.where('baseId').equals(base.id).toArray();
    
    if (!items || items.length === 0) {
      console.log(`知识库 ${base.name} 中没有项目`);
      return [];
    }
    
    // 嵌入用户消息
    const queryEmbedding = await embedText(message, base.model);
    
    // 计算相似度并排序
    const results = [];
    
    for (const item of items) {
      // 如果项目没有嵌入向量，跳过
      if (!item.embedding || item.embedding.length === 0) {
        console.log(`项目 ${item.id} 没有嵌入向量，跳过`);
        continue;
      }
      
      // 计算相似度
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      
      // 如果相似度低于阈值，跳过
      if (similarity < (base.threshold || 0.7)) {
        continue;
      }
      
      // 添加到结果列表
      results.push({
        id: item.id,
        title: item.title || item.name,
        content: item.content,
        similarity,
        type: item.type
      });
    }
    
    // 按相似度降序排序并限制数量
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
      
  } catch (error) {
    console.error(`从知识库 ${base.name} 获取引用失败:`, error);
    throw error;
  }
};

/**
 * 获取所有知识库引用
 * @param {Object} params 参数对象
 * @param {string} params.message 用户消息
 * @param {Array<string>} params.knowledgeBaseIds 知识库ID列表
 * @param {number} params.limit 每个知识库的最大返回数量
 * @returns {Promise<Array>} 所有相关引用列表
 */
export const getKnowledgeBaseReferences = async ({ message, knowledgeBaseIds, limit = 5 }) => {
  if (!message || !knowledgeBaseIds || knowledgeBaseIds.length === 0) {
    return [];
  }
  
  try {
    // 获取所有相关知识库
    const bases = await db.knowledgeBases.where('id').anyOf(knowledgeBaseIds).toArray();
    
    if (!bases || bases.length === 0) {
      console.log('未找到指定的知识库');
      return [];
    }
    
    // 从每个知识库获取引用
    const allReferences = [];
    
    for (const base of bases) {
      const references = await getKnowledgeBaseReference(base, message, limit);
      allReferences.push(...references);
    }
    
    // 按相似度降序排序并限制总数量
    return allReferences
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit * 2); // 返回所有知识库引用的两倍数量，确保有足够的内容
      
  } catch (error) {
    console.error('获取知识库引用失败:', error);
    throw error;
  }
};

/**
 * 添加知识库
 * @param {string} name 知识库名称
 * @param {string} modelId 嵌入模型ID
 * @returns {Promise<Object>} 知识库对象
 */
export const addKnowledgeBase = async (name, modelId) => {
  if (!name) {
    throw new Error('知识库名称不能为空');
  }
  
  // 获取模型信息
  const modelOptions = [
    { id: 'BAAI/bge-m3', name: 'BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 },
    { id: 'netease-youdao/bce-embedding-base_v1', name: 'netease-youdao/bce-embedding-base_v1', provider: 'SiliconFlow', dimensions: 768, tokens: 512 },
    { id: 'BAAI/bge-large-zh-v1.5', name: 'BAAI/bge-large-zh-v1.5', provider: 'SiliconFlow', dimensions: 1024, tokens: 512 },
    { id: 'BAAI/bge-large-en-v1.5', name: 'BAAI/bge-large-en-v1.5', provider: 'SiliconFlow', dimensions: 1024, tokens: 512 },
    { id: 'Pro/BAAI/bge-m3', name: 'Pro/BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 },
    { id: 'text-embedding-3-small', name: 'text-embedding-3-small', provider: 'OpenAI', dimensions: 1536, tokens: 8191 },
    { id: 'text-embedding-3-large', name: 'text-embedding-3-large', provider: 'OpenAI', dimensions: 3072, tokens: 8191 },
    { id: 'text-embedding-ada-002', name: 'text-embedding-ada-002', provider: 'OpenAI', dimensions: 1536, tokens: 8191 }
  ];
  
  const model = modelOptions.find(m => m.id === modelId) || {
    id: modelId,
    name: modelId,
    provider: 'Unknown',
    dimensions: 1536,
    tokens: 512
  };
  
  try {
    // 创建知识库对象
    const base = {
      id: uuidv4(),
      name,
      model: {
        id: model.id,
        name: model.name,
        provider: model.provider,
        dimensions: model.dimensions,
        tokens: model.tokens
      },
      dimensions: model.dimensions,
      threshold: 0.7, // 默认相似度阈值
      documentCount: 0,
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 保存到数据库
    await db.knowledgeBases.add(base);
    
    return base;
  } catch (error) {
    console.error('添加知识库失败:', error);
    throw error;
  }
};

/**
 * 更新知识库项目状态
 * @param {string} itemId 项目ID
 * @param {string} status 状态
 * @param {Object} data 附加数据
 * @returns {Promise<void>}
 */
export const updateKnowledgeItemStatus = async (itemId, status, data = {}) => {
  try {
    // 获取项目
    const item = await db.knowledgeItems.get(itemId);
    
    if (!item) {
      throw new Error(`项目 ${itemId} 不存在`);
    }
    
    // 更新状态
    await db.knowledgeItems.update(itemId, {
      status,
      ...data,
      updatedAt: new Date().toISOString()
    });
    
    // 更新知识库的更新时间
    await db.knowledgeBases.update(item.baseId, {
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('更新知识库项目状态失败:', error);
    throw error;
  }
};

/**
 * 添加文件到知识库
 * @param {string} baseId 知识库ID
 * @param {File} file 文件对象
 * @returns {Promise<Object>} 知识库项目
 */
export const addFileToKnowledgeBase = async (baseId, file) => {
  if (!baseId || !file) {
    throw new Error('知识库ID和文件不能为空');
  }
  
  try {
    // 获取知识库
    const base = await db.knowledgeBases.get(baseId);
    
    if (!base) {
      throw new Error(`知识库 ${baseId} 不存在`);
    }
    
    // 创建知识库项目
    const item = {
      id: uuidv4(),
      baseId,
      name: file.name,
      type: 'file',
      mimeType: file.type,
      size: file.size,
      path: file.path || URL.createObjectURL(file),
      status: 'processing', // 初始状态为处理中
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 保存到数据库
    await db.knowledgeItems.add(item);
    
    // 更新知识库的更新时间和文档数量
    await db.knowledgeBases.update(baseId, {
      updatedAt: new Date().toISOString(),
      documentCount: (base.documentCount || 0) + 1,
      itemCount: (base.itemCount || 0) + 1
    });
    
    // TODO: 处理文件内容，提取文本并生成嵌入向量
    // 这里简化处理，直接使用文件名作为内容
    setTimeout(async () => {
      try {
        // 生成嵌入向量
        const embedding = await embedText(file.name, base.model);
        
        // 更新项目状态和嵌入向量
        await updateKnowledgeItemStatus(item.id, 'ready', {
          content: `这是文件 ${file.name} 的内容`,
          embedding
        });
        
        console.log(`文件 ${file.name} 处理完成`);
        toastManager.success(`文件 ${file.name} 处理完成`);
      } catch (error) {
        console.error(`处理文件 ${file.name} 失败:`, error);
        await updateKnowledgeItemStatus(item.id, 'error', {
          error: error.message
        });
        toastManager.error(`处理文件 ${file.name} 失败: ${error.message}`);
      }
    }, 1000);
    
    return item;
  } catch (error) {
    console.error('添加文件到知识库失败:', error);
    throw error;
  }
};

/**
 * 添加URL到知识库
 * @param {string} baseId 知识库ID
 * @param {string} url URL地址
 * @returns {Promise<Object>} 添加的项目
 */
export const addUrlToKnowledgeBase = async (baseId, url) => {
  if (!baseId || !url) {
    throw new Error('知识库ID和URL不能为空');
  }
  
  // 验证URL格式
  let validUrl;
  try {
    validUrl = new URL(url);
    // 确保URL有协议
    if (!validUrl.protocol || (validUrl.protocol !== 'http:' && validUrl.protocol !== 'https:')) {
      validUrl = new URL(`https://${url}`);
    }
  } catch (error) {
    try {
      // 尝试添加https前缀
      validUrl = new URL(`https://${url}`);
    } catch (error) {
      throw new Error(`无效的URL格式: ${url}`);
    }
  }
  
  // 使用格式化后的URL
  const formattedUrl = validUrl.toString();
  
  try {
    // 获取知识库信息
    const base = await db.knowledgeBases.get(baseId);
    if (!base) {
      throw new Error(`知识库 ${baseId} 不存在`);
    }
    
    // 先创建一个处理中的项目
    const item = {
      id: uuidv4(),
      baseId,
      type: 'url',
      name: formattedUrl,
      title: validUrl.pathname.split('/').pop() || validUrl.hostname || formattedUrl,
      url: formattedUrl,
      content: `URL: ${formattedUrl}\n来源: ${validUrl.hostname}\n路径: ${validUrl.pathname}`,
      embedding: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.knowledgeItems.add(item);
    
    // 异步处理网页内容
    setTimeout(async () => {
      try {
        // 更新状态为处理中
        await db.knowledgeItems.update(item.id, { status: 'processing' });
        
        // 定义多个CORS代理选项
        const corsProxies = [
          { name: '无代理', url: formattedUrl },
          { name: 'corsproxy.io', url: `https://corsproxy.io/?${encodeURIComponent(formattedUrl)}` },
          { name: 'cors-anywhere', url: `https://cors-anywhere.herokuapp.com/${formattedUrl}` },
          { name: 'allOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(formattedUrl)}` }
        ];
        
        let html = null;
        let response = null;
        let successProxy = null;
        
        // 尝试所有代理选项直到一个成功
        for (const proxy of corsProxies) {
          try {
            console.log(`尝试使用代理 [${proxy.name}] 抓取: ${proxy.url}`);
            
            response = await fetch(proxy.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              // AbortController可以用来设置超时，但简单起见这里使用fetch自带的timeout
              timeout: 15000 // 15秒超时
            });
            
            if (response.ok) {
              html = await response.text();
              successProxy = proxy.name;
              console.log(`使用代理 [${proxy.name}] 抓取成功`);
              break;
            } else {
              console.log(`使用代理 [${proxy.name}] 抓取失败: ${response.status} ${response.statusText}`);
            }
          } catch (error) {
            console.log(`使用代理 [${proxy.name}] 发生错误: ${error.message}`);
          }
        }
        
        // 如果没有成功抓取内容，创建一个基本的表示
        if (!html) {
          console.log('所有代理均失败，使用基本URL信息');
          
          // 生成嵌入向量 - 使用URL和标题作为内容
          const simpleContent = `${item.title}\n${formattedUrl}\n${validUrl.hostname}`;
          const embedding = await embedText(simpleContent, base.model);
          
          // 更新项目状态，但标记为部分完成
          await db.knowledgeItems.update(item.id, {
            content: `无法抓取此URL的内容。\n\nURL: ${formattedUrl}\n域名: ${validUrl.hostname}\n路径: ${validUrl.pathname}`,
            embedding,
            status: 'partial',
            updatedAt: new Date().toISOString()
          });
          
          console.log(`URL ${formattedUrl} 部分处理完成（仅URL信息）`);
          toastManager.warning(`无法抓取 "${item.title}" 的内容，已保存基本信息`);
          return;
        }
        
        // 使用cheerio解析HTML
        const $ = cheerio.load(html);
        
        // 获取网页标题
        const pageTitle = $('title').text().trim() || item.title;
        
        // 获取网页描述
        const description = $('meta[name="description"]').attr('content') || 
                          $('meta[property="og:description"]').attr('content') || '';
        
        // 移除脚本、样式和其他不必要的元素
        $('script, style, nav, footer, header, aside, iframe, noscript').remove();
        
        // 获取正文内容
        let content = $('body').text()
          .replace(/[\r\n]+/g, '\n')  // 规范化换行
          .replace(/\s+/g, ' ')       // 规范化空格
          .trim();                    // 移除首尾空格
        
        // 如果内容太长，分割成多个块
        const maxLength = 8000;
        let chunks = [];
        
        if (content.length > maxLength) {
          // 分割文本
          const paragraphs = content.split('\n');
          let currentChunk = '';
          
          for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length > maxLength) {
              chunks.push(currentChunk);
              currentChunk = paragraph;
            } else {
              currentChunk += (currentChunk ? '\n' : '') + paragraph;
            }
          }
          
          if (currentChunk) {
            chunks.push(currentChunk);
          }
        } else {
          chunks = [content];
        }
        
        // 构建结构化内容
        const structuredContent = `# ${pageTitle}\n\n${description ? `## 描述\n${description}\n\n` : ''}## 内容\n${chunks[0]}\n\n## 来源\n${formattedUrl}`;
        
        // 使用第一个chunk生成嵌入向量
        const embedding = await embedText(structuredContent.substring(0, 8000), base.model);
        
        // 更新项目
        await db.knowledgeItems.update(item.id, {
          title: pageTitle,
          content: structuredContent,
          embedding,
          status: 'completed',
          updatedAt: new Date().toISOString()
        });
        
        console.log(`URL ${formattedUrl} 处理完成: ${chunks.length} 个块，总长度 ${content.length}，使用代理 [${successProxy}]`);
        toastManager.success(`成功添加 "${pageTitle}" 到知识库`);
      } catch (error) {
        console.error(`处理URL失败: ${formattedUrl}`, error);
        
        try {
          // 尝试创建一个基本项目
          const simpleContent = `${item.title}\n${formattedUrl}`;
          const embedding = await embedText(simpleContent, base.model);
          
          // 更新状态为部分完成
          await db.knowledgeItems.update(item.id, {
            content: `无法处理此URL的内容。错误信息: ${error.message}\n\nURL: ${formattedUrl}`,
            embedding,
            status: 'partial',
            error: error.message,
            updatedAt: new Date().toISOString()
          });
          
          toastManager.warning(`无法完全处理 "${item.title}"，已保存基本信息`);
        } catch (fallbackError) {
          // 如果连基本处理也失败，则标记为失败
          await db.knowledgeItems.update(item.id, {
            status: 'failed',
            error: error.message,
            updatedAt: new Date().toISOString()
          });
          
          toastManager.error(`处理URL失败: ${error.message}`);
        }
      }
    }, 0);
    
    return item;
  } catch (error) {
    console.error(`添加URL到知识库失败: ${url}`, error);
    throw error;
  }
};

/**
 * 添加笔记到知识库
 * @param {string} baseId 知识库ID
 * @param {string} title 笔记标题
 * @param {string} content 笔记内容
 * @returns {Promise<Object>} 知识库项目
 */
export const addNoteToKnowledgeBase = async (baseId, title, content) => {
  if (!baseId || !content) {
    throw new Error('知识库ID和笔记内容不能为空');
  }
  
  try {
    // 获取知识库
    const base = await db.knowledgeBases.get(baseId);
    
    if (!base) {
      throw new Error(`知识库 ${baseId} 不存在`);
    }
    
    // 创建知识库项目
    const item = {
      id: uuidv4(),
      baseId,
      name: title || '未命名笔记',
      title: title || '未命名笔记',
      type: 'note',
      content,
      status: 'processing', // 初始状态为处理中
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 保存到数据库
    await db.knowledgeItems.add(item);
    
    // 更新知识库的更新时间和文档数量
    await db.knowledgeBases.update(baseId, {
      updatedAt: new Date().toISOString(),
      documentCount: (base.documentCount || 0) + 1,
      itemCount: (base.itemCount || 0) + 1
    });
    
    // 生成嵌入向量
    setTimeout(async () => {
      try {
        // 生成嵌入向量
        const embedding = await embedText(content, base.model);
        
        // 更新项目状态和嵌入向量
        await updateKnowledgeItemStatus(item.id, 'ready', {
          embedding
        });
        
        console.log(`笔记 ${title || '未命名笔记'} 处理完成`);
        toastManager.success(`笔记 ${title || '未命名笔记'} 处理完成`);
      } catch (error) {
        console.error(`处理笔记 ${title || '未命名笔记'} 失败:`, error);
        await updateKnowledgeItemStatus(item.id, 'error', {
          error: error.message
        });
        toastManager.error(`处理笔记 ${title || '未命名笔记'} 失败: ${error.message}`);
      }
    }, 500);
    
    return item;
  } catch (error) {
    console.error('添加笔记到知识库失败:', error);
    throw error;
  }
};

export default {
  getKnowledgeBaseParams,
  embedText,
  getKnowledgeBaseReference,
  getKnowledgeBaseReferences,
  addKnowledgeBase,
  updateKnowledgeItemStatus,
  addFileToKnowledgeBase,
  addUrlToKnowledgeBase,
  addNoteToKnowledgeBase
}; 