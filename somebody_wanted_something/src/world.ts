import * as THREE from 'three';
import { MONO } from './text';
import type { ShapeId } from './timeline';

// One particle system draws every world in the video. Each shape (a seal, a garden, a Chladni plate,
// a punch card, a fire…) is a set of N target points. Particles keep their identity, so at a shot change
// they stream from the old shape into the new one. Everything is a pure function of time `t`.

export const N = 72000;
const DUST = 5000; // ambient motes, always present
const TAU = Math.PI * 2;
type V3 = [number, number, number];

/** Shader "styles": per-shape motion applied on the GPU, so shapes can move without re-uploading. */
export const STYLE: Record<ShapeId, number> = {
  tabs: 0, seal: 1, garden: 2, origami: 3, choir: 4, tilth: 5, liturgy: 6, chladni: 7,
  phone: 0, crt: 9, card: 0, abacus: 0, bone: 0, fire: 8, ember: 0,
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  pos = new Float32Array(N * 3);
  /** per point: birth order [0..1], weight (size/brightness), accent (colour mix; -1 = ambient dust) */
  info = new Float32Array(N * 3);
  n = 0;
  constructor(readonly rnd: () => number) {}

  add(x: number, y: number, z: number, birth = 0, weight = 1, accent = 0) {
    if (this.n >= N - DUST) return;
    this.put(x, y, z, birth, weight, accent);
  }
  private put(x: number, y: number, z: number, birth: number, weight: number, accent: number) {
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.info[i * 3] = birth; this.info[i * 3 + 1] = weight; this.info[i * 3 + 2] = accent;
  }
  gauss() { return Math.sqrt(-2 * Math.log(1 - this.rnd())) * Math.cos(TAU * this.rnd()); }

  /** Repeat random existing points (with a little jitter) until only the dust budget is left. */
  densify(jit = 0.025) {
    const base = this.n;
    while (base > 0 && this.n < N - DUST) {
      const j = Math.floor(this.rnd() * base);
      this.add(
        this.pos[j * 3] + this.gauss() * jit, this.pos[j * 3 + 1] + this.gauss() * jit, this.pos[j * 3 + 2] + this.gauss() * jit,
        this.info[j * 3], this.info[j * 3 + 1], this.info[j * 3 + 2],
      );
    }
  }
  dust() {
    while (this.n < N) {
      this.put((this.rnd() - 0.5) * 34, (this.rnd() - 0.5) * 20, this.rnd() * 20 - 14, this.rnd(), 0.2 + this.rnd() * 0.12, -1);
    }
  }
}

// ── geometry helpers
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

function seg(b: Builder, a: V3, c: V3, dens: number, birth = 0, weight = 1, accent = 0, jit = 0.008) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const n = Math.max(2, Math.round(len * dens));
  for (let i = 0; i < n; i++) {
    const p = lerp3(a, c, (i + b.rnd()) / n);
    b.add(p[0] + b.gauss() * jit, p[1] + b.gauss() * jit, p[2] + b.gauss() * jit, birth, weight, accent);
  }
}
function rectEdges(b: Builder, cx: number, cy: number, cz: number, w: number, h: number, dens: number, birth = 0, weight = 1, accent = 0) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  seg(b, [x0, y0, cz], [x1, y0, cz], dens, birth, weight, accent);
  seg(b, [x1, y0, cz], [x1, y1, cz], dens, birth, weight, accent);
  seg(b, [x1, y1, cz], [x0, y1, cz], dens, birth, weight, accent);
  seg(b, [x0, y1, cz], [x0, y0, cz], dens, birth, weight, accent);
}
/** Circle in the xy plane (default) or the xz plane. */
function circle(b: Builder, cx: number, cy: number, cz: number, r: number, dens: number, birth = 0, weight = 1, accent = 0, plane: 'xy' | 'xz' = 'xy') {
  const n = Math.max(8, Math.round(TAU * r * dens));
  for (let i = 0; i < n; i++) {
    const a = ((i + b.rnd()) / n) * TAU;
    if (plane === 'xy') b.add(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz, birth, weight, accent);
    else b.add(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r, birth, weight, accent);
  }
}
function arc(b: Builder, cx: number, cy: number, cz: number, r: number, a0: number, a1: number, dens: number, birth: number, weight: number) {
  const n = Math.max(4, Math.round(Math.abs(a1 - a0) * r * dens));
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + b.rnd())) / n;
    b.add(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz, birth, weight);
  }
}
function roundRect(b: Builder, cx: number, cy: number, cz: number, w: number, h: number, r: number, dens: number, birth = 0, weight = 1) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  seg(b, [x0 + r, y0, cz], [x1 - r, y0, cz], dens, birth, weight);
  seg(b, [x1, y0 + r, cz], [x1, y1 - r, cz], dens, birth, weight);
  seg(b, [x1 - r, y1, cz], [x0 + r, y1, cz], dens, birth, weight);
  seg(b, [x0, y1 - r, cz], [x0, y0 + r, cz], dens, birth, weight);
  arc(b, x1 - r, y0 + r, cz, r, -Math.PI / 2, 0, dens, birth, weight);
  arc(b, x1 - r, y1 - r, cz, r, 0, Math.PI / 2, dens, birth, weight);
  arc(b, x0 + r, y1 - r, cz, r, Math.PI / 2, Math.PI, dens, birth, weight);
  arc(b, x0 + r, y0 + r, cz, r, Math.PI, Math.PI * 1.5, dens, birth, weight);
}
function sphere(b: Builder, cx: number, cy: number, cz: number, r: number, n: number, birth = 0, weight = 1, accent = 0) {
  for (let i = 0; i < n; i++) {
    const z = b.rnd() * 2 - 1, a = b.rnd() * TAU, s = Math.sqrt(1 - z * z);
    b.add(cx + r * s * Math.cos(a), cy + r * s * Math.sin(a), cz + r * z, birth, weight, accent);
  }
}

interface TextPts { pts: [number, number][]; spans: { y: number; x0: number; x1: number }[]; w: number; h: number }
/** Rasterises lines of text on a canvas and returns the lit pixels as points (canvas pixel coordinates). */
function sampleText(lines: string[], font: string, lineH: number, w: number, h: number, step: number, rnd: () => number, outline = 0): TextPts {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = outline;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const top = (h - lineH * lines.length) / 2;
  const spans: TextPts['spans'] = [];
  lines.forEach((s, i) => {
    const y = top + lineH * (i + 0.5);
    if (outline > 0) ctx.strokeText(s, w / 2, y);
    else ctx.fillText(s, w / 2, y);
    const m = ctx.measureText(s).width;
    spans.push({ y, x0: w / 2 - m / 2, x1: w / 2 + m / 2 });
  });
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 128) pts.push([x + (rnd() - 0.5) * step, y + (rnd() - 0.5) * step]);
    }
  }
  return { pts, spans, w, h };
}

// ── the shapes ────────────────────────────────────────────────────────────────────────────────────

/** 2026: forty overlapping windows, notification badges and all. */
function tabs(b: Builder) {
  const r = b.rnd;
  for (let i = 0; i < 40; i++) {
    const layer = i % 4;
    const w = 2.4 + r() * 2.6, h = 1.5 + r() * 1.5;
    const cx = (r() - 0.5) * 15, cy = (r() - 0.5) * 8.5, cz = 1 - layer * 2.4 + r() * 0.4;
    const k = 1 - layer * 0.13;
    rectEdges(b, cx, cy, cz, w, h, 34, 0, k);
    seg(b, [cx - w / 2, cy + h / 2 - 0.3, cz], [cx + w / 2, cy + h / 2 - 0.3, cz], 34, 0, k * 0.8);
    for (let d = 0; d < 3; d++) {
      const hot = d === 0 && r() < 0.3;
      for (let j = 0; j < 10; j++) b.add(cx - w / 2 + 0.18 + d * 0.17 + b.gauss() * 0.02, cy + h / 2 - 0.15 + b.gauss() * 0.02, cz, 0, k, hot ? 1 : 0);
    }
    const rows = 2 + Math.floor(r() * 4);
    for (let j = 0; j < rows; j++) {
      const y = cy + h / 2 - 0.62 - j * 0.28;
      const len = (0.3 + r() * 0.6) * (w - 0.5);
      seg(b, [cx - w / 2 + 0.25, y, cz], [cx - w / 2 + 0.25 + len, y, cz], 30, 0, k * 0.55);
    }
    for (let j = 0; j < 130; j++) b.add(cx + (r() - 0.5) * w, cy + (r() - 0.5) * h, cz, 0, 0.18 * k);
    if (r() < 0.4) for (let j = 0; j < 16; j++) b.add(cx + w / 2 + b.gauss() * 0.04, cy + h / 2 + b.gauss() * 0.04, cz + 0.05, 0, 1.5, 1);
  }
}

/** Armillary rings. Every ring uses all its degrees of freedom: it spins in its own plane and tumbles about all three axes.
 *  Per ring: radius, start angles about x/y/z, turn rates about x/y/z (rad/s), spin in its own plane (rad/s).
 *  The vertex shader's RING_* tables are generated from this one, so edit it here. */
export interface Ring { R: number; p: V3; w: V3; spin: number }
export const ARMILLARY: Ring[] = [
  { R: 4.75, p: [1.5708, 0.0, 0.0], w: [0.031, -0.047, 0.023], spin: 0.0 },
  { R: 4.3, p: [0.3, 1.2, 0.5], w: [-0.043, 0.029, 0.052], spin: 0.05 },
  { R: 3.85, p: [1.1, 2.6, 1.0], w: [0.057, 0.041, -0.036], spin: -0.1 },
  { R: 3.4, p: [2.0, 0.5, 2.2], w: [-0.071, -0.053, 0.064], spin: 0.14 },
  { R: 2.95, p: [0.7, 3.4, 0.4], w: [0.089, -0.076, 0.047], spin: -0.18 },
  { R: 2.5, p: [1.7, 1.9, 2.9], w: [-0.101, 0.083, 0.094], spin: 0.22 },
  { R: 2.05, p: [2.6, 4.2, 1.3], w: [0.123, 0.109, -0.088], spin: -0.27 },
  { R: 1.6, p: [0.2, 5.1, 3.6], w: [-0.137, -0.121, 0.131], spin: 0.32 },
];
/** a ring's id rides in its accent: 0.02 + 0.04 * id (inner rings come out a little paler) */
const ringAccent = (k: number) => 0.02 + 0.04 * k;

/** 2525: a mandate, as an armillary sphere: nested rings turning about a common axis, with a sun at the centre and rays going out. */
function seal(b: Builder) {
  const r = b.rnd;
  ARMILLARY.forEach(({ R }, k) => {
    const birth = (R / 4.75) * 0.5 + r() * 0.05, acc = ringAccent(k);
    [-0.06, 0, 0.06].forEach((o) => {
      const n = Math.round(TAU * R * 62);
      for (let i = 0; i < n; i++) {
        const a = ((i + r()) / n) * TAU;
        b.add(Math.cos(a) * (R + o), Math.sin(a) * (R + o), b.gauss() * 0.012, birth, 0.8, acc);
      }
    });
    for (let q = 0; q < 72; q++) { // graduations, longer every 6th
      const a = (q / 72) * TAU, len = q % 6 === 0 ? 0.3 : 0.14;
      seg(b, [Math.cos(a) * (R + 0.08), Math.sin(a) * (R + 0.08), 0], [Math.cos(a) * (R + 0.08 + len), Math.sin(a) * (R + 0.08 + len), 0], 40, birth + 0.05, 0.9, acc, 0.006);
    }
    if (k >= 3) { // a bead riding the ring
      const a = k * 1.9;
      for (let i = 0; i < 380; i++) {
        const u = b.gauss(), v = b.gauss(), w = b.gauss(), m = Math.hypot(u, v, w) || 1;
        b.add(Math.cos(a) * R + (u / m) * 0.13, Math.sin(a) * R + (v / m) * 0.13, (w / m) * 0.13, birth + 0.1, 1.4, acc);
      }
    }
  });
  // the celestial sphere, faint, for depth; the polar axis; the sun
  sphere(b, 0, 0, 0, 4.95, 3600, 0.4, 0.16, ringAccent(2));
  seg(b, [0, -5.9, 0], [0, 5.9, 0], 60, 0.5, 0.8, 1);
  sphere(b, 0, 0, 0, 0.3, 900, 0.2, 1.0, 1);
  for (let k = 0; k < 26; k++) { // rays, out in every direction
    const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z);
    const d: V3 = [s * Math.cos(a), z, s * Math.sin(a)];
    seg(b, [d[0] * 5.4, d[1] * 5.4, d[2] * 5.4], [d[0] * (8 + r() * 2), d[1] * (8 + r() * 2), d[2] * (8 + r() * 2)], 26, 0.75 + r() * 0.2, 0.8, 1);
  }
}

/** 3535: a garden of branching trees, grown from the ground up. */
function garden(b: Builder) {
  const r = b.rnd;
  const base = -2;
  [2, 4, 6, 8].forEach((R) => circle(b, 0, base, 0, R, 22, 0, 0.35, 0, 'xz'));
  for (let i = 0; i < 6000; i++) {
    const R = 8.5 * Math.sqrt(r()), a = r() * TAU;
    b.add(Math.cos(a) * R, base + b.gauss() * 0.02, Math.sin(a) * R, 0, 0.28);
  }
  const branch = (o: V3, dir: V3, len: number, depth: number, delay: number) => {
    const e: V3 = [o[0] + dir[0] * len, o[1] + dir[1] * len, o[2] + dir[2] * len];
    const birth = delay + depth * 0.085;
    seg(b, o, e, 62 - depth * 8, birth, 1 - depth * 0.08, 0, 0.008);
    if (depth >= 4) {
      for (let j = 0; j < 26; j++) b.add(e[0] + b.gauss() * 0.34, e[1] + b.gauss() * 0.3, e[2] + b.gauss() * 0.34, birth + 0.05, 0.75, 1);
      return;
    }
    const kids = depth < 2 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const u: V3 = [r() - 0.5, r() - 0.5, r() - 0.5];
      const d: V3 = [dir[0] + u[0] * 1.4, dir[1] + u[1] * 1.4 + 0.3, dir[2] + u[2] * 1.4];
      const m = Math.hypot(d[0], d[1], d[2]);
      branch(e, [d[0] / m, d[1] / m, d[2] / m], len * 0.72, depth + 1, delay);
    }
  };
  const trees = 10;
  for (let t = 0; t < trees; t++) {
    const a = (t / trees) * TAU + r() * 0.5, R = 1.0 + r() * 5.6;
    branch([Math.cos(a) * R, base, Math.sin(a) * R], [(r() - 0.5) * 0.15, 1, (r() - 0.5) * 0.15], 1.7 + r() * 1.3, 0, r() * 0.3);
  }
}

// ── 4545: origami. A Miura-ori: a sheet of identical parallelogram facets whose folding is exactly rigid (every facet stays flat,
// only the creases hinge), the pattern used to fold solar panels. Each particle lives on one facet, addressed by its grid cell
// (i, j) and position (u, v) inside it; the vertex shader places the four corners for the current fold angle `theta`.
export const MIURA = { I: 12, J: 8, a: 1.0, b: 1.1, alpha: Math.PI / 3 };
/** Folded dimensions of the unit cell for fold angle theta (0 = flat, towards pi/2 = fully collapsed): [S, V, L, H]. */
export function miuraDims(theta: number): [number, number, number, number] {
  const { a, b, alpha } = MIURA;
  const ct = Math.cos(theta), st = Math.sin(theta), ta = Math.tan(alpha), sa = Math.sin(alpha);
  const k = Math.sqrt(1 + ct * ct * ta * ta);
  return [(b * ct * ta) / k, b / k, a * Math.sqrt(1 - st * st * sa * sa), a * st * sa];
}

function origami(b: Builder) {
  const r = b.rnd;
  const { I, J, a, b: bl } = MIURA;
  const EDGE = 0.9999;
  // the faint sheet itself
  for (let n = 0; n < 34000; n++) b.add(Math.floor(r() * I) + r() * EDGE, Math.floor(r() * J) + r() * EDGE, 0, r(), 0.4);
  // interior creases, which only light up once they start to fold: columns alternate between two tints (mountain / valley), rows share one
  for (let i = 1; i < I; i++) for (let j = 0; j < J; j++) {
    const n = Math.round(a * 85);
    for (let k = 0; k < n; k++) b.add(i, j + ((k + r()) / n) * EDGE, 0, r(), 1.25, i % 2 === 0 ? 0.95 : 0.5);
  }
  for (let j = 1; j < J; j++) for (let i = 0; i < I; i++) {
    const n = Math.round(bl * 85);
    for (let k = 0; k < n; k++) b.add(i + ((k + r()) / n) * EDGE, j, 0, r(), 1.15, 0.7);
  }
  // the border of the sheet is always visible
  for (let j = 0; j < J; j++) for (let k = 0; k < 75; k++) {
    b.add(0, j + ((k + r()) / 75) * EDGE, 0, 0, 1.1);
    b.add(I - 1 + EDGE, j + ((k + r()) / 75) * EDGE, 0, 0, 1.1);
  }
  for (let i = 0; i < I; i++) for (let k = 0; k < 85; k++) {
    b.add(i + ((k + r()) / 85) * EDGE, 0, 0, 0, 1.1);
    b.add(i + ((k + r()) / 85) * EDGE, J - 1 + EDGE, 0, 0, 1.1);
  }
  b.densify(0); // repeated points, no jitter: positions encode facet indices
}

/** 5555: twelve voices on a ring, columns that argue and then agree. */
function choir(b: Builder) {
  const base = -2, cols = 12, R = 4.6;
  for (let i = 0; i < cols; i++) {
    const a = (i / cols) * TAU, x = Math.cos(a) * R, z = Math.sin(a) * R, h = 3.6;
    const birth = 0.1 + (i / cols) * 0.3;
    seg(b, [x, base, z], [x, base + h, z], 90, birth, 1);
    for (let j = 0; j < 90; j++) {
      const t = (j / 90) * TAU;
      b.add(x + Math.cos(t) * 0.32, base + h, z + Math.sin(t) * 0.32, birth + 0.1, 0.9, 1);
      b.add(x + Math.cos(t) * 0.32, base, z + Math.sin(t) * 0.32, birth, 0.6);
    }
  }
  for (let R2 = 1; R2 <= 6.5; R2 += 0.5) circle(b, 0, base, 0, R2, 36, 0.55, 0.45, 0, 'xz');
  seg(b, [0, base, 0], [0, base + 6, 0], 90, 0.9, 1.1, 1);
}

const hgt = (x: number, z: number) => 1.5 * Math.sin(x * 0.32 + 1) * Math.cos(z * 0.27) + 0.8 * Math.sin(x * 0.7 + z * 0.45) + 0.4 * Math.sin(z * 0.9) - 2.5;
/** 6565: tilled terrain under a low sun. */
function tilth(b: Builder) {
  const r = b.rnd;
  for (let zz = -20; zz <= 14; zz += 0.6) {
    for (let i = 0; i < 36 * 20; i++) {
      const x = -18 + (i / (36 * 20)) * 36 + r() * 0.04;
      b.add(x, hgt(x, zz), zz, Math.min(1, Math.abs(zz) / 20 * 0.6 + Math.abs(x) / 18 * 0.3), 0.85);
    }
  }
  for (let i = 0; i < 6500; i++) {
    const R = 2.3 * Math.sqrt(r()), a = r() * TAU;
    b.add(7 + Math.cos(a) * R, 2.5 + Math.sin(a) * R, -22, 0.9, 1.2, 1);
  }
  circle(b, 7, 2.5, -22, 3.0, 36, 0.95, 0.8, 1);
}

/** 7510: a candlelit nave leading to a rose window; clauses float in the aisle and get struck out (animated on the GPU). */
function liturgy(b: Builder) {
  const r = b.rnd;
  const floor = -2.2, a = 2.4, top = 1.0, R = 2.6, cx = R - a;
  const apex = top + Math.sqrt(R * R - cx * cx);
  const zs = [6, 3, 0, -3, -6];
  const zEnd = zs[zs.length - 1];
  zs.forEach((z, i) => {
    const birth = 0.05 + (i / zs.length) * 0.55;
    const k = 0.4 + 0.14 * i; // the far end glows brightest
    for (const sx of [-1, 1]) {
      seg(b, [sx * a, floor, z], [sx * a, top, z], 80, birth, k);
      seg(b, [sx * a - 0.2, top, z], [sx * a + 0.2, top, z], 70, birth, k * 0.9);
      seg(b, [sx * a - 0.22, floor, z], [sx * a + 0.22, floor, z], 70, birth, k * 0.7);
    }
    arc(b, cx, top, z, R, Math.acos(-cx / R), Math.PI, 70, birth + 0.05, k);
    arc(b, -cx, top, z, R, 0, Math.acos(cx / R), 70, birth + 0.05, k);
    if (i < zs.length - 1) {
      seg(b, [0, apex, z], [0, apex, zs[i + 1]], 50, birth + 0.1, k * 0.6);
      for (const sx of [-1, 1]) seg(b, [sx * a, top, z], [sx * a, top, zs[i + 1]], 50, birth + 0.1, k * 0.7);
      seg(b, [-a, floor, z - 1.5], [a, floor, z - 1.5], 40, birth + 0.1, 0.3);
    }
  });
  for (const sx of [-1, 1]) {
    seg(b, [sx * a, floor, zs[0]], [sx * a, floor, zEnd], 60, 0.5, 0.45);
    seg(b, [sx * 0.7, floor, zs[0]], [sx * 0.7, floor, zEnd], 50, 0.5, 0.35);
  }
  // candles down both sides of the aisle
  for (const sx of [-1, 1]) for (let z = 7; z >= -6.5; z -= 1.3) {
    const x = sx * 1.55 + (r() - 0.5) * 0.15;
    seg(b, [x, floor, z], [x, floor + 0.3, z], 60, 0.7, 0.8);
    for (let j = 0; j < 14; j++) b.add(x + b.gauss() * 0.025, floor + 0.38 + Math.abs(b.gauss()) * 0.07, z + b.gauss() * 0.025, 0.7, 1.7, 0.75);
    for (let j = 0; j < 45; j++) b.add(x + b.gauss() * 0.3, floor + 0.4 + b.gauss() * 0.25, z + b.gauss() * 0.3, 0.7, 0.3, 0.75);
  }
  // rose window at the far end
  const wz = -8.4, wy = 2.5, wr = 3.3;
  [wr, wr - 0.22, 1.3, 0.55].forEach((rad, i) => circle(b, 0, wy, wz, rad, 70, 0.25 + i * 0.05, 1.5));
  for (let k = 0; k < 12; k++) {
    const an = (k / 12) * TAU;
    seg(b, [Math.cos(an) * 0.55, wy + Math.sin(an) * 0.55, wz], [Math.cos(an) * (wr - 0.22), wy + Math.sin(an) * (wr - 0.22), wz], 55, 0.3, 1.2);
    circle(b, Math.cos(an + 0.26) * 2.25, wy + Math.sin(an + 0.26) * 2.25, wz, 0.42, 60, 0.35, 1.3, 0.75);
  }
  for (let i = 0; i < 6000; i++) { const rr = wr * Math.sqrt(r()), an = r() * TAU; b.add(Math.cos(an) * rr, wy + Math.sin(an) * rr, wz, 0.3, 0.3, 0.75); }
  // the clauses, floating in the aisle (accent 1 / 0.5 mark the two struck lines, shown by uStrike)
  const lines = ['THE SYSTEM SHALL LISTEN.', 'THE SYSTEM SHALL NOT PRETEND.', 'THE USER MAY AMEND ANY CLAUSE.', 'NO CLAUSE OUTLIVES ITS WANT.'];
  const W = 1500, H = 460, lineH = 110;
  const t = sampleText(lines, `400 62px ${MONO}`, lineH, W, H, 3, r);
  const sc = 7.4 / W, tz = -1.5, ty = -1.15;
  const at = (x: number, y: number): V3 => [(x - W / 2) * sc, ty - (y - H / 2) * sc, tz];
  for (const [x, y] of t.pts) { const q = at(x, y); b.add(q[0], q[1], q[2], 0.4 + r() * 0.2, 0.55); }
  const strike = (line: number, acc: number) => {
    const sp = t.spans[line];
    for (let i = 0; i < 520; i++) { const q = at(sp.x0 - 6 + (sp.x1 - sp.x0 + 12) * r(), sp.y + 2 + b.gauss() * 1.0); b.add(q[0], q[1], q[2] + 0.02, 0, 0.9, acc); }
  };
  strike(1, 1);
  strike(3, 0.5);
  b.densify(0.012);
}

/** 9595: a vibrating plate; the particles settle on its nodal lines (solved on the GPU). */
function chladni(b: Builder) {
  const r = b.rnd;
  for (let i = 0; i < 56000; i++) b.add((r() - 0.5) * 9, (r() - 0.5) * 9, 0, r(), 0.95);
  rectEdges(b, 0, 0, 0, 9.5, 9.5, 60, 0, 0.7, 0.25);
}

// ── the other wing
function phone(b: Builder) {
  const r = b.rnd;
  roundRect(b, 0, 0, 0, 3.3, 6.6, 0.38, 60);
  roundRect(b, 0, 0, 0.02, 2.95, 5.8, 0.18, 50, 0, 0.8);
  seg(b, [-0.45, 2.78, 0], [0.45, 2.78, 0], 60, 0, 1.1);
  seg(b, [-0.55, -2.65, 0], [0.55, -2.65, 0], 60, 0, 1);
  for (let cx = 0; cx < 4; cx++) for (let cy = 0; cy < 5; cy++) {
    roundRect(b, -1.12 + cx * 0.75, 1.8 - cy * 0.85, 0.03, 0.5, 0.5, 0.12, 26, 0, 0.9);
    if (r() < 0.3) for (let j = 0; j < 8; j++) b.add(-0.88 + cx * 0.75 + b.gauss() * 0.02, 2.05 - cy * 0.85 + b.gauss() * 0.02, 0.05, 0, 1.4, 1);
  }
  for (let i = 0; i < 6000; i++) b.add((r() - 0.5) * 2.95, (r() - 0.5) * 5.8, 0, 0, 0.16);
  seg(b, [0.2, 2.8, 0.05], [1.4, 0.4, 0.05], 30, 0, 0.5);
  seg(b, [0.5, 2.8, 0.05], [1.45, 0.9, 0.05], 30, 0, 0.5);
}

function crt(b: Builder) {
  const r = b.rnd;
  // casing: front and back rectangles joined at the corners
  const F = 0.8, Bk = -1.6;
  const fw = 6.4, fh = 5.0, bw = 5.0, bh = 3.8;
  rectEdges(b, 0, 0.4, F, fw, fh, 40);
  rectEdges(b, 0, 0.4, Bk, bw, bh, 36, 0, 0.8);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) seg(b, [sx * fw / 2, 0.4 + sy * fh / 2, F], [sx * bw / 2, 0.4 + sy * bh / 2, Bk], 36, 0, 0.8);
  rectEdges(b, 0, 0.5, F + 0.02, 5.2, 3.9, 46, 0, 1);
  for (let y = -1.4; y <= 2.4; y += 0.13) seg(b, [-2.55, 0.5 + y - 0.5, F + 0.02], [2.55, 0.5 + y - 0.5, F + 0.02], 16, 0, 0.3);
  const t = sampleText(['C:\\> RUN SOFTWARE', 'C:\\> '], `400 78px ${MONO}`, 110, 1200, 260, 3, r);
  const s = 3.7 / 1200;
  for (const [x, y] of t.pts) b.add((x - 600) * s - 0.1, -(y - 130) * s + 1.15, F + 0.03, 0, 1.1, 0.6);
  // the blinking cursor sits right after the second prompt
  const sp = t.spans[1];
  const curX = (sp.x1 - 600) * s - 0.1, curY = -(sp.y - 130) * s + 1.15;
  for (let i = 0; i < 1800; i++) b.add(curX + 0.05 + r() * 0.26, curY + (r() - 0.5) * 0.44, F + 0.03, 0, 1.3, 1);
  for (let i = 0; i < 6000; i++) b.add((r() - 0.5) * 5.2, 0.5 + (r() - 0.5) * 3.9, F + 0.02, 0, 0.14, 0.4);
  seg(b, [-1.4, -2.15, F], [-1.9, -2.7, F + 0.4], 30);
  seg(b, [1.4, -2.15, F], [1.9, -2.7, F + 0.4], 30);
  rectEdges(b, 0, -3.5, F + 1.0, 6.6, 0.7, 36, 0, 0.9);
  for (let row = 0; row < 3; row++) for (let k = 0; k < 15; k++) rectEdges(b, -3.0 + k * 0.43, -3.35 - row * 0.16 + 0.12, F + 1.0, 0.3, 0.1, 22, 0, 0.55);
}

function card(b: Builder) {
  const r = b.rnd;
  const W = 8.4, H = 3.7, cut = 0.9;
  const p: V3[] = [[-W / 2 + cut, H / 2, 0], [W / 2, H / 2, 0], [W / 2, -H / 2, 0], [-W / 2, -H / 2, 0], [-W / 2, H / 2 - cut, 0]];
  for (let i = 0; i < p.length; i++) seg(b, p[i], p[(i + 1) % p.length], 60);
  for (let i = 0; i < 9000; i++) b.add((r() - 0.5) * W, (r() - 0.5) * H, 0, 0, 0.12);
  const cols = 40, rows = 9, pitch = 0.19;
  for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rows; ry++) {
    if (r() > 0.4) continue;
    rectEdges(b, -3.9 + cx * pitch, -1.45 + ry * (pitch * 1.3), 0.02, 0.11, 0.16, 100, 0, 0.9, 0.6);
  }
  const t = sampleText(['SOMEBODY WANTED SOMETHING'], `400 56px ${MONO}`, 80, 1400, 120, 2, r);
  const s = 6.4 / 1400;
  for (const [x, y] of t.pts) b.add((x - 700) * s, -(y - 60) * s + 1.5, 0.02, 0, 0.8);
}

function abacus(b: Builder) {
  const r = b.rnd;
  rectEdges(b, 0, 0, 0, 8.6, 5.6, 50);
  rectEdges(b, 0, 0, 0, 8.2, 5.2, 40, 0, 0.7);
  seg(b, [1.5, -2.6, 0], [1.5, 2.6, 0], 40, 0, 0.9);
  for (let k = 0; k < 7; k++) {
    const y = -2.1 + k * 0.7;
    seg(b, [-4.1, y, 0], [4.1, y, 0], 40, 0, 0.55);
    const left = 3 + Math.floor(r() * 5);
    for (let j = 0; j < 11; j++) {
      const x = j < left ? -3.7 + j * 0.56 : 3.7 - (10 - j) * 0.56;
      sphere(b, x, y, 0, 0.27, 120, 0, 0.9, j % 5 === 0 ? 0.6 : 0);
    }
  }
}

/** An archaeological bone shaft (think Lebombo / Ishango): curved, tapering, rough, broken at both ends, with groups of tally cuts and one lone notch that glows. */
function bone(b: Builder) {
  const r = b.rnd;
  const L = 9.4, X0 = -L / 2;
  const cy = (u: number) => 0.5 * Math.cos((u - 0.5) * Math.PI) - 0.25; // gently curved
  const rad = (u: number) => 0.82 * (0.62 + 0.38 * Math.sqrt(Math.sin(Math.PI * Math.min(1, Math.max(0.0, 0.04 + u * 0.92))))) * (1 + 0.06 * Math.sin(u * 17) + 0.04 * Math.sin(u * 41 + 2));
  const at = (u: number, ph: number, k = 1): V3 => [X0 + u * L, cy(u) + rad(u) * k * Math.cos(ph), rad(u) * 0.8 * k * Math.sin(ph)];
  // jagged broken ends: the shaft is cut back by a different amount around its circumference
  const jag = (ph: number, side: number) => 0.018 + 0.03 * Math.abs(Math.sin(ph * 2.5 + side * 1.7)) + 0.015 * Math.abs(Math.sin(ph * 6.3 + side));
  // tally cuts: groups of ticks along the front face, and the lone notch
  const groups: [number, number][] = [[0.07, 4], [0.25, 3], [0.4, 6], [0.62, 5]];
  const ticks: number[] = [];
  for (const [u0, n] of groups) for (let i = 0; i < n; i++) ticks.push(u0 + i * 0.03);
  const lone = 0.83;
  const cut = (u: number, ph: number) => (ph > 0.15 && ph < Math.PI - 0.15) && [...ticks, lone].some((tu) => Math.abs(u - tu) < 0.0065);
  // the compact bone of the shaft
  for (let i = 0; i < 30000; i++) {
    const u = r(), ph = r() * TAU;
    if (u < jag(ph, 0) || u > 1 - jag(ph, 1) || cut(u, ph)) continue;
    const p = at(u, ph, 0.97 + 0.03 * r());
    b.add(p[0], p[1], p[2], 0, 0.6);
  }
  // grain: long thin streaks along the bone
  for (let k = 0; k < 46; k++) {
    const ph = r() * TAU, w = r() * 0.05, u0 = 0.03 + r() * 0.3, u1 = u0 + 0.25 + r() * 0.6;
    for (let i = 0; i < 160; i++) {
      const u = u0 + ((Math.min(u1, 0.97) - u0) * i) / 160;
      if (cut(u, ph)) continue;
      const p = at(u, ph + Math.sin(u * 23 + k) * w);
      b.add(p[0], p[1], p[2], 0.05, 0.85);
    }
  }
  // the broken ends: a ring of compact bone around a hollow marrow cavity, with a little spongy bone inside
  for (const [u, side] of [[0.0, 0], [1.0, 1]] as [number, number][]) {
    for (let i = 0; i < 1800; i++) {
      const ph = r() * TAU, k = 0.6 + 0.4 * r();
      const uu = side === 0 ? jag(ph, 0) : 1 - jag(ph, 1);
      const p = at(Math.min(Math.max(uu, 0), 1), ph, k);
      b.add(p[0] + (u === 0 ? 1 : -1) * 0.02, p[1], p[2], 0.02, 0.9);
    }
    for (let i = 0; i < 500; i++) {
      const ph = r() * TAU, k = 0.1 + 0.4 * r(), uu = side === 0 ? 0.012 : 0.988;
      const p = at(uu, ph, k);
      b.add(p[0], p[1], p[2], 0.02, 0.3);
    }
  }
  // the tally cuts: a bright line across the face inside each gap (accent .6), the lone notch deeper and brighter
  const slash = (u: number, acc: number, w: number, span: number) => {
    for (let i = 0; i < 70; i++) {
      const ph = Math.PI / 2 - span + (2 * span * i) / 70;
      const p = at(u, ph, 0.93);
      b.add(p[0] + b.gauss() * 0.004, p[1], p[2], 0, w, acc);
    }
  };
  for (const tu of ticks) slash(tu, 0.6, 1.1, 0.95);
  slash(lone, 1, 1.9, 1.15);
  b.densify(0.01);
}

/** A campfire: stones, glowing logs and a pool of light are static; flame tongues and sparks are seeds that the shader animates. */
function fire(b: Builder) {
  const r = b.rnd, base = -1.8;
  // five logs leaning in like a teepee
  for (let k = 0; k < 5; k++) {
    const an = (k / 5) * TAU + 0.3;
    const p0: V3 = [Math.cos(an) * 1.7, base + 0.12, Math.sin(an) * 1.7], p1: V3 = [Math.cos(an) * 0.12, base + 1.0, Math.sin(an) * 0.12];
    const d: V3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const m = Math.hypot(d[0], d[1], d[2]);
    const dn: V3 = [d[0] / m, d[1] / m, d[2] / m];
    let n1: V3 = [dn[2], 0, -dn[0]];
    const m1 = Math.hypot(n1[0], n1[1], n1[2]);
    n1 = [n1[0] / m1, 0, n1[2] / m1];
    const n2: V3 = [dn[1] * n1[2] - dn[2] * n1[1], dn[2] * n1[0] - dn[0] * n1[2], dn[0] * n1[1] - dn[1] * n1[0]];
    for (let i = 0; i < 2600; i++) {
      const u = r(), ph = r() * TAU, rad = 0.2 * (1 - 0.3 * u);
      b.add(p0[0] + d[0] * u + rad * (Math.cos(ph) * n1[0] + Math.sin(ph) * n2[0]), p0[1] + d[1] * u + rad * (Math.cos(ph) * n1[1] + Math.sin(ph) * n2[1]),
        p0[2] + d[2] * u + rad * (Math.cos(ph) * n1[2] + Math.sin(ph) * n2[2]), 0, 0.8, 0.8);
    }
  }
  for (let i = 0; i < 1500; i++) b.add(b.gauss() * 0.7, base + 0.05 + Math.abs(b.gauss()) * 0.08, b.gauss() * 0.7, 0, 1, 0.8);
  // a ring of stones and the pool of light on the ground
  for (let k = 0; k < 13; k++) {
    const an = (k / 13) * TAU + 0.2, rr = 2.5 + r() * 0.2;
    sphere(b, Math.cos(an) * rr, base + 0.15, Math.sin(an) * rr, 0.26 + r() * 0.1, 260, 0, 0.45);
  }
  for (let R2 = 1; R2 <= 6; R2 += 0.7) circle(b, 0, base, 0, R2, 16, 0, 0.2, 0, 'xz');
  // everything else is flame: seeds in [0,1)^3
  while (b.n < N - DUST) b.add(b.rnd(), b.rnd(), b.rnd(), 0, 0.3 + b.rnd() * 0.45, 0.9);
}

function ember(b: Builder) {
  for (let i = 0; i < N - DUST; i++) {
    const wide = b.rnd() < 0.12;
    const s = wide ? 0.55 : 0.05;
    b.add(b.gauss() * s, 0.2 + b.gauss() * s, b.gauss() * s, 0, wide ? 0.3 : 0.28, 1);
  }
}

const GENERATORS: Record<ShapeId, (b: Builder) => void> = {
  tabs, seal, garden, origami, choir, tilth, liturgy, chladni, phone, crt, card, abacus, bone, fire, ember,
};

// ── the particle system ───────────────────────────────────────────────────────────────────────────

const v3 = (v: V3) => `vec3(${v.map((x) => x.toFixed(4)).join(', ')})`;
const RING_TABLE = [
  `const vec3 RING_P[8] = vec3[8](${ARMILLARY.map((r) => v3(r.p)).join(', ')});`,
  `const vec3 RING_W[8] = vec3[8](${ARMILLARY.map((r) => v3(r.w)).join(', ')});`,
  `const float RING_S[8] = float[8](${ARMILLARY.map((r) => r.spin.toFixed(4)).join(', ')});`,
].join('\n  ');

const VERT = /* glsl */ `
  attribute vec3 aPosA; attribute vec3 aInfoA;
  attribute vec3 aPosB; attribute vec3 aInfoB;
  attribute vec4 aRand;
  uniform float uTime, uProg, uSpread, uGrow, uStyleA, uStyleB, uPx, uFog, uSwirl;
  uniform float uAgree, uBlink, uFire, uVib, uPulse;
  uniform vec4 uMiura; uniform vec3 uMC; uniform float uFoldT;
  uniform vec2 uMode, uStrike;
  uniform vec3 uColA, uColB, uAccA, uAccB;
  varying vec3 vCol; varying float vAlpha;

  ${RING_TABLE}

  bool is(float s, float k) { return abs(s - k) < 0.5; }
  float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
  vec3 mvert(float i, float j) { return vec3(i * uMiura.x, j * uMiura.z + mod(i, 2.0) * uMiura.y, mod(j, 2.0) * uMiura.w); }
  vec3 fireGrad(float h) {
    return mix(mix(vec3(0.55, 0.07, 0.02), vec3(1.0, 0.4, 0.08), smoothstep(0.0, 0.5, h)), vec3(1.0, 0.85, 0.4), smoothstep(0.5, 1.0, h));
  }

  vec3 dyn(float style, vec3 p, vec3 info, vec4 rnd, out float vis, out float heat) {
    vis = 1.0; heat = 0.0;
    if (info.z < -0.5) { // ambient dust drifts
      return p + 0.4 * vec3(sin(uTime * 0.13 + rnd.x * 40.0), cos(uTime * 0.11 + rnd.y * 40.0), sin(uTime * 0.09 + rnd.z * 40.0));
    }
    if (is(style, 1.0)) { // seal: an armillary sphere, rings turning about the polar axis
      if (info.z < 0.5) {
        int k = int(floor(info.z / 0.04));
        float az = RING_S[k] * uTime;
        p.xy = mat2(cos(az), sin(az), -sin(az), cos(az)) * p.xy;
        vec3 ang = RING_P[k] + RING_W[k] * uTime;
        float cx = cos(ang.x), sx = sin(ang.x), cy = cos(ang.y), sy = sin(ang.y), cz = cos(ang.z), sz = sin(ang.z);
        p.yz = vec2(p.y * cx - p.z * sx, p.y * sx + p.z * cx);
        p.xz = vec2(p.x * cy + p.z * sy, -p.x * sy + p.z * cy);
        p.xy = vec2(p.x * cz - p.y * sz, p.x * sz + p.y * cz);
      } else {
        float ay = 0.03 * uTime, cy = cos(ay), sy = sin(ay);
        p.xz = vec2(p.x * cy + p.z * sy, -p.x * sy + p.z * cy);
      }
      float tc = cos(0.4), ts = sin(0.4); // the axis leans, like the real thing
      p.xy = vec2(p.x * tc - p.y * ts, p.x * ts + p.y * tc);
    } else if (is(style, 2.0)) { // garden: sway
      float s = max(p.y + 2.0, 0.0);
      p.x += sin(uTime * 0.7 + p.y * 1.1 + p.z * 0.5) * 0.045 * s;
      p.z += cos(uTime * 0.6 + p.y * 0.9 + p.x * 0.4) * 0.03 * s;
    } else if (is(style, 3.0)) { // origami: a Miura-ori, folded rigidly
      float fi = floor(p.x), fj = floor(p.y);
      vec2 uv = vec2(p.x - fi, p.y - fj);
      vec3 A = mvert(fi, fj), B = mvert(fi + 1.0, fj), C = mvert(fi + 1.0, fj + 1.0), D = mvert(fi, fj + 1.0);
      p = mix(mix(A, B, uv.x), mix(D, C, uv.x), uv.y) - uMC;
      if (info.z > 0.45) vis = smoothstep(0.02, 0.25, uFoldT); // creases appear as they fold
    } else if (is(style, 4.0)) { // choir
      float rr = length(p.xz);
      if (rr > 4.0 && rr < 5.3 && p.y > -1.98) {
        float idx = mod(floor(atan(p.z, p.x) / 6.2831853 * 12.0 + 0.5), 12.0);
        float ph = mix(idx * 1.9, 0.0, uAgree);
        float h = 0.5 + 0.5 * (0.5 + 0.5 * sin(uTime * 2.2 + ph));
        h *= 1.0 + 0.12 * uPulse * uAgree;
        p.y = -2.0 + (p.y + 2.0) * h;
      } else if (abs(p.y + 2.0) < 0.03) {
        p.y += 0.14 * sin(rr * 2.6 - uTime * 2.4) * (0.3 + 0.7 * uAgree);
      }
    } else if (is(style, 5.0)) { // tilth: the land slowly reshapes
      if (info.z < 0.5) p.y += 0.45 * sin(p.x * 0.5 + uTime * 0.35) * sin(p.z * 0.4 - uTime * 0.25);
    } else if (is(style, 6.0)) { // liturgy: strike-throughs
      if (info.z > 0.99) vis = uStrike.x;
      else if (info.z > 0.4 && info.z < 0.6) vis = uStrike.y;
      else if (info.z > 0.7 && info.z < 0.8) { // candle flames flicker
        vis = 0.7 + 0.3 * sin(uTime * 9.0 + rnd.x * 50.0) * sin(uTime * 5.3 + rnd.y * 30.0);
        p.y += 0.035 * sin(uTime * 7.0 + rnd.y * 30.0);
      }
    } else if (is(style, 7.0)) { // chladni: settle on the nodal lines
      if (info.z < 0.1) {
        vec2 q = p.xy / 4.5;
        float n = uMode.x, m = uMode.y, pn = 3.14159265 * n, pm = 3.14159265 * m;
        for (int i = 0; i < 9; i++) {
          float f = cos(pn * q.x) * cos(pm * q.y) - cos(pm * q.x) * cos(pn * q.y);
          vec2 g = vec2(-pn * sin(pn * q.x) * cos(pm * q.y) + pm * sin(pm * q.x) * cos(pn * q.y),
                        -pm * cos(pn * q.x) * sin(pm * q.y) + pn * cos(pm * q.x) * sin(pn * q.y));
          q -= 0.9 * f * g / (dot(g, g) + 0.05);
          q = clamp(q, -1.0, 1.0);
        }
        vec2 j = vec2(hash(rnd.x * 91.0 + floor(uTime * 24.0)), hash(rnd.y * 57.0 + floor(uTime * 24.0))) - 0.5;
        q += j * (0.006 + uVib * 0.05);
        p.xy = q * 4.5;
        p.z = (hash(rnd.z * 13.0) - 0.5) * 0.08 + uVib * (hash(rnd.w * 17.0 + floor(uTime * 24.0)) - 0.5) * 0.5;
      }
    } else if (is(style, 9.0)) { // crt: blinking cursor
      if (info.z > 0.99) vis = uBlink;
    } else if (is(style, 8.0)) { // fire
      if (info.z > 0.85 && info.z < 0.95) { // flame tongues and sparks, from seeds
        vec3 s = p;
        float tg = floor(s.y * 6.0), tj = fract(s.y * 6.0), tph = tg * 2.399;
        float th = (0.62 + 0.5 * hash(tg + 3.0)) * (0.88 + 0.12 * sin(uTime * (1.4 + 0.35 * tg) + tph));
        float life = fract(s.x + uTime * (0.26 + 0.16 * s.z));
        float ba = tg / 6.0 * 6.2831853 + 0.4;
        vec2 base = 0.6 * vec2(cos(ba), sin(ba)) * (1.0 - 0.7 * life);
        if (fract(s.z * 31.7) > 0.95) { // sparks drift up and away
          float sl = fract(s.x * 3.0 + uTime * 0.18);
          vis = 0.7 * (1.0 - sl);
          heat = 0.6 - 0.3 * sl;
          return vec3(base.x + 0.9 * sin(uTime * 0.9 + s.y * 40.0) * sl, -1.5 + sl * 8.0 * uFire, base.y + 0.9 * cos(uTime * 0.7 + s.y * 30.0) * sl);
        }
        float rr = 0.3 * pow(1.0 - life, 0.85) * sqrt(tj);
        float aa = fract(s.z * 7.0) * 6.2831853;
        vec2 sway = 0.28 * life * vec2(sin(uTime * 2.1 + tph + life * 5.0), cos(uTime * 1.7 + tph * 1.3 + life * 4.0));
        vis = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.78, 1.0, life));
        heat = 1.0 - life * 0.92;
        return vec3(base.x + rr * cos(aa) + sway.x, -1.6 + life * 4.4 * th * uFire, base.y + rr * sin(aa) + sway.y);
      }
      if (info.z > 0.75) { vis = 0.75 + 0.25 * sin(uTime * 4.0 + rnd.x * 60.0); heat = 0.3; } // logs and coals
    }
    return p;
  }

  void main() {
    float d = uSpread * mix(aRand.x, aInfoB.x, uGrow);
    float k = clamp(uProg * (1.0 + uSpread) - d, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - k, 2.4);
    float visA, visB, heatA, heatB;
    vec3 pa = dyn(uStyleA, aPosA, aInfoA, aRand, visA, heatA);
    vec3 pb = dyn(uStyleB, aPosB, aInfoB, aRand, visB, heatB);
    vec3 p = mix(pa, pb, e) + (aRand.yzw - 0.5) * uSwirl * sin(3.14159265 * e);

    float w = mix(max(aInfoA.y, 0.0) * visA, max(aInfoB.y, 0.0) * visB, e);
    float acc = mix(clamp(aInfoA.z, 0.0, 1.0), clamp(aInfoB.z, 0.0, 1.0), e);
    vec3 col = mix(mix(uColA, uAccA, clamp(aInfoA.z, 0.0, 1.0)), mix(uColB, uAccB, clamp(aInfoB.z, 0.0, 1.0)), e);
    float heat = mix(heatA, heatB, e);
    col = mix(col, fireGrad(heat), clamp(heat * 6.0, 0.0, 1.0));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.85 + 0.15 * sin(uTime * 2.5 + aRand.x * 60.0);
    float dist = max(-mv.z, 0.1);
    gl_PointSize = clamp(uPx * 2.7 * (0.75 + 0.5 * fract(aRand.x * 37.0)) * (0.55 + 0.45 * sqrt(w)) * (14.0 / dist) * (1.0 + 0.5 * uPulse), 1.0, 9.0 * uPx);
    vAlpha = w * tw * exp(-max(dist - 11.0, 0.0) * uFog) * (1.0 + 0.5 * acc);
    vCol = col;
  }
`;

const FRAG = /* glsl */ `
  uniform float uIntensity;
  varying vec3 vCol; varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float a = 1.0 - r * r;
    gl_FragColor = vec4(vCol * vAlpha * a * uIntensity, 1.0);
  }
`;

export type Uniforms = Record<string, THREE.IUniform>;

export class World {
  readonly points: THREE.Points;
  readonly u: Uniforms;
  private attrs = new Map<ShapeId, { pos: THREE.BufferAttribute; info: THREE.BufferAttribute }>();
  private geo = new THREE.BufferGeometry();

  constructor(px: number) {
    const rnd = mulberry32(7);
    const rand = new Float32Array(N * 4);
    for (let i = 0; i < rand.length; i++) rand[i] = rnd();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    (Object.keys(GENERATORS) as ShapeId[]).forEach((id, i) => {
      const b = new Builder(mulberry32(1000 + i * 77));
      GENERATORS[id](b);
      b.densify();
      b.dust();
      this.attrs.set(id, { pos: new THREE.BufferAttribute(b.pos, 3), info: new THREE.BufferAttribute(b.info, 3) });
    });
    const c = () => ({ value: new THREE.Color() });
    this.u = {
      uTime: { value: 0 }, uProg: { value: 1 }, uSpread: { value: 0.55 }, uGrow: { value: 0 }, uStyleA: { value: 0 }, uStyleB: { value: 0 },
      uPx: { value: px }, uFog: { value: 0.03 }, uSwirl: { value: 1.6 }, uMiura: { value: new THREE.Vector4() }, uMC: { value: new THREE.Vector3() }, uFoldT: { value: 0 }, uAgree: { value: 0 }, uBlink: { value: 1 },
      uFire: { value: 1 }, uVib: { value: 0 }, uPulse: { value: 0 }, uMode: { value: new THREE.Vector2(2, 3) }, uStrike: { value: new THREE.Vector2() },
      uColA: c(), uColB: c(), uAccA: c(), uAccB: c(), uIntensity: { value: 0.6 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.bind('tabs', 'tabs');
  }

  /** Points the shader at the (from, to) shapes. */
  bind(a: ShapeId, b: ShapeId) {
    const A = this.attrs.get(a)!, B = this.attrs.get(b)!;
    this.geo.setAttribute('aPosA', A.pos); this.geo.setAttribute('aInfoA', A.info);
    this.geo.setAttribute('aPosB', B.pos); this.geo.setAttribute('aInfoB', B.info);
    this.u.uStyleA.value = STYLE[a];
    this.u.uStyleB.value = STYLE[b];
  }
}
