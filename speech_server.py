from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('speech_server')

app = Flask(__name__)
# 允许所有来源的CORS请求
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/speech/test', methods=['GET'])
def test_endpoint():
    """测试API是否正常工作的端点"""
    logger.info('收到测试请求')
    return jsonify({
        'status': 'success',
        'message': '语音识别服务器正在运行'
    })

# 保留未来实现的API路径
@app.route('/api/speech/start', methods=['POST'])
def start_recognition():
    """启动语音识别会话（未实现）"""
    logger.info('收到启动识别请求')
    return jsonify({
        'status': 'success',
        'message': '语音识别会话已启动（模拟）',
        'session_id': '123456789'
    })

@app.route('/api/speech/stop', methods=['POST'])
def stop_recognition():
    """停止语音识别会话（未实现）"""
    logger.info('收到停止识别请求')
    return jsonify({
        'status': 'success',
        'message': '语音识别会话已停止（模拟）'
    })

@app.route('/api/speech/results', methods=['GET'])
def get_results():
    """获取语音识别结果（未实现）"""
    logger.info('收到获取结果请求')
    return jsonify({
        'status': 'success',
        'results': []
    })

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

if __name__ == '__main__':
    logger.info('正在启动语音识别服务器...')
    try:
        # 确保监听所有接口，而不仅是localhost
        app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
    except Exception as e:
        logger.error(f'启动服务器失败: {e}')
        sys.exit(1) 