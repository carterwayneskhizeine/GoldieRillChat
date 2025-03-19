@echo off
echo Starting GoldieRillChat application...

:: 从localStorage文件中提取API密钥并设置环境变量
echo Retrieving API key configuration...
call :setApiKeyFromLocalStorage

:: Start the Python server (in a new window)
start "Python Speech Server" cmd /c "call python_env\Scripts\activate.bat && set DASHSCOPE_API_KEY=%DASHSCOPE_API_KEY% && python speech_server.py"

:: Wait for the Python server to start
echo Waiting for speech server to start...
timeout /t 3

:: Start the Electron application
echo Starting main application...
npm run start:speech

echo The application has been closed.
pause
exit /b 0

:setApiKeyFromLocalStorage
:: Retrieve API key from localStorage
echo Attempting to retrieve API key from localStorage...
set "LOCAL_STORAGE=%APPDATA%\GoldieRillChat\localStorage"
if not exist "%LOCAL_STORAGE%" (
  echo localStorage file not found: %LOCAL_STORAGE%
  goto tryEnvFile
)

:: Use findstr to find the API key
findstr /C:"dashscope_api_key" "%LOCAL_STORAGE%" > temp_api_key.txt
for /f "tokens=1,* delims=:" %%a in (temp_api_key.txt) do (
  set "line=%%b"
  set "line=!line:~0,-1!"
  set "line=!line:~2!"
  set "line=!line:"=!"
  set DASHSCOPE_API_KEY=!line!
  echo API key retrieved from localStorage
)
del temp_api_key.txt

:: If the key is not found, check the .env.local file
:tryEnvFile
if defined DASHSCOPE_API_KEY (
  echo Using API key: %DASHSCOPE_API_KEY:~0,4%****%DASHSCOPE_API_KEY:~-4%
) else (
  echo API key not found, trying to get from .env.local file...
  if exist ".env.local" (
    for /f "tokens=1,* delims==" %%a in ('findstr /C:"DASHSCOPE_API_KEY" .env.local') do (
      set DASHSCOPE_API_KEY=%%b
      echo API key retrieved from .env.local
    )
  ) else (
    echo .env.local file not found
    echo Warning: API key not found, speech functionality may not work
  )
)
exit /b 0