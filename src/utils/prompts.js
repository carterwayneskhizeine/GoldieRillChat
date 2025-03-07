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
    imageSection = `\n\n我还找到了一些相关图片，这些图片已经下载到本地，路径信息将以JSON格式存储在返回的message对象的searchImages数组中。
你不需要在回复中手动插入![图片](file://...)格式的图片引用，系统会自动渲染这些图片。
图片信息已经包含在返回的JSON数据结构中:
{
  "searchImages": [
    {
      "url": "图片本地路径",
      "description": "图片描述",
      "originalUrl": "图片原始URL"
    },
    ...
  ]
}
你只需在适当位置文字说明"可参考上面展示的图片X"或"如图片X所示"等即可，不需要使用Markdown链接语法。`;
  }

  // 使用模板字符串构建提示词
  return `我将帮助用户回答他们的问题，基于以下网络搜索结果：

用户问题：${userMessage}

搜索查询：${searchQuery}

搜索结果：
${formattedResults}
${imageSection}

请使用以上信息提供清晰、准确且有帮助的回答。适当引用来源（使用格式[编号]），但主要关注回答用户的问题。保持友好、信息丰富的对话语气。如果搜索结果不足以完全回答问题，请说明并提供基于现有信息的最佳回答。

如果在展示查找到的多张图片时，请直接在文本中引用，如"第1张图片显示..."，而不是插入Markdown图片语法。`;
}; 