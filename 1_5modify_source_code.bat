@echo off
chcp 65001 > nul
echo 正在修改源代码以支持从环境变量和.env.local文件读取API密钥...

REM 创建备份
if exist speech_server.py (
    copy speech_server.py speech_server.py.bak
    echo 已创建源代码备份: speech_server.py.bak
) else (
    echo 错误: 未找到speech_server.py文件
    pause
    exit /b 1
)

REM 读取源文件内容
set "temp_file=temp_source.py"
type nul > %temp_file%

REM 添加环境变量和.env.local文件支持的代码
echo import os > %temp_file%
echo import re >> %temp_file%
echo import sys >> %temp_file%
echo from pathlib import Path >> %temp_file%
echo. >> %temp_file%
echo # 尝试从.env.local文件读取API密钥 >> %temp_file%
echo def load_env_from_file(): >> %temp_file%
echo     try: >> %temp_file%
echo         # 尝试从应用同级目录读取.env.local >> %temp_file%
echo         env_path = Path(os.path.dirname(sys.executable)) / '.env.local' >> %temp_file%
echo         # 如果不是打包模式，尝试从当前目录读取 >> %temp_file%
echo         if not getattr(sys, 'frozen', False): >> %temp_file%
echo             env_path = Path('.env.local') >> %temp_file%
echo. >> %temp_file%
echo         if env_path.exists(): >> %temp_file%
echo             print(f"正在从{env_path}读取环境变量...") >> %temp_file%
echo             with open(env_path, 'r') as f: >> %temp_file%
echo                 for line in f: >> %temp_file%
echo                     line = line.strip() >> %temp_file%
echo                     if line and not line.startswith('#'): >> %temp_file%
echo                         key, value = line.split('=', 1) >> %temp_file%
echo                         # 只设置未定义的环境变量 >> %temp_file%
echo                         if key and value and not os.environ.get(key): >> %temp_file%
echo                             os.environ[key] = value >> %temp_file%
echo                             print(f"已设置环境变量: {key}") >> %temp_file%
echo     except Exception as e: >> %temp_file%
echo         print(f"读取.env.local文件时出错: {e}") >> %temp_file%
echo. >> %temp_file%
echo # 在程序启动时加载环境变量 >> %temp_file%
echo load_env_from_file() >> %temp_file%
echo. >> %temp_file%

REM 将原始文件内容添加到新文件中
type speech_server.py >> %temp_file%

REM 替换原始文件
move /y %temp_file% speech_server.py

echo 源代码修改完成，现在可以运行2build_exe.bat来构建应用了。
echo 构建完成后的应用将能够从环境变量或.env.local文件中读取API密钥。
pause 