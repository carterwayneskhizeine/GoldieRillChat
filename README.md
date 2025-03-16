![GoldieRillChat Logo](resources/Banner.jpg)

## 📝 项目介绍

一个好看的，可自定义背景的 AI Chatbox，可以把你喜欢的图片、视频、ThreeJS Shaders作为聊天背景。

## 🌟 系统特点

GoldieRillChat 是一款高级人工智能对话平台，集成多项前沿技术与实用功能于一体。该系统架构包括：

### 核心功能

- **智能交互系统**：先进的AI对话管理机制，集成知识库嵌入模型
- **视觉渲染引擎**：支持自定义主题系统，ThreeJS着色器背景渲染技术
- **多模态处理能力**：系统提示词、输入框中英互译、AI图像生成、图片编辑器、语音识别输入
- **开发者工具集**：内置Monaco编辑器、浏览器环境、书签管理系统、Pyodide Python运行时（支持requests库实现API调用）
- **跨界面工具集成**：
  - **全局便签系统**：支持跨界面的Sticky Note功能，可存储和管理多达10个独立便签
  - **内嵌式聊天**：在ThreeJS Shaders、Browser、Monaco Editor、Embedding等工具页面可通过侧边栏"Open Chat"按钮显示Chat界面，实现无缝交互

### 交互模式

- 系统支持三类交互消息模式：
  - **TypeU**：用户输入
  - **TypeA**：AI助手响应
  - **TypeN**：非参与式记录（作为独立笔记不计入AI对话上下文）

- 平台提供灵活的消息排序机制：
  - 可上下移动消息的顺序
  - 支持身份快速切换
  - 通过顶部导航栏的"Number of messages"下拉菜单精确控制当前对话上下文的消息数量

### 数据存储

对话数据以结构化JSON格式存储于消息文件夹的messages.json中，包含完整聊天记录、Tavily搜索结果及图像描述元数据。此文件设计兼容多平台LLM接口，可作为标准化文档上传至其它AI系统继续进行交互分析。

## 💡 使用技巧

### 背景设置

- 在图片文件消息的按钮下点击**BG**设置图片为背景
- 在视频消息下点击**MBG**设置视频为背景
- ThreeJS Shaders 的 AI 提问模板在[这里](ThreeJS_Shaders示列.txt)

### 跨界面工具

- **全局便签（Sticky Note）**：
  - 通过`Ctrl+Q`或标题栏便签图标快速访问
  - 支持10个不同编号的便签，内容自动保存到localStorage
  - 可自由拖动位置和调整大小，适应不同工作场景

- **内嵌式聊天**：
  - 在ThreeJS Shaders、Browser、Monaco Editor、Embedding等工具页面
  - 点击侧边栏的"Open Chat"按钮可以打开Chat界面
  - 无需切换工具即可发送、编辑消息和切换对话
  - 适合在使用各工具的同时参考或记录相关聊天内容

### AI功能

- **图像生成**：AI Chat界面可以发送 `/image + 空格 + 英文提示词`，使用 SiliconFlow 的 Flux.1系列模型生成图片
  - 在Settings的MEDIA选项中切换生图模型、分辨率和启用提示增强器

- **文本转语音**：在选择StepFun作为模型提供方时，使用以下格式生成TTS音频
  ```
  /tts 你好世界 --voice cixingnansheng --volume 1.0 --speed 1.0
  ```
  - 音色选项参考[这里](src/components/AIChat/constants/index.js)

- **语音识别输入**：通过内置的语音识别模块，支持实时将语音转换为文本
  - 在标题栏点击麦克风图标或使用快捷键 `Ctrl+R` 开始/停止录音
  - 识别结果实时显示在标题栏中，并自动插入到当前活跃的输入框
  - 支持5秒静音自动停止功能，提高使用便捷性
  - 在所有工具中均可使用

### 支持的API

- OpenAI API
- Claude API
- SiliconFlow API
- OpenRouter API
- DeepSeek API
- StepFun API
- Tavily API

## 🚀 快捷键

### 工具切换
- `Ctrl + 左方向键`: 循环切换到前一个工具（从左到右顺序: ThreeJS Shaders -> Embedding -> ... -> Browser）
- `Ctrl + 右方向键`: 循环切换到下一个工具（从左到右顺序: Browser -> ThreeJS Shaders -> ... -> Embedding）
- `Ctrl + [1-6]`: 直接跳转到特定的工具

### 工具映射
- `Ctrl+1`: ThreeJS Shaders
- `Ctrl+2`: Browser
- `Ctrl+3`: AI Chat
- `Ctrl+4`: Chat
- `Ctrl+5`: Monaco Editor
- `Ctrl+6`: Embedding

### Sticky Note (便签)
- `Ctrl+Q`: 显示/隐藏全局便签
- 也可通过标题栏上的便签图标按钮切换显示状态
- 支持10个不同的便签（编号1-10），点击编号可以切换
- 便签内容自动保存至localStorage
- 便签可拖动位置和调整大小
- 支持按钮操作：
  - `SAVE`: 手动保存当前便签内容
  - `CLEAR`: 清空当前便签内容

### 侧边栏和对话导航
- `Ctrl + G`: 切换侧边栏显示/隐藏
- `Ctrl + ↑/↓`: 在 AI Chat 和 Chat 面板中上下导航对话文件夹
- `Enter`: 确认选择对话
- `Esc`: 取消键盘导航

### 设置快捷键
- `Ctrl + S`: 打开设置窗口
  - 在 AI Chat 页面：打开 AI Chat 设置
  - 在 Chat 页面：打开应用全局设置

### 语音输入
- `Ctrl + Shift + M`: 开始/停止语音识别
- 也可通过标题栏上的麦克风图标按钮切换录音状态
- 语音识别结果会自动插入到当前活跃的输入框
- 连续5秒无语音输入时会自动停止录音
- 如果没有找到活跃的输入框，识别结果会自动复制到剪贴板

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

| 类别 | 项目 | 描述 |
|------|------|------|
| **编辑器相关** | Monaco Editor | 强大的代码编辑器 |
|  | CodeMirror | 优秀的文本编辑器 |
|  | KaTeX | 数学公式渲染 |
| **UI 组件** | React 18 | 用户界面框架 |
|  | TailwindCSS | 原子化 CSS 框架 |
|  | DaisyUI | 优秀的 UI 组件库 |
|  | Material UI | 组件库 |
|  | Lucide React | 图标库 |
|  | Three.js | 3D 背景渲染库 |
| **功能增强** | React Markdown | Markdown 渲染 |
|  | React Syntax Highlighter | 代码高亮 |
|  | React Virtual | 虚拟列表 |
|  | Pyodide | Python 运行时（支持在Monaco编辑器中使用requests库进行API调用） |
|  | Cheerio | HTML 解析 |
|  | Tavily API | AI优化的搜索引擎 |

### 开发工具
- Vite - 现代前端构建工具
- Electron - 跨平台桌面应用框架
- TypeScript - 类型支持
- PostCSS & Autoprefixer - CSS 处理
- Electron Builder - 应用打包

感谢所有开源社区的贡献者们，正是因为你们的无私奉献，才使得这个项目得以实现。同时也感谢所有使用和反馈本项目的用户。

## 📄 许可证

[MIT License](LICENSE)