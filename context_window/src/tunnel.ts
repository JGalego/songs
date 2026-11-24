import * as THREE from 'three';
import { MONO } from './text';

const AROUND = 44;
const RINGS = 120;
const SPACING = 0.54;
export const TUNNEL_LENGTH = RINGS * SPACING;

/**
 * A cylinder of drifting text: the whole conversation, flowing away toward the edge. Whole words appear as the context
 * fills (uFill), so the tunnel is empty at the start of a conversation and packed just before compaction.
 */
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
    const aWord = new Float32Array(n);
    const text = corpus.replace(/[^\x20-\x7e]/g, ' ');
    // word index of every character, so a word appears all at once
    const wordOf = new Float32Array(text.length);
    let words = 0;
    for (let i = 0; i < text.length; i++) { if (text[i] === ' ') words++; wordOf[i] = words; }
    words++;
    for (let r = 0; r < RINGS; r++) {
      for (let a = 0; a < AROUND; a++) {
        const i = r * AROUND + a;
        aCell[i * 2] = a;
        aCell[i * 2 + 1] = r;
        aGlyph[i] = text.charCodeAt(i % text.length) - 32;
        aSeed[i] = Math.random();
        aWord[i] = wordOf[i % text.length] + Math.floor(i / text.length) * words; // each repeat of the corpus differs
      }
    }
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 2));
    geo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(aGlyph, 1));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    geo.setAttribute('aWord', new THREE.InstancedBufferAttribute(aWord, 1));
    geo.instanceCount = n;

    this.uniforms = {
      uAtlas: { value: tex },
      uFlow: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uBass: { value: 0 },
      uKick: { value: 0 },
      uHot: { value: 0 }, // 0 = verse/chorus colours, 1 = red-hot (end of the final chorus)
      uChorus: { value: 0 }, // 0 = calm blue/amber, 1 = neon (choruses)
      uFill: { value: 0 }, // share of the conversation's words written on the walls
      uRadius: { value: 4.6 },
      uScramble: { value: 0.015 },
      uEnergy: { value: 0 }, // section intensity: 0 calm .. 1 final chorus
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
        attribute float aWord;
        uniform float uFlow, uTime, uRadius, uScramble, uFill;
        varying vec2 vUv;
        varying float vFade, vSeed, vGlyph, vDist, vAng;
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
          vAng = ang;
          float rank = h(aWord * 1.731 + 0.37);
          float written = smoothstep(rank, rank + 0.015, uFill);
          vFade = written * smoothstep(4.0, 12.0, dist) * (1.0 - smoothstep(LENGTH * 0.45, LENGTH * 0.9, dist));
          if (written <= 0.0 || aGlyph < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // cull unwritten words and spaces
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas;
        uniform float uOpacity, uBass, uKick, uHot, uTime, uEnergy, uChorus;
        varying vec2 vUv;
        varying float vFade, vSeed, vGlyph, vDist, vAng;
        // magenta -> cyan -> amber -> magenta
        vec3 neon(float u) {
          u = fract(u) * 3.0;
          vec3 m = vec3(1.0, 0.16, 0.72), c = vec3(0.12, 0.86, 1.0), a = vec3(1.0, 0.64, 0.16);
          return u < 1.0 ? mix(m, c, smoothstep(0.0, 1.0, u)) : u < 2.0 ? mix(c, a, smoothstep(1.0, 2.0, u)) : mix(a, m, smoothstep(2.0, 3.0, u));
        }
        void main() {
          vec2 cell = vec2(mod(vGlyph, 16.0), floor(vGlyph / 16.0));
          vec2 auv = vec2((cell.x + vUv.x) / 16.0, 1.0 - (cell.y + 1.0 - vUv.y) / 6.0);
          float g = texture2D(uAtlas, auv).r;

          // pulse rings travelling down the tunnel on kicks
          float wave = pow(max(0.0, sin(vDist * 0.35 - uTime * 5.0)), 12.0);
          float lit = mix(0.22, 0.4, uEnergy) + step(0.95, vSeed) * mix(0.3, 0.8, uEnergy)
                    + wave * (0.08 + uBass * 0.4) * (1.0 + 2.5 * uEnergy) + uKick * 0.15;

          vec3 calm = mix(vec3(0.35, 0.55, 1.0), vec3(1.0, 0.62, 0.35), step(0.9, vSeed));
          vec3 bright = neon(vAng / 6.2831853 + vDist * 0.012 - uTime * 0.07) * 1.5;
          vec3 hot = mix(vec3(1.0, 0.18, 0.12), vec3(1.0, 0.9, 0.8), step(0.9, vSeed)) * 1.3;
          vec3 col = mix(mix(calm, bright, uChorus), hot, uHot) * lit;
          gl_FragColor = vec4(col * g * vFade * uOpacity, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }
}
