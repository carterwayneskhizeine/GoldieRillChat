@echo off
echo 更新Python虚拟环境...

:: 激活环境并更新依赖
call python_env\Scripts\activate.bat
pip install -r requirements.txt --upgrade

echo Python虚拟环境更新完成！
pause