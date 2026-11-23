import * as THREE from 'three';
import { MONO } from './text';

const AROUND = 44;
const RINGS = 120;
const SPACING = 0.54;
export const TUNNEL_LENGTH = RINGS * SPACING;

/** A cylinder of drifting glyphs: the whole conversation, flowing away toward the edge. */
export class Tunnel {
  readonly mesh: THREE.Mesh;
  readonly uniforms;

  constructor(corpus: string) {
    // glyph atlas: printable ASCII 32..127, 16 x 6 cells
    const cell = 64;
    const atlas = document.createElement('canvas');
    atlas.width = 16 * cell;
    atlas.height = 6 * cell;
    const ctx = atlas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.font = `500 ${cell * 0.78}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 96; i++) {
      ctx.fillText(String.fromCharCode(32 + i), (i % 16 + 0.5) * cell, (Math.floor(i / 16) + 0.52) * cell);
    }
    const tex = new THREE.CanvasTexture(atlas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('uv', base.getAttribute('uv'));
    const n = AROUND * RINGS;
    const aCell = new Float32Array(n * 2);
    const aGlyph = new Float32Array(n);
    const aSeed = new Float32Array(n);
    const text = corpus.replace(/[^\x20-\x7e]/g, ' ');
    for (let r = 0; r < RINGS; r++) {
      for (let a = 0; a < AROUND; a++) {
        const i = r * AROUND + a;
        aCell[i * 2] = a;
        aCell[i * 2 + 1] = r;
        aGlyph[i] = text.charCodeAt(i % text.length) - 32;
        aSeed[i] = Math.random();
      }
    }
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 2));
    geo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(aGlyph, 1));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    geo.instanceCount = n;

    this.uniforms = {
      uAtlas: { value: tex },
      uFlow: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uBass: { value: 0 },
      uKick: { value: 0 },
      uHot: { value: 0 }, // 0 = cold blue/amber, 1 = red-hot (final chorus)
      uRadius: { value: 4.6 },
      uScramble: { value: 0.015 },
      uEnergy: { value: 0 }, // section intensity: 0 calm .. 1 final chorus
      uLetters: { value: 0 }, // 0 = abstract pixel tokens, 1 = readable letters
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      defines: { AROUND: AROUND.toFixed(1), SPACING: SPACING.toFixed(3), LENGTH: TUNNEL_LENGTH.toFixed(3) },
      vertexShader: /* glsl */ `
        attribute vec2 aCell;
        attribute float aGlyph;
        attribute float aSeed;
        uniform float uFlow, uTime, uRadius, uScramble;
        varying vec2 vUv;
        varying float vFade, vSeed, vGlyph, vDist;
        float h(float n) { return fract(sin(n) * 43758.5453); }
        void main() {
          float ang = (aCell.x + 0.5) / AROUND * 6.2831853 + aCell.y * 0.004;
          float z = -mod(aCell.y * SPACING + uFlow, LENGTH);
          float dist = -z;
          float r = uRadius * mix(1.0, 0.55, smoothstep(0.0, LENGTH, dist));
          vec3 center = vec3(cos(ang) * r, sin(ang) * r, z);
          vec3 tangent = vec3(sin(ang), -cos(ang), 0.0); // faces inward, so glyphs read correctly
          float size = 6.2831853 * r / AROUND;
          vec3 p = center + tangent * position.x * size * 0.6 + vec3(0.0, 0.0, 1.0) * position.y * size * 0.9;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);

          float tick = floor(uTime * 9.0 + aSeed * 50.0);
          float flick = step(1.0 - uScramble, h(aSeed * 91.7 + tick));
          vGlyph = mod(aGlyph + flick * floor(h(aSeed + tick) * 95.0), 96.0);
          vUv = uv;
          vSeed = aSeed;
          vDist = dist;
          float keep = step(0.55, h(aCell.y * 7.31 + floor(aCell.x / 5.0) * 1.7));
          vFade = keep * smoothstep(4.0, 12.0, dist) * (1.0 - smoothstep(LENGTH * 0.45, LENGTH * 0.9, dist));
          if (keep < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // cull hidden chunks
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas;
        uniform float uOpacity, uBass, uKick, uHot, uTime, uLetters, uEnergy;
        varying vec2 vUv;
        varying float vFade, vSeed, vGlyph, vDist;
        void main() {
          vec2 cell = vec2(mod(vGlyph, 16.0), floor(vGlyph / 16.0));
          vec2 auv = vec2((cell.x + vUv.x) / 16.0, 1.0 - (cell.y + 1.0 - vUv.y) / 6.0);
          float letter = texture2D(uAtlas, auv).r;
          vec2 q = abs(vUv - 0.5);
          float token = step(max(q.x, q.y), 0.11) * step(0.5, fract(vGlyph * 0.618)); // sparse square pixels
          float g = mix(token, letter, uLetters);

          // pulse rings travelling down the tunnel on kicks
          float wave = pow(max(0.0, sin(vDist * 0.35 - uTime * 5.0)), 12.0);
          float lit = mix(0.1, 0.32, uEnergy) + step(0.95, vSeed) * mix(0.22, 0.7, uEnergy)
                    + wave * (0.06 + uBass * 0.3) * (1.0 + 2.5 * uEnergy) + uKick * 0.12;

          vec3 cold = mix(vec3(0.35, 0.55, 1.0), vec3(1.0, 0.62, 0.35), step(0.93, vSeed));
          vec3 hot = mix(vec3(1.0, 0.18, 0.12), vec3(1.0, 0.9, 0.8), step(0.9, vSeed));
          vec3 col = mix(cold, hot, uHot) * lit;
          gl_FragColor = vec4(col * g * vFade * uOpacity, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }
}
