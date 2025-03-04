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
export const FOOTNOTE_PROMPT = `请根据参考资料回答问题，并使用脚注格式引用数据来源。请忽略无关的参考资料。

## 脚注格式：
1. **脚注标记**：在正文中使用 [^数字] 的形式标记脚注，例如 [^1]。
2. **脚注内容**：在文档末尾使用 [^数字]: 脚注内容 的形式定义脚注的具体内容。
3. **脚注内容**：应该尽量简洁。

## 我的问题是：

{question}

## 参考资料：

{references}
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