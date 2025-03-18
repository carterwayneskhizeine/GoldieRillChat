@echo on
title Python Environment Setup
setlocal enabledelayedexpansion

echo =============================================
echo Creating Python virtual environment...
echo =============================================

:: Check if Python is installed
echo Checking Python installation...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Error: Python not detected, please install Python 3.7 or higher.
  echo Python may not be added to system PATH.
  pause
  exit /b 1
)

:: Display Python version
python --version
if %ERRORLEVEL% NEQ 0 (
  echo Python version check failed, please confirm Python is installed correctly.
  pause
  exit /b 1
)

:: Check if virtual environment folder exists
if exist python_env (
  echo python_env folder already exists, delete and recreate? (Y/N)
  set /p answer=
  if /i "!answer!"=="Y" (
    echo Deleting existing environment...
    rmdir /s /q python_env
  ) else (
    echo Keeping existing environment, will try to update dependencies...
    goto install_deps
  )
)

:: Create virtual environment
echo Creating virtual environment folder...
python -m venv python_env
if %ERRORLEVEL% NEQ 0 (
  echo Failed to create virtual environment, please check if Python venv module is available.
  echo Try installing venv module: pip install virtualenv
  pause
  exit /b 1
)

:install_deps
:: Activate environment and install dependencies
echo =============================================
echo Installing dependencies...
echo =============================================

if not exist requirements.txt (
  echo Error: requirements.txt not found, please ensure file is in current directory.
  pause
  exit /b 1
)

call python_env\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
  echo Failed to activate virtual environment.
  pause
  exit /b 1
)

echo Current Python path: 
where python

echo Installing dependencies... Please wait...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
  echo Failed to install dependencies, please check requirements.txt file.
  echo Error code: %ERRORLEVEL%
  pause
  exit /b 1
)

echo =============================================
echo Python virtual environment setup complete!
echo You can now run start.bat to launch the application.
echo =============================================
pause