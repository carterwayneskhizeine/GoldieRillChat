from flask import Flask, request, jsonify
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
    优先从环境变量中获取，如果没有则使用默认值
    """
    if 'DASHSCOPE_API_KEY' in os.environ:
        api_key = os.environ['DASHSCOPE_API_KEY']
        # 检查API密钥格式
        if api_key and len(api_key) > 10:  # 简单长度检查
            dashscope.api_key = api_key
            logger.info('从环境变量中加载DASHSCOPE_API_KEY')
            # 遮盖API密钥前后部分
            masked_key = api_key[:4] + '****' + api_key[-4:] if len(api_key) > 8 else '********'
            logger.debug(f'API密钥格式: {masked_key}')
            return True
        else:
            logger.warning('环境变量中的DASHSCOPE_API_KEY格式可能不正确')
    
    # 如果环境变量中没有有效的API密钥，尝试从配置文件加载
    config_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                for line in f:
                    if line.startswith('DASHSCOPE_API_KEY='):
                        api_key = line.strip().split('=', 1)[1]
                        if api_key and len(api_key) > 10:
                            dashscope.api_key = api_key
                            logger.info('从配置文件加载DASHSCOPE_API_KEY')
                            return True
        except Exception as e:
            logger.error(f'从配置文件加载API密钥失败: {e}')
    
    # 使用默认值（不推荐）
    dashscope.api_key = '<your-dashscope-api-key>'
    logger.warning('使用默认API密钥，请替换为您自己的API密钥')
    return False

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
            '/api/speech/results'
        ]
    })

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