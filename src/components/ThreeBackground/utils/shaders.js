// 顶点着色器
export const vertexShader = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

// 片段着色器
export const fragmentShader = `
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_intensity;

float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    
    float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), 
        u.y);
    return res * res;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // 添加垂直移动
    float moveSpeed = 0.2; // 基础移动速度
    float moveAmount = 1.5; // 移动幅度
    float verticalOffset = u_time * moveSpeed;
    
    // 添加波浪效果
    float waveFreq = 2.0; // 波浪频率
    float waveAmp = 0.1; // 波浪幅度
    float horizontalWave = sin(uv.x * waveFreq * 3.14159 + u_time) * waveAmp;
    
    // 将垂直移动和波浪效果结合
    vec2 distortedUV = vec2(
        uv.x,
        mod(uv.y + verticalOffset + horizontalWave, 1.0)
    );
    
    // 降低基础噪声缩放，使图案更大更柔和
    float noiseScale = 2.0 + u_intensity * 1.5;
    float n = noise(distortedUV * noiseScale);
    
    // 使用更柔和的基础颜色
    vec3 color1 = vec3(0.4, 0.6, 0.9); // 柔和的蓝色
    vec3 color2 = vec3(0.2, 0.3, 0.7); // 深蓝色
    vec3 activeColor = vec3(0.6, 0.8, 1.0); // 活跃状态的颜色
    
    // 添加垂直渐变
    float gradientFactor = smoothstep(0.0, 1.0, distortedUV.y);
    vec3 baseColor = mix(color2, color1, gradientFactor);
    
    // 减小颜色混合强度
    vec3 finalColor = mix(
        mix(baseColor, color2, n),
        activeColor,
        u_intensity * 0.3
    );
    
    // 减小透明度变化幅度，添加垂直变化
    float alpha = 0.7 + 
                 0.15 * sin(u_time + distortedUV.y * 3.0) + 
                 u_intensity * 0.15;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`; 