// 顶点着色器
export const vertexShader = `
// Vertex Shader: 传递顶点位置和 UV 坐标
// 无需版本声明，Three.js 会自动注入

varying vec2 vUv; // 将 UV 坐标传递给 Fragment Shader

void main() {  
  // 直接使用内置的 attribute "position" 和 "uv" (由 PlaneGeometry 提供)
  vUv = uv; // 传递 UV 坐标
  // gl_Position 是屏幕空间的最终位置
  // 对于全屏背景，通常直接使用原始顶点位置
  gl_Position = vec4(position, 1.0);
}
`;

// 片段着色器
export const fragmentShader = `
precision mediump float; // 设置浮点数精度

// Uniforms: 由 Three.js 传入的变量
uniform float u_time;       // 动画时间 (秒)
uniform vec2  u_resolution; // 画布分辨率 (像素)
uniform vec2  u_mouse;      // 鼠标位置 (归一化到 [0, 1])
uniform float u_intensity;  // 控制效果强度的值 [0, 1]

// Varyings: 从 Vertex Shader 传入的变量
varying vec2 vUv; // 插值后的 UV 坐标 [0, 1]

// --- 常量和参数调整 ---
const float GRID_SCALE = 12.0;        // 网格密度，值越大网格越密
const float LINE_THICKNESS = 0.04;   // 网格线相对粗细 (相对于单元格大小)
const vec3 COLOR_BG = vec3(0.05, 0.0, 0.1); // 背景基础色 (深紫)
const vec3 COLOR_LINE = vec3(0.702, 0.502, 0.027); // 网格线基础色 (亮紫粉) - 也用于鼠标圆环
const vec3 COLOR_DOT = vec3(0.702, 0.502, 0.027);  // 交叉点基础色 (青色)
const float DOT_SIZE = 0.1;         // 交叉点基础大小
const float ANIMATION_SPEED = 0.1;   // 整体动画速度倍率
const float MOUSE_RING_THICKNESS = 0.001; // 鼠标圆环线框的粗细 (UV 单位)
const float MOUSE_RING_SMOOTHNESS = 0.001; // 圆环边缘平滑过渡的宽度

// --- 辅助函数 ---

// 2D 旋转函数
mat2 rotate2d(float angle){
    return mat2(cos(angle), -sin(angle),
                sin(angle), cos(angle));
}

// 简单的伪随机数生成 (基于输入 vec2)
float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 鼠标影响计算函数 (现在主要用于变形和透明度)
// uv: 当前片元 UV (期望是原始屏幕比例 vUv)
// mouse: 鼠标 UV
// radius: 影响半径
// strength: 影响强度 (最大影响程度)
// 返回值: [0, 1]，0 表示在鼠标中心，1 表示在半径外
float mouseInfluence(vec2 uv, vec2 mouse, float radius, float strength) {
    // !!! 使用 distance(uv, mouse) 计算圆形距离 !!!
    float dist = distance(uv, mouse);
    // smoothstep 在 [radius * (1.0 - strength), radius] 范围内从 1 平滑过渡到 0
    return smoothstep(radius * (1.0 - strength), radius, dist);
}

// 创建平滑圆环遮罩的函数
// dist: 到圆心的距离 (期望是基于原始屏幕比例 vUv 计算的距离)
// radius: 圆环的外半径
// thickness: 圆环的厚度
// smoothness: 边缘平滑度
// 返回值: [0, 1], 在环内为 1, 环外为 0, 边缘平滑过渡
float smoothRingMask(float dist, float radius, float thickness, float smoothness) {
    float innerRadius = radius - thickness;
    float inner = smoothstep(innerRadius - smoothness, innerRadius, dist);
    float outer = smoothstep(radius + smoothness, radius, dist);
    return inner * outer;
}


// --- 主函数 ---
void main() {
    // --- 1. 鼠标交互参数计算 ---
    float mouseRadius = 0.12 + u_intensity * 0.03;
    float mouseStrength = 0.6 + u_intensity * 0.04;
    // !!! 使用 vUv 计算 mouseFactor，确保影响区域是圆形的 !!!
    float mouseFactor = mouseInfluence(vUv, u_mouse, mouseRadius, mouseStrength);

    // --- 2. UV 处理与变形 ---
    vec2 uv = vUv; // 从原始 vUv 开始

    // 鼠标附近 UV 轻微扭曲效果 (基于圆形 mouseFactor 和 vUv 距离)
    float mouseDistortionStrength = (1.0 - mouseFactor) * (0.1 + u_intensity * 0.1);
    if (distance(vUv, u_mouse) > 0.001) {
       // 方向基于 vUv，强度基于圆形 mouseFactor
       uv += normalize(vUv - u_mouse) * mouseDistortionStrength;
    }

    // === 处理屏幕宽高比 (仅用于后续的空间计算如网格、旋转) ===
    float aspectRatio = u_resolution.x / u_resolution.y;
    vec2 spatialUV = uv; // 使用可能已被鼠标扭曲的 uv 作为基础
    spatialUV.x *= aspectRatio; // 校正 X 轴

    // 时间相关的全局旋转和缩放 (作用在 spatialUV 上)
    float timeScaled = u_time * ANIMATION_SPEED;
    float angle = timeScaled * 0.05;
    float scale = 1.0 + sin(timeScaled * 0.03) * 0.05;
    vec2 centerOffset = vec2(0.5 * aspectRatio, 0.5);
    spatialUV = (spatialUV - centerOffset) * rotate2d(angle) * scale + centerOffset;

    // --- 3. 网格计算 ---
    // (基于 spatialUV，所以网格本身会适应宽高比)
    float dynamicGridScale = GRID_SCALE * (1.0 + u_intensity * 0.05);
    vec2 gridUv = spatialUV * dynamicGridScale;
    vec2 fractGrid = fract(gridUv);
    vec2 cellId = floor(gridUv);
    float distToLineX = min(fractGrid.x, 1.0 - fractGrid.x);
    float distToLineY = min(fractGrid.y, 1.0 - fractGrid.y);
    float lineThicknessAdj = LINE_THICKNESS * (0.5 + u_intensity * 0.5);
    float lineX = smoothstep(0.0, lineThicknessAdj, distToLineX);
    float lineY = smoothstep(0.0, lineThicknessAdj, distToLineY);
    float gridMask = 1.0 - min(lineX, lineY);

    // --- 4. 交叉点计算 ---
    // (基于 fractGrid，网格单元内部)
    float distToCenter = distance(fractGrid, vec2(0.5));
    float dotSizeAdj = DOT_SIZE * (0.5 + 0.5 * sin(timeScaled * 2.0 + cellId.x * 0.5 + cellId.y * 0.3) + u_intensity * 0.5);
    dotSizeAdj *= (0.8 + random(cellId) * 0.4);
    float dotMask = 1.0 - smoothstep(0.0, dotSizeAdj, distToCenter);

    // --- 5. 鼠标圆环计算 ---
    // !!! 使用 vUv 计算到鼠标的距离，确保圆环是圆形的 !!!
    float distToMouse = distance(vUv, u_mouse);
    float mouseRingMask = smoothRingMask(distToMouse, mouseRadius, MOUSE_RING_THICKNESS, MOUSE_RING_SMOOTHNESS);

    // --- 6. 颜色混合 ---
    vec3 finalColor = COLOR_BG;
    vec3 dynamicLineColor = COLOR_LINE * (0.7 + u_intensity * 0.6);
    finalColor = mix(finalColor, dynamicLineColor, gridMask);
    vec3 dynamicDotColor = COLOR_DOT * (0.7 + u_intensity * 0.6);
    finalColor = mix(finalColor, dynamicDotColor, dotMask * (1.0 - gridMask));
    // 混合鼠标圆环 (基于圆形的 mouseRingMask)
    vec3 mouseRingColor = COLOR_LINE * (0.8 + u_intensity * 0.4);
    finalColor = mix(finalColor, mouseRingColor, mouseRingMask);

    // --- 7. 透明度计算 ---
    // (透明度效果基于原始 vUv 或时间)
    float baseAlpha = 0.7;
    float timeAlphaFactor = 0.1 * sin(timeScaled + vUv.y * 5.0);
    // 鼠标附近透明度变化 (基于圆形的 mouseFactor)
    float mouseAlphaFactor = (1.0 - mouseFactor) * 0.1;
    float finalAlpha = baseAlpha + timeAlphaFactor + mouseAlphaFactor + u_intensity * 0.1;
    finalAlpha = clamp(finalAlpha, 0.1, 1.0);

    // --- 输出最终颜色 ---
    gl_FragColor = vec4(finalColor, finalAlpha);
}
`; 