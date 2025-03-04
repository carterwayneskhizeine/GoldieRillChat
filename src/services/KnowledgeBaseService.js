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
import FileProcessingService from './FileProcessingService';
import { detectFileType, isSitemapUrl } from '../utils/fileTypes';

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
    // 检查文本长度，SiliconFlow对输入文本有大小限制
    const MAX_TEXT_LENGTH = 8000; // SiliconFlow在8K左右有限制
    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`文本长度(${text.length})超过API限制(${MAX_TEXT_LENGTH})，将被截断`);
      text = text.substring(0, MAX_TEXT_LENGTH);
    }
    
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
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
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
  
  if (!text || !text.trim()) {
    throw new Error('嵌入文本不能为空');
  }
  
  // 限制文本长度，避免请求太大
  const MAX_SAFE_TEXT_LENGTH = 10000; // 安全上限
  let truncated = false;
  if (text.length > MAX_SAFE_TEXT_LENGTH) {
    console.warn(`嵌入文本过长(${text.length})，将被截断至${MAX_SAFE_TEXT_LENGTH}字符`);
    text = text.substring(0, MAX_SAFE_TEXT_LENGTH);
    truncated = true;
  }
  
  // 获取API配置
  const config = getEmbeddingApiConfig(model.provider);
  
  console.log(`嵌入文本使用模型: ${model.name} (${model.provider}), API密钥: ${config.apiKey ? '已配置' : '未配置'}, 文本长度: ${text.length}${truncated ? ' (已截断)' : ''}`);
  
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
    const processedParents = new Set(); // 跟踪已处理的父项目
    
    // 首先处理所有普通项目和父项目
    for (const item of items) {
      // 跳过没有嵌入向量的项目
      if (!item.embedding || item.embedding.length === 0) {
        continue;
      }
      
      // 计算相似度
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      
      // 如果相似度低于阈值，跳过
      if (similarity < (base.threshold || 0.7)) {
        continue;
      }
      
      // 准备引用对象
      let reference = {
        id: item.id,
        title: item.title || item.name,
        content: item.content,
        similarity,
        type: item.type
      };
      
      // 如果这是一个分块项目
      if (item.chunked && item.childItems && item.childItems.length > 0) {
        // 标记该父项目已处理
        processedParents.add(item.id);
        
        // 添加块信息
        reference.chunked = true;
        reference.totalChunks = item.chunkCount || (item.childItems.length + 1);
        
        // 将引用添加到结果列表
        results.push(reference);
        
        // 查找所有子块
        const childItems = await db.knowledgeItems
          .where('id')
          .anyOf(item.childItems)
          .toArray();
        
        // 处理每个子块
        if (childItems && childItems.length > 0) {
          // 计算每个子块的相似度
          for (const child of childItems) {
            // 跳过没有嵌入向量的子块
            if (!child.embedding || child.embedding.length === 0) {
              continue;
            }
            
            const childSimilarity = cosineSimilarity(queryEmbedding, child.embedding);
            
            // 只添加相似度高于阈值的子块
            if (childSimilarity >= (base.threshold || 0.7)) {
              results.push({
                id: child.id,
                title: `${reference.title} (块 ${child.chunkIndex || '?'})`,
                content: child.content,
                similarity: childSimilarity,
                type: child.type,
                parentId: item.id,
                isChunk: true,
                chunkIndex: child.chunkIndex
              });
            }
          }
        }
      } else {
        // 非分块项目直接添加到结果
        results.push(reference);
      }
    }
    
    // 按相似度降序排序并限制数量
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit * 2); // 返回更多结果，以确保有足够的相关内容
      
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
      try {
        const references = await getKnowledgeBaseReference(base, message, limit);
        
        // 格式化引用对象，优化LLM处理
        const formattedReferences = references.map(ref => {
          // 创建友好格式的引用对象
          return {
            id: ref.id,
            title: ref.title || (ref.isChunk ? `${base.name} (文档块)` : base.name),
            content: ref.content,
            similarity: parseFloat(ref.similarity.toFixed(4)),
            source: ref.isChunk 
              ? `${base.name} - ${ref.title}`
              : (ref.chunked ? `${base.name} - ${ref.title} (多块文档)` : `${base.name} - ${ref.title}`),
            type: ref.type
          };
        });
        
        allReferences.push(...formattedReferences);
      } catch (baseError) {
        console.error(`从知识库 ${base.name} 获取引用失败:`, baseError);
        // 继续处理其他知识库
      }
    }
    
    console.log(`总共找到 ${allReferences.length} 条相关引用`);
    
    // 对所有引用按相似度排序
    const sortedReferences = allReferences
      .sort((a, b) => b.similarity - a.similarity);
    
    // 进行去重 - 移除内容几乎相同的引用
    const uniqueReferences = [];
    const contentHashes = new Set();
    
    for (const ref of sortedReferences) {
      // 提取内容的前100个字符作为简单哈希
      const contentPreview = ref.content?.substring(0, 100) || '';
      if (!contentHashes.has(contentPreview)) {
        contentHashes.add(contentPreview);
        uniqueReferences.push(ref);
        
        // 如果已经收集了足够多的引用，就停止
        if (uniqueReferences.length >= limit) {
          break;
        }
      }
    }
    
    return uniqueReferences;
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
    { id: 'Pro/BAAI/bge-m3', name: 'Pro/BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 }
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
      fileType: detectFileType(file.name), // 添加文件类型识别
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
      itemCount: (base.itemCount || 0) + 1
    });
    
    // 使用FileProcessingService处理文件
    try {
      const options = {
        chunkSize: base.chunkSize || 1000,
        chunkOverlap: base.chunkOverlap || 200
      };
      
      // 异步处理文件
      processFileAsync(item, file, base, options);
      
      return item;
    } catch (error) {
      console.error('文件处理失败:', error);
      // 更新状态为失败
      await updateKnowledgeItemStatus(item.id, 'error', { error: error.message });
      throw error;
    }
  } catch (error) {
    console.error('添加文件失败:', error);
    toastManager.error(`添加文件失败: ${error.message}`);
    throw error;
  }
};

// 异步处理文件的函数
const processFileAsync = async (item, file, base, options) => {
  try {
    const result = await FileProcessingService.processFile(file, options);
    
    if (result) {
      // 获取文本内容
      const text = result.content || '';
      if (!text) {
        await updateKnowledgeItemStatus(item.id, 'error', {
          error: '无法提取文件内容'
        });
        return;
      }
      
      // 检查文本大小，决定是否需要分块处理
      const MAX_EMBEDDING_TEXT = 8000; // SiliconFlow的大致限制
      const needsChunking = text.length > MAX_EMBEDDING_TEXT;
      
      // 更新知识项状态为处理中
      await updateKnowledgeItemStatus(item.id, 'processing', {
        contentLength: text.length,
        needsChunking
      });
      
      try {
        if (needsChunking) {
          // 文本分块处理
          console.log(`文件内容超过${MAX_EMBEDDING_TEXT}字符(${text.length}字符)，进行分块处理`);
          
          // 更新知识库条目状态为分块中
          await updateKnowledgeItemStatus(item.id, 'chunking');
          
          // 根据设置的分块大小进行分块
          const chunks = FileProcessingService.chunkText(text, options.chunkSize, options.chunkOverlap);
          console.log(`分块完成，共${chunks.length}个块`);
          
          // 标记主条目为分块的
          const metadata = {
            isChunked: true,
            chunks: chunks.length,
            originalLength: text.length,
            childItems: []
          };
          
          // 为每个块创建子条目
          let processedChunks = 0;
          let failedChunks = 0;
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkTitle = `${item.title} - 块 ${i+1}/${chunks.length}`;
            
            try {
              // 为每个块创建一个子知识项
              const childItem = await db.knowledgeItems.add({
                baseId: base.id,
                title: chunkTitle,
                content: chunk,
                type: 'chunk',
                parentId: item.id,
                status: 'processing',
                created: new Date().toISOString(),
                chunkIndex: i,
                totalChunks: chunks.length
              });
              
              // 为块生成嵌入向量
              const embeddingVector = await embedText(chunk, base.model || base.modelId || 'silicon-flow');
              
              // 更新子项目
              await db.knowledgeItems.update(childItem, {
                embedding: embeddingVector,
                status: 'ready'
              });
              
              // 添加子项ID到父项的元数据
              metadata.childItems.push(childItem);
              processedChunks++;
              
              // 定期更新主条目状态
              if (i % 5 === 0 || i === chunks.length - 1) {
                await updateKnowledgeItemStatus(item.id, 'chunking', {
                  progress: Math.round((i + 1) / chunks.length * 100),
                  processedChunks,
                  failedChunks,
                  ...metadata
                });
              }
            } catch (chunkError) {
              console.error(`处理块 ${i+1}/${chunks.length} 失败:`, chunkError);
              failedChunks++;
              // 继续处理其他块
            }
          }
          
          // 最终更新主条目状态
          const finalStatus = failedChunks === chunks.length ? 'error' : 'ready';
          await updateKnowledgeItemStatus(item.id, finalStatus, {
            processedChunks,
            failedChunks,
            ...metadata
          });
          
          console.log(`分块处理完成，成功: ${processedChunks}，失败: ${failedChunks}`);
        } else {
          // 直接为整个文本生成嵌入向量
          console.log('生成文本嵌入向量');
          const embeddingVector = await embedText(text, base.model || base.modelId || 'silicon-flow');
          
          // 更新条目状态为完成
          await updateKnowledgeItemStatus(item.id, 'ready', {
            embedding: embeddingVector
          });
        }
      } catch (processingError) {
        console.error('处理文本内容失败:', processingError);
        await updateKnowledgeItemStatus(item.id, 'error', {
          error: processingError.message
        });
      }
    } else {
      await updateKnowledgeItemStatus(item.id, 'error', {
        error: '文件处理结果为空'
      });
    }
  } catch (error) {
    console.error('异步处理文件失败:', error);
    await updateKnowledgeItemStatus(item.id, 'error', {
      error: error.message
    });
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
  
  try {
    // 获取知识库
    const base = await db.knowledgeBases.get(baseId);
    
    if (!base) {
      throw new Error(`知识库 ${baseId} 不存在`);
    }
    
    // 检查是否为站点地图
    const isSitemap = isSitemapUrl(url);
    
    // 创建知识库项目
    const item = {
      id: uuidv4(),
      baseId,
      name: url,
      type: isSitemap ? 'sitemap' : 'url',
      url,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 保存到数据库
    await db.knowledgeItems.add(item);
    
    // 更新知识库的更新时间和文档数量
    await db.knowledgeBases.update(baseId, {
      updatedAt: new Date().toISOString(),
      itemCount: (base.itemCount || 0) + 1
    });
    
    // 使用FileProcessingService处理URL
    try {
      const options = {
        chunkSize: base.chunkSize || 1000,
        chunkOverlap: base.chunkOverlap || 200
      };
      
      // 异步处理URL
      processUrlAsync(item, url, base, options);
      
      return item;
    } catch (error) {
      console.error('URL处理失败:', error);
      // 更新状态为失败
      await updateKnowledgeItemStatus(item.id, 'error', { error: error.message });
      throw error;
    }
  } catch (error) {
    console.error('添加URL失败:', error);
    toastManager.error(`添加URL失败: ${error.message}`);
    throw error;
  }
};

// 异步处理URL的函数
const processUrlAsync = async (item, url, base, options) => {
  try {
    const result = await FileProcessingService.processUrl(url, options);
    
    if (result) {
      // 对于站点地图，处理可能会返回多个URL内容
      if (item.type === 'sitemap') {
        // 站点地图处理完成
        await updateKnowledgeItemStatus(item.id, 'completed', result);
      } else {
        // 普通URL，创建向量嵌入
        const content = result.content || '';
        if (content) {
          // 检查是否有文本块
          if (result.chunks && result.chunks.length > 1) {
            console.log(`处理多块URL内容，共${result.chunks.length}块`);
            
            // 为第一块生成向量嵌入（通常包含最重要的内容）
            const firstChunkEmbedding = await embedText(result.chunks[0], base.model || base.modelId || 'silicon-flow');
            
            // 创建子项目来存储额外的文本块
            const childItems = [];
            
            // 处理剩余块(从第2块开始)
            for (let i = 1; i < result.chunks.length; i++) {
              const chunk = result.chunks[i];
              // 仅当块内容不为空时处理
              if (chunk && chunk.trim()) {
                try {
                  // 为当前块生成嵌入向量
                  const chunkEmbedding = await embedText(chunk, base.model || base.modelId || 'silicon-flow');
                  
                  // 创建子项目
                  const childItem = {
                    id: uuidv4(),
                    baseId: item.baseId,
                    parentId: item.id,
                    name: `${item.name || url} (块 ${i+1}/${result.chunks.length})`,
                    type: 'url_chunk',
                    url,
                    content: chunk,
                    embedding: chunkEmbedding,
                    chunkIndex: i,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  
                  // 保存子项目
                  await db.knowledgeItems.add(childItem);
                  childItems.push(childItem.id);
                } catch (chunkError) {
                  console.error(`块 ${i+1} 嵌入失败:`, chunkError);
                }
              }
            }
            
            // 更新主项目
            await updateKnowledgeItemStatus(item.id, 'completed', {
              embedding: firstChunkEmbedding,
              content,
              childItems, // 存储子项目ID列表
              chunked: true,
              chunkCount: result.chunks.length,
              ...result
            });
            } else {
            // 单块内容处理
            const embeddings = await embedText(content, base.model || base.modelId || 'silicon-flow');
            
            // 更新知识库项目
            await updateKnowledgeItemStatus(item.id, 'completed', {
              embedding: embeddings,
              content,
              ...result
            });
          }
        } else {
          await updateKnowledgeItemStatus(item.id, 'error', {
            error: '无法提取URL内容'
          });
        }
      }
    }
  } catch (error) {
    console.error('处理URL失败:', error);
    await updateKnowledgeItemStatus(item.id, 'error', {
      error: error.message
    });
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
  if (!baseId || !title || !content) {
    throw new Error('知识库ID、标题和内容不能为空');
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
      name: title,
      type: 'note',
      content,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 保存到数据库
    await db.knowledgeItems.add(item);
    
    // 更新知识库的更新时间和文档数量
    await db.knowledgeBases.update(baseId, {
      updatedAt: new Date().toISOString(),
      itemCount: (base.itemCount || 0) + 1
    });
    
    // 使用FileProcessingService处理笔记
    try {
      const options = {
        chunkSize: base.chunkSize || 1000,
        chunkOverlap: base.chunkOverlap || 200
      };
      
      const result = await FileProcessingService.processNote(title, content, options);
      
      if (result) {
        // 创建向量嵌入
        const embeddings = await embedText(content, base.model || base.modelId || 'silicon-flow');
        
        // 更新知识库项目
        await updateKnowledgeItemStatus(item.id, 'completed', {
          embedding: embeddings,
          ...result
        });
      }
      
      return item;
    } catch (error) {
      console.error('笔记处理失败:', error);
      // 更新状态为失败
      await updateKnowledgeItemStatus(item.id, 'error', { error: error.message });
      throw error;
    }
  } catch (error) {
    console.error('添加笔记失败:', error);
    toastManager.error(`添加笔记失败: ${error.message}`);
    throw error;
  }
};

// 处理目录的函数 (新增)
export const addDirectoryToKnowledgeBase = async (baseId, directoryPath) => {
  if (!baseId || !directoryPath) {
    throw new Error('知识库ID和目录路径不能为空');
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
      name: directoryPath.split('/').pop() || directoryPath.split('\\').pop() || directoryPath,
      type: 'directory',
      path: directoryPath,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 保存到数据库
    await db.knowledgeItems.add(item);
    
    // 更新知识库的更新时间和文档数量
    await db.knowledgeBases.update(baseId, {
      updatedAt: new Date().toISOString(),
      itemCount: (base.itemCount || 0) + 1
    });
    
    // 使用FileProcessingService处理目录
    try {
      const options = {
        chunkSize: base.chunkSize || 1000,
        chunkOverlap: base.chunkOverlap || 200
      };
      
      // 异步处理目录
      processDirectoryAsync(item, directoryPath, base, options);
    
    return item;
    } catch (error) {
      console.error('目录处理失败:', error);
      // 更新状态为失败
      await updateKnowledgeItemStatus(item.id, 'error', { error: error.message });
      throw error;
    }
  } catch (error) {
    console.error('添加目录失败:', error);
    toastManager.error(`添加目录失败: ${error.message}`);
    throw error;
  }
};

// 异步处理目录的函数
const processDirectoryAsync = async (item, directoryPath, base, options) => {
  try {
    const result = await FileProcessingService.processDirectory(directoryPath, options);
    
    if (result) {
      // 目录处理完成后更新状态
      await updateKnowledgeItemStatus(item.id, 'completed', result);
    }
  } catch (error) {
    console.error('处理目录失败:', error);
    await updateKnowledgeItemStatus(item.id, 'error', {
      error: error.message
    });
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
  addNoteToKnowledgeBase,
  addDirectoryToKnowledgeBase
}; 