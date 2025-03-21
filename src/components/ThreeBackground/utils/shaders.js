// 顶点着色器
export const vertexShader = `
varying vec2 vUv;  
void main() {  
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// 片段着色器
export const fragmentShader = `
precision mediump float;    
uniform float u_time;      // 时间参数 - 用于动画效果
uniform vec2 u_resolution; // 分辨率 - 用于计算正确的宽高比
uniform vec2 u_mouse;      // 鼠标坐标 - 用于互动效果
uniform float u_intensity; // 强度参数 - 用于控制效果强度
varying vec2 vUv;          // 从顶点着色器传入的UV坐标

// 改进的噪声函数 - 为效果提供基础纹理
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f); // 平滑插值
    
    // 随机值生成
    float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    
    // 双线性插值
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 分形噪声 - 增加复杂度和细节
float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    // 叠加6层噪声，增加更多细节
    for(int i = 0; i < 6; i++) {
        sum += amp * noise(p * freq);
        freq *= 2.0;    // 每层频率加倍
        amp *= 0.5;     // 每层振幅减半
    }
    return sum;
}

// 旋转矩阵函数 - 用于UV坐标的旋转变换
mat2 rotate2d(float angle) {
    return mat2(
        cos(angle), -sin(angle),
        sin(angle), cos(angle)
    );
}

// 涡旋扭曲函数 - 创造螺旋状的扭曲效果
vec2 swirl(vec2 uv, float strength) {
    float dist = length(uv - 0.5);          // 到中心的距离
    float angle = atan(uv.y - 0.5, uv.x - 0.5); // 到中心的角度
    
    // 涡旋效果 - 根据距离增加角度旋转
    angle += dist * strength;
    
    // 从极坐标转回笛卡尔坐标
    return vec2(0.5 + cos(angle) * dist, 0.5 + sin(angle) * dist);
}

// 鼠标影响计算函数 - 使效果对鼠标位置有反应
float mouseInfluence(vec2 uv, vec2 mouse, float radius, float strength) {
    float dist = distance(uv, mouse);
    // 距离鼠标越近，影响越大
    return 1.0 - smoothstep(0.0, radius, dist) * strength;
}

// 色彩饱和度调整函数 - 控制颜色的鲜艳程度
vec3 saturate(vec3 color, float saturation) {
    // 计算灰度值
    float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
    // 混合原始颜色和灰度值
    return mix(vec3(gray), color, saturation);
}

// 彩虹色函数 - 生成周期性变化的色彩
vec3 rainbow(float t) {
    return vec3(
        0.5 + 0.5 * sin(t),             // 红色分量
        0.5 + 0.5 * sin(t + 2.0),       // 绿色分量
        0.5 + 0.5 * sin(t + 4.0)        // 蓝色分量
    );
}

void main() {    
    // 基础UV坐标
    vec2 uv = vUv;
    
    // 非线性时间 - 使动画更有机、更自然
    float nonLinearTime = u_time * 0.5 + sin(u_time * 0.2) * 2.0;
    
    // 计算鼠标影响 - 鼠标位置影响视觉效果
    float mouseRadius = 0.4 + u_intensity * 0.2;        // 鼠标影响半径
    float mouseStrength = 0.8 + u_intensity * 0.5;      // 鼠标影响强度
    float mouseFactor = mouseInfluence(uv, u_mouse, mouseRadius, mouseStrength);
    
    // 脉动效果 - 添加周期性变化
    float pulsation = 0.1 * sin(nonLinearTime * 1.5);
    
    // 根据强度和鼠标位置调整参数
    float timeScale = 0.2 + u_intensity * 0.15 + pulsation;
    float noiseScale = 3.0 + u_intensity * 2.0 + mouseFactor * 3.0; 
    
    // 应用涡旋扭曲 - 随时间变化
    float swirlStrength = 2.0 + sin(nonLinearTime * 0.23) * 1.0 + u_intensity * 1.5;
    vec2 swirlUV = swirl(uv, swirlStrength);
    
    // 动态旋转中心点受鼠标位置影响
    vec2 rotationCenter = vec2(0.5) + (u_mouse - vec2(0.5)) * 0.2;
    
    // 创建多层旋转的UV - 不同方向的旋转叠加
    float rotationSpeed1 = 0.1 + length(u_mouse - vec2(0.5)) * 0.1;
    float rotationSpeed2 = -0.05 + cos(nonLinearTime * 0.23) * 0.05;
    
    vec2 rotatedUV1 = rotate2d(nonLinearTime * rotationSpeed1) * (swirlUV - rotationCenter) + rotationCenter;
    vec2 rotatedUV2 = rotate2d(nonLinearTime * rotationSpeed2) * (uv - 0.5) + 0.5;
    
    // 混合旋转UV - 创造更复杂的运动
    vec2 finalUV = mix(rotatedUV1, rotatedUV2, sin(nonLinearTime * 0.27) * 0.5 + 0.5);
    
    // 多重波浪效果 - 水波纹状变形
    float waveStrength1 = 0.05 * (1.0 + u_intensity) * (1.0 + u_mouse.x);
    float waveStrength2 = 0.04 * (1.0 + u_intensity) * (1.0 + u_mouse.y);
    
    float waves1 = sin(finalUV.x * 10.0 + nonLinearTime * 1.1) * waveStrength1;
    float waves2 = sin(finalUV.y * 12.0 + nonLinearTime * 0.9) * waveStrength2;
    
    finalUV.y += waves1;
    finalUV.x += waves2;
    
    // 计算流体场 - 创造流动的效果
    float flowField = fbm(finalUV * 4.0 + vec2(cos(nonLinearTime * 0.5), sin(nonLinearTime * 0.4)));
    
    // 分形噪声场景 - 对称的两侧分别计算，受鼠标影响
    vec2 mouseOffset = (u_mouse - 0.5) * 0.5;
    float n1 = fbm((finalUV + mouseOffset) * noiseScale + nonLinearTime * timeScale);
    float n2 = fbm((finalUV - mouseOffset) * noiseScale * 0.5 - nonLinearTime * timeScale * 0.7);
    
    // 噪声混合 - 创造复杂的纹理
    float pattern = n1 * n2 * 1.5;
    pattern = pow(pattern, 1.0 - u_intensity * 0.3 - mouseFactor * 0.2);
    
    // 使用较暗的基础颜色 - 蓝紫色调
    vec3 color1 = vec3(0.05, 0.1, 0.225) + vec3(u_mouse.x * 0.05, 0.0, u_mouse.y * 0.05); // 蓝色
    vec3 color2 = vec3(0.225, 0.05, 0.2) + vec3(u_mouse.y * 0.05, 0.0, u_mouse.x * 0.05); // 紫色
    vec3 color3 = vec3(0.05, 0.15, 0.225) + vec3(u_mouse.x * 0.05, 0.0, u_mouse.y * 0.05); // 蓝青色
    
    // 添加颜色循环效果 - 随时间变化的色彩
    float colorCycle = nonLinearTime * 0.2;
    vec3 rainbowTint = rainbow(colorCycle) * 0.1;
    
    color1 += rainbowTint * 0.15 * (sin(nonLinearTime * 0.5) * 0.5 + 0.5);
    color2 += rainbowTint * 0.1 * (cos(nonLinearTime * 0.5) * 0.5 + 0.5);
    
    // 颜色增强 - 根据输入强度和鼠标位置
    float colorBoost = 1.0 + u_intensity * 0.3 + mouseFactor * 0.1;
    
    // 增强饱和度 - 让颜色更鲜艳
    color1 = saturate(color1 * colorBoost, 1.2 + u_intensity * 0.3);
    color2 = saturate(color2 * colorBoost, 1.3 + u_intensity * 0.3);
    
    // 颜色混合 - 多层颜色融合
    float flowMix = flowField * 0.2 + mouseFactor * 0.15 + sin(nonLinearTime * 0.3) * 0.1;
    
    vec3 finalColor = mix(
        mix(color1, color2, pattern),   // 基础颜色混合
        color3 + rainbowTint * 0.1,     // 辅助颜色
        flowMix                         // 混合比例
    );
    
    // 迷幻光效 - 额外的彩色细节
    float trippy = fbm(finalUV * 3.0 - nonLinearTime * 0.1) * fbm(finalUV * 2.0 + nonLinearTime * 0.15);
    finalColor += rainbow(trippy * 5.0 + nonLinearTime * 0.2) * 0.03;
    
    // 增加细微纹理变化 - 更高频率的纹理细节
    float textureDetail = fbm(finalUV * 8.0 - nonLinearTime * 0.05) * 0.08;
    finalColor += vec3(textureDetail) * 0.25;
    
    // 无输入时黑白效果处理 - 检测输入活跃度
    float inputActivity = u_intensity; // 输入强度直接作为活跃度指标
    
    // 根据输入活跃度调整颜色饱和度
    float colorSaturation = smoothstep(0.0, 0.15, inputActivity);
    
    // 活跃度低时转换为黑白效果，保留部分色彩
    if (inputActivity < 0.1) {
        // 计算亮度值
        float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
        // 混合黑白和彩色
        finalColor = mix(vec3(luminance), finalColor, colorSaturation);
    }
    
    // 保持颜色饱和度 - 防止颜色变灰（仅在彩色模式时应用）
    finalColor = saturate(finalColor, colorSaturation * (1.0 + u_intensity * 0.4) + 0.1);
    
    // 调整亮度 - 根据输入强度
    finalColor = finalColor * (1.0 + u_intensity * 0.15);
    finalColor = min(finalColor, vec3(1.0)); // 防止颜色过曝
    
    // 透明度计算 - 多重因素影响
    float alpha = 0.8 + 
                  0.1 * sin(nonLinearTime + pattern * 5.0) + 
                  u_intensity * 0.1 + 
                  mouseFactor * 0.1;
    
    gl_FragColor = vec4(finalColor, alpha);   
}
`; 