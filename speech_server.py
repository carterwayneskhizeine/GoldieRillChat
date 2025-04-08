import os 
import re 
import sys 
from pathlib import Path 
 
# 尝试从.env.local文件读取API密钥 
def load_env_from_file(): 
    try: 
        # 尝试从应用同级目录读取.env.local 
        env_path = Path(os.path.dirname(sys.executable)) / '.env.local' 
        # 如果不是打包模式，尝试从当前目录读取 
        if not getattr(sys, 'frozen', False): 
            env_path = Path('.env.local') 
 
        if env_path.exists(): 
            print(f"正在从{env_path}读取环境变量...") 
            with open(env_path, 'r') as f: 
                for line in f: 
                    line = line.strip() 
                    if line and not line.startswith('#'): 
                        key, value = line.split('=', 1) 
                        # 只设置未定义的环境变量 
                        if key and value and not os.environ.get(key): 
                            os.environ[key] = value 
                            print(f"已设置环境变量: {key}") 
    except Exception as e: 
        print(f"读取.env.local文件时出错: {e}") 
 
# 在程序启动时加载环境变量 
load_env_from_file() 
 
import os 
import re 
import sys 
from pathlib import Path 
 
# 尝试�?env.local文件读取API密钥 
def load_env_from_file(): 
    try: 
        # 尝试从应用同级目录读�?env.local 
        env_path = Path(os.path.dirname(sys.executable)) / '.env.local' 
        # 如果不是打包模式，尝试从当前目录读取 
        if not getattr(sys, 'frozen', False): 
            env_path = Path('.env.local') 
 
        if env_path.exists(): 
            print(f"正在从{env_path}读取环境变量...") 
            with open(env_path, 'r') as f: 
                for line in f: 
                    line = line.strip() 
                    if line and not line.startswith('#'): 
                        key, value = line.split('=', 1) 
                        # 只设置未定义的环境变�?
                        if key and value and not os.environ.get(key): 
                            os.environ[key] = value 
                            print(f"已设置环境变量? {key}") 
    except Exception as e: 
        print(f"读取.env.local文件时出错? {e}") 
 
# 在程序启动时加载环境变量 
load_env_from_file() 
 
from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
import os
import sys
import logging
import time
import threading
import queue
import dashscope
import pyaudio
from dashscope.audio.asr import *
from dashscope.audio.tts_v2 import SpeechSynthesizer, AudioFormat, ResultCallback
import uuid
import json
import io
import glob
import signal
import base64
import traceback
from logging.handlers import RotatingFileHandler

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('speech_server')

app = Flask(__name__)
# 允许所有来源的CORS请求
CORS(app, resources={r"/*": {"origins": "*"}})

# 全局变量
recognition = None
audio_queue = queue.Queue()
results_queue = queue.Queue()
is_recording = False
current_session_id = None
processing_thread = None
stop_thread = threading.Event()

# 添加TTS相关的全局变量
tts_sessions = {}  # 存储会话ID -> TTS合成器的映射
tts_callbacks = {}  # 存储会话ID -> 回调对象的映射

# 音频设置
CHUNK = 3200       # 每次读取的帧数
FORMAT = pyaudio.paInt16  # 16位整型
CHANNELS = 1       # 单声道
RATE = 16000      # 采样率

# PyAudio实例和流
audio = None
stream = None

# 初始化DashScope API密钥
def init_dashscope_api_key():
    """
    初始化DashScope API密钥
    1. 优先从环境变量读取
    2. 然后尝试从.env.local文件读取
    """
    global api_key
    
    try:
        # 1. 尝试从环境变量读取
        if 'DASHSCOPE_API_KEY' in os.environ:
            api_key = os.environ['DASHSCOPE_API_KEY']
            print("从环境变量加载API密钥成功")
            return api_key
            
        # 2. 尝试从.env.local文件读取
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.startswith('DASHSCOPE_API_KEY='):
                            api_key = line.strip().split('=', 1)[1]
                            print("从.env.local文件加载API密钥成功")
                            return api_key
            except Exception as e:
                print(f"从.env.local读取API密钥失败: {e}")
                
        # 如果都没有找到API密钥，使用默认值
        print("警告: 未找到阿里云百炼API密钥，语音功能可能无法正常工作")
        return "<your-dashscope-api-key>"
        
    except Exception as e:
        print(f"初始化API密钥时发生错误: {e}")
        return "<your-dashscope-api-key>"

# 获取用户选择的存储目录
def get_user_storage_path():
    """获取用户在设置中选择的存储路径"""
    try:
        config_path = os.path.join(os.path.dirname(__file__), 'user_config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                if 'storagePath' in config and config['storagePath']:
                    # 确保路径存在
                    storage_path = config['storagePath']
                    audio_path = os.path.join(storage_path, 'audio_output')
                    if not os.path.exists(audio_path):
                        os.makedirs(audio_path)
                    logger.info(f'使用用户存储路径: {audio_path}')
                    return audio_path
    except Exception as e:
        logger.error(f'获取用户存储路径失败: {e}')
    
    # 如果没有用户设置的路径或出错，返回默认路径
    logger.info(f'使用默认存储路径: {TTS_OUTPUT_DIR}')
    return TTS_OUTPUT_DIR

# 语音识别回调类
class ParaformerCallback(RecognitionCallback):
    def __init__(self, session_id):
        self.session_id = session_id
        
    def on_open(self) -> None:
        logger.info(f'识别会话已打开: {self.session_id}')
        
    def on_close(self) -> None:
        logger.info(f'识别会话已关闭: {self.session_id}')
        
    def on_complete(self) -> None:
        logger.info(f'识别会话已完成: {self.session_id}')
        results_queue.put({
            'type': 'complete',
            'session_id': self.session_id,
            'message': '识别完成'
        })
        
    def on_error(self, message) -> None:
        logger.error(f'识别错误: {message.message}')
        logger.debug(f'识别错误详情: {vars(message) if hasattr(message, "__dict__") else str(message)}')
        try:
            # 尝试获取更详细的错误信息
            if hasattr(message, 'status_code'):
                logger.error(f'错误状态码: {message.status_code}')
            if hasattr(message, 'request_id'):
                logger.error(f'请求ID: {message.request_id}')
        except Exception as e:
            logger.error(f'解析错误信息失败: {e}')
            
        results_queue.put({
            'type': 'error',
            'session_id': self.session_id,
            'message': message.message
        })
        
    def on_event(self, result: RecognitionResult) -> None:
        try:
            sentence = result.get_sentence()
            logger.debug(f'收到识别事件: {sentence}')
            
            if 'text' in sentence:
                text = sentence['text']
                is_end = RecognitionResult.is_sentence_end(sentence)
                logger.info(f'识别结果: {text} (是否结束: {is_end})')
                
                if 'begin_time' in sentence and 'end_time' in sentence:
                    logger.debug(f'时间戳: 开始={sentence["begin_time"]}ms, 结束={sentence["end_time"]}ms')
                
                results_queue.put({
                    'type': 'text',
                    'session_id': self.session_id,
                    'text': text,
                    'is_end': is_end
                })
                
                if is_end:
                    logger.info(f'句子结束: {text}')
            else:
                logger.warning(f'识别事件中没有文本内容: {sentence}')
        except Exception as e:
            logger.error(f'处理识别事件时出错: {e}', exc_info=True)

# 添加TTS回调类
class TtsCallback(ResultCallback):
    def __init__(self, session_id):
        super().__init__()  # 调用父类初始化
        self.session_id = session_id
        self._player = None
        self._stream = None
        self.is_ready = False
        self.is_initialized = False
        self.voice = 'longxiaochun'  # 默认音色
        # 不在构造函数中初始化音频设备，避免冲突
        
    def on_open(self):
        logger.info(f'TTS会话已打开: {self.session_id}')
        # WebSocket连接已建立
        self.is_initialized = True
        logger.info(f'TTS WebSocket连接已建立: {self.session_id}')
        
    def on_complete(self):
        logger.info(f'TTS会话已完成: {self.session_id}')
        # 在播放完成时设置状态标志
        logger.info(f'TTS播放完成，设置完成标志: {self.session_id}')
        # 发送WebSocket完成事件
        try:
            if hasattr(self, '_ws') and self._ws:
                logger.info(f'发送TTS完成WebSocket事件: {self.session_id}')
        except Exception as e:
            logger.error(f'发送TTS完成事件失败: {e}')
        
    def on_error(self, error):
        logger.error(f'TTS错误: {error}')
        
    def on_close(self):
        logger.info(f'TTS会话已关闭: {self.session_id}')
        # 关闭音频流和播放器
        if self._stream:
            try:
                self._stream.stop_stream()
                self._stream.close()
                self._stream = None
                logger.info(f'已关闭音频流: {self.session_id}')
            except Exception as e:
                logger.error(f'关闭音频流时出错: {e}')
        
        if self._player:
            try:
                self._player.terminate()
                self._player = None
                logger.info(f'已终止音频播放器: {self.session_id}')
            except Exception as e:
                logger.error(f'终止音频播放器时出错: {e}')
        
        self.is_ready = False
        self.is_initialized = False
        
    def on_event(self, event):
        logger.debug(f'收到TTS事件: {event}')
        
    def on_data(self, data: bytes):
        # 延迟初始化音频设备，直到收到第一个音频数据
        if not self._player or not self._stream:
            try:
                logger.info(f'收到音频数据，初始化播放设备: {self.session_id}')
                self._player = pyaudio.PyAudio()
                self._stream = self._player.open(
                    format=pyaudio.paInt16,
                    channels=1,
                    rate=22050,
                    output=True
                )
                self.is_ready = True
                logger.info(f'音频设备初始化成功: {self.session_id}')
            except Exception as e:
                logger.error(f'初始化音频播放器失败: {e}')
                return
        
        # 播放音频数据
        logger.debug(f'收到音频数据: {len(data)} 字节')
        if self._stream and self.is_ready:
            try:
                self._stream.write(data)
                logger.debug(f'已播放 {len(data)} 字节音频')
            except Exception as e:
                logger.error(f'播放音频数据时出错: {e}')

# 音频处理线程函数 - 直接从麦克风读取数据
def audio_processing():
    global recognition, is_recording, audio, stream
    
    logger.info('音频处理线程已启动')
    
    try:
        # 创建PyAudio实例
        audio = pyaudio.PyAudio()
        
        # 打开音频流
        stream = audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        logger.info(f'已打开麦克风，采样率: {RATE}Hz, 单声道, 16位')
        
        # 主循环 - 从麦克风读取并发送数据
        while not stop_thread.is_set():
            if not is_recording:
                time.sleep(0.1)
                continue
                
            try:
                if is_recording and recognition:
                    # 直接从麦克风读取数据
                    audio_data = stream.read(CHUNK, exception_on_overflow=False)
                    
                    if len(audio_data) > 0:
                        logger.debug(f'从麦克风读取音频数据: {len(audio_data)}字节')
                        
                        # 直接发送给识别器
                        recognition.send_audio_frame(audio_data)
                        logger.debug('已发送音频数据帧')
                    
            except Exception as e:
                logger.error(f"音频处理错误: {e}", exc_info=True)
                
            time.sleep(0.01)
    
    except Exception as e:
        logger.error(f"初始化音频设备失败: {e}", exc_info=True)
    
    finally:
        # 清理资源
        logger.info('关闭音频处理线程...')
        if stream:
            stream.stop_stream()
            stream.close()
        
        if audio:
            audio.terminate()
            
        logger.info('音频处理线程已停止')

# 启动识别会话
@app.route('/api/speech/start', methods=['POST'])
def start_recognition():
    global recognition, is_recording, current_session_id, processing_thread, stop_thread
    
    if is_recording:
        return jsonify({'status': 'error', 'message': '已有一个识别会话在进行中'}), 400
    
    try:
        # 清空队列
        while not results_queue.empty():
            results_queue.get()
            
        # 重置停止标志
        stop_thread.clear()
        
        # 从请求中获取会话ID，如果没有则生成一个
        data = request.get_json(silent=True) or {}
        session_id = data.get('session_id', str(time.time()))
        current_session_id = session_id
        
        # 初始化DashScope API密钥
        init_dashscope_api_key()
        
        # 创建回调实例
        callback = ParaformerCallback(session_id)
        
        # 创建识别实例
        recognition = Recognition(
            model='paraformer-realtime-v2',  # 推荐的实时识别模型
            format='pcm',  # 音频格式
            sample_rate=RATE,  # 采样率
            semantic_punctuation_enabled=True,  # 启用语义断句
            callback=callback
        )
        
        # 启动识别
        recognition.start()
        
        # 启动音频处理线程 (如果尚未启动)
        if processing_thread is None or not processing_thread.is_alive():
            processing_thread = threading.Thread(target=audio_processing)
            processing_thread.daemon = True
            processing_thread.start()
        
        # 设置录音标志
        is_recording = True
        
        logger.info(f'已启动语音识别会话: {session_id}')
        
        return jsonify({
            'status': 'success',
            'message': '语音识别会话已启动',
            'session_id': session_id
        })
    except Exception as e:
        logger.error(f'启动识别会话失败: {e}', exc_info=True)
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 停止识别会话
@app.route('/api/speech/stop', methods=['POST'])
def stop_recognition():
    global recognition, is_recording, current_session_id
    
    if not is_recording:
        logger.warning('尝试停止不存在的识别会话')
        return jsonify({'status': 'error', 'message': '没有正在进行的识别会话'}), 400
    
    try:
        logger.info(f'停止识别会话: {current_session_id}')
        
        # 先设置标志，防止再接收新的音频数据
        is_recording = False
        
        # 停止识别
        if recognition:
            try:
                logger.debug('调用recognition.stop()停止识别')
                recognition.stop()
                logger.debug('recognition.stop()成功')
            except Exception as e:
                logger.error(f'调用recognition.stop()时出错: {e}', exc_info=True)
            finally:
                recognition = None
        else:
            logger.warning('识别对象为空，无需停止')
        
        logger.info(f'已停止语音识别会话: {current_session_id}')
        
        return jsonify({
            'status': 'success',
            'message': '语音识别会话已停止',
            'session_id': current_session_id
        })
    except Exception as e:
        logger.error(f'停止识别会话失败: {e}', exc_info=True)
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 获取识别结果
@app.route('/api/speech/results', methods=['GET'])
def get_results():
    results = []
    try:
        # 获取请求中的会话ID
        session_id = request.args.get('session_id', None)
        
        if session_id:
            logger.debug(f'获取会话ID: {session_id} 的识别结果')
        else:
            logger.debug('未提供会话ID，返回所有结果')
        
        # 获取所有可用的结果
        while not results_queue.empty():
            result = results_queue.get(False)
            # 如果提供了会话ID，只返回匹配的结果
            if session_id is None or ('session_id' in result and result['session_id'] == session_id):
                results.append(result)
            else:
                # 不匹配的结果放回队列
                results_queue.put(result)
            
        logger.debug(f'已返回识别结果: {len(results)} 条')
        return jsonify({'status': 'success', 'results': results})
    except Exception as e:
        logger.error(f'获取识别结果失败: {e}')
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 添加TTS相关的API端点
@app.route('/api/tts/start', methods=['POST'])
def start_tts():
    try:
        data = request.get_json(silent=True) or {}
        voice = data.get('voice', 'longxiaochun')  # 默认音色
        
        # 生成会话ID
        session_id = str(uuid.uuid4())
        
        # 初始化DashScope API密钥
        init_dashscope_api_key()
        
        # 创建回调实例
        callback = TtsCallback(session_id)
        # 保存音色信息便于会话重建
        callback.voice = voice
        
        logger.info(f'创建TTS合成器: 音色={voice}')
        
        # 创建TTS合成器
        try:
            synthesizer = SpeechSynthesizer(
                model="cosyvoice-v1",
                voice=voice,
                format=AudioFormat.PCM_22050HZ_MONO_16BIT,
                callback=callback
            )
            
            # 存储会话
            tts_sessions[session_id] = synthesizer
            tts_callbacks[session_id] = callback
            
            # 不等待WebSocket连接建立，立即返回
            # 我们在合成时会处理连接状态
            logger.info(f'已创建TTS会话: {session_id}, 音色: {voice}')
            
            return jsonify({
                'status': 'success',
                'message': 'TTS会话已创建',
                'session_id': session_id
            })
        except Exception as inner_e:
            logger.error(f'创建TTS合成器时出错: {inner_e}', exc_info=True)
            return jsonify({'status': 'error', 'message': f'创建合成器失败: {str(inner_e)}'}), 500
    except Exception as e:
        logger.error(f'创建TTS会话失败: {e}', exc_info=True)
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/tts/synthesize', methods=['POST'])
def synthesize_text():
    try:
        data = request.get_json(silent=True) or {}
        session_id = data.get('session_id')
        text = data.get('text', '')
        is_complete = data.get('is_complete', False)
        
        if not session_id:
            return jsonify({'status': 'error', 'message': '会话ID不能为空'}), 400
            
        if session_id not in tts_sessions:
            logger.warning(f'尝试在不存在的会话 {session_id} 上合成文本')
            return jsonify({'status': 'error', 'message': '会话不存在或已关闭'}), 404
            
        if not text and not is_complete:
            return jsonify({'status': 'error', 'message': '文本不能为空'}), 400
        
        synthesizer = tts_sessions[session_id]
        callback = tts_callbacks.get(session_id)
        
        # 记录会话状态以进行调试
        logger.debug(f'合成前会话状态: 会话ID={session_id}, 合成器存在={synthesizer is not None}, 回调存在={callback is not None}, WebSocket连接状态={callback.is_initialized if callback else "无回调"}')
        
        # 简化的连接检查 - 等待短暂时间让WebSocket连接建立
        time.sleep(0.1)
        
        try:
            if text:
                # 发送文本进行合成
                logger.info(f'发送文本到TTS: {text[:30]}{"..." if len(text) > 30 else ""}')
                synthesizer.streaming_call(text)
                logger.debug(f'已调用streaming_call, 文本长度: {len(text)}')
            
            if is_complete:
                # 完成流式合成
                logger.info(f'完成TTS会话: {session_id}')
                synthesizer.streaming_complete()
                logger.debug('已调用streaming_complete')
                
            return jsonify({
                'status': 'success',
                'message': '已发送文本进行合成并直接播放' if text else '已完成合成'
            })
        except Exception as inner_e:
            logger.error(f'合成过程中出错: {inner_e}', exc_info=True)
            
            # 检查是否是WebSocket尚未准备好的错误
            if 'speech synthesizer has not been started' in str(inner_e):
                logger.warning('检测到WebSocket尚未启动的错误，尝试重建会话')
                
                # 尝试重新创建会话
                try:
                    logger.info(f'尝试重新创建TTS会话: {session_id}')
                    
                    # 获取会话参数 - 尝试从原有回调中获取音色
                    voice = 'longxiaochun'  # 默认音色
                    if session_id in tts_callbacks and hasattr(tts_callbacks[session_id], 'voice'):
                        voice = tts_callbacks[session_id].voice
                    
                    # 先清理可能的旧会话
                    if session_id in tts_callbacks:
                        old_callback = tts_callbacks[session_id]
                        if hasattr(old_callback, 'on_close'):
                            try:
                                old_callback.on_close()
                            except:
                                pass
                    
                    # 创建新的回调实例
                    new_callback = TtsCallback(session_id)
                    new_callback.voice = voice
                    
                    # 创建新的合成器
                    new_synthesizer = SpeechSynthesizer(
                        model="cosyvoice-v1",
                        voice=voice,
                        format=AudioFormat.PCM_22050HZ_MONO_16BIT,
                        callback=new_callback
                    )
                    
                    # 等待WebSocket连接建立
                    logger.info(f'等待新的WebSocket连接建立: {session_id}')
                    time.sleep(0.5)
                    
                    # 保存新的会话
                    tts_sessions[session_id] = new_synthesizer
                    tts_callbacks[session_id] = new_callback
                    
                    # 直接尝试发送文本，不检查WebSocket状态
                    if text:
                        logger.info(f'重新发送文本到TTS: {text[:30]}{"..." if len(text) > 30 else ""}')
                        new_synthesizer.streaming_call(text)
                    
                    if is_complete:
                        logger.info(f'重新完成TTS会话: {session_id}')
                        new_synthesizer.streaming_complete()
                    
                    return jsonify({
                        'status': 'success',
                        'message': '会话已重建并发送文本进行合成'
                    })
                except Exception as retry_e:
                    logger.error(f'重建会话失败: {retry_e}', exc_info=True)
                    return jsonify({'status': 'error', 'message': f'合成失败且重建会话失败: {str(retry_e)}'}), 500
            else:
                return jsonify({'status': 'error', 'message': f'合成失败: {str(inner_e)}'}), 500
    except Exception as e:
        logger.error(f'合成文本失败: {e}', exc_info=True)
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/tts/stop', methods=['POST'])
def stop_tts_session():
    try:
        data = request.get_json(silent=True) or {}
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'status': 'error', 'message': '会话ID不能为空'}), 400
            
        logger.info(f'准备停止TTS会话: {session_id}')
        
        # 检查回调对象是否存在
        if session_id in tts_callbacks:
            try:
                callback = tts_callbacks[session_id]
                logger.info(f'找到会话 {session_id} 的回调对象')
                
                # 先关闭音频流
                try:
                    if callback._stream:
                        logger.info(f'已关闭音频流: {session_id}')
                        callback._stream.stop_stream()
                        callback._stream.close()
                        callback._stream = None
                except Exception as e:
                    logger.warning(f'关闭音频流出错: {e}')
                
                # 再终止播放器
                try:
                    if callback._player:
                        logger.info(f'已终止音频播放器: {session_id}')
                        callback._player.terminate()
                        callback._player = None
                except Exception as e:
                    logger.warning(f'终止音频播放器出错: {e}')
                
                # 从回调字典中移除
                del tts_callbacks[session_id]
            except Exception as e:
                logger.error(f'停止TTS回调出错: {e}', exc_info=True)
        
        # 检查合成器对象是否存在
        if session_id in tts_sessions:
            try:
                synthesizer = tts_sessions[session_id]
                logger.info(f'找到会话 {session_id} 的合成器对象')
                
                # 安全关闭合成器
                try:
                    if synthesizer:
                        # 在新线程中执行finish操作，防止阻塞
                        def safe_finish():
                            try:
                                synthesizer.finish()
                                logger.info(f'已完成TTS合成任务: {session_id}')
                            except Exception as e:
                                logger.warning(f'完成TTS合成任务: {e}')
                        
                        threading.Thread(target=safe_finish).start()
                except Exception as e:
                    logger.warning(f'关闭TTS合成器出错: {e}')
                
                # 从会话字典中移除
                del tts_sessions[session_id]
            except Exception as e:
                logger.error(f'停止TTS会话出错: {e}', exc_info=True)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        logger.error(f'处理停止TTS会话请求出错: {e}', exc_info=True)
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 获取TTS可用音色列表
@app.route('/api/tts/voices', methods=['GET'])
def get_voices():
    voices = [
        {"id": "longxiaochun", "name": "龙小春", "language": "zh-CN"},
        {"id": "cixingnansheng", "name": "磁性男声", "language": "zh-CN"},
        {"id": "qingjingnansheng", "name": "清晰男声", "language": "zh-CN"},
        {"id": "duchangnansheng", "name": "度畅男声", "language": "zh-CN"},
        {"id": "duyinansheng", "name": "度逸男声", "language": "zh-CN"},
        {"id": "shangwunansheng", "name": "商务男声", "language": "zh-CN"},
        {"id": "yuanchennvsheng", "name": "圆臣女声", "language": "zh-CN"},
        {"id": "xinxinnvsheng", "name": "心心女声", "language": "zh-CN"},
        {"id": "zhitongnvsheng", "name": "知桐女声", "language": "zh-CN"}
    ]
    
    return jsonify({
        'status': 'success',
        'voices': voices
    })

# 测试端点
@app.route('/api/speech/test', methods=['GET'])
def test_endpoint():
    """测试API是否正常工作的端点"""
    logger.info('收到测试请求')
    return jsonify({
        'status': 'success',
        'message': '语音识别服务器正在运行'
    })

# 首页
@app.route('/', methods=['GET'])
def home():
    """首页，用于健康检查"""
    return jsonify({
        'status': 'success',
        'message': '语音识别服务器正在运行',
        'endpoints': [
            '/api/speech/test',
            '/api/speech/start',
            '/api/speech/stop',
            '/api/speech/results',
            '/api/tts/start',
            '/api/tts/synthesize',
            '/api/tts/stop',
            '/api/tts/voices'
        ]
    })

# 添加TTS会话状态检查端点
@app.route('/api/tts/status', methods=['POST'])
def check_tts_session():
    try:
        data = request.get_json(silent=True) or {}
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'status': 'error', 'message': '会话ID不能为空'}), 400
            
        # 检查会话是否存在
        if session_id in tts_sessions and session_id in tts_callbacks:
            synthesizer = tts_sessions[session_id]
            callback = tts_callbacks[session_id]
            
            # 检查会话状态
            is_synthesizer_valid = synthesizer is not None
            is_callback_valid = callback is not None
            is_initialized = callback.is_initialized if callback else False
            is_ready = callback.is_ready if callback else False
            
            logger.info(f'检查TTS会话状态: {session_id}, 合成器有效={is_synthesizer_valid}, 回调有效={is_callback_valid}, 已初始化={is_initialized}, 已就绪={is_ready}')
            
            # 如果会话存在但未初始化，尝试等待一小段时间
            if is_synthesizer_valid and is_callback_valid and not is_initialized:
                logger.info(f'会话 {session_id} 存在但未初始化，等待100ms')
                time.sleep(0.1)
                is_initialized = callback.is_initialized
                is_ready = callback.is_ready
            
            status = 'active' if is_synthesizer_valid and is_callback_valid else 'invalid'
            
            return jsonify({
                'status': status,
                'session_id': session_id,
                'is_synthesizer_valid': is_synthesizer_valid,
                'is_callback_valid': is_callback_valid,
                'is_initialized': is_initialized,
                'is_ready': is_ready
            })
        else:
            return jsonify({
                'status': 'not_found',
                'message': '未找到会话'
            }), 404
            
    except Exception as e:
        logger.error(f'检查TTS会话状态失败: {e}', exc_info=True)
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 关闭时清理资源
def cleanup():
    global stop_thread
    stop_thread.set()
    logger.info("服务器关闭，清理资源...")

if __name__ == '__main__':
    logger.info('正在启动语音识别服务器...')
    try:
        # 确保监听所有接口，而不仅是localhost
        app.run(host='0.0.0.0', port=2047, debug=False, threaded=True)
    except Exception as e:
        logger.error(f'启动服务器失败: {e}')
    finally:
        cleanup()
        sys.exit(1) 