const { protocol, app } = require('electron')
const path = require('path')

function registerProtocols() {
  protocol.registerFileProtocol('local-file', (request, callback) => {
    let filePath = request.url.replace('local-file://', '')
    if (process.platform === 'win32') {
      if (filePath.startsWith('/') && filePath[2] === ':') filePath = filePath.substring(1)
      filePath = filePath.replace(/\//g, '\\')
    }
    callback(decodeURI(filePath))
  })

  protocol.registerFileProtocol('file', (request, callback) => {
    let filePath = request.url.replace('file://', '')
    if (process.platform === 'win32') {
      if (filePath.startsWith('/') && filePath[2] === ':') filePath = filePath.substring(1)
      filePath = filePath.replace(/\//g, '\\')
    }
    callback(decodeURI(filePath))
  })

  protocol.registerFileProtocol('app-resource', (request, callback) => {
    const filePath = request.url.replace('app-resource://', '')
    const resourcePath = app.isPackaged
      ? path.join(process.resourcesPath, filePath)
      : path.join(__dirname, '..', 'resources', filePath)
    callback(resourcePath)
  })
}

module.exports = { registerProtocols }
