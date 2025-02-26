# DeepSeek Reasoner 模型使用指南

## 简介

DeepSeek Reasoner 是一个专注于推理能力的大语言模型，它使用特殊的 API 端点和请求格式。本文档提供了在 GoldieRillChat 中使用 DeepSeek Reasoner 的指南。

## 特殊要求

DeepSeek Reasoner 模型有以下特殊要求：

1. **最后一条消息必须是用户消息**：与其他模型不同，DeepSeek Reasoner 要求对话的最后一条消息必须是用户消息，或者是启用了前缀模式的助手消息。

2. **使用 Beta 端点**：DeepSeek Reasoner 使用 `/beta/chat/completions` 端点，而不是标准的 `/v1/chat/completions` 端点。

## 在 GoldieRillChat 中使用

GoldieRillChat 已经自动处理了这些特殊要求，您只需：

1. 在设置中选择 DeepSeek 作为提供商
2. 选择 `deepseek-reasoner` 作为模型
3. 确保您已经配置了有效的 DeepSeek API 密钥

### 自动消息处理

为了满足 DeepSeek Reasoner 的要求，GoldieRillChat 会自动：

- 检测最后一条消息是否为用户消息
- 如果不是，系统会自动添加一个默认的用户消息（"请继续"）
- 使用正确的 Beta API 端点

这意味着您可以像使用其他模型一样正常使用 DeepSeek Reasoner，无需担心消息格式问题。

## 推理能力

DeepSeek Reasoner 模型特别擅长：

- 复杂问题的逐步推理
- 数学和逻辑问题
- 代码生成和调试
- 详细的分析和解释

## 故障排除

如果您遇到以下错误：

```
The last message of deepseek-reasoner must be a user message, or an assistant message with prefix mode on
```

这通常意味着您尝试在对话的最后一条消息是助手消息的情况下使用 DeepSeek Reasoner。GoldieRillChat 会自动处理这种情况，但如果您仍然遇到问题，请尝试：

1. 开始一个新的对话
2. 确保您的最后一条消息是用户消息
3. 检查您的 API 密钥是否有效
4. 更新到最新版本的 GoldieRillChat，确保包含自动消息处理功能

## 参考资料

- [DeepSeek API 文档](https://api-docs.deepseek.com/)
- [DeepSeek Reasoner 指南](https://api-docs.deepseek.com/guides/chat_prefix_completion) 