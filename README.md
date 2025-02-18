# GoldieRillChat

一个功能强大的聊天应用程序，支持文件管理、图片生成与编辑、内置浏览器和 Markdown 渲染。

## 🚀 技术栈

- **前端框架**
  - React 18
  - Vite 4
  - TailwindCSS
  - DaisyUI

- **桌面应用**
  - Electron 28
  - Electron Builder
  - Electron-as-browser

- **API 支持**
  - OpenAI API
  - Claude API
  - SiliconFlow API
    - 图片生成 API
    - 视频生成 API (即将支持)
  - OpenRouter API

## ✨ 主要功能

### 🔍 搜索增强
- Google Custom Search 集成
  - 支持每天100次免费搜索配额
  - 自定义搜索引擎配置
  - 可配置搜索结果数量（1-10条）
  - API 密钥安全管理
- 搜索结果智能整合
  - 自动提取相关内容
  - 智能总结搜索结果
  - 引用来源自动标注
  - 搜索结果实时预览
- AI 回答增强
  - 基于搜索结果的知识扩充
  - 实时网络信息补充
  - 准确的信息来源引用
  - 可选的搜索开关

### 🎨 主题系统
- 内置 18+ 种精美预设主题
- 独特的 "Rill" 主题设计
- 智能随机主题生成器
  - 支持一键生成高级灰度配色
  - 基于 HSL 颜色模型的智能色彩算法
  - 自动平衡色彩饱和度和亮度
  - 生成带有微妙色调的专业灰度主题
  - 确保文本与背景的最佳对比度
- 主题实时预览和切换
- 主题配置持久化存储

### 💬 聊天管理
- 创建和管理多个聊天会话
- 支持会话重命名和删除
- 会话列表拖拽排序
- 自动保存聊天记录
- 一键发送到图片编辑器或代码编辑器
- 支持紧凑和标准两种显示模式
- 支持多种 AI 模型接口
  - OpenAI
  - Claude
  - SiliconFlow
    - FLUX.1-schnell 图片生成
    - FLUX.1-dev 图片生成
    - FLUX.1-pro 图片生成（支持高级参数调整）
  - OpenRouter
    - 统一接口访问多个模型提供商
    - 动态获取可用模型列表
- API 密钥安全管理

### 🎨 AI 图片生成
- 支持多种图片生成模型
  - FLUX.1-schnell：快速生成
  - FLUX.1-dev：开发版本
  - FLUX.1-pro：专业版本
    - 生成步数调整（2-50）
    - 引导系数控制（1.5-5）
    - 安全容忍度设置（0-6）
    - 间隔参数调整（1-4）
    - 提示词上采样开关
- 支持多种预设分辨率
  - 1024×576 (16:9 横版)
  - 576×1024 (9:16 竖版)
  - 1024×1024 (1:1 方形)
  - 768×512 (3:2 横版)
  - 512×768 (2:3 竖版)
  - 768×1024 (3:4 竖版)
- 图片生成历史记录
- 一键重新生成
- 支持自定义 Seed
- 支持模型切换
- 支持分辨率调整
- 优化的参数初始化和存储
- 改进的错误处理机制
- 增强的参数验证
- 深度复制参数对象
- 类型安全的参数转换

### 🎥 视频生成（即将支持）
- 支持多种视频生成模型
  - Lightricks/LTX-Video
  - genmo/mochi-1-preview
  - tencent/HunyuanVideo
- 特性支持
  - 文本到视频生成
  - 图片引导视频生成
  - 自定义随机种子
  - 视频生成进度显示
  - 视频预览播放
  - 视频下载与分享
  - 视频生成历史记录
- 计划功能
  - 视频参数调整
  - 视频编辑功能
  - 视频合成选项
  - 批量视频生成

### 🎨 Monaco Editor 功能
- 支持多种编程语言
  - JavaScript/TypeScript
  - Python
  - Java
  - C++
  - HTML/CSS
  - Markdown
  等
- 代码编辑功能
  - 语法高亮
  - 代码格式化
  - 自动补全
  - 错误提示
- Markdown 支持
  - 实时预览
  - 导出 .md 文件
  - GFM 语法支持
  - 数学公式渲染
- Python 环境
  - 内置 Pyodide 运行时
  - 支持 numpy、pandas 等科学计算库
  - 实时代码执行
  - 输出结果展示
- 编辑器功能
  - 字体大小调节
  - 多主题切换
  - 复制/粘贴优化
  - 文件导入导出

### 🌏 内置浏览器
- 集成安全浏览器功能
- 多标签页管理（新建、关闭、切换）
- 标签页状态显示（标题、加载状态、图标）
- 支持基本导航操作（前进、后退、刷新）
- 页面加载状态实时显示
- 支持与聊天功能无缝切换
- 安全沙箱环境
- 响应式布局（自适应侧边栏）
- 保持标签页状态
- 支持窗口拖拽
- 快速切换聊天功能
- 扁平化导航按钮设计

### 📝 消息功能
- 支持文本消息和文件发送
- Markdown 格式渲染
- 消息编辑和删除（优化的编辑界面）
- 消息上下移动
- 长消息折叠/展开（带平滑滚动效果）
- 复制/粘贴支持
- 消息自动保存为 TXT 文件
- 优化的消息操作按钮布局
- 消息操作按钮悬停显示
- 消息折叠状态记忆功能
- 改进的消息编辑体验

### 📁 文件管理
- 文件拖拽上传
- 支持图片、视频等多媒体文件
- 文件重命名功能
- 回收站功能
- 打开文件所在位置
- 优化的文件预览界面

### 🖼️ 图片处理
- 内置图片编辑器
- 支持旋转、翻转、缩放
- 自定义画布大小
- 多种分辨率预设
- 支持导出 JPG/PNG
- 图片拖拽和缩放预览
- 复制到剪贴板功能
- 一键发送到聊天
- 优化的图片预览界面

### ⚙️ 系统功能
- 多主题支持（18+ 种预设主题）
- 自定义存储位置
- 文件夹扫描和更新
- 跨平台支持（Windows/Mac/Linux）
- 优化的用户界面交互
- 响应式设计适配

## 🛠️ 开发特性

- 完整的错误处理和日志记录
- 自定义文件协议支持
- 原生系统集成
- 异步文件操作
- 自定义上下文菜单
- 优化的组件状态管理
- 改进的事件处理机制

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

## 🎨 主题预览

支持多种精美主题：
- Rill (自定义灰度主题)
- Dark
- Synthwave
- Halloween
- Forest
- Pastel
- Black
- Luxury
- Dracula
- Business
- Coffee
- Emerald
- Corporate
- Retro
- Aqua
- Wireframe
- Night
- Dim
- Sunset

## 🔧 配置说明

### 存储位置
- 支持自定义存储位置
- 自动创建聊天文件夹
- 文件自动分类存储
- 优化的文件管理结构
- 视频文件自动分类存储
- 优化的多媒体文件管理

### 文件支持
- 支持所有文本文件
- 图片格式：jpg、jpeg、png、gif、webp
- 视频格式：mp4（支持生成和预览）
- AI 生成图片自动保存
- 自动文件类型识别
- 优化的文件处理机制
- 优化的视频文件处理机制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🙏 致谢

本项目基于众多优秀的开源项目构建，特别感谢：

### 核心项目支持
- [Chatbox](https://github.com/Bin-Huang/chatbox) - 优秀的聊天应用框架
- [electron-as-browser](https://github.com/hulufei/electron-as-browser) - Electron 浏览器实现
- [yet-another-react-lightbox](https://github.com/igordanchenko/yet-another-react-lightbox) - 优秀的 React 灯箱组件

### 主要依赖yet-another-react-lightbox
- **编辑器相关**
  - Monaco Editor - 强大的代码编辑器
  - CodeMirror - 优秀的文本编辑器
  - Cherry Markdown - Markdown 编辑与渲染
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
  - Pyodide - Python 运行时
  - Cheerio - HTML 解析

### 开发工具
- Vite - 现代前端构建工具
- Electron - 跨平台桌面应用框架
- TypeScript - 类型支持
- PostCSS & Autoprefixer - CSS 处理
- Electron Builder - 应用打包

感谢所有开源社区的贡献者们，正是因为你们的无私奉献，才使得这个项目得以实现。同时也感谢所有使用和反馈本项目的用户。

## 📄 许可证

[MIT License](LICENSE)
