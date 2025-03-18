@echo off
echo 启动GoldieRillChat应用...

:: 启动Python服务器（在新窗口中）
start "Python语音服务器" cmd /c "call python_env\Scripts\activate.bat && python speech_server.py"

:: 等待Python服务器启动
echo 等待语音服务器启动...
timeout /t 3

:: 启动Electron应用（使用正确的启动命令）
echo 启动主应用...
npm run start:speech

echo 应用程序已关闭。
pause