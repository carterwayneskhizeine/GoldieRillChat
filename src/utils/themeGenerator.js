// HSL 转换为 Hex 的辅助函数
const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c/2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// 生成带有微妙色调的灰度系列随机颜色
const generateRandomAdvancedHex = (type = 'default') => {
  // 随机色相
  const h = Math.floor(Math.random() * 360);
  let s, l;
  
  switch (type) {
    case 'primary':
      s = 3 + Math.floor(Math.random() * 4); // 3-6% 饱和度，带微妙色调的深灰
      l = 15 + Math.floor(Math.random() * 11); // 15-25% 亮度，深灰
      break;
    case 'content':
      s = 2 + Math.floor(Math.random() * 3); // 2-4% 饱和度，几乎纯灰但带一点色调
      l = 85 + Math.floor(Math.random() * 11); // 85-95% 亮度，近白
      break;
    case 'base':
      s = 2 + Math.floor(Math.random() * 3); // 2-4% 饱和度，带微妙色调
      l = 8 + Math.floor(Math.random() * 8); // 8-15% 亮度，近黑
      break;
    default:
      s = 3 + Math.floor(Math.random() * 4); // 3-6% 饱和度，带微妙色调
      l = 20 + Math.floor(Math.random() * 11); // 20-30% 亮度，中灰
  }
  
  return hslToHex(h, s, l);
};

// 生成随机主题
export const generateRandomTheme = () => {
  // 获取 tailwind 配置
  const configPath = window.electron.getPath('tailwindConfig');
  
  // 读取配置文件
  window.electron.readFile(configPath).then(content => {
    // 生成新的随机颜色配置
    const newRillTheme = {
      "primary": generateRandomAdvancedHex('primary'),
      "primary-content": generateRandomAdvancedHex('content'),
      "secondary": generateRandomAdvancedHex('primary'),
      "secondary-content": generateRandomAdvancedHex('content'),
      "accent": generateRandomAdvancedHex('primary'),
      "accent-content": generateRandomAdvancedHex('content'),
      "neutral": generateRandomAdvancedHex('base'),
      "neutral-content": generateRandomAdvancedHex('content'),
      "base-100": generateRandomAdvancedHex('base'),
      "base-200": generateRandomAdvancedHex('base'),
      "base-300": generateRandomAdvancedHex('base'),
      "base-content": generateRandomAdvancedHex('content'),
      "info": generateRandomAdvancedHex(),
      "info-content": generateRandomAdvancedHex('content'),
      "success": generateRandomAdvancedHex(),
      "success-content": generateRandomAdvancedHex('content'),
      "warning": generateRandomAdvancedHex(),
      "warning-content": generateRandomAdvancedHex('content'),
      "error": generateRandomAdvancedHex(),
      "error-content": generateRandomAdvancedHex('content'),
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