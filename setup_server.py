# setup_server.py - 用于配置服务环境
import os
import sys
import subprocess
import json
import re
import platform
import shutil

def check_python_version():
    """检查Python版本是否满足需求"""
    major, minor = sys.version_info[:2]
    if major < 3 or (major == 3 and minor < 7):
        print(f"错误: 需要Python 3.7或更高版本，当前版本为{major}.{minor}")
        return False
    print(f"Python版本检查通过: {major}.{minor}")
    return True

def check_pip():
    """检查pip是否可用"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "--version"], 
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("pip可用")
        return True
    except subprocess.CalledProcessError:
        print("错误: pip不可用，请安装pip")
        return False

def copy_files_if_needed():
    """复制必要的文件到当前目录，如果它们不存在"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 要检查的文件列表
    files_to_check = ["speech_server.py", "requirements.txt"]
    
    for file in files_to_check:
        target_path = os.path.join(script_dir, file)
        if not os.path.exists(target_path):
            # 尝试在父目录或其他常见位置查找
            possible_locations = [
                os.path.join(script_dir, "..", file),
                os.path.join(script_dir, "..", "src", file),
                os.path.join(script_dir, "..", "scripts", file)
            ]
            
            found = False
            for loc in possible_locations:
                if os.path.exists(loc):
                    shutil.copy2(loc, target_path)
                    print(f"已复制 {file} 到当前目录")
                    found = True
                    break
            
            if not found:
                print(f"警告: 找不到 {file}，可能需要手动复制")
    
    # 确保.env.local存在
    env_path = os.path.join(script_dir, ".env.local")
    if not os.path.exists(env_path):
        with open(env_path, "w", encoding="utf-8") as f:
            f.write("DASHSCOPE_API_KEY=\n")
        print("已创建空的.env.local文件")

def install_requirements():
    """安装依赖包"""
    if not os.path.exists("requirements.txt"):
        print("错误: 找不到requirements.txt文件")
        return False
    
    print("正在安装Python依赖...")
    try:
        # 显示安装过程输出
        process = subprocess.Popen(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # 实时显示输出
        for line in iter(process.stdout.readline, ""):
            print(line.strip())
        
        process.stdout.close()
        return_code = process.wait()
        
        if return_code != 0:
            print(f"错误: 依赖安装失败，退出码 {return_code}")
            return False
        
        print("所有依赖安装成功")
        return True
    except Exception as e:
        print(f"错误: 安装依赖时出现异常: {e}")
        return False

def check_specific_dependencies():
    """检查关键依赖是否安装成功"""
    critical_deps = ["flask", "dashscope", "pyaudio"]
    missing_deps = []
    
    for dep in critical_deps:
        try:
            __import__(dep)
            print(f"检查依赖 {dep}: 已安装")
        except ImportError:
            print(f"检查依赖 {dep}: 未安装")
            missing_deps.append(dep)
    
    if missing_deps:
        print(f"警告: 以下关键依赖未安装: {', '.join(missing_deps)}")
        print("将尝试单独安装这些依赖")
        
        for dep in missing_deps:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
                print(f"已成功安装 {dep}")
            except subprocess.CalledProcessError:
                print(f"错误: 无法安装 {dep}")
        
        # 再次检查
        still_missing = []
        for dep in missing_deps:
            try:
                __import__(dep)
            except ImportError:
                still_missing.append(dep)
        
        if still_missing:
            print(f"错误: 以下依赖仍然无法正确安装: {', '.join(still_missing)}")
            return False
    
    return True

def setup_api_key():
    """设置阿里云百炼API密钥"""
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
    
    # 检查是否已有API密钥
    existing_key = ""
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("DASHSCOPE_API_KEY="):
                        existing_key = line.strip().split("=", 1)[1]
                        break
        except Exception as e:
            print(f"读取现有API密钥时出错: {e}")
    
    # 提示用户输入新密钥或保留现有密钥
    if existing_key:
        print(f"当前已配置API密钥: {existing_key[:4]}...{existing_key[-4:] if len(existing_key) > 8 else ''}")
        change = input("是否更改API密钥? (y/n) [n]: ").strip().lower()
        if change != 'y':
            print("保留现有API密钥")
            return True
    
    api_key = input("请输入阿里云百炼API密钥 (可以稍后在应用设置中配置): ").strip()
    
    try:
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(f"DASHSCOPE_API_KEY={api_key}\n")
        print("API密钥已保存到.env.local文件")
        return True
    except Exception as e:
        print(f"保存API密钥失败: {e}")
        return False

def setup_server():
    """配置服务器"""
    print("\n" + "="*50)
    print("阿里云百炼语音服务设置向导")
    print("="*50)
    
    print(f"系统信息: {platform.system()} {platform.release()}")
    print(f"Python路径: {sys.executable}")
    
    # 复制必要的文件
    copy_files_if_needed()
    
    if not check_python_version():
        input("\n按Enter键退出...")
        return False
    
    if not check_pip():
        input("\n按Enter键退出...")
        return False
    
    if not install_requirements():
        retry = input("安装依赖失败，是否重试? (y/n) [y]: ").strip().lower()
        if retry != 'n':
            if not install_requirements():
                print("再次安装失败，将尝试检查特定依赖...")
        else:
            print("跳过依赖安装，将尝试检查特定依赖...")
    
    # 检查关键依赖
    if not check_specific_dependencies():
        print("警告: 部分关键依赖安装失败，程序可能无法正常运行")
        proceed = input("是否继续设置? (y/n) [n]: ").strip().lower()
        if proceed != 'y':
            input("\n按Enter键退出...")
            return False
    
    # 设置API密钥
    setup_api_key()
    
    print("\n" + "="*50)
    print("设置完成！可以启动服务管理器了。")
    print("="*50 + "\n")
    
    input("按Enter键退出...")
    return True

if __name__ == "__main__":
    try:
        setup_server()
    except KeyboardInterrupt:
        print("\n设置已被用户中断")
    except Exception as e:
        print(f"\n设置过程中出现未知错误: {e}")
        input("按Enter键退出...")