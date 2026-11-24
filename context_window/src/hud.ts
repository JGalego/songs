import * as THREE from 'three';
import { clamp, keyframes, smoothstep, window01 } from './math';
import { WORD_TIMES } from './karaoke';
import { CanvasTex, MONO, PIXEL, cursor, karaokeAt, karaokeLines, karaokeText, typed } from './text';
import {
  COMPACTION, CONTEXT_MAX, CREDITS, CREDITS_START, CUT, LYRICS, OUTRO, TOKENS, TWO_HUNDRED_K,
} from './timeline';

const KARAOKE = karaokeLines(WORD_TIMES);

/** Screen-space overlay in a fixed 1920x1080 coordinate system (rendered before post-fx, so it gets pixelated too). */
export class Hud {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-960, 960, 540, -540, -10, 10);
  subtitles = true;

  private counter = new CanvasTex(620, 170);
  private sub = new CanvasTex(1800, 120);
  private center = new CanvasTex(1600, 800);
  private mats: THREE.MeshBasicMaterial[] = [];
  private counterMesh: THREE.Mesh;

  constructor() {
    this.counterMesh = this.add(this.counter, 960 - 60 - 310, 540 - 40 - 85);
    this.add(this.sub, 0, -430);
    this.add(this.center, 0, 10);
  }

  private add(tex: CanvasTex, x: number, y: number) {
    const mat = new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(tex.w, tex.h), mat);
    mesh.position.set(x, y, 0);
    this.scene.add(mesh);
    this.mats.push(mat);
    return mesh;
  }

  update(t: number, kick: number) {
    this.drawCounter(t);
    this.drawSubtitle(t);
    this.drawCenter(t);
    this.counterMesh.position.y = 540 - 40 - 85 + kick * 2;
  }

  private drawCounter(t: number) {
    const tokens = Math.round(keyframes(TOKENS, t));
    const frac = tokens / CONTEXT_MAX;
    const full = frac > 0.95;
    const blink = full && Math.floor(t * 4) % 2 === 0;
    const toast = window01(t, COMPACTION, COMPACTION + 6, 0.3);
    const flash = TWO_HUNDRED_K.some((t0) => t >= t0 && t < t0 + 0.25);
    const visible = smoothstep(11, 12.5, t) * (t < CUT || t >= 249.4 ? 1 : 0) * (1 - smoothstep(261, 262.5, t));
    this.mats[0].opacity = visible;
    if (visible <= 0) return;

    const key = `${tokens}|${blink}|${Math.round(toast * 16)}|${flash}`;
    this.counter.draw(key, (ctx) => {
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      const color = flash ? '#ffffff' : full ? (blink ? '#ff3b2f' : '#ff8a6a') : '#ffb38a';
      ctx.font = `400 34px ${PIXEL}`;
      ctx.fillStyle = 'rgba(255,179,138,0.7)';
      ctx.fillText(full ? 'CONTEXT ALMOST FULL' : 'CONTEXT', 610, 4);
      ctx.font = `400 64px ${PIXEL}`;
      ctx.fillStyle = color;
      ctx.fillText(`${tokens.toLocaleString('en-US')} / ${CONTEXT_MAX.toLocaleString('en-US')}`, 610, 34);

      const bw = 420, bx = 610 - bw, by = 104;
      ctx.fillStyle = 'rgba(255,179,138,0.18)';
      ctx.fillRect(bx, by, bw, 10);
      ctx.fillStyle = color;
      // chunky segmented bar
      const segs = 30;
      for (let i = 0; i < Math.round(clamp(frac) * segs); i++) ctx.fillRect(bx + i * (bw / segs), by, bw / segs - 3, 10);

      if (toast > 0) {
        ctx.globalAlpha = toast;
        ctx.font = `400 34px ${PIXEL}`;
        ctx.fillStyle = '#9fd4ff';
        ctx.fillText('⟲ conversation summarized', 610, 126);
        ctx.globalAlpha = 1;
      }
    });
  }

  private drawSubtitle(t: number) {
    // karaoke: the line shows dim just before it's sung, and each word fills in while it's being sung
    const { i, alpha } = karaokeAt(KARAOKE, t);
    this.mats[1].opacity = this.subtitles ? alpha : 0;
    if (i < 0 || !this.subtitles) return;
    this.sub.draw(`${i}|${Math.round(t * 240)}`, (ctx) => {
      ctx.font = `400 46px ${MONO}`;
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 14;
      karaokeText(ctx, LYRICS[i].text, WORD_TIMES[i], t, 900, 60, 1760, 'rgba(244,232,222,0.42)', '#ffb38a');
    });
  }

  private drawCenter(t: number) {
    const q = (x: number) => Math.round(x * 24) / 24; // quantize alpha so we redraw rarely
    const parts: string[] = [];
    const ops: ((ctx: CanvasRenderingContext2D) => void)[] = [];
    const cx = 800, cy = 400;

    // "New conversation."
    const nc = q(window01(t, 11.6, 16.6, 0.8)); // out of the way before Maya's first message
    if (nc > 0) {
      const s = typed('New conversation.', t, 11.66, 1.1);
      const c = t < 16.2 ? cursor(t) : ' ';
      parts.push(`nc${nc}${s}${c}`);
      ops.push((ctx) => {
        ctx.globalAlpha = nc;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `400 64px ${MONO}`;
        ctx.fillStyle = '#e9ecf4';
        const w = ctx.measureText('New conversation.').width;
        ctx.fillText(s + c, cx - w / 2, cy);
      });
    }

    // "Two hundred thousand ways to say"
    for (const t0 of TWO_HUNDRED_K) {
      const a = q(window01(t, t0, t0 + 3.2, 0.15) * (1 - smoothstep(t0, t0 + 3.4, t)) * 0.55);
      if (a <= 0) continue;
      parts.push(`200k${a}`);
      ops.push((ctx) => {
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `400 300px ${PIXEL}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('200,000', cx, cy);
      });
    }

    // the void after the cut: just a cursor
    if (t >= CUT + 1.4 && t < 249.5) {
      const c = cursor(t, 1.2);
      parts.push(`void${c}`);
      ops.push((ctx) => {
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `400 56px ${MONO}`;
        ctx.fillStyle = '#e9ecf4';
        ctx.fillText(c, 360, cy);
      });
    }

    // a fresh chat
    const chat = q(window01(t, 249.4, 259.4, 0.05) * (1 - smoothstep(259.4, 260.5, t)));
    if (chat > 0) {
      const main = OUTRO.filter((o) => !o.faint).map((o) => typed(o.text, t, o.t, o.dur)).join('');
      const faint = OUTRO.filter((o) => o.faint).map((o) => typed(o.text, t, o.t, o.dur)).join('');
      const typingFaint = t >= OUTRO[OUTRO.length - 1].t;
      const c = cursor(t, 1.2);
      parts.push(`chat${chat}${main}|${faint}${c}`);
      ops.push((ctx) => {
        ctx.globalAlpha = chat;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `400 32px ${PIXEL}`;
        ctx.fillStyle = 'rgba(255,179,138,0.6)';
        ctx.fillText('NEW CONVERSATION · 0 MESSAGES', 360, cy - 130);
        ctx.font = `700 26px ${MONO}`;
        ctx.fillStyle = '#ff9d5c';
        ctx.fillText('ASSISTANT', 360, cy - 60);
        ctx.font = `400 56px ${MONO}`;
        ctx.fillStyle = '#ffeadb';
        ctx.fillText(main + (typingFaint ? '' : c), 360, cy);
        if (typingFaint) {
          ctx.font = `400 40px ${MONO}`;
          ctx.fillStyle = 'rgba(160,168,190,0.75)';
          ctx.fillText(faint + c, 360, cy + 80);
        }
      });
    }

    // credits
    if (t >= CREDITS_START - 0.5) {
      const out = 1 - smoothstep(271, 272.8, t);
      const rows = CREDITS.map((_, i) => q(smoothstep(CREDITS_START + i * 0.9, CREDITS_START + i * 0.9 + 0.8, t) * out));
      parts.push(`cred${rows.join(',')}`);
      ops.push((ctx) => {
        ctx.textBaseline = 'middle';
        CREDITS.forEach(([label, value], i) => {
          const y = cy - 170 + i * 85;
          ctx.globalAlpha = rows[i];
          ctx.textAlign = 'right';
          ctx.font = `400 42px ${PIXEL}`;
          ctx.fillStyle = 'rgba(255,179,138,0.7)';
          ctx.fillText(label.toUpperCase(), cx - 220, y);
          ctx.textAlign = 'left';
          ctx.font = `400 36px ${MONO}`;
          ctx.fillStyle = '#e9ecf4';
          ctx.fillText(value, cx - 180, y);
        });
      });
    }

    this.center.draw(parts.join('|'), (ctx) => ops.forEach((op) => { ctx.save(); op(ctx); ctx.restore(); }));
  }
}
