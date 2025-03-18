@echo off
echo 正在创建Python虚拟环境...

:: 检查Python是否已安装
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo 错误：未检测到Python，请安装Python 3.7或更高版本。
  pause
  exit /b 1
)

:: 创建虚拟环境
echo 创建虚拟环境文件夹...
python -m venv python_env

:: 激活环境并安装依赖
echo 安装依赖...
call python_env\Scripts\activate.bat
pip install -r requirements.txt

:: 检查安装结果
if %ERRORLEVEL% NEQ 0 (
  echo 安装依赖失败，请检查requirements.txt文件是否存在。
  pause
  exit /b 1
)

echo Python虚拟环境设置完成！
echo 现在可以运行start.bat启动应用程序。
pause