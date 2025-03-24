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
  // 检查参数是否为数组
  if (!references || !Array.isArray(references) || references.length === 0) {
    return '';
  }
  
  const {
    maxContentLength = 800,
    includeMetadata = true
  } = options;
  
  try {
    return references.map((ref, index) => {
      // 检查引用对象和内容是否存在
      if (!ref) return `[引用${index + 1}] 引用内容缺失`;
      
      const content = ref.content?.trim() || '';
      const truncatedContent = content.length > maxContentLength
        ? `${content.substring(0, maxContentLength)}...(内容已截断，总长度${content.length}字符)`
        : content;
      
      let result = `[引用${index + 1}] ${ref.title || '未命名文档'}\n${truncatedContent || '内容缺失'}`;
      
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
  } catch (error) {
    console.error('格式化引用失败:', error);
    return '知识库引用格式化失败';
  }
};

/**
 * 对知识库引用进行排序和筛选
 * @param {Array} references - 知识库引用数组
 * @param {Object} options - 排序和筛选选项
 * @returns {Array} 排序和筛选后的引用数组
 */
export const sortAndFilterReferences = (references, options = {}) => {
  if (!references || references.length === 0) {
    console.log('sortAndFilterReferences接收到空引用数组');
    return [];
  }
  
  console.log('sortAndFilterReferences接收到引用数组:', JSON.stringify(references.map(ref => ({
    id: ref.id,
    title: ref.title,
    similarity: ref.similarity,
    content: ref.content?.substring(0, 50) + '...'
  }))));
  
  const {
    similarityThreshold = 0, // 降低为0，接受所有结果
    maxResults = 5,
    removeDuplicates = true,
    duplicateContentThreshold = 0.9
  } = options;
  
  // 按相似度筛选和排序
  let filtered = references
    .filter(ref => {
      const passed = typeof ref.similarity === 'number' && ref.similarity >= similarityThreshold;
      if (!passed) {
        console.log(`引用被过滤掉，相似度不符合要求:`, ref.id, ref.similarity);
      }
      return passed;
    })
    .sort((a, b) => b.similarity - a.similarity);
  
  console.log('按相似度筛选和排序后剩余引用数量:', filtered.length);
  
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
      } else {
        console.log(`引用被去重过滤:`, ref.id);
      }
    }
    
    filtered = uniqueRefs;
    console.log('去重后剩余引用数量:', filtered.length);
  }
  
  // 限制结果数量
  const result = filtered.slice(0, maxResults);
  console.log('最终返回引用数量:', result.length);
  return result;
}; 