@echo off
echo Starting to package the speech service into an EXE file...

call python_env\Scripts\activate.bat

echo Using PyInstaller to package...
pyinstaller --name speech_server ^
  --add-data "python_env\Lib\site-packages\flask;flask" ^
  --add-data "python_env\Lib\site-packages\dashscope;dashscope" ^
  --add-data "python_env\Lib\site-packages\flask_cors;flask_cors" ^
  --add-data "python_env\Lib\site-packages\werkzeug;werkzeug" ^
  --add-data "python_env\Lib\site-packages\pyaudio;pyaudio" ^
  --hidden-import=engineio.async_drivers.threading ^
  --hidden-import=werkzeug ^
  --hidden-import=flask ^
  --hidden-import=flask_cors ^
  --hidden-import=pyaudio ^
  --hidden-import=dashscope ^
  --hidden-import=json ^
  --hidden-import=os ^
  --hidden-import=re ^
  --collect-all dashscope ^
  --collect-all flask ^
  --collect-all flask_cors ^
  --collect-all pyaudio ^
  --onefile ^
  --icon=resources\favicon.ico ^
  speech_server.py

echo Build completed! Executable file located in the dist folder.
echo Note: Ensure the Alibaba Cloud Baidu API key is configured in the "Interactive" tab of the application settings.

if exist dist\speech_server.exe (
  echo Successfully created the executable file: dist\speech_server.exe
  echo Now you can run start_with_exe.bat to start the application
) else (
  echo Warning: The executable file was not found, please check the error messages above
)

pause