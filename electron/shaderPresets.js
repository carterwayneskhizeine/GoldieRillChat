const { ipcMain, app } = require('electron')
const path = require('path')
const fs = require('fs').promises

const PRESETS_COUNT = 10
let defaultVertexShader = ''
let defaultFragmentShader = ''
let shaderPresetsFolder = ''

async function fileExists(filePath) {
  try { await fs.access(filePath); return true } catch { return false }
}

async function initShaderPresets() {
  try {
    const storagePath = app.getPath('userData')
    shaderPresetsFolder = path.join(storagePath, 'shader-presets')
    try { await fs.mkdir(shaderPresetsFolder, { recursive: true }) } catch (err) { if (err.code !== 'EEXIST') throw err }

    if (app.isPackaged) {
      const resourcePresetsDir = path.join(process.resourcesPath, 'shader-presets')
      try {
        await fs.access(resourcePresetsDir)
        const presetFiles = (await fs.readdir(resourcePresetsDir)).filter(file => file.endsWith('.json'))
        if (presetFiles.length > 0) {
          for (const file of presetFiles) {
            const sourcePath = path.join(resourcePresetsDir, file)
            const targetPath = path.join(shaderPresetsFolder, file)
            try { await fs.access(targetPath) } catch {
              await fs.writeFile(targetPath, await fs.readFile(sourcePath, 'utf8'))
            }
          }
        }
      } catch (error) {
        console.warn('无法访问打包的着色器预设目录:', error.message)
      }
    }

    const appPath = app.getAppPath()
    let shaderFilePath
    if (app.isPackaged) {
      shaderFilePath = path.join(process.resourcesPath, 'shaders-default.js')
      if (!await fileExists(shaderFilePath)) {
        shaderFilePath = path.join(appPath, 'dist', 'shaders-default.js')
        if (!await fileExists(shaderFilePath)) {
          return await initDefaultPresets()
        }
      }
    } else {
      shaderFilePath = path.join(appPath, 'src/components/ThreeBackground/utils/shaders.js')
    }

    try {
      const fileContent = await fs.readFile(shaderFilePath, 'utf8')
      const vertexMatch = fileContent.match(/export const vertexShader = `([\s\S]*?)`;/)
      const fragmentMatch = fileContent.match(/export const fragmentShader = `([\s\S]*?)`;/)
      if (vertexMatch && vertexMatch[1]) defaultVertexShader = vertexMatch[1]
      if (fragmentMatch && fragmentMatch[1]) defaultFragmentShader = fragmentMatch[1]
    } catch (error) {
      console.error('读取默认着色器代码失败:', error)
      defaultVertexShader = ''
      defaultFragmentShader = ''
    }

    return await writeAllPresets()
  } catch (error) {
    console.error('初始化着色器预设失败:', error)
    throw error
  }
}

async function initDefaultPresets() {
  defaultVertexShader = `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
  defaultFragmentShader = `precision mediump float;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_intensity;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(vec3(0.05, 0.0, 0.1), 0.7);
}`
  return await writeAllPresets()
}

async function writeAllPresets() {
  const presetsInfo = []
  for (let i = 1; i <= PRESETS_COUNT; i++) {
    const presetId = `Shaders${i}`
    const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`)
    if (!await fileExists(presetPath)) {
      await fs.writeFile(presetPath, JSON.stringify({ id: presetId, isDefault: i === 1, vertex: i === 1 ? defaultVertexShader : '', fragment: i === 1 ? defaultFragmentShader : '' }, null, 2))
    }
    const presetContent = JSON.parse(await fs.readFile(presetPath, 'utf8'))
    presetsInfo.push({ id: presetContent.id, isDefault: presetContent.isDefault, isEmpty: !presetContent.vertex && !presetContent.fragment })
  }
  return presetsInfo
}

async function getAllShaderPresets() {
  const presets = []
  for (let i = 1; i <= PRESETS_COUNT; i++) {
    const presetId = `Shaders${i}`
    const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`)
    try {
      const presetContent = JSON.parse(await fs.readFile(presetPath, 'utf8'))
      presets.push({ id: presetId, isDefault: presetContent.isDefault, isEmpty: !presetContent.vertex && !presetContent.fragment })
    } catch (error) {
      presets.push({ id: presetId, isDefault: i === 1, isEmpty: true })
    }
  }
  return presets
}

async function loadShaderPreset(presetId) {
  const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`)
  if (!await fileExists(presetPath)) {
    const content = presetId === 'Shaders1'
      ? { id: presetId, isDefault: true, vertex: defaultVertexShader, fragment: defaultFragmentShader }
      : { id: presetId, isDefault: false, vertex: '', fragment: '' }
    await fs.writeFile(presetPath, JSON.stringify(content, null, 2))
    return content
  }
  const presetContent = JSON.parse(await fs.readFile(presetPath, 'utf8'))
  if (presetId === 'Shaders1' && presetContent.isDefault) {
    presetContent.vertex = defaultVertexShader
    presetContent.fragment = defaultFragmentShader
    await fs.writeFile(presetPath, JSON.stringify(presetContent, null, 2))
  }
  return { id: presetId, vertex: presetContent.vertex, fragment: presetContent.fragment }
}

async function saveShaderPreset(presetId, vertexShader, fragmentShader) {
  const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`)
  let presetContent = { id: presetId, isDefault: presetId === 'Shaders1', vertex: vertexShader, fragment: fragmentShader }
  if (await fileExists(presetPath)) {
    const currentContent = JSON.parse(await fs.readFile(presetPath, 'utf8'))
    presetContent.isDefault = currentContent.isDefault
  }
  await fs.writeFile(presetPath, JSON.stringify(presetContent, null, 2))
  return { success: true, id: presetId }
}

async function resetDefaultShaderPreset() {
  const presetPath = path.join(shaderPresetsFolder, 'Shaders1.json')
  await fs.writeFile(presetPath, JSON.stringify({ id: 'Shaders1', isDefault: true, vertex: defaultVertexShader, fragment: defaultFragmentShader }, null, 2))
  return { id: 'Shaders1', vertex: defaultVertexShader, fragment: defaultFragmentShader }
}

module.exports = function registerShaderPresetsIpc() {
  ipcMain.handle('init-shader-presets', () => initShaderPresets())
  ipcMain.handle('get-all-shader-presets', () => getAllShaderPresets())
  ipcMain.handle('load-shader-preset', (event, presetId) => loadShaderPreset(presetId))
  ipcMain.handle('save-shader-preset', (event, presetId, vertexShader, fragmentShader) => saveShaderPreset(presetId, vertexShader, fragmentShader))
  ipcMain.handle('reset-default-shader-preset', () => resetDefaultShaderPreset())
}
