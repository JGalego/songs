// The piano roll, in 3D: a dark grid sheet at the front where the AI writes its notes (bright, drawn as they're
// sung), and behind it a stack of glass sheets, one per song it learned from, full of ghost notes.
//
// World units: x = beats (BX per beat), y = pitch (PY per semitone, middle C at 0), z = layer (LZ per layer, front at 0).
import * as THREE from 'three';
import { CanvasTex } from './text';
import { BRIGHT, LAYERS, LAYER_COLORS, N_LAYERS } from './songs';
import { C, rnd, txt } from './art';

export const BX = 1;
export const PY = 0.3;
export const LZ = 0.72;
export const Y = (midi: number) => (midi - 60) * PY;
export const PITCH_LO = 33, PITCH_HI = 90;
/** How far the keyboard sits left of the playhead, in beats. */
export const KEYS_AT = 4.6;

const NOTE_VERT = /* glsl */ `
  attribute vec4 aNote;   // start (beats), length (beats), midi, layer
  attribute vec4 aMeta;   // seed, kind (0 bright, 1 ghost, 2 twin), velocity, 0
  attribute vec3 aColor;  // the song's channel colour (linear)
  varying vec3 vColor;
  uniform float uBeat, uAhead, uBehind, uPull, uLift, uDrop, uBright, uGhost, uDepth, uFlash, uTwinHi, uVelHi, uGlow;
  uniform float uLayer[${N_LAYERS + 1}];
  varying vec2 vUv;
  varying vec2 vSize;
  varying float vAlpha, vKind, vPlay, vVel, vGlow, vTwinHi;
  void main() {
    float start = aNote.x, len = aNote.y, midi = aNote.z, layer = aNote.w;
    float seed = aMeta.x, kind = aMeta.y, vel = aMeta.z;
    vKind = kind; vVel = vel; vUv = uv; vColor = aColor;
    // bright notes are written as they're sung: they grow from the playhead
    float shown = kind < 0.5 ? clamp(uBeat - start, 0.0, len) : len;
    bool off = start + len < uBeat - uBehind - 1.0 || start > uBeat + uAhead || shown <= 0.001;
    float z = -layer * ${LZ.toFixed(3)};
    float pull = kind > 1.5 ? uPull : 0.0;
    z = mix(z, 0.03, pull);
    float w = max(shown * ${BX.toFixed(3)} - 0.05, 0.02);
    float h = ${PY.toFixed(3)} * (kind < 0.5 ? 0.86 : 0.78);
    vec3 p = vec3(start * ${BX.toFixed(3)} + position.x * w, (midi - 60.0) * ${PY.toFixed(3)} + position.y * h, z + 0.02);
    // the ghosts leave: they fall away (choruses) or float up and out (the end)
    float ghostly = kind > 0.5 ? 1.0 : 0.0;
    p.y -= ghostly * uDrop * uDrop * (5.0 + seed * 9.0);
    p.y += ghostly * uLift * uLift * (3.0 + seed * 14.0);
    p.x += ghostly * uLift * (seed - 0.5) * 10.0;
    p.z += ghostly * uLift * (seed * 6.0 - 1.0);
    vSize = vec2(w, h);
    // playing right now?
    vPlay = step(start, uBeat) * step(uBeat, start + len);
    // notes slide away under the keyboard
    float left = smoothstep(uBeat - uBehind, uBeat - uBehind + 1.5, start + shown);
    float a;
    if (kind < 0.5) a = uBright;
    else {
      float depth = exp(-layer * uDepth);
      float on = max(uGhost * uLayer[int(layer + 0.5)], uFlash * (0.4 + 0.6 * fract(seed * 7.3)));
      a = on * mix(depth, 1.0, max(pull, uGlow * 0.6)) * (1.0 - uDrop) * (1.0 - smoothstep(0.55, 1.0, uLift));
      a *= mix(1.0, 0.25 + 0.75 * smoothstep(0.35, 0.1, vel) + 0.15, uVelHi); // the soft ones glow when we look for them
      if (kind < 1.5) a *= 1.0 - 0.8 * uPull; // when the twins take the line, the other ghosts step back
      else a *= 1.0 + 2.0 * uPull;
    }
    vAlpha = a * left;
    vGlow = uGlow; vTwinHi = kind > 1.5 ? uTwinHi : 0.0;
    gl_Position = off || vAlpha < 0.002 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const NOTE_FRAG = /* glsl */ `
  uniform vec3 uGhostCol;
  uniform float uKick;
  varying vec2 vUv;
  varying vec2 vSize;
  varying vec3 vColor;
  varying float vAlpha, vKind, vPlay, vVel, vGlow, vTwinHi;
  void main() {
    vec2 q = (vUv - 0.5) * vSize;
    float r = min(0.05, min(vSize.x, vSize.y) * 0.35);
    vec2 b = vSize * 0.5 - r;
    float d = length(max(abs(q) - b, 0.0)) - r;
    float aa = fwidth(d) * 1.2;
    float inside = 1.0 - smoothstep(-aa, aa, d);
    float border = smoothstep(-0.03 - aa, -0.03, d);
    vec3 col;
    float a = vAlpha * inside;
    if (vKind < 0.5) {
      // the AI's notes, in the colour of the song each one came from: a lighter top edge, white-hot while they play
      col = mix(vColor, mix(vColor, vec3(1.0), 0.45), smoothstep(0.55, 0.95, vUv.y) * 0.8);
      col = mix(col, vec3(1.0, 0.95, 0.88), vPlay * 0.45);
      col *= mix(1.0, 0.55, border);
      col *= 1.0 + uKick * 0.25;
    } else {
      // ghosts: their song's colour, washed out, an outline and a faint body; brought to the light they glow
      vec3 g = mix(mix(vColor, uGhostCol, 0.4), mix(vColor, vec3(1.0, 0.96, 0.9), 0.5), vGlow);
      g = mix(g, vec3(1.0), vTwinHi * 0.45);
      col = g * mix(0.16 + 0.3 * vGlow, 0.7 + 0.3 * vGlow, border);
      col *= (0.75 + vPlay * 0.8) * (0.42 + 0.26 * vGlow + 0.4 * vTwinHi);
    }
    gl_FragColor = vec4(col, a);
  }
`;

const SHEET_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const SHEET_FRAG = /* glsl */ `
  uniform float uAlpha, uFront, uBeat, uStiff, uKick;
  varying vec3 vWorld;
  float line(float x, float width) {
    float d = abs(fract(x + 0.5) - 0.5);
    float fw = fwidth(x);
    return 1.0 - smoothstep(width * 0.5, width * 0.5 + fw * 1.2, d);
  }
  void main() {
    float beat = vWorld.x / ${BX.toFixed(3)};
    float semi = vWorld.y / ${PY.toFixed(3)} + 60.0;
    float a = uAlpha;
    vec3 col;
    if (uFront > 0.5) {
      // the piano roll's own grid: darker rows for black keys, faint 16ths, beats, brighter bars
      float pc = mod(floor(semi + 0.5), 12.0);
      bool black = pc == 1.0 || pc == 3.0 || pc == 6.0 || pc == 8.0 || pc == 10.0;
      col = black ? vec3(0.085, 0.10, 0.115) : vec3(0.125, 0.145, 0.16);
      float rows = line(semi - 0.5, 0.035);
      float oct = pc == 0.0 ? line(semi - 0.5, 0.06) : 0.0;
      float sixteenth = line(beat * 4.0, 0.04) * 0.25;
      float beatL = line(beat, 0.035);
      float bar = line(beat / 4.0, 0.012);
      col = mix(col, vec3(0.05, 0.06, 0.07), rows * 0.8);
      col += vec3(0.05, 0.06, 0.065) * (sixteenth * (1.0 - uStiff) + beatL * 0.6) + vec3(0.12, 0.13, 0.14) * bar;
      col += vec3(0.06) * oct;
      // the part already played is a shade lighter
      col += vec3(0.012, 0.01, 0.006) * step(beat, uBeat) * (1.0 + uKick);
    } else {
      // a ghost sheet: a faint pane of glass, its edges a little brighter
      float edge = 1.0 - smoothstep(0.0, 0.08, min(abs(vWorld.y - ${Y(PITCH_LO + 3).toFixed(2)}), abs(vWorld.y - ${Y(PITCH_HI - 3).toFixed(2)})));
      float bar = line(beat / 16.0, 0.002);
      col = vec3(0.55, 0.62, 0.75) * (0.035 + edge * 0.35 + bar * 0.12);
      a *= 0.6;
    }
    col = pow(col, vec3(2.2));
    // soft top and bottom edges
    a *= smoothstep(${Y(PITCH_LO).toFixed(2)}, ${Y(PITCH_LO + 3).toFixed(2)}, vWorld.y) * (1.0 - smoothstep(${Y(PITCH_HI - 3).toFixed(2)}, ${Y(PITCH_HI).toFixed(2)}, vWorld.y));
    gl_FragColor = vec4(col, a);
  }
`;

const THREAD_VERT = /* glsl */ `
  attribute vec4 aThread; // start, midi, layer, end (0 bright, 1 twin)
  attribute vec3 aCol;
  uniform float uBeat, uPull, uAhead, uBehind, uThreads;
  varying float vA, vEnd;
  varying vec3 vCol;
  void main() {
    float start = aThread.x, layer = aThread.z, e = aThread.w;
    vec3 p = vec3(start * ${BX.toFixed(3)} + 0.12, (aThread.y - 60.0) * ${PY.toFixed(3)}, -layer * ${LZ.toFixed(3)} * e * (1.0 - uPull));
    float sung = smoothstep(start, start + 0.6, uBeat);
    float vis = step(uBeat - uBehind, start) * step(start, uBeat + 0.01);
    vA = uThreads * sung * vis * smoothstep(uBeat - uBehind, uBeat - uBehind + 2.0, start);
    vEnd = e; vCol = aCol;
    gl_Position = vA < 0.002 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const THREAD_FRAG = /* glsl */ `
  varying float vA, vEnd;
  varying vec3 vCol;
  void main() { gl_FragColor = vec4(mix(mix(vCol, vec3(1.0), 0.5), vCol, vEnd), vA * (0.95 - 0.35 * vEnd)); }
`;

const hex = (s: string) => new THREE.Color(s);

// ── the piano keyboard (canvas px)
const KEY_ROW = 40, KEY_W = 300;
/** Keys pressed by nobody, in "I've never pressed a key". */
const PHANTOM = '#9fb6d6';
/** Seven white keys over twelve rows: C–E share five semitones, F–B share seven, as on a real piano. */
const WHITE: [number, number, number][] = [
  [0, -0.5, 7 / 6], [2, 7 / 6, 17 / 6], [4, 17 / 6, 4.5], [5, 4.5, 6.25], [7, 6.25, 8], [9, 8, 9.75], [11, 9.75, 11.5],
];
const keyY = (p: number) => (PITCH_HI - 0.5 - p) * KEY_ROW;
const mixHex = (a: string, b: string, k: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString()}`;

/** A key held down: by which colour of note, and how firmly (1: the melody; less: a ghost). */
interface Press { color: string; k: number }

function drawKeyboard(c: CanvasRenderingContext2D, pressed: Map<number, Press>) {
  c.fillStyle = '#0b0d10';
  c.fillRect(0, 0, KEY_W, (PITCH_HI - PITCH_LO) * KEY_ROW);
  for (let o = Math.floor(PITCH_LO / 12) - 1; o <= Math.ceil(PITCH_HI / 12); o++) {
    for (const [pc, a, b] of WHITE) {
      const midi = o * 12 + pc;
      if (midi < PITCH_LO - 1 || midi > PITCH_HI) continue;
      const y0 = keyY(o * 12 + b) + 1.5, y1 = keyY(o * 12 + a) - 1.5;
      const on = pressed.get(midi), k = on?.k ?? 0, col = on?.color ?? '#000000';
      const g = c.createLinearGradient(0, 0, KEY_W, 0);
      g.addColorStop(0, mixHex('#7f868c', mixHex(col, '#000000', 0.25), k));
      g.addColorStop(0.7, mixHex('#a9b0b6', col, k));
      g.addColorStop(1, mixHex('#b8bec3', mixHex(col, '#ffffff', 0.18), k));
      c.fillStyle = g;
      c.beginPath(); c.roundRect(0, y0, KEY_W - 6, y1 - y0, [0, 7, 7, 0]); c.fill();
      // the front lip of the key, and a pressed key's shadow at the hinge
      c.fillStyle = `rgba(0,0,0,${0.12 + 0.13 * k})`;
      c.fillRect(KEY_W - 14, y0, 8, y1 - y0);
      if (k > 0) { c.fillStyle = `rgba(0,0,0,${0.3 * k})`; c.fillRect(0, y0, 18, y1 - y0); }
      if (pc === 0) {
        c.font = '600 17px "Inter", system-ui, sans-serif';
        c.textAlign = 'right'; c.textBaseline = 'middle';
        c.fillStyle = k > 0.5 ? 'rgba(0,0,0,0.65)' : '#6d757c';
        c.fillText(`C${o - 1}`, KEY_W - 22, (y0 + y1) / 2 + 4);
      }
    }
  }
  for (let midi = PITCH_LO; midi < PITCH_HI; midi++) {
    if (![1, 3, 6, 8, 10].includes(midi % 12)) continue;
    const y = keyY(midi), h = KEY_ROW * 0.78, len = KEY_W * 0.6;
    const on = pressed.get(midi), k = on?.k ?? 0, col = on?.color ?? '#000000';
    c.fillStyle = 'rgba(0,0,0,0.35)'; // its shadow on the white keys
    c.fillRect(0, y - h / 2 + 4, len + 6, h);
    const g = c.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, mixHex('#121417', mixHex(col, '#000000', 0.45), k));
    g.addColorStop(0.85, mixHex('#2a2f35', mixHex(col, '#000000', 0.15), k));
    g.addColorStop(1, mixHex('#3a4047', col, k));
    c.fillStyle = g;
    c.beginPath(); c.roundRect(0, y - h / 2, len, h, [0, 5, 5, 0]); c.fill();
    c.fillStyle = `rgba(255,255,255,${0.12 + 0.13 * k})`; // the glossy top edge
    c.fillRect(4, y - h / 2 + 3, len - 14, 3);
  }
}
/** One note instance: start, length, midi, layer, seed, kind, velocity, colour. */
type Row = [number, number, number, number, number, number, number, string];

export interface RollState {
  beat: number;
  ghost: number; // overall ghost visibility
  layers: number[]; // per-layer visibility (index = depth, 0 unused)
  bright: number;
  pull: number; lift: number; drop: number; flash: number; glow: number; twinHi: number; velHi: number;
  threads: number;
  frontAlpha: number; sheets: number; labels: number; forget: number; stiff: number;
  kick: number;
  /** Keys pressed by nothing ("I've never pressed a key"). */
  ghostKeys: number;
  /** The keyboard's visibility (it's hidden when we look from behind the stack). */
  keys: number;
  t: number;
  /** For the name tags, which turn to face it. */
  camera: THREE.Camera;
}

export class Roll {
  readonly group = new THREE.Group();
  private ghostMat: THREE.ShaderMaterial;
  private brightMat: THREE.ShaderMaterial;
  private front: THREE.Mesh;
  private frontMat: THREE.ShaderMaterial;
  private sheets: THREE.Mesh[] = [];
  private threadMat: THREE.ShaderMaterial;
  private playhead: THREE.Mesh;
  private keys: THREE.Mesh;
  private keyTex: CanvasTex;
  private keyBase: THREE.Mesh;
  private labels: { tex: CanvasTex; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
  private follow = new THREE.Group(); // things that ride along with the playhead
  /** Every note that can press a key, bucketed by the beats it sounds over. Layer 0 is the melody. */
  private sounding = new Map<number, { s: number; e: number; midi: number; layer: number; color: string }[]>();

  constructor() {
    const quad = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
    const uniforms = () => ({
      uBeat: { value: 0 }, uAhead: { value: 30 }, uBehind: { value: KEYS_AT },
      uPull: { value: 0 }, uLift: { value: 0 }, uDrop: { value: 0 }, uBright: { value: 1 }, uGhost: { value: 0 },
      uDepth: { value: 0.09 }, uFlash: { value: 0 }, uTwinHi: { value: 0 }, uVelHi: { value: 0 }, uGlow: { value: 0 },
      uLayer: { value: new Array(N_LAYERS + 1).fill(1) }, uKick: { value: 0 },
      uGhostCol: { value: hex(C.ghost) },
    });

    // ghost notes + twins: one instanced draw, additive
    const ghosts: Row[] = [];
    LAYERS.forEach((l, i) => l.notes.forEach(([s, len, m, v]) => ghosts.push([s, len, m, i + 1, rnd(s * 13.1 + m * 7.7 + i), 1, v, LAYER_COLORS[i]])));
    BRIGHT.forEach((b, i) => ghosts.push([b.start, b.len, b.midi, b.twin, rnd(i * 3.3), 2, 0.8, b.color]));
    this.ghostMat = new THREE.ShaderMaterial({
      uniforms: uniforms(), vertexShader: NOTE_VERT, fragmentShader: NOTE_FRAG,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const gMesh = new THREE.Mesh(this.instanced(quad, ghosts), this.ghostMat);
    gMesh.frustumCulled = false;
    gMesh.renderOrder = 3;

    const bright: Row[] = BRIGHT.map((b, i) => [b.start, b.len, b.midi, 0, rnd(i), 0, 1, b.color]);
    this.brightMat = new THREE.ShaderMaterial({
      uniforms: uniforms(), vertexShader: NOTE_VERT, fragmentShader: NOTE_FRAG,
      transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    });
    const bMesh = new THREE.Mesh(this.instanced(quad, bright), this.brightMat);
    bMesh.frustumCulled = false;
    bMesh.renderOrder = 5;

    // sheets: the front grid and one pane of glass per layer
    const sheetGeo = new THREE.PlaneGeometry(90, Y(PITCH_HI) - Y(PITCH_LO));
    const sheetMat = (front: boolean) => new THREE.ShaderMaterial({
      uniforms: { uAlpha: { value: 1 }, uFront: { value: front ? 1 : 0 }, uBeat: { value: 0 }, uStiff: { value: 0 }, uKick: { value: 0 } },
      vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG, transparent: true, depthTest: false, depthWrite: false,
      blending: front ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.frontMat = sheetMat(true);
    this.front = new THREE.Mesh(sheetGeo, this.frontMat);
    this.front.renderOrder = 0;
    this.front.position.y = (Y(PITCH_LO) + Y(PITCH_HI)) / 2;
    this.follow.add(this.front);
    for (let k = 1; k <= N_LAYERS; k++) {
      const m = new THREE.Mesh(sheetGeo, sheetMat(false));
      m.position.set(0, this.front.position.y, -k * LZ);
      m.renderOrder = 1;
      this.sheets.push(m);
      this.follow.add(m);
    }

    // threads from each bright note back to the twin it traced
    const th: number[] = [], tc: number[] = [];
    BRIGHT.forEach((b) => {
      th.push(b.start, b.midi, b.twin, 0, b.start, b.midi, b.twin, 1);
      const c = hex(b.color);
      tc.push(c.r, c.g, c.b, c.r, c.g, c.b);
    });
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('aThread', new THREE.Float32BufferAttribute(th, 4));
    tg.setAttribute('aCol', new THREE.Float32BufferAttribute(tc, 3));
    tg.setAttribute('position', new THREE.Float32BufferAttribute(new Array((th.length / 4) * 3).fill(0), 3));
    this.threadMat = new THREE.ShaderMaterial({
      uniforms: { uBeat: { value: 0 }, uPull: { value: 0 }, uAhead: { value: 30 }, uBehind: { value: KEYS_AT }, uThreads: { value: 0 } },
      vertexShader: THREAD_VERT, fragmentShader: THREAD_FRAG, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const threads = new THREE.LineSegments(tg, this.threadMat);
    threads.frustumCulled = false;
    threads.renderOrder = 4;

    // the playhead: a glowing line with a little flag on top
    this.playhead = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, Y(PITCH_HI) - Y(PITCH_LO)),
      new THREE.MeshBasicMaterial({ color: hex('#ffd9a8'), transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.playhead.position.set(0, this.front.position.y, 0.05);
    this.playhead.renderOrder = 6;
    const flag = new THREE.Mesh(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(0.22, 0, 0), new THREE.Vector3(0, -0.3, 0)]),
      new THREE.MeshBasicMaterial({ color: hex(C.orange), depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
    );
    flag.position.set(0, (Y(PITCH_HI) - Y(PITCH_LO)) / 2 - 0.05, 0.01);
    flag.renderOrder = 6;
    this.playhead.add(flag);
    this.follow.add(this.playhead);

    const sounds = (start: number, len: number, midi: number, layer: number, color: string) => {
      if (midi < PITCH_LO || midi >= PITCH_HI) return;
      for (let b = Math.floor(start); b <= Math.floor(start + len); b++) {
        if (!this.sounding.has(b)) this.sounding.set(b, []);
        this.sounding.get(b)!.push({ s: start, e: start + len, midi, layer, color });
      }
    };
    BRIGHT.forEach((b) => sounds(b.start, b.len, b.midi, 0, b.color));
    LAYERS.forEach((l, i) => l.notes.forEach(([st, len, m]) => sounds(st, len, m, i + 1, LAYER_COLORS[i])));

    // the keyboard, on the left: a real piano drawn on a canvas, redrawn when the keys pressed change
    this.keyTex = new CanvasTex(KEY_W, (PITCH_HI - PITCH_LO) * KEY_ROW);
    this.keys = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, (PITCH_HI - PITCH_LO) * PY),
      new THREE.MeshBasicMaterial({ map: this.keyTex.texture, depthTest: false, depthWrite: false, transparent: true, side: THREE.DoubleSide }),
    );
    this.keys.position.set(-KEYS_AT - 1.0, (Y(PITCH_LO) + Y(PITCH_HI - 1)) / 2, 0.1);
    this.keys.renderOrder = 8;
    this.keyBase = new THREE.Mesh(
      new THREE.PlaneGeometry(2.12, (PITCH_HI - PITCH_LO) * PY + 0.1),
      new THREE.MeshBasicMaterial({ color: hex('#07090b'), depthTest: false, depthWrite: false, transparent: true, side: THREE.DoubleSide }),
    );
    this.keyBase.position.set(-KEYS_AT - 0.98, this.keys.position.y, 0.08);
    this.keyBase.renderOrder = 7;
    this.follow.add(this.keyBase, this.keys);

    // a name tag for each layer
    for (let k = 1; k <= N_LAYERS; k++) {
      const tex = new CanvasTex(420, 56);
      const mat = new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, depthTest: false, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.4), mat);
      mesh.renderOrder = 9;
      this.labels.push({ tex, mesh, mat });
      this.follow.add(mesh);
    }

    this.group.add(this.follow, gMesh, bMesh, threads);
  }

  private instanced(quad: THREE.PlaneGeometry, rows: Row[]) {
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('uv', quad.getAttribute('uv'));
    const note = new Float32Array(rows.length * 4), meta = new Float32Array(rows.length * 4), color = new Float32Array(rows.length * 3);
    const lin = new Map<string, THREE.Color>();
    rows.forEach(([s, len, m, layer, seed, kind, vel, hexCol], i) => {
      note.set([s, len, m, layer], i * 4);
      meta.set([seed, kind, vel, 0], i * 4);
      const c = lin.get(hexCol) ?? lin.set(hexCol, hex(hexCol)).get(hexCol)!;
      color.set([c.r, c.g, c.b], i * 3);
    });
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3));
    g.setAttribute('aNote', new THREE.InstancedBufferAttribute(note, 4));
    g.setAttribute('aMeta', new THREE.InstancedBufferAttribute(meta, 4));
    g.instanceCount = rows.length;
    return g;
  }

  update(s: RollState) {
    for (const m of [this.ghostMat, this.brightMat]) {
      const u = m.uniforms;
      u.uBeat.value = s.beat; u.uPull.value = s.pull; u.uLift.value = s.lift; u.uDrop.value = s.drop;
      u.uBright.value = s.bright; u.uGhost.value = s.ghost; u.uFlash.value = s.flash; u.uTwinHi.value = s.twinHi;
      u.uVelHi.value = s.velHi; u.uGlow.value = s.glow; u.uKick.value = s.kick;
      u.uLayer.value = s.layers;
    }
    const tu = this.threadMat.uniforms;
    tu.uBeat.value = s.beat; tu.uPull.value = s.pull; tu.uThreads.value = s.threads;

    // everything that rides with the playhead
    this.follow.position.x = s.beat * BX;
    this.frontMat.uniforms.uAlpha.value = s.frontAlpha;
    this.frontMat.uniforms.uBeat.value = s.beat;
    this.frontMat.uniforms.uStiff.value = s.stiff;
    this.frontMat.uniforms.uKick.value = s.kick;
    this.sheets.forEach((m, i) => {
      const mat = m.material as THREE.ShaderMaterial;
      mat.uniforms.uAlpha.value = s.sheets * s.ghost * s.layers[i + 1] * Math.exp(-(i + 1) * 0.05) * (1 - s.lift) * (1 - s.drop);
    });
    (this.playhead.material as THREE.MeshBasicMaterial).opacity = 0.75 + s.kick * 0.25;

    // keys: always in step with the notes on screen. The melody presses its keys fully, in each note's colour (the
    // AI's own notes, or their twins once the ghosts have taken the line); every visible ghost layer presses its own,
    // fainter with depth; and in "I've never pressed a key" a few go down by themselves.
    const pressed = new Map<number, Press>();
    const melody = Math.max(s.bright, s.pull * (1 - s.lift)) > 0.3;
    const gone = (1 - s.drop) * (1 - s.lift);
    for (const n of this.sounding.get(Math.floor(s.beat)) ?? []) {
      if (s.beat < n.s || s.beat >= n.e) continue;
      const k = n.layer === 0 ? (melody ? 1 : 0) : Math.min(0.5, 0.62 * s.ghost * s.layers[n.layer] * gone * Math.exp(-n.layer * 0.07));
      if (k > 0.06 && k > (pressed.get(n.midi)?.k ?? 0)) pressed.set(n.midi, { color: n.color, k: Math.round(k * 8) / 8 });
    }
    if (s.ghostKeys > 0.5) {
      for (let midi = PITCH_LO; midi < PITCH_HI; midi++) {
        if (!pressed.has(midi) && rnd(midi * 3.1 + Math.floor(s.t * 6.5)) > 0.84) pressed.set(midi, { color: PHANTOM, k: 0.8 });
      }
    }
    // (the key is never empty, so the keyboard is drawn even on a frame where nothing is pressed)
    this.keyTex.draw(`keys:${[...pressed].map(([m, p]) => `${m}${p.color}${p.k}`).join()}`, (c) => drawKeyboard(c, pressed));
    (this.keys.material as THREE.MeshBasicMaterial).opacity = Math.min(1, s.frontAlpha * 1.2) * s.keys;
    (this.keyBase.material as THREE.MeshBasicMaterial).opacity = Math.min(1, s.frontAlpha * 1.2) * s.keys;

    // layer name tags, at the right, one per pane; "forgot where they came from" scrambles them to nothing
    this.labels.forEach((l, i) => {
      const k = i + 1;
      const vis = s.labels * s.ghost * s.layers[k] * (1 - s.lift) * (1 - s.drop);
      l.mesh.visible = vis > 0.01;
      if (!l.mesh.visible) return;
      // staggered so the tags fan out instead of stacking into one line
      l.mesh.position.set(7.6 + (k % 3) * 0.9, Y(PITCH_HI - 11) - (k % 4) * 0.5, -k * LZ + 0.01);
      l.mesh.quaternion.copy(s.camera.quaternion);
      l.mat.opacity = vis * Math.exp(-k * 0.03);
      const name = LAYERS[i].name;
      const lost = Math.max(0, Math.min(1, s.forget * 2.2 - rnd(k * 1.7) * 1.2));
      const tick = Math.floor(s.t * 14);
      let shown = name;
      if (lost >= 1) shown = 'unknown';
      else if (lost > 0) shown = name.split('').map((ch, j) => (rnd(j * 3.7 + k) < lost ? '#%&?*·'[Math.floor(rnd(tick + j * 1.3 + k) * 6)] : ch)).join('');
      l.tex.draw(`${shown}|${lost >= 1}`, (c) => {
        c.fillStyle = lost >= 1 ? 'rgba(20,24,28,0.6)' : 'rgba(22,28,34,0.82)';
        c.beginPath(); c.roundRect(2, 6, 416, 44, 8); c.fill();
        c.fillStyle = lost >= 1 ? '#3a4148' : LAYER_COLORS[i];
        c.beginPath(); c.roundRect(10, 14, 10, 28, 3); c.fill();
        txt(c, shown, 30, 29, { size: 24, weight: 600, color: lost >= 1 ? '#5c6670' : C.ghost, max: 376 });
      });
    });
  }
}
