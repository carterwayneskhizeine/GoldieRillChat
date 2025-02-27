const { app } = require('electron')
// 注释掉这行，因为我们不需要从main导入createWindow
// const { createWindow } = require('./main')

// 由于main.js已经处理了应用程序初始化和窗口创建，
// 我们只需要在这里处理特定于主进程的生命周期事件

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 注意：main.js已经处理了app.whenReady和app.on('activate')事件，
// 所以这里不需要重复处理 