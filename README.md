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

- **功能支持**
  - 自定义 Markdown 渲染引擎
  - 支持 GitHub 风格的 Markdown 语法
  - 内置安全浏览器

## ✨ 主要功能

### 💬 聊天管理
- 创建和管理多个聊天会话
- 支持会话重命名和删除
- 会话列表拖拽排序
- 自动保存聊天记录
- 一键发送到图片编辑器

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

### 📝 消息功能
- 支持文本消息和文件发送
- Markdown 格式渲染
- 消息编辑和删除
- 消息上下移动
- 长消息折叠/展开
- 复制/粘贴支持
- 消息自动保存为 TXT 文件

### 📁 文件管理
- 文件拖拽上传
- 支持图片、视频等多媒体文件
- 文件重命名功能
- 回收站功能
- 打开文件所在位置

### 🖼️ 图片处理
- 内置图片编辑器
- 支持旋转、翻转、缩放
- 自定义画布大小
- 多种分辨率预设
- 支持导出 JPG/PNG
- 图片拖拽和缩放预览
- 复制到剪贴板功能
- 一键发送到聊天

### ⚙️ 系统功能
- 多主题支持（18+ 种预设主题）
- 自定义存储位置
- 文件夹扫描和更新
- 跨平台支持（Windows/Mac/Linux）

## 🛠️ 开发特性

- 完整的错误处理和日志记录
- 自定义文件协议支持
- 原生系统集成
- 异步文件操作
- 自定义上下文菜单

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

### 文件支持
- 支持所有文本文件
- 图片格式：jpg、jpeg、png、gif、webp
- 视频格式：mp4
- 自动文件类型识别

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)
