import * as THREE from 'three';
import earthUrl from './assets/earth.png';

/** Fibonacci samples over the whole sphere; only the ones on land become points (~30%). */
const SAMPLES = 220_000;

/**
 * The Earth at night: land as fine dim dots, city lights as warm bright ones (NASA's land mask and night lights,
 * packed into assets/earth.png: red = land, green = lights). The lights go out as the species headcount falls,
 * in a wave that follows 5 PM around the world, east to west. Some lights turn teal and stay on (the agents that
 * took our place). One light, facing the camera at the end, is always the last human one to go.
 */
export class Globe {
  readonly group = new THREE.Group();
  readonly uniforms = {
    uOpacity: { value: 0 },
    uOff: { value: 0 },      // fraction of humanity switched off
    uLast: { value: 1 },     // the last light
    uAgents: { value: 0 },   // how many of the agent lights have come on (0..1)
    uScale: { value: 1 },    // point size scale (render height / 1080)
    uPulse: { value: 0 },
    uSunDir: { value: new THREE.Vector2(0, 1) }, // screen direction of the sun from the globe's center
    uSunAmt: { value: 0 },   // how hard the sunset lights up that side of the atmosphere
  };
  /** Angle of the last light around the y axis; rotation.y = lastPhi - π/2 puts it facing the camera. */
  lastPhi = 0;

  private constructor(readonly radius: number) {}

  static async load(radius = 6) {
    const g = new Globe(radius);
    const img = new Image();
    img.src = earthUrl;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true })!;
    cx.drawImage(img, 0, 0);
    g.build(cx.getImageData(0, 0, cv.width, cv.height));
    return g;
  }

  private build(map: ImageData) {
    const { width: mw, height: mh, data } = map, R = this.radius;
    const at = (lat: number, lon: number, ch: number) => {
      const u = Math.min(mw - 1, Math.floor(((lon + Math.PI) / (2 * Math.PI)) * mw));
      const v = Math.min(mh - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * mh));
      return data[(v * mw + u) * 4 + ch] / 255;
    };
    const hash = (i: number) => Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
    const pos: number[] = [], light: number[] = [], key: number[] = [], agent: number[] = [], last: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    let best = -1, bestLight = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const y = 1 - (i / (SAMPLES - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * golden;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      // facing +z is longitude 0, east is +x, north is +y
      const lat = Math.asin(y), lon = Math.atan2(x, z);
      if (at(lat, lon, 0) < 0.5) continue;
      const raw = Math.max(at(lat, lon, 1), at(lat + 0.004, lon, 1), at(lat, lon + 0.004, 1));
      const l = Math.pow(Math.max(0, (raw - 0.2) / 0.8), 0.8);
      const h = hash(i);
      pos.push(x * R, y * R, z * R);
      light.push(l);
      // 5 PM arrives in the east first: the switch-off order runs from the date line westward, with some scatter
      key.push(Math.min(0.999, ((Math.PI - lon) / (2 * Math.PI)) * 0.82 + h * 0.18));
      // most lights are taken over by an agent the moment 5 PM reaches them: agents outgrow the people they replace
      agent.push(l > 0.08 && hash(i + 7) < 0.6 + 0.3 * l ? hash(i + 3) : -1);
      last.push(0);
      if (Math.abs(lat) < 0.06 && l > bestLight) { bestLight = l; best = light.length - 1; }
    }
    // the last light: the brightest city near the equator (it stays human, and goes out last)
    last[best] = 1; key[best] = 1; agent[best] = -1; light[best] = 1;
    this.lastPhi = Math.atan2(pos[best * 3 + 2], pos[best * 3]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aLight', new THREE.Float32BufferAttribute(light, 1));
    geo.setAttribute('aKey', new THREE.Float32BufferAttribute(key, 1));
    geo.setAttribute('aAgent', new THREE.Float32BufferAttribute(agent, 1));
    geo.setAttribute('aLast', new THREE.Float32BufferAttribute(last, 1));

    // the night side of the planet: an opaque dark sphere, so the far side (and the sun behind it) is hidden.
    // It has a bright thin limb, a soft sheen from the upper left, and a glowing "5 PM" line that sweeps from the date
    // line westward, in step with the lights going out.
    const ocean = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.995, 96, 48),
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: this.uniforms.uOpacity, uOff: this.uniforms.uOff },
        transparent: true,
        vertexShader: /* glsl */ `
          varying float vRim;
          varying vec3 vObj, vNv;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNv = normalize(normalMatrix * normal);
            vRim = 1.0 - abs(dot(vNv, normalize(-mv.xyz)));
            vObj = position;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uOpacity, uOff;
          varying float vRim;
          varying vec3 vObj, vNv;
          void main() {
            // linear colours (the output pass converts to sRGB)
            vec3 col = mix(vec3(0.0030, 0.0045, 0.0160), vec3(0.008, 0.012, 0.05), pow(vRim, 3.0));
            float sheen = pow(max(0.0, dot(vNv, normalize(vec3(-0.45, 0.55, 0.7)))), 2.5);
            col += vec3(0.004, 0.009, 0.030) * sheen;
            col += vec3(0.05, 0.10, 0.36) * pow(vRim, 5.0) * 0.9; // a crisp bright edge
            // where it is 5 PM right now: the same longitude the lights are going out at
            float lon = atan(vObj.x, vObj.z), lat = vObj.y / length(vObj);
            float edge = 3.14159265 - (uOff / 0.82) * 6.2831853;
            float dl = mod(lon - edge + 3.14159265, 6.2831853) - 3.14159265;
            float on = smoothstep(0.003, 0.02, uOff) * (1.0 - smoothstep(0.78, 0.84, uOff));
            float line = exp(-dl * dl * 90.0) * (1.0 - 0.6 * lat * lat);
            float dusk = smoothstep(0.0, 0.5, dl) * (1.0 - smoothstep(0.5, 1.4, dl)) * 0.25; // a soft glow behind it, on the side already gone dark
            col += vec3(1.0, 0.42, 0.16) * (line * 0.05 + dusk * 0.008) * on;
            gl_FragColor = vec4(col, uOpacity);
          }
        `,
      }),
    );
    ocean.renderOrder = 0;

    const points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aLight, aKey, aAgent, aLast;
        uniform float uOff, uLast, uScale, uPulse, uAgents;
        varying vec3 vCol;
        varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(mat3(modelViewMatrix) * position);
          float limb = smoothstep(-0.02, 0.35, n.z);
          // a human light is on until 5 PM reaches it; the last one obeys uLast only
          float human = aLight * (aLast > 0.5 ? uLast : smoothstep(uOff - 0.004, uOff + 0.004, aKey));
          // an agent light comes on (with a flash) and never goes out
          float ag = aAgent < 0.0 ? 0.0 : smoothstep(aKey - 0.004, aKey + 0.004, uOff);
          float flash = aAgent < 0.0 ? 0.0 : (1.0 - smoothstep(0.0, 0.05, uOff - aKey)) * ag;
          human *= 1.0 - ag;
          vec3 land = vec3(0.16, 0.2, 0.42);
          vec3 warm = mix(vec3(1.0, 0.5, 0.18), vec3(1.0, 0.78, 0.5), aLight);
          warm = mix(warm, vec3(1.0, 0.6, 0.78), aLast);
          vec3 teal = vec3(0.37, 0.88, 0.84);
          vCol = land * 0.16 + warm * human * 1.1 + teal * ag * (1.15 + flash * 2.2);
          vA = limb;
          float size = 1.5 + human * (1.6 + aLight * 2.6 + uPulse * 1.2) + ag * (0.5 + 0.8 * aAgent * aAgent * aAgent + 0.6 * aAgent) * (1.6 + flash * 3.0) + aLast * 7.0 * uLast;
          gl_PointSize = size * uScale * (24.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec3 vCol;
        varying float vA;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          float soft = smoothstep(0.5, 0.1, r);
          gl_FragColor = vec4(vCol, soft * vA * uOpacity); // additive: adds col * a
        }
      `,
    }));
    points.frustumCulled = false;
    points.renderOrder = 1;

    // the atmosphere: a halo that falls off smoothly with distance from the limb (measured along each view ray, so it has no
    // hard inner edge), with a thin bright line right at the limb; it flares orange on the side the sun is setting behind
    const RA = R * 1.2;
    const rim = new THREE.Mesh(new THREE.SphereGeometry(RA, 96, 48), new THREE.ShaderMaterial({
      uniforms: { uOpacity: this.uniforms.uOpacity, uOff: this.uniforms.uOff, uSunDir: this.uniforms.uSunDir, uSunAmt: this.uniforms.uSunAmt, uR: { value: R }, uRa: { value: RA } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      vertexShader: /* glsl */ `
        varying vec3 vP, vC;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vP = mv.xyz;
          vC = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity, uOff, uSunAmt, uR, uRa;
        uniform vec2 uSunDir;
        varying vec3 vP, vC;
        void main() {
          vec3 d = normalize(vP);
          vec3 closest = d * dot(vC, d) - vC;   // from the planet's centre to the nearest point on this view ray
          float b = length(closest);
          if (b < uR) discard;
          float h = clamp((b - uR) / (uRa - uR), 0.0, 1.0);
          float body = pow(1.0 - h, 3.5) * 0.5 + exp(-h * 28.0) * 0.5;
          vec3 col = mix(vec3(0.28, 0.45, 1.0), vec3(0.2, 0.24, 0.55), uOff) * body * 0.55;
          float toward = max(0.0, dot(normalize(closest.xy + 1e-5), uSunDir));
          col += vec3(1.0, 0.55, 0.22) * pow(1.0 - h, 2.2) * pow(toward, 6.0) * uSunAmt * 1.6;
          gl_FragColor = vec4(col * uOpacity, 1.0);
        }
      `,
    }));
    rim.renderOrder = 2;

    this.group.add(ocean, points, rim);
  }

  update(o: { opacity: number; off: number; last: number; agents: number; pulse: number; scale: number; sunDir: THREE.Vector2; sunAmt: number }) {
    this.group.visible = o.opacity > 0.001;
    const u = this.uniforms;
    u.uOpacity.value = o.opacity;
    u.uOff.value = o.off;
    u.uLast.value = o.last;
    u.uAgents.value = o.agents;
    u.uPulse.value = o.pulse;
    u.uScale.value = o.scale;
    u.uSunDir.value.copy(o.sunDir);
    u.uSunAmt.value = o.sunAmt;
  }
}

/** A soft radial sprite texture (for the sun's disc and its glow). */
function glowTexture(stops: [number, string][]) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The sun, setting behind the Earth. The disc is depth-tested, so the planet hides it as it goes down; the glow
 * around it isn't, and fades as the disc slips behind the limb.
 */
export class Sun {
  readonly group = new THREE.Group();
  private disc = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture([[0, '#ffffff'], [0.3, '#fff4d6'], [0.42, '#ffd27a'], [0.5, 'rgba(255,170,90,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  private glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture([[0, 'rgba(255,214,140,0.9)'], [0.15, 'rgba(255,160,80,0.45)'], [0.45, 'rgba(255,100,90,0.12)'], [1, 'rgba(255,90,110,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true,
  }));

  constructor() {
    this.disc.renderOrder = 3;
    this.glow.renderOrder = 4;
    this.group.add(this.glow, this.disc);
  }

  update(pos: THREE.Vector3, size: number, o: { disc: number; glow: number }) {
    this.group.visible = o.disc > 0.001 || o.glow > 0.001;
    this.group.position.copy(pos);
    this.disc.scale.setScalar(size);
    this.glow.scale.setScalar(size * 9);
    this.disc.material.opacity = o.disc;
    this.glow.material.opacity = o.glow;
  }
}
