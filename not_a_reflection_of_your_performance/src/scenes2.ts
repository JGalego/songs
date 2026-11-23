import {
  agent, appWindow, at, avatarColor, blink, card, check, clamp01, confetti, cross, frame, heart, inCubic, lerp,
  mono, mug, outBack, outCubic, palm, person, pill, plant, pop, ramp, rnd, rr, smiley, smooth, star, stamp, sunset, tooth,
  txt, typed, wobble, fmt,
} from './art';
import { C } from './palette';
import { W, type Scene } from './scene';

const cx = W / 2, cy = 510;
const DARK: [string, string] = ['#000', '#000'];

export const scenes2: Scene[] = [
  // ── 0:43 "This is not a reflection of your performance"
  {
    name: 'review', t0: 42.6, t1: 46.9, bg: ['#0a1228', '#251340'], glow: [C.lavender, C.pink, C.teal],
    draw: ({ c, t }) => {
      const s = pop(t, 42.7, 0.45);
      at(c, cx - 150, cy, { s: 0.9 + 0.1 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 940, 680);
        txt(c, 'Q3 PERFORMANCE REVIEW', -420, -290, { size: 24, weight: 800, color: C.lavender, spacing: 5 });
        txt(c, 'You · Senior Engineer', -420, -225, { size: 52, weight: 800, max: 700 });
        ['Quality of work', 'Delivery', 'Teamwork'].forEach((label, i) => {
          const y = -120 + i * 90;
          txt(c, label, -420, y, { size: 30, weight: 600, color: C.inkSoft });
          for (let j = 0; j < 5; j++) star(c, 60 + j * 70, y, 30, clamp01(ramp(t, 43.0 + i * 0.35 + j * 0.07, 43.2 + i * 0.35 + j * 0.07)));
        });
        c.fillStyle = '#e9e3d9'; c.fillRect(-420, 175, 840, 2);
        pill(c, -420, 245, 'EXCEEDS EXPECTATIONS', { size: 28, bg: C.green, fg: '#fff', max: 520 });
        const p = Math.round(100 * smooth(44.2, 45.0, t));
        mono(c, `${p}%`, 420, 245, { size: 80, weight: 700, color: C.green, align: 'right' });
      });
      // the mirror: it never shows a reflection
      const m = pop(t, 43.9, 0.5);
      at(c, cx + 650, cy, { s: m, a: clamp01(m * 2) }, () => {
        c.beginPath(); c.ellipse(0, 0, 170, 270, 0, 0, Math.PI * 2);
        const g = c.createLinearGradient(-150, -250, 150, 250); g.addColorStop(0, '#dff3ff'); g.addColorStop(1, '#b9c8ff'); c.fillStyle = g; c.fill();
        c.lineWidth = 16; c.strokeStyle = C.sun; c.stroke();
        c.save(); c.beginPath(); c.ellipse(0, 0, 160, 260, 0, 0, Math.PI * 2); c.clip();
        c.globalAlpha = 0.5 * (1 - smooth(44.6, 45.6, t));
        c.scale(-0.2, 0.2); card(c, 0, 0, 940, 680, { shadow: 0 });
        c.restore();
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-70, -120, 22, 90, 0.4, 0, Math.PI * 2); c.fill();
      });
    },
  },

  // ── 0:47 "You were wonderful, you gave it all you had"
  {
    name: 'wonderful', t0: 46.9, t1: 50.45, bg: ['#1a0f36', '#3a1550'], glow: [C.pink, C.sun, C.lavender],
    draw: ({ c, t }) => {
      const fill = t < 49.0 ? smooth(47.0, 48.5, t) : 1 - smooth(49.0, 50.2, t);
      const R = 210, col = fill > 0.5 ? C.teal : fill > 0.2 ? C.sun : C.red;
      const s = pop(t, 47.0, 0.4);
      at(c, cx, cy, { s }, () => {
        c.lineWidth = 46; c.lineCap = 'round'; c.strokeStyle = 'rgba(255,244,230,0.12)'; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 30; c.beginPath(); c.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill); c.stroke(); c.shadowBlur = 0;
        mono(c, `${Math.round(fill * 100)}%`, 0, -10, { size: 130, weight: 700, color: C.cream, align: 'center' });
        txt(c, 'EFFORT', 0, 90, { size: 26, weight: 800, color: 'rgba(255,244,230,0.6)', align: 'center', spacing: 6 });
      });
      // the recognition: a plaque and thank-you notes
      const p = pop(t, 47.4, 0.4);
      at(c, cx - 560, cy - 20, { s: p, rot: -0.06 }, () => { card(c, 0, 0, 380, 440); star(c, 0, -110, 70, 1); txt(c, 'EMPLOYEE OF', 0, 10, { size: 26, weight: 800, color: C.inkSoft, align: 'center', spacing: 3 }); txt(c, 'THE QUARTER', 0, 52, { size: 40, weight: 800, align: 'center', max: 330 }); txt(c, 'You', 0, 130, { size: 34, weight: 700, color: C.pink, align: 'center' }); });
      ['Thanks for everything!', 'Couldn\'t do it without you', 'You\'re the best'].forEach((s2, i) => {
        const q = pop(t, 47.9 + i * 0.35, 0.4);
        at(c, cx + 560, cy - 140 + i * 150, { s: q, rot: (i - 1) * 0.07 }, () => { rr(c, -170, -52, 340, 104, 10); c.fillStyle = [C.sun, C.pink, C.teal][i]; c.fill(); txt(c, s2, 0, 0, { size: 28, weight: 700, color: C.ink, align: 'center', max: 300 }); });
      });
      for (let i = 0; i < 14; i++) { const k = t - 47.3 - i * 0.2; if (k < 0) continue; const x = cx - 700 + rnd(i * 2.1) * 1400, y = 900 - k * 240; c.globalAlpha = 1 - smooth(1.2, 2.2, k); heart(c, x + Math.sin(k * 3 + i) * 20, y, 22, i % 2 ? C.pink : C.peach); c.globalAlpha = 1; }
      confetti(c, t, 47.2, 50, 100, 1820, 140, 520, 5);
    },
  },

  // ── 0:50 "It's just the thing that does your job won't need a dental plan"
  {
    name: 'dental', t0: 50.45, t1: 55.45, bg: ['#0b1a2c', '#1d1740'], glow: [C.teal, C.lavender, C.pink],
    draw: ({ c, t }) => {
      const cols: [number, string, string, string][] = [[cx - 400, 'HUMAN BENEFITS', C.card, C.ink], [cx + 400, 'AGENT BENEFITS', '#0e2b36', C.teal]];
      const rows = ['Health', 'Dental', 'Vision', '401(k)'];
      cols.forEach(([x, title, fill, ink], i) => {
        const s = pop(t, 50.55 + i * 0.1, 0.4);
        at(c, x, cy + 10, { s: 0.9 + 0.1 * s, a: clamp01(s * 2) }, () => {
          card(c, 0, 0, 580, 600, { fill });
          txt(c, title, -240, -255, { size: 26, weight: 800, color: i ? C.teal : C.lavender, spacing: 4 });
          rows.forEach((r, j) => {
            const q = pop(t, 51.0 + j * BEAT, 0.3), y = -150 + j * 110;
            at(c, 0, y, { s: q, a: clamp01(q * 2) }, () => {
              rr(c, -250, -40, 500, 80, 14); c.fillStyle = i ? 'rgba(94,225,214,0.1)' : '#f3eee6'; c.fill();
              if (r === 'Dental') tooth(c, -205, 2, 26); else if (i === 0) c.fillRect(0, 0, 0, 0);
              txt(c, r, -150, 0, { size: 32, weight: 600, color: ink });
              if (i === 0) check(c, 205, 0, 28, C.green); else mono(c, 'n/a', 200, 0, { size: 30, color: 'rgba(94,225,214,0.6)', align: 'right' });
            });
          });
        });
      });
      // "...does your job"
      const a = smooth(52.5, 53.2, t);
      if (a > 0) at(c, lerp(cx + 420, cx, a), cy - 300, { s: pop(t, 52.5, 0.4) }, () => agent(c, 0, 0, 56, t * 0.9));
      // "...won't need a dental plan"
      const g = pop(t, 54.2, 0.45);
      at(c, cx, cy + 10, { s: g, a: clamp01(g * 2) }, () => {
        c.fillStyle = 'rgba(8,10,30,0.7)'; c.beginPath(); c.arc(0, 0, 210, 0, Math.PI * 2); c.fill();
        tooth(c, 0, 0, 150);
        if (t > 54.7) { const k = smooth(54.7, 54.9, t); c.lineWidth = 26; c.lineCap = 'round'; c.strokeStyle = C.red; c.beginPath(); c.moveTo(-140, -140); c.lineTo(-140 + 280 * k, -140 + 280 * k); c.stroke(); }
      });
    },
  },

  // ── 0:55 "So we're sunsetting your role"
  {
    name: 'sunset1', t0: 55.45, t1: 58.85, bg: DARK,
    draw: ({ c, t }) => {
      const p = smooth(55.5, 58.5, t);
      sunset(c, W, 1080, p, { windows: 0.3 + 0.4 * p });
      const bob = Math.sin(t * 2.4) * 8, s = pop(t, 55.6, 0.5);
      at(c, cx, cy - 40 + bob, { s: 0.9 + 0.1 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 760, 360, { fill: `rgba(255,250,243,${1 - 0.45 * p})` });
        txt(c, 'JOB POSTING · ACTIVE', -330, -140, { size: 22, weight: 800, color: C.lavender, spacing: 4 });
        txt(c, 'Senior Engineer', -330, -60, { size: 70, weight: 800, max: 640 });
        txt(c, 'Full-time · Remote · Benefits included', -330, 20, { size: 28, weight: 500, color: C.inkSoft, max: 640 });
        pill(c, -330, 110, p > 0.9 ? 'SUNSET' : 'ROLE', { size: 28, bg: p > 0.9 ? C.red : C.pink, fg: '#fff' });
        person(c, 280, -20, 64, C.pink);
      });
      if (t > 58.2) stamp(c, cx + 180, cy + 60, 'SUNSET', 60, { a: smooth(58.2, 58.32, t), s: 1 + (1 - outBack((t - 58.2) / 0.25)) * 0.7, angle: -0.14 });
    },
  },

  // ── 0:59 "(We're sunsetting your role)" — and the stamps keep coming
  {
    name: 'sunset2', t0: 58.85, t1: 61.0, bg: DARK,
    draw: ({ c, t }) => {
      sunset(c, W, 1080, 0.97, { stars: smooth(58.9, 60.5, t), windows: 0.75 });
      const titles = ['Product Manager', 'Designer', 'Data Analyst', 'QA Engineer', 'Technical Writer', 'Support Lead'];
      titles.forEach((title, i) => {
        const t0 = 58.95 + i * 0.33, k = t - t0; if (k < 0) return;
        const x = cx + (i - 2.5) * 210, y = cy - 20 + (i % 2) * 40 - 30;
        at(c, x, y + wobble(t, t0 + 0.12, 10), { s: outBack(k / 0.25), rot: (rnd(i * 3) - 0.5) * 0.2 }, () => {
          card(c, 0, 0, 280, 360, { r: 20 });
          person(c, 0, -80, 52, avatarColor(i + 1));
          txt(c, title, 0, 20, { size: 28, weight: 800, align: 'center', max: 240 });
          txt(c, 'Role', 0, 60, { size: 22, weight: 500, color: C.inkSoft, align: 'center' });
          if (k > 0.12) stamp(c, 0, 120, 'SUNSET', 38, { a: 1, s: 1 + Math.max(0, 1 - (k - 0.12) / 0.15) * 0.8, angle: -0.12 + i * 0.02 });
        });
      });
    },
  },

  // ── 1:01 "Your badge stops working at five"
  {
    name: 'badge1', t0: 61.0, t1: 63.25, bg: ['#0a0f24', '#1a1238'],
    draw: ({ c, t }) => {
      const sec = 58 + Math.floor(ramp(t, 61.0, 62.6) * 2);
      const revoked = t >= 62.6;
      mono(c, revoked ? '17:00:00' : `16:59:${sec}`, cx, 270, { size: 170, weight: 700, color: revoked ? C.red : C.cream, align: 'center' });
      const bx = lerp(cx - 520, cx - 150, outCubic(ramp(t, 61.05, 61.9)));
      at(c, bx, cy + 110, { rot: -0.05 + wobble(t, 62.6, 0.05) }, () => {
        card(c, 0, 0, 340, 480);
        c.fillStyle = '#e4ddd2'; rr(c, -40, -216, 80, 14, 7); c.fill();
        txt(c, 'ACME INC.', 0, -170, { size: 22, weight: 800, color: C.lavender, align: 'center', spacing: 5 });
        person(c, 0, -50, 82, C.pink);
        txt(c, 'You', 0, 100, { size: 44, weight: 800, align: 'center' });
        txt(c, 'Senior Engineer', 0, 144, { size: 22, weight: 500, color: C.inkSoft, align: 'center' });
        pill(c, 0, 200, revoked ? 'ACCESS REVOKED' : 'ACCESS ACTIVE', { size: 20, bg: revoked ? C.red : C.green, fg: '#fff', align: 'center' });
      });
      // the reader
      const shake = wobble(t, 62.6, 10);
      at(c, cx + 330 + shake, cy + 110, {}, () => {
        card(c, 0, 0, 260, 420, { fill: '#2a2d4a' });
        c.beginPath(); c.arc(0, -90, 54, 0, Math.PI * 2); c.fillStyle = revoked ? C.red : C.green; c.shadowColor = revoked ? C.red : C.green; c.shadowBlur = 36; c.fill(); c.shadowBlur = 0;
        c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(0, 90, 70, Math.PI, 0); c.stroke();
        txt(c, revoked ? 'DENIED' : 'TAP', 0, 170, { size: 36, weight: 800, color: '#fff', align: 'center', spacing: 4 });
      });
      if (revoked) stamp(c, cx + 20, cy + 130, 'ACCESS DENIED', 56, { a: smooth(62.6, 62.7, t), s: 1 + (1 - outBack((t - 62.6) / 0.22)) * 0.6, angle: -0.1 });
    },
  },

  // ── 1:03 "Thank you for the journey"
  {
    name: 'journey', t0: 63.25, t1: 67.0, bg: ['#0c1632', '#2a1446'], glow: [C.sun, C.pink, C.lavender],
    // the career as snakes and ladders: hop, climb the ladder, reach the top row, land on the snake, slide out the door
    draw: ({ c, t }) => {
      const TS = 128, COLS = 7, ROWS = 4, bx0 = cx - 60 - (COLS * TS) / 2, by1 = cy + 40 + (ROWS * TS) / 2;
      const tile = (n: number): [number, number] => {
        const r = Math.floor((n - 1) / COLS), i = (n - 1) % COLS, col = r % 2 ? COLS - 1 - i : i;
        return [bx0 + col * TS + TS / 2, by1 - r * TS - TS / 2];
      };
      const beat = (n: number) => 0.267 + n * BEAT;
      const board = pop(t, 63.25, 0.45);
      // the snakes, head first (Catmull-Rom through the waypoints)
      const curve = (pts: [number, number][], n = 140) => {
        const out: [number, number][] = [];
        for (let i = 0; i < n; i++) {
          const f = (i / (n - 1)) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)), u = f - k;
          const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
          const cr = (a: number, b: number, d: number, e: number) => 0.5 * (2 * b + (-a + d) * u + (2 * a - 5 * b + 4 * d - e) * u * u + (-a + 3 * b - 3 * d + e) * u * u * u);
          out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
        }
        return out;
      };
      const door: [number, number] = [bx0 + COLS * TS + 230, by1];
      const big = curve([tile(22), [1190, 420], [1150, 505], [1250, 565], [1330, 630], [1290, 705], [1380, 772], [1470, 792], [door[0] - 30, by1 - 14]]);
      const small = curve([tile(28), [470, 440], [560, 520], [500, 610], [600, 690], tile(2)], 90);
      const snake = (pts: [number, number][], col: string, band: string, rHead: number, tongue: number) => {
        c.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) {
          for (let i = pts.length - 2; i >= 0; i--) {
            const r = lerp(rHead * 0.82, rHead * 0.22, i / (pts.length - 1));
            c.beginPath(); c.moveTo(...pts[i]); c.lineTo(...pts[i + 1]);
            c.lineWidth = pass ? r * 2 : r * 2 + 6;
            c.strokeStyle = pass ? (Math.floor(i / 9) % 2 ? band : col) : 'rgba(10,12,30,0.35)';
            c.stroke();
          }
        }
        const [hx, hy] = pts[0], a = Math.atan2(pts[0][1] - pts[3][1], pts[0][0] - pts[3][0]);
        c.save(); c.translate(hx, hy); c.rotate(a);
        if (tongue > 0) { c.strokeStyle = C.red; c.lineWidth = 4; c.beginPath(); c.moveTo(rHead, 0); c.lineTo(rHead + 26 * tongue, 0); c.lineTo(rHead + 34 * tongue, -7); c.moveTo(rHead + 26 * tongue, 0); c.lineTo(rHead + 34 * tongue, 7); c.stroke(); }
        c.beginPath(); c.ellipse(0, 0, rHead * 1.25, rHead, 0, 0, Math.PI * 2); c.fillStyle = col; c.fill();
        for (const s of [-1, 1]) {
          c.beginPath(); c.arc(rHead * 0.35, s * rHead * 0.45, rHead * 0.3, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
          c.beginPath(); c.arc(rHead * 0.45, s * rHead * 0.45, rHead * 0.15, 0, Math.PI * 2); c.fillStyle = C.ink; c.fill();
        }
        c.restore();
      };
      const ladder = (a: [number, number], b: [number, number], w = 34) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
        c.lineCap = 'round'; c.strokeStyle = '#c98b4f';
        c.lineWidth = 6;
        for (let d = 24; d < L - 12; d += 30) { const px = a[0] + (dx * d) / L, py = a[1] + (dy * d) / L; c.beginPath(); c.moveTo(px - (nx * w) / 2, py - (ny * w) / 2); c.lineTo(px + (nx * w) / 2, py + (ny * w) / 2); c.stroke(); }
        c.lineWidth = 9; c.strokeStyle = '#e0a868';
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(a[0] + (s * nx * w) / 2, a[1] + (s * ny * w) / 2); c.lineTo(b[0] + (s * nx * w) / 2, b[1] + (s * ny * w) / 2); c.stroke(); }
      };

      // the pawn's route, on the beat: hop, hop, climb, hop ×4, slide, out the door
      type Leg = { a: number; b: number; pos: (u: number) => [number, number]; hop?: boolean };
      const legs: Leg[] = [];
      const hopLeg = (from: number, to: number, land: number) => legs.push({ a: land - 0.24, b: land, hop: true, pos: (u) => { const p = tile(from), q = tile(to); return [lerp(p[0], q[0], u), lerp(p[1], q[1], u)]; } });
      hopLeg(1, 2, beat(117.5)); hopLeg(2, 3, beat(118));
      legs.push({ a: beat(118) + 0.04, b: beat(119), pos: (u) => { const p = tile(3), q = tile(18), e = smooth(0, 1, u); return [lerp(p[0], q[0], e), lerp(p[1], q[1], e)]; } });
      hopLeg(18, 19, beat(119.5)); hopLeg(19, 20, beat(120)); hopLeg(20, 21, beat(120.5)); hopLeg(21, 22, beat(121));
      legs.push({ a: beat(121) + 0.06, b: beat(122.3), pos: (u) => big[Math.min(big.length - 1, Math.floor(inCubic(u) * 0.6 * (big.length - 1) + u * 0.4 * (big.length - 1)))] });
      const out = smooth(beat(122.3), beat(122.7), t);
      let pos = tile(1), lift = 0, squash = 0;
      for (const L of legs) {
        if (t >= L.b) pos = L.pos(1);
        else if (t >= L.a) { const u = (t - L.a) / (L.b - L.a); pos = L.pos(u); if (L.hop) lift = Math.sin(u * Math.PI) * 46; break; }
        else break;
        if (L.hop && t - L.b < 0.12) squash = 1 - (t - L.b) / 0.12;
      }
      if (out > 0) pos = [lerp(door[0] - 30, door[0], out), by1 - 14];

      at(c, cx - 60, cy + 40, { s: 0.9 + 0.1 * board, a: clamp01(board * 2) }, () => {
        c.translate(-(cx - 60), -(cy + 40));
        // the board
        card(c, cx - 60, cy + 40, COLS * TS + 36, ROWS * TS + 36, { r: 24 });
        const tints = ['#fffaf3', '#f1ecff', '#fffaf3', '#ffeef5', '#fffaf3', '#e6f9f6', '#fffaf3', '#fff3da'];
        for (let n = 1; n <= COLS * ROWS; n++) {
          const [x, y] = tile(n);
          c.fillStyle = tints[(n + Math.floor((n - 1) / COLS)) % tints.length]; c.fillRect(x - TS / 2 + 2, y - TS / 2 + 2, TS - 4, TS - 4);
          txt(c, String(n), x - TS / 2 + 12, y - TS / 2 + 20, { size: 18, weight: 700, color: 'rgba(27,29,58,0.28)' });
        }
        ladder(tile(13), tile(26), 30);
        ladder(tile(3), tile(18));
        snake(small, C.lavender, '#8f74ee', 20, 0);
        // the exit: a door off the edge of the board, open while the pawn slides
        const open = smooth(beat(121.4), beat(121.9), t) * (1 - smooth(beat(122.75), beat(123.05), t));
        const [dx, dy] = door;
        rr(c, dx - 70, dy - 220, 140, 220, [10, 10, 0, 0]); c.fillStyle = C.green; c.fill();
        rr(c, dx - 56, dy - 206, 112, 206, [6, 6, 0, 0]); c.fillStyle = open > 0 ? '#ffe3a3' : '#0e2b36'; c.fill();
        c.fillStyle = '#0e2b36';
        c.beginPath(); c.moveTo(dx - 56, dy - 206); c.lineTo(dx - 56 + 112 * (1 - open * 0.8), dy - 206 + 18 * open); c.lineTo(dx - 56 + 112 * (1 - open * 0.8), dy - 18 * open); c.lineTo(dx - 56, dy); c.closePath(); c.fill();
        rr(c, dx - 36, dy - 262, 72, 30, 6); c.fillStyle = C.green; c.fill();
        txt(c, 'EXIT', dx, dy - 247, { size: 18, weight: 800, color: '#fff', align: 'center', spacing: 2 });
        snake(big, C.green, '#2bb07a', 30, t > beat(120.7) && t < beat(122.3) ? 0.6 + 0.4 * Math.sin(t * 30) : 0);
        // the pawn, with its shadow on the board
        if (out < 1) {
          const [px, py] = pos, s = 1 - out * 0.4;
          c.save(); c.globalAlpha = (1 - out) * 0.35;
          c.beginPath(); c.ellipse(px, py + 22, 26 * (1 - lift / 120), 8, 0, 0, Math.PI * 2); c.fillStyle = '#0a0c1e'; c.fill();
          c.restore();
          c.save(); c.globalAlpha = 1 - smooth(0.7, 1, out);
          c.translate(px, py + 22 - lift); c.scale(s * (1 + squash * 0.18), s * (1 - squash * 0.18));
          c.fillStyle = C.pink;
          c.beginPath(); c.ellipse(0, -6, 28, 10, 0, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.moveTo(-24, -8); c.bezierCurveTo(-20, -30, -10, -40, -8, -52); c.lineTo(8, -52); c.bezierCurveTo(10, -40, 20, -30, 24, -8); c.closePath(); c.fill();
          c.beginPath(); c.ellipse(0, -52, 16, 6, 0, 0, Math.PI * 2); c.fillStyle = '#ff9ccb'; c.fill();
          c.beginPath(); c.arc(0, -72, 19, 0, Math.PI * 2); c.fillStyle = C.pink; c.fill();
          c.beginPath(); c.arc(-6, -78, 6, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
          c.restore();
        }
      });
    },
  },

  // ── 1:07 "Have a lovely life" — the desk goes in a box
  {
    name: 'box', t0: 67.0, t1: 70.2, bg: ['#1a1230', '#3a1c48'], glow: [C.peach, C.pink, C.sun],
    draw: ({ c, t }) => {
      type P = [number, number][];
      // one consistent oblique projection: the front face is flat to us, depth goes up and to the right
      const FRONT = { x0: -260, x1: 260, y0: -40, y1: 160 }, DX = 70, DY = -70;
      const slide = smooth(70.02, 70.2, t) * 2200, bx = cx - 45 - slide, by = cy + 110, S = 1.35;
      const close = smooth(68.95, 69.3, t);
      const poly = (pts: P) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
      const mix = (a: P, b: P, k: number): P => a.map(([x, y], i) => [lerp(x, b[i][0], k), lerp(y, b[i][1], k)]);
      const { x0, x1, y0, y1 } = FRONT, bk = y0 + DY;                    // back rim at y = -110
      const backOpen: P = [[x0 + DX, bk], [x1 + DX, bk], [x1 + DX + 15, bk - 120], [x0 + DX - 15, bk - 120]];
      const backShut: P = [[x0 + DX, bk], [x1 + DX, bk], [x1 + DX / 2, bk + 35], [x0 + DX / 2, bk + 35]];
      const frontOpen: P = [[x0, y0], [x1, y0], [x1 + 8, y0 + 80], [x0 - 8, y0 + 80]];
      const frontShut: P = [[x0, y0], [x1, y0], [x1 + DX / 2, bk + 35], [x0 + DX / 2, bk + 35]];
      // what goes in: [lands at, how far its top is above its origin, drawing]
      const items: [number, number, (g: CanvasRenderingContext2D) => void][] = [
        [67.1, 50, (g) => mug(g, 0, 0, 92)], [67.55, 118, (g) => plant(g, 0, 0, 108)], [68.0, 80, (g) => frame(g, 0, 0, 100)],
        [68.45, 28, (g) => { rr(g, -72, -28, 144, 56, 10); g.fillStyle = C.red; g.fill(); g.fillStyle = '#fff'; g.fillRect(-62, -10, 124, 7); }],
      ];
      c.save(); c.translate(bx, by); c.scale(S, S);
      // contact shadow: the box's footprint on the floor, softened and cast a little to the right
      c.save(); c.filter = 'blur(16px)';
      poly([[x0 - 6, y1 - 4], [x1 + 26, y1 - 4], [x1 + DX + 34, y1 + DY - 2], [x0 + DX + 8, y1 + DY - 2]]);
      c.fillStyle = 'rgba(8,4,20,0.55)'; c.fill();
      c.restore();
      c.save(); c.filter = 'blur(5px)';
      c.fillStyle = 'rgba(8,4,20,0.5)'; c.fillRect(x0 + 4, y1 - 4, x1 - x0 + 4, 10);
      c.restore();
      // the open top: the inside of the box
      poly([[x0, y0], [x1, y0], [x1 + DX, bk], [x0 + DX, bk]]); c.fillStyle = '#7d5530'; c.fill();
      // a standing back flap sits behind everything that falls in
      if (close < 0.5) { poly(mix(backOpen, backShut, close)); c.fillStyle = '#b98a54'; c.fill(); }
      // the items drop in and settle with their tops just under the back rim, so they never poke through the lid
      c.save(); c.beginPath(); c.rect(-460, -800, 920, 800 + y0); c.clip();
      items.forEach(([t0, top, fn], i) => {
        const k = ramp(t, t0, t0 + 0.5); if (k <= 0) return;
        const rest = bk + 12 + top, xr = lerp(-170, 190, i / 3) + DX / 2;
        const x = lerp(xr - 60 + (i % 2 ? 140 : -140), xr, outCubic(k)), y = lerp(-640, rest, inCubic(k));
        c.save(); c.translate(x, y); c.rotate((1 - outCubic(k)) * (i % 2 ? 0.7 : -0.7)); fn(c); c.restore();
      });
      c.restore();
      if (close >= 0.5) { poly(mix(backOpen, backShut, close)); c.fillStyle = '#e0b97f'; c.fill(); }
      // the side and the front of the box
      poly([[x1, y0], [x1 + DX, bk], [x1 + DX, y1 + DY], [x1, y1]]); c.fillStyle = '#b48650'; c.fill();
      c.fillStyle = '#c99a62'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
      c.fillStyle = 'rgba(0,0,0,0.07)'; c.fillRect(x0, y1 - 22, x1 - x0, 22);
      poly(mix(frontOpen, frontShut, close)); c.fillStyle = close > 0.5 ? '#ddb579' : '#d3a367'; c.fill();
      // tape along the seam: its ends follow the box's depth, and it wraps over the edge and down the right side
      if (close > 0.92) {
        const d0 = 0.33, d1 = 0.67, D = (x: number, d: number): [number, number] => [x + DX * d, y0 + DY * d];
        const run = 74, rx = x1;
        c.fillStyle = 'rgba(240,226,182,0.92)';
        poly([D(x0, d0), D(rx, d0), D(rx, d1), D(x0, d1)]); c.fill();                         // across the lid
        poly([D(rx, d0), D(rx, d1), [D(rx, d1)[0], D(rx, d1)[1] + run], [D(rx, d0)[0], D(rx, d0)[1] + run]]);
        c.fillStyle = 'rgba(214,196,150,0.92)'; c.fill();                                       // down the side, in its shade
        c.fillStyle = 'rgba(255,255,255,0.25)'; poly([D(x0, d0), D(rx, d0), D(rx, d0 + 0.06), D(x0, d0 + 0.06)]); c.fill();
      }
      // the label, handwritten
      if (t > 69.3) {
        const k = ramp(t, 69.3, 69.75);
        at(c, 0, 92, { s: pop(t, 69.3, 0.3), rot: -0.025 }, () => {
          rr(c, -215, -44, 430, 88, 8); c.fillStyle = '#fffaf0'; c.fill();
          c.save(); c.beginPath(); c.rect(-215, -44, 430 * k, 88); c.clip();
          c.font = 'italic 700 46px "Georgia", serif'; c.fillStyle = '#2a2d4a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Have a lovely life', 0, 3); c.restore();
        });
      }
      c.restore();
    },
  },

  // ── 1:10 the break: the auto-reply
  {
    name: 'autoreply', t0: 70.2, t1: 76.6, bg: ['#0a0f24', '#1d1540'], glow: [C.lavender, C.teal, C.pink],
    draw: ({ c, t }) => {
      const s = pop(t, 70.35, 0.5);
      at(c, cx, cy, { s: 0.92 + 0.08 * s, a: clamp01(s * 2) }, () => {
        const w = appWindow(c, 0, 0, 1160, 680, 'Mail · Settings · Automatic reply');
        txt(c, 'Automatic reply', w.x + 60, w.y + 70, { size: 40, weight: 800 });
        // toggle
        rr(c, w.x + w.w - 190, w.y + 48, 120, 52, 26); c.fillStyle = smooth(70.9, 71.1, t) > 0.5 ? C.green : '#d8d2c6'; c.fill();
        c.beginPath(); c.arc(w.x + w.w - 190 + 26 + 68 * smooth(70.9, 71.1, t), w.y + 74, 20, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
        rr(c, w.x + 60, w.y + 130, w.w - 120, 330, 14); c.fillStyle = '#f3eee6'; c.fill();
        const lines = ['Hi!', 'I no longer work here.', 'For urgent matters, please', 'contact an agent.', '— the person who used to sit here'];
        let used = 0;
        lines.forEach((ln, i) => {
          const sh = typed(ln, t, 71.4 + used / 24, 24); used += ln.length + 4;
          txt(c, sh + (sh.length < ln.length && sh.length > 0 && blink(t) ? '▍' : ''), w.x + 100, w.y + 170 + i * 56, { size: 34, weight: i === 4 ? 400 : 500, color: i === 4 ? C.inkSoft : C.ink, max: w.w - 200 });
        });
        const n = Math.floor(1204 * smooth(73.5, 75.5, t));
        pill(c, w.x + 60, w.y + w.h - 60, `Sent to ${fmt(n)} people`, { size: 24, bg: '#efe9ff', fg: C.lavender });
      });
    },
  },

  // ── 1:17 "Then middle management got flattened into one": a hydraulic press
  {
    name: 'press', t0: 76.6, t1: 81.0, bg: ['#241018', '#3a1a1e'], glow: [C.peach, C.red, C.sun],
    draw: ({ c, t }) => {
      const p = smooth(77.4, 79.7, t), full = 560, n = 8, floorY = cy + 300;
      const flat = 0.04, squash = lerp(1, flat, p * p), lift = smooth(80.0, 80.8, t);
      const plateY = t < 79.9 ? floorY - full * squash - 8 : lerp(floorY - full * flat - 8, floorY - 520, lift);
      const shake = wobble(t, 79.7, 8, 9);
      c.save(); c.translate(shake, 0);
      // the frame, the piston and the plates
      c.fillStyle = '#2f3358'; c.fillRect(cx - 400, 90, 56, floorY + 40 - 90); c.fillRect(cx + 344, 90, 56, floorY + 40 - 90);
      c.fillStyle = '#3d4270'; c.fillRect(cx - 420, 70, 840, 70);
      c.fillStyle = '#58608c'; c.fillRect(cx - 50, 140, 100, Math.max(0, plateY - 20 - 140));
      c.save(); c.beginPath(); c.rect(cx - 50, 140, 100, Math.max(0, plateY - 20 - 140)); c.clip();
      c.fillStyle = C.sun; for (let i = -1; i < 14; i++) { c.beginPath(); c.moveTo(cx - 60, 140 + i * 56); c.lineTo(cx + 60, 140 + i * 56 - 40); c.lineTo(cx + 60, 140 + i * 56 - 12); c.lineTo(cx - 60, 140 + i * 56 + 28); c.fill(); }
      c.restore();
      c.fillStyle = '#4a5086'; rr(c, cx - 340, plateY - 28, 680, 36, 8); c.fill();
      c.fillStyle = '#3d4270'; rr(c, cx - 380, floorY, 760, 50, 8); c.fill();
      // the managers, squashed with the stack
      if (t < 80.1) {
        c.save(); c.translate(cx, floorY); c.scale(1 + p * p * 0.35, squash);
        const titles = ['Engineering Manager', 'Product Manager', 'Design Manager', 'Sales Manager', 'Ops Manager', 'Marketing Manager', 'Data Manager', 'QA Manager'];
        for (let i = 0; i < n; i++) {
          const k = pop(t, 76.7 + i * 0.08, 0.3), h = full / n, y = -(i + 1) * h;
          at(c, 0, y + h / 2, { s: k, a: clamp01(k * 2) }, () => {
            rr(c, -230, -h / 2 + 4, 460, h - 8, 12); c.fillStyle = [C.card, '#fbe8d8', '#f6dfe9'][i % 3]; c.fill();
            person(c, -190, 0, 20, avatarColor(i + 1));
            txt(c, titles[i], -150, 0, { size: 26, weight: 700, max: 360 });
          });
        }
        c.restore();
      }
      // sparks at the impact
      if (t > 79.6 && t < 80.2) for (let i = 0; i < 28; i++) { const a = rnd(i) * Math.PI, d = (t - 79.6) * 800 * (0.4 + rnd(i * 2)); c.fillStyle = C.sun; c.fillRect(cx + Math.cos(a) * d * 1.6, floorY - Math.sin(a) * d, 8, 8); }
      c.restore();
      // ...and what comes out: one
      const o = pop(t, 80.1, 0.45);
      at(c, cx, floorY - 120, { s: o, a: clamp01(o * 2) }, () => { card(c, 0, 0, 560, 130); txt(c, 'MANAGEMENT', -230, -26, { size: 22, weight: 800, color: C.lavender, spacing: 4 }); txt(c, '1 manager', -230, 22, { size: 48, weight: 800 }); heart(c, 210, 0, 24, C.pink); });
    },
  },

  // ── 1:21 "A dashboard with a smiley face that tells us how we've done": the manager is now an analytics app
  {
    name: 'dashboard', t0: 81.0, t1: 85.75, bg: ['#0e1a26', '#1d2144'], glow: [C.sun, C.teal, C.lavender],
    draw: ({ c, t }) => {
      const s = pop(t, 81.05, 0.45);
      at(c, cx, cy + 20, { s: 0.94 + 0.06 * s, a: clamp01(s * 2) }, () => {
        const w = appWindow(c, 0, 0, 1660, 760, 'moodboard.acme.inc / team / overview');
        const L = w.x, T = w.y, R = w.x + w.w;
        // sidebar
        c.save(); rr(c, L, T, 250, w.h, [0, 0, 0, 22]); c.fillStyle = '#1b1f3f'; c.fill(); c.restore();
        smiley(c, L + 52, T + 52, 24);
        txt(c, 'Moodboard', L + 88, T + 52, { size: 26, weight: 800, color: C.cream });
        ['Overview', 'Team', 'Goals', 'Feelings', 'Reports', 'Settings'].forEach((n, i) => {
          const y = T + 130 + i * 62;
          if (i === 0) { rr(c, L + 18, y - 24, 214, 48, 12); c.fillStyle = 'rgba(255,207,110,0.18)'; c.fill(); }
          c.fillStyle = i === 0 ? C.sun : 'rgba(255,244,230,0.35)'; c.fillRect(L + 38, y - 7, 14, 14);
          txt(c, n, L + 68, y, { size: 22, weight: i === 0 ? 700 : 500, color: i === 0 ? C.cream : 'rgba(255,244,230,0.55)' });
        });
        // header
        const X = L + 290;
        txt(c, 'Team overview', X, T + 52, { size: 40, weight: 800 });
        pill(c, R - 230, T + 52, 'Q3 · this quarter ▾', { size: 20, bg: '#efe9de', fg: C.inkSoft, align: 'right', weight: 600 });
        smiley(c, R - 120, T + 52, 26); txt(c, 'Your manager', R - 84, T + 52, { size: 18, weight: 600, color: C.inkSoft, max: 90 });
        // KPI tiles, one per beat
        const tiles: [string, string, string][] = [['Team health', `${Math.round(100 * smooth(81.6, 82.6, t))}%`, C.green], ['Morale', 'Great!', '#d9a000'], ['Engagement', `▲ ${Math.round(12 * smooth(82.2, 83.0, t))}%`, '#2a9d94'], ['Attrition', 'what attrition', C.lavender]];
        const tw = (R - X - 40 - 3 * 24) / 4;
        tiles.forEach(([label, value, col], i) => {
          const q = pop(t, 81.5 + i * BEAT, 0.3), x = X + i * (tw + 24);
          at(c, x + tw / 2, T + 170, { s: q, a: clamp01(q * 2) }, () => {
            rr(c, -tw / 2, -62, tw, 124, 16); c.fillStyle = '#f5f0e8'; c.fill();
            txt(c, label.toUpperCase(), -tw / 2 + 22, -30, { size: 16, weight: 800, color: C.inkSoft, spacing: 2, max: tw - 44 });
            txt(c, value, -tw / 2 + 22, 18, { size: 40, weight: 800, color: col, max: tw - 44 });
          });
        });
        // "how we've done": the smiley gauge
        const gy = T + 440, gx = X + 220;
        const g = pop(t, 82.7, 0.45);
        at(c, gx, gy, { s: g, a: clamp01(g * 2) }, () => {
          rr(c, -200, -200, 400, 400, 18); c.fillStyle = '#f5f0e8'; c.fill();
          txt(c, "HOW WE'VE DONE", -176, -170, { size: 16, weight: 800, color: C.inkSoft, spacing: 2 });
          c.lineWidth = 18; c.lineCap = 'round'; c.strokeStyle = '#e4dccd'; c.beginPath(); c.arc(0, 10, 128, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
          c.strokeStyle = C.green; c.beginPath(); c.arc(0, 10, 128, Math.PI * 0.8, Math.PI * 0.8 + Math.PI * 1.4 * smooth(83.0, 84.2, t)); c.stroke();
          smiley(c, 0, 10, 96, { smile: 0.35 + 0.65 * smooth(83.0, 84.4, t), wink: t > 85.0 });
          const msg = typed('You did great!', t, 83.95, 12);
          txt(c, msg, 0, 165, { size: 30, weight: 800, color: C.green, align: 'center', max: 360 });
        });
        // velocity: up and to the right
        const vx = X + 460, vw = R - vx - 40 - 360 - 24;
        const v = pop(t, 83.2, 0.4);
        at(c, vx + vw / 2, gy, { s: v, a: clamp01(v * 2) }, () => {
          rr(c, -vw / 2, -200, vw, 400, 18); c.fillStyle = '#f5f0e8'; c.fill();
          txt(c, 'VELOCITY', -vw / 2 + 24, -170, { size: 16, weight: 800, color: C.inkSoft, spacing: 2 });
          txt(c, '▲ 340%', vw / 2 - 24, -170, { size: 22, weight: 800, color: C.green, align: 'right' });
          const k = ramp(t, 83.3, 84.6);
          c.strokeStyle = C.teal; c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath();
          for (let i = 0; i <= 40 * k; i++) { const u = i / 40, px = -vw / 2 + 30 + u * (vw - 60), py = 150 - (u * u * 0.9 + 0.08 * Math.sin(u * 12)) * 280; i ? c.lineTo(px, py) : c.moveTo(px, py); }
          c.stroke();
        });
        // headcount: down, with a sticker over it
        const hx = R - 40 - 180;
        const h = pop(t, 83.6, 0.4);
        at(c, hx, gy, { s: h, a: clamp01(h * 2) }, () => {
          rr(c, -180, -200, 360, 400, 18); c.fillStyle = '#f5f0e8'; c.fill();
          txt(c, 'HEADCOUNT', -156, -170, { size: 16, weight: 800, color: C.inkSoft, spacing: 2 });
          const bars = [1.0, 0.95, 0.9, 0.76, 0.6, 0.38];
          bars.forEach((bv, i) => { const bh = bv * 260 * smooth(83.7 + i * 0.06, 84.0 + i * 0.06, t); rr(c, -140 + i * 48, 160 - bh, 32, bh, 6); c.fillStyle = i < 3 ? C.lavender : C.red; c.fill(); });
          mono(c, '1,204 → 402', 0, -120, { size: 28, weight: 700, color: C.red, align: 'center' });
          const st = pop(t, 84.5, 0.25);
          if (st > 0) at(c, 0, 10, { s: 1.6 - 0.6 * st, a: clamp01(st * 3), rot: -0.12 }, () => { c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 12; smiley(c, 0, 0, 120, { smile: 1 }); c.shadowBlur = 0; });
        });
      });
    },
  },

  // ── 1:26 "The CEO held one last town hall, 'we're family,' with a grin"
  {
    name: 'townhall', t0: 85.75, t1: 90.1, bg: ['#12162e', '#2a1840'], glow: [C.pink, C.lavender, C.teal],
    draw: ({ c, t }) => {
      const s = pop(t, 85.85, 0.5);
      at(c, cx, cy, { s: 0.92 + 0.08 * s, a: clamp01(s * 2) }, () => {
        const w = appWindow(c, 0, 0, 1480, 740, 'Town Hall · All Hands');
        const X = w.x, Y = w.y;
        // the main tile
        c.save(); rr(c, X + 30, Y + 20, 880, 610, 20); c.clip(); ceo(c, X + 470, Y + 380, 1.0, { grin: smooth(88.6, 89.9, t), glitch: 0, mesh: 0 }); c.restore();
        pill(c, X + 56, Y + 54, '● LIVE', { size: 22, bg: C.red, fg: '#fff' });
        mono(c, `${fmt(1204 * smooth(85.9, 88.0, t))} watching`, X + 880, Y + 54, { size: 22, color: '#fff', align: 'right' });
        const cap = typed('"We\'re family."', t, 88.5, 11);
        if (cap) { rr(c, X + 330, Y + 560, 280, 50, 12); c.fillStyle = 'rgba(8,10,30,0.8)'; c.fill(); txt(c, cap, X + 470, Y + 585, { size: 28, weight: 600, color: '#fff', align: 'center', max: 260 }); }
        // the audience
        for (let i = 0; i < 15; i++) { const gx = X + 940 + (i % 3) * 170, gy = Y + 60 + Math.floor(i / 3) * 120, q = pop(t, 86.0 + i * 0.07, 0.3); at(c, gx + 55, gy + 40, { s: q }, () => { rr(c, -70, -50, 140, 100, 12); c.fillStyle = ['#2a2d4a', '#322c52', '#26304a'][i % 3]; c.fill(); person(c, 0, 0, 32, avatarColor(i)); }); }
        for (let i = 0; i < 7; i++) { const k = t - 88.0 - i * 0.28; if (k < 0) continue; heart(c, X + 760 + Math.sin(k * 3 + i) * 30, Y + 560 - k * 170, 18, i % 2 ? C.pink : C.peach); }
      });
    },
  },

  // ── 1:30 "Turns out he'd been an avatar since sometime in the spring"
  {
    name: 'avatar', t0: 90.1, t1: 94.45, bg: ['#0a1428', '#0a2030'], glow: [C.teal, C.lavender, C.pink],
    draw: ({ c, t }) => {
      const sw = smooth(91.3, 92.2, t), glitch = Math.max(0, 1 - Math.abs(t - 91.7) / 0.5);
      const tile = (ox: number, oy: number, a: number, tint: string | null) => {
        c.save(); c.globalAlpha *= a; c.translate(ox, oy);
        c.save(); rr(c, cx - 440, cy - 330, 880, 640, 24); c.clip();
        ceo(c, cx, cy + 40, 1.12, { grin: 1, glitch, mesh: sw, tint });
        c.restore(); c.restore();
      };
      card(c, cx, cy - 10, 920, 680, { fill: '#0d1426', r: 30 });
      if (glitch > 0.05) { tile(-16 * glitch, 0, 0.5, null); tile(16 * glitch, 0, 0.5, null); } else tile(0, 0, 1, null);
      // the label
      const q = pop(t, 91.9, 0.4);
      at(c, cx + 520, cy - 150, { s: q }, () => { card(c, 0, 0, 380, 150); txt(c, 'AVATAR v3.2', -160, -30, { size: 28, weight: 800, color: C.teal, spacing: 3 }); txt(c, 'deployed in spring', -160, 22, { size: 32, weight: 700 }); });
      // spring arrives
      const months = ['MAR', 'APR', 'MAY'];
      months.forEach((m, i) => { const on = t > 92.6 + i * 0.35; at(c, cx - 560, cy - 140 + i * 110, { s: pop(t, 92.6 + i * 0.35, 0.3) }, () => { card(c, 0, 0, 210, 84, { fill: on && i === 1 ? C.green : C.card, r: 16, shadow: 18 }); txt(c, m, 0, 0, { size: 34, weight: 800, color: i === 1 ? '#fff' : C.inkSoft, align: 'center' }); }); });
      if (t > 93.66) stamp(c, cx - 560, cy + 150, 'SPRING', 40, { a: smooth(93.66, 93.8, t), color: C.green, angle: -0.1, s: 1 + (1 - outBack((t - 93.66) / 0.25)) * 0.6 });
    },
  },

  // ── 1:34 "They promised us a four-day week ... now it's a zero-day week"
  {
    name: 'week', t0: 94.45, t1: 100.95, bg: ['#0c1d2a', '#27144a'], glow: [C.teal, C.sun, C.pink],
    draw: ({ c, t }) => {
      const s = pop(t, 94.6, 0.5), days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
      const four = t >= 95.92, zeroAt = 99.68;
      const gone = t >= zeroAt ? Math.min(5, Math.floor((t - zeroAt) / 0.16) + 1) : four ? 1 : 0;
      at(c, cx, cy - 40, { s: 0.92 + 0.08 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 1500, 520);
        txt(c, 'THIS WEEK', -680, -210, { size: 24, weight: 800, color: C.inkSoft, spacing: 5 });
        const label = t >= zeroAt ? '0-day week ✓  (as promised)' : four ? '4-day week ✓' : 'Work-life balance update';
        pill(c, 680, -210, label, { size: 28, bg: t >= zeroAt ? C.red : four ? C.green : C.lavender, fg: '#fff', align: 'right', max: 600 });
        days.forEach((d, i) => {
          const x = -560 + i * 280, off = 4 - i < gone, fri = i === 4;
          rr(c, x - 120, -150, 240, 330, 20); c.fillStyle = off ? '#efe9e0' : '#efe9ff'; c.fill();
          txt(c, d, x, -110, { size: 34, weight: 800, color: off ? '#cfc8bd' : C.lavender, align: 'center' });
          if (fri && four && gone <= 1) { palm(c, x, 40, 100, 0); c.fillStyle = C.sun; c.beginPath(); c.arc(x + 70, -50, 28, 0, Math.PI * 2); c.fill(); txt(c, 'OFF', x, 150, { size: 28, weight: 800, color: C.green, align: 'center', spacing: 4 }); }
          else if (off) { palm(c, x, 40, 100, 1); cross(c, x, 40, 160, C.red, 0.1); }
          else { for (let j = 0; j < 3; j++) { rr(c, x - 80, -50 + j * 56, 160, 36, 10); c.fillStyle = [C.pink, C.teal, C.peach][(i + j) % 3]; c.fill(); } }
        });
      });
    },
  },

  // ── 1:41 "And the board signed off at three a.m."
  {
    name: 'threeAm', t0: 100.95, t1: 105.4, bg: ['#04060f', '#0c1030'], glow: [C.lavender, '#3b4fa0', C.teal],
    draw: ({ c, t }) => {
      // a sleeping moon (the only one in the building who is)
      at(c, 300, 280, { s: pop(t, 101.1, 0.5) }, () => {
        // the crescent as one shape (so the glow follows it): the moon's outer arc, back along the shadow disc's arc
        const R1 = 90, ox = 40, oy = -20, R2 = 80, d = Math.hypot(ox, oy), a = (R1 * R1 - R2 * R2 + d * d) / (2 * d), h = Math.sqrt(R1 * R1 - a * a);
        const px = (a * ox) / d, py = (a * oy) / d, ux = -oy / d, uy = ox / d;
        const i1: [number, number] = [px + h * ux, py + h * uy], i2: [number, number] = [px - h * ux, py - h * uy];
        const t1 = Math.atan2(i1[1], i1[0]), t2 = Math.atan2(i2[1], i2[0]);
        c.save();
        c.beginPath();
        c.arc(0, 0, R1, t1, t2 < t1 ? t2 + Math.PI * 2 : t2);
        c.arc(ox, oy, R2, Math.atan2(i2[1] - oy, i2[0] - ox), Math.atan2(i1[1] - oy, i1[0] - ox), true);
        c.closePath();
        c.fillStyle = '#fff6d8'; c.shadowColor = '#fff6d8'; c.shadowBlur = 60; c.fill();
        c.restore();
        c.strokeStyle = '#c9b98e'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.arc(-58, 18, 13, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();               // closed eye
        c.beginPath(); c.moveTo(-70, 18); c.lineTo(-76, 26); c.moveTo(-58, 31); c.lineTo(-58, 39); c.stroke(); // lashes
      });
      // Z's rise from it, one per beat: each swells, sways, tilts and fades as it drifts up
      for (let n = Math.floor((t - 101.3) / BEAT) - 5; n <= Math.floor((t - 101.3) / BEAT); n++) {
        const age = t - (101.3 + n * BEAT); if (age < 0 || age > 2.6 || n < 0) continue;
        const u = age / 2.6, x = 350 + u * 230 + Math.sin(age * 3 + n) * 22, y = 230 - u * 230;
        const a = smooth(0, 0.12, u) * (1 - smooth(0.55, 1, u));
        at(c, x, y, { s: 0.5 + u * 0.9, rot: -0.25 + Math.sin(age * 2.4 + n) * 0.22, a }, () => {
          c.shadowColor = 'rgba(167,139,250,0.9)'; c.shadowBlur = 18;
          txt(c, 'Z', 0, 0, { size: 52, weight: 800, color: n % 3 === 1 ? '#d9ccff' : '#fff1d6', align: 'center' });
          c.shadowBlur = 0;
        });
      }
      const s = pop(t, 101.1, 0.5);
      at(c, cx, cy, { s: 0.92 + 0.08 * s, a: clamp01(s * 2) }, () => {
        rr(c, -210, -380, 420, 760, 56); c.fillStyle = '#10142e'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#3a3f70'; c.stroke();
        mono(c, '03:00', 0, -270, { size: 120, weight: 700, color: C.cream, align: 'center' });
        txt(c, 'Tuesday', 0, -190, { size: 28, weight: 600, color: C.inkSoft, align: 'center' });
        rr(c, -180, -140, 360, 120, 20); c.fillStyle = C.card; c.fill();
        txt(c, 'BOARD · RESOLUTION #7', -150, -112, { size: 17, weight: 800, color: C.lavender, spacing: 2, max: 320 });
        txt(c, 'Please sign to approve', -150, -76, { size: 28, weight: 700, max: 320 });
        txt(c, 'restructuring, effective now', -150, -44, { size: 20, weight: 500, color: C.inkSoft, max: 320 });
        // the signatures: one groggy human scrawl, then two agents sign instantly, each with its own exact figure
        const line = (pts: [number, number][], upto: number) => {
          const n = Math.floor(pts.length * clamp01(upto)); if (n < 2) return;
          c.beginPath(); c.moveTo(...pts[0]); for (let j = 1; j < n; j++) c.lineTo(...pts[j]); c.stroke();
        };
        // human: a slanted cursive "M. Okafor"-ish scrawl (a tall capital, uneven letters, a dot), then an underline
        // flourish swept back under it; signed slowly and a little shakily
        const hy = 44, human: [number, number][] = [];
        const slant = (x: number, y: number): [number, number] => [x - (y - hy) * 0.35, y];
        // the capital: up, down, up, down
        [[-140, 8], [-128, -34], [-116, 6], [-104, -30], [-94, 10]].forEach(([x, y], i, a) => {
          if (!i) return; const [x0, y0] = a[i - 1];
          for (let j = 0; j < 10; j++) { const u = j / 10; human.push(slant(lerp(x0, x, u), hy + lerp(y0, y, u) + Math.sin(u * Math.PI) * 3)); }
        });
        // the rest: loops of uneven height and width, one tall ascender, an "f"-like descender near the end
        const heights = [0.55, 0.5, 1.5, 0.6, 0.45, -1.2, 0.55, 0.5], widths = [26, 22, 28, 24, 20, 26, 22, 24];
        let x = -84;
        heights.forEach((hgt, i) => {
          for (let j = 0; j < 22; j++) {
            const a = (j / 22) * Math.PI * 2, w = widths[i];
            human.push(slant(x + (j / 22) * w + Math.sin(a) * w * 0.3, hy + 8 - (1 - Math.cos(a)) * 0.5 * 26 * hgt + Math.sin(j * 1.9 + i) * 0.7));
          }
          x += widths[i];
        });
        for (let j = 0; j <= 30; j++) { const u = j / 30; human.push([x + 6 + u * 22, hy + 6 - Math.sin(u * Math.PI) * 6]); } // the tail
        for (let j = 0; j <= 40; j++) { const u = j / 40; human.push([x + 28 - u * 290, hy + 22 + Math.sin(u * Math.PI) * 8 - u * 6]); } // underline
        c.strokeStyle = C.cream; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
        line(human, ramp(t, 101.5, 102.95));
        // agents: damped harmonograph figures, hundreds of exact strokes, drawn in a blink
        const agentSig = (seed: number, y: number): [number, number][] => {
          const f1 = 2 + (seed % 3), f2 = 3 + ((seed * 7) % 4) + 0.02, p = seed * 1.3, pts: [number, number][] = [];
          for (let j = 0; j <= 600; j++) {
            const s = (j / 600) * 40, d = Math.exp(-s * 0.035);
            pts.push([Math.sin(f1 * s * 0.5 + p) * 120 * d + Math.sin(f2 * s * 0.5) * 30 * d, y + Math.sin(f2 * s * 0.5 + p * 0.7) * 24 * d + Math.cos(f1 * s * 0.25) * 6 * d]);
          }
          return pts;
        };
        const sigs = [{ y: 40, who: 'M. Okafor', meta: '' }, { y: 140, who: 'agent-085', meta: '0x9f3a… · 3 ms', seed: 5, at: 103.0 }, { y: 240, who: 'agent-0122', meta: '0x41d0… · 2 ms', seed: 11, at: 103.27 }];
        sigs.forEach((g, i) => {
          if (i > 0) {
            const k = ramp(t, g.at!, g.at! + 0.18);
            c.save(); c.strokeStyle = C.teal; c.lineWidth = 1.4; c.shadowColor = C.teal; c.shadowBlur = k < 1 ? 14 : 6; c.globalAlpha = 0.9;
            line(agentSig(g.seed!, g.y), k);
            c.restore();
            if (k >= 1) mono(c, g.meta, 150, g.y + 52, { size: 13, color: 'rgba(94,225,214,0.65)', align: 'right', alpha: smooth(g.at! + 0.18, g.at! + 0.35, t) });
          }
          c.fillStyle = 'rgba(255,244,230,0.3)'; c.fillRect(-150, g.y + 32, 300, 2);
          txt(c, g.who, -150, g.y + 52, { size: 16, weight: 600, color: 'rgba(255,244,230,0.5)' });
        });
      });
      if (t > 104.1) stamp(c, cx + 20, cy + 40, 'APPROVED 3–0', 52, { a: smooth(104.1, 104.2, t), s: 1 + (1 - outBack((t - 104.1) / 0.22)) * 0.6, color: C.green, angle: -0.16 });
    },
  },

  // ── 1:45 "(The board is mostly them)"
  {
    name: 'boardAgents', t0: 105.4, t1: 107.5, bg: ['#1a1230', '#2b1a48'], glow: [C.sun, C.teal, C.pink],
    draw: ({ c, t }) => {
      for (let i = 0; i < 7; i++) {
        const x = cx + (i - 3) * 250, s = pop(t, 105.5 + i * 0.1, 0.35);
        const flip = i === 0 ? 0 : smooth(106.3 + i * 0.12, 106.65 + i * 0.12, t);
        const sx = Math.abs(Math.cos(flip * Math.PI)), isAgent = flip >= 0.5;
        at(c, x, cy, { s, sx }, () => {
          rr(c, -105, -150, 210, 300, 12); c.fillStyle = C.sun; c.fill();
          rr(c, -88, -133, 176, 266, 6); c.fillStyle = isAgent ? '#0e2b36' : '#fff4e6'; c.fill();
          if (isAgent) agent(c, 0, -20, 52, t * 0.9); else person(c, 0, -20, 56, avatarColor(i + 2));
          txt(c, isAgent ? `agent-0${40 + i * 11}` : ['M. Okafor', 'J. Lindqvist', 'R. Tanaka', 'A. Moreau', 'S. Brennan', 'K. Adeyemi', 'P. Nair'][i], 0, 80, { size: 20, weight: 700, color: isAgent ? C.teal : C.ink, align: 'center', max: 160 });
          txt(c, 'Board', 0, 108, { size: 17, weight: 500, color: isAgent ? 'rgba(94,225,214,0.6)' : C.inkSoft, align: 'center' });
        });
      }
    },
  },
];

const BEAT = 60 / 110.98;

/**
 * The CEO, in flat illustration: side-parted hair going grey at the temples, a big confident grin, a headset mic,
 * and the uniform (light-blue shirt, charcoal quarter-zip vest). With `mesh`, he turns out to be a wireframe.
 */
function ceo(c: CanvasRenderingContext2D, x: number, y: number, s: number, o: { grin: number; glitch: number; mesh: number; tint?: string | null }) {
  const m = o.mesh > 0.5;
  const skin = m ? '#0e2b36' : '#e9b48f', shade = m ? '#0b2430' : '#d49b77', hair = m ? '#0b2430' : '#3a2a24';
  const path = (pts: number[][], close = true) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 2 ? c.lineTo(p[0], p[1]) : c.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]); if (close) c.closePath(); };
  c.save(); c.translate(x, y); c.scale(s, s);
  // the stage
  const bg = c.createLinearGradient(0, -340, 0, 300); bg.addColorStop(0, '#2f2c58'); bg.addColorStop(1, '#17172f');
  c.fillStyle = bg; c.fillRect(-470, -350, 940, 660);
  const spot = c.createRadialGradient(0, -110, 0, 0, -110, 430); spot.addColorStop(0, 'rgba(255,240,220,0.16)'); spot.addColorStop(1, 'rgba(255,240,220,0)');
  c.fillStyle = spot; c.fillRect(-470, -350, 940, 660);
  txt(c, 'ACME', -300, -250, { size: 90, weight: 800, color: 'rgba(255,255,255,0.06)', align: 'center', spacing: 8 });
  // shirt (shoulders and sleeves), then the vest over it
  c.fillStyle = m ? '#11384a' : '#a9cdeb';
  path([[-300, 320], [-300, 200, -250, 130, -110, 112], [110, 112], [250, 130, 300, 200, 300, 320]]); c.fill();
  c.fillStyle = m ? '#0e2b36' : '#3b4152';
  path([[-210, 320], [-220, 210, -190, 150, -120, 128], [-46, 104], [46, 104], [120, 128], [190, 150, 220, 210, 210, 320]]); c.fill();
  c.fillStyle = m ? '#0e2b36' : '#454c60';
  path([[-62, 96], [-48, 132], [0, 150], [48, 132], [62, 96], [30, 86], [0, 96], [-30, 86]]); c.fill(); // the vest's collar
  c.strokeStyle = m ? C.teal : '#c9ced8'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 150); c.lineTo(0, 320); c.stroke();
  c.fillStyle = m ? C.teal : '#d6dbe4'; rr(c, -6, 150, 12, 26, 4); c.fill();
  c.fillStyle = m ? '#11384a' : '#e7f0f9'; path([[-30, 86], [-6, 118], [0, 96]]); c.fill(); path([[30, 86], [6, 118], [0, 96]]); c.fill(); // shirt collar points
  // neck and ears
  c.fillStyle = shade; rr(c, -40, 20, 80, 90, 18); c.fill();
  c.fillStyle = skin; c.beginPath(); c.ellipse(-112, -92, 17, 27, 0, 0, Math.PI * 2); c.ellipse(112, -92, 17, 27, 0, 0, Math.PI * 2); c.fill();
  // head
  c.fillStyle = skin;
  path([[-112, -120], [-116, -232, 116, -232, 112, -120], [110, -40, 70, 34, 0, 42], [-70, 34, -110, -40, -112, -120]]); c.fill();
  // hair: a side part with volume, grey at the temples
  c.fillStyle = hair;
  path([[-120, -104], [-128, -190, -60, -232, 10, -230], [90, -230, 132, -190, 120, -104], [114, -130, 108, -150, 96, -160], [60, -186, 0, -184, -38, -172], [-70, -164, -100, -148, -108, -108]]); c.fill();
  if (!m) {
    c.fillStyle = '#5a4338'; path([[-38, -172], [0, -200, 60, -214, 100, -198], [60, -200, 10, -192, -38, -172]]); c.fill();
    c.fillStyle = 'rgba(178,183,192,0.85)'; path([[-120, -104], [-122, -130], [-110, -146], [-108, -108]]); c.fill(); path([[120, -104], [122, -130], [104, -152], [108, -108]]); c.fill();
  }
  // face
  c.strokeStyle = m ? C.teal : '#2b201c'; c.lineCap = 'round'; c.lineWidth = 10;
  c.beginPath(); c.moveTo(-78, -122); c.quadraticCurveTo(-54, -136, -28, -126); c.moveTo(78, -122); c.quadraticCurveTo(54, -136, 28, -126); c.stroke();
  c.fillStyle = m ? C.teal : '#2b201c'; c.beginPath(); c.ellipse(-52, -96, 9, 11, 0, 0, Math.PI * 2); c.ellipse(52, -96, 9, 11, 0, 0, Math.PI * 2); c.fill();
  if (!m) { c.fillStyle = '#fff'; c.beginPath(); c.arc(-49, -100, 3, 0, Math.PI * 2); c.arc(55, -100, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,110,110,0.18)'; c.beginPath(); c.arc(-66, -46, 22, 0, Math.PI * 2); c.arc(66, -46, 22, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = m ? C.teal : 'rgba(140,80,60,0.55)'; c.lineWidth = 5; c.beginPath(); c.moveTo(6, -92); c.quadraticCurveTo(-8, -58, 2, -52); c.quadraticCurveTo(10, -50, 14, -54); c.stroke();
  // the grin
  const g = 0.3 + 0.7 * o.grin, my = -22;
  c.fillStyle = m ? '#0b2430' : '#6b2633';
  path([[-58, my], [-30, my + 10, 30, my + 10, 58, my], [40, my + 62 * g, -40, my + 62 * g, -58, my]]); c.fill();
  c.save(); path([[-58, my], [-30, my + 10, 30, my + 10, 58, my], [40, my + 62 * g, -40, my + 62 * g, -58, my]]); c.clip();
  c.fillStyle = m ? C.teal : '#fffaf3'; c.fillRect(-60, my - 4, 120, 10 + 16 * g); c.restore();
  c.strokeStyle = m ? C.teal : '#2b201c'; c.lineWidth = 5;
  path([[-58, my], [-30, my + 10, 30, my + 10, 58, my], [40, my + 62 * g, -40, my + 62 * g, -58, my]]); c.stroke();
  // headset mic
  c.strokeStyle = m ? C.teal : '#1d1f2e'; c.lineWidth = 5; c.beginPath(); c.moveTo(118, -80); c.quadraticCurveTo(110, -20, 66, -14); c.stroke();
  c.fillStyle = m ? C.teal : '#1d1f2e'; rr(c, 52, -22, 22, 14, 7); c.fill();
  // the wireframe, when he turns out to be an avatar
  if (o.mesh > 0) {
    c.globalAlpha *= o.mesh; c.strokeStyle = C.teal; c.lineWidth = 2;
    const pts: [number, number][] = [];
    for (let r = 0; r < 6; r++) for (let a = 0; a < 12; a++) { const ang = (a / 12) * Math.PI * 2 + (r % 2) * 0.26, rad = r / 5; pts.push([Math.cos(ang) * rad * 108, -96 + Math.sin(ang) * rad * 132]); }
    for (let i = 0; i < pts.length; i++) for (const j of [i + 1, i + 12, i + 13]) if (pts[j] && Math.floor(j / 12) - Math.floor(i / 12) <= 1 && !(j === i + 1 && j % 12 === 0)) { c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); c.stroke(); }
    c.fillStyle = C.teal; for (const [px, py] of pts) c.fillRect(px - 2.5, py - 2.5, 5, 5);
    c.globalAlpha /= o.mesh || 1;
  }
  if (o.glitch > 0) for (let i = 0; i < 8; i++) { const gy = -330 + rnd(i + Math.floor(o.glitch * 9)) * 640; c.fillStyle = i % 2 ? 'rgba(255,90,110,0.5)' : 'rgba(94,225,214,0.5)'; c.fillRect(-470, gy, 940, 10 + rnd(i * 3) * 20); }
  c.restore();
}

