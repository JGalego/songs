// 2004: a CRT monitor in a dark bedroom, and on it the app, the step sequencer, and the upload page.
// The screen is a 4:3 canvas drawn every frame it's seen, shown through a CRT shader (curve, scanlines, glow).
import * as THREE from 'three';
import { C, bevel, clamp01, fmt, lerp, logo, outCubic, pixel, pointer, ramp, rnd, smooth, txt, win } from './art';
import { Bedroom } from './bedroom';
import { CanvasTex, MONO } from './text';
import { CLICK_ORDER, RACK_CHANNELS, RACK_STEPS } from './songs';
import {
  CLICKS, DIVE, ELEVEN, GIRL, KICK_IN, PAGE, PLAYS_11, RACK_OPEN, RENDER, SPLASH, TWELVE, beatAt,
} from './timeline';

export const SW = 1440, SH = 1080;
/** The screen in world units (4:3). */
export const SCREEN_W = 4, SCREEN_H = 3;

const CRT_FRAG = /* glsl */ `
  uniform sampler2D tMap;
  uniform float uPower, uTime, uBright;
  varying vec2 vUv;
  vec2 curve(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    uv *= 1.0 + vec2(uv.y * uv.y, uv.x * uv.x) * 0.045;
    return uv * 0.5 + 0.5;
  }
  void main() {
    vec2 uv = curve(vUv);
    // switching on: a bright line that opens into the picture
    float open = smoothstep(0.0, 0.55, uPower);
    float line = smoothstep(0.0, 0.08, uPower) * (1.0 - open);
    float band = abs(uv.y - 0.5) * 2.0;
    vec2 suv = vec2(uv.x, 0.5 + (uv.y - 0.5) / max(open, 0.002));
    vec3 col = texture2D(tMap, suv).rgb;
    col *= step(band, open);
    col += vec3(0.8, 0.9, 1.0) * line * (1.0 - smoothstep(0.0, 0.012, band)) * 2.0;
    // scanlines and an aperture grille
    float scan = 0.82 + 0.18 * sin(uv.y * ${SH}.0 * 3.14159);
    float mask = 0.9 + 0.1 * sin(uv.x * ${SW}.0 * 3.14159 * 0.66);
    col *= scan * mask;
    col *= 1.0 + 0.04 * sin(uTime * 110.0 + uv.y * 8.0);
    // vignette and the black outside the curved tube
    vec2 d = uv - 0.5;
    col *= 1.0 - dot(d, d) * 1.1;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    // phosphor blue glow, even when dark
    col = col * uBright + vec3(0.012, 0.018, 0.03) * uPower;
    gl_FragColor = vec4(col * inside, 1.0);
  }
`;

/** The step sequencer window on the screen canvas. */
const RACK = { x: 150, y: 330, w: 1140, h: 420 };
/** Where step `s` of channel `ch` is drawn: four groups of four, inside the window with room to spare. */
function stepRect(ch: number, s: number) {
  const x = RACK.x + 300 + s * 49 + Math.floor(s / 4) * 12, y = RACK.y + 110 + ch * 74;
  return { x, y, w: 40, h: 56 };
}

export class Monitor {
  readonly group = new THREE.Group();
  private tex = new CanvasTex(SW, SH);
  private mat: THREE.ShaderMaterial;
  private glow: THREE.Mesh;
  private room = new Bedroom();

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: this.tex.texture }, uPower: { value: 1 }, uTime: { value: 0 }, uBright: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: CRT_FRAG,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), this.mat);
    screen.position.z = 0.02;
    // a beige 2004 monitor: bezel, deep back, a little stand
    const plastic = new THREE.MeshStandardMaterial({ color: new THREE.Color('#cdc2a9'), roughness: 0.6 });
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_W + 0.7, SCREEN_H + 0.75, 0.35), plastic);
    bezel.position.set(0, -0.05, -0.16);
    const back = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_W - 0.4, SCREEN_H - 0.3, 2.4), new THREE.MeshStandardMaterial({ color: new THREE.Color('#bdb299'), roughness: 0.7 }));
    back.position.z = -1.5;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.4), new THREE.MeshStandardMaterial({ color: new THREE.Color('#c2b79e'), roughness: 0.7 }));
    stand.position.set(0, -SCREEN_H / 2 - 0.55, -0.8);
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7dff8a') }));
    led.position.set(SCREEN_W / 2 + 0.05, -SCREEN_H / 2 - 0.3, 0.02);
    // the screen's light on the desk and the wall
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 9),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uA: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uA; varying vec2 vUv; float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } void main() { float d = length((vUv - 0.5) * vec2(1.5, 1.0)); gl_FragColor = vec4(vec3(0.16, 0.26, 0.4) * uA * exp(-d * d * 9.0) + (h(gl_FragCoord.xy) - 0.5) / 160.0, 1.0); }',
      }),
    );
    this.glow.position.z = -2.9;
    this.group.add(this.room.group, this.glow, back, bezel, stand, led, screen);
  }

  /** Point on the screen (canvas px) in the monitor's local space. */
  static local(px: number, py: number) {
    return new THREE.Vector3((px / SW - 0.5) * SCREEN_W, (0.5 - py / SH) * SCREEN_H, 0.02);
  }

  update(t: number, o: { power: number; kick: number; heard: number; girl: boolean }) {
    this.room.update(t, { power: o.power, kick: o.kick, girl: o.girl });
    this.mat.uniforms.uPower.value = o.power;
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uBright.value = 0.92 + o.kick * 0.1;
    (this.glow.material as THREE.ShaderMaterial).uniforms.uA.value = o.power * (0.45 + o.kick * 0.25);
    // redraw every frame it's on (the step light and the clock move constantly)
    this.tex.draw(t.toFixed(4), (c) => drawScreen(c, t, o.heard));
  }
}

// ── the screen itself
const outro = (t: number) => t >= GIRL - 0.5;

function drawScreen(c: CanvasRenderingContext2D, t: number, heard: number) {
  // desktop
  const g = c.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, '#24576a'); g.addColorStop(1, C.desk);
  c.fillStyle = g;
  c.fillRect(0, 0, SW, SH);
  desktopIcons(c);

  const app = win(t, SPLASH[1] - 0.4, 1e9, 0.4);
  if (app > 0) { c.globalAlpha = app; appWindow(c, t); c.globalAlpha = 1; }
  if (t < SPLASH[1] + 0.3) splash(c, t);
  renderDialog(c, t);
  browser(c, t, heard);
  taskbar(c, t);
  cursor2004(c, t);
}

function desktopIcons(c: CanvasRenderingContext2D) {
  [['my music', 0], ['recycle bin', 1], ['homework', 2]].forEach(([label, i]) => {
    const x = 40, y = 1080 - 44 - 120 - (i as number) * 110;
    c.fillStyle = i === 1 ? '#c9d3dc' : '#e8c86a';
    c.fillRect(x + 22, y, 44, 36);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 22, y + 30, 44, 6);
    pixel(c, label as string, x + 44, y + 54, { size: 24, color: '#fff', align: 'center' });
  });
}

function taskbar(c: CanvasRenderingContext2D, t: number) {
  const y = SH - 44;
  c.fillStyle = '#2b3f63'; c.fillRect(0, y, SW, 44);
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, y, SW, 2);
  bevel(c, 6, y + 6, 104, 32, '#3d7a3e');
  pixel(c, 'start', 58, y + 22, { size: 28, color: '#fff', align: 'center' });
  bevel(c, 124, y + 6, 260, 32, '#3a5585', true);
  pixel(c, 'FrootyLoops 4', 140, y + 22, { size: 24, color: '#fff' });
  bevel(c, SW - 150, y + 6, 144, 32, '#22355a', true);
  pixel(c, clock(t), SW - 78, y + 22, { size: 26, color: '#fff', align: 'center' });
  // "two thousand and four": the date tooltip
  const tip = win(t, 16.8, 18.4, 0.15) + win(t, GIRL - 0.3, GIRL + 2.6, 0.2);
  if (tip > 0) {
    c.globalAlpha = clamp01(tip);
    c.fillStyle = '#ffffe1'; c.fillRect(SW - 400, y - 46, 392, 38);
    c.strokeStyle = '#000'; c.lineWidth = 1.5; c.strokeRect(SW - 400, y - 46, 392, 38);
    pixel(c, 'Saturday, March 13, 2004', SW - 204, y - 27, { size: 28, color: '#000', align: 'center' });
    c.globalAlpha = 1;
  }
}

/** The clock creeps toward midnight; the outro is a night years later, same room. */
function clock(t: number) {
  if (outro(t)) return '3:12 AM';
  if (t >= PAGE) return '12:00 AM';
  const m = Math.min(59, 52 + Math.floor(t / 3.2));
  return `11:${m} PM`;
}

function splash(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, SPLASH[0], SPLASH[1], 0.4);
  if (a <= 0) return;
  c.save();
  c.globalAlpha = a;
  const x = SW / 2 - 380, y = SH / 2 - 250, w = 760, h = 470;
  c.fillStyle = '#111823'; c.fillRect(x, y, w, h);
  c.strokeStyle = '#8a96a8'; c.lineWidth = 3; c.strokeRect(x, y, w, h);
  logo(c, x + 150, y + 175, 190, 0.6 + 0.4 * Math.sin(t * 3));
  pixel(c, 'FrootyLoops', x + 270, y + 140, { size: 92, color: C.amber, max: w - 300 });
  pixel(c, 'version 4.0  ·  DEMO', x + 276, y + 214, { size: 38, color: '#9fb0c8', max: w - 300 });
  const plugins = ['3xGhost', 'Boom 404', 'Frooty Limiter', 'Frooty Reverb', 'Pluck-o-matic', 'Sinewave Pal', 'Frooty Wrapper', 'Ghost Sampler'];
  const k = ramp(t, SPLASH[0] + 0.5, SPLASH[1] - 1.2);
  const name = plugins[Math.min(plugins.length - 1, Math.floor(k * plugins.length))];
  pixel(c, k < 1 ? `loading plugin: ${name}...` : 'ready.', x + 40, y + 370, { size: 30, color: '#d6dde8', max: w - 80 });
  c.fillStyle = '#26324a'; c.fillRect(x + 40, y + 400, w - 80, 22);
  c.fillStyle = C.amber;
  for (let i = 0, n = Math.floor(k * 34); i < n; i++) c.fillRect(x + 44 + i * 20, y + 404, 16, 14);
  pixel(c, 'this copy is not registered', x + w - 40, y + 446, { size: 22, color: '#6b778a', align: 'right' });
  c.restore();
}

function appWindow(c: CanvasRenderingContext2D, t: number) {
  const x = 30, y = 24, w = SW - 60, h = SH - 44 - 40;
  bevel(c, x, y, w, h, C.win);
  // title bar
  const tg = c.createLinearGradient(x, 0, x + w, 0);
  tg.addColorStop(0, C.titleA); tg.addColorStop(1, C.titleB);
  c.fillStyle = tg; c.fillRect(x + 4, y + 4, w - 8, 34);
  const name = t >= RENDER - 0.2 ? 'girl_beat_01.flp' : 'untitled.flp';
  pixel(c, `FrootyLoops 4 - ${name}`, x + 16, y + 22, { size: 28, color: '#fff', max: w - 160 });
  for (let i = 0; i < 3; i++) bevel(c, x + w - 40 - i * 34, y + 8, 28, 26, C.win);
  // menu
  let mx = x + 20;
  for (const m of ['FILE', 'EDIT', 'CHANNELS', 'VIEW', 'OPTIONS', 'TOOLS', 'HELP']) mx += pixel(c, m, mx, y + 56, { size: 26, color: C.retroText }) + 44;
  // toolbar: logo, transport, tempo, song position, hint bar
  const ty = y + 76;
  bevel(c, x + 8, ty, w - 16, 92, C.winDark, true);
  logo(c, x + 56, ty + 46, 62);
  const playing = t >= KICK_IN;
  const bx = x + 110;
  ['▶', '■', '●'].forEach((s, i) => {
    bevel(c, bx + i * 56, ty + 20, 48, 52, i === 0 && playing ? '#4f7a4a' : C.win, i === 0 && playing);
    txt(c, s, bx + i * 56 + 24, ty + 47, { size: 24, color: i === 2 ? '#ff7a6b' : '#fff', align: 'center' });
  });
  lcd(c, bx + 190, ty + 18, 170, 'TEMPO', '135.000');
  const b = Math.max(0, beatAt(t) - beatAt(KICK_IN));
  const pos = playing ? `${Math.floor(b / 4) + 1}:${String(Math.floor(b % 4) + 1).padStart(2, '0')}:${String(Math.floor((b % 1) * 96)).padStart(3, '0')}` : '1:01:000';
  lcd(c, bx + 380, ty + 18, 200, 'SONG POS', pos);
  lcd(c, bx + 600, ty + 18, 110, 'PAT', '01');
  bevel(c, bx + 730, ty + 18, w - (bx + 730 - x) - 30, 56, '#1a2230', true);
  pixel(c, hint(t), bx + 746, ty + 46, { size: 26, color: '#c4d4ea', max: w - (bx + 730 - x) - 60 });

  // workspace + step sequencer
  c.fillStyle = '#3e4856'; c.fillRect(x + 8, ty + 100, w - 16, h - (ty + 100 - y) - 8);
  stepSequencer(c, t);
}

function lcd(c: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, value: string) {
  bevel(c, x, y, w, 56, '#0b130c', true);
  pixel(c, label, x + 8, y + 12, { size: 16, color: '#4f8a52' });
  pixel(c, value, x + w - 10, y + 36, { size: 38, color: '#8dff86', align: 'right' });
}

function hint(t: number) {
  if (t < CLICKS[0]) return 'Step sequencer: click a step to turn it on';
  if (t < KICK_IN) return 'Left-click to set a step, right-click to clear';
  if (t < RENDER) return 'Pattern 1 - 16 steps';
  if (t < PAGE) return 'Rendering to mp3...';
  return 'Pattern 1 - 16 steps';
}

/** How many of her sixteen squares are lit at t (one per click). */
const litCount = (t: number) => (outro(t) ? 16 : Math.floor(clamp01((t - CLICKS[0]) / (CLICKS[1] - CLICKS[0])) * 16 + (t >= CLICKS[0] ? 1 : 0)));

function stepSequencer(c: CanvasRenderingContext2D, t: number) {
  const a = smooth(RACK_OPEN, RACK_OPEN + 0.5, t);
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  const { x, y, w, h } = RACK;
  bevel(c, x, y, w, h, C.win);
  c.fillStyle = '#4a5668'; c.fillRect(x + 4, y + 4, w - 8, 32);
  pixel(c, 'Step sequencer  -  Pattern 1', x + 14, y + 20, { size: 26, color: '#fff' });
  // the step light: always running, from the moment the window opens
  const beat = beatAt(t);
  const step = ((Math.floor(beat * 4) % 16) + 16) % 16;
  for (let s = 0; s < 16; s++) {
    const r = stepRect(0, s);
    c.fillStyle = s === step ? '#ffef9a' : '#2c3440';
    c.fillRect(r.x + 11, y + 64, 18, 10);
  }
  const lit = litCount(t);
  const isLit = (ch: number, s: number) => CLICK_ORDER.slice(0, lit).some(([a, b]) => a === ch && b === s);
  RACK_CHANNELS.forEach((name, ch) => {
    const ry = stepRect(ch, 0).y;
    // mute LED, two knobs, the channel button
    c.fillStyle = '#7dff8a'; c.beginPath(); c.arc(x + 30, ry + 28, 8, 0, Math.PI * 2); c.fill();
    for (let k = 0; k < 2; k++) {
      c.fillStyle = '#2b323d'; c.beginPath(); c.arc(x + 70 + k * 40, ry + 28, 14, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#dfe6ef'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 70 + k * 40, ry + 28);
      const ang = -Math.PI / 2 + (k ? 0 : 0.6);
      c.lineTo(x + 70 + k * 40 + Math.cos(ang) * 12, ry + 28 + Math.sin(ang) * 12); c.stroke();
    }
    bevel(c, x + 140, ry + 4, 140, 48, '#6d7a8e');
    pixel(c, name, x + 210, ry + 29, { size: 28, color: '#fff', align: 'center', max: 124 });
    for (let s = 0; s < 16; s++) {
      const r = stepRect(ch, s);
      const on = isLit(ch, s) && RACK_STEPS[ch].includes(s);
      const hit = on && t >= KICK_IN && s === step;
      const base = Math.floor(s / 4) % 2 ? C.stepB : C.stepA;
      bevel(c, r.x, r.y, r.w, r.h, hit ? '#fff7d0' : on ? C.stepLit : base, !on);
      if (on) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(r.x + 6, r.y + 6, r.w - 12, 8); }
    }
  });
  c.restore();
}

function renderDialog(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, RENDER, PAGE - 0.1, 0.12);
  if (a <= 0) return;
  c.save();
  c.globalAlpha = a;
  const x = SW / 2 - 300, y = 380, w = 600, h = 220;
  bevel(c, x, y, w, h, C.win);
  const tg = c.createLinearGradient(x, 0, x + w, 0);
  tg.addColorStop(0, C.titleA); tg.addColorStop(1, C.titleB);
  c.fillStyle = tg; c.fillRect(x + 4, y + 4, w - 8, 32);
  pixel(c, 'Rendering...', x + 14, y + 20, { size: 26, color: '#fff' });
  pixel(c, 'girl_beat_01.mp3', x + 30, y + 80, { size: 32, color: C.retroText });
  bevel(c, x + 30, y + 120, w - 60, 34, '#1a2230', true);
  const k = ramp(t, RENDER + 0.1, PAGE - 0.3);
  c.fillStyle = '#4c8cf0';
  for (let i = 0, n = Math.floor(k * 26); i < n; i++) c.fillRect(x + 36 + i * 20.6, y + 126, 16, 22);
  pixel(c, `${Math.floor(k * 100)}%`, x + w / 2, y + 186, { size: 26, color: C.retroText, align: 'center' });
  c.restore();
}

/** The upload page: her track, its play counter, and (in orange) how many times I heard it. */
function browser(c: CanvasRenderingContext2D, t: number, heard: number) {
  const a = win(t, PAGE, DIVE + 2, 0.15) + win(t, PLAYS_11 - 0.3, 1e9, 0.3) * (outro(t) ? 1 : 0);
  if (a <= 0) return;
  c.save();
  c.globalAlpha = clamp01(a);
  const x = 150, y = 120, w = SW - 300, h = 760;
  bevel(c, x, y, w, h, '#a9aeb8');
  const tg = c.createLinearGradient(x, 0, x + w, 0);
  tg.addColorStop(0, C.titleA); tg.addColorStop(1, C.titleB);
  c.fillStyle = tg; c.fillRect(x + 4, y + 4, w - 8, 34);
  pixel(c, 'my songs - upload complete! - Web Browser', x + 14, y + 22, { size: 26, color: '#fff' });
  bevel(c, x + 12, y + 46, w - 24, 38, '#fff', true);
  pixel(c, 'http://my-songs/u/kid_kick04/girl_beat_01', x + 24, y + 66, { size: 26, color: '#223', max: w - 48 });
  c.fillStyle = '#d9d4c4'; c.fillRect(x + 12, y + 92, w - 24, h - 104);
  pixel(c, 'my songs', x + 50, y + 150, { size: 64, color: '#2a3c66' });
  pixel(c, 'uploaded at 12:00 AM  ·  1 song', x + 54, y + 200, { size: 28, color: '#6a7488' });
  // the track
  const ty = y + 250;
  c.fillStyle = '#c7c2b2'; c.fillRect(x + 50, ty, w - 100, 210);
  c.fillStyle = '#2a3c66'; c.beginPath(); c.arc(x + 120, ty + 105, 48, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + 105, ty + 80); c.lineTo(x + 140, ty + 105); c.lineTo(x + 105, ty + 130); c.fill();
  pixel(c, 'girl_beat_01.mp3', x + 200, ty + 50, { size: 40, color: '#1c232b' });
  // waveform
  for (let i = 0; i < 104; i++) {
    const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.9) * rnd(i * 2.1)) * (i % 4 === 0 ? 1 : 0.55);
    c.fillStyle = '#8b93a6'; c.fillRect(x + 200 + i * 5.4, ty + 120 - v * 40, 3, v * 80);
  }
  // plays: 0 → 11 at midnight, 11 for years, then 12
  const plays = outro(t) ? (t >= TWELVE ? 12 : 11) : Math.min(11, Math.floor(Math.pow(ramp(t, PAGE + 0.3, ELEVEN), 0.7) * 11));
  const bump = outro(t) ? smooth(TWELVE, TWELVE + 0.1, t) * (1 - smooth(TWELVE + 0.4, TWELVE + 1.6, t)) : 0;
  pixel(c, 'plays:', x + w - 290, ty + 105, { size: 44, color: '#1c232b' });
  pixel(c, String(plays), x + w - 80, ty + 105, { size: 56 + bump * 20, color: bump > 0 ? '#d8452f' : '#1c232b', align: 'right' });
  pixel(c, 'comments (0)', x + 54, ty + 260, { size: 32, color: '#6a7488' });
  pixel(c, 'be the first to leave a comment!', x + 54, ty + 300, { size: 28, color: '#9aa2b2' });
  // the second counter, in my colour: I heard it far more than anyone
  if (heard > 0 && !outro(t)) {
    const n = Math.floor(lerp(11, 41206553, Math.pow(outCubic(heard), 2)));
    c.globalAlpha = clamp01(a) * smooth(0, 0.15, heard);
    c.font = `700 40px ${MONO}`;
    txt(c, `heard ${fmt(n)}×`, x + w - 80, ty + 290, { size: 58, weight: 700, color: C.orange, font: MONO, align: 'right' });
    txt(c, 'by: ▒▒▒▒▒▒▒▒', x + w - 80, ty + 360, { size: 40, weight: 700, color: C.orange, font: MONO, align: 'right' });
  }
  c.restore();
}

/** Her mouse pointer: clicks the sixteen squares, then the export button. */
function cursor2004(c: CanvasRenderingContext2D, t: number) {
  if (t < RACK_OPEN + 0.6 || (t > PAGE && !outro(t)) || outro(t)) return;
  let x = 700, y = 820, down = false;
  const per = (CLICKS[1] - CLICKS[0]) / 16;
  if (t < CLICKS[0]) {
    const k = smooth(CLICKS[0] - 2.2, CLICKS[0], t);
    const r = stepRect(CLICK_ORDER[0][0], CLICK_ORDER[0][1]);
    x = lerp(860, r.x + 22, k); y = lerp(900, r.y + 30, k);
  } else if (t < CLICKS[1] + per) {
    const i = Math.min(15, Math.floor((t - CLICKS[0]) / per)), u = (t - CLICKS[0]) / per - i;
    const a = stepRect(...CLICK_ORDER[i]), b = stepRect(...CLICK_ORDER[Math.min(15, i + 1)]);
    const k = smooth(0.45, 1, u);
    x = lerp(a.x + 22, b.x + 22, k); y = lerp(a.y + 30, b.y + 30, k);
    down = u < 0.25;
  } else {
    // up to FILE ▸ export
    const k = smooth(CLICKS[1] + 0.3, RENDER - 0.15, t);
    const r = stepRect(3, 15);
    x = lerp(r.x + 22, 70, k); y = lerp(r.y + 30, 80, k);
    down = t > RENDER - 0.15 && t < RENDER + 0.05;
  }
  pointer(c, x, y, 1.5, down);
}
