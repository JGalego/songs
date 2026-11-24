import * as THREE from 'three';
import { backdrop, clamp01, fmt, lerp, pill, rnd, rr, smooth, txt, mono } from './art';
import { C } from './palette';
import { H, W, type Scene } from './scene';
import { WORD_TIMES } from './karaoke';
import { CanvasTex, SANS, karaokeAt, karaokeLines, karaokeText } from './text';
import {
  CREDITS, CREDITS_START, agentsOnline, DURATION, HEADCOUNT_ORG, HEADCOUNT_SPECIES, LYRICS, OFFICE, SCOPE_SWITCH, SPECIES,
} from './timeline';

const WIPE = [C.pink, C.teal, C.lavender, C.sun];
const WIPE_LEN = 0.22; // seconds, centered on the cut

const KARAOKE = karaokeLines(WORD_TIMES);
/** Sung lines that come in after a long wait get a karaoke countdown (three dots, one per beat). Add a time to enable one. */
const WAIT_CUES: number[] = [WORD_TIMES[0][0][0]];
const WAIT_BEAT = 60 / 110.98;

/**
 * The 2D stage: one full-screen canvas on top of the 3D world. It plays the scenes in order, wipes between them
 * on the cut, and draws the overlays that never go away (headcount, subtitles, credits).
 */
export class Stage {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
  subtitles = true;
  /** The headcount ticker (off for clean frames: posters, thumbnails). */
  counter = true;
  private tex = new CanvasTex(W, H);

  constructor(private scenes: Scene[]) {
    const mat = new THREE.MeshBasicMaterial({ map: this.tex.texture, transparent: true, depthTest: false, depthWrite: false });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat));
  }

  /** Index of the scene playing at time t. */
  private indexAt(t: number) {
    let i = 0;
    while (i + 1 < this.scenes.length && this.scenes[i + 1].t0 <= t) i++;
    return i;
  }

  /** Does the active scene hide the 3D world right now? (so main can skip drawing it) */
  opaqueAt(t: number) {
    const s = this.scenes[this.indexAt(t)];
    return !!s.bg && (s.bgAlpha?.(t) ?? 1) > 0.995;
  }

  update(t: number, kick: number) {
    this.tex.draw(`${t.toFixed(5)}|${kick.toFixed(3)}`, (c) => {
      const i = this.indexAt(t);
      const s = this.scenes[i];
      const a = s.bgAlpha?.(t) ?? 1;
      if (s.bg && a > 0) {
        c.globalAlpha = a;
        backdrop(c, W, H, t, s.bg[0], s.bg[1], s.glow);
        c.globalAlpha = 1;
      }
      // the scene itself, with a tiny punch on the beat
      c.save();
      const punch = 1 + kick * 0.012;
      c.translate(W / 2, H / 2); c.scale(punch, punch); c.translate(-W / 2, -H / 2);
      s.draw({ c, t, k: t - s.t0, d: s.t1 - s.t0, u: clamp01((t - s.t0) / (s.t1 - s.t0)), kick });
      c.restore();

      this.drawSubtitle(c, t);
      if (this.counter) this.drawCounter(c, t);
      // wipes on the cuts: whichever boundary is closest
      for (const j of [i, i + 1]) {
        const n = this.scenes[j];
        if (!n || n.wipe === false || j === 0) continue;
        const p = (t - (n.t0 - WIPE_LEN / 2)) / WIPE_LEN;
        if (p > 0 && p < 1) this.wipe(c, p, WIPE[j % WIPE.length]);
      }
    });
  }

  private wipe(c: CanvasRenderingContext2D, p: number, color: string) {
    const lead = lerp(-0.4 * W, 1.5 * W, smooth(0, 0.6, p)), trail = lerp(-0.4 * W, 1.5 * W, smooth(0.4, 1, p)), slant = 300;
    c.beginPath();
    c.moveTo(trail, 0); c.lineTo(lead, 0); c.lineTo(lead - slant, H); c.lineTo(trail - slant, H);
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }

  private drawSubtitle(c: CanvasRenderingContext2D, t: number) {
    if (!this.subtitles) return;
    this.drawWaitCue(c, t);
    // karaoke: the line shows dim just before it's sung, and each word fills in while it's being sung
    const { i, alpha } = karaokeAt(KARAOKE, t);
    if (i < 0) return;
    c.save();
    const g = c.createLinearGradient(0, H - 230, 0, H);
    g.addColorStop(0, 'rgba(6,7,22,0)'); g.addColorStop(1, 'rgba(6,7,22,0.78)');
    c.globalAlpha = alpha; c.fillStyle = g; c.fillRect(0, H - 230, W, 230);
    c.font = `600 46px ${SANS}`;
    c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 16;
    karaokeText(c, LYRICS[i].text, WORD_TIMES[i], t, W / 2, H - 82, W - 200, 'rgba(255,244,230,0.42)', C.sun);
    c.restore();
  }

  /** Three dots fill in left to right, one per beat, then pulse until the line shows up and takes their place. */
  private drawWaitCue(c: CanvasRenderingContext2D, t: number) {
    for (const T of WAIT_CUES) {
      const start = T - 4 * WAIT_BEAT, end = T - 0.35; // the dim line appears 0.35 s before its first word
      const a = smooth(start - 0.3, start, t) * (1 - smooth(end - 0.15, end, t));
      if (a <= 0) continue;
      const pulse = t > T - WAIT_BEAT ? 1 + 0.18 * Math.sin(((t - (T - WAIT_BEAT)) / WAIT_BEAT) * Math.PI * 2) : 1;
      c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 14;
      for (let k = 0; k < 3; k++) {
        const x = W / 2 + (k - 1) * 46, y = H - 82, r = 11 * pulse, fill = clamp01((t - (T - (4 - k) * WAIT_BEAT)) / WAIT_BEAT);
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = 'rgba(255,244,230,0.38)'; c.fill();
        c.save(); c.beginPath(); c.rect(x - r, y - r, 2 * r * fill, 2 * r); c.clip();
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = C.sun; c.fill(); c.restore();
      }
      c.restore();
    }
  }

  // ── headcount: the company, then the species
  private drawCounter(c: CanvasRenderingContext2D, t: number) {
    const a = smooth(15.2, 16.6, t) * (1 - smooth(OFFICE - 0.6, OFFICE, t));
    if (a <= 0) return;
    const species = t >= SCOPE_SWITCH;
    const kf = species ? HEADCOUNT_SPECIES : HEADCOUNT_ORG;
    let value = kf[kf.length - 1][1];
    for (let i = 1; i < kf.length; i++) if (t <= kf[i][0]) { value = lerp(kf[i - 1][1], kf[i][1], clamp01((t - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0]))); break; }
    if (t < kf[0][0]) value = kf[0][1];
    const max = species ? SPECIES : HEADCOUNT_ORG[0][1];
    let shown = fmt(value);
    if (species && t < SCOPE_SWITCH + 0.7) {
      const tick = Math.floor(t * 30);
      shown = fmt(SPECIES).replace(/\d/g, (d, i) => (rnd(tick + i * 7) > 0.4 ? String(Math.floor(rnd(tick * 3 + i) * 10)) : d));
    }
    const frac = value / max, low = frac < 0.35;
    // once the lights start going out, a second counter shows the agents coming online to replace us
    const ag = species ? smooth(172.3, 173.0, t) : 0;
    const x = W - 40 - 520, y = 28, w = 520, h = 150 + 130 * ag;
    c.save();
    c.globalAlpha = a;
    rr(c, x, y, w, h, 20); c.fillStyle = 'rgba(8,10,30,0.74)'; c.fill();
    const L = x + 28, R = x + w - 28;
    pill(c, L, y + 36, species ? 'SPECIES' : 'ACME INC.', { size: 16, bg: species ? C.red : 'rgba(167,139,250,0.4)', fg: '#fff' });
    txt(c, 'HEADCOUNT', R, y + 36, { size: 21, weight: 700, color: 'rgba(255,244,230,0.7)', align: 'right', spacing: 4 });
    mono(c, shown, R, y + 92, { size: 58, weight: 700, color: low ? '#ff8a96' : C.cream, align: 'right', max: R - L });
    const bx = L, by = y + 124, bw = R - L, segs = 48;
    c.fillStyle = 'rgba(255,244,230,0.14)'; c.fillRect(bx, by, bw, 8);
    c.fillStyle = low ? C.red : C.teal;
    for (let i = 0, on = Math.ceil(clamp01(frac) * segs); i < on; i++) c.fillRect(bx + i * (bw / segs), by, bw / segs - 3, 8);
    if (ag > 0) {
      c.globalAlpha = a * ag;
      // agents grow faster than humans shrink (see agentsOnline)
      const ay = y + 150, gone = Math.max(0, SPECIES - value), online = agentsOnline(gone, SPECIES);
      c.fillStyle = 'rgba(255,244,230,0.12)'; c.fillRect(L, ay - 8, R - L, 2);
      pill(c, L, ay + 34, 'AGENTS', { size: 16, bg: C.teal, fg: C.tealDeep });
      txt(c, 'ONLINE', R, ay + 34, { size: 21, weight: 700, color: 'rgba(255,244,230,0.7)', align: 'right', spacing: 4 });
      mono(c, fmt(online), R, ay + 90, { size: 58, weight: 700, color: C.teal, align: 'right', max: R - L });
    }
    c.restore();
  }
}

/** The credits, rolling over the dark office after the lights are out. */
export function drawCredits(c: CanvasRenderingContext2D, t: number) {
  if (t < CREDITS_START - 0.2) return;
  const out = 1 - smooth(DURATION - 2.2, DURATION - 0.4, t);
  CREDITS.forEach(([label, value], i) => {
    const y = H / 2 - 170 + i * 85;
    c.globalAlpha = smooth(CREDITS_START + i * 0.9, CREDITS_START + i * 0.9 + 0.8, t) * out;
    txt(c, label.toUpperCase(), W / 2 - 230, y, { size: 26, weight: 700, color: C.pink, align: 'right', spacing: 3, max: 420 });
    mono(c, value, W / 2 - 190, y, { size: 34, color: C.cream, max: 920 });
  });
  c.globalAlpha = 1;
}
