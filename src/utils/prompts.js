/**
 * 知识库提示词模板
 */

/**
 * 引用格式提示词
 * 用于指导模型使用引用格式回答问题
 */
export const REFERENCE_PROMPT = `请根据参考资料回答问题

## 标注规则：
- 请在适当的情况下在句子末尾引用上下文。
- 请按照引用编号[number]的格式在答案中对应部分引用上下文。
- 如果一句话源自多个上下文，请列出所有相关的引用编号，例如[1][2]，切记不要将引用集中在最后返回引用编号，而是在答案对应部分列出。

## 我的问题是：

{question}

## 参考资料：

{references}

请使用同用户问题相同的语言进行回答。
`;

/**
 * 脚注格式提示词
 * 用于指导模型使用脚注格式引用知识库内容
 */
export const FOOTNOTE_PROMPT = `请基于提供的知识库参考资料回答用户问题，并使用脚注格式引用知识库内容。

## 脚注格式要求:
1. 在引用知识库内容的句子末尾添加脚注标记，例如[^1]、[^2]等
2. 在回答的末尾列出所有引用来源，格式为：
   [^1]: 来源标题或描述
   [^2]: 来源标题或描述
3. 请直接引用相关的知识库内容，不要发明或添加库中不存在的信息
4. 如果需要使用自己的知识补充，请清晰地将其与知识库内容区分开

## 用户问题：
{question}

## 知识库参考资料：
{references}

请确保回答清晰、准确，并尽可能基于知识库内容。
`;

/**
 * 翻译提示词
 * 用于指导模型进行文本翻译
 * @param {string} text 要翻译的文本
 * @param {string} targetLanguage 目标语言
 * @returns {string} 翻译提示词
 */
export const getTranslatePrompt = (text, targetLanguage) => `
请将<translate_input>标签内的文本翻译成${targetLanguage}。只需提供翻译结果，不要添加解释或其他内容。

<translate_input>
${text}
</translate_input>
`;

/**
 * 网络搜索提示词
 * 用于指导模型使用网络搜索结果回答问题
 * @param {Object} userMessage 用户消息对象
 * @param {string} searchQuery 搜索查询
 * @param {Array} searchResults 搜索结果数组
 * @param {Array} images 相关图片数组
 * @returns {string} 网络搜索提示词
 */
export const getWebSearchPrompt = (userMessage, searchQuery, searchResults, images) => {
  // 格式化搜索结果
  const formattedResults = searchResults.map((result, index) => (
    `[${index + 1}] ${result.title}\n${result.url}\n${result.snippet}\n${result.content || ''}\n---\n`
  )).join('\n');
  
  // 准备图片描述部分
  let imageSection = '';
  if (images && images.length > 0) {
    const imageItems = images.map((img, index) => {
      const description = img.description || '相关图片';
      const url = img.url || '';
      // 使用Markdown图片语法引用图片
      return `![图片${index + 1}](${url} "${description}")`;
    }).join('\n');
    
    imageSection = `\n\n我还找到了一些相关图片，这些图片已经下载到本地。请在回答中使用Markdown语法引用这些图片，参考格式如下：\n${imageItems}\n`;
  }
  
  // 获取用户查询内容
  const query = userMessage.content || searchQuery;
  
  return `以下是与问题相关的网络搜索结果：

${formattedResults}
${imageSection}

请基于以上搜索结果回答用户的问题："${query}"。如果搜索结果不足以完整回答问题，也可以使用你自己的知识来补充。请在回答末尾列出使用的参考来源编号。

${images && images.length > 0 ? '重要提示：在你的回答中，请使用Markdown图片语法引用相关图片，确保图片能被正确显示。例如 "![图片描述](图片URL)"。' : ''}
`; 
}; 