// 生成随机十六进制颜色
const generateRandomHex = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
};

// 生成随机主题
export const generateRandomTheme = () => {
  // 获取 tailwind 配置
  const configPath = window.electron.getPath('tailwindConfig');
  
  // 读取配置文件
  window.electron.readFile(configPath).then(content => {
    // 生成新的随机颜色配置
    const newRillTheme = {
      "primary": generateRandomHex(),
      "primary-content": generateRandomHex(),
      "secondary": generateRandomHex(),
      "secondary-content": generateRandomHex(),
      "accent": generateRandomHex(),
      "accent-content": generateRandomHex(),
      "neutral": generateRandomHex(),
      "neutral-content": generateRandomHex(),
      "base-100": generateRandomHex(),
      "base-200": generateRandomHex(),
      "base-300": generateRandomHex(),
      "base-content": generateRandomHex(),
      "info": generateRandomHex(),
      "info-content": generateRandomHex(),
      "success": generateRandomHex(),
      "success-content": generateRandomHex(),
      "warning": generateRandomHex(),
      "warning-content": generateRandomHex(),
      "error": generateRandomHex(),
      "error-content": generateRandomHex(),
    };

    // 更新配置文件中的 rill 主题
    const updatedContent = content.replace(
      /(rill:\s*{)([\s\S]*?)(}\s*},)/,
      (match, start, colors, end) => {
        const colorStrings = Object.entries(newRillTheme)
          .map(([key, value]) => `          "${key}": "${value}"`)
          .join(',\n');
        return `${start}\n${colorStrings}\n        ${end}`;
      }
    );

    // 写入更新后的配置
    window.electron.writeFile(configPath, updatedContent);

    // 应用新主题
    document.documentElement.setAttribute('data-theme', 'rill');
    localStorage.setItem('theme', 'rill');

    // 通知 Vite 重新加载
    if (import.meta.hot) {
      import.meta.hot.invalidate();
    }
  });

  return 'rill';
};