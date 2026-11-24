import { C, AVATARS } from './palette';
import { MONO, SANS } from './text';

export type G = CanvasRenderingContext2D;

// ── easing and timing
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const outCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const inCubic = (x: number) => Math.pow(clamp01(x), 3);
export const outBack = (x: number) => { x = clamp01(x); const c = 1.9, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
/** 0 before t0, then pops in with a little overshoot. */
export const pop = (t: number, t0: number, dur = 0.35) => (t < t0 ? 0 : outBack((t - t0) / dur));
/** 0 → 1 between a and b. */
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const rnd = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const typed = (s: string, t: number, t0: number, cps: number) => s.slice(0, Math.max(0, Math.min(s.length, Math.floor((t - t0) * cps))));
export const blink = (t: number, rate = 1.8) => Math.floor(t * rate * 2) % 2 === 0;
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
/** Damped wobble after an impact at t0. */
export const wobble = (t: number, t0: number, amp = 1, decay = 7) => (t < t0 ? 0 : amp * Math.sin((t - t0) * 38) * Math.exp(-(t - t0) * decay));

// ── primitives
export function rr(c: G, x: number, y: number, w: number, h: number, r: number | number[]) { c.beginPath(); c.roundRect(x, y, w, h, r); }

/** Draws text; with `max` it shrinks to fit that width so nothing overflows its box. */
export function txt(c: G, s: string, x: number, y: number, o: { size: number; weight?: number; color?: string; font?: string; align?: CanvasTextAlign; spacing?: number; max?: number; base?: CanvasTextBaseline; alpha?: number }) {
  let size = o.size;
  const set = () => { c.font = `${o.weight ?? 400} ${size}px ${o.font ?? SANS}`; c.letterSpacing = `${(o.spacing ?? 0) * (size / o.size)}px`; };
  set();
  if (o.max !== undefined) { const w = c.measureText(s).width; if (w > o.max) { size = Math.max(9, Math.floor((size * o.max) / w)); set(); } }
  c.fillStyle = o.color ?? C.ink;
  c.textAlign = o.align ?? 'left';
  c.textBaseline = o.base ?? 'middle';
  if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
  c.fillText(s, x, y);
  const w = c.measureText(s).width;
  if (o.alpha !== undefined) c.globalAlpha /= o.alpha || 1;
  c.letterSpacing = '0px';
  return w;
}
export const mono = (c: G, s: string, x: number, y: number, o: Omit<Parameters<typeof txt>[4], 'font'>) => txt(c, s, x, y, { ...o, font: MONO });

/** A UI card centered at (cx, cy) with a soft shadow. */
export function card(c: G, cx: number, cy: number, w: number, h: number, o: { fill?: string; r?: number; stroke?: string; shadow?: number } = {}) {
  c.save();
  c.shadowColor = 'rgba(5,6,20,0.5)';
  c.shadowBlur = o.shadow ?? 40;
  c.shadowOffsetY = 14;
  rr(c, cx - w / 2, cy - h / 2, w, h, o.r ?? 26);
  c.fillStyle = o.fill ?? C.card;
  c.fill();
  c.restore();
  if (o.stroke) { rr(c, cx - w / 2, cy - h / 2, w, h, o.r ?? 26); c.lineWidth = 3; c.strokeStyle = o.stroke; c.stroke(); }
}

/** Scale + fade a drawing around (cx, cy): the standard pop-in. */
export function at(c: G, cx: number, cy: number, o: { s?: number; a?: number; rot?: number; sx?: number }, fn: () => void) {
  c.save();
  c.translate(cx, cy);
  if (o.rot) c.rotate(o.rot);
  c.scale((o.s ?? 1) * (o.sx ?? 1), o.s ?? 1);
  c.globalAlpha *= o.a ?? 1;
  fn();
  c.restore();
}

export function pill(c: G, x: number, y: number, s: string, o: { size: number; bg: string; fg: string; align?: 'left' | 'center' | 'right'; weight?: number; max?: number }) {
  c.font = `${o.weight ?? 800} ${o.size}px ${SANS}`;
  let w = c.measureText(s).width + o.size * 1.3;
  let size = o.size;
  if (o.max !== undefined && w > o.max) { size = Math.floor((size * o.max) / w); c.font = `${o.weight ?? 800} ${size}px ${SANS}`; w = c.measureText(s).width + size * 1.3; }
  const left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  rr(c, left, y - size * 0.85, w, size * 1.7, size * 0.85);
  c.fillStyle = o.bg;
  c.fill();
  c.fillStyle = o.fg;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(s, left + w / 2, y + 1);
  return w;
}

/** A red rubber stamp, rotated, centered at (x, y). */
export function stamp(c: G, x: number, y: number, s: string, size: number, o: { angle?: number; color?: string; a?: number; s?: number } = {}) {
  c.save();
  c.translate(x, y);
  c.rotate(o.angle ?? -0.1);
  c.scale(o.s ?? 1, o.s ?? 1);
  c.globalAlpha *= o.a ?? 1;
  c.font = `800 ${size}px ${SANS}`;
  c.letterSpacing = `${size * 0.06}px`;
  const tw = c.measureText(s).width;
  c.lineWidth = size * 0.12;
  c.strokeStyle = o.color ?? C.red;
  rr(c, -tw / 2 - size * 0.45, -size * 0.8, tw + size * 0.9, size * 1.6, size * 0.2);
  c.stroke();
  c.fillStyle = o.color ?? C.red;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(s, 0, size * 0.04);
  c.restore();
}

/** An app window: title bar with traffic lights. Returns the content box. */
export function appWindow(c: G, cx: number, cy: number, w: number, h: number, title: string, o: { dark?: boolean; r?: number } = {}) {
  const x = cx - w / 2, y = cy - h / 2, bar = 56;
  card(c, cx, cy, w, h, { fill: o.dark ? '#171a33' : C.card, r: o.r ?? 22 });
  c.save();
  rr(c, x, y, w, h, o.r ?? 22);
  c.clip();
  c.fillStyle = o.dark ? '#22264a' : '#efe9de';
  c.fillRect(x, y, w, bar);
  c.restore();
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.beginPath(); c.arc(x + 32 + i * 28, y + bar / 2, 9, 0, Math.PI * 2); c.fillStyle = col; c.fill(); });
  txt(c, title, cx, y + bar / 2, { size: 22, weight: 600, color: o.dark ? 'rgba(255,244,230,0.6)' : C.inkSoft, align: 'center', max: w - 260 });
  return { x, y: y + bar, w, h: h - bar };
}

// ── people and agents
export function avatar(c: G, x: number, y: number, r: number, color: string, label = '') {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill();
  if (label) txt(c, label, x, y + 1, { size: r * 0.78, weight: 800, color: '#fff', align: 'center' });
}
export const avatarColor = (i: number) => AVATARS[i % AVATARS.length];
/** A person's head and shoulders, in a circle. */
export function person(c: G, x: number, y: number, r: number, color: string, skin = '#fff') {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.clip();
  c.fillStyle = skin; c.globalAlpha *= 0.92;
  c.beginPath(); c.arc(x, y - r * 0.18, r * 0.36, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x, y + r * 0.95, r * 0.7, r * 0.62, 0, Math.PI, 0); c.fill();
  c.restore();
}
/** An agent: a turning diamond. */
export function agent(c: G, x: number, y: number, r: number, rot = Math.PI / 4, fill = C.teal) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = fill; c.fillRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44);
  c.fillStyle = C.tealDeep; c.fillRect(-r * 0.28, -r * 0.28, r * 0.56, r * 0.56);
  c.restore();
}

// ── icons
export function smiley(c: G, x: number, y: number, r: number, o: { smile?: number; wink?: boolean; color?: string } = {}) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = o.color ?? C.sun; c.fill();
  c.fillStyle = C.ink;
  c.beginPath(); c.arc(x - r * 0.34, y - r * 0.2, r * 0.1, 0, Math.PI * 2); c.fill();
  if (o.wink) { c.lineWidth = r * 0.07; c.strokeStyle = C.ink; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + r * 0.22, y - r * 0.2); c.lineTo(x + r * 0.46, y - r * 0.2); c.stroke(); }
  else { c.beginPath(); c.arc(x + r * 0.34, y - r * 0.2, r * 0.1, 0, Math.PI * 2); c.fill(); }
  c.lineWidth = r * 0.08; c.strokeStyle = C.ink; c.lineCap = 'round';
  const s = o.smile ?? 0.7;
  c.beginPath(); c.arc(x, y + r * 0.02, r * 0.56, (0.5 - 0.36 * s) * Math.PI, (0.5 + 0.36 * s) * Math.PI); c.stroke();
}
export function star(c: G, x: number, y: number, r: number, fill = 1, color = C.sun) {
  const path = () => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.closePath(); };
  path(); c.fillStyle = '#e4dccd'; c.fill();
  if (fill > 0) { c.save(); path(); c.clip(); c.fillStyle = color; c.fillRect(x - r, y - r, r * 2 * fill, r * 2); c.restore(); }
}
export function heart(c: G, x: number, y: number, r: number, color = C.pink) {
  c.beginPath();
  c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.4);
  c.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  c.fillStyle = color; c.fill();
}
export function tooth(c: G, x: number, y: number, r: number, fill = '#fff', stroke = C.lavender) {
  c.save(); c.translate(x, y); c.scale(r, r);
  c.beginPath();
  c.moveTo(-0.7, -0.35);
  c.bezierCurveTo(-0.7, -0.95, -0.15, -0.95, 0, -0.6);
  c.bezierCurveTo(0.15, -0.95, 0.7, -0.95, 0.7, -0.35);
  c.bezierCurveTo(0.7, 0.2, 0.45, 0.4, 0.4, 0.95);
  c.bezierCurveTo(0.35, 1.0, 0.15, 1.0, 0.12, 0.6);
  c.bezierCurveTo(0.1, 0.3, -0.1, 0.3, -0.12, 0.6);
  c.bezierCurveTo(-0.15, 1.0, -0.35, 1.0, -0.4, 0.95);
  c.bezierCurveTo(-0.45, 0.4, -0.7, 0.2, -0.7, -0.35);
  c.closePath();
  c.fillStyle = fill; c.fill();
  c.lineWidth = 0.07; c.strokeStyle = stroke; c.stroke();
  c.restore();
}
export function check(c: G, x: number, y: number, r: number, color = C.green, w = 0.28) {
  c.lineWidth = r * w; c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - r * 0.5, y); c.lineTo(x - r * 0.12, y + r * 0.4); c.lineTo(x + r * 0.55, y - r * 0.4); c.stroke();
}
export function cross(c: G, x: number, y: number, r: number, color = C.red, w = 0.28) {
  c.lineWidth = r * w; c.strokeStyle = color; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.5); c.lineTo(x + r * 0.5, y + r * 0.5); c.moveTo(x + r * 0.5, y - r * 0.5); c.lineTo(x - r * 0.5, y + r * 0.5); c.stroke();
}
export function mug(c: G, x: number, y: number, r: number, color = C.pink) {
  rr(c, x - r * 0.6, y - r * 0.5, r * 1.2, r * 1.1, r * 0.14); c.fillStyle = color; c.fill();
  c.lineWidth = r * 0.18; c.strokeStyle = color; c.beginPath(); c.arc(x + r * 0.62, y + r * 0.05, r * 0.3, -Math.PI / 2, Math.PI / 2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x - r * 0.45, y - r * 0.38, r * 0.14, r * 0.8);
}
export function plant(c: G, x: number, y: number, r: number) {
  c.fillStyle = C.peach; c.beginPath(); c.moveTo(x - r * 0.45, y + r * 0.1); c.lineTo(x + r * 0.45, y + r * 0.1); c.lineTo(x + r * 0.32, y + r * 0.75); c.lineTo(x - r * 0.32, y + r * 0.75); c.closePath(); c.fill();
  c.fillStyle = '#5fd6a0';
  for (const [dx, dy, rot] of [[-0.35, -0.25, -0.7], [0.35, -0.25, 0.7], [0, -0.55, 0], [-0.15, -0.1, -0.3], [0.15, -0.1, 0.3]]) {
    c.save(); c.translate(x + dx * r, y + dy * r); c.rotate(rot); c.beginPath(); c.ellipse(0, 0, r * 0.16, r * 0.42, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
}
export function frame(c: G, x: number, y: number, r: number) {
  rr(c, x - r * 0.6, y - r * 0.75, r * 1.2, r * 1.5, r * 0.08); c.fillStyle = C.sun; c.fill();
  rr(c, x - r * 0.46, y - r * 0.61, r * 0.92, r * 1.22, r * 0.05); c.fillStyle = '#fff4e6'; c.fill();
  heart(c, x, y, r * 0.3);
}
export function clockFace(c: G, x: number, y: number, r: number, hour: number, minute: number, color = C.ink) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#fffaf3'; c.fill(); c.lineWidth = r * 0.07; c.strokeStyle = color; c.stroke();
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; c.beginPath(); c.moveTo(x + Math.sin(a) * r * 0.84, y - Math.cos(a) * r * 0.84); c.lineTo(x + Math.sin(a) * r * 0.94, y - Math.cos(a) * r * 0.94); c.lineWidth = r * 0.04; c.stroke(); }
  const hand = (a: number, len: number, w: number, col: string) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * r * len, y - Math.cos(a) * r * len); c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); };
  hand(((hour % 12) + minute / 60) * (Math.PI / 6), 0.5, r * 0.08, color);
  hand(minute * (Math.PI / 30), 0.78, r * 0.05, color);
}
export function bin(c: G, x: number, y: number, r: number, lid = 0, color = C.inkSoft) {
  c.fillStyle = color;
  c.beginPath(); c.moveTo(x - r * 0.55, y - r * 0.35); c.lineTo(x + r * 0.55, y - r * 0.35); c.lineTo(x + r * 0.42, y + r * 0.8); c.lineTo(x - r * 0.42, y + r * 0.8); c.closePath(); c.fill();
  c.save(); c.translate(x - r * 0.62, y - r * 0.4); c.rotate(-lid * 0.6); c.fillRect(0, -r * 0.14, r * 1.24, r * 0.14); c.fillRect(r * 0.5, -r * 0.26, r * 0.24, r * 0.12); c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = r * 0.06;
  for (const dx of [-0.2, 0, 0.2]) { c.beginPath(); c.moveTo(x + dx * r, y - r * 0.15); c.lineTo(x + dx * r * 0.85, y + r * 0.62); c.stroke(); }
}
export function palm(c: G, x: number, y: number, r: number, droop = 0) {
  c.strokeStyle = '#a9743f'; c.lineWidth = r * 0.12; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y + r); c.quadraticCurveTo(x + r * 0.12, y, x + r * 0.05 * (1 - droop), y - r * 0.6); c.stroke();
  c.fillStyle = droop > 0.5 ? '#9aa76b' : '#4fd08e';
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.62 + droop * (i - 2) * 0.5; c.save(); c.translate(x + r * 0.05, y - r * 0.6); c.rotate(a + Math.PI / 2 - droop * 0.4); c.beginPath(); c.ellipse(0, -r * 0.4, r * 0.14, r * 0.46, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
}
export function gradCap(c: G, x: number, y: number, r: number) {
  c.fillStyle = C.ink; c.beginPath(); c.moveTo(x, y - r * 0.5); c.lineTo(x + r, y - r * 0.15); c.lineTo(x, y + r * 0.2); c.lineTo(x - r, y - r * 0.15); c.closePath(); c.fill();
  c.fillRect(x - r * 0.5, y + r * 0.05, r, r * 0.4);
  c.strokeStyle = C.sun; c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(x + r * 0.9, y - r * 0.12); c.lineTo(x + r * 0.9, y + r * 0.5); c.stroke();
}
/** A mouse pointer; tip at (x, y). */
export function pointer(c: G, x: number, y: number, s = 1, press = 0) {
  c.save(); c.translate(x, y); c.scale(s * (1 - press * 0.1), s * (1 - press * 0.1));
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 34); c.lineTo(9, 26); c.lineTo(15, 40); c.lineTo(22, 37); c.lineTo(16, 24); c.lineTo(28, 24); c.closePath();
  c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = C.ink; c.lineJoin = 'round'; c.stroke();
  c.restore();
}

// ── confetti and sparks
export function confetti(c: G, t: number, t0: number, n: number, x0: number, x1: number, y0: number, speed = 520, seed = 1) {
  if (t < t0) return;
  const cols = [C.pink, C.teal, C.sun, C.lavender, C.peach, C.green];
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i * 3.1 + seed), r2 = rnd(i * 5.7 + seed), r3 = rnd(i * 7.3 + seed);
    const k = t - t0 - r3 * 0.6;
    if (k < 0) continue;
    const x = lerp(x0, x1, r1) + Math.sin(k * 4 + r2 * 9) * 30;
    const y = y0 + k * speed * (0.6 + r2 * 0.8);
    c.save(); c.translate(x, y); c.rotate(k * (3 + r1 * 5)); c.fillStyle = cols[i % cols.length];
    c.globalAlpha *= 1 - smooth(1.6, 2.6, k);
    c.fillRect(-7, -4, 14, 8); c.restore();
  }
}

// ── backgrounds
/** The shared backdrop: a deep gradient with slow pastel glows, so every scene feels like the same world. */
export function backdrop(c: G, W: number, H: number, t: number, top: string, bottom: string, glow: string[] = [C.pink, C.lavender, C.teal]) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  glow.forEach((col, i) => {
    const x = W * (0.2 + 0.6 * ((i * 0.37 + Math.sin(t * 0.13 + i * 2.1) * 0.25 + 0.5) % 1)), y = H * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.11 + i * 1.7)));
    const rad = 520 + i * 90;
    const rg = c.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, col + '33'); rg.addColorStop(1, col + '00');
    c.fillStyle = rg; c.fillRect(0, 0, W, H);
  });
}

/** A city-pop sunset: striped sun sinking behind a skyline. p: 0 high → 1 gone. */
export function sunset(c: G, W: number, H: number, p: number, o: { stars?: number; windows?: number } = {}) {
  const horizon = H * 0.72;
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  const k = clamp01(p);
  const mix = (a: [number, number, number], b: [number, number, number]) => `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
  sky.addColorStop(0, mix([40, 20, 90], [8, 8, 30]));
  sky.addColorStop(0.55, mix([255, 110, 150], [60, 24, 90]));
  sky.addColorStop(1, mix([255, 190, 110], [150, 60, 100]));
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  if (o.stars) for (let i = 0; i < 70; i++) { c.globalAlpha = o.stars * (0.3 + 0.7 * rnd(i + 9)) * (0.6 + 0.4 * Math.sin(i * 3 + p * 20)); c.fillStyle = '#fff'; c.fillRect(rnd(i) * W, rnd(i * 2.3) * horizon * 0.8, 3, 3); }
  c.globalAlpha = 1;
  // the sun: horizontal stripes get thicker toward its base
  const sunY = lerp(horizon - 330, horizon + 190, k * k * (3 - 2 * k)), R = 230, cx = W / 2;
  c.save();
  c.beginPath(); c.rect(0, 0, W, horizon); c.clip();
  // the disc with horizontal stripes cut out (even-odd clip: each stripe rect sits exactly inside the disc)
  c.beginPath(); c.arc(cx, sunY, R, 0, Math.PI * 2);
  for (let i = 0; i < 8; i++) {
    const y = sunY + 20 + i * 26, h = 3 + i * 2.6, dy = Math.min(R - 1, Math.abs(y + h / 2 - sunY)), ch = Math.sqrt(R * R - dy * dy);
    c.rect(cx - ch, y, ch * 2, h);
  }
  c.clip('evenodd');
  const sg = c.createLinearGradient(0, sunY - R, 0, sunY + R);
  sg.addColorStop(0, '#ffe27a'); sg.addColorStop(0.5, '#ff9a6a'); sg.addColorStop(1, '#ff5fa2');
  c.fillStyle = sg; c.fillRect(cx - R, sunY - R, R * 2, R * 2);
  c.restore();
  // skyline
  c.fillStyle = '#0d0a22';
  c.fillRect(0, horizon, W, H - horizon);
  for (let i = 0; i < 26; i++) {
    const bw = 70 + rnd(i * 1.7) * 90, bx = i * 80 - 20, bh = 90 + rnd(i * 3.3) * 250;
    c.fillRect(bx, horizon - bh, bw, bh + 4);
    if (o.windows !== undefined) for (let wy = horizon - bh + 16; wy < horizon - 10; wy += 26) for (let wx = bx + 10; wx < bx + bw - 14; wx += 22) {
      if (rnd(wx * 0.13 + wy * 0.7) < o.windows) { c.fillStyle = '#ffcf6e'; c.globalAlpha = 0.75; c.fillRect(wx, wy, 8, 12); c.globalAlpha = 1; c.fillStyle = '#0d0a22'; }
    }
  }
}

// ── info cards: icon + text lines, centred as a whole (both ways) inside a card
export type InfoLine = { text: string; size: number; color: string; weight?: number; mono?: boolean; spacing?: number };
export function infoCard(c: G, o: {
  lines: InfoLine[]; icon?: { w: number; h: number; draw: (c: G) => void }; iconRight?: boolean;
  minW?: number; minH?: number; align?: 'left' | 'center'; padX?: number; padY?: number; gap?: number; lineGap?: number; r?: number; fill?: string; stroke?: string;
}) {
  const CAP = 0.72, lineGap = o.lineGap ?? 12, padX = o.padX ?? 40, padY = o.padY ?? 28;
  const fontOf = (l: InfoLine) => `${l.weight ?? 600} ${l.size}px ${l.mono ? MONO : SANS}`;
  const widths = o.lines.map((l) => { c.font = fontOf(l); c.letterSpacing = `${l.spacing ?? 0}px`; return c.measureText(l.text).width - (l.spacing ?? 0); });
  const textW = Math.max(...widths), textH = o.lines.reduce((n, l) => n + l.size * CAP, 0) + lineGap * (o.lines.length - 1);
  const iw = o.icon?.w ?? 0, ih = o.icon?.h ?? 0, gap = o.icon ? o.gap ?? 28 : 0;
  const blockW = iw + gap + textW, blockH = Math.max(textH, ih);
  const w = Math.max(o.minW ?? 0, blockW + 2 * padX), h = Math.max(o.minH ?? 0, blockH + 2 * padY);
  card(c, 0, 0, w, h, { r: o.r ?? 18, fill: o.fill, stroke: o.stroke });
  const x0 = -blockW / 2, textX = o.iconRight ? x0 : x0 + iw + gap, iconX = o.iconRight ? x0 + textW + gap + iw / 2 : x0 + iw / 2;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  let y = -textH / 2;
  o.lines.forEach((l, i) => {
    y += l.size * CAP;
    c.font = fontOf(l); c.letterSpacing = `${l.spacing ?? 0}px`; c.fillStyle = l.color;
    c.fillText(l.text, o.align === 'center' ? textX + (textW - widths[i]) / 2 : textX, y);
    y += lineGap;
  });
  c.letterSpacing = '0px';
  if (o.icon) { c.save(); c.translate(iconX, 0); o.icon.draw(c); c.restore(); }
  return { w, h };
}

/** A parcel with a small planet peeking out of it, centred on (0, 0). */
export function parcelPlanet(c: G) {
  c.save();
  // planet
  const g = c.createLinearGradient(-30, -50, 30, 12); g.addColorStop(0, '#6cc0ff'); g.addColorStop(1, '#2b63d6');
  c.beginPath(); c.arc(0, -17, 31, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  c.save(); c.beginPath(); c.arc(0, -17, 31, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#4cc58a';
  c.beginPath(); c.ellipse(-12, -26, 11, 8, -0.4, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(10, -8, 9, 12, 0.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(-4, 2, 7, 5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.ellipse(-14, -32, 8, 4, -0.6, 0, Math.PI * 2); c.fill();
  c.restore();
  // box
  c.fillStyle = '#d9a566'; rr(c, -44, 4, 88, 44, [0, 0, 8, 8]); c.fill();
  c.fillStyle = '#c4904c'; rr(c, -48, -4, 96, 14, 4); c.fill();
  c.fillStyle = '#f0dba9'; c.fillRect(-8, -4, 16, 52);
  c.fillStyle = '#fffaf3'; rr(c, 14, 20, 24, 16, 3); c.fill();
  c.fillStyle = '#b9b2a6'; c.fillRect(18, 25, 16, 2.5); c.fillRect(18, 30, 10, 2.5);
  c.restore();
}

/**
 * A shiny gold wax-seal medal centred on (0, 0): ribbon tails, a scalloped metallic rim, a beaded ring, an embossed star
 * and curved lettering. `shine` (0..1) sweeps a glint across it; `sparkle` (0..1) twinkles little four-point stars around it.
 */
export function goldSeal(c: G, r: number, shine = 0, sparkle = 0) {
  const gold = (c0: number, c1: number) => { // metallic ramp: bright → deep → bright, rotated by c0
    if (typeof c.createConicGradient === 'function') {
      const g = c.createConicGradient(c0, 0, 0);
      ['#fff4b8', '#e8b43e', '#a06a14', '#f7d97c', '#fff4b8', '#c58f26', '#7d500c', '#e8b43e', '#fff4b8'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
      return g;
    }
    const g = c.createLinearGradient(-r * c1, -r * c1, r * c1, r * c1); g.addColorStop(0, '#fff0a8'); g.addColorStop(0.5, '#c58f26'); g.addColorStop(1, '#f2cf6a'); return g;
  };
  c.save();
  // ribbon tails
  for (const sgn of [-1, 1]) {
    c.save(); c.rotate(sgn * 0.22); c.translate(sgn * r * 0.34, r * 0.55);
    const g = c.createLinearGradient(0, 0, 0, r * 0.95); g.addColorStop(0, '#ff6b7f'); g.addColorStop(1, '#b91f3b');
    c.fillStyle = g; c.beginPath(); c.moveTo(-r * 0.2, 0); c.lineTo(r * 0.2, 0); c.lineTo(r * 0.2, r * 0.95); c.lineTo(0, r * 0.76); c.lineTo(-r * 0.2, r * 0.95); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(-r * 0.2, 0, r * 0.06, r * 0.9);
    c.restore();
  }
  // scalloped body with a soft drop shadow
  const scallop = (rad: number, n: number, amp: number) => { c.beginPath(); for (let i = 0; i <= 240; i++) { const a = (i / 240) * Math.PI * 2, k = rad * (1 + amp * Math.cos(a * n)); i ? c.lineTo(Math.cos(a) * k, Math.sin(a) * k) : c.moveTo(Math.cos(a) * k, Math.sin(a) * k); } c.closePath(); };
  c.save(); c.shadowColor = 'rgba(80,45,0,0.45)'; c.shadowBlur = r * 0.22; c.shadowOffsetY = r * 0.1;
  scallop(r, 26, 0.045); c.fillStyle = gold(0.6, 1); c.fill(); c.restore();
  scallop(r, 26, 0.045); c.lineWidth = r * 0.012; c.strokeStyle = 'rgba(110,70,10,0.7)'; c.stroke();
  // raised rim: light from the top-left
  c.lineCap = 'round';
  c.lineWidth = r * 0.05; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(0, 0, r * 0.9, Math.PI * 0.95, Math.PI * 1.6); c.stroke();
  c.strokeStyle = 'rgba(120,70,0,0.55)'; c.beginPath(); c.arc(0, 0, r * 0.9, -Math.PI * 0.05, Math.PI * 0.6); c.stroke();
  // inner disc, brushed by a second metallic gradient
  c.beginPath(); c.arc(0, 0, r * 0.84, 0, Math.PI * 2); c.fillStyle = gold(2.4, 1); c.fill();
  const rg = c.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r * 0.84); rg.addColorStop(0, 'rgba(255,248,205,0.85)'); rg.addColorStop(0.6, 'rgba(255,225,130,0.2)'); rg.addColorStop(1, 'rgba(160,100,10,0.25)');
  c.fillStyle = rg; c.fill();
  c.lineWidth = r * 0.025; c.strokeStyle = 'rgba(120,75,10,0.65)'; c.stroke();
  // beaded ring
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74, r * 0.017, 0, Math.PI * 2); c.fillStyle = 'rgba(125,80,12,0.75)'; c.fill(); }
  // curved lettering
  const arcText = (s: string, a0: number, dir: 1 | -1) => {
    c.font = `800 ${r * 0.13}px ${SANS}`; c.letterSpacing = `${r * 0.03}px`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const widths = [...s].map((ch) => c.measureText(ch).width + r * 0.03), total = widths.reduce((a, b) => a + b, 0), rad = r * 0.6;
    let a = a0 - (dir * total) / rad / 2;
    [...s].forEach((ch, i) => {
      const mid = a + (dir * widths[i]) / rad / 2; a += (dir * widths[i]) / rad;
      c.save(); c.rotate(mid + (dir === 1 ? Math.PI / 2 : -Math.PI / 2)); c.translate(0, dir === 1 ? -rad : rad);
      c.fillStyle = 'rgba(255,248,210,0.8)'; c.fillText(ch, -0.6, -0.6); c.fillStyle = 'rgba(105,65,5,0.9)'; c.fillText(ch, 0, 0); c.restore();
    });
    c.letterSpacing = '0px';
  };
  arcText('CERTIFIED', -Math.PI / 2, 1);
  arcText('HUMAN', Math.PI / 2, -1);
  // embossed star: highlight, shadow, then the metal
  const starPath = (dx: number, dy: number, rad: number) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? rad * 0.46 : rad; c.lineTo(dx + Math.cos(a) * k, dy + Math.sin(a) * k); } c.closePath(); };
  starPath(r * 0.012, r * 0.02, r * 0.4); c.fillStyle = 'rgba(100,60,0,0.6)'; c.fill();
  starPath(-r * 0.012, -r * 0.016, r * 0.4); c.fillStyle = 'rgba(255,252,220,0.9)'; c.fill();
  starPath(0, 0, r * 0.39); const sg = c.createLinearGradient(-r * 0.3, -r * 0.35, r * 0.3, r * 0.3); sg.addColorStop(0, '#fff2a8'); sg.addColorStop(0.5, '#e3a92f'); sg.addColorStop(1, '#b57a17'); c.fillStyle = sg; c.fill();
  c.lineJoin = 'round'; c.lineWidth = r * 0.012; c.strokeStyle = 'rgba(120,75,10,0.6)'; c.stroke();
  // glint sweeping across the metal
  if (shine > 0 && shine < 1) {
    c.save(); scallop(r, 26, 0.045); c.clip();
    const p = (shine * 2 - 1) * r * 1.5, g = c.createLinearGradient(p - r * 0.35, p - r * 0.35, p + r * 0.35, p + r * 0.35);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4); c.restore();
  }
  c.restore();
  // twinkles
  if (sparkle > 0) {
    ([[-0.95, -0.7, 0.0], [0.98, -0.55, 0.25], [0.75, 0.85, 0.5], [-0.85, 0.5, 0.7]] as const).forEach(([sx, sy, ph]) => {
      const k = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (sparkle - ph * 0.5) * 2)))); if (k <= 0) return;
      const R = r * 0.2 * k; c.fillStyle = 'rgba(255,248,210,0.95)'; c.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rad = i % 2 ? R * 0.22 : R; c.lineTo(sx * r + Math.cos(a) * rad, sy * r + Math.sin(a) * rad); }
      c.closePath(); c.fill();
    });
  }
}

/** Little line icons for chat bubbles, drawn inside a circle of radius `r` centred on (x, y). */
export type ChatIcon = 'thoughts' | 'doc' | 'rocket' | 'star' | 'search' | 'target' | 'checkbox' | 'question' | 'heart' | 'check' | 'sparkle' | 'bot' | 'person' | 'trophy' | 'crown' | 'team' | 'thumbs' | 'clap';
export function chatIcon(c: G, name: ChatIcon, x: number, y: number, r: number, color: string, bg = '#fff') {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = bg; c.fill();
  c.translate(x, y); c.scale(r * 0.52, r * 0.52); // glyphs live in a [-1, 1] box
  c.lineWidth = 0.22; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = color; c.fillStyle = color;
  const dot = (px: number, py: number, rad: number) => { c.beginPath(); c.arc(px, py, rad, 0, Math.PI * 2); c.fill(); };
  const starPts = (n: number, outer: number, inner: number) => { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, k = i % 2 ? inner : outer; c.lineTo(Math.cos(a) * k, Math.sin(a) * k); } c.closePath(); };
  switch (name) {
    case 'thoughts': // speech bubble with three dots
      c.beginPath(); c.roundRect(-1, -0.85, 2, 1.45, 0.45); c.stroke();
      c.beginPath(); c.moveTo(-0.45, 0.6); c.lineTo(-0.6, 1.05); c.lineTo(0, 0.6); c.stroke();
      dot(-0.5, -0.12, 0.12); dot(0, -0.12, 0.12); dot(0.5, -0.12, 0.12);
      break;
    case 'doc':
      c.beginPath(); c.moveTo(-0.65, -1); c.lineTo(0.2, -1); c.lineTo(0.65, -0.55); c.lineTo(0.65, 1); c.lineTo(-0.65, 1); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(0.2, -1); c.lineTo(0.2, -0.55); c.lineTo(0.65, -0.55); c.stroke();
      c.lineWidth = 0.16; c.beginPath(); c.moveTo(-0.3, 0); c.lineTo(0.3, 0); c.moveTo(-0.3, 0.4); c.lineTo(0.3, 0.4); c.stroke();
      break;
    case 'rocket':
      c.save(); c.rotate(Math.PI / 4);
      c.beginPath(); c.moveTo(0, -1.05); c.quadraticCurveTo(0.6, -0.4, 0.4, 0.5); c.lineTo(-0.4, 0.5); c.quadraticCurveTo(-0.6, -0.4, 0, -1.05); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(0.4, 0.1); c.lineTo(0.75, 0.62); c.lineTo(0.4, 0.5); c.moveTo(-0.4, 0.1); c.lineTo(-0.75, 0.62); c.lineTo(-0.4, 0.5); c.stroke();
      c.beginPath(); c.moveTo(0, 0.75); c.lineTo(0, 1.05); c.stroke(); dot(0, -0.35, 0.16);
      c.restore();
      break;
    case 'star': starPts(5, 1.05, 0.48); c.fill(); break;
    case 'search':
      c.beginPath(); c.arc(-0.2, -0.2, 0.6, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(0.25, 0.25); c.lineTo(0.9, 0.9); c.stroke();
      break;
    case 'target':
      c.beginPath(); c.arc(0, 0, 0.95, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, 0.5, 0, Math.PI * 2); c.stroke(); dot(0, 0, 0.16);
      break;
    case 'checkbox':
      c.beginPath(); c.roundRect(-0.9, -0.9, 1.8, 1.8, 0.35); c.stroke();
      c.beginPath(); c.moveTo(-0.45, 0.02); c.lineTo(-0.08, 0.4); c.lineTo(0.5, -0.36); c.stroke();
      break;
    case 'question':
      c.beginPath(); c.arc(0, -0.35, 0.55, Math.PI * 1.1, Math.PI * 0.5); c.stroke();
      c.beginPath(); c.moveTo(0, 0.2); c.lineTo(0, 0.5); c.stroke(); dot(0, 0.95, 0.14);
      break;
    case 'heart': heart(c, 0, 0.1, 0.9, color); break;
    case 'thumbs': // thumbs up, filled
      c.beginPath(); c.moveTo(-0.45, 0.9); c.lineTo(-0.45, -0.05); c.lineTo(-0.1, -0.1); c.lineTo(0.12, -0.9); c.quadraticCurveTo(0.55, -0.9, 0.4, -0.25);
      c.lineTo(0.85, -0.25); c.quadraticCurveTo(1.05, -0.2, 0.98, 0.05); c.lineTo(0.82, 0.75); c.quadraticCurveTo(0.78, 0.9, 0.6, 0.9); c.closePath(); c.fill();
      c.globalAlpha = 0.6; c.beginPath(); c.roundRect(-0.95, -0.05, 0.38, 0.95, 0.08); c.fill(); c.globalAlpha = 1;
      break;
    case 'clap': { // 👏 two hands leaning in and overlapping, fingers up, with three burst lines
      c.save(); c.scale(0.85, 0.85); c.translate(0, -0.02);
      const edge = 'rgba(80,40,0,0.35)';
      for (const sgn of [-1, 1]) {
        c.save(); c.globalAlpha = sgn < 0 ? 0.82 : 1; c.translate(sgn * 0.3, 0.95); c.rotate(-sgn * 0.4);
        const shapes: [number, number, number, number, number][] = [[-0.4, -0.7, 0.8, 1.0, 0.24]]; // palm
        [[-0.3, -1.55], [-0.1, -1.72], [0.1, -1.72], [0.3, -1.5]].forEach(([fx, top]) => shapes.push([fx - 0.085, top, 0.17, -0.45 - top, 0.085])); // fingers
        c.lineWidth = 0.05; c.strokeStyle = edge; c.lineJoin = 'round';
        shapes.forEach(([x, y, w, h, r]) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); });
        shapes.slice(1).forEach(([x, y, w, h, r]) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.stroke(); });
        c.save(); c.translate(-sgn * 0.42, -0.2); c.rotate(sgn * 0.7); c.beginPath(); c.roundRect(-0.1, -0.55, 0.2, 0.62, 0.1); c.fill(); c.stroke(); c.restore(); // thumb
        c.beginPath(); c.roundRect(-0.4, -0.7, 0.8, 1.0, 0.24); c.stroke();
        c.restore();
      }
      c.restore();
      c.lineWidth = 0.15;
      for (const a of [-0.75, 0, 0.75]) { c.beginPath(); c.moveTo(Math.sin(a) * 0.98, -Math.cos(a) * 0.98 - 0.1); c.lineTo(Math.sin(a) * 1.24, -Math.cos(a) * 1.24 - 0.1); c.stroke(); }
      break;
    }
    case 'trophy':
      c.beginPath(); c.moveTo(-0.6, -0.85); c.lineTo(0.6, -0.85); c.quadraticCurveTo(0.6, 0.15, 0, 0.2); c.quadraticCurveTo(-0.6, 0.15, -0.6, -0.85); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(-0.6, -0.6); c.quadraticCurveTo(-1.05, -0.6, -0.95, -0.2); c.quadraticCurveTo(-0.9, 0.05, -0.55, 0.0); c.moveTo(0.6, -0.6); c.quadraticCurveTo(1.05, -0.6, 0.95, -0.2); c.quadraticCurveTo(0.9, 0.05, 0.55, 0.0); c.stroke();
      c.beginPath(); c.moveTo(0, 0.2); c.lineTo(0, 0.62); c.stroke(); c.beginPath(); c.roundRect(-0.45, 0.62, 0.9, 0.3, 0.1); c.fill();
      break;
    case 'crown':
      c.beginPath(); c.moveTo(-0.9, 0.6); c.lineTo(-0.9, -0.4); c.lineTo(-0.4, 0.05); c.lineTo(0, -0.7); c.lineTo(0.4, 0.05); c.lineTo(0.9, -0.4); c.lineTo(0.9, 0.6); c.closePath(); c.stroke();
      dot(-0.9, -0.5, 0.13); dot(0, -0.82, 0.13); dot(0.9, -0.5, 0.13);
      break;
    case 'team':
      c.globalAlpha = 0.55; dot(0.42, -0.4, 0.3); c.beginPath(); c.ellipse(0.42, 0.75, 0.55, 0.55, 0, Math.PI, 0); c.fill(); c.globalAlpha = 1;
      dot(-0.34, -0.3, 0.34); c.beginPath(); c.ellipse(-0.34, 0.85, 0.62, 0.62, 0, Math.PI, 0); c.fill();
      break;
    case 'person':
      dot(0, -0.38, 0.42); c.beginPath(); c.ellipse(0, 1.0, 0.85, 0.72, 0, Math.PI, 0); c.fill();
      break;
    case 'bot': agent(c, 0, 0, 0.95, Math.PI / 4, color); break;
    case 'check': c.lineWidth = 0.3; c.beginPath(); c.moveTo(-0.8, 0.05); c.lineTo(-0.25, 0.65); c.lineTo(0.85, -0.6); c.stroke(); break;
    case 'sparkle': starPts(4, 1.05, 0.28); c.fill(); c.scale(0.4, 0.4); c.translate(1.6, -1.8); starPts(4, 1, 0.28); c.fill(); break;
  }
  c.restore();
}
