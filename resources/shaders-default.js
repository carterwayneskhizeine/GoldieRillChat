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
uniform float u_time;    
uniform vec2 u_resolution;    
uniform vec2 u_mouse;    
uniform float u_intensity;    
varying vec2 vUv;    

// 常量定义
#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define MAX_STEPS 8    // 光线步进的最大步数 (简化版raymarching)
#define MIN_DIST 0.0   // 最小距离
#define MAX_DIST 2.0   // 最大距离
#define EPSILON 0.001  // 精度

// 改进的噪声函数
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 分形噪声
float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    // 叠加4层噪声
    for(int i = 0; i < 4; i++) {
        sum += amp * noise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

// 有符号距离函数 (SDF) - 圆形
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// 有符号距离函数 (SDF) - 变形圆形 (morphing blob)
float sdMorphingCircle(vec2 p, float r, float morphFactor, float t) {
    // 添加基于噪声的变形
    float noise1 = fbm(p * 2.0 + vec2(t * 0.5, t * 0.3)) * morphFactor;
    float noise2 = fbm(p * 3.5 - vec2(t * 0.2, t * 0.4)) * morphFactor * 0.7;
    
    // 通过噪声调整半径创建不规则形状
    float radius = r + noise1 - noise2;
    return length(p) - radius;
}

// Metaball SDF - 用于创建有机液滴效果
float metaball(vec2 p, vec2 center, float radius, float strength) {
    float dist = length(p - center);
    return strength / (dist * dist + 0.0001) * radius;
}

// 简单的有机形状SDF
float organicShape(vec2 p, float t) {
    // 基础形状
    float shape = sdCircle(p, 0.3);
    
    // 添加变形
    float deform1 = sin(atan(p.y, p.x) * 5.0 + t) * 0.04;
    float deform2 = cos(length(p) * 8.0 - t * 0.5) * 0.03;
    
    // 组合变形
    return shape + deform1 + deform2;
}

// 旋转矩阵函数
mat2 rotate2d(float angle) {
    return mat2(
        cos(angle), -sin(angle),
        sin(angle), cos(angle)
    );
}

// 鼠标影响计算函数
float mouseInfluence(vec2 uv, vec2 mouse, float radius, float strength) {
    float dist = distance(uv, mouse);
    return 1.0 - smoothstep(0.0, radius, dist) * strength;
}

// 色彩饱和度调整函数
vec3 saturate(vec3 color, float saturation) {
    // 计算灰度值
    float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
    // 混合原始颜色和灰度值
    return mix(vec3(gray), color, saturation);
}

// 液态金属效果
vec3 liquidMetalEffect(vec2 uv, float time, vec2 mousePos, vec3 baseColor) {
    vec2 p = uv - 0.5;
    
    // 添加多个metaball形成有机液滴效果
    float metaballs = 0.0;
    
    // 中心metaball - 跟随鼠标
    vec2 center1 = mix(vec2(0.0), (mousePos - 0.5) * 0.5, 0.7);
    metaballs += metaball(p, center1, 0.15, 0.6);
    
    // 围绕主球的动态卫星metaballs
    float angle1 = time * 0.6;
    float angle2 = time * 0.4 + PI * 0.5;
    float angle3 = time * 0.7 + PI;
    
    vec2 offset1 = vec2(cos(angle1), sin(angle1)) * 0.2;
    vec2 offset2 = vec2(cos(angle2), sin(angle2)) * 0.25;
    vec2 offset3 = vec2(cos(angle3), sin(angle3)) * 0.15;
    
    metaballs += metaball(p, center1 + offset1, 0.08, 0.3);
    metaballs += metaball(p, center1 + offset2, 0.06, 0.4);
    metaballs += metaball(p, center1 + offset3, 0.05, 0.5);
    
    // 创建metaball轮廓
    float edge = smoothstep(0.8, 1.3, metaballs);
    
    // 添加液态金属外观
    float pattern = fbm(p * 3.0 + time * 0.1) * fbm(p * 5.0 - time * 0.2);
    float highlight = smoothstep(0.4, 0.6, pattern) * edge * 0.3; 
    
    // 合成颜色
    vec3 metalColor = baseColor * 1.2; // 增强基础颜色
    vec3 highlightColor = vec3(0.8, 0.9, 1.0) * 0.2; // 淡淡的高光
    
    return mix(baseColor * 0.5, metalColor, edge) + highlightColor * highlight;
}

// 简化的Ray Marching实现 - 用于创建抽象的有机形态
float raymarchOrganic(vec2 p, float time, float detail) {
    float totalDist = 0.0;
    float dist = 1.0;
    
    // 简化的raymarching loop
    for (int i = 0; i < MAX_STEPS; i++) {
        if (dist < EPSILON || totalDist > MAX_DIST) break;
        
        // 计算当前点的SDF
        dist = organicShape(p + vec2(sin(time * 0.2), cos(time * 0.3)) * 0.1, time);
        
        // 前进
        totalDist += dist * 0.5; // 减小步长以获得更好的细节
        p += normalize(p) * dist * 0.4; // 沿径向移动
    }
    
    // 将距离映射到0-1范围
    return 1.0 - smoothstep(0.0, MAX_DIST, totalDist);
}

void main() {    
    // 基础UV坐标
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * 2.0; // 中心化坐标，范围-1到1
    
    // 计算鼠标影响
    float mouseRadius = 0.4 + u_intensity * 0.2;
    float mouseStrength = 0.8 + u_intensity * 0.5;
    float mouseFactor = mouseInfluence(uv, u_mouse, mouseRadius, mouseStrength);
    
    // 根据强度和鼠标位置调整参数
    float timeScale = 0.2 + u_intensity * 0.15;
    float noiseScale = 3.0 + u_intensity * 2.0 + mouseFactor * 3.0; // 鼠标影响噪声缩放
    
    // 动态旋转中心点受鼠标位置影响
    vec2 rotationCenter = vec2(0.5) + (u_mouse - vec2(0.5)) * 0.2;
    
    // 创建动态旋转的UV - 旋转速度受鼠标位置影响
    float rotationSpeed = 0.1 + length(u_mouse - vec2(0.5)) * 0.1;
    vec2 rotatedUV = rotate2d(u_time * rotationSpeed) * (uv - rotationCenter) + rotationCenter;
    
    // 动态波浪效果 - 波浪强度受鼠标水平位置影响
    float waveStrength = 0.05 * (1.0 + u_intensity) * (1.0 + u_mouse.x);
    float waves = sin(rotatedUV.x * 10.0 + u_time) * waveStrength;
    rotatedUV.y += waves;
    
    // 计算静态流体场 - 替代原来的圆形脉冲
    float flowField = fbm(rotatedUV * 4.0 + u_time * 0.1);
    
    // 分形噪声场景 - 扭曲受鼠标位置影响
    vec2 mouseOffset = (u_mouse - 0.5) * 0.5;
    float n1 = fbm((rotatedUV + mouseOffset) * noiseScale + u_time * timeScale);
    float n2 = fbm((rotatedUV - mouseOffset) * noiseScale * 0.5 - u_time * timeScale * 0.7);
    
    // 噪声场景的混合
    float pattern = n1 * n2 * 1.5;
    pattern = pow(pattern, 1.0 - u_intensity * 0.3 - mouseFactor * 0.2); // 减少强度对对比度的影响
    
    // 使用较暗的基础颜色 - 降低初始亮度
    vec3 color1 = mix(vec3(0.05, 0.1, 0.225), vec3(0.075, 0.125, 0.25), u_mouse.x); // 更暗的蓝色
    vec3 color2 = mix(vec3(0.225, 0.05, 0.2), vec3(0.2, 0.075, 0.225), u_mouse.y); // 更暗的紫色
    vec3 color3 = vec3(0.05, 0.15, 0.225) + vec3(u_mouse.x * 0.05, 0.0, u_mouse.y * 0.05); // 更暗的蓝青色
    
    // 计算输入强度的颜色增强因子
    float colorBoost = 1.0 + u_intensity * 0.3; // 当输入强度增加时，增强颜色
    
    // 增强主要颜色的饱和度
    color1 = saturate(color1 * colorBoost, 1.2 + u_intensity * 0.3);
    color2 = saturate(color2 * colorBoost, 1.3 + u_intensity * 0.3);
    
    // 基于噪声和流体场的颜色混合 - 更强调紫色和蓝色
    vec3 finalColor = mix(
        mix(color1, color2, pattern),
        color3,
        flowField * 0.2 + mouseFactor * 0.15 // 减少第三种颜色的混合比例
    );
    
    // 添加液态金属/有机体效果
    float metalInfluence = u_intensity * 0.3 + 0.1; // 输入强度影响金属效果
    vec3 metalEffect = liquidMetalEffect(uv, u_time, u_mouse, finalColor);
    finalColor = mix(finalColor, metalEffect, metalInfluence);
    
    // 添加Ray Marching有机形态
    float organicDetail = 0.5 + u_intensity * 0.5; // 输入强度影响有机细节
    float organicEffect = raymarchOrganic(p, u_time, organicDetail);
    vec3 organicColor = mix(color2, color1, 0.5) * 0.3; // 使用主色调
    finalColor = mix(finalColor, finalColor + organicColor, organicEffect * 0.15);
    
    // 添加变形斑点效果
    vec2 blobCenter = vec2(0.5) + vec2(sin(u_time * 0.3), cos(u_time * 0.4)) * 0.1;
    vec2 blobP = (uv - blobCenter) * 2.0;
    float morphFactor = 0.2 + u_intensity * 0.15; // 输入强度影响变形程度
    float blob = sdMorphingCircle(blobP, 0.4, morphFactor, u_time);
    float blobMask = 1.0 - smoothstep(0.0, 0.05, blob);
    vec3 blobColor = mix(color1, color2, 0.3 + sin(u_time) * 0.2) * 0.25;
    finalColor = mix(finalColor, finalColor + blobColor, blobMask * 0.15);
    
    // 柔化的鼠标光晕效果 - 大幅降低强度和范围
    float mouseDistance = distance(uv, u_mouse);
    float mouseGlowRadius = 0.15; // 更小的半径
    float mouseGlowIntensity = 0.4; // 更低的强度
    float mouseGlow = smoothstep(mouseGlowRadius, 0.0, mouseDistance) * mouseGlowIntensity;
    
    // 提取当前颜色的色调，用于着色光晕 - 使用主要颜色而不是平均值
    vec3 glowColor = mix(color1, color2, 0.5); // 主要使用蓝紫色调
    finalColor += mouseGlow * glowColor * 0.4; // 使用主色调，降低混合强度
    
    // 增加细微纹理变化代替圆形高光
    float textureDetail = fbm(rotatedUV * 8.0 - u_time * 0.05) * 0.08; // 降低强度
    finalColor += vec3(textureDetail) * 0.25; // 降低纹理亮度
    
    // 输入强度增加时保持颜色饱和度
    finalColor = saturate(finalColor, 1.0 + u_intensity * 0.4);
    
    // 随强度增加亮度，但不淡化颜色
    finalColor = finalColor * (1.0 + u_intensity * 0.15);
    finalColor = min(finalColor, vec3(1.0)); // 防止过亮
    
    // 透明度计算 - 添加鼠标影响
    float alpha = 0.8 + 
                  0.1 * sin(u_time + pattern * 5.0) + 
                  u_intensity * 0.1 + 
                  mouseFactor * 0.1;
    
    gl_FragColor = vec4(finalColor, alpha);   
}  
`; 