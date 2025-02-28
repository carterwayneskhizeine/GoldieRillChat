// 主进程创建浏览器窗口时配置
function createBrowserWindow() {
  return new BrowserWindow({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
} 