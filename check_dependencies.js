const { spawn, exec } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// 创建readline接口，用于用户输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 检查Python是否已安装
function checkPython() {
  return new Promise((resolve, reject) => {
    console.log('正在检查Python安装情况...');
    
    exec('python --version', (error, stdout, stderr) => {
      if (error) {
        console.error('未检测到Python。请安装Python 3.7或更高版本。');
        reject(new Error('Python未安装'));
        return;
      }
      
      console.log(`检测到${stdout.trim()}`);
      resolve();
    });
  });
}

// 安装依赖
function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('正在安装所需的Python依赖...');
    
    const requirementsPath = path.join(__dirname, 'requirements.txt');
    
    // 检查requirements.txt是否存在
    if (!fs.existsSync(requirementsPath)) {
      console.error('未找到requirements.txt文件');
      reject(new Error('Requirements文件不存在'));
      return;
    }
    
    const installProcess = spawn('pip', ['install', '-r', requirementsPath], {
      stdio: 'inherit'
    });
    
    installProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`依赖安装失败，退出码 ${code}`);
        reject(new Error(`安装失败，退出码 ${code}`));
        return;
      }
      
      console.log('所有依赖已成功安装');
      resolve();
    });
  });
}

// 设置DashScope API Key
function setupApiKey() {
  return new Promise((resolve) => {
    // 检查环境变量中是否已设置API Key
    if (process.env.DASHSCOPE_API_KEY) {
      console.log('已从环境变量中检测到DASHSCOPE_API_KEY');
      resolve();
      return;
    }
    
    // 提示用户输入API Key
    rl.question('请输入您的DashScope API Key（将用于语音识别功能）: ', (apiKey) => {
      if (!apiKey.trim()) {
        console.log('未提供API Key，语音识别功能可能无法正常工作');
        resolve();
        return;
      }
      
      // 更新speech_server.py文件中的API Key
      const serverPath = path.join(__dirname, 'speech_server.py');
      
      if (fs.existsSync(serverPath)) {
        let content = fs.readFileSync(serverPath, 'utf8');
        content = content.replace(/<your-dashscope-api-key>/, apiKey.trim());
        fs.writeFileSync(serverPath, content, 'utf8');
        
        console.log('已更新API Key');
      }
      
      resolve();
    });
  });
}

// 主函数
async function main() {
  try {
    await checkPython();
    await installDependencies();
    await setupApiKey();
    
    console.log('\n所有依赖和配置已就绪！');
    console.log('您现在可以使用以下命令启动应用:');
    console.log('npm run start:speech');
    
    rl.close();
  } catch (error) {
    console.error(`设置失败: ${error.message}`);
    console.log('请解决上述问题后重试。');
    rl.close();
    process.exit(1);
  }
}

// 运行主函数
main(); 