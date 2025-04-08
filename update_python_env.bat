@echo off
chcp 65001 > nul
echo Updating Python virtual environment...

:: Activate environment and update dependencies
call python_env\Scripts\activate.bat
pip install -r requirements.txt --upgrade

echo Python virtual environment update complete!
pause