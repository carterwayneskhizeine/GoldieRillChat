/**
 * 构建前准备资源文件
 * 将着色器文件复制到resources目录，以便打包后的应用能够找到它
 */
const fs = require('fs');
const path = require('path');

// 确保resources目录存在
const resourcesDir = path.join(__dirname, '..', 'resources');
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

// 读取着色器文件
const shaderFilePath = path.join(__dirname, '..', 'src', 'components', 'ThreeBackground', 'utils', 'shaders.js');
try {
  console.log('正在读取着色器文件:', shaderFilePath);
  const shaderContent = fs.readFileSync(shaderFilePath, 'utf8');
  
  // 将着色器文件复制到resources目录
  const targetPath = path.join(resourcesDir, 'shaders-default.js');
  fs.writeFileSync(targetPath, shaderContent);
  console.log('着色器文件已复制到:', targetPath);
} catch (error) {
  console.error('复制着色器文件失败:', error);
  process.exit(1);
}

// 修改electron-builder配置，确保包含着色器文件
const packageJsonPath = path.join(__dirname, '..', 'package.json');
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // 确保extraResources中包含着色器文件
  let hasShaderFilter = false;
  if (packageJson.build && packageJson.build.extraResources) {
    for (const resource of packageJson.build.extraResources) {
      if (resource.from === './resources/') {
        // 检查filter中是否已包含.js文件
        if (resource.filter && Array.isArray(resource.filter)) {
          if (!resource.filter.includes('*.js')) {
            resource.filter.push('*.js');
            hasShaderFilter = true;
          } else {
            hasShaderFilter = true;
          }
        }
      }
    }
    
    // 如果没有找到合适的配置，添加新的配置
    if (!hasShaderFilter) {
      packageJson.build.extraResources.push({
        from: './resources/',
        to: './',
        filter: ['*.js']
      });
    }
    
    // 写回package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 6));
    console.log('package.json已更新，确保包含着色器文件');
  }
} catch (error) {
  console.error('更新package.json失败:', error);
}

console.log('资源准备完成');