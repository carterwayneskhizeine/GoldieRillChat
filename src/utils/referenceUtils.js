/**
 * 知识库引用处理工具函数
 * 用于优化知识库引用的格式化、排序和展示
 */

/**
 * 格式化知识库引用以便于显示给用户
 * @param {Array} references - 知识库引用数组
 * @param {Object} options - 格式化选项
 * @returns {String} 格式化后的引用文本
 */
export const formatReferencesForDisplay = (references, options = {}) => {
  if (!references || references.length === 0) {
    return '未找到相关引用';
  }
  
  const {
    maxPreviewLength = 300,
    showSimilarity = true,
    showSource = true,
    numbering = true
  } = options;
  
  return references.map((ref, index) => {
    const title = ref.title || '未命名文档';
    const content = ref.content?.trim() || '';
    const previewContent = content.length > maxPreviewLength
      ? `${content.substring(0, maxPreviewLength)}...`
      : content;
    
    let result = '';
    
    if (numbering) {
      result += `[${index + 1}] `;
    }
    
    result += `${title}\n${previewContent}`;
    
    if (showSimilarity && ref.similarity !== undefined) {
      result += `\n相似度: ${typeof ref.similarity === 'number' ? ref.similarity.toFixed(2) : '未知'}`;
    }
    
    if (showSource && ref.source) {
      result += `\n来源: ${ref.source}`;
    }
    
    return result;
  }).join('\n\n---\n\n');
};

/**
 * 格式化知识库引用用于发送给模型
 * @param {Array} references - 知识库引用数组
 * @param {Object} options - 格式化选项
 * @returns {String} 格式化后的引用文本，适用于模型输入
 */
export const formatReferencesForModel = (references, options = {}) => {
  if (!references || references.length === 0) {
    return '';
  }
  
  const {
    maxContentLength = 800,
    includeMetadata = true
  } = options;
  
  return references.map((ref, index) => {
    const content = ref.content?.trim() || '';
    const truncatedContent = content.length > maxContentLength
      ? `${content.substring(0, maxContentLength)}...(内容已截断，总长度${content.length}字符)`
      : content;
    
    let result = `[引用${index + 1}] ${ref.title || '未命名文档'}\n${truncatedContent}`;
    
    if (includeMetadata) {
      if (ref.similarity !== undefined) {
        result += `\n相似度: ${typeof ref.similarity === 'number' ? ref.similarity.toFixed(2) : '未知'}`;
      }
      
      if (ref.source) {
        result += `\n来源: ${ref.source}`;
      }
      
      if (ref.isChunk || ref.chunked) {
        result += `\n注: 此内容为文档的一部分`;
      }
    }
    
    return result;
  }).join('\n\n---\n\n');
};

/**
 * 对知识库引用进行排序和筛选
 * @param {Array} references - 知识库引用数组
 * @param {Object} options - 排序和筛选选项
 * @returns {Array} 排序和筛选后的引用数组
 */
export const sortAndFilterReferences = (references, options = {}) => {
  if (!references || references.length === 0) {
    return [];
  }
  
  const {
    similarityThreshold = 0.6,
    maxResults = 5,
    removeDuplicates = true,
    duplicateContentThreshold = 0.9
  } = options;
  
  // 按相似度筛选和排序
  let filtered = references
    .filter(ref => ref.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity);
  
  // 去除内容重复的引用
  if (removeDuplicates) {
    const uniqueRefs = [];
    const contentSet = new Set();
    
    for (const ref of filtered) {
      // 使用内容的前100个字符作为简单去重
      const contentPreview = ref.content?.substring(0, 100) || '';
      if (!contentSet.has(contentPreview)) {
        contentSet.add(contentPreview);
        uniqueRefs.push(ref);
      }
    }
    
    filtered = uniqueRefs;
  }
  
  // 限制结果数量
  return filtered.slice(0, maxResults);
}; 