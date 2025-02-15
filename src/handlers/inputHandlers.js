  if (isNetworkEnabled) {
    try {
      console.log('开始网络搜索:', content);
      const searchResponse = await searchService.searchAndFetchContent(content);
      console.log('搜索结果:', searchResponse);
      
      if (searchResponse.results && searchResponse.results.length > 0) {
        // 构建搜索结果上下文
        systemMessage = `以下是与问题相关的网络搜索结果：\n\n${
          searchResponse.results.map((result, index) => (
            `[${index + 1}] ${result.title}\n${result.snippet}\n${result.content}\n来源: ${result.link}\n---\n`
          )).join('\n')
        }\n\n请基于以上搜索结果回答用户的问题："${content}"。如果搜索结果不足以完整回答问题，也可以使用你自己的知识来补充。请在回答末尾列出使用的参考来源编号。`;
        
        searchResults = searchResponse.results;
        console.log('搜索结果处理完成');
      }
    } catch (error) {
      console.error('搜索失败:', error);
      // 搜索失败时继续对话，但不使用搜索结果
    }
  } 