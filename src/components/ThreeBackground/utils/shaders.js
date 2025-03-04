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
    vec2 uv = vUv;  
      
    // 动态参数  
    float moveSpeed = 0.2;  
    float moveAmount = 1.5;  
    float verticalOffset = u_time * moveSpeed;  
      
    // 波浪效果  
    float waveFreq = 2.0;  
    float waveAmp = 0.1;  
    float horizontalWave = sin(uv.x * waveFreq * 3.14159 + u_time) * waveAmp;  
      
    // 坐标变换  
    vec2 distortedUV = vec2(  
        uv.x,  
        mod(uv.y + verticalOffset + horizontalWave, 1.0)  
    );  
      
    // 噪声计算  
    float noiseScale = 2.0 + u_intensity * 1.5;  
    float n = noise(distortedUV * noiseScale);  
      
    // 颜色混合  
    vec3 color1 = vec3(0.4, 0.6, 0.9);  
    vec3 color2 = vec3(0.2, 0.3, 0.7);  
    vec3 activeColor = vec3(0.6, 0.8, 1.0);  
      
    float gradientFactor = smoothstep(0.0, 1.0, distortedUV.y);  
    vec3 baseColor = mix(color2, color1, gradientFactor);  
      
    vec3 finalColor = mix(  
        mix(baseColor, color2, n),  
        activeColor,  
        u_intensity * 0.3  
    );  
      
    // 透明度计算  
    float alpha = 0.7 +   
                0.15 * sin(u_time + distortedUV.y * 3.0) +   
                u_intensity * 0.15;  
      
    // 边缘渐晕  
    float vignette = 1.0 - length(uv - 0.5) * 1.5;  
    vignette = clamp(vignette, 0.0, 1.0);  
      
    gl_FragColor = vec4(finalColor * vignette, alpha);  
}
`; 