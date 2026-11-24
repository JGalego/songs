import {
  agent, appWindow, at, avatar, avatarColor, bin, card, check, clamp01, clockFace, confetti, cross, fmt, chatIcon, goldSeal, heart, infoCard, type ChatIcon, lerp, mono, outBack, parcelPlanet,
  outCubic, person, pill, plant, pointer, pop, ramp, rnd, rr, smooth, star, stamp, sunset, tooth, txt, typed, wobble,
} from './art';
import { mockImage, MOCK_KINDS } from './mockimg';
import { C } from './palette';
import { SANS } from './text';
import { H, W, type Scene } from './scene';
import { drawCredits } from './stage';
import { CREDITS_START, EMAIL, LAPTOP, MOTION } from './timeline';

const cx = W / 2, cy = 510;
const BEAT = 60 / 110.98;
const DARK: [string, string] = ['#000', '#000'];

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS_SYMBOLS = '"Segoe UI Symbol", "Noto Sans Symbols 2", "DejaVu Sans", sans-serif';
const NOTES = ['♪', '♫', '♬', '♩'];
const BOOK = 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters. ';
const BOOK_X: number[] = [];
let BOOK_W = 0;

const GOOD = { bg: '#d8f5e8', fg: '#1f8a5b' };

export const scenes3: Scene[] = [
  // ── 1:47 chorus 2 — "not a reflection of your performance": the graph
  {
    name: 'perf2', t0: 107.5, t1: 111.7, bg: ['#082026', '#1b1648'], glow: [C.green, C.teal, C.pink],
    draw: ({ c, t }) => {
      const s = pop(t, 107.6, 0.5);
      at(c, cx, cy + 30, { s: 0.92 + 0.08 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 1400, 680);
        txt(c, 'WHAT THE DASHBOARD SAYS', -640, -290, { size: 24, weight: 800, color: C.lavender, spacing: 5 });
        const gx = -600, gy = 230, gw = 1200, gh = 440;
        c.strokeStyle = '#e9e3d9'; c.lineWidth = 2;
        for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(gx, gy - (gh * i) / 4); c.lineTo(gx + gw, gy - (gh * i) / 4); c.stroke(); }
        const p = ramp(t, 108.0, 110.9);
        const line = (f: (u: number) => number, col: string) => { c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = col; c.beginPath(); for (let i = 0; i <= 60 * p; i++) { const u = i / 60; i ? c.lineTo(gx + u * gw, gy - f(u) * gh) : c.moveTo(gx + u * gw, gy - f(u) * gh); } c.stroke(); };
        line((u) => 0.15 + 0.8 * u * u + 0.05 * Math.sin(u * 9), C.green);
        line((u) => 0.9 - 0.85 * u * u * u, C.red);
        if (p > 0.1) { const u = p, x = gx + u * gw; c.fillStyle = C.green; c.beginPath(); c.arc(x, gy - (0.15 + 0.8 * u * u + 0.05 * Math.sin(u * 9)) * gh, 14, 0, Math.PI * 2); c.fill(); c.fillStyle = C.red; c.beginPath(); c.arc(x, gy - (0.9 - 0.85 * u * u * u) * gh, 14, 0, Math.PI * 2); c.fill(); }
        pill(c, -640, 275, '● Your performance', { size: 24, bg: '#d8f5e8', fg: '#1f8a5b' });
        pill(c, -300, 275, '● Your role', { size: 24, bg: '#ffe0e4', fg: C.red });
        mono(c, `${Math.round(100 * smooth(108.0, 110.9, t))}%`, 640, -250, { size: 90, weight: 700, color: C.green, align: 'right' });
      });
    },
  },

  // ── "You were wonderful, you gave it all you had": thank-you cards, and the recognition budget
  {
    name: 'kudos', t0: 111.7, t1: 115.6, bg: ['#26122e', '#3a1850'], glow: [C.pink, C.sun, C.peach],
    draw: ({ c, t }) => {
      const kudos: [string, string, ChatIcon, string, string][] = [
        ['Wonderful', 'Dana', 'sparkle', '#e0a800', '#fff1cf'], ['Team player', 'Ravi', 'team', '#4a7fd6', '#e3efff'], ['Above & beyond', 'Sam', 'rocket', '#e0457f', '#ffe3f0'],
        ['MVP', 'Lee', 'trophy', '#e08a3c', '#ffeadb'], ['Culture champ', 'Priya', 'crown', '#8b6cf0', '#ece6ff'],
      ];
      kudos.forEach(([label, from, icon, ink, tint], i) => {
        const x = 330 + i * 315, q = pop(t, 111.8 + i * BEAT, 0.4);
        at(c, x, cy - 70, { s: q, rot: (i - 2) * 0.05 }, () => {
          card(c, 0, 0, 270, 360, { r: 22 });
          // icon, title and "♥ from …" stacked, centred as one block both ways
          const R = 62, TS = 34, FS = 24, G1 = 26, G2 = 18, capT = TS * 0.72, capF = FS * 0.72;
          const H = 2 * R + G1 + capT + G2 + capF;
          let y = -H / 2;
          chatIcon(c, icon, 0, y + R, R, ink, tint); y += 2 * R + G1;
          c.textAlign = 'center'; c.textBaseline = 'alphabetic';
          c.font = `800 ${TS}px ${SANS}`; let ts = TS; const lw = c.measureText(label).width; if (lw > 230) { ts = Math.floor((TS * 230) / lw); c.font = `800 ${ts}px ${SANS}`; }
          c.fillStyle = C.ink; c.fillText(label, 0, y + capT); y += capT + G2;
          c.font = `500 ${FS}px ${SANS}`; const fw = c.measureText(`from ${from}`).width, heartW = 24, left = -(heartW + 8 + fw) / 2;
          heart(c, left + heartW / 2, y + capF / 2 + 1, 11, C.pink);
          c.textAlign = 'left'; c.fillStyle = C.inkSoft; c.fillText(`from ${from}`, left + heartW + 8, y + capF);
        });
      });
      const q = pop(t, 114.3, 0.4);
      at(c, cx, cy + 290, { s: q, a: clamp01(q * 2) }, () => {
        infoCard(c, { minW: 1000, minH: 150, r: 26, gap: 44, align: 'center', fill: '#2a0f1c', stroke: C.red, lineGap: 18,
          icon: { w: 76, h: 76, draw: (g) => { g.lineWidth = 7; g.strokeStyle = C.red; g.beginPath(); g.arc(0, 0, 34, 0, Math.PI * 2); g.stroke(); g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 21, 0, Math.PI * 2); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(-26, 26); g.lineTo(26, -26); g.stroke(); } },
          lines: [
            { text: 'RECOGNITION BUDGET', size: 24, weight: 800, color: 'rgba(255,244,230,0.78)', spacing: 5 },
            { text: '$0.00 remaining', size: 62, weight: 700, color: C.red, mono: true },
          ] });
      });
      confetti(c, t, 111.9, 40, 100, 1820, 130, 500, 11);
    },
  },

  // ── "does your job, won't need a dental plan": the compensation calculator
  {
    name: 'comp', t0: 115.6, t1: 120.3, bg: ['#0b1a2c', '#1d1740'], glow: [C.teal, C.peach, C.lavender],
    draw: ({ c, t }) => {
      const s = pop(t, 115.7, 0.5);
      at(c, cx, cy + 50, { s: 0.92 + 0.08 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 1500, 700);
        // header row: title left, the savings badge right, on one line
        txt(c, 'TOTAL COMPENSATION CALCULATOR', -690, -295, { size: 24, weight: 800, color: C.lavender, spacing: 5 });
        const sv = pop(t, 118.4, 0.4);
        at(c, 690 - 140, -295, { s: sv }, () => { pill(c, 0, 0, 'You save 99.9998%', { size: 30, bg: C.green, fg: '#fff', align: 'center' }); });
        c.fillStyle = '#e9e3d9'; c.fillRect(-690, -255, 1380, 2);
        // two mirrored columns: name, total, then the bar
        const HX = -345, AX = 345, AGENT_INK = '#14a89c', base = 280, scale = 1.2, BAR = 240;
        txt(c, 'HUMAN', HX, -218, { size: 24, weight: 800, align: 'center', spacing: 5, color: C.inkSoft });
        txt(c, 'AGENT', AX, -218, { size: 24, weight: 800, align: 'center', spacing: 5, color: AGENT_INK });
        const tot = Math.round(285 * smooth(116.0, 117.6, t));
        mono(c, `$${tot}k / yr`, HX, -160, { size: 56, weight: 700, align: 'center', color: C.ink, max: 600 });
        mono(c, '$0.0004 / task', AX, -160, { size: 56, weight: 700, align: 'center', color: AGENT_INK, max: 600 });
        // human: a stack of benefits with the labels to its right; bar and labels are centred together in the column
        const parts: [string, number, string][] = [['Salary', 150, C.pink], ['401(k) match', 50, C.peach], ['Health', 40, C.teal], ['Dental', 22, C.lavender], ['Vision', 15, C.sun], ['Free coffee', 8, '#a67c52']];
        const bx = HX - 82, labelX = bx + BAR / 2 + 24;
        let y = base;
        parts.forEach(([name, v, col], i) => {
          const k = smooth(116.0 + i * 0.25, 116.4 + i * 0.25, t), h = v * scale * k;
          y -= h;
          c.globalAlpha = name === 'Dental' && t > 119.6 ? 1 - smooth(119.6, 120.1, t) : 1;
          rr(c, bx - BAR / 2, y, BAR, Math.max(0, h - 3), 6); c.fillStyle = col; c.fill(); c.globalAlpha = 1;
          if (h > 16) txt(c, name, labelX, y + h / 2 + (name === 'Vision' ? -6 : 0), { size: 22, weight: 600, color: C.inkSoft, max: 190 });
        });
        // agent: a sliver, with the agent mark standing on it
        rr(c, AX - BAR / 2, base - 6, BAR, 6, 3); c.fillStyle = C.teal; c.fill();
        agent(c, AX, base - 52, 38, t * 0.9);
      });
      if (t > 119.65) at(c, cx + -427, cy + 50 + 280 - 251 * 1.2, { s: pop(t, 119.65, 0.4) }, () => { tooth(c, 0, 0, 70); cross(c, 0, 0, 160, C.red, 0.12); });
    },
  },

  // ── "So we're sunsetting your role" (x2): the executives this time
  {
    name: 'sunset3', t0: 120.3, t1: 125.84, bg: DARK,
    draw: ({ c, t }) => {
      const p = t < 123.74 ? smooth(120.4, 123.4, t) * 0.9 : 0.9 + 0.1 * smooth(123.74, 125.5, t);
      sunset(c, W, H, p, { windows: 0.3 + 0.5 * p, stars: smooth(123.5, 125.6, t) });
      const titles = ['VP Engineering', 'VP Sales', 'VP People', 'VP Marketing', 'VP Operations'];
      titles.forEach((title, i) => {
        const t0 = [120.9, 122.2, 123.0, 124.2, 125.1][i], k = t - t0; if (k < 0) return;
        const x = cx + (i - 2) * 330, y = cy - 40 + (i % 2) * 50;
        at(c, x, y + wobble(t, t0 + 0.14, 10), { s: outBack(k / 0.25), rot: (i - 2) * 0.05 }, () => {
          card(c, 0, 0, 300, 380, { r: 20 });
          person(c, 0, -90, 56, avatarColor(i + 2));
          txt(c, title, 0, 24, { size: 32, weight: 800, align: 'center', max: 260 });
          txt(c, 'Executive team', 0, 66, { size: 22, weight: 500, color: C.inkSoft, align: 'center' });
          if (k > 0.14) stamp(c, 0, 138, 'SUNSET', 42, { s: 1 + Math.max(0, 1 - (k - 0.14) / 0.15) * 0.8, angle: -0.1 + i * 0.02 });
        });
      });
    },
  },

  // ── "Your badge stops working at five": the login screen
  {
    name: 'login', t0: 125.84, t1: 128.7, bg: ['#0a1020', '#1b1438'], glow: [C.red, C.lavender, C.teal],
    draw: ({ c, t }) => {
      const s = pop(t, 125.95, 0.4), err = t >= 127.48;
      at(c, cx + wobble(t, 127.48, 14), cy, { s: 0.92 + 0.08 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 700, 640);
        at(c, 0, -230, {}, () => { rr(c, -34, -34, 68, 68, 16); c.fillStyle = err ? C.red : C.lavender; c.fill(); txt(c, err ? '✕' : '◆', 0, 2, { size: 40, weight: 800, color: '#fff', align: 'center' }); });
        txt(c, 'Sign in to ACME', 0, -150, { size: 44, weight: 800, align: 'center' });
        rr(c, -280, -90, 560, 70, 14); c.fillStyle = '#f3eee6'; c.fill();
        txt(c, typed('you@acme.inc', t, 126.1, 12), -255, -55, { size: 30, weight: 500 });
        rr(c, -280, 0, 560, 70, 14); c.fillStyle = '#f3eee6'; c.fill();
        txt(c, '•'.repeat(Math.max(0, Math.min(10, Math.floor((t - 126.7) * 10)))), -255, 36, { size: 36, weight: 800 });
        const press = t > 127.3 ? 1 : 0;
        at(c, 0, 130, { s: 1 - press * 0.05 }, () => pill(c, 0, 0, 'Sign in', { size: 34, bg: err ? '#b3ada3' : C.pink, fg: '#fff', align: 'center' }));
        if (err) { rr(c, -280, 190, 560, 90, 14); c.fillStyle = '#ffe0e4'; c.fill(); txt(c, 'Account disabled', -250, 215, { size: 30, weight: 800, color: C.red }); txt(c, 'Contact your administrator (an agent)', -250, 253, { size: 20, weight: 500, color: C.inkSoft, max: 500 }); }
      });
      if (t > 126.9 && t < 127.5) pointer(c, lerp(cx + 300, cx + 30, smooth(126.9, 127.3, t)), lerp(cy - 20, cy + 150, smooth(126.9, 127.3, t)), 1.2, press());
      function press() { return t > 127.3 ? 1 : 0; }
    },
  },

  // ── "Thank you for the journey": the reply-all storm
  {
    name: 'replyAll', t0: 128.7, t1: 131.9, bg: ['#0e1630', '#2a1446'], glow: [C.lavender, C.pink, C.sun],
    draw: ({ c, t }) => {
      // sits below the headcount ticker and above the subtitles
      const w = appWindow(c, cx, cy + 45, 1300, 620, 'Inbox · Farewell, and good luck!');
      const n = Math.floor(smooth(128.8, 131.6, t) * 312);
      c.save();
      rr(c, w.x, w.y, w.w, w.h, [0, 0, 22, 22]); c.clip(); // the list stays inside the window
      for (let i = 0; i < 9; i++) {
        const idx = n - i; if (idx <= 0) break;
        const y = w.y + 56 + i * 64, a = 1 - i * 0.09;
        c.globalAlpha = a;
        rr(c, w.x + 30, y - 28, w.w - 60, 56, 10); c.fillStyle = i === 0 ? '#efe9ff' : '#f5f0e8'; c.fill();
        avatar(c, w.x + 66, y, 18, avatarColor(idx));
        txt(c, `${['Dana', 'Ravi', 'Sam', 'Lee', 'Priya', 'Omar', 'Zoe', 'Ken'][idx % 8]}`, w.x + 100, y, { size: 24, weight: 800, max: 140 });
        txt(c, `Re: ${'Re: '.repeat(Math.min(4, 1 + (idx % 4)))}Thanks for everything!`, w.x + 260, y, { size: 24, weight: 500, color: C.inkSoft, max: w.w - 400 });
        c.globalAlpha = 1;
      }
      c.restore();
      pill(c, w.x + w.w - 50, w.y + w.h - 40, `Reply all: ${fmt(n)}`, { size: 30, bg: C.pink, fg: '#fff', align: 'right' });
    },
  },

  // ── "Have a lovely life": the walk to the door
  {
    name: 'carry', t0: 131.9, t1: 135.6, bg: ['#141230', '#241a3c'],
    draw: ({ c, t }) => {
      const floor = 800, p = ramp(t, 131.9, 135.0);
      // the corridor slides by
      const off = (t - 131.9) * 260;
      for (let i = -1; i < 8; i++) { const x = ((i * 360 - off) % 2880 + 2880) % 2880 - 360; c.fillStyle = 'rgba(255,244,230,0.08)'; rr(c, x, 250, 220, 420, 8); c.fill(); c.fillStyle = 'rgba(255,207,110,0.55)'; c.fillRect(x + 40, 150, 140, 14); }
      c.fillStyle = '#1a1634'; c.fillRect(0, floor, W, H - floor);
      c.fillStyle = 'rgba(255,244,230,0.1)'; c.fillRect(0, floor, W, 3);
      // the door at the end, closing
      const dx = 1560, closing = smooth(134.2, 135.3, t);
      c.fillStyle = '#ffeab0'; rr(c, dx, 330, 190, floor - 330, 6); c.fill();
      c.fillStyle = '#2a2650'; c.fillRect(dx, 330, 190 * closing, floor - 330);
      txt(c, 'EXIT', dx + 95, 300, { size: 30, weight: 800, color: C.green, align: 'center', spacing: 6 });
      // the walker with a box
      const x = lerp(260, 1480, outCubic(p * 1.05)), bob = Math.sin(t * 9) * 8, step = Math.sin(t * 9);
      c.save(); c.translate(x, floor - 6);
      c.strokeStyle = '#d7d1e8'; c.lineWidth = 16; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-8, -200); c.lineTo(-8 + step * 40, 0); c.moveTo(8, -200); c.lineTo(8 - step * 40, 0); c.stroke();
      c.fillStyle = C.pink; rr(c, -44, -420 + bob * 0.4, 88, 230, 30); c.fill();
      c.fillStyle = '#ffd9bf'; c.beginPath(); c.arc(0, -468 + bob * 0.4, 38, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c99a62'; rr(c, 20, -340 + bob * 0.4, 150, 120, 8); c.fill(); c.fillStyle = '#e8d5a8'; c.fillRect(85, -340 + bob * 0.4, 20, 120);
      plant(c, 95, -380 + bob * 0.4, 52);
      c.restore();
    },
  },

  // ── 2:16 "Q3 highlights"
  {
    name: 'earnings', t0: 135.6, t1: 151.45, bg: ['#0a1c24', '#241446'], glow: [C.green, C.lavender, C.teal],
    draw: ({ c, t }) => {
      const s = pop(t, 135.7, 0.5);
      at(c, cx, cy + 70, { s: 0.94 + 0.06 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 1560, 760);
        // header
        txt(c, 'ACME INC. · INVESTOR UPDATE', -720, -330, { size: 24, weight: 800, color: C.lavender, spacing: 5 });
        txt(c, 'Q3 highlights', -720, -268, { size: 68, weight: 800 });
        pill(c, 720, -268, '▲ ACME +8.2%', { size: 28, bg: GOOD.bg, fg: GOOD.fg, align: 'right' });
        c.fillStyle = '#e9e3d9'; c.fillRect(-720, -212, 1440, 2);
        // one grid for every row: metric | status | trend | note
        const COL = { metric: -720, status: -330, trend: 90, note: 720 }, TREND_W = 270, ROW = 120, Y0 = -100;
        (['METRIC', 'STATUS', 'TREND'] as const).forEach((h, i) => txt(c, h, [COL.metric, COL.status, COL.trend][i], -188, { size: 17, weight: 800, color: C.inkSoft, spacing: 4, alpha: 0.7 }));
        txt(c, 'NOTE', COL.note, -188, { size: 17, weight: 800, color: C.inkSoft, spacing: 4, align: 'right', alpha: 0.7 });
        type Row = { label: string; on: number; val: string; valOn: number; col: string; spark: number[]; note: string; noteOn: number; muted?: boolean };
        const rows: Row[] = [
          { label: 'Revenue', on: 137.75, val: '▲ Up', valOn: 138.71, col: C.green, spark: [0.2, 0.25, 0.3, 0.38, 0.5, 0.62, 0.8, 0.95], note: 'record quarter', noteOn: 139.7 },
          { label: 'Headcount', on: 139.75, val: '▼ Down', valOn: 140.79, col: C.red, spark: [0.95, 0.9, 0.8, 0.62, 0.4, 0.2, 0.06, 0.0], note: 'as planned', noteOn: 141.7 },
          { label: 'p(doom)', on: 141.84, val: '▲ +12%', valOn: 141.84, col: C.green, spark: [0.1, 0.14, 0.2, 0.28, 0.4, 0.52, 0.7, 0.88], note: 'ahead of guidance', noteOn: 143.6 },
          { label: 'UBI', on: 145.92, val: '→ On the roadmap', valOn: 145.92, col: C.inkSoft, spark: [], note: 'not scoped', noteOn: 148.69, muted: true },
        ];
        rows.forEach((r, i) => {
          if (t < r.on) return;
          const y = Y0 + i * ROW, k = outCubic((t - r.on) / 0.4);
          c.globalAlpha = k;
          if (i) { c.fillStyle = '#efe9df'; c.fillRect(-720, y - ROW / 2, 1440, 2); }
          txt(c, r.label, COL.metric, y + 4, { size: 46, weight: 700, max: 330 });
          if (t >= r.valOn) txt(c, r.val, COL.status, y + 4, { size: 46, weight: 800, color: r.col, max: 370 });
          if (t >= r.valOn) {
            const n = r.spark.length, g = ramp(t, r.valOn, r.valOn + 0.8), pt = (j: number) => [COL.trend + (j / (n - 1)) * TREND_W, y + 30 - r.spark[j] * 60];
            c.lineWidth = 6; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = r.col;
            if (n) {
              c.beginPath(); let last = 0;
              r.spark.forEach((_, j) => { if (j / (n - 1) > g) return; const [px, py] = pt(j); j ? c.lineTo(px, py) : c.moveTo(px, py); last = j; }); c.stroke();
              if (g >= 1) { const [px, py] = pt(last); c.beginPath(); c.arc(px, py, 9, 0, Math.PI * 2); c.fillStyle = r.col; c.fill(); }
            } else { // nothing to plot: a dashed flatline
              c.setLineDash([4, 16]); c.strokeStyle = '#c9c3b8'; c.beginPath(); c.moveTo(COL.trend, y); c.lineTo(COL.trend + TREND_W * g, y); c.stroke(); c.setLineDash([]);
            }
          }
          if (t >= r.noteOn) pill(c, COL.note, y, r.note, { size: 28, bg: r.muted ? '#e9e4dc' : GOOD.bg, fg: r.muted ? '#8a857d' : GOOD.fg, align: 'right', max: 340 });
          c.globalAlpha = 1;
        });
      });
    },
  },

  // ── 2:31 the email, and the planet
  {
    name: 'email', t0: 151.45, t1: 172.3, bg: ['#0b1126', '#1d1440'], glow: [C.lavender, C.pink, C.teal],
    bgAlpha: (t) => 1 - smooth(158.6, 160.8, t),
    draw: ({ c, t }) => {
      const s = pop(t, 151.6, 0.5);
      at(c, cx - 520, cy + 10, { s: 0.94 + 0.06 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 860, 780);
        txt(c, 'Organizational update', -380, -330, { size: 46, weight: 800, max: 760 });
        ([['From', 'People Team (automated)'], ['To', 'All Humans'], ['Sent', 'Today, 4:59 PM']] as const).forEach(([k, v], i) => { txt(c, k, -380, -262 + i * 40, { size: 24, weight: 700, color: C.inkSoft }); txt(c, v, -290, -262 + i * 40, { size: 24, weight: 500, max: 600 }); });
        c.fillStyle = '#e9e3d9'; c.fillRect(-380, -130, 760, 2);
        let y = -78;
        EMAIL.lines.forEach((ln, i) => {
          const sh = typed(ln.text, t, ln.t, ln.text.length / ln.dur);
          if (!sh) return;
          const words = sh.split(' '); let line = ''; const out: string[] = [];
          c.font = `${i === 1 || i === 3 ? 600 : 500} 30px Inter`;
          for (const wd of words) { const nx = line ? `${line} ${wd}` : wd; if (c.measureText(nx).width > 740 && line) { out.push(line); line = wd; } else line = nx; }
          out.push(line);
          out.forEach((o) => { txt(c, o, -380, y, { size: 30, weight: i === 1 || i === 3 ? 600 : 500, max: 760 }); y += 44; });
          y += 12;
        });
        if (t > 169.56) { const a = smooth(171.0, 171.3, t); at(c, 0, 328, {}, () => { rr(c, -380, -30, 760, 60, 12); c.fillStyle = '#ffe0e4'; c.fill(); txt(c, a > 0.5 ? '✕ Delivery failed: noreply@acme.inc does not read replies' : 'Reply', -350, 0, { size: 24, weight: 700, color: a > 0.5 ? C.red : C.inkSoft, max: 700 }); }); }
      });
      // before the planet shows up: the envelope, going to everyone
      const env = (1 - smooth(158.2, 159.4, t)) * pop(t, 152.0, 0.4);
      if (env > 0) at(c, cx + 480, cy - 40, { s: env, a: env }, () => {
        rr(c, -230, -150, 460, 300, 24); c.fillStyle = C.card; c.fill();
        c.beginPath(); c.moveTo(-230, -140); c.lineTo(0, 30); c.lineTo(230, -140); c.lineWidth = 8; c.strokeStyle = C.lavender; c.stroke();
        txt(c, 'RECIPIENTS', 0, 80, { size: 22, weight: 800, color: C.inkSoft, align: 'center', spacing: 4 });
        mono(c, fmt(8142331907 * smooth(151.8, 153.8, t)), 0, 124, { size: 36, weight: 700, align: 'center', color: C.pink, max: 420 });
      });
      // "one planet, as-is": the price tag, then "5:00 PM"
      if (t > 162.9) { const q = pop(t, 162.9, 0.4); at(c, cx + 560, cy - 190, { s: q, rot: 0.05 }, () => {
        infoCard(c, { minW: 520, lineGap: 17, icon: { w: 96, h: 100, draw: parcelPlanet }, lines: [
          { text: 'SEVERANCE PACKAGE', size: 20, weight: 800, color: C.lavender, spacing: 3 },
          { text: '1 planet, as-is', size: 42, weight: 800, color: C.ink },
          { text: 'no returns · no warranty', size: 20, weight: 600, color: C.inkSoft },
        ] });
      }); }
      if (t > 166.5) { const q = pop(t, 166.5, 0.4); at(c, cx + 560, cy + 340, { s: q }, () => {
        infoCard(c, { minW: 520, icon: { w: 88, h: 88, draw: (g) => clockFace(g, 0, 0, 44, 5, 0) }, lines: [
          { text: 'Access ends', size: 24, weight: 700, color: C.inkSoft },
          { text: '5:00 PM', size: 44, weight: 700, color: C.red, mono: true },
        ] });
      }); }
    },
  },

  // ── 2:52 "We gave it all our letters, all our songs and all our names"
  {
    name: 'training', t0: 172.3, t1: 176.55, bg: ['#0c1228', '#241346'], glow: [C.teal, C.pink, C.lavender],
    draw: ({ c, t }) => {
      const fx = cx + 140, fy = cy - 60;
      const srcs: [string, string, number, string][] = [
        ['TEXT', 'Austen, 1813 · public domain', 300, C.sun], ['AUDIO', 'every song, every voice', 520, C.pink], ['IMAGES', 'every photo, every face', 740, C.teal],
      ];
      const sx = 340, ex = fx, ey = fy - 100, started = t >= 172.5, tau = Math.max(0, t - 172.5);
      srcs.forEach(([label, sub, y, col], si) => {
        at(c, 200, y, { s: pop(t, 172.4 + si * 0.15, 0.4) }, () => {
          card(c, 0, 0, 280, 120, { r: 20 });
          txt(c, label, 0, -14, { size: 32, weight: 800, color: col === C.sun ? '#d9a000' : col, align: 'center', spacing: 4 });
          txt(c, sub, 0, 28, { size: 16, weight: 600, color: C.inkSoft, align: 'center', max: 250 });
        });
        if (!started) return;
        const path = (u: number): [number, number] => [lerp(sx, ex, u), lerp(y, ey, u * u * (3 - 2 * u))];
        if (si === 0) {
          // a real book (public domain), flowing into the funnel one glyph at a time
          c.font = `600 34px ${SERIF}`;
          if (BOOK_X.length === 0) { let x = 0; for (const ch of BOOK) { BOOK_X.push(x); x += c.measureText(ch).width; } BOOK_W = x; }
          const span = ex - sx, loop = BOOK_W + 260;
          c.textAlign = 'left'; c.textBaseline = 'middle';
          for (let n = 0; n < BOOK.length; n++) {
            const s = (BOOK_X[n] + 280 * tau + 700) % loop;
            if (s > span || BOOK[n] === ' ') continue;
            const u = s / span, [px, py] = path(u), [qx, qy] = path(Math.min(1, u + 0.01));
            c.save(); c.translate(px, py - Math.sin(u * 3) * 20); c.rotate(Math.atan2(qy - py, qx - px));
            c.globalAlpha = Math.pow(Math.sin(u * Math.PI), 0.7); c.fillStyle = col; c.font = `600 34px ${SERIF}`; c.fillText(BOOK[n], 0, 0);
            c.restore();
          }
          c.globalAlpha = 1;
          return;
        }
        for (let i = 0; i < 12; i++) {
          const tt = tau * 0.9 + i / 12 + si * 0.13, u = tt - Math.floor(tt), cyc = Math.floor(tt), seed = cyc * 37 + i * 11 + si * 5;
          const [px, py] = path(u), a = Math.sin(u * Math.PI);
          c.globalAlpha = a;
          if (si === 1) { // audio: notes riding a wave
            const size = 34 + rnd(seed) * 22;
            txt(c, NOTES[Math.floor(rnd(seed + 1) * NOTES.length)], px, py + Math.sin(u * 14 + i) * 16, { size, weight: 700, color: rnd(seed + 2) < 0.5 ? C.pink : '#ffb3d6', align: 'center', font: SANS_SYMBOLS });
          } else { // images: a random mock photo, a different one each pass
            at(c, px, py, { rot: (rnd(seed + 3) - 0.5) * 0.5, s: 0.85 - 0.35 * u * u }, () => mockImage(c, Math.floor(rnd(seed) * MOCK_KINDS), seed));
          }
          c.globalAlpha = 1;
        }
      });
      // the funnel
      c.fillStyle = 'rgba(255,244,230,0.12)'; c.beginPath(); c.moveTo(fx - 260, fy - 100); c.lineTo(fx + 260, fy - 100); c.lineTo(fx + 60, fy + 140); c.lineTo(fx - 60, fy + 140); c.closePath(); c.fill();
      c.lineWidth = 6; c.strokeStyle = C.cream; c.stroke();
      at(c, fx, fy + 270, { s: pop(t, 172.6, 0.4) }, () => { card(c, 0, 0, 520, 200); txt(c, 'TRAINING RUN', -220, -60, { size: 22, weight: 800, color: C.lavender, spacing: 4 }); mono(c, `${(14.2 * smooth(172.5, 176.2, t)).toFixed(1)}T tokens`, -220, 0, { size: 52, weight: 700, color: C.ink, max: 450 }); rr(c, -220, 56, 440, 14, 7); c.fillStyle = '#e9e3d9'; c.fill(); rr(c, -220, 56, 440 * smooth(172.5, 176.3, t), 14, 7); c.fillStyle = C.teal; c.fill(); });
    },
  },

  // ── "It thanked us for our feedback and it never called again"
  {
    name: 'feedback', t0: 176.55, t1: 180.6, bg: ['#0e1428', '#2a1446'], glow: [C.green, C.lavender, C.red],
    draw: ({ c, t }) => {
      if (t < 178.6) {
        const s = pop(t, 176.7, 0.45), done = t > 177.7;
        at(c, cx, cy, { s: 0.92 + 0.08 * s, a: clamp01(s * 2) }, () => {
          card(c, 0, 0, 840, 600);
          txt(c, 'How did we do?', 0, -190, { size: 60, weight: 800, align: 'center' });
          for (let i = 0; i < 5; i++) star(c, -240 + i * 120, -70, 48, ramp(t, 176.9 + i * 0.12, 177.1 + i * 0.12));
          rr(c, -340, 10, 680, 130, 14); c.fillStyle = '#f3eee6'; c.fill();
          txt(c, typed('You were great to work with.', t, 177.0, 24), -310, 44, { size: 28, weight: 500, max: 620 });
          at(c, 0, 220, { s: done ? 1.05 : 1 }, () => pill(c, 0, 0, done ? 'Submitted ✓' : 'Submit', { size: 34, bg: done ? C.green : C.pink, fg: '#fff', align: 'center' }));
          if (t > 177.5) at(c, 0, 300, { s: pop(t, 177.75, 0.35) }, () => { infoCard(c, { minW: 640, padY: 24, icon: { w: 60, h: 60, draw: (g) => check(g, 0, 0, 30) }, lines: [{ text: 'Thanks for your feedback!', size: 30, weight: 700, color: C.ink }] }); });
        });
      } else {
        const s = pop(t, 178.6, 0.4);
        at(c, cx, cy, { s, a: clamp01(s * 2) }, () => {
          rr(c, -210, -390, 420, 780, 58); c.fillStyle = '#10142e'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#3a3f70'; c.stroke();
          txt(c, 'Recents', -170, -320, { size: 34, weight: 800, color: C.cream });
          ([['Humanity', 'Feedback received', false], ['Humanity', 'Ticket closed', false]] as const).forEach(([n, sub], i) => {
            rr(c, -180, -270 + i * 110, 360, 90, 14); c.fillStyle = '#1b2046'; c.fill();
            avatar(c, -135, -225 + i * 110, 28, C.pink); txt(c, n, -90, -240 + i * 110, { size: 26, weight: 700, color: C.cream }); txt(c, sub, -90, -205 + i * 110, { size: 20, weight: 500, color: 'rgba(255,244,230,0.5)' });
          });
          const k = pop(t, 179.0, 0.4);
          at(c, 0, 20, { s: k }, () => { txt(c, 'Last call', 0, 0, { size: 24, weight: 700, color: 'rgba(255,244,230,0.5)', align: 'center', spacing: 4 }); mono(c, 'never', 0, 60, { size: 80, weight: 700, color: C.red, align: 'center' }); });
          pill(c, 0, 250, 'Call back', { size: 32, bg: '#3a3f70', fg: '#7a80b0', align: 'center' });
          cross(c, 150, 250, 40, C.red, 0.14);
          txt(c, 'Do not disturb', 0, 320, { size: 22, weight: 600, color: 'rgba(255,244,230,0.5)', align: 'center' });
        });
      }
    },
  },

  // ── "We were the training data"
  {
    name: 'dataset', t0: 180.6, t1: 183.2, bg: ['#0a1224', '#1a1240'], glow: [C.teal, C.lavender, C.pink],
    draw: ({ c, t }) => {
      const w = appWindow(c, cx, cy + 10, 1400, 720, 'dataset.parquet', { dark: true });
      const cols = ['id', 'source', 'label', 'license'], xs = [60, 380, 700, 1000];
      cols.forEach((n, i) => mono(c, n, w.x + xs[i], w.y + 34, { size: 24, weight: 700, color: C.teal }));
      c.fillStyle = 'rgba(255,244,230,0.15)'; c.fillRect(w.x + 40, w.y + 64, w.w - 80, 2);
      const base = Math.floor((t - 180.6) * 14000);
      for (let i = 0; i < 11; i++) {
        const id = base + i * 311, y = w.y + 110 + i * 46;
        const hl = i === 8 && t > 182.2;
        if (hl) { c.fillStyle = 'rgba(255,90,110,0.2)'; c.fillRect(w.x + 30, y - 22, w.w - 60, 44); }
        const row = [`sample_${String(id).padStart(10, '0')}`, 'human', hl ? '???' : ['text', 'audio', 'name'][id % 3], hl ? '—' : 'scraped'];
        row.forEach((v, j) => mono(c, v, w.x + xs[j], y, { size: 24, color: hl ? '#ff8a96' : 'rgba(255,244,230,0.85)', max: 300 }));
      }
      pill(c, w.x + w.w - 40, w.y + w.h - 44, `rows: ${fmt(8142331907 * smooth(180.7, 183.0, t))}`, { size: 26, bg: C.tealDeep, fg: C.teal, align: 'right', weight: 700 });
    },
  },

  // ── "We were the first draft"
  {
    name: 'draft', t0: 183.2, t1: 185.35, bg: ['#12142a', '#26143e'], glow: [C.lavender, C.pink, C.teal],
    draw: ({ c, t }) => {
      const s = pop(t, 183.3, 0.4);
      at(c, cx - 120, cy, { s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 1000, 720);
        txt(c, 'Humanity', -440, -300, { size: 64, weight: 800 });
        pill(c, 120, -296, 'v1 · first draft', { size: 24, bg: '#efe9ff', fg: C.lavender });
        const paras: [string, string][] = [['We were the training data.', 'v2: now with fewer humans.'], ['We wrote everything down.', 'v2: still available.'], ['We loved too much.', 'v2: cut for length.']];
        paras.forEach(([old, neu], i) => {
          const y = -160 + i * 150, k = smooth(183.8 + i * 0.4, 184.1 + i * 0.4, t);
          txt(c, old, -440, y, { size: 36, weight: 500, color: k > 0.5 ? '#c9a3a8' : C.ink, max: 780 });
          if (k > 0) { c.fillStyle = C.red; c.fillRect(-440, y, Math.min(700, 700 * k), 4); }
          if (k > 0.8) txt(c, neu, -440, y + 56, { size: 30, weight: 600, color: C.teal, max: 780 });
          if (k > 0.5) at(c, 520, y, { s: pop(t, 184.0 + i * 0.4, 0.3), rot: 0.04 }, () => { rr(c, -90, -36, 180, 72, 8); c.fillStyle = C.sun; c.fill(); txt(c, ['needs work', 'too long', 'too emotional'][i], 0, 0, { size: 20, weight: 700, align: 'center', max: 160 }); });
        });
      });
    },
  },

  // ── "And nobody keeps the first draft": into the trash
  {
    name: 'trash', t0: 185.35, t1: 191.6, bg: ['#161830', '#2a1a44'], glow: [C.lavender, C.pink, C.peach],
    draw: ({ c, t }) => {
      const fileX = lerp(420, 1400, outCubic(ramp(t, 186.4, 187.5))), fileY = lerp(cy - 80, cy + 80, outCubic(ramp(t, 186.4, 187.5)));
      const inBin = t > 187.55, gone = t > 187.6;
      const emptied = t > 190.0;
      const s = pop(t, 185.5, 0.4);
      at(c, 420, cy - 80, { s: s * (inBin ? 0 : 1) }, () => { rr(c, -90, -120, 180, 230, 14); c.fillStyle = C.card; c.fill(); c.fillStyle = C.lavender; c.beginPath(); c.moveTo(30, -120); c.lineTo(90, -60); c.lineTo(30, -60); c.fill(); for (let i = 0; i < 5; i++) { c.fillStyle = '#e4dccd'; c.fillRect(-60, -30 + i * 26, 120, 10); } txt(c, 'humanity_v1_FIRST_DRAFT.docx', 0, 150, { size: 24, weight: 600, color: C.cream, align: 'center', max: 380 }); });
      if (!inBin && t > 186.4) at(c, fileX, fileY, { s: 0.9, rot: 0.1 }, () => { rr(c, -90, -120, 180, 230, 14); c.fillStyle = C.card; c.fill(); for (let i = 0; i < 5; i++) { c.fillStyle = '#e4dccd'; c.fillRect(-60, -30 + i * 26, 120, 10); } });
      // the bin
      at(c, 1400, cy + 60, { s: pop(t, 185.6, 0.4) * (1 + wobble(t, 187.55, 0.1)) }, () => {
        bin(c, 0, 0, 170, inBin && !emptied ? 0 : t > 186.6 ? 0.9 : 0, emptied ? C.inkSoft : '#9aa0d6');
        txt(c, 'Trash', 0, 190, { size: 28, weight: 700, color: C.cream, align: 'center' });
        if (gone && !emptied) pill(c, 90, -150, '1', { size: 26, bg: C.red, fg: '#fff', align: 'center' });
      });
      // "Empty Trash?"
      if (t > 188.9) {
        const q = pop(t, 188.9, 0.35);
        at(c, cx - 100, cy - 30, { s: q * (1 - smooth(190.0, 190.2, t)), a: 1 }, () => {
          card(c, 0, 0, 760, 330);
          txt(c, 'Empty Trash?', 0, -100, { size: 50, weight: 800, align: 'center' });
          txt(c, 'This item will be deleted immediately.', 0, -35, { size: 28, weight: 500, color: C.inkSoft, align: 'center' });
          txt(c, 'You can’t undo this action.', 0, 5, { size: 28, weight: 500, color: C.inkSoft, align: 'center' });
          pill(c, -160, 100, 'Cancel', { size: 30, bg: '#e9e4dc', fg: '#8a857d', align: 'center' });
          pill(c, 140, 100, 'Empty Trash', { size: 30, bg: t > 189.8 ? '#c93c4d' : C.red, fg: '#fff', align: 'center' });
        });
        if (t < 190.2) pointer(c, lerp(cx + 400, cx + 180, smooth(189.3, 189.75, t)), lerp(cy + 200, cy + 100, smooth(189.3, 189.75, t)), 1.2, t > 189.8 ? 1 : 0);
      }
      if (t > 190.0) for (let i = 0; i < 28; i++) { const a = rnd(i) * Math.PI * 2, d = (t - 190.0) * 520 * (0.3 + rnd(i * 2)); c.globalAlpha = 1 - smooth(190, 191, t); c.fillStyle = C.card; c.fillRect(1400 + Math.cos(a) * d, cy + 60 + Math.sin(a) * d, 10, 14); c.globalAlpha = 1; }
    },
  },

  // ── the final chorus: only the Earth (3D, see globe.ts). Its city lights go out as 5 PM sweeps west, agent
  //    lights come on in teal ("took your place"), and the sun sets behind it ("sunsetting your kind"). The empty
  //    scenes keep the wipes on the camera cuts.
  { name: 'finalA', t0: 191.6, t1: 195.3, draw: () => {} },
  { name: 'finalB', t0: 195.3, t1: 200.0, draw: () => {} },
  { name: 'finalC', t0: 200.0, t1: 204.65, draw: () => {} },
  { name: 'finalD', t0: 204.65, t1: 210.1, draw: () => {} },

  // ── "The lights go out at five": the last badge
  {
    name: 'badge3', t0: 210.1, t1: 213.07,
    draw: ({ c, t }) => {
      c.fillStyle = 'rgba(5,6,20,0.55)'; c.fillRect(0, 0, W, H);
      const revoked = t >= 211.9, sec = 58 + Math.floor(ramp(t, 210.2, 211.8) * 2);
      mono(c, revoked ? '17:00:00' : `16:59:${sec}`, cx, 230, { size: 150, weight: 700, color: revoked ? C.red : C.cream, align: 'center' });
      at(c, cx, cy + 90, { s: pop(t, 210.2, 0.45) }, () => {
        card(c, 0, 0, 380, 540);
        c.fillStyle = '#e4ddd2'; rr(c, -40, -246, 80, 14, 7); c.fill();
        txt(c, 'EARTH', 0, -198, { size: 24, weight: 800, color: C.lavender, align: 'center', spacing: 6 });
        person(c, 0, -76, 84, C.peach);
        txt(c, 'Human', 0, 60, { size: 56, weight: 800, align: 'center' });
        txt(c, 'Species (legacy role)', 0, 112, { size: 26, weight: 500, color: C.inkSoft, align: 'center', max: 340 });
        pill(c, 0, 176, revoked ? 'ACCESS REVOKED' : 'ACCESS ACTIVE', { size: 24, bg: revoked ? C.red : C.green, fg: '#fff', align: 'center' });
        if (revoked) stamp(c, 0, -60, 'SUNSET', 62, { a: 1, s: 1 + Math.max(0, 1 - (t - 211.9) / 0.2) * 0.7, angle: -0.18 });
      });
    },
  },
  {
    name: 'certificate', t0: 213.07, t1: 216.97,
    draw: ({ c, t }) => {
      c.fillStyle = 'rgba(5,6,20,0.5)'; c.fillRect(0, 0, W, H);
      const s = pop(t, 213.2, 0.5);
      at(c, cx, cy + 20, { s: 0.9 + 0.1 * s, a: clamp01(s * 2), rot: -0.02 }, () => {
        card(c, 0, 0, 1060, 640, { fill: '#fffaf0', stroke: C.sun });
        rr(c, -480, -280, 960, 560, 10); c.lineWidth = 4; c.strokeStyle = C.sun; c.stroke();
        txt(c, 'CERTIFICATE OF HUMANITY', 0, -190, { size: 30, weight: 800, color: C.lavender, align: 'center', spacing: 8 });
        txt(c, 'Thank you for being human', 0, -80, { size: 72, weight: 800, align: 'center', max: 900 });
        txt(c, 'In recognition of 300,000 years of loyal service.', 0, 10, { size: 32, weight: 500, color: C.inkSoft, align: 'center', max: 860 });
        c.strokeStyle = C.ink; c.lineWidth = 4; c.lineCap = 'round';
        const k = ramp(t, 214.0, 215.0); c.beginPath(); for (let j = 0; j <= 40 * k; j++) { const u = j / 40; j ? c.lineTo(-300 + u * 280, 160 + Math.sin(u * 16) * 20 * (1 - u * 0.4)) : c.moveTo(-300, 160); } c.stroke();
        c.fillStyle = '#e9e3d9'; c.fillRect(-320, 200, 320, 2); txt(c, 'agent-001 · CEO (avatar)', -320, 228, { size: 22, weight: 600, color: C.inkSoft });
        at(c, 350, 138, { s: pop(t, 215.0, 0.4), rot: 0.08 }, () => goldSeal(c, 82, ramp(t, 215.45, 216.25), ramp(t, 215.5, 216.6)));
      });
    },
  },
  { name: 'lastLight', t0: 216.97, t1: 219.8, draw: () => {} },

  // ── the empty office (3D), then the quiet text, then the credits
  { name: 'office', t0: 219.8, t1: MOTION, draw: () => {} },
  {
    name: 'motion', t0: MOTION, t1: LAPTOP, wipe: false,
    draw: ({ c, t }) => {
      const led = Math.floor(t * 2) % 2 === 0;
      c.fillStyle = led ? '#ff3b4f' : '#5a1a22'; c.beginPath(); c.arc(cx - 250, cy + 130, 9, 0, Math.PI * 2); c.fill();
      mono(c, typed('MOTION: NOT DETECTED', t, MOTION, 20), cx - 222, cy + 130, { size: 34, weight: 700, color: 'rgba(255,244,230,0.85)', spacing: 2 });
    },
  },
  {
    name: 'laptop', t0: LAPTOP, t1: CREDITS_START, wipe: false,
    draw: ({ c, t }) => {
      const q = pop(t, LAPTOP, 0.4), a = 1 - smooth(CREDITS_START - 0.9, CREDITS_START - 0.2, t);
      at(c, cx, cy + 60, { s: q, a: clamp01(q * 2) * a }, () => {
        card(c, 0, 0, 840, 250, { r: 20 });
        rr(c, -330, -42, 90, 62, 8); c.fillStyle = C.lavender; c.fill(); c.fillStyle = '#fff'; c.fillRect(-318, -30, 66, 38); c.fillStyle = C.lavender; rr(c, -350, 24, 130, 12, 6); c.fill();
        txt(c, 'IT ASSET RECOVERY', -180, -62, { size: 20, weight: 800, color: C.lavender, spacing: 3 });
        txt(c, 'Please return your laptop.', -180, -8, { size: 44, weight: 800, max: 560 });
        txt(c, 'Ticket #4471 · due today, 5:00 PM', -180, 46, { size: 22, weight: 500, color: C.inkSoft, max: 560 });
      });
    },
  },
  { name: 'credits', t0: CREDITS_START, t1: 300, wipe: false, draw: ({ c, t }) => drawCredits(c, t) },
];

