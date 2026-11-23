import * as THREE from 'three';

export const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
export const SERIF = '"EB Garamond", Georgia, serif';

export async function loadFonts() {
  await Promise.all([
    document.fonts.load(`400 32px ${MONO}`),
    document.fonts.load(`700 32px ${MONO}`),
    document.fonts.load(`400 32px ${SERIF}`),
    document.fonts.load(`italic 400 32px ${SERIF}`),
    document.fonts.load(`500 32px ${SERIF}`),
  ]);
}

/** Canvas pixels per logical pixel; logical units are 1080p. Set once at startup from the render height. */
let TEXT_SCALE = 1;
export const setTextScale = (s: number) => { TEXT_SCALE = s; };

/** A 2D canvas bound to a three.js texture. Redraws only when the key changes. */
export class CanvasTex {
  readonly canvas = document.createElement('canvas');
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  private key = '';

  private readonly lw: number;
  private readonly lh: number;
  private readonly scale = TEXT_SCALE;

  /** w/h are logical (1080p) pixels; the backing canvas is scaled up for sharp text at higher resolutions. */
  constructor(w: number, h: number, nearest = false) {
    this.lw = w;
    this.lh = h;
    this.canvas.width = Math.ceil(w * this.scale);
    this.canvas.height = Math.ceil(h * this.scale);
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    if (nearest) {
      this.texture.magFilter = THREE.NearestFilter;
      this.texture.minFilter = THREE.NearestFilter;
      this.texture.generateMipmaps = false;
    }
  }

  get w() { return this.lw; }
  get h() { return this.lh; }

  /** Calls `draw` (on a cleared canvas) only if `key` differs from the last draw. */
  draw(key: string, draw: (ctx: CanvasRenderingContext2D) => void) {
    if (key === this.key) return;
    this.key = key;
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx.clearRect(0, 0, this.w, this.h);
    draw(this.ctx);
    this.texture.needsUpdate = true;
  }
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Text revealed character by character over [t0, t0 + dur]. */
export function typed(text: string, t: number, t0: number, dur: number): string {
  if (t < t0) return '';
  const n = Math.floor(((t - t0) / Math.max(dur, 1e-3)) * text.length);
  return text.slice(0, Math.min(text.length, n));
}

/** Blinking block cursor. */
export const cursor = (t: number, rate = 1.6) => (Math.floor(t * rate * 2) % 2 === 0 ? '▍' : ' ');
