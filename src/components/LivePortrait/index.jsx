import React, { useState, useEffect } from 'react';
import toastManager from '../../utils/toastManager';
import axios from 'axios';
import eventBus from '../ThreeBackground/utils/eventBus';
import './LivePortrait.css';
import MediaUrlHelper from './MediaUploader';

const LivePortrait = ({ storagePath }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [generationTaskId, setGenerationTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [ipcAvailable, setIpcAvailable] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [mode, setMode] = useState('liveportrait');
  const [videoUrl, setVideoUrl] = useState('');
  const [refImageUrl, setRefImageUrl] = useState('');
  const [videoExtension, setVideoExtension] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  useEffect(() => {
    // 检查Electron IPC是否可用
    const checkElectronIpc = () => {
      if (window.electron && window.electron.ipcRenderer) {
        setIpcAvailable(true);
        
        // 设置IPC响应处理器
        window.electron.ipcRenderer.on('dashscope-detect-response', handleDetectResponse);
        window.electron.ipcRenderer.on('dashscope-synthesis-response', handleSynthesisResponse);
        window.electron.ipcRenderer.on('dashscope-task-status', handleTaskStatusResponse);
        window.electron.ipcRenderer.on('dashscope-videoretalk-response', handleVideoRetalkResponse);
        
        return true;
      }
      return false;
    };
    
    checkElectronIpc();
    
    // 组件卸载时清理事件监听
    return () => {
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.removeAllListeners('dashscope-detect-response');
        window.electron.ipcRenderer.removeAllListeners('dashscope-synthesis-response');
        window.electron.ipcRenderer.removeAllListeners('dashscope-task-status');
        window.electron.ipcRenderer.removeAllListeners('dashscope-videoretalk-response');
      }
    };
  }, []);
  
  // IPC响应处理器
  const handleDetectResponse = (event, response) => {
    setIsDetecting(false);
    if (response.error) {
      toastManager.error(`图片检测失败: ${response.error}`);
      return;
    }
    
    setDetectionResult(response.output);
    if (response.output.pass) {
      toastManager.success('图片检测通过！');
    } else {
      toastManager.error(`图片检测未通过: ${response.output.message}`);
    }
  };
  
  const handleSynthesisResponse = (event, response) => {
    if (response.error) {
      toastManager.error(`提交视频生成任务失败: ${response.error}`);
      setIsGenerating(false);
      return;
    }
    
    const taskId = response.output.task_id;
    setGenerationTaskId(taskId);
    setTaskStatus('PENDING');
    toastManager.info('视频生成任务已提交，正在生成中...');
    
    // 通过主进程轮询任务状态
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('dashscope-poll-task', {
        taskId
      });
    } else {
      // 回退到直接轮询
      pollTaskStatus(taskId);
    }
  };
  
  const handleTaskStatusResponse = (event, response) => {
    if (response.error) {
      toastManager.error(`检查任务状态失败: ${response.error}`);
      setIsGenerating(false);
      return;
    }
    
    const status = response.output.task_status;
    setTaskStatus(status);
    
    if (status === 'SUCCEEDED') {
      // 任务成功完成
      // 视频URL可能在不同路径 - LivePortrait和VideoRetalk API响应结构不同
      let videoUrl = null;
      
      // 如果是LivePortrait API响应结构
      if (response.output.results && response.output.results.video_url) {
        videoUrl = response.output.results.video_url;
      } 
      // 如果是VideoRetalk API响应结构
      else if (response.output.video_url) {
        videoUrl = response.output.video_url;
      }
      
      if (!videoUrl) {
        toastManager.error('视频生成成功，但未获取到下载链接');
        setIsGenerating(false);
        return;
      }
      
      // 清除可能的进行中提示
      setIsGenerating(false);
      
      // 显示成功消息
      toastManager.success('视频生成成功！可以点击下方链接下载');
      
      // 设置下载链接
      setVideoDownloadUrl(videoUrl);
    } else if (status === 'FAILED') {
      // 任务失败
      setIsGenerating(false);
      
      // 显示错误消息
      toastManager.error(`视频生成失败: ${response.output.message || '未知错误'}`);
    }
    // 如果仍在进行中，主进程会继续轮询
  };

  const detectImage = async () => {
    if (!imageUrl) {
      toastManager.error('请输入图片URL');
      return;
    }

    // 验证URL是否有效
    try {
      const isValid = await MediaUrlHelper.validateUrl(imageUrl);
      if (!isValid) {
        toastManager.error('图片URL无效或无法访问');
        return;
      }
    } catch (error) {
      // 即使验证失败也继续，因为可能是CORS问题
      console.warn('URL验证警告:', error);
    }

    setIsDetecting(true);
    setDetectionResult(null);

    try {
      if (ipcAvailable && window.electron && window.electron.ipcRenderer) {
        // API密钥已在主进程从环境变量或.env.local文件中获取，不需要从localStorage获取
        window.electron.ipcRenderer.send('dashscope-detect', {
          imageUrl: imageUrl,
          apiKey: null // 设为null，让主进程使用环境变量或.env.local中的密钥
        });
      } else {
        // 回退到直接调用API（可能会有CORS问题）
        fallbackDetectImage(imageUrl);
      }
    } catch (error) {
      toastManager.error(`图片检测失败: ${error.message}`);
      setIsDetecting(false);
    }
  };
  
  // 直接API调用的回退方法（可能有CORS问题）
  const fallbackDetectImage = async (imageUrl) => {
    try {
      // 使用代理URL调用LivePortrait-detect API
      const response = await axios.post(
        '/api/dashscope/api/v1/services/aigc/image2video/face-detect',
        {
          model: 'liveportrait-detect',
          input: {
            image_url: imageUrl
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      setDetectionResult(response.data.output);
      
      if (response.data.output.pass) {
        toastManager.success('图片检测通过！');
      } else {
        toastManager.error(`图片检测未通过: ${response.data.output.message}`);
      }
    } catch (error) {
      toastManager.error(`图片检测失败: ${error.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const generateVideo = async () => {
    if (!detectionResult || !detectionResult.pass) {
      toastManager.error('请先进行图片检测并确保通过');
      return;
    }

    if (!audioUrl) {
      toastManager.error('请输入音频URL');
      return;
    }

    // 验证URL是否有效
    try {
      const isValid = await MediaUrlHelper.validateUrl(audioUrl);
      if (!isValid) {
        toastManager.error('音频URL无效或无法访问');
        return;
      }
    } catch (error) {
      // 即使验证失败也继续，因为可能是CORS问题
      console.warn('URL验证警告:', error);
    }

    setIsGenerating(true);
    
    try {
      toastManager.info('准备生成视频...', 3000);  // 设置3秒后自动消失
      
      // 使用新ID来确保toast唯一性
      const processingToastId = `processing-${Date.now()}`;
      toastManager.show({
        message: '开始生成视频...',
        type: 'info',
        duration: 3000,
        id: processingToastId  // 添加唯一ID
      });
      
      if (ipcAvailable && window.electron && window.electron.ipcRenderer) {
        // API密钥已在主进程从环境变量或.env.local文件中获取，不需要从localStorage获取
        window.electron.ipcRenderer.send('dashscope-synthesis', {
          imageUrl: imageUrl,
          audioUrl: audioUrl,
          apiKey: null // 设为null，让主进程使用环境变量或.env.local中的密钥
        });
      } else {
        // 回退到直接调用API（可能会有CORS问题）
        fallbackGenerateVideo(imageUrl, audioUrl);
      }
    } catch (error) {
      toastManager.error(`提交视频生成任务失败: ${error.message}`);
      setIsGenerating(false);
    }
  };
  
  // 直接API调用的回退方法（可能有CORS问题）
  const fallbackGenerateVideo = async (imageUrl, audioUrl) => {
    try {
      // 使用代理URL调用LivePortrait API生成视频
      const response = await axios.post(
        '/api/dashscope/api/v1/services/aigc/image2video/video-synthesis/',
        {
          model: 'liveportrait',
          input: {
            image_url: imageUrl,
            audio_url: audioUrl
          },
          parameters: {
            template_id: 'normal',
            eye_move_freq: 0.5,
            video_fps: 30,
            mouth_move_strength: 1,
            paste_back: true,
            head_move_strength: 0.7
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'
          }
        }
      );

      const taskId = response.data.output.task_id;
      setGenerationTaskId(taskId);
      setTaskStatus('PENDING');
      toastManager.info('视频生成任务已提交，正在生成中...');
      
      // 开始轮询任务状态
      pollTaskStatus(taskId);
    } catch (error) {
      toastManager.error(`提交视频生成任务失败: ${error.message}`);
      setIsGenerating(false);
    }
  };

  const pollTaskStatus = async (taskId) => {
    try {
      // 使用代理URL查询任务状态
      const response = await axios.get(
        `/api/dashscope/api/v1/tasks/${taskId}`
      );

      const status = response.data.output.task_status;
      setTaskStatus(status);

      if (status === 'SUCCEEDED') {
        // 任务成功完成
        const videoUrl = response.data.output.results.video_url;
        
        // 清除可能的进行中提示
        setIsGenerating(false);
        
        // 显示成功消息
        toastManager.success('视频生成成功！可以点击下方链接下载');
        
        // 设置下载链接
        setVideoDownloadUrl(videoUrl);
      } else if (status === 'FAILED') {
        // 任务失败
        setIsGenerating(false);
        
        // 显示错误消息
        toastManager.error(`视频生成失败: ${response.data.output.message || '未知错误'}`);
      } else {
        // 任务仍在进行中，继续轮询
        setTimeout(() => pollTaskStatus(taskId), 5000); // 每5秒检查一次
      }
    } catch (error) {
      toastManager.error(`检查任务状态失败: ${error.message}`);
      setIsGenerating(false);
    }
  };

  const [videoDownloadUrl, setVideoDownloadUrl] = useState('');

  const toggleAdvancedSettings = () => {
    setShowAdvanced(!showAdvanced);
  };

  const useVideoAsBackground = async () => {
    if (!videoDownloadUrl) {
      toastManager.error('没有可用的视频');
      return;
    }
    
    try {
      // 下载视频
      const response = await axios({
        url: videoDownloadUrl,
        method: 'GET',
        responseType: 'blob'
      });
      
      // 创建临时URL
      const videoBlob = new Blob([response.data], { type: 'video/mp4' });
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      
      // 使用eventBus切换背景视频
      eventBus.toggleBackground(videoObjectUrl, true);
      toastManager.success('已设置为背景视频');
    } catch (error) {
      toastManager.error(`设置背景视频失败: ${error.message}`);
    }
  };

  const handleImageUrlChange = (e) => {
    setImageUrl(e.target.value);
  };
  
  const handleAudioUrlChange = (e) => {
    setAudioUrl(e.target.value);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setDetectionResult(null);
    setGenerationTaskId(null);
    setTaskStatus(null);
    setVideoDownloadUrl('');
  };

  const handleVideoUrlChange = (e) => {
    setVideoUrl(e.target.value);
  };
  
  const handleRefImageUrlChange = (e) => {
    setRefImageUrl(e.target.value);
  };

  const handleVideoExtensionChange = (e) => {
    setVideoExtension(e.target.checked);
  };

  // 添加VideoRetalk相关的处理函数
  const handleVideoRetalkResponse = (event, response) => {
    if (response.error) {
      toastManager.error(`提交视频生成任务失败: ${response.error}`);
      setIsGenerating(false);
      return;
    }
    
    const taskId = response.output.task_id;
    setGenerationTaskId(taskId);
    setTaskStatus('PENDING');
    toastManager.info('视频生成任务已提交，正在生成中...');
    
    // 通过主进程轮询任务状态
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('dashscope-poll-task', {
        taskId
      });
    } else {
      // 回退到直接轮询
      pollTaskStatus(taskId);
    }
  };

  // 添加生成VideoRetalk视频的函数
  const generateVideoRetalk = async () => {
    if (!videoUrl) {
      toastManager.error('请输入视频URL');
      return;
    }
    
    if (!audioUrl) {
      toastManager.error('请输入音频URL');
      return;
    }

    // 验证URL是否有效
    try {
      const isVideoValid = await MediaUrlHelper.validateUrl(videoUrl);
      const isAudioValid = await MediaUrlHelper.validateUrl(audioUrl);
      
      if (!isVideoValid) {
        toastManager.error('视频URL无效或无法访问');
        return;
      }
      
      if (!isAudioValid) {
        toastManager.error('音频URL无效或无法访问');
        return;
      }
      
      if (refImageUrl) {
        const isRefImageValid = await MediaUrlHelper.validateUrl(refImageUrl);
        if (!isRefImageValid) {
          toastManager.error('参考图URL无效或无法访问');
          return;
        }
      }
    } catch (error) {
      // 即使验证失败也继续，因为可能是CORS问题
      console.warn('URL验证警告:', error);
    }

    setIsGenerating(true);
    
    try {
      toastManager.info('准备生成视频...', 3000);  // 设置3秒后自动消失
      
      // 使用新ID来确保toast唯一性
      const processingToastId = `processing-${Date.now()}`;
      toastManager.show({
        message: '开始生成视频...',
        type: 'info',
        duration: 3000,
        id: processingToastId
      });
      
      if (ipcAvailable && window.electron && window.electron.ipcRenderer) {
        // API密钥已在主进程从环境变量或.env.local文件中获取，不需要从localStorage获取
        window.electron.ipcRenderer.send('dashscope-videoretalk', {
          videoUrl: videoUrl,
          audioUrl: audioUrl,
          refImageUrl: refImageUrl,
          videoExtension: videoExtension,
          apiKey: null // 设为null，让主进程使用环境变量或.env.local中的密钥
        });
      } else {
        // 回退到直接调用API（可能会有CORS问题）
        fallbackGenerateVideoRetalk(videoUrl, audioUrl, refImageUrl);
      }
    } catch (error) {
      toastManager.error(`提交视频生成任务失败: ${error.message}`);
      setIsGenerating(false);
    }
  };
  
  // 直接API调用的回退方法（可能有CORS问题）
  const fallbackGenerateVideoRetalk = async (videoUrl, audioUrl, refImageUrl = '') => {
    try {
      // 准备请求数据
      const requestData = {
        model: 'videoretalk',
        input: {
          video_url: videoUrl,
          audio_url: audioUrl
        },
        parameters: {
          video_extension: videoExtension
        }
      };
      
      // 如果有参考图片URL，添加到请求中
      if (refImageUrl) {
        requestData.input.ref_image_url = refImageUrl;
      }
      
      // 使用代理URL调用VideoRetalk API
      const response = await axios.post(
        '/api/dashscope/api/v1/services/aigc/image2video/video-synthesis/',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'
          }
        }
      );

      const taskId = response.data.output.task_id;
      setGenerationTaskId(taskId);
      setTaskStatus('PENDING');
      toastManager.info('视频生成任务已提交，正在生成中...');
      
      // 开始轮询任务状态
      pollTaskStatus(taskId);
    } catch (error) {
      toastManager.error(`提交视频生成任务失败: ${error.message}`);
      setIsGenerating(false);
    }
  };

  return (
    <div className="liveportrait-container">
      <h2>AI人像生成</h2>
      
      <div className="mode-switch">
        <button 
          className={`mode-button ${mode === 'liveportrait' ? 'active' : ''}`}
          onClick={() => handleModeChange('liveportrait')}
        >
          灵动人像
        </button>
        <button 
          className={`mode-button ${mode === 'videoretalk' ? 'active' : ''}`}
          onClick={() => handleModeChange('videoretalk')}
        >
          声动人像
        </button>
      </div>
      
      <div className="mode-description">
        {mode === 'liveportrait' ? (
          <p>灵动人像：提供静态人物图片URL和音频URL，生成说话视频</p>
        ) : (
          <p>声动人像：提供人物视频URL和音频URL，生成口型匹配的新视频</p>
        )}
      </div>
      
      {mode === 'videoretalk' && (
        <div className="advanced-toggle" onClick={toggleAdvancedSettings}>
          {showAdvanced ? '隐藏高级设置 ▲' : '显示高级设置 ▼'}
        </div>
      )}
      
      {mode === 'videoretalk' && showAdvanced && (
        <div className="advanced-settings">
          <div className="checkbox-section">
            <label>
              <input 
                type="checkbox" 
                checked={videoExtension} 
                onChange={handleVideoExtensionChange}
              />
              视频扩展（当音频长于视频时扩展视频长度）
            </label>
          </div>
        </div>
      )}

      <div className="url-input-section">
        {mode === 'liveportrait' ? (
          <>
            <div className="url-item">
              <label htmlFor="imageUrlInput">图片URL:</label>
              <input 
                type="text" 
                id="imageUrlInput" 
                value={imageUrl} 
                onChange={handleImageUrlChange} 
                placeholder="输入网络图片URL"
              />
            </div>
            
            <div className="url-item">
              <label htmlFor="audioUrlInput">音频URL:</label>
              <input 
                type="text" 
                id="audioUrlInput" 
                value={audioUrl} 
                onChange={handleAudioUrlChange} 
                placeholder="输入网络音频URL"
              />
            </div>
          </>
        ) : (
          <>
            <div className="url-item">
              <label htmlFor="videoUrlInput">视频URL:</label>
              <input 
                type="text" 
                id="videoUrlInput" 
                value={videoUrl} 
                onChange={handleVideoUrlChange} 
                placeholder="输入网络视频URL"
              />
            </div>
            
            <div className="url-item">
              <label htmlFor="audioUrlInput">音频URL:</label>
              <input 
                type="text" 
                id="audioUrlInput" 
                value={audioUrl} 
                onChange={handleAudioUrlChange} 
                placeholder="输入网络音频URL"
              />
            </div>
            
            <div className="url-item">
              <label htmlFor="refImageUrlInput">参考图URL (可选):</label>
              <input 
                type="text" 
                id="refImageUrlInput" 
                value={refImageUrl} 
                onChange={handleRefImageUrlChange} 
                placeholder="输入网络图片URL作为人脸参考"
              />
            </div>
          </>
        )}
      </div>

      <div className="image-preview">
        {mode === 'liveportrait' ? (
          imageUrl ? (
            <img src={imageUrl} alt="预览" style={{ maxWidth: '100%', maxHeight: '200px' }} />
          ) : null
        ) : (
          <>
            {videoUrl && (
              <div className="preview-item">
                <p>视频URL: {videoUrl}</p>
              </div>
            )}
            {refImageUrl && (
              <div className="preview-item">
                <p>参考图URL: {refImageUrl}</p>
                <img src={refImageUrl} alt="参考图预览" style={{ maxWidth: '100%', maxHeight: '100px' }} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="status-section">
        {!ipcAvailable && (
          <p className="warning">警告: 无法使用Electron IPC通信，API调用可能会被CORS限制</p>
        )}
        
        {mode === 'liveportrait' ? (
          <>
            {audioUrl && (
              <p>音频URL: {audioUrl}</p>
            )}
            {detectionResult && (
              <p>检测结果: {detectionResult.pass ? '通过' : `未通过 - ${detectionResult.message}`}</p>
            )}
          </>
        ) : (
          <>
            {videoUrl && (
              <p>视频URL: {videoUrl}</p>
            )}
            {audioUrl && (
              <p>音频URL: {audioUrl}</p>
            )}
            {refImageUrl && (
              <p>参考图URL: {refImageUrl}</p>
            )}
          </>
        )}
        
        {taskStatus && (
          <p>
            任务状态: {
              taskStatus === 'PENDING' ? '等待中' : 
              taskStatus === 'RUNNING' ? '处理中' : 
              taskStatus === 'SUCCEEDED' ? '已完成' : '失败'
            }
          </p>
        )}
      </div>

      <div className="actions-section">
        {mode === 'liveportrait' ? (
          <>
            <button 
              onClick={detectImage} 
              disabled={isDetecting || !imageUrl}
              className={isDetecting ? 'loading' : ''}
            >
              {isDetecting ? '检测中...' : '检测图片'}
            </button>
            
            <button 
              onClick={generateVideo} 
              disabled={
                isGenerating || 
                !detectionResult?.pass || 
                !audioUrl
              }
              className={isGenerating ? 'loading' : ''}
            >
              {isGenerating ? '生成中...' : '生成视频'}
            </button>
          </>
        ) : (
          <button 
            onClick={generateVideoRetalk} 
            disabled={
              isGenerating || 
              !videoUrl || !audioUrl
            }
            className={isGenerating ? 'loading' : ''}
          >
            {isGenerating ? '生成中...' : '生成视频'}
          </button>
        )}
      </div>
      
      {videoDownloadUrl && (
        <div className="video-result">
          <h3>生成结果</h3>
          <div className="video-actions">
            <a 
              href={videoDownloadUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="download-link"
            >
              下载视频
            </a>
            <button onClick={useVideoAsBackground} className="bg-button">
              设为背景
            </button>
          </div>
        </div>
      )}

      <div className="note-section">
        <p className="note">注意: 请确保提供的URL是公开可访问的，且符合模型要求的格式和大小限制。</p>
        <p className="note">支持的格式: 视频(mp4,avi,mov), 音频(mp3,wav,aac), 图片(jpg,png,webp)</p>
      </div>
    </div>
  );
};

export default LivePortrait; 