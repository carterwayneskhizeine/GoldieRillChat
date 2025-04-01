# 语音识别模块

这个模块提供了实时语音识别功能，允许用户通过语音输入文本到应用程序中。

## 功能特点

- 实时语音识别与文本转换
- 标题栏实时显示识别的文本（白色高亮显示）
- 自动插入文本到活跃输入框
- 支持键盘快捷键(Ctrl+R)
- 智能的输入焦点检测和处理
- 自动超时停止（默认60秒）
- 多级错误处理与用户友好的通知系统
- 无输入框时自动复制到剪贴板功能
- 针对React组件优化的DOM操作

## 使用方法

### 1. 导入模块

```jsx
import { useSpeechRecognition, showNotification } from '../modules/SpeechRecognition';
```

### 2. 使用Hook

```jsx
function MyComponent() {
  // 使用语音识别Hook
  const {
    isRecording,       // 当前录音状态
    recordedText,      // 已识别的文本
    recordingSessionId, // 当前录音会话ID
    startRecording,    // 开始录音函数
    stopRecording,     // 停止录音函数
    handleVoiceShortcut // 键盘快捷键处理函数
  } = useSpeechRecognition({
    timeout: 60000,        // 可选，超时时间，默认60秒
    pollingInterval: 1000  // 可选，轮询间隔，默认1秒
  });

  // 添加快捷键监听
  useEffect(() => {
    document.addEventListener('keydown', handleVoiceShortcut);
    
    return () => {
      document.removeEventListener('keydown', handleVoiceShortcut);
    };
  }, [handleVoiceShortcut]);

  // 渲染UI，可以选择在标题栏中显示识别文本
  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? '停止录音' : '开始录音'}
      </button>
      
      {/* 语音识别文本会自动显示在标题栏中，无需额外显示 */}
    </div>
  );
}
```

### 3. 显示通知

```jsx
// 显示成功通知
showNotification('操作成功', 'success');

// 显示错误通知
showNotification('发生错误', 'error');

// 显示信息通知
showNotification('提示信息', 'info');
```

## API参考

### useSpeechRecognition

一个自定义Hook，提供语音识别功能。

#### 参数

- `options` (可选): 配置对象
  - `timeout`: 录音超时时间(毫秒)，默认60000
  - `pollingInterval`: 结果轮询间隔(毫秒)，默认1000

#### 返回值

返回一个包含以下属性的对象:

- `isRecording`: 布尔值，表示当前是否正在录音
- `recordedText`: 字符串，当前识别的文本
- `recordingSessionId`: 字符串，当前录音会话的ID
- `startRecording`: 函数，开始录音
- `stopRecording`: 函数，停止录音
- `handleVoiceShortcut`: 函数，处理键盘快捷键(Ctrl+R)

### showNotification

显示通知的函数。

#### 参数

- `message`: 字符串，通知消息
- `type`: 字符串，通知类型，可选值: 'info'(默认), 'success', 'error'

### insertTextToActiveElement

将文本插入到当前活跃的输入框。

#### 参数

- `text`: 字符串，要插入的文本
- `isEnd`: 布尔值，表示是否是句子结束，如果是则会在文本后添加空格

#### 返回值

布尔值，表示文本是否成功插入

## 后端API需求

此模块需要以下后端API支持:

- `/api/speech/test`: 测试语音识别服务连接
- `/api/speech/results?session_id={sessionId}`: 获取识别结果
- `/api/speech/start`: 开始录音，POST请求，body中包含`session_id`
- `/api/speech/stop`: 停止录音，POST请求，body中包含`session_id`

## 标题栏显示

当语音识别激活时，识别的文本会自动显示在应用标题栏中：

- 文本以白色高亮显示，确保在各种背景下都清晰可见
- 识别过程中会实时更新显示的文本
- 无需开发者额外添加代码，只需使用`useSpeechRecognition`钩子

## 兼容性和依赖

- 需要连接到本地语音识别服务器（默认端口2047）
- 支持主流现代浏览器
- 优化了React应用中的使用体验 