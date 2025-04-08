// 尝试获取搜索结果或者知识库引用
let searchResults = null;
let knowledgeReferences = null;
let systemMessage = '';

// 检查是否有知识库引用
if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
  try {
    console.log('开始获取知识库引用，知识库IDs:', knowledgeBaseIds);
    
    // 重要: 确保每次都使用新的查询获取知识库引用，避免使用缓存
    knowledgeReferences = await getKnowledgeBaseReferences({
      message: content,
      knowledgeBaseIds: knowledgeBaseIds,
      limit: 5,
      useCache: false  // 添加参数，指示不使用缓存
    });
    
    console.log('获取到知识库引用原始数据:', JSON.stringify(knowledgeReferences));
    
    if (knowledgeReferences && Array.isArray(knowledgeReferences) && knowledgeReferences.length > 0) {
      console.log('获取到知识库引用数量:', knowledgeReferences.length);
      
      // 对引用进行排序和过滤
      const processedReferences = sortAndFilterReferences(knowledgeReferences, {
        similarityThreshold: 0,  // 降低相似度阈值以确保有结果
        removeDuplicates: true,
        maxResults: 5
      });
      console.log('处理后的引用数量:', processedReferences.length);
      
      // 格式化系统提示词
      if (Array.isArray(processedReferences) && processedReferences.length > 0) {
        try {
          // 使用formatReferencesForModel格式化引用
          const formattedRefs = formatReferencesForModel(processedReferences, {
            maxContentLength: 800,
            includeMetadata: true
          });
          
          if (formattedRefs && formattedRefs.length > 0) {
            systemMessage = "以下是与用户问题相关的知识库内容，请根据这些内容回答问题，并注明引用来源：\n\n";
            systemMessage += formattedRefs;
            
            // 添加脚注提示
            systemMessage += `\n\n${FOOTNOTE_PROMPT}`;
          } else {
            console.log('格式化后的引用为空');
            systemMessage = '根据知识库内容回答以下问题，并引用来源。';
          }
        } catch (formatError) {
          console.error('格式化知识库引用失败:', formatError);
          // 创建简单的系统提示词
          systemMessage = '根据知识库内容回答以下问题，并引用来源。';
        }
      } else {
        console.log('处理后的引用为空或非数组');
        systemMessage = '根据知识库内容回答以下问题，并引用来源。';
      }
    } else {
      console.log('未获取到有效的知识库引用');
    }
  } catch (error) {
    console.error('获取知识库引用失败:', error);
    // 创建简单的系统提示词
    systemMessage = '根据知识库内容回答以下问题，并引用来源。';
  }
} 