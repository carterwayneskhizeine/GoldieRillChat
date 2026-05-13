# OpenClaw & Hermes AI 聊天集成计划

## 目标

在现有 `AIChat` 工具（Tool #3）中，增加 OpenClaw（WebSocket）和 Hermes Agent（HTTP SSE）两个后端选项，与现有的多 Provider 直连模式并列，用户可在聊天界面顶部一键切换。

---

## 现状分析

### GoldieRillChat 现有 AIChat 结构

```
src/components/AIChat/
├── index.jsx                  # 主组件，~2000行状态协调
├── components/
│   ├── Header.jsx             # 顶部栏（Provider/Model选择）
│   ├── MessageList.jsx        # 消息列表渲染
│   ├── MessageItem.jsx        # 单条消息渲染
│   ├── InputArea.jsx          # 输入框
│   └── SettingsModal.jsx      # 设置弹窗
├── handlers/
│   ├── messageHandlers.js     # 消息发送/接收逻辑（调用 modelProviders.js）
│   ├── inputHandlers.js
│   ├── settingsHandlers.js
│   ├── audioCommandHandler.js
│   ├── imageGenerationHandler.js
│   └── videoCommandHandler.js
├── hooks/
│   ├── useMessageState.js
│   ├── useModelState.js       # Provider/Model 选择状态
│   ├── useInputState.js
│   └── useSystemPrompt.js
├── constants/
│   ├── storageKeys.js
│   └── systemPromptTemplates.js
└── utils/
    ├── messageUtils.js
    └── storageUtils.js
```

**现有后端**：`src/services/modelProviders.js` — 直连 OpenAI / Claude / DeepSeek / SiliconFlow / OpenRouter / StepFun，全部用 `fetch` HTTP 调用。

### WhiteNote 参考实现要点

| 功能 | WhiteNote 实现 | GoldieRillChat 适配说明 |
|------|---------------|------------------------|
| OpenClaw 连接 | WebSocket + EventEmitter（`gateway.ts`） | 需要在 Electron 主进程或渲染进程中维护 WS 连接 |
| 设备认证 | Ed25519 密钥对，存 `~/.openclaw/identity/` | 在 Electron 主进程用 Node.js `crypto` 模块实现 |
| Hermes 调用 | `fetch` SSE，`/v1/chat/completions` | 可直接在渲染进程调用（与现有直连模式相同） |
| 内容块渲染 | `AIMessageViewer`（text/thinking/toolCall/toolResult） | 扩展现有 `MessageItem.jsx` |
| 后端切换 | localStorage + 顶部 Tab | 在 `Header.jsx` 增加 Tab |
| 会话管理 | `SessionSelector`（OpenClaw） / `HermesSessionSelector` | 新增会话选择下拉组件 |

---

## 实施计划

### 阶段一：基础设施 — Electron IPC + 服务层

> **目标**：OpenClaw WebSocket 连接在主进程运行，渲染进程通过 IPC 通信。

#### 1.1 主进程 — OpenClaw 网关

**新建文件**：`electron/ipc/openclaw.js`

```js
// 职责：
// - 维护单例 WebSocket 连接到 OpenClaw Gateway
// - 处理设备认证（Ed25519，存 userData/openclaw-identity.json）
// - 暴露 IPC 处理器：
//   ipcMain.handle('openclaw:connect', ...)
//   ipcMain.handle('openclaw:send-message', ...)
//   ipcMain.handle('openclaw:get-history', ...)
//   ipcMain.handle('openclaw:list-sessions', ...)
//   ipcMain.handle('openclaw:create-session', ...)
//   ipcMain.handle('openclaw:delete-session', ...)
//   ipcMain.handle('openclaw:abort', ...)
// - 流式事件通过 mainWindow.webContents.send('openclaw:stream-chunk', ...) 推送
```

**依赖**：Node.js 内置 `crypto`（Ed25519）、`ws` 包（WebSocket）

**认证数据结构**：
```js
// userData/openclaw-identity.json
{
  deviceId: "<SHA256(publicKeyPem)>",
  publicKeyPem: "-----BEGIN PUBLIC KEY-----...",
  privateKeyPem: "-----BEGIN PRIVATE KEY-----...",
  createdAt: "ISO8601"
}
```

#### 1.2 主进程注册

**修改文件**：`electron/main.js`

- 在现有 IPC 注册区域引入并调用 `registerOpenClawHandlers(mainWindow)`

#### 1.3 预加载桥接

**修改文件**：`electron/preload.js`

在 `window.electronAPI` 中增加：
```js
openclawAPI: {
  connect: (config) => ipcRenderer.invoke('openclaw:connect', config),
  sendMessage: (sessionKey, message, attachments) => ipcRenderer.invoke('openclaw:send-message', ...),
  getHistory: (sessionKey, limit) => ipcRenderer.invoke('openclaw:get-history', ...),
  listSessions: () => ipcRenderer.invoke('openclaw:list-sessions'),
  createSession: (label) => ipcRenderer.invoke('openclaw:create-session', label),
  deleteSession: (sessionKey) => ipcRenderer.invoke('openclaw:delete-session', sessionKey),
  abort: (sessionKey) => ipcRenderer.invoke('openclaw:abort', sessionKey),
  onStreamChunk: (callback) => ipcRenderer.on('openclaw:stream-chunk', callback),
  offStreamChunk: (callback) => ipcRenderer.off('openclaw:stream-chunk', callback),
}
```

#### 1.4 渲染进程 — OpenClaw 服务

**新建文件**：`src/services/openclawService.js`

```js
// 包装 window.electronAPI.openclawAPI
// 提供与 modelProviders.js 同等的接口风格
// 管理流式 chunk 的本地聚合（thinking/text/toolCall 块）
```

#### 1.5 渲染进程 — Hermes 服务

**新建文件**：`src/services/hermesService.js`

```js
// 直接 fetch SSE（不需要主进程）
// POST HERMES_API_URL/v1/chat/completions
// 解析 delta.content + hermes.tool.progress 事件
// 管理 X-Hermes-Session-Id 头
// 提供：
//   sendMessageStream(sessionId, messages, onChunk, onToolProgress, onFinish, onError)
//   getHistory(sessionId)
//   listSessions(limit, offset)
//   checkHealth()
```

---

### 阶段二：内容块渲染 — 扩展 MessageItem

> **目标**：`MessageItem.jsx` 支持渲染 thinking / toolCall / toolResult 内容块。

#### 2.1 内容块数据结构

**修改文件**：`src/components/AIChat/types/index.js`

```js
// 新增内容块类型常量
export const CONTENT_BLOCK_TYPES = {
  TEXT: 'text',
  THINKING: 'thinking',
  TOOL_CALL: 'toolCall',
  TOOL_RESULT: 'toolResult',
}

// 消息结构扩展
// message.contentBlocks = [
//   { type: 'thinking', thinking: '...' },
//   { type: 'toolCall', id: '...', name: 'bash', arguments: { command: '...' } },
//   { type: 'toolResult', id: '...', name: 'bash', text: '...' },
//   { type: 'text', text: '...' },
// ]
```

#### 2.2 内容块渲染子组件

**新建文件**：`src/components/AIChat/components/ContentBlocks.jsx`

子组件清单：
- `ThinkingBlock` — 紫色折叠卡片，默认收起，显示推理过程
- `ToolCallBlock` — 蓝色卡片，显示工具名称和参数
- `ToolResultBlock` — 绿色卡片，显示执行结果和退出码
- `TextBlock` — 复用现有 Markdown 渲染

#### 2.3 修改 MessageItem

**修改文件**：`src/components/AIChat/components/MessageItem.jsx`

- 检测 `message.contentBlocks` 是否存在
- 若存在，按序渲染各内容块（调用 `ContentBlocks.jsx`）
- 若不存在，保持现有渲染逻辑不变（向后兼容）

#### 2.4 流式推理实时显示

**修改文件**：`src/components/AIChat/hooks/useMessageState.js`

- 增加 `streamingReasoning: string` 状态
- 流式期间在最后一条 AI 消息下方显示实时思考内容（打字机效果）

---

### 阶段三：会话管理组件

> **目标**：OpenClaw 和 Hermes 各有独立的会话选择器。

#### 3.1 OpenClaw 会话选择器

**新建文件**：`src/components/AIChat/components/OpenClawSessionSelector.jsx`

功能：
- 列出所有会话（默认主会话 `main`）
- 创建新会话（弹出命名输入框）
- 重命名 / 删除会话
- 切换时触发历史加载

#### 3.2 Hermes 会话选择器

**新建文件**：`src/components/AIChat/components/HermesSessionSelector.jsx`

功能：
- 从 Hermes Dashboard 加载历史会话列表
- 显示消息数和最近活跃时间
- "新聊天"选项（sessionId = null）
- 健康检查失败时显示连接错误提示

---

### 阶段四：Header 后端切换 + 状态整合

> **目标**：Header 顶部增加 OpenClaw / Hermes / Direct（现有直连）三种后端 Tab。

#### 4.1 后端类型定义

**修改文件**：`src/components/AIChat/constants/storageKeys.js`

```js
export const AICHAT_BACKEND_KEY = 'aichat-backend'
export const BACKEND_TYPES = {
  DIRECT: 'direct',      // 现有直连模式
  OPENCLAW: 'openclaw',
  HERMES: 'hermes',
}
```

#### 4.2 修改 Header

**修改文件**：`src/components/AIChat/components/Header.jsx`

- 顶部增加三个 Tab 按钮：`直连 | OpenClaw | Hermes`
- `direct` 模式：保持现有 Provider/Model 选择器
- `openclaw` 模式：显示 OpenClaw 连接状态 + `OpenClawSessionSelector`
- `hermes` 模式：显示 Hermes 连接状态 + `HermesSessionSelector`
- Backend 选择持久化到 localStorage

#### 4.3 新增 useBackendState Hook

**新建文件**：`src/components/AIChat/hooks/useBackendState.js`

```js
// 管理后端选择状态
// 管理 OpenClaw 连接状态（connecting/connected/error）
// 管理 Hermes 健康状态
// 管理各后端当前会话 ID
```

#### 4.4 修改主组件 index.jsx

**修改文件**：`src/components/AIChat/index.jsx`

- 引入 `useBackendState`
- 根据当前 backend 类型路由 sendMessage 调用：
  - `direct` → 现有 `messageHandlers.js`（无变化）
  - `openclaw` → `openclawService.js`
  - `hermes` → `hermesService.js`
- 加载对应后端的历史消息
- 管理 OpenClaw 流式 chunk 事件监听的生命周期

---

### 阶段五：设置界面 — 连接配置

> **目标**：在 SettingsModal 中增加 OpenClaw 和 Hermes 的连接参数配置。

#### 5.1 修改 SettingsModal

**修改文件**：`src/components/AIChat/components/SettingsModal.jsx`

新增配置项（存 localStorage）：

**OpenClaw 配置**：
```
Gateway URL:  wss://your-openclaw-gateway.example.com
Token:        [密码输入框]
Client Name:  GoldieRillChat
```

**Hermes 配置**：
```
API URL:      http://localhost:8000
Dashboard URL: http://localhost:3001
```

---

### 阶段六：样式

**新建文件**：`src/components/AIChat/styles/contentBlocks.css`

- Thinking 块：紫色左边框，折叠动画
- ToolCall 块：蓝色左边框，代码字体参数显示
- ToolResult 块：绿色左边框，等宽字体，最大高度 + 滚动
- 后端切换 Tab：沿用 DaisyUI `tabs tabs-boxed` 样式

---

## 文件变更汇总

### 新建文件

| 文件 | 说明 |
|------|------|
| `electron/ipc/openclaw.js` | 主进程 WebSocket 网关 + IPC 处理器 |
| `src/services/openclawService.js` | 渲染进程 OpenClaw API 包装 |
| `src/services/hermesService.js` | Hermes HTTP SSE 服务 |
| `src/components/AIChat/components/ContentBlocks.jsx` | thinking/toolCall/toolResult 渲染 |
| `src/components/AIChat/components/OpenClawSessionSelector.jsx` | OpenClaw 会话选择器 |
| `src/components/AIChat/components/HermesSessionSelector.jsx` | Hermes 会话选择器 |
| `src/components/AIChat/hooks/useBackendState.js` | 后端选择/连接状态管理 |
| `src/components/AIChat/styles/contentBlocks.css` | 内容块样式 |

### 修改文件

| 文件 | 改动说明 |
|------|---------|
| `electron/main.js` | 注册 OpenClaw IPC 处理器 |
| `electron/preload.js` | 暴露 `openclawAPI` 桥接 |
| `src/components/AIChat/index.jsx` | 后端路由、流式事件生命周期 |
| `src/components/AIChat/components/Header.jsx` | 后端切换 Tab + 条件渲染会话选择器 |
| `src/components/AIChat/components/MessageItem.jsx` | contentBlocks 渲染支持 |
| `src/components/AIChat/components/SettingsModal.jsx` | OpenClaw/Hermes 连接配置 |
| `src/components/AIChat/hooks/useMessageState.js` | streamingReasoning 状态 |
| `src/components/AIChat/constants/storageKeys.js` | 后端类型常量 |
| `src/components/AIChat/types/index.js` | 内容块类型定义 |

### 新增 npm 依赖

| 包名 | 用途 |
|------|------|
| `ws` | 主进程 WebSocket 客户端（OpenClaw Gateway） |

---

## 实施顺序建议

```
阶段一（IPC + 服务层）
    ↓
阶段五（Settings UI，可提前配置连接参数）
    ↓
阶段二（内容块渲染，独立可测试）
    ↓
阶段三（会话选择器）
    ↓
阶段四（Header 切换 + 主组件整合）
    ↓
阶段六（样式收尾）
```

> 各阶段相互独立，可分批实施。`direct` 模式全程不受影响。

---

## 关键设计决策

1. **OpenClaw 在主进程运行**：WebSocket 是长连接，放在主进程避免页面切换导致连接断开，且 Node.js `crypto` 模块只在主进程可用（Ed25519 设备认证需要）。

2. **Hermes 在渲染进程直连**：标准 HTTP/SSE，不需要特殊权限，与现有直连模式保持一致。

3. **向后兼容**：`MessageItem` 通过检测 `contentBlocks` 字段决定渲染路径，旧消息完全不受影响。

4. **现有 `direct` 模式零改动**：`messageHandlers.js` 和 `modelProviders.js` 保持原样，新后端只是并列扩展。
