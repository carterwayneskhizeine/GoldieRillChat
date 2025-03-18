@echo off
echo Starting GoldieRillChat application...

:: Start Python server (in new window)
start "Python Speech Server" cmd /c "call python_env\Scripts\activate.bat && python speech_server.py"

:: Wait for Python server to start
echo Waiting for speech server to start...
timeout /t 3

:: Start Electron application (using correct start command)
echo Starting main application...
npm run start:speech

echo Application has closed.
pause