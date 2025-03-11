# GoldieRillChat

一个好看的，可自定义背景的 AI Chatbox，可以把你喜欢的图片、视频、ThreeJS Shaders作为聊天背景。

GoldieRillChat 是一款高级人工智能对话平台，集成多项前沿技术与实用功能于一体。该系统架构包括：

- **智能交互系统**：先进的AI对话管理机制，集成知识库嵌入模型
- **视觉渲染引擎**：支持自定义主题系统，ThreeJS着色器背景渲染技术
- **多模态处理能力**：系统提示词、输入框中英互译、AI图像生成
- **开发者工具集**：内置Monaco编辑器、浏览器环境、书签管理系统、Pyodide Python运行时（支持requests库实现API调用）

系统支持三类交互消息模式：TypeU(用户输入)、TypeA(AI助手响应)以及TypeN(非参与式记录)，后者可作为独立笔记不计入AI对话上下文。平台提供灵活的消息排序机制，可上下移动消息的顺序，支持身份快速切换，并通过顶部导航栏的"Number of messages"下拉菜单精确控制当前对话上下文的消息数量。

对话数据以结构化JSON格式存储于消息文件夹的messages.json中，包含完整聊天记录、Tavily搜索结果及图像描述元数据。此文件设计兼容多平台LLM接口，可作为标准化文档上传至其它AI系统继续进行交互分析。

在图片文件消息的按钮下点击BG设置图片为背景，在视频消息下则是点击MBG。

ThreeJS Shaders 的 AI 提问模板在[这里](ThreeJS_Shaders示列.txt)

AI Chat界面可以发送 /image + 空格 + 英文提示词 ，使用 SiliconFlow 的 Flux.1系列模型生成图片，也可以选择其它支持的模型。

- API 支持
  - OpenAI API
  - Claude API
  - SiliconFlow API
  - OpenRouter API
  - DeepSeek API
  - StepFun API
  - Tavily API

## 📦 安装和使用

1. 克隆仓库
```bash
git clone https://github.com/carterwayneskhizeine/GoldieRillChat.git
```

2. 安装依赖
```bash
npm install
```

3. 开发模式运行
```bash
npm run electron:dev
```

4. 构建应用
```bash
npm run electron:build
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🙏 致谢

本项目基于众多优秀的开源项目构建，特别感谢：

### 核心项目支持
- [electron-as-browser](https://github.com/hulufei/electron-as-browser) - Electron 浏览器实现
- [yet-another-react-lightbox](https://github.com/igordanchenko/yet-another-react-lightbox) - 优秀的 React 灯箱组件

### 主要依赖
- **编辑器相关**
  - Monaco Editor - 强大的代码编辑器
  - CodeMirror - 优秀的文本编辑器
  - KaTeX - 数学公式渲染

- **UI 组件**
  - React 18 - 用户界面框架
  - TailwindCSS - 原子化 CSS 框架
  - DaisyUI - 优秀的 UI 组件库
  - Material UI - 组件库
  - Lucide React - 图标库
  - Three.js - 3D 背景渲染库

- **功能增强**
  - React Markdown - Markdown 渲染
  - React Syntax Highlighter - 代码高亮
  - React Virtual - 虚拟列表
  - Pyodide - Python 运行时（支持在Monaco编辑器中使用requests库进行API调用）
  - Cheerio - HTML 解析
  - Tavily API - AI优化的搜索引擎

### 开发工具
- Vite - 现代前端构建工具
- Electron - 跨平台桌面应用框架
- TypeScript - 类型支持
- PostCSS & Autoprefixer - CSS 处理
- Electron Builder - 应用打包

感谢所有开源社区的贡献者们，正是因为你们的无私奉献，才使得这个项目得以实现。同时也感谢所有使用和反馈本项目的用户。

## 📄 许可证

[MIT License](LICENSE)