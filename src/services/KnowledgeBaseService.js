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
import { nanoid } from 'nanoid';

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

// 定义常量
const MAX_EMBEDDING_TEXT = 8000; // SiliconFlow的大致限制

/**
 * 获取知识库参数
 * @param {Object} base 知识库对象
 * @returns {Object} 知识库参数
 */
export const getKnowledgeBaseParams = (base) => {
  if (!base) return null;
  
  // 默认参数
  const defaultChunkCount = 6;
  const defaultChunkSize = 8000; // 使用嵌入最大长度作为默认值
  const defaultChunkOverlap = 200;
  
  return {
    id: base.id,
    name: base.name,
    model: base.model.id,
    dimensions: base.dimensions,
    threshold: base.threshold || 0.1,
    documentCount: base.documentCount || 0,
    chunkCount: base.chunkCount || defaultChunkCount,
    // 如果base中有值则使用，否则使用默认值
    chunkSize: base.chunkSize || defaultChunkSize,
    chunkOverlap: base.chunkOverlap || defaultChunkOverlap
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
    console.log(`尝试从知识库获取参考信息: ${base.id} - ${base.name}, 消息: ${message.slice(0, 50)}...`);
    
    // 获取知识库中的所有项目
    const items = await db.knowledgeItems.where('baseId').equals(base.id).toArray();
    
    if (!items || items.length === 0) {
      console.warn(`知识库为空: ${base.id} - ${base.name}`);
      return [];
    }
    
    // 计算消息的向量嵌入
    const queryEmbedding = await embedText(message, base.model);
    
    if (!queryEmbedding) {
      console.error('无法为消息生成向量嵌入');
      return [];
    }
    
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
      if (similarity < (base.threshold || 0.1)) {
        continue;
      }
      
      // 准备引用对象
      let reference = {
        id: item.id,
        title: item.title || item.name,
        content: item.content || '',
        similarity,
        source: `${base.name} - ${item.name}`,
        type: item.type
      };
      
      // 如果内容为空但有子项，尝试从子项获取内容
      if ((!reference.content || reference.content.trim().length === 0) && 
          item.childItems && item.childItems.length > 0) {
        console.log(`条目 ${item.id} 内容为空，尝试从 ${item.childItems.length} 个子项获取内容`);
        // 尝试查找子项
        const childItem = await db.knowledgeItems.get(item.childItems[0]);
        if (childItem && childItem.content) {
          reference.content = childItem.content;
          console.log(`从子项 ${childItem.id} 获取到内容，长度: ${reference.content.length}`);
        }
      }
      
      // 如果是文件类型且内容仍然为空，尝试直接从文件路径加载内容
      if ((!reference.content || reference.content.trim().length === 0) && 
          item.type === 'file' && 
          (item.path || item.url)) {
        try {
          console.log(`尝试从文件路径加载 ${item.name} 的内容`);
          // 对于本地文件，从blob URL获取内容
          if (item.path && item.path.startsWith('blob:')) {
            const response = await fetch(item.path);
            const blob = await response.blob();
            // 使用FileProcessingService读取文件，支持多种编码
            const tempFile = new File([blob], item.name, { type: item.mimeType });
            const fileContent = await FileProcessingService.readFileAsText(tempFile);
            if (fileContent && fileContent.trim().length > 0) {
              reference.content = fileContent;
              console.log(`成功从文件路径加载内容，长度: ${reference.content.length}`);
              
              // 更新数据库中的内容
              await db.knowledgeItems.update(item.id, { content: fileContent });
              console.log(`已更新数据库中 ${item.id} 的内容`);
            }
          }
        } catch (error) {
          console.error(`尝试加载文件内容失败:`, error);
        }
      }
      
      // 如果内容仍然为空，给出提示信息
      if (!reference.content || reference.content.trim().length === 0) {
        console.warn(`引用项 ${item.id} (${reference.title}) 内容为空`);
        reference.content = `[知识库项目 ${reference.title} 内容为空或无法提取内容]`;
      }
      
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
            if (childSimilarity >= (base.threshold || 0.1)) {
              results.push({
                id: child.id,
                title: `${reference.title} (块 ${child.chunkIndex || '?'})`,
                content: child.content || `[子块内容为空]`,
                similarity: childSimilarity,
                source: child.source || reference.source,
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
    const finalResults = results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
      
    console.log(`知识库 ${base.name} 找到 ${finalResults.length} 个相关引用`);
    return finalResults;
  } catch (error) {
    console.error('获取知识库引用失败:', error);
    return [];
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
      threshold: 0.1, // 默认相似度阈值
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
    
    // 预先检查文件有效性
    try {
      console.log(`预检查文件: ${file.name}, 大小: ${file.size} 字节, 类型: ${file.type}`);
      
      // 对于文本文件，先尝试读取内容
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        // 创建临时的FileReader来验证文件可读性
        const validationResult = await validateTextFile(file);
        if (!validationResult.valid) {
          toastManager.warning(`文件预检查警告: ${validationResult.message}，我们将尝试使用不同的编码处理。`);
        }
      }
    } catch (validateError) {
      console.warn(`文件预检查警告: ${validateError.message}`);
      toastManager.warning(`文件预检查警告: ${validateError.message}，我们将尝试恢复处理。`);
    }
    
    // 创建知识库项目
    const item = {
      id: nanoid(),
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
    
    // 添加到数据库
    await db.knowledgeItems.add(item);
    
    // 更新知识库的items列表
    base.items = base.items || [];
    base.items.push(item.id);
    base.updatedAt = new Date().toISOString();
    await db.knowledgeBases.put(base);
    
    // 使用知识库配置的默认参数
    const params = getKnowledgeBaseParams(base);
    const { chunkSize, chunkOverlap, chunkCount } = params;
    
    // 异步处理文件
    const options = { chunkSize, chunkOverlap, chunkCount };
    
    try {
      // 处理文件并更新状态
      await processFileAsync(item, file, base, options);
      return item;
    } catch (error) {
      console.error('文件处理失败:', error);
      // 更新状态为失败
      await updateKnowledgeItemStatus(item.id, 'error', {
        error: error.message
      });
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
    console.log(`开始处理知识库文件: ${file.name}, 大小: ${file.size} 字节`);
    
    // 增加日志，更清晰地显示处理过程
    console.log(`处理文件 ${file.name}, 类型: ${file.type}, 大小: ${file.size}`);
    console.log(`分块设置: 目标数量=${options.chunkCount || '未指定'}, 重叠=${options.chunkOverlap || 200}`);
    
    // 处理文件
    const result = await FileProcessingService.processFile(file, options);
    
    if (!result) {
      console.error(`处理文件失败: ${file.name} - 未收到处理结果`);
      await updateKnowledgeItemStatus(item.id, 'error', {
        error: '处理文件失败: 未收到处理结果'
      });
      return;
    }
    
    // 检查处理状态
    if (result.status === 'error') {
      console.error(`处理文件失败: ${file.name} - ${result.error || '未知错误'}`);
      await updateKnowledgeItemStatus(item.id, 'error', {
        error: result.error || '处理文件时出现未知错误'
      });
      return;
    }
    
    // 获取文本内容
    const text = result.content || '';
    
    // 增加详细日志
    console.log(`文件 ${file.name} 处理结果状态: ${result.status}`);
    console.log(`文件 ${file.name} 获取到内容长度: ${text.length}`);
    
    // 检查FileProcessingService是否已经做了分块处理
    if (result.chunked && result.chunks && result.chunks.length > 0) {
      console.log(`FileProcessingService已完成分块，共${result.chunks.length}块`);
      
      // 更新父项的状态
      await updateKnowledgeItemStatus(item.id, 'chunking', {
        chunked: true,
        chunkCount: result.chunks.length,
        childItems: []
      });
      
      // 处理每个块
      const childItems = [];
      for (let i = 0; i < result.chunks.length; i++) {
        const chunk = result.chunks[i];
        
        // 创建子项
        const childItem = {
          id: nanoid(),
          baseId: item.baseId,
          parentId: item.id,
          name: `${item.name} (块 ${i+1}/${result.chunks.length})`,
          type: 'chunk',
          content: chunk,
          chunkIndex: i + 1,
          status: 'processing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // 添加到数据库
        await db.knowledgeItems.add(childItem);
        
        // 添加到子项数组
        childItems.push(childItem);
        
        // 生成嵌入向量
        const embedding = await embedText(chunk, base.model);
        
        // 更新子项状态
        await updateKnowledgeItemStatus(childItem.id, 'completed', {
          length: chunk.length,
          embedding
        });
      }
      
      // 更新父项的子项列表
      await updateKnowledgeItemStatus(item.id, 'completed', {
        chunked: true,
        childItems: childItems.map(child => child.id),
        chunkCount: childItems.length
      });
      
      console.log(`所有文本块都已处理完成，共 ${childItems.length} 个块`);
      return;
    }
    
    // 检查内容是否有效
    if (!text || text.trim().length === 0) {
      console.warn(`文件内容为空: ${file.name}，尝试使用FileProcessingService直接读取`);
      
      // 如果是文本文件，尝试直接使用FileProcessingService读取
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        try {
          const directContent = await FileProcessingService.readFileAsText(file);
          if (directContent && directContent.trim().length > 0) {
            console.log(`使用FileProcessingService直接读取成功，内容长度: ${directContent.length}`);
            
            // 更新数据库中的项目，直接保存内容
            await updateKnowledgeItemStatus(item.id, 'processing', {
              content: directContent
            });
            
            // 更新文件内容后继续处理
            await processFileContent(item, directContent, base, options);
            return;
          } else {
            console.error(`即使使用FileProcessingService直接读取，文件内容仍为空: ${file.name}`);
          }
        } catch (readError) {
          console.error(`使用FileProcessingService直接读取失败:`, readError);
        }
      }
      
      // 如果仍然无法获取内容，则设置状态为错误
      await updateKnowledgeItemStatus(item.id, 'error', {
        error: '文件内容为空或无法提取'
      });
      return;
    }
    
    // 记录内容长度，便于调试
    console.log(`文件 ${file.name} 内容长度: ${text.length} 字符`);
    console.log(`文件 ${file.name} 内容开头: ${text.substring(0, 100)}...`);
    
    // 更新数据库中的项目，保存内容
    await updateKnowledgeItemStatus(item.id, 'processing', {
      content: text
    });
    
    // 处理文件内容
    await processFileContent(item, text, base, options);
  } catch (error) {
    console.error('处理文件时出错:', error);
    await updateKnowledgeItemStatus(item.id, 'error', {
      error: error.message || '处理文件时发生未知错误'
    });
  }
};

// 处理文件内容的函数
const processFileContent = async (item, text, base, options) => {
  try {
    // 获取参数
    const { chunkOverlap = 200, chunkCount } = options;
    // 不直接获取chunkSize，因为我们希望它根据文档长度和chunkCount动态计算
    
    // 记录文件内容详细信息
    console.log(`文件 ${item.name} 内容长度: ${text.length} 字符`);
    console.log(`文件 ${item.name} 内容开头: ${text.substring(0, 100)}...`);
    console.log(`知识库ID: ${base.id}, 知识库名称: ${base.name}, 知识库参数:`, JSON.stringify({
      chunkCount: chunkCount || '未指定',
      chunkOverlap: chunkOverlap || 200,
      model: base.model?.id || '未知',
      threshold: base.threshold || 0.1
    }));
    
    // 根据是否设置了分块数量来决定是否分块
    let chunks = [];
    let shouldChunk = false;
    
    // 检查是否需要分块
    if (text.length > MAX_EMBEDDING_TEXT) {
      // 超过最大嵌入长度，必须分块
      console.log(`文件内容超过${MAX_EMBEDDING_TEXT}字符，需要分块处理`);
      shouldChunk = true;
    } else if (chunkCount && chunkCount > 1) {
      // 用户明确设置了分块数量
      console.log(`文件内容虽然不超过${MAX_EMBEDDING_TEXT}字符，但用户设置了分块数量: ${chunkCount}`);
      shouldChunk = true;
    }
    
    if (shouldChunk) {
      // 进行分块处理
      console.log(`分块参数: 重叠=${chunkOverlap}, 目标数量=${chunkCount || '未指定'}`);
      
      // 动态计算chunkSize，而不是使用传入的值
      // 这里传入undefined作为maxLength，让chunkText函数自己根据chunkCount计算
      chunks = chunkText(text, undefined, chunkOverlap, chunkCount);
      console.log(`文本已分成${chunks.length}个块, 第一块长度: ${chunks[0]?.length || 0}`);
      
      try { 
        console.log(`分块详情: [${chunks.map(c => c.length).join(', ')}]`);
      } catch (e) {
        console.error('无法记录分块详情:', e.message);
      }
      
      // 更新父项的状态
      await updateKnowledgeItemStatus(item.id, 'chunking', {
        chunked: true,
        chunkCount: chunks.length,
        childItems: []
      });
      
      // 处理每个块
      const childItems = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // 创建子项
        const childItem = {
          id: nanoid(),
          baseId: item.baseId,
          parentId: item.id,
          name: `${item.name} (块 ${i+1}/${chunks.length})`,
          type: 'chunk',
          content: chunk,
          chunkIndex: i + 1,
          status: 'processing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // 添加到数据库
        await db.knowledgeItems.add(childItem);
        
        // 添加到子项数组
        childItems.push(childItem);
        
        // 生成嵌入向量
        const embedding = await embedText(chunk, base.model);
        
        // 更新子项状态
        await updateKnowledgeItemStatus(childItem.id, 'completed', {
          length: chunk.length,
          embedding
        });
      }
      
      // 更新父项的子项列表
      await updateKnowledgeItemStatus(item.id, 'completed', {
        chunked: true,
        childItems: childItems.map(child => child.id),
        chunkCount: childItems.length
      });
      
      console.log(`所有文本块都已处理完成，共 ${childItems.length} 个块`);
    } else {
      // 整体嵌入
      console.log(`文件内容小于${MAX_EMBEDDING_TEXT}字符，未设置分块，进行整体嵌入`);
      
      // 生成嵌入向量
      const embedding = await embedText(text, base.model);
      
      // 更新父项状态
      await updateKnowledgeItemStatus(item.id, 'completed', {
        length: text.length,
        chunked: false,
        embedding
      });
      
      console.log(`文件处理完成，嵌入向量维度: ${embedding.length}`);
    }
  } catch (error) {
    console.error('处理文件内容时出错:', error);
    await updateKnowledgeItemStatus(item.id, 'error', {
      error: error.message || '处理文件内容时发生未知错误'
    });
  }
};

/**
 * 文本分块函数
 * 将长文本分成多个小块，考虑最大长度和重叠
 * @param {string} text 要分块的文本
 * @param {number} maxLength 每块的最大长度
 * @param {number} overlap 块之间的重叠字符数
 * @param {number} targetChunkCount 目标分块数量
 * @returns {Array<string>} 分块后的文本数组
 */
const chunkText = (text, maxLength = 8000, overlap = 200, targetChunkCount = 0) => {
  // 安全检查：如果文本为空，直接返回空数组
  if (!text) {
    return [''];
  }
  
  // 安全检查：限制最大文本长度
  const MAX_SAFE_TEXT_LENGTH = 1000000; // 100万字符上限
  if (text.length > MAX_SAFE_TEXT_LENGTH) {
    console.warn(`文本长度 ${text.length} 超过安全上限 ${MAX_SAFE_TEXT_LENGTH}，将被截断`);
    text = text.substring(0, MAX_SAFE_TEXT_LENGTH);
  }
  
  // 如果设置了目标分块数量且大于1，始终根据文本长度和目标块数计算每块大小
  // 无视传入的maxLength参数
  if (targetChunkCount && targetChunkCount > 1) {
    console.log(`使用目标分块数量: ${targetChunkCount}，文本长度: ${text.length}`);
    
    // 简单方法：直接根据段数均匀分割文本
    if (targetChunkCount <= 10) { // 对于小段数，使用简单平均分割更准确
      const chunkSize = Math.ceil(text.length / targetChunkCount);
      console.log(`使用简单平均分割法，每块大小约: ${chunkSize}`);
      
      const chunks = [];
      for (let i = 0; i < targetChunkCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, text.length);
        if (start < text.length) { // 确保不会添加空块
          chunks.push(text.substring(start, end));
        }
      }
      
      console.log(`成功将文本分成 ${chunks.length} 个块，目标块数为 ${targetChunkCount}`);
      return chunks;
    }
    
    // 复杂方法：考虑重叠，适用于较多的段数
    // 计算每块的长度（考虑重叠）
    const totalOverlap = (targetChunkCount - 1) * overlap;
    const effectiveLength = text.length - totalOverlap;
    // 确保平均长度有意义
    if (effectiveLength > 0) {
      // 强制重新计算maxLength，确保精确匹配用户设置的分块数量
      maxLength = Math.ceil(effectiveLength / targetChunkCount);
      console.log(`基于目标分块数量(${targetChunkCount})计算的每块长度: ${maxLength}`);
    }
  } else {
    // 只有在没有设置目标分块数量时，才使用默认或传入的maxLength
    if (!maxLength || maxLength <= 0) {
      maxLength = 8000;
      console.log(`使用默认块大小: ${maxLength}`);
    }
  }
  
  // 如果文本小于最大长度且没有设置分块数量，直接返回
  if (text.length <= maxLength && !(targetChunkCount && targetChunkCount > 1)) {
    console.log(`文本长度(${text.length})小于最大长度(${maxLength})且未设置分块数量，进行整体嵌入`);
    return [text];
  }
  
  // 如果设置了分块数量，但文本长度太小导致计算出的maxLength大于文本长度
  // 这种情况下我们仍然强制分块，确保至少达到用户期望的分块数
  if (targetChunkCount && targetChunkCount > 1 && text.length <= maxLength) {
    console.log(`强制分块：文本长度(${text.length})小于计算的块长度(${maxLength})，但用户设置了分块数量(${targetChunkCount})`);
    // 简单平均分割
    maxLength = Math.ceil(text.length / targetChunkCount);
    console.log(`重新计算的块长度: ${maxLength}`);
  }
  
  // 安全检查：确保块大小合理
  if (maxLength <= 0) {
    maxLength = 8000;
  }
  if (overlap < 0 || overlap >= maxLength) {
    overlap = Math.min(200, Math.floor(maxLength * 0.1)); // 默认10%重叠
  }
  
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    // 确定当前块的结束位置
    let endIndex = Math.min(startIndex + maxLength, text.length);
    
    // 如果还有更多文本，尝试在自然边界分割
    if (endIndex < text.length) {
      // 尝试在段落、句子或单词边界分割
      const lastParagraph = text.lastIndexOf('\n\n', endIndex);
      const lastSentence = text.lastIndexOf('. ', endIndex);
      const lastSpace = text.lastIndexOf(' ', endIndex);
      
      // 选择最近的分割点，但不要回退太远
      const minAcceptableIndex = startIndex + Math.floor(maxLength * 0.7);
      
      if (lastParagraph > minAcceptableIndex) {
        endIndex = lastParagraph + 2;
      } else if (lastSentence > minAcceptableIndex) {
        endIndex = lastSentence + 2;
      } else if (lastSpace > minAcceptableIndex) {
        endIndex = lastSpace + 1;
      }
    }
    
    // 添加当前块
    chunks.push(text.substring(startIndex, endIndex));
    
    // 移动到下一个块的起始位置，考虑重叠
    startIndex = endIndex - overlap;
    
    // 确保不会死循环
    if (startIndex >= text.length || chunks.length > 1000) {
      break;
    }
  }
  
  return chunks;
};

/**
 * 验证文本文件的有效性
 * @param {File} file - 要验证的文件
 * @returns {Promise<Object>} - 验证结果
 */
const validateTextFile = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target.result;
      if (!content || content.trim().length === 0) {
        resolve({ 
          valid: false, 
          message: `文件内容为空或无法读取: ${file.name}`
        });
        return;
      }
      
      // 检查是否有实际内容（不仅仅是空白字符）
      if (content.trim().length < 10) {
        resolve({ 
          valid: false, 
          message: `文件内容过短或几乎为空: ${file.name}` 
        });
        return;
      }
      
      // 检查是否包含乱码（简单检测）
      const invalidCharRatio = content.split('').filter(char => char === '' || char === '\ufffd').length / content.length;
      if (invalidCharRatio > 0.1) {
        resolve({ 
          valid: false, 
          message: `文件可能包含乱码: ${file.name}` 
        });
        return;
      }
      
      resolve({ valid: true, content });
    };
    
    reader.onerror = () => {
      resolve({ 
        valid: false, 
        message: `无法读取文件: ${file.name}` 
      });
    };
    
    // 使用默认编码读取
    reader.readAsText(file);
  });
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
    console.log(`开始处理URL: ${url}`);
    const result = await FileProcessingService.processUrl(url, options);
    
    if (result) {
      // 对于站点地图，处理可能会返回多个URL内容
      if (item.type === 'sitemap') {
        // 站点地图处理完成
        console.log(`站点地图处理完成: ${url}, 包含 ${result.urls?.length || 0} 个URL`);
        await updateKnowledgeItemStatus(item.id, 'completed', result);
      } else {
        // 普通URL，创建向量嵌入
        const content = result.content || '';
        if (content) {
          // 检查是否有文本块
          if (result.chunks && result.chunks.length > 1) {
            console.log(`处理多块URL内容，共${result.chunks.length}块，开始生成嵌入向量`);
            
            // 为第一块生成向量嵌入（通常包含最重要的内容）
            const firstChunkEmbedding = await embedText(result.chunks[0], base.model || base.modelId || 'silicon-flow');
            console.log(`第一块嵌入向量生成成功，维度: ${firstChunkEmbedding.length}`);
            
            // 立即更新主项目状态为已完成，不等待子块处理
            console.log(`立即更新主项目状态为已完成，URL: ${url}`);
            await updateKnowledgeItemStatus(item.id, 'completed', {
              embedding: firstChunkEmbedding,
              content,
              chunked: true,
              chunkCount: result.chunks.length,
              ...result
            });
            
            // 创建子项目来存储额外的文本块
            const childItems = [];
            
            // 处理剩余块(从第2块开始)
            for (let i = 1; i < result.chunks.length; i++) {
              const chunk = result.chunks[i];
              // 仅当块内容不为空时处理
              if (chunk && chunk.trim()) {
                try {
                  console.log(`处理第${i+1}/${result.chunks.length}块`);
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
                  console.log(`子项目 ${childItem.id} 保存成功`);
                } catch (chunkError) {
                  console.error(`块 ${i+1} 嵌入失败:`, chunkError);
                }
              }
            }
            
            // 更新主项目，添加子项目ID列表
            if (childItems.length > 0) {
              console.log(`更新主项目，添加 ${childItems.length} 个子项目ID`);
              await updateKnowledgeItemStatus(item.id, 'completed', {
                childItems, // 存储子项目ID列表
              });
            }
            console.log(`URL处理完成: ${url}`);
          } else {
            // 单块内容处理
            console.log(`处理单块URL内容，长度: ${content.length}，开始生成嵌入向量`);
            const embeddings = await embedText(content, base.model || base.modelId || 'silicon-flow');
            console.log(`单块内容嵌入向量生成成功，维度: ${embeddings.length}`);
            
            // 更新知识库项目
            console.log(`更新项目 ${item.id} 状态为已完成`);
            await updateKnowledgeItemStatus(item.id, 'completed', {
              embedding: embeddings,
              content,
              ...result
            });
            console.log(`URL处理完成: ${url}`);
          }
        } else {
          console.warn(`URL内容为空: ${url}`);
          await updateKnowledgeItemStatus(item.id, 'error', {
            error: '无法提取URL内容'
          });
        }
      }
    } else {
      // 如果result为空，也将状态更新为错误
      console.warn(`处理URL失败，未返回结果: ${url}`);
      await updateKnowledgeItemStatus(item.id, 'error', {
        error: '处理URL失败，未返回结果'
      });
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
        if (embeddings && embeddings.length > 0) {
          // 更新项目，添加嵌入向量
          console.log(`笔记嵌入成功，更新状态为已完成: ${item.id}, 标题: ${title}`);
          await updateKnowledgeItemStatus(item.id, 'completed', {
            embedding: embeddings
          });
        }
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