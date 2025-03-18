@echo on
title Python环境安装
setlocal enabledelayedexpansion

echo =============================================
echo 正在创建Python虚拟环境...
echo =============================================

:: 检查Python是否已安装
echo 检查Python安装...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo 错误：未检测到Python，请安装Python 3.7或更高版本。
  echo Python可能没有添加到系统PATH中。
  pause
  exit /b 1
)

:: 显示Python版本
python --version
if %ERRORLEVEL% NEQ 0 (
  echo Python版本检查失败，请确认Python安装正确。
  pause
  exit /b 1
)

:: 检查虚拟环境文件夹是否已存在
if exist python_env (
  echo python_env文件夹已存在，是否删除并重新创建？(Y/N)
  set /p answer=
  if /i "!answer!"=="Y" (
    echo 删除现有环境...
    rmdir /s /q python_env
  ) else (
    echo 保留现有环境，将尝试更新依赖...
    goto install_deps
  )
)

:: 创建虚拟环境
echo 创建虚拟环境文件夹...
python -m venv python_env
if %ERRORLEVEL% NEQ 0 (
  echo 创建虚拟环境失败，请检查Python venv模块是否可用。
  echo 尝试安装venv模块: pip install virtualenv
  pause
  exit /b 1
)

:install_deps
:: 激活环境并安装依赖
echo =============================================
echo 安装依赖...
echo =============================================

if not exist requirements.txt (
  echo 错误: requirements.txt不存在，请确保文件在当前目录。
  pause
  exit /b 1
)

call python_env\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
  echo 激活虚拟环境失败。
  pause
  exit /b 1
)

echo 当前使用的Python: 
where python

echo 安装依赖中...请稍候...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
  echo 安装依赖失败，请检查requirements.txt文件是否正确。
  echo 错误代码: %ERRORLEVEL%
  pause
  exit /b 1
)

echo =============================================
echo Python虚拟环境设置完成！
echo 现在可以运行start.bat启动应用程序。
echo =============================================
pause