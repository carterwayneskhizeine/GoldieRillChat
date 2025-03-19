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

REM 如果dist目录中存在speech_server.exe，则运行它
if exist dist\speech_server.exe (
    echo 正在启动语音服务应用...
    dist\speech_server.exe
) else (
    echo 错误: 未找到dist\speech_server.exe，请先运行2build_exe.bat构建应用
    echo 按任意键退出...
    pause > nul
    exit /b 1
)

endlocal 