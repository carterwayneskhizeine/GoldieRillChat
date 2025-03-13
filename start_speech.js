const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// 检查Python是否安装
const checkPython = () => {
  return new Promise((resolve, reject) => {
    console.log('检查Python安装情况...');
    
    exec('python --version', (error, stdout, stderr) => {
      if (error) {
        console.error('未检测到Python，请先安装Python');
        reject(new Error('Python未安装'));
        return;
      }
      
      console.log(`检测到${stdout.trim()}`);
      resolve();
    });
  });
};

// 检查依赖是否安装
const checkDependencies = () => {
  return new Promise((resolve, reject) => {
    console.log('检查Python依赖...');
    
    exec('pip show flask flask-cors dashscope pyaudio', (error, stdout, stderr) => {
      if (error) {
        console.warn('部分依赖可能未安装，尝试运行 npm run speech:setup 安装依赖');
        resolve(false);
        return;
      }
      
      console.log('所有依赖已安装');
      resolve(true);
    });
  });
};

// 启动Flask服务器
const startFlaskServer = () => {
  console.log('正在启动Flask服务器...');
  
  const serverPath = path.join(__dirname, 'speech_server.py');
  
  // 确保speech_server.py文件存在
  if (!fs.existsSync(serverPath)) {
    console.error('未找到Flask服务器文件:', serverPath);
    process.exit(1);
  }
  
  // 检查端口2047是否被占用
  return new Promise((resolve, reject) => {
    const testConnection = http.request({
      host: '127.0.0.1',
      port: 2047,
      path: '/',
      method: 'GET',
      timeout: 1000
    }, () => {
      console.error('端口2047已被占用，请确保没有其他程序使用该端口');
      console.error('请关闭占用该端口的程序后重试');
      reject(new Error('端口2047已被占用'));
    });
    
    testConnection.on('error', (err) => {
      // 如果连接失败（端口未被占用），则启动Flask服务器
      console.log('端口2047可用，启动Flask服务器...');
      
      const flaskProcess = spawn('python', [serverPath], {
        stdio: 'inherit'
      });
      
      let started = false;
      
      // 设置超时，如果10秒后服务器没有启动，则认为启动失败
      const timeout = setTimeout(() => {
        if (!started) {
          console.error('Flask服务器启动超时');
          reject(new Error('Flask服务器启动超时'));
        }
      }, 10000);
      
      flaskProcess.on('spawn', () => {
        console.log('Flask进程已启动，等待服务器初始化...');
      });
      
      flaskProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.error('Flask服务器启动错误:', err);
        reject(err);
      });
      
      flaskProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (!started) {
          console.error(`Flask服务器异常退出，退出码 ${code}`);
          reject(new Error(`Flask服务器异常退出，退出码 ${code}`));
        } else {
          console.log(`Flask服务器已关闭，退出码 ${code}`);
        }
      });
      
      // 定期检查服务器是否已启动
      const checkInterval = setInterval(() => {
        const healthCheck = http.request({
          host: '127.0.0.1',
          port: 2047,
          path: '/api/speech/test',
          method: 'GET',
          timeout: 1000
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.status === 'success') {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                started = true;
                console.log('Flask服务器已成功启动');
                resolve(flaskProcess);
              }
            } catch (e) {
              // 忽略解析错误，继续等待
            }
          });
        });
        
        healthCheck.on('error', () => {
          // 忽略连接错误，继续等待
        });
        
        healthCheck.end();
      }, 500); // 每500ms检查一次
    });
    
    testConnection.on('timeout', () => {
      testConnection.destroy();
      console.error('检查端口占用超时');
      reject(new Error('检查端口占用超时'));
    });
    
    testConnection.end();
  });
};

// 启动Electron应用
const startElectronApp = () => {
  console.log('正在启动Electron应用...');
  
  // 根据您的实际启动命令调整
  const electronProcess = spawn('npm', ['run', 'electron:dev'], {
    shell: true,
    stdio: 'inherit'
  });
  
  electronProcess.on('close', (code) => {
    console.log(`Electron应用已关闭，退出码 ${code}`);
    process.exit();
  });
  
  return electronProcess;
};

// 主函数
const main = async () => {
  try {
    // 检查Python
    await checkPython();
    
    // 检查依赖
    const dependenciesOk = await checkDependencies();
    if (!dependenciesOk) {
      console.log('正在尝试安装依赖...');
      await new Promise((resolve, reject) => {
        const installProcess = spawn('npm', ['run', 'speech:setup'], {
          stdio: 'inherit',
          shell: true
        });
        
        installProcess.on('close', (code) => {
          if (code !== 0) {
            console.error('依赖安装失败');
            reject(new Error('依赖安装失败'));
            return;
          }
          
          console.log('依赖安装完成');
          resolve();
        });
      });
    }
    
    // 启动Flask服务器
    const flaskProcess = await startFlaskServer();
    
    // 等待Flask服务器完全启动
    console.log('等待Flask服务器完全启动...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 启动Electron应用
    const electronProcess = startElectronApp();
    
    // 处理进程终止
    process.on('SIGINT', () => {
      console.log('正在关闭所有进程...');
      
      if (flaskProcess) {
        flaskProcess.kill();
      }
      
      if (electronProcess) {
        electronProcess.kill();
      }
      
      process.exit();
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
};

// 运行主函数
main(); 