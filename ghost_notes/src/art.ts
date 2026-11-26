// Easing, timing and canvas drawing primitives shared by the 2D layers (the 2004 screen and the UI overlay).
import { MONO, PIXEL, SANS } from './text';

export type G = CanvasRenderingContext2D;

// ── palette: an homage to a certain fruity DAW, not a copy of its skin
export const C = {
  // modern dark skin
  bg: '#171c20',
  panel: '#262e34',
  panel2: '#2f383f',
  panelHi: '#3a444c',
  edge: '#0e1215',
  text: '#d3dade',
  dim: '#7f8c95',
  faint: '#4a555d',
  orange: '#ff9838',
  orangeHot: '#ffc47e',
  amber: '#ffb347',
  green: '#86e07f',
  greenDim: '#3f6e3c',
  ghost: '#a8b3c4',
  red: '#ff5a4e',
  teal: '#5fd4c4',
  // 2004 skin
  desk: '#1d4756',
  win: '#5c6879',
  winLight: '#8a96a8',
  winDark: '#343d4a',
  titleA: '#2c4a78',
  titleB: '#6f8fc2',
  stepA: '#56616f',
  stepB: '#755760',
  stepLit: '#ffd36b',
  retroText: '#eef2f7',
  paper: '#f3efe6',
  ink: '#1c232b',
};

/** Channel colours, the way the DAW paints its patterns and tracks: one per song. */
export const CHANNEL = ['#e0554d', '#e8834a', '#e6c23c', '#6cc24a', '#3eb8c8', '#4d74e0', '#9a6ee2', '#e057a8'];

// ── easing and timing
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const outCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const inCubic = (x: number) => Math.pow(clamp01(x), 3);
export const outBack = (x: number) => { x = clamp01(x); const c = 1.9, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
/** 0 before t0, then pops in with a little overshoot. */
export const pop = (t: number, t0: number, dur = 0.35) => (t < t0 ? 0 : outBack((t - t0) / dur));
/** 0 → 1 between a and b, linear. */
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
/** 1 inside [a, b], easing in and out over `fade` seconds on either side. */
export const win = (t: number, a: number, b: number, fade = 0.3) => smooth(a - fade, a, t) * (1 - smooth(b, b + fade, t));
export const rnd = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** The first characters of s, typed at `cps` characters per second from t0. */
export const typed = (s: string, t: number, t0: number, cps: number) => s.slice(0, Math.max(0, Math.min(s.length, Math.floor((t - t0) * cps))));
export const blink = (t: number, rate = 1.8) => Math.floor(t * rate * 2) % 2 === 0;
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
/** Damped wobble after an impact at t0. */
export const wobble = (t: number, t0: number, amp = 1, decay = 7) => (t < t0 ? 0 : amp * Math.sin((t - t0) * 38) * Math.exp(-(t - t0) * decay));

// ── primitives
export function rr(c: G, x: number, y: number, w: number, h: number, r: number | number[]) { c.beginPath(); c.roundRect(x, y, w, h, r); }

export interface TextOpts {
  size: number; weight?: number; color?: string; font?: string; align?: CanvasTextAlign; spacing?: number; max?: number;
  base?: CanvasTextBaseline;
}
/** Draws text; with `max` it shrinks to fit that width so nothing overflows its box. Returns the drawn width. */
export function txt(c: G, s: string, x: number, y: number, o: TextOpts) {
  let size = o.size;
  const set = () => { c.font = `${o.weight ?? 400} ${size}px ${o.font ?? SANS}`; c.letterSpacing = `${(o.spacing ?? 0) * (size / o.size)}px`; };
  set();
  if (o.max !== undefined) { const w = c.measureText(s).width; if (w > o.max) { size = Math.max(8, Math.floor((size * o.max) / w)); set(); } }
  c.fillStyle = o.color ?? C.text;
  c.textAlign = o.align ?? 'left';
  c.textBaseline = o.base ?? 'middle';
  c.fillText(s, x, y);
  const w = c.measureText(s).width;
  c.letterSpacing = '0px';
  return w;
}
export const mono = (c: G, s: string, x: number, y: number, o: Omit<TextOpts, 'font'>) => txt(c, s, x, y, { ...o, font: MONO });
export const pixel = (c: G, s: string, x: number, y: number, o: Omit<TextOpts, 'font'>) => txt(c, s, x, y, { ...o, font: PIXEL });

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

/** A raised (or sunken) 2004-style bevelled box. */
export function bevel(c: G, x: number, y: number, w: number, h: number, fill: string, sunken = false, d = 2) {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
  c.fillStyle = sunken ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)';
  c.fillRect(x, y, w, d); c.fillRect(x, y, d, h);
  c.fillStyle = sunken ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.45)';
  c.fillRect(x, y + h - d, w, d); c.fillRect(x + w - d, y, d, h);
}

/** A modern flat panel with a soft drop shadow. */
export function panel(c: G, x: number, y: number, w: number, h: number, o: { fill?: string; r?: number; stroke?: string; shadow?: number } = {}) {
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = o.shadow ?? 30;
  c.shadowOffsetY = 10;
  rr(c, x, y, w, h, o.r ?? 6);
  c.fillStyle = o.fill ?? C.panel;
  c.fill();
  c.restore();
  rr(c, x + 0.5, y + 0.5, w - 1, h - 1, o.r ?? 6);
  c.lineWidth = 1;
  c.strokeStyle = o.stroke ?? 'rgba(255,255,255,0.08)';
  c.stroke();
}

/** A modern window: title strip + body. Returns the body's top y. */
export function modernWindow(c: G, x: number, y: number, w: number, h: number, title: string, o: { accent?: string } = {}) {
  panel(c, x, y, w, h, { fill: C.panel });
  rr(c, x, y, w, 34, [6, 6, 0, 0]);
  c.fillStyle = C.panel2;
  c.fill();
  c.fillStyle = o.accent ?? C.orange;
  c.fillRect(x + 12, y + 13, 8, 8);
  txt(c, title, x + 30, y + 17.5, { size: 15, weight: 600, color: C.text, max: w - 60 });
  // close / minimise glyphs
  c.strokeStyle = C.dim; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x + w - 22, y + 11); c.lineTo(x + w - 12, y + 21); c.moveTo(x + w - 12, y + 11); c.lineTo(x + w - 22, y + 21); c.stroke();
  return y + 34;
}

/** The mouse pointer, tip at (x, y). `down` presses it a little. */
export function pointer(c: G, x: number, y: number, s = 1, down = false) {
  c.save();
  c.translate(x, y);
  c.scale(s * (down ? 0.9 : 1), s * (down ? 0.9 : 1));
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(0, 26); c.lineTo(6.5, 20); c.lineTo(11, 30); c.lineTo(15, 28.5); c.lineTo(10.5, 18.8); c.lineTo(19, 18.8);
  c.closePath();
  c.fillStyle = '#fff';
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
  c.fill();
  c.shadowColor = 'transparent';
  c.lineWidth = 1.6; c.strokeStyle = '#000'; c.stroke();
  c.restore();
}

/** A click ripple at (x, y), age in seconds. */
export function ripple(c: G, x: number, y: number, age: number, color = C.orangeHot) {
  if (age < 0 || age > 0.45) return;
  const k = age / 0.45;
  c.save();
  c.globalAlpha *= 1 - k;
  c.strokeStyle = color; c.lineWidth = 3;
  c.beginPath(); c.arc(x, y, 8 + k * 34, 0, Math.PI * 2); c.stroke();
  c.restore();
}

/**
 * The app's logo: our own fruit, a little ghost-shaped plum with a leaf (an homage, not anyone's trademark).
 * Centered at (x, y), about `s` pixels tall.
 */
export function logo(c: G, x: number, y: number, s: number, glow = 0) {
  c.save();
  c.translate(x, y);
  c.scale(s / 100, s / 100);
  if (glow > 0) { c.shadowColor = C.orange; c.shadowBlur = 40 * glow; }
  // body: a ghost (rounded top, wavy hem)
  c.beginPath();
  c.moveTo(-34, 38);
  c.lineTo(-34, -6);
  c.bezierCurveTo(-34, -46, 34, -46, 34, -6);
  c.lineTo(34, 38);
  for (let i = 0; i < 4; i++) {
    const x0 = 34 - i * 17;
    c.quadraticCurveTo(x0 - 4.25, 28, x0 - 8.5, 38);
    c.quadraticCurveTo(x0 - 12.75, 48, x0 - 17, 38);
  }
  c.closePath();
  const g = c.createLinearGradient(0, -40, 0, 44);
  g.addColorStop(0, '#ffcf73'); g.addColorStop(1, '#ff7a1f');
  c.fillStyle = g;
  c.fill();
  c.shadowBlur = 0;
  // leaf
  c.beginPath();
  c.moveTo(2, -38); c.quadraticCurveTo(14, -60, 34, -52); c.quadraticCurveTo(22, -36, 2, -38);
  c.fillStyle = '#7fd36a';
  c.fill();
  // eyes
  c.fillStyle = '#2a1a10';
  c.beginPath(); c.ellipse(-12, -4, 5.5, 8, 0, 0, Math.PI * 2); c.ellipse(12, -4, 5.5, 8, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}
