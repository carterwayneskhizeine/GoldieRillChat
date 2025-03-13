const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// 启动Flask服务器
const startFlaskServer = () => {
  console.log('正在启动Flask服务器...');
  
  const serverPath = path.join(__dirname, 'speech_server.py');
  
  // 确保speech_server.py文件存在
  if (!fs.existsSync(serverPath)) {
    console.error('未找到Flask服务器文件:', serverPath);
    process.exit(1);
  }
  
  const flaskProcess = spawn('python', [serverPath], {
    stdio: 'inherit'
  });
  
  flaskProcess.on('error', (err) => {
    console.error('Flask服务器启动错误:', err);
  });
  
  flaskProcess.on('close', (code) => {
    console.log(`Flask服务器已关闭，退出码 ${code}`);
  });
  
  // 定期检查服务器是否已启动
  const checkServer = () => {
    setTimeout(() => {
      console.log('正在检查Flask服务器状态...');
      
      const req = http.request({
        host: '127.0.0.1',
        port: 2047,
        path: '/api/speech/test',
        method: 'GET'
      }, (res) => {
        console.log(`服务器响应状态码: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('服务器响应数据:', data);
          console.log('\n服务器测试成功，按Ctrl+C结束测试');
        });
      });
      
      req.on('error', (err) => {
        console.error(`服务器测试失败: ${err.message}`);
        console.log('将在5秒后重试...');
        checkServer();
      });
      
      req.end();
    }, 5000);
  };
  
  checkServer();
  
  return flaskProcess;
};

// 运行测试
console.log('开始Flask服务器测试...');
const flaskProcess = startFlaskServer();

// 处理进程终止
process.on('SIGINT', () => {
  console.log('正在关闭Flask服务器...');
  
  if (flaskProcess) {
    flaskProcess.kill();
  }
  
  process.exit();
}); 