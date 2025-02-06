# GoldieRillChat

一个功能强大的聊天应用程序，支持文件管理、图片编辑、内置浏览器和 Markdown 渲染。

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
  - OpenRouter API (新增)

- **功能支持**
  - Cherry Markdown 编辑器
    - 支持实时预览和编辑
    - 内置 TOC 目录导航
    - 支持多种代码高亮主题
    - 自定义工具栏配置
  - 内置安全浏览器
  - Monaco Editor
    - 支持多种编程语言
    - 实时语法高亮
    - 代码格式化
    - Markdown 实时预览
    - Markdown 文件导出
    - Python 代码执行环境

## ✨ 主要功能

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
  - OpenRouter (新增)
    - 统一接口访问多个模型提供商
    - 动态获取可用模型列表
- API 密钥安全管理

### 📝 Monaco Editor 功能
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

### 文件支持
- 支持所有文本文件
- 图片格式：jpg、jpeg、png、gif、webp
- 视频格式：mp4
- 自动文件类型识别
- 优化的文件处理机制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)
