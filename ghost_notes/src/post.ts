import * as THREE from 'three';

/** Retro look: pixelation, RGB split and row glitches (for the big moments), plus a soft vignette and dither. */
export const RetroShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(1920, 1080) },
    uPixel: { value: 2 },
    uRGB: { value: 1.5 },
    uGlitch: { value: 0 },
    uVignette: { value: 0.9 },
    uFade: { value: 0 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uPixel, uRGB, uGlitch, uVignette, uFade, uTime;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      float band = floor(uv.y * 36.0);
      float tick = floor(uTime * 18.0);
      float g = step(1.0 - uGlitch * 0.35, hash(vec2(band, tick)));
      uv.x += g * (hash(vec2(band * 3.1, tick)) - 0.5) * 0.1 * uGlitch;

      vec2 grid = uRes / max(uPixel, 1.0);
      vec2 puv = uPixel > 1.01 ? (floor(uv * grid) + 0.5) / grid : uv;

      float s = (uRGB + g * 14.0 * uGlitch) / uRes.x;
      vec3 col = vec3(
        texture2D(tDiffuse, puv + vec2(s, 0.0)).r,
        texture2D(tDiffuse, puv).g,
        texture2D(tDiffuse, puv - vec2(s, 0.0)).b
      );
      vec2 d = vUv - 0.5;
      col *= 1.0 - uVignette * dot(d, d) * 1.6;
      col *= 1.0 - uFade;
      // a whisper of noise so the dark gradients don't band in 8-bit
      col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) / 255.0;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
