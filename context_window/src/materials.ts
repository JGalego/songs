import * as THREE from 'three';

const HASH = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

/**
 * Textured plane that can glitch and disintegrate into blocks.
 * uDissolve 0 = intact, 1 = gone. Blocks near the dissolve front glow hot.
 */
export function dissolveMaterial(map: THREE.Texture, aspect: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      map: { value: map },
      uOpacity: { value: 1 },
      uDissolve: { value: 0 },
      uGlitch: { value: 0 },
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uBlocks: { value: new THREE.Vector2(14 * aspect, 14) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float uOpacity, uDissolve, uGlitch, uTime;
      uniform vec3 uTint;
      uniform vec2 uBlocks;
      varying vec2 vUv;
      ${HASH}
      void main() {
        vec2 uv = vUv;
        float row = floor(uv.y * 18.0);
        float g = step(1.0 - uGlitch * 0.6, hash(vec2(row, floor(uTime * 14.0))));
        uv.x += g * (hash(vec2(row, floor(uTime * 30.0))) - 0.5) * 0.12 * uGlitch;
        vec4 c = texture2D(map, uv);

        vec2 block = floor(vUv * uBlocks);
        float n = hash(block + 0.37);
        // dissolve sweeps from the far (left) edge with per-block jitter
        float front = n * 0.7 + (1.0 - vUv.x) * 0.3;
        if (front < uDissolve) discard;
        float hot = (1.0 - smoothstep(uDissolve, uDissolve + 0.08, front)) * step(0.001, uDissolve);

        vec3 col = c.rgb * uTint;
        col = mix(col, vec3(1.6, 0.6, 0.25), hot);
        float a = max(c.a, hot * 0.9) * uOpacity;
        if (a < 0.004) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}

export type DissolveMaterial = ReturnType<typeof dissolveMaterial>;
