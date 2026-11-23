import * as THREE from 'three';
import { keyframes, smoothstep, window01 } from './math';
import { CanvasTex, MONO, SERIF, cursor, typed } from './text';
import {
  CHROME, CREDITS, CREDITS_START, CUT, DURATION, LYRICS, PROMPT, PROMPT_TEXT, SHOTS, TITLE, YEARS,
} from './timeline';

const TAB_NAMES = ['Inbox (212)', 'Slack', 'Jira — SW-4412', 'Docs', 'Dashboard', 'Pull request #4412', 'Untitled', 'Calendar', 'New Tab', 'Standup notes', 'Logs', 'Billing'];

export const fmtYear = (v: number) => {
  const r = Math.round(v);
  return r < 0 ? `${Math.abs(r).toLocaleString('en-US')} BCE` : String(r);
};

/** Screen-space overlay in a fixed 1920x1080 coordinate system. */
export class Hud {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-960, 960, 540, -540, -10, 10);
  subtitles = true;

  private chrome = new CanvasTex(1920, 120);
  private prompt = new CanvasTex(1000, 110);
  private placard = new CanvasTex(900, 250);
  private year = new CanvasTex(760, 170);
  private sub = new CanvasTex(1800, 120);
  private center = new CanvasTex(1600, 800);
  private mats: THREE.MeshBasicMaterial[] = [];

  constructor() {
    this.add(this.chrome, 0, 540 - 60);
    this.add(this.prompt, 0, -300);
    this.add(this.placard, -960 + 50 + 450, 540 - 150 - 125);
    this.add(this.year, 960 - 50 - 380, 540 - 150 - 85);
    this.add(this.sub, 0, -430);
    this.add(this.center, 0, 10);
    this.drawChrome();
  }

  private add(tex: CanvasTex, x: number, y: number) {
    const mat = new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(tex.w, tex.h), mat);
    mesh.position.set(x, y, 0);
    this.scene.add(mesh);
    this.mats.push(mat);
  }

  update(t: number, shotIndex: number) {
    this.mats[0].opacity = keyframes(CHROME, t);
    this.drawPrompt(t);
    this.drawPlacard(t, shotIndex);
    this.drawYear(t);
    this.drawSubtitle(t);
    this.drawCenter(t);
  }

  /** A browser's tab strip and address bar: the interface that disappears as the eras go on. */
  private drawChrome() {
    this.chrome.draw('chrome', (ctx) => {
      ctx.fillStyle = 'rgba(14,17,26,0.88)';
      ctx.fillRect(0, 0, 1920, 120);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.moveTo(0, 119.5); ctx.lineTo(1920, 119.5); ctx.stroke();
      const tw = 150;
      TAB_NAMES.forEach((name, i) => {
        const x = 20 + i * (tw + 4);
        ctx.fillStyle = i === 0 ? 'rgba(60,70,100,0.9)' : 'rgba(30,35,52,0.85)';
        ctx.beginPath(); ctx.roundRect(x, 12, tw, 38, [8, 8, 0, 0]); ctx.fill();
        ctx.fillStyle = i % 3 === 0 ? '#ff6b5c' : '#6d84b8';
        ctx.fillRect(x + 12, 24, 14, 14);
        ctx.fillStyle = '#c4cde0';
        ctx.font = `400 15px ${MONO}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(name.length > 12 ? `${name.slice(0, 11)}…` : name, x + 34, 32);
      });
      ctx.fillStyle = '#ff4d3d';
      ctx.beginPath(); ctx.roundRect(1920 - 150, 14, 110, 34, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 18px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('40 tabs', 1920 - 95, 32);
      ctx.fillStyle = 'rgba(8,10,16,0.9)';
      ctx.beginPath(); ctx.roundRect(20, 62, 1500, 40, 20); ctx.fill();
      ctx.fillStyle = '#7f8aa6';
      ctx.textAlign = 'left';
      ctx.font = `400 18px ${MONO}`;
      ctx.fillText('https://everything-inbox.app/all?unread=true&sort=urgent', 44, 83);
      ctx.fillStyle = '#ff4d3d';
      ctx.beginPath(); ctx.arc(1560, 82, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 13px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('99+', 1560, 83);
    });
  }

  /** The single input line that is all that's left of the interface in 2525. */
  private drawPrompt(t: number) {
    const a = keyframes(PROMPT, t);
    this.mats[1].opacity = a;
    if (a <= 0) return;
    const shown = typed(PROMPT_TEXT, t, 29.2, 2.6);
    const blink = cursor(t, 1.1);
    this.prompt.draw(`${shown}|${blink}`, (ctx) => {
      ctx.strokeStyle = 'rgba(255,210,122,0.8)';
      ctx.fillStyle = 'rgba(20,16,6,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(40, 20, 920, 72, 36); ctx.fill(); ctx.stroke();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = `400 34px ${MONO}`;
      ctx.fillStyle = '#ffd27a';
      ctx.fillText(`›  ${shown}${blink}`, 82, 58);
    });
  }

  /** The museum label for the current room. */
  private drawPlacard(t: number, shotIndex: number) {
    const shot = SHOTS[shotIndex];
    const p = shot.placard;
    const next = SHOTS[shotIndex + 1];
    const dur = (next ? next.t : DURATION) - shot.t;
    const f = Math.min(0.9, dur * 0.25);
    const a = p ? smoothstep(shot.t + f * 0.4, shot.t + f * 0.4 + f, t) * (1 - smoothstep((next ? next.t : DURATION) - f, next ? next.t : DURATION, t)) : 0;
    const gone = t >= CREDITS_START - 1.5 || (t >= 229.5 && t < CUT);
    this.mats[2].opacity = gone ? 0 : a;
    if (!p || a <= 0 || gone) return;
    this.placard.draw(`pl${shotIndex}`, (ctx) => {
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = shot.color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, 8, 3, 214);
      ctx.globalAlpha = 1;
      ctx.font = `400 21px ${MONO}`;
      ctx.letterSpacing = '4px';
      ctx.fillStyle = 'rgba(232,230,227,0.6)';
      ctx.fillText(p.room, 28, 32);
      ctx.letterSpacing = '0px';
      ctx.font = `500 70px ${SERIF}`;
      ctx.fillStyle = '#f2ede4';
      ctx.fillText(p.title, 26, 108);
      ctx.font = `italic 400 33px ${SERIF}`;
      ctx.fillStyle = 'rgba(242,237,228,0.82)';
      ctx.fillText(p.line, 28, 160);
      ctx.font = `400 18px ${MONO}`;
      ctx.fillStyle = 'rgba(232,230,227,0.42)';
      ctx.fillText(p.build, 28, 205);
    });
  }

  private drawYear(t: number) {
    const v = keyframes(YEARS, t);
    const label = fmtYear(v);
    const visible = smoothstep(2, 4, t) * (1 - smoothstep(CREDITS_START - 1.5, CREDITS_START - 0.5, t));
    const hide = t >= 229.5 && t < CUT ? 0 : 1;
    this.mats[3].opacity = visible * hide;
    if (visible <= 0) return;
    this.year.draw(label, (ctx) => {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.font = `400 20px ${MONO}`;
      ctx.letterSpacing = '6px';
      ctx.fillStyle = 'rgba(232,230,227,0.5)';
      ctx.fillText('YEAR', 740, 34);
      ctx.letterSpacing = '0px';
      ctx.font = `500 110px ${SERIF}`;
      ctx.fillStyle = '#f2ede4';
      ctx.fillText(label, 740, 132);
    });
  }

  private drawSubtitle(t: number) {
    const line = LYRICS.find((l) => t >= l.t - 0.1 && t < l.end + 0.5);
    const alpha = line && this.subtitles ? 1 - smoothstep(line.end, line.end + 0.5, t) : 0;
    this.mats[4].opacity = alpha;
    if (!line || alpha <= 0) return;
    const shown = typed(line.text, t, line.t, Math.max(0.6, (line.end - line.t) * 0.55));
    this.sub.draw(shown + (line.spoken ? 's' : ''), (ctx) => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = line.spoken ? `400 36px ${MONO}` : `500 58px ${SERIF}`;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = line.spoken ? '#b9c3d8' : '#f6f1e7';
      ctx.fillText(line.spoken ? shown.toLowerCase() : shown, 900, 60);
    });
  }

  private drawCenter(t: number) {
    const q = (x: number) => Math.round(x * 24) / 24;
    const parts: string[] = [];
    const ops: ((ctx: CanvasRenderingContext2D) => void)[] = [];
    const cx = 800, cy = 400;

    const title = q(window01(t, TITLE.t0 + 1, TITLE.t1, 1.2));
    if (title > 0) {
      parts.push(`title${title}`);
      ops.push((ctx) => {
        ctx.globalAlpha = title;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 40;
        ctx.font = `500 128px ${SERIF}`;
        ctx.letterSpacing = '10px';
        ctx.fillStyle = '#f6f1e7';
        ctx.fillText('SOMEBODY WANTED', cx, cy - 10);
        ctx.fillText('SOMETHING', cx, cy + 120);
        ctx.letterSpacing = '8px';
        ctx.font = `400 30px ${MONO}`;
        ctx.fillStyle = 'rgba(232,230,227,0.7)';
        ctx.fillText('( YEAR 2525 )', cx, cy + 200);
      });
    }

    if (t >= CREDITS_START - 0.5) {
      const out = 1 - smoothstep(DURATION - 2.2, DURATION - 0.6, t);
      const rows = CREDITS.map((_, i) => q(smoothstep(CREDITS_START + i * 0.9, CREDITS_START + i * 0.9 + 0.8, t) * out));
      parts.push(`cred${rows.join(',')}`);
      ops.push((ctx) => {
        ctx.textBaseline = 'middle';
        CREDITS.forEach(([label, value], i) => {
          const y = cy - 60 + i * 85;
          ctx.globalAlpha = rows[i];
          ctx.textAlign = 'right';
          ctx.font = `400 26px ${MONO}`;
          ctx.letterSpacing = '5px';
          ctx.fillStyle = 'rgba(232,230,227,0.55)';
          ctx.fillText(label.toUpperCase(), cx - 40, y);
          ctx.letterSpacing = '0px';
          ctx.textAlign = 'left';
          ctx.font = `500 40px ${SERIF}`;
          ctx.fillStyle = '#f2ede4';
          ctx.fillText(value, cx - 10, y);
        });
      });
    }

    const key = parts.join('|');
    this.mats[5].opacity = key ? 1 : 0;
    if (!key) return;
    this.center.draw(key, (ctx) => {
      for (const op of ops) { ctx.save(); op(ctx); ctx.restore(); }
    });
  }
}
