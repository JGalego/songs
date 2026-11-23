import * as THREE from 'three';

const N = 24000;

/**
 * One planet, as-is: a sphere of points, one per ~340,000 people. Points switch off in a wave that sweeps
 * around the globe as the species headcount falls. One point, facing the camera, is always the last to go.
 */
export class Globe {
  readonly group = new THREE.Group();
  readonly uniforms = {
    uOpacity: { value: 0 },
    uOff: { value: 0 },     // fraction of humanity switched off
    uLast: { value: 1 },    // the last light
    uTime: { value: 0 },
    uScale: { value: 1 },   // point size scale (render height / 1080)
    uPulse: { value: 0 },
  };
  /** Longitude of the last light; rotation.y = lastPhi - π/2 puts it facing the camera. */
  readonly lastPhi = ((N >> 1) * Math.PI * (3 - Math.sqrt(5))) % (2 * Math.PI);
  private points: THREE.Points;
  private rim: THREE.Mesh;
  private rimMat: THREE.ShaderMaterial;

  constructor(readonly radius = 6) {
    const pos = new Float32Array(N * 3);
    const key = new Float32Array(N);
    const last = new Float32Array(N);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * golden;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.set([x * radius, y * radius, z * radius], i * 3);
      // switch-off order: a front sweeping across the sphere from one side (smooth, no seam), with scatter
      const side = (x * 0.8 + y * 0.25 + z * 0.55) / Math.hypot(0.8, 0.25, 0.55);
      const scatter = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
      key[i] = Math.min(0.999, Math.max(0, (side * 0.5 + 0.5) * 0.6 + scatter * 0.4));
    }
    // the last light: the point nearest the front at the moment it matters (see main.ts for the rotation)
    last[N >> 1] = 1;
    key[N >> 1] = 1;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aKey', new THREE.BufferAttribute(key, 1));
    geo.setAttribute('aLast', new THREE.BufferAttribute(last, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aKey;
        attribute float aLast;
        uniform float uOff, uLast, uScale, uPulse;
        varying float vOn;
        varying float vFacing;
        varying float vLast;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // on until the wave passes; the last light obeys uLast only
          float on = aLast > 0.5 ? uLast : smoothstep(uOff - 0.004, uOff + 0.004, aKey);
          vOn = on;
          vLast = aLast;
          vec3 n = normalize(mat3(modelViewMatrix) * position);
          vFacing = smoothstep(-0.15, 0.35, n.z); // the far side stays hidden (additive points would pile up)
          gl_Position = projectionMatrix * mv;
          float size = (on > 0.5 ? 2.8 + uPulse * 1.2 : 1.8) + aLast * 12.0 * uLast;
          gl_PointSize = size * uScale * (24.0 / -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vOn;
        varying float vFacing;
        varying float vLast;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          float soft = smoothstep(0.5, 0.15, r);
          vec3 lit = mix(vec3(1.0, 0.82, 0.6), vec3(1.0, 0.95, 0.88), vFacing);
          lit = mix(lit, vec3(1.0, 0.62, 0.8), vLast);
          vec3 dark = vec3(0.2, 0.22, 0.42);
          vec3 col = mix(dark, lit, vOn);
          float a = soft * uOpacity * vFacing * mix(0.18, 0.42, vOn) + vLast * soft * uOpacity;
          gl_FragColor = vec4(col, a); // additive: adds col * a
        }
      `,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    // a faint atmosphere
    this.rimMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: this.uniforms.uOpacity, uOff: this.uniforms.uOff },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity, uOff;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float f = pow(1.0 - abs(dot(vN, vV)), 4.0);
          vec3 col = mix(vec3(0.66, 0.55, 0.98), vec3(0.3, 0.32, 0.6), uOff);
          gl_FragColor = vec4(col * f * uOpacity * 0.28, 1.0);
        }
      `,
    });
    this.rim = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.04, 64, 32), this.rimMat);
    this.group.add(this.rim);
  }

  update(t: number, o: { opacity: number; off: number; last: number; pulse: number; scale: number }) {
    this.group.visible = o.opacity > 0.001;
    const u = this.uniforms;
    u.uOpacity.value = o.opacity;
    u.uOff.value = o.off;
    u.uLast.value = o.last;
    u.uTime.value = t;
    u.uPulse.value = o.pulse;
    u.uScale.value = o.scale;
  }
}
