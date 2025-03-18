import sys
import os
import subprocess
import threading
import time
from PyQt6.QtWidgets import (QApplication, QMainWindow, QPushButton, QVBoxLayout, 
                           QHBoxLayout, QTextEdit, QWidget, QLabel, QGroupBox, QLineEdit)
from PyQt6.QtCore import QThread, pyqtSignal, Qt, QProcess

class ServerProcess(QThread):
    output_received = pyqtSignal(str)
    server_started = pyqtSignal()
    server_stopped = pyqtSignal()
    
    def __init__(self):
        super().__init__()
        self.process = None
        self.running = False
        
    def run(self):
        try:
            # 使用当前目录下的speech_server.py
            server_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'speech_server.py')
            
            # 创建启动信息对象，用于隐藏窗口
            startupinfo = None
            if sys.platform == "win32":
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 0  # SW_HIDE
            
            # 启动Flask服务器进程
            self.process = subprocess.Popen(
                [sys.executable, server_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                startupinfo=startupinfo,  # 添加启动信息，在Windows上隐藏控制台窗口
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0  # 确保不创建新窗口
            )
            
            self.running = True
            self.server_started.emit()
            
            # 实时读取并发送输出
            for line in iter(self.process.stdout.readline, ""):
                if not self.running:
                    break
                self.output_received.emit(line.strip())
            
            self.process.stdout.close()
            
        except Exception as e:
            self.output_received.emit(f"错误: {str(e)}")
        finally:
            self.running = False
            self.server_stopped.emit()
    
    def stop(self):
        if self.process and self.running:
            self.running = False
            # 在Windows上
            if sys.platform == "win32":
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(self.process.pid)])
            # 在Linux/Mac上
            else:
                self.process.terminate()
                self.process.wait(timeout=5)
            self.process = None

class DashscopeServerManager(QMainWindow):
    def __init__(self):
        super().__init__()
        self.server_process = None
        
        # 确保.env.local文件存在
        self.env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
        self.load_api_key()
        
        self.initUI()
        
    def load_api_key(self):
        """加载API密钥"""
        self.api_key = ""
        if os.path.exists(self.env_path):
            try:
                with open(self.env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.startswith('DASHSCOPE_API_KEY='):
                            self.api_key = line.strip().split('=', 1)[1]
                            break
            except Exception as e:
                print(f"加载API密钥失败: {e}")
        else:
            # 如果文件不存在，创建空文件
            with open(self.env_path, 'w', encoding='utf-8') as f:
                f.write("DASHSCOPE_API_KEY=\n")
        
    def initUI(self):
        self.setWindowTitle('阿里云百炼语音服务管理器')
        self.setGeometry(100, 100, 800, 600)
        
        # 主布局
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # 状态显示
        status_box = QGroupBox("服务状态")
        status_layout = QHBoxLayout()
        status_box.setLayout(status_layout)
        
        self.status_label = QLabel("服务未启动")
        self.status_label.setStyleSheet("color: red; font-weight: bold;")
        status_layout.addWidget(self.status_label)
        
        main_layout.addWidget(status_box)
        
        # API设置区域
        api_box = QGroupBox("API设置")
        api_layout = QVBoxLayout()
        api_box.setLayout(api_layout)
        
        api_key_layout = QHBoxLayout()
        api_key_label = QLabel("阿里云百炼API密钥:")
        self.api_key_input = QLineEdit(self.api_key)
        self.api_key_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.api_key_input.setPlaceholderText("输入API密钥...")
        
        show_key_btn = QPushButton("显示")
        show_key_btn.setCheckable(True)
        show_key_btn.toggled.connect(self.toggle_api_key_visibility)
        
        save_api_key_button = QPushButton("保存")
        save_api_key_button.clicked.connect(self.save_api_key)
        
        api_key_layout.addWidget(api_key_label)
        api_key_layout.addWidget(self.api_key_input)
        api_key_layout.addWidget(show_key_btn)
        api_key_layout.addWidget(save_api_key_button)
        
        api_layout.addLayout(api_key_layout)
        main_layout.addWidget(api_box)
        
        # 控制按钮区域
        control_box = QGroupBox("控制面板")
        control_layout = QHBoxLayout()
        control_box.setLayout(control_layout)
        
        self.start_button = QPushButton("启动服务")
        self.start_button.clicked.connect(self.start_server)
        control_layout.addWidget(self.start_button)
        
        self.stop_button = QPushButton("停止服务")
        self.stop_button.clicked.connect(self.stop_server)
        self.stop_button.setEnabled(False)
        control_layout.addWidget(self.stop_button)
        
        self.restart_button = QPushButton("重启服务")
        self.restart_button.clicked.connect(self.restart_server)
        self.restart_button.setEnabled(False)
        control_layout.addWidget(self.restart_button)
        
        main_layout.addWidget(control_box)
        
        # 日志输出区域
        log_box = QGroupBox("服务日志")
        log_layout = QVBoxLayout()
        log_box.setLayout(log_layout)
        
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        log_layout.addWidget(self.log_text)
        
        clear_log_button = QPushButton("清除日志")
        clear_log_button.clicked.connect(self.clear_log)
        log_layout.addWidget(clear_log_button)
        
        main_layout.addWidget(log_box)
        
        # 设置日志区域占比更大
        main_layout.setStretch(0, 1)  # 状态
        main_layout.setStretch(1, 1)  # API设置
        main_layout.setStretch(2, 1)  # 控制
        main_layout.setStretch(3, 5)  # 日志
    
    def toggle_api_key_visibility(self, checked):
        self.api_key_input.setEchoMode(
            QLineEdit.EchoMode.Normal if checked else QLineEdit.EchoMode.Password
        )
        
    def save_api_key(self):
        api_key = self.api_key_input.text().strip()
        try:
            with open(self.env_path, 'w', encoding='utf-8') as f:
                f.write(f"DASHSCOPE_API_KEY={api_key}\n")
            self.api_key = api_key
            self.log("API密钥已保存", "green")
        except Exception as e:
            self.log(f"保存API密钥失败: {e}", "red")
    
    def start_server(self):
        if not self.server_process or not self.server_process.running:
            self.log("正在启动阿里云百炼语音服务...", "blue")
            self.server_process = ServerProcess()
            self.server_process.output_received.connect(self.update_log)
            self.server_process.server_started.connect(self.on_server_started)
            self.server_process.server_stopped.connect(self.on_server_stopped)
            self.server_process.start()
    
    def stop_server(self):
        if self.server_process and self.server_process.running:
            self.log("正在停止服务...", "orange")
            self.server_process.stop()
    
    def restart_server(self):
        self.log("正在重启服务...", "orange")
        if self.server_process and self.server_process.running:
            self.server_process.stop()
            # 等待停止后再启动
            QThread.msleep(1000)
            self.start_server()
        else:
            self.start_server()
    
    def on_server_started(self):
        self.status_label.setText("服务运行中")
        self.status_label.setStyleSheet("color: green; font-weight: bold;")
        self.start_button.setEnabled(False)
        self.stop_button.setEnabled(True)
        self.restart_button.setEnabled(True)
        self.log("服务已成功启动", "green")
    
    def on_server_stopped(self):
        self.status_label.setText("服务已停止")
        self.status_label.setStyleSheet("color: red; font-weight: bold;")
        self.start_button.setEnabled(True)
        self.stop_button.setEnabled(False)
        self.restart_button.setEnabled(False)
        self.log("服务已停止", "red")
    
    def update_log(self, text):
        self.log(text)
    
    def log(self, message, color="black"):
        self.log_text.append(f'<span style="color:{color}">{message}</span>')
    
    def clear_log(self):
        self.log_text.clear()
    
    def closeEvent(self, event):
        # 关闭窗口时停止服务
        if self.server_process and self.server_process.running:
            self.server_process.stop()
        event.accept()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DashscopeServerManager()
    window.show()
    sys.exit(app.exec())