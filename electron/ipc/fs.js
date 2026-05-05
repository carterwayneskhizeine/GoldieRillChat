const { ipcMain, app, dialog } = require('electron')
const path = require('path')
const fs = require('fs').promises

function registerFsIpc(getMainWindow) {
  ipcMain.handle('getResourcePath', (event, fileName) => {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, fileName)
    } else {
      return path.join(__dirname, '../..', 'resources', fileName)
    }
  })

  ipcMain.handle('mkdir', async (event, dirPath) => {
    try { await fs.mkdir(dirPath, { recursive: true }); return true }
    catch (error) { console.error('Failed to create directory:', error); throw error }
  })

  ipcMain.handle('writeFile', async (event, filePath, content) => {
    try { await fs.writeFile(filePath, content, 'utf8'); return true }
    catch (error) { console.error('Failed to write file:', error); throw error }
  })

  ipcMain.handle('access', async (event, filePath) => {
    try { await fs.access(filePath); return true }
    catch (error) { throw error }
  })

  ipcMain.handle('select-directory', async () => {
    try {
      return await dialog.showOpenDialog(getMainWindow(), { properties: ['openDirectory'], title: '选择文件夹' })
    } catch (error) { console.error('选择目录失败:', error); throw error }
  })

  ipcMain.handle('read-dir', async (event, dirPath) => {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      return items.map(item => ({ name: item.name, isDirectory: item.isDirectory(), isFile: item.isFile(), isSymbolicLink: item.isSymbolicLink() }))
    } catch (error) { console.error('读取目录内容失败:', error); throw error }
  })

  ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
      const stats = await fs.stat(filePath)
      return { size: stats.size, isDirectory: stats.isDirectory(), isFile: stats.isFile(), created: stats.birthtime, modified: stats.mtime, accessed: stats.atime }
    } catch (error) { console.error('获取文件状态失败:', error); throw error }
  })

  ipcMain.handle('google-search', async (event, searchText) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`
    getMainWindow().webContents.send('show-link-dialog', url)
  })
}

module.exports = registerFsIpc
