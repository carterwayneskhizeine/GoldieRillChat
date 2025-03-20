@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo 正在启动语音服务...

REM 检查环境变量中是否已有DASHSCOPE_API_KEY
if defined DASHSCOPE_API_KEY (
    echo 已从系统环境变量中找到DASHSCOPE_API_KEY
) else (
    REM 尝试从同级目录的.env.local文件读取DASHSCOPE_API_KEY
    echo 尝试从.env.local文件读取DASHSCOPE_API_KEY...
    if exist .env.local (
        for /f "tokens=1,* delims==" %%a in (.env.local) do (
            if "%%a"=="DASHSCOPE_API_KEY" (
                set DASHSCOPE_API_KEY=%%b
                echo 已从.env.local文件读取DASHSCOPE_API_KEY
            )
        )
    ) else (
        echo 警告: 未找到.env.local文件
    )
)

REM 检查是否成功设置了DASHSCOPE_API_KEY
if not defined DASHSCOPE_API_KEY (
    echo 错误: 未能找到DASHSCOPE_API_KEY，请确保环境变量中设置了该值或.env.local文件中包含该值
    echo 按任意键退出...
    pause > nul
    exit /b 1
)

REM 查找可执行文件路径
set "EXE_PATH="

REM 首先尝试在当前目录查找
if exist speech_server.exe (
    set "EXE_PATH=speech_server.exe"
    echo 在当前目录找到speech_server.exe
    goto start_exe
)

REM 然后尝试在dist目录查找
if exist dist\speech_server.exe (
    set "EXE_PATH=dist\speech_server.exe"
    echo 在dist目录找到speech_server.exe
    goto start_exe
)

REM 如果都找不到，尝试使用系统PATH路径搜索
where speech_server.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "EXE_PATH=speech_server.exe"
    echo 在系统PATH中找到speech_server.exe
    goto start_exe
)

REM 未找到可执行文件，显示错误
echo 错误: 未找到speech_server.exe，请先运行build_exe.bat构建应用
echo 您可以将可执行文件放在当前目录或dist目录中
echo 按任意键退出...
pause > nul
exit /b 1

:start_exe
REM 启动找到的可执行文件
echo 正在启动语音服务应用 [%EXE_PATH%]...
%EXE_PATH%

endlocal 