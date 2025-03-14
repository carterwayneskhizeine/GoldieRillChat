# 语音识别模块

这个模块提供了实时语音识别功能，允许用户通过语音输入文本到应用程序中。

## 功能特点

- 实时语音识别
- 自动插入文本到活跃输入框
- 支持键盘快捷键(Ctrl+Shift+M)
- 语音输入状态管理
- 超时自动停止
- 结果轮询机制
- 优雅的错误处理和通知

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

  // 渲染UI
  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? '停止录音' : '开始录音'}
      </button>
      
      {isRecording && <span>正在录音... {recordedText}</span>}
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
- `handleVoiceShortcut`: 函数，处理键盘快捷键(Ctrl+Shift+M)

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

- `/api/speech/get_results?id={sessionId}`: 获取识别结果
- `/api/speech/start_recording?id={sessionId}`: 开始录音
- `/api/speech/stop_recording?id={sessionId}`: 停止录音

## 兼容性

模块需要运行在支持Web Speech API或设备麦克风访问的现代浏览器中。 