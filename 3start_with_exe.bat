@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion
echo Starting GoldieRillChat application...

:: Retrieve API key from .env.local or environment variable
echo Retrieving API key configuration...
call :setApiKeyFromEnv

:: Check if the exe file exists
if not exist "dist\speech_server.exe" (
  echo Error: The dist\speech_server.exe file was not found
  echo Please run build_exe.bat to create the executable file first
  pause
  exit /b 1
)

:: Start the Python server (in a new window)
echo Starting speech server...
start "Python speech server" cmd /c "set DASHSCOPE_API_KEY=%DASHSCOPE_API_KEY% && dist\speech_server.exe"

:: Wait for the Python server to start
echo Waiting for speech server to start...
timeout /t 3

:: Check if the server is running
ping -n 1 127.0.0.1:5000 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Waiting for server to start...
  timeout /t 2
)

:: Start the Electron application
echo Starting main application...
npm run start:speech

echo The application has been closed.
pause
exit /b 0

:setApiKeyFromEnv
:: 检查系统环境变量
echo Checking system environment variables...
if defined DASHSCOPE_API_KEY (
  echo API key found in system environment variables
  echo Using API key: !DASHSCOPE_API_KEY:~0,4!****!DASHSCOPE_API_KEY:~-4!
  exit /b 0
)

:: 尝试从.env.local文件获取
echo Checking .env.local file...
if exist ".env.local" (
  echo Found .env.local file
  for /f "tokens=1,* delims==" %%a in ('findstr /C:"DASHSCOPE_API_KEY" .env.local') do (
    set "DASHSCOPE_API_KEY=%%b"
    echo Extracted API key from .env.local: !DASHSCOPE_API_KEY:~0,4!****!DASHSCOPE_API_KEY:~-4!
    exit /b 0
  )
)

:: 如果所有自动方法都失败，允许用户手动输入API密钥
echo No API key found.
echo.
echo You can:
echo 1. Enter your DashScope API key now
echo 2. Configure it in an .env.local file with DASHSCOPE_API_KEY=your_api_key
echo.
choice /C 12 /M "Choose an option (1-2): "
if %ERRORLEVEL% EQU 1 (
  :: 用户选择输入API密钥
  set /p DASHSCOPE_API_KEY="Enter your DashScope API key: "
  if "!DASHSCOPE_API_KEY!" NEQ "" (
    :: 保存到.env.local文件以便下次使用
    echo DASHSCOPE_API_KEY=!DASHSCOPE_API_KEY!> .env.local
    echo API key saved to .env.local for future use
    exit /b 0
  )
)
if %ERRORLEVEL% EQU 2 (
  echo Please create a .env.local file with your API key
  echo and restart the application.
  echo.
  pause
  exit /b 1
)