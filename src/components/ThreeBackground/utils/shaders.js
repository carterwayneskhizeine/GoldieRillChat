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

// 平滑过渡函数 - 创造更平滑的值变化
float smoothTransition(float current, float target, float speed) {
    return mix(current, target, 1.0 - exp(-speed));
}

void main() {    
    // 基础UV坐标
    vec2 uv = vUv;
    
    // 检测鼠标活动和输入强度 - 完全静止时使用固定时间
    float rawActivity = u_intensity; // 原始输入强度
    
    // 创建活跃度的平滑过渡
    // 使用sin函数创建一个0到1之间缓慢变化的值，这样即使在不连续输入时也能保持流畅过渡
    float activityTransition = sin(u_time * 0.5) * 0.5 + 0.5;
    
    // 当有输入时增加活跃度，无输入时缓慢减少
    float smoothActivity;
    if (rawActivity > 0.01) {
        // 有活动时，快速提高活跃度（0.3秒内达到最大值）
        smoothActivity = mix(activityTransition, 1.0, min(1.0, rawActivity * 10.0));
    } else {
        // 无活动时，缓慢降低活跃度（约2秒回到静止状态）
        smoothActivity = activityTransition * 0.2;
    }
    
    // 使用平滑的活跃度值来判断是否活动
    bool isActive = smoothActivity > 0.05;
    
    // 创建平滑的时间过渡
    float staticTime = 2.5; // 固定时间值，控制静止状态的外观
    float dynamicTime = u_time * 0.5 + sin(u_time * 0.2) * 2.0;
    float nonLinearTime = mix(staticTime, dynamicTime, smoothActivity);
    
    // 计算鼠标影响 - 鼠标位置影响视觉效果
    float mouseRadius = 0.4 + rawActivity * 0.2;        // 鼠标影响半径
    float mouseStrength = 0.8 + rawActivity * 0.5;      // 鼠标影响强度
    float mouseFactor = mouseInfluence(uv, u_mouse, mouseRadius, mouseStrength);
    
    // 脉动效果 - 根据平滑活跃度计算
    float pulsation = 0.1 * sin(nonLinearTime * 1.5) * smoothActivity;
    
    // 根据强度和鼠标位置调整参数
    float timeScale = (0.2 + rawActivity * 0.15 + pulsation) * smoothActivity; 
    float noiseScale = 3.0 + rawActivity * 2.0 + mouseFactor * 3.0; 
    
    // 应用涡旋扭曲 - 平滑变化强度
    float baseSwirlStrength = 2.0;
    float activeSwirlStrength = baseSwirlStrength + sin(nonLinearTime * 0.23) * 1.0 + rawActivity * 1.5;
    float swirlStrength = mix(baseSwirlStrength, activeSwirlStrength, smoothActivity);
    vec2 swirlUV = swirl(uv, swirlStrength);
    
    // 动态旋转中心点受鼠标位置影响
    vec2 rotationCenter = vec2(0.5) + (u_mouse - vec2(0.5)) * 0.2;
    
    // 创建多层旋转的UV - 平滑变化旋转速度
    float baseRotation1 = 0.0;
    float activeRotation1 = 0.1 + length(u_mouse - vec2(0.5)) * 0.1;
    float rotationSpeed1 = mix(baseRotation1, activeRotation1, smoothActivity);
    
    float baseRotation2 = 0.0;
    float activeRotation2 = -0.05 + cos(nonLinearTime * 0.23) * 0.05;
    float rotationSpeed2 = mix(baseRotation2, activeRotation2, smoothActivity);
    
    vec2 rotatedUV1 = rotate2d(nonLinearTime * rotationSpeed1) * (swirlUV - rotationCenter) + rotationCenter;
    vec2 rotatedUV2 = rotate2d(nonLinearTime * rotationSpeed2) * (uv - 0.5) + 0.5;
    
    // 混合旋转UV - 创造更复杂的运动
    float baseMix = 0.5;
    float activeMix = sin(nonLinearTime * 0.27) * 0.5 + 0.5;
    float mixFactor = mix(baseMix, activeMix, smoothActivity);
    vec2 finalUV = mix(rotatedUV1, rotatedUV2, mixFactor);
    
    // 多重波浪效果 - 平滑变化波浪强度
    float baseWave1 = 0.0;
    float activeWave1 = 0.05 * (1.0 + rawActivity) * (1.0 + u_mouse.x);
    float waveStrength1 = mix(baseWave1, activeWave1, smoothActivity);
    
    float baseWave2 = 0.0;
    float activeWave2 = 0.04 * (1.0 + rawActivity) * (1.0 + u_mouse.y);
    float waveStrength2 = mix(baseWave2, activeWave2, smoothActivity);
    
    float waves1 = sin(finalUV.x * 10.0 + nonLinearTime * 1.1) * waveStrength1;
    float waves2 = sin(finalUV.y * 12.0 + nonLinearTime * 0.9) * waveStrength2;
    
    finalUV.y += waves1;
    finalUV.x += waves2;
    
    // 计算流体场 - 创造流动的效果，平滑过渡
    vec2 staticOffset = vec2(cos(staticTime * 0.5), sin(staticTime * 0.4));
    vec2 dynamicOffset = vec2(cos(nonLinearTime * 0.5), sin(nonLinearTime * 0.4));
    vec2 flowOffset = mix(staticOffset, dynamicOffset, smoothActivity);
    float flowField = fbm(finalUV * 4.0 + flowOffset);
    
    // 分形噪声场景 - 平滑过渡时间偏移
    vec2 mouseOffset = (u_mouse - 0.5) * 0.5;
    vec2 timeOffset = vec2(nonLinearTime * timeScale) * smoothActivity;
    float n1 = fbm((finalUV + mouseOffset) * noiseScale + timeOffset);
    float n2 = fbm((finalUV - mouseOffset) * noiseScale * 0.5 - timeOffset * 0.7 * smoothActivity);
    
    // 噪声混合 - 创造复杂的纹理
    float pattern = n1 * n2 * 1.5;
    pattern = pow(pattern, 1.0 - rawActivity * 0.3 - mouseFactor * 0.2);
    
    // 使用较暗的基础颜色 - 蓝紫色调
    vec3 color1 = vec3(0.05, 0.1, 0.225) + vec3(u_mouse.x * 0.05, 0.0, u_mouse.y * 0.05); // 蓝色
    vec3 color2 = vec3(0.225, 0.05, 0.2) + vec3(u_mouse.y * 0.05, 0.0, u_mouse.x * 0.05); // 紫色
    vec3 color3 = vec3(0.05, 0.15, 0.225) + vec3(u_mouse.x * 0.05, 0.0, u_mouse.y * 0.05); // 蓝青色
    
    // 添加颜色循环效果 - 平滑过渡
    float colorCycle = nonLinearTime * 0.2;
    vec3 rainbowTint = rainbow(colorCycle) * 0.1;
    
    // 平滑过渡颜色变化
    vec3 rainbowEffect1 = rainbowTint * 0.15 * (sin(nonLinearTime * 0.5) * 0.5 + 0.5);
    vec3 rainbowEffect2 = rainbowTint * 0.1 * (cos(nonLinearTime * 0.5) * 0.5 + 0.5);
    
    color1 += rainbowEffect1 * smoothActivity;
    color2 += rainbowEffect2 * smoothActivity;
    
    // 颜色增强 - 根据输入强度和鼠标位置
    float colorBoost = 1.0 + rawActivity * 0.3 + mouseFactor * 0.1;
    
    // 增强饱和度 - 让颜色更鲜艳
    color1 = saturate(color1 * colorBoost, 1.2 + rawActivity * 0.3);
    color2 = saturate(color2 * colorBoost, 1.3 + rawActivity * 0.3);
    
    // 颜色混合 - 多层颜色融合，平滑过渡时间混合
    float baseMixTime = 0.0;
    float activeMixTime = sin(nonLinearTime * 0.3) * 0.1;
    float timeMix = mix(baseMixTime, activeMixTime, smoothActivity);
    float flowMix = flowField * 0.2 + mouseFactor * 0.15 + timeMix;
    
    vec3 finalColor = mix(
        mix(color1, color2, pattern),   // 基础颜色混合
        color3 + rainbowTint * 0.1,     // 辅助颜色
        flowMix                         // 混合比例
    );
    
    // 迷幻光效 - 平滑过渡
    float trippy = fbm(finalUV * 3.0 - nonLinearTime * 0.1) * fbm(finalUV * 2.0 + nonLinearTime * 0.15);
    finalColor += rainbow(trippy * 5.0 + nonLinearTime * 0.2) * 0.03 * smoothActivity;
    
    // 增加细微纹理变化 - 更高频率的纹理细节
    float textureDetail = fbm(finalUV * 8.0 - nonLinearTime * 0.05 * smoothActivity) * 0.08;
    finalColor += vec3(textureDetail) * 0.25;
    
    // 平滑过渡到黑白效果 - 使用平滑的活跃度值
    float colorSaturation = smoothstep(0.0, 0.15, smoothActivity);
    
    // 根据平滑活跃度计算黑白混合
    float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
    finalColor = mix(vec3(luminance), finalColor, colorSaturation);
    
    // 保持颜色饱和度 - 防止颜色变灰（使用平滑活跃度）
    finalColor = saturate(finalColor, colorSaturation * (1.0 + rawActivity * 0.4) + 0.1);
    
    // 调整亮度 - 根据输入强度
    finalColor = finalColor * (1.0 + rawActivity * 0.15);
    finalColor = min(finalColor, vec3(1.0)); // 防止颜色过曝
    
    // 透明度计算 - 平滑过渡各种影响
    float pulseAlpha = 0.1 * sin(nonLinearTime + pattern * 5.0) * smoothActivity;
    float alpha = 0.8 + pulseAlpha + rawActivity * 0.1 + mouseFactor * 0.1;
    
    gl_FragColor = vec4(finalColor, alpha);   
}
`; 