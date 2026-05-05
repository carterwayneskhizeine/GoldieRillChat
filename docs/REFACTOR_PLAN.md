# GoldieRillChat 重构与改进计划

> 编写日期：2026-04-29
> 适用版本：v2.0.1
> 目标：在保留全部现有功能的前提下，降低维护成本、提升代码质量与长期可演进性。

---

## 一、现状诊断（要解决的核心问题）

| 编号 | 问题 | 影响 |
|------|------|------|
| P1 | `App.jsx` (1958 行) / `ChatView.jsx` (1997 行) / `electron/main.js` (3716 行) / `TitleBar.jsx` (1366 行) / `Embedding.jsx` (1351 行) 等巨型文件 | 改一处影响一片，难以定位 bug，新成员上手成本高 |
| P2 | 缺少全局状态管理，所有状态集中在 `App.jsx`，props drilling 严重 | 任何状态新增都要改 App + 中间组件 + 叶子组件 |
| P3 | 工具间通信使用 `window.dispatchEvent` + `localStorage`（11 个文件涉及） | 时序难追踪、难以单测、状态可能不一致 |
| P4 | 同时引入 Ant Design + MUI + DaisyUI 三套 UI 库 + emotion + styled-components | bundle 体积大、视觉风格不统一、维护负担重 |
| P5 | 无任何测试基建 | 重构高风险，回归只能靠手测 |
| P6 | `electron/main.js` 单文件 3716 行，混合了窗口、IPC、协议、文件 I/O、BrowserView 等多种职责 | 主进程是性能与安全的关键，难以审计 |
| P7 | `.bak` 文件入库（如 `SettingsModal.jsx.bak`、`speech_server.py.bak`） | 仓库噪音 |
| P8 | API Key、设置全部裸存 localStorage | 桌面端可接受但应使用 Electron `safeStorage` 加密 |
| P9 | 大量 `*Handlers.js` 散落在 `components/` 目录（约 15 个） | 业务逻辑与组件目录混杂，命名缺乏一致性 |
| P10 | 无 TypeScript（除 `CustomPhotoEditor` 外） | 大型项目缺少类型保护 |

---

## 二、改进策略与优先级

按"投入产出比"排序，分四个阶段，每阶段独立可发布、可回滚。

### 阶段 0：清理与基础设施（约 1–2 天）

**目标：把仓库收拾干净，铺好后续重构的轨道。**

- [ ] 删除所有 `.bak` 文件，加入 `.gitignore`
  - `src/components/AIChat/components/SettingsModal.jsx.bak`
  - `speech_server.py.bak`
- [ ] 在 `.gitignore` 增加 `*.bak`、`*.tmp`、`.DS_Store`
- [ ] **删除语音识别相关文件**：
  - `speech_server.py` （主语音服务文件）
  - `speech_server.py.bak` （备份文件）
  - 其他语音相关的 Python 脚本和配置文件
- [ ] 引入 ESLint + Prettier，统一代码风格（先用宽松规则跑通，不强制改动现有代码）
- [ ] 引入 Vitest + React Testing Library（仅搭建，不强制覆盖率）
- [ ] 为关键纯函数（`messageUtils`、`db.js` 等）补少量冒烟测试，验证测试链路打通
- [ ] 在 `package.json` 中加 `lint` / `test` / `typecheck` 三个脚本
- [ ] 创建 `CHANGELOG.md`，从本次重构开始记录

**验收**：`npm run lint` / `npm run test` 都能跑通，CI 可选地接入 GitHub Actions。

---

### 阶段 1：状态管理与事件总线收敛（约 3–5 天）

**目标：解决 P2、P3，让数据流变得可追踪。**

#### 1.1 引入 Zustand

- [ ] `npm i zustand`，按领域拆分 store：
  - `src/stores/useToolStore.js` —— activeTool、tool 切换
  - `src/stores/useConversationStore.js` —— 会话列表、当前会话、消息
  - `src/stores/useSettingsStore.js` —— API key、模型选择、UI 偏好
  - `src/stores/useUIStore.js` —— sidebar 折叠、modal 状态等
- [ ] 使用 `zustand/middleware` 的 `persist` 替代手写的 localStorage 读写
- [ ] 渐进迁移：先把 `App.jsx` 顶层最痛的 5–8 个 state 搬到 store，其它保持原样
- [ ] 配合 React DevTools，验证组件订阅粒度合理（避免无关重渲染）

#### 1.2 替换 DOM CustomEvent 通信

- [ ] 梳理现有事件清单（已知的：`switchTool`、`tool-changed`、`editImage`、`show-link-dialog`，可能还有更多）
- [ ] 优先级：
  - **能用 store 替代** → 改 store（如 `switchTool` → `useToolStore.setActiveTool`）
  - **必须保留事件语义**（如组件外的 IPC 转发） → 封装到 `src/utils/eventBus.js`，提供 `on/off/emit` 类型化 API
- [ ] 删除散落在组件中的裸 `window.dispatchEvent`

#### 1.3 拆 props drilling

- [ ] 识别 `App.jsx` 中超过 2 层传递的 props，改为子组件直接读 store

**验收**：`App.jsx` 行数下降 30% 以上；新增功能不再需要修改 `App.jsx`。

---

### 阶段 2：拆解巨型文件（约 1–2 周）

**目标：解决 P1、P9。每个文件不超过约 500 行。**

#### 2.1 拆 `App.jsx` (1958 → 目标 < 300)

- [ ] 抽离 `<AppShell>`：TitleBar + Sidebar + 主内容路由
- [ ] 抽离 `<ToolRouter>`：根据 `activeTool` 渲染对应工具组件（懒加载 + Suspense）
- [ ] 抽离全局副作用为 hooks：`useGlobalShortcuts`、`useToolSwitchListener`、`useThemeSync` 等
- [ ] 顶层只保留：Provider 包裹 + AppShell + 全局 Toast/Modal 容器

#### 2.2 拆 `ChatView.jsx` (1997 → 目标 < 400)

参考 `AIChat/` 的子目录结构，对 `ChatView` 做同样的处理：
- [ ] `ChatView/index.jsx` —— 容器
- [ ] `ChatView/components/` —— MessageList / InputArea / Header 等
- [ ] `ChatView/hooks/` —— `useChatScroll`、`useMessageDrag` 等
- [ ] `ChatView/handlers/` —— 把现有零散的 `*Handlers.js` 归位（messageMovement、messageOperations、messageCollapse 等）
- [ ] 删除根 `components/` 目录下重复职责的 handler 文件

#### 2.3 拆 `electron/main.js` (3716 → 目标 < 500)

按职责拆分到 `electron/` 子模块：
- [ ] `electron/window.js` —— BrowserWindow 创建与管理
- [ ] `electron/browserView.js` —— 内嵌浏览器逻辑
- [ ] `electron/protocols.js` —— `local-file://`、`app-resource://` 注册
- [ ] `electron/ipc/` —— 按业务域拆 IPC handler（`ipc/file.js`、`ipc/conversation.js`、`ipc/speech.js` 等）
- [ ] `electron/security.js` —— CSP、navigation 拦截、权限
- [ ] `electron/main.js` 只负责 app 生命周期 + 装配各模块

#### 2.4 拆 `TitleBar.jsx` / `Embedding.jsx` / `Sidebar.jsx`

- [ ] 同样思路：把内部小组件、菜单项、设置面板拆出去
- [ ] `Embedding.jsx` 重点抽 `services/embeddingService.js`，组件只管 UI
- [ ] **重要：Embedding 功能将被移除**，包括：
  - `Embedding.jsx` (1351 行) 及其相关组件
  - `src/services/KnowledgeBaseService.js` 中的 Embedding 相关功能（`embedText`、`mockEmbedText`、`siliconFlowEmbed`、`cosineSimilarity`、`getEmbeddingApiConfig` 等）
  - 知识库中的向量嵌入、相似度计算、重排序功能
  - 所有与向量数据库、嵌入模型相关的配置和代码

#### 2.5 移除语音识别功能模块

- [ ] **删除语音识别相关的所有代码和配置**，包括：
  - `speech_server.py` 及相关 Python 后端服务
  - 语音识别相关的 UI 组件（如语音输入按钮、语音设置面板）
  - `src/services/` 中的语音服务相关文件
  - `components/` 中的语音识别相关组件
  - Electron IPC 中语音相关的通信通道
  - 所有与语音识别、语音转文字相关的配置、事件监听器和状态管理
  - `package.json` 中的语音识别相关依赖（如有）

**验收**：`find src -name "*.jsx" -o -name "*.js" | xargs wc -l | sort -rn | head` 中无文件超过 600 行。

---

### 阶段 3：UI 库收敛与依赖瘦身（约 3–5 天）

**目标：解决 P4，统一视觉，缩小 bundle。**

- [ ] 选定**唯一**主 UI 库。建议保留 **DaisyUI + TailwindCSS**（最轻、与项目风格匹配）
- [ ] 评估 Ant Design 与 MUI 的实际用量：
  - 用 `grep -r "from 'antd'" src | wc -l` 与 `from '@mui` 各统计一次
  - 用量少的一方优先迁移到 DaisyUI 或自定义组件
  - 用量多的一方分阶段迁移
- [ ] 移除 `styled-components` 与 `@emotion`（若仅 MUI 依赖，则随 MUI 一同移除）
- [ ] **移除语音识别相关的依赖和配置**：
  - 检查并移除 `package.json` 中的语音识别相关依赖
  - 移除语音识别相关的 npm scripts（如 `start:speech` 等）
  - 清理语音识别相关的环境变量和配置文件
- [ ] 检查并移除未使用的依赖：用 `npx depcheck` 跑一遍
- [ ] 重新评估 `pyodide`（27MB+）是否真的在用；如非核心可懒加载或剔除

**验收**：`dist/` 体积下降目标 ≥ 30%；`package.json` 中 dependencies 数量下降 ≥ 20%。

---

### 阶段 4：安全、类型与质量提升（约 1 周，可与上面并行）

**目标：解决 P5、P8、P10。**

#### 4.1 安全

- [ ] API Key 存储改用 Electron `safeStorage.encryptString`，迁移时提供一次性自动迁移脚本
- [ ] 审计 `electron/main.js`：确认 `nodeIntegration: false` / `contextIsolation: true` / `sandbox: true`
- [ ] 给所有 `BrowserView` 配置 CSP 与 `setWindowOpenHandler`，限制外链
- [ ] IPC 通道做白名单校验，避免 preload 暴露过宽 API
- [ ] **移除语音识别相关的 IPC 通道和权限配置**：
  - 清理 `preload.js` 中语音识别相关的 API 暴露
  - 移除 `electron/main.js` 中语音识别相关的 IPC 处理器
  - 删除麦克风访问权限相关的配置

#### 4.2 渐进 TypeScript

- [ ] `vite.config.js` 启用 `.ts/.tsx` 解析（已默认支持）
- [ ] 新写的文件一律用 TS
- [ ] 把 `services/`、`utils/`、`stores/` 这种纯逻辑层优先改 TS（收益最大）
- [ ] 组件层不强制，按需迁移
- [ ] 加 `tsconfig.json`，初期 `strict: false`，逐步收紧

#### 4.3 测试

- [ ] services 层覆盖率目标 60%+（API 调用 mock）
- [ ] stores 层覆盖率目标 80%+（纯函数好测）
- [ ] 关键组件用 RTL 写少量交互测试（消息发送、工具切换、设置保存）
- [ ] 确认无 Embedding 和语音识别相关的测试代码遗留

---

## 三、执行节奏建议

| 周次 | 阶段 | 主要产出 |
|------|------|----------|
| W1 | 阶段 0 + 阶段 1.1 | 仓库清理（含删除语音识别文件），Zustand 落地，`App.jsx` 状态搬迁完毕 |
| W2 | 阶段 1.2/1.3 + 阶段 2.1 | 事件总线收敛，App.jsx 拆完 |
| W3 | 阶段 2.2 | ChatView 拆完 |
| W4 | 阶段 2.3 + 2.4 | electron/main.js 拆完，移除 Embedding 功能 |
| W5 | 阶段 2.5 + 阶段 3 | 移除语音识别功能，UI 库收敛，依赖瘦身 |
| W6+ | 阶段 4 | 安全、TS、测试持续推进 |

---

## 四、风险与回滚

- **每个阶段一个分支、一个 PR**，控制单次变更范围。
- **行为不变** 是最高优先级——每阶段结束后跑一次完整手测脚本（见下）。
- 重构期间**冻结新功能**，避免与重构冲突。

### 手测脚本（每阶段末必跑）

1. 启动 `npm run electron:dev`，应用正常打开。
2. 切换 6 个工具（Ctrl+1–6），全部正常。
3. AI Chat：连一次 OpenAI / Claude / DeepSeek，能正常收发消息。
4. Browser：打开任意网页，BrowserView 正常嵌入。
5. ThreeJS Shader：切换至少 2 个预设，渲染正常。
6. 创建 / 重命名 / 删除会话；上传一张图片附件；切到笔记类型消息。
7. 知识库：新建一个，添加一段文本，做一次检索。
8. `npm run electron:build` 完整出包成功。

---

## 五、不在本计划内的事项

以下条目刻意不做，避免范围蔓延：

- 不重写 Three.js Shader 渲染逻辑（功能稳定，无收益）
- 不改 Python 语音后端的架构（与重构主线无关）
- **不保留或改进 Embedding 功能，将完全移除**
- **不保留或改进语音识别功能，将完全移除**
- 不引入 Web 化 / 多端同步（产品定位是本地桌面应用）
- 不更换打包工具（Vite + electron-builder 够用）

---

## 六、完成定义（DoD）

重构完成的硬性指标：

- [ ] 任何单文件不超过 600 行
- [ ] `App.jsx` < 300 行
- [ ] `electron/main.js` < 500 行
- [ ] 0 个 `window.dispatchEvent` 用于跨工具通信
- [ ] 单一主 UI 库（DaisyUI），dependencies 数量下降 ≥ 20%
- [ ] services 层 60%+ 测试覆盖
- [ ] API Key 加密存储
- [ ] CI 上 lint / typecheck / test 全绿
- [ ] 手测脚本 8 项全部通过
- [ ] **Embedding 功能已完全移除**：
  - [ ] `Embedding.jsx` 及相关组件已删除
  - [ ] `KnowledgeBaseService.js` 中的 Embedding 相关代码已清理
  - [ ] 向量嵌入、相似度计算、重排序功能已移除
- [ ] **语音识别功能已完全移除**：
  - [ ] `speech_server.py` 及相关 Python 文件已删除
  - [ ] 语音识别 UI 组件和按钮已移除
  - [ ] 语音服务相关代码已清理
  - [ ] Electron IPC 中语音相关通道已移除
