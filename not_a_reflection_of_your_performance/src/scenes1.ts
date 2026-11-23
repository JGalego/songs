import {
  agent, appWindow, at, avatar, avatarColor, blink, card, check, clamp01, confetti, cross, gradCap, lerp, mono, outBack,
  person, pill, pointer, pop, ramp, rnd, rr, smooth, stamp, txt, typed, fmt, wobble,
} from './art';
import { C } from './palette';
import { H, W, type Scene } from './scene';

const NAVY: [string, string] = [C.bgTop, C.bgBottom];
const cx = W / 2, cy = H / 2 - 30;
const BEAT = 60 / 110.98;

export const scenes1: Scene[] = [
  // ── 0:00 "Hi team! Got 15 minutes? It's nothing bad."
  {
    name: 'invite', t0: 0, t1: 7.4, bg: NAVY, wipe: false,
    draw: ({ c, t }) => {
      const open = pop(t, 0.3, 0.5), w = 1000, h = 620;
      at(c, cx, cy, { s: 0.88 + 0.12 * open, a: clamp01(open * 2) }, () => {
        card(c, 0, 0, w, h);
        c.save(); rr(c, -w / 2, -h / 2, w, 72, [26, 26, 0, 0]); c.fillStyle = C.lavender; c.fill(); c.restore();
        txt(c, 'CALENDAR INVITE', -w / 2 + 44, -h / 2 + 36, { size: 22, weight: 800, color: '#fff', spacing: 4 });
        txt(c, 'from People Team', w / 2 - 44, -h / 2 + 36, { size: 22, weight: 500, color: 'rgba(255,255,255,0.85)', align: 'right' });
        txt(c, 'Quick sync', -w / 2 + 50, -h / 2 + 132, { size: 76, weight: 800 });
        txt(c, 'Today · 4:45 – 5:00 PM · Room B4 (the small one)', -w / 2 + 50, -h / 2 + 192, { size: 26, weight: 500, color: C.inkSoft, max: w - 100 });
        rr(c, -w / 2 + 50, -h / 2 + 226, w - 100, 150, 16); c.fillStyle = '#f3eee6'; c.fill();
        const n1 = typed('Hi team! Got 15 minutes?', t, 1.0, 14), n2 = typed("It's nothing bad.", t, 5.44, 14);
        txt(c, n1 + (n2 || t > 4 ? '' : blink(t) ? '▍' : ''), -w / 2 + 76, -h / 2 + 276, { size: 32, weight: 500, max: w - 152 });
        if (n2 || t > 5.2) txt(c, n2 + (t < 6.7 && blink(t) ? '▍' : ''), -w / 2 + 76, -h / 2 + 330, { size: 32, weight: 500, max: w - 152 });
        // the other attendees join, one per beat
        for (let i = 0; i < 10; i++) { const s = pop(t, 1.4 + i * 0.2, 0.3); if (s > 0) { at(c, -w / 2 + 84 + i * 50, -h / 2 + 424, { s }, () => avatar(c, 0, 0, 24, avatarColor(i + 2))); } }
        if (t > 3.4) pill(c, -w / 2 + 84 + 10 * 50 + 6, -h / 2 + 424, `+${fmt(Math.min(1194, (t - 3.4) * 700))} others`, { size: 22, bg: '#efe9ff', fg: C.lavender, max: 260 });
        const accepted = t >= 6.7, by = h / 2 - 62;
        pill(c, -w / 2 + 50, by, accepted ? '✓ Accepted' : 'Accept', { size: 26, bg: accepted ? C.green : C.pink, fg: '#fff' });
        const dw = pill(c, -w / 2 + 250, by, 'Decline', { size: 26, bg: '#e9e4dc', fg: '#b3ada3' });
        txt(c, '(not available for this event)', -w / 2 + 250 + dw + 18, by, { size: 20, weight: 500, color: '#a8a39b', max: 320 });
        // the pointer goes for Accept
        const p = smooth(5.6, 6.6, t);
        if (t > 5.4) pointer(c, lerp(260, -w / 2 + 120, p), lerp(-40, by + 8, p), 1.2, t >= 6.65 ? 1 : 0);
      });
    },
  },

  // ── 0:07 the whole day is meetings
  {
    name: 'planner', t0: 7.4, t1: 15.9, bg: NAVY,
    draw: ({ c, t, k }) => {
      const meetings: [string, string, number, number][] = [
        ['Standup', C.lavender, 9, 0.5], ['Sprint planning', C.pink, 9.5, 1.5], ['1:1 with your manager', C.peach, 11, 1],
        ['Lunch & learn (mandatory)', C.teal, 12, 1], ['Sync on the sync', '#8ec5ff', 13, 1], ['Retro for the retro', C.sun, 14, 1],
        ['Planning for planning', C.green, 15, 1.5], ['Quick sync', C.red, 16.5, 0.5],
      ];
      const px = cx - 330, top = 238, hh = 84, w = 780;
      card(c, px, cy + 20, w, 8 * hh + 130);
      txt(c, 'TODAY', px - w / 2 + 44, top - 34, { size: 24, weight: 800, color: C.lavender, spacing: 5 });
      for (let h = 9; h <= 17; h++) {
        const y = top + (h - 9) * hh;
        txt(c, `${h}:00`, px - w / 2 + 44, y, { size: 20, weight: 600, color: C.inkSoft });
        c.fillStyle = '#e9e3d9'; c.fillRect(px - w / 2 + 124, y, w - 160, 2);
      }
      meetings.forEach(([name, col, start, len], i) => {
        const s = pop(t, 7.7 + i * BEAT, 0.3);
        if (s <= 0) return;
        const y = top + (start - 9) * hh + 6, hgt = len * hh - 10;
        at(c, px + 40, y + hgt / 2, { s: 0.85 + 0.15 * s, a: clamp01(s * 2) }, () => {
          rr(c, -w / 2 + 124 - 40 + 40, -hgt / 2, w - 190, hgt, 12);
          c.fillStyle = col; c.fill();
          txt(c, name, -w / 2 + 160, 0, { size: 26, weight: 700, color: '#fff', max: w - 260 });
        });
      });
      // a wall clock ticks from 4:45 to five; the red wedge is the time left
      const p = ramp(t, 9, 15.4) * 15, m = Math.floor(p), f = p - m;
      const minute = 45 + m + (m > 0 && m < 15 && f < 0.2 ? outBack(f / 0.2) - 1 : 0); // each tick overshoots a little
      const rx = cx + 470, ry = cy + 20, R = 250, A = (v: number) => (v / 60) * Math.PI * 2 - Math.PI / 2;
      const shake = wobble(t, 15.4, 0.05, 6); // it hits five
      at(c, rx, ry, { s: pop(t, 7.6, 0.45), rot: shake }, () => {
        c.save();
        c.shadowColor = 'rgba(5,6,20,0.5)'; c.shadowBlur = 50; c.shadowOffsetY = 16;
        c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fillStyle = C.card; c.fill();
        c.restore();
        c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.lineWidth = 14; c.strokeStyle = C.ink; c.stroke();
        if (minute < 60) {
          c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R * 0.9, A(minute), A(60)); c.closePath();
          c.fillStyle = 'rgba(255,90,110,0.16)'; c.fill();
          c.beginPath(); c.arc(0, 0, R * 0.9, A(minute), A(60)); c.lineWidth = 8; c.strokeStyle = C.red; c.lineCap = 'round'; c.stroke();
        }
        for (let i = 0; i < 60; i++) {
          const a = A(i), big = i % 5 === 0, r0 = R * (big ? 0.74 : 0.8);
          c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
          c.lineWidth = big ? 7 : 2.5; c.lineCap = 'round'; c.strokeStyle = big ? C.ink : '#c9c2b6'; c.stroke();
        }
        const hand = (a: number, len: number, tail: number, w: number, col: string) => {
          c.beginPath(); c.moveTo(-Math.cos(a) * tail, -Math.sin(a) * tail); c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
          c.lineWidth = w; c.lineCap = 'round'; c.strokeStyle = col; c.stroke();
        };
        hand(A((4 + minute / 60) * 5), R * 0.46, R * 0.08, 16, C.ink);
        hand(A(minute), R * 0.7, R * 0.1, 10, C.ink);
        if (m < 15) hand(A(f * 60), R * 0.78, R * 0.18, 3.5, C.red);
        c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fillStyle = C.red; c.fill();
        c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fillStyle = C.card; c.fill();
      });
      void k;
    },
  },

  // ── 0:16 "They let the interns go in March, the juniors in July"
  {
    name: 'interns', t0: 15.9, t1: 21.5, bg: ['#0a0d28', '#2a1240'],
    draw: ({ c, t }) => {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mx = (i: number) => 190 + i * 128;
      const pos = t < 17.4 ? 0 : t < 19.9 ? lerp(0, 2, smooth(17.4, 18.5, t)) : lerp(2, 6, smooth(19.9, 20.6, t));
      months.forEach((m, i) => {
        const near = 1 - clamp01(Math.abs(pos - i));
        card(c, mx(i), 250, 112, 78, { fill: near > 0.5 ? C.pink : C.card, r: 16, shadow: 16 });
        txt(c, m, mx(i), 250, { size: 28, weight: 800, color: near > 0.5 ? '#fff' : C.inkSoft, align: 'center' });
      });
      c.fillStyle = C.sun; c.beginPath(); const px = mx(0) + pos * 128; c.moveTo(px, 312); c.lineTo(px - 16, 336); c.lineTo(px + 16, 336); c.fill();
      const row = (label: string, y: number, t0: number, color: string, tag: string) => {
        txt(c, label, 60, y - 10, { size: 22, weight: 800, color: C.cream, spacing: 3, max: 130 });
        for (let i = 0; i < 12; i++) {
          const x = 300 + i * 120, out = t0 + i * 0.07, k = t - out;
          const enter = pop(t, 16.4 + i * 0.04, 0.4);
          let yy = y, rot = 0, a = 1, tint = 0;
          if (k > 0) { tint = clamp01(k * 6); const f = Math.max(0, k - 0.4); yy += f * f * 1500; rot = f * (i % 2 ? 1.4 : -1.4); a = 1 - smooth(0.5, 1.0, k); }
          at(c, x + wobble(t, out, 8), yy, { s: enter, a, rot }, () => {
            card(c, 0, 0, 100, 130, { r: 16, shadow: 18, fill: tint > 0 ? '#ffe3e6' : C.card });
            person(c, 0, -18, 30, tint > 0 ? C.red : avatarColor(i + (color === C.peach ? 3 : 0)));
            pill(c, 0, 38, tag, { size: 16, bg: tint > 0 ? C.red : color, fg: '#fff', align: 'center' });
            if (tint > 0) cross(c, 0, -10, 70, C.red, 0.16);
          });
        }
      };
      row('INTERNS', 520, 18.56, C.lavender, 'INTERN');
      row('JUNIORS', 740, 20.54, C.peach, 'JUNIOR');
      if (t > 18.6) stamp(c, cx, 410, 'OFFBOARDING', 40, { a: smooth(18.6, 18.8, t) * (1 - smooth(19.8, 20.2, t)), s: 1 + (1 - outBack((t - 18.6) / 0.25)) * 0.5, color: C.red });
      if (t > 20.6) stamp(c, cx, 630, 'OFFBOARDING', 40, { a: smooth(20.6, 20.8, t), s: 1 + (1 - outBack((t - 20.6) / 0.25)) * 0.5, color: C.red });
    },
  },

  // ── 0:21 "The model writes the boilerplate and never asks us why"
  {
    name: 'boilerplate', t0: 21.5, t1: 25.45, bg: ['#0c0e24', '#161236'],
    draw: ({ c, t }) => {
      const fields = ['Id', 'Name', 'Email', 'Phone', 'Address', 'Role', 'Status', 'Created', 'Updated', 'Owner'];
      const lines: string[] = ['package com.acme.core.service.impl;', '', '@Service', 'public class UserServiceImpl implements UserService {', '  private final UserRepository userRepository;', '  private final UserMapper userMapper;', ''];
      for (const f of fields) { lines.push(`  public String get${f}() { return ${f.toLowerCase()}; }`); lines.push(`  public void set${f}(String ${f.toLowerCase()}) { this.${f.toLowerCase()} = ${f.toLowerCase()}; }`); lines.push(''); }
      const cps = 210, chars = Math.max(0, (t - 21.6) * cps);
      const win = appWindow(c, cx - 140, cy + 10, 1280, 640, 'UserServiceImpl.java', { dark: true });
      let used = 0, shown = 0;
      const out: string[] = [];
      for (const ln of lines) { if (used + ln.length + 1 > chars) { out.push(ln.slice(0, Math.max(0, chars - used))); break; } out.push(ln); used += ln.length + 1; shown++; }
      const vis = 13, first = Math.max(0, out.length - vis);
      out.slice(first).forEach((ln, i) => {
        const y = win.y + 40 + i * 36;
        mono(c, String(first + i + 1).padStart(3, ' '), win.x + 40, y, { size: 22, color: 'rgba(255,244,230,0.3)' });
        mono(c, ln, win.x + 110, y, { size: 25, color: ln.includes('public') || ln.includes('class') ? C.pink : ln.includes('@') ? C.teal : C.cream, max: win.w - 150 });
      });
      pill(c, win.x + win.w - 30, win.y - 28, '◆ agent-017 · writing', { size: 18, bg: C.tealDeep, fg: C.teal, align: 'right' });
      mono(c, `+${fmt((t - 21.5) * 1050)} lines`, win.x + 40, win.y + win.h - 34, { size: 26, weight: 700, color: C.teal });
      // "...and never asks us why"
      const s = pop(t, 23.2, 0.4);
      at(c, 1680, 770, { s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 380, 220);
        txt(c, 'QUESTIONS ASKED', 0, -66, { size: 20, weight: 800, color: C.inkSoft, align: 'center', spacing: 3 });
        mono(c, '0', 0, 8, { size: 110, weight: 700, color: C.ink, align: 'center' });
      });
    },
  },

  // ── 0:25 "It never takes a sick day and it never wants a raise"
  {
    name: 'perks', t0: 25.45, t1: 29.65, bg: ['#0b1124', '#1b1a3a'],
    draw: ({ c, t }) => {
      const colW = 560, xs = [cx - 330, cx + 330], y = cy + 20;
      const head = [['HUMAN', C.card, C.ink, C.pink], ['AGENT', '#0e2b36', C.teal, C.teal]] as const;
      head.forEach(([name, fill, ink, accent], i) => {
        const s = pop(t, 25.6 + i * 0.15, 0.4);
        at(c, xs[i], y, { s: 0.9 + 0.1 * s, a: clamp01(s * 2) }, () => {
          card(c, 0, 0, colW, 600, { fill });
          txt(c, name, -colW / 2 + 44, -250, { size: 28, weight: 800, color: accent, spacing: 5 });
          if (i === 0) person(c, colW / 2 - 90, -250, 36, C.pink); else agent(c, colW / 2 - 90, -250, 40);
          // sick days
          txt(c, 'Sick days', -colW / 2 + 44, -150, { size: 26, weight: 600, color: ink });
          const sick = i === 0 ? Math.min(7, Math.floor(ramp(t, 26.1, 27.4) * 8)) : 0;
          for (let d = 0; d < 7; d++) { c.beginPath(); c.arc(-colW / 2 + 70 + d * 54, -90, 18, 0, Math.PI * 2); c.fillStyle = d < sick ? C.red : i === 0 ? '#e9e3d9' : 'rgba(94,225,214,0.25)'; c.fill(); }
          mono(c, String(sick), colW / 2 - 44, -150, { size: 54, weight: 700, color: i === 0 ? C.red : C.teal, align: 'right' });
          if (i === 1 && t > 26.6) check(c, colW / 2 - 70, -90, 36, C.teal);
          // raises
          txt(c, 'Raise requests', -colW / 2 + 44, 0, { size: 26, weight: 600, color: ink });
          const raises = i === 0 ? Math.min(3, Math.floor(ramp(t, 28.0, 28.9) * 4)) : 0;
          for (let r = 0; r < 3; r++) { if (r < raises) { c.fillStyle = C.green; c.beginPath(); const rx = -colW / 2 + 70 + r * 70; c.moveTo(rx, 70); c.lineTo(rx + 22, 70); c.lineTo(rx + 11, 40); c.fill(); } }
          mono(c, i === 0 ? `+${raises * 3}%` : '—', colW / 2 - 44, 0, { size: 54, weight: 700, color: i === 0 ? C.green : C.teal, align: 'right' });
          // cost per hour
          txt(c, 'Cost / hour', -colW / 2 + 44, 150, { size: 26, weight: 600, color: ink });
          const cost = i === 0 ? 64 : 0.02, bw = smooth(28.9, 29.4, t) * (i === 0 ? 360 : 6);
          rr(c, -colW / 2 + 44, 200, 440, 30, 15); c.fillStyle = i === 0 ? '#e9e3d9' : 'rgba(94,225,214,0.2)'; c.fill();
          rr(c, -colW / 2 + 44, 200, Math.max(8, bw), 30, 15); c.fillStyle = i === 0 ? C.pink : C.teal; c.fill();
          mono(c, `$${(cost * smooth(28.9, 29.4, t)).toFixed(2)}`, colW / 2 - 44, 150, { size: 40, weight: 700, color: i === 0 ? C.ink : C.teal, align: 'right' });
        });
      });
    },
  },

  // ── 0:30 "It tells the boss 'you're absolutely right' a hundred times a day"
  {
    name: 'yesman', t0: 29.65, t1: 33.95, bg: ['#12102e', '#2b1245'],
    draw: ({ c, t }) => {
      const t0 = 29.8, n = Math.max(1, Math.min(100, Math.round(Math.pow(100, clamp01((t - t0) / (33.5 - t0))))));
      // a wall of replies fills in behind the chat
      for (let i = 0; i < Math.min(n, 100); i++) {
        const x = rnd(i * 1.3) * W, y = 160 + rnd(i * 2.9) * 700, s = 0.7 + rnd(i * 4.1) * 0.5, p = pop(t, t0 + Math.log(i + 1) / Math.log(100) * (33.5 - t0), 0.3);
        at(c, x, y, { s: s * p, a: 0.55 * clamp01(p * 2), rot: (rnd(i * 5.3) - 0.5) * 0.5 }, () => { rr(c, -150, -26, 300, 52, 26); c.fillStyle = C.teal; c.fill(); txt(c, "You're absolutely right!", 0, 1, { size: 22, weight: 700, color: C.tealDeep, align: 'center' }); });
      }
      const w = appWindow(c, cx, cy + 10, 820, 640, 'Messages · Boss');
      const asks = ['Thoughts?', 'What about this?', 'Ship it?', 'Is this good?', 'Be honest.', 'Right?!', 'Agree?', '...?'];
      const count = Math.min(asks.length, 1 + Math.floor(n / 9));
      for (let i = 0; i < 4; i++) {
        const j = count - 1 - i; if (j < 0) break;
        const y = w.y + w.h - 100 - i * 130;
        rr(c, w.x + 40, y - 80, 300, 54, 27); c.fillStyle = '#efe9de'; c.fill();
        txt(c, asks[j], w.x + 190, y - 53, { size: 24, weight: 600, align: 'center', max: 260 });
        rr(c, w.x + w.w - 420, y - 30, 380, 54, 27); c.fillStyle = C.teal; c.fill();
        txt(c, "You're absolutely right!", w.x + w.w - 230, y - 3, { size: 24, weight: 700, color: C.tealDeep, align: 'center', max: 350 });
      }
      at(c, cx + 410, cy - 280, { s: 1 + 0.15 * Math.sin(t * 20) * (n < 100 ? 0.3 : 0.0) + (n === 100 ? pop(t, 33.5, 0.3) * 0.3 : 0) }, () => pill(c, 0, 0, `×${n}`, { size: 54, bg: C.pink, fg: '#fff', align: 'center' }));
    },
  },

  // ── 0:34 "They told us all to learn to code"
  {
    name: 'learn', t0: 33.95, t1: 36.0, bg: ['#0c1330', '#26123e'],
    draw: ({ c, t }) => {
      const w = appWindow(c, cx, cy + 10, 1180, 640, 'learn-to-code.academy');
      c.fillStyle = '#f6efe6'; c.fillRect(w.x, w.y, w.w, w.h);
      at(c, cx - 360, cy - 60, { s: pop(t, 34.1, 0.4) }, () => gradCap(c, 0, 0, 110));
      txt(c, typed('Learn to code', t, 34.1, 22), cx - 200, cy - 110, { size: 80, weight: 800, max: 700 });
      txt(c, typed('in 12 weeks. Everyone is hiring!', t, 34.5, 26), cx - 200, cy - 30, { size: 40, weight: 600, color: C.inkSoft, max: 720 });
      for (let i = 0; i < 12; i++) { rr(c, cx - 440 + i * 70, cy + 60, 58, 26, 8); c.fillStyle = i < ramp(t, 34.6, 35.6) * 12 ? C.green : '#e4dccd'; c.fill(); }
      txt(c, 'WEEK', cx - 440, cy + 118, { size: 20, weight: 700, color: C.inkSoft, spacing: 3 });
      const press = t > 35.35 ? 1 : 0;
      at(c, cx, cy + 210, { s: 1 - press * 0.06 }, () => pill(c, 0, 0, press ? 'Enrolled ✓' : 'Enroll now', { size: 36, bg: press ? C.green : C.pink, fg: '#fff', align: 'center' }));
      pointer(c, lerp(cx + 340, cx + 36, smooth(34.8, 35.3, t)), lerp(cy + 40, cy + 226, smooth(34.8, 35.3, t)), 1.2, press);
    },
  },

  // ── 0:36 "So we learned it line by line"
  {
    name: 'lines', t0: 36.0, t1: 38.3, bg: ['#0c1228', '#1a1238'],
    draw: ({ c, t }) => {
      const win = appWindow(c, cx, cy + 10, 1100, 620, 'hello.py', { dark: true });
      const code = ['print("Hello, world!")', 'name = input("Who are you? ")', 'for i in range(10):', '    print(i * 2)', 'if name == "you":', '    print("welcome")', 'def add(a, b):', '    return a + b', 'print(add(2, 2))', '# it works!'];
      const reading = (t - 36.1) / BEAT;
      code.forEach((ln, i) => {
        const y = win.y + 50 + i * 50, on = i <= Math.floor(reading);
        if (i === Math.floor(reading)) { c.fillStyle = 'rgba(255,207,110,0.18)'; c.fillRect(win.x + 20, y - 24, win.w - 40, 48); c.fillStyle = C.sun; c.fillRect(win.x + 20, y - 24, 6, 48); }
        mono(c, String(i + 1), win.x + 60, y, { size: 24, color: 'rgba(255,244,230,0.3)', align: 'right' });
        mono(c, ln, win.x + 100, y, { size: 30, color: on ? C.cream : 'rgba(255,244,230,0.2)', max: win.w - 220 });
        if (on && i < Math.floor(reading)) check(c, win.x + win.w - 60, y, 20, C.green);
      });
      const pct = Math.min(100, Math.floor(ramp(t, 36.1, 38.1) * 100));
      c.fillStyle = 'rgba(255,244,230,0.14)'; c.fillRect(win.x + 40, win.y + win.h - 40, win.w - 80, 10);
      c.fillStyle = C.green; c.fillRect(win.x + 40, win.y + win.h - 40, (win.w - 80) * pct / 100, 10);
      mono(c, `learning… ${pct}%`, win.x + win.w - 40, win.y + win.h - 70, { size: 24, color: C.green, align: 'right' });
    },
  },

  // ── 0:38 "Now the code has learned to code"
  {
    name: 'droste', t0: 38.3, t1: 40.45, bg: ['#161038', '#0c1a30'],
    draw: ({ c, t, k }) => {
      const zoom = Math.pow(1 / 0.6, ramp(t, 38.3, 40.45) * 1.0);
      const code = ['function write(code) {', '  return write(code);', '}'];
      for (let d = 0; d < 8; d++) { // largest first, so each smaller window sits on top
        const s = zoom * Math.pow(0.6, d - 0 + 0);
        if (s > 6 || s < 0.05) continue;
        const dark = d % 2 === 0;
        c.save(); c.translate(cx, cy + 10); c.scale(s, s);
        const w = 1100, h = 620;
        card(c, 0, 0, w, h, { fill: dark ? '#171a33' : C.card, r: 22, shadow: 30 });
        c.fillStyle = dark ? '#22264a' : '#efe9de'; rr(c, -w / 2, -h / 2, w, 56, [22, 22, 0, 0]); c.fill();
        ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.beginPath(); c.arc(-w / 2 + 32 + i * 28, -h / 2 + 28, 9, 0, Math.PI * 2); c.fillStyle = col; c.fill(); });
        txt(c, 'agent.ts', 0, -h / 2 + 28, { size: 22, weight: 600, color: dark ? 'rgba(255,244,230,0.6)' : C.inkSoft, align: 'center' });
        code.forEach((ln, i) => mono(c, ln, -w / 2 + 50, -h / 2 + 100 + i * 40, { size: 28, color: dark ? C.cream : C.ink }));
        c.restore();
      }
      void k;
    },
  },

  // ── 0:40 "And it's doing fine"
  {
    name: 'fine', t0: 40.45, t1: 42.6, bg: ['#0a1a22', '#10223a'],
    draw: ({ c, t }) => {
      const s = pop(t, 40.6, 0.4);
      at(c, cx, cy + 10, { s: 0.9 + 0.1 * s, a: clamp01(s * 2) }, () => {
        card(c, 0, 0, 1240, 560);
        const pulse = 0.5 + 0.5 * Math.sin(t * 6);
        c.beginPath(); c.arc(-540, -190, 22 + pulse * 6, 0, Math.PI * 2); c.fillStyle = 'rgba(62,207,142,0.3)'; c.fill();
        c.beginPath(); c.arc(-540, -190, 16, 0, Math.PI * 2); c.fillStyle = C.green; c.fill();
        txt(c, 'All systems operational', -490, -190, { size: 54, weight: 800, max: 900 });
        txt(c, 'Last 90 days', -560, -90, { size: 22, weight: 700, color: C.inkSoft, spacing: 3 });
        for (let i = 0; i < 90; i++) {
          const on = ramp(t, 40.7, 41.6) * 90 > i; if (!on) continue;
          c.fillStyle = i === 3 ? C.red : C.green; rr(c, -560 + i * 12.4, -60, 8, 90, 3); c.fill();
        }
        if (t > 41.65) { at(c, -490, 80, { s: pop(t, 41.65, 0.25) }, () => { rr(c, -90, -24, 190, 48, 12); c.fillStyle = C.ink; c.fill(); txt(c, 'Humans: partial outage', 5, 0, { size: 17, weight: 600, color: '#fff', align: 'center', max: 180 }); }); }
        mono(c, fmt(4096 * ramp(t, 40.7, 42.0)), -560, 200, { size: 80, weight: 700, color: C.teal });
        txt(c, 'deploys today', -560 + 12 + (String(Math.round(4096 * ramp(t, 40.7, 42.0))).length + 1) * 48, 214, { size: 30, weight: 600, color: C.inkSoft });
        at(c, 480, 150, { s: pop(t, 41.2, 0.4) }, () => { c.fillStyle = C.sun; c.beginPath(); c.arc(0, 0, 90, 0, Math.PI * 2); c.fill(); c.strokeStyle = C.ink; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(-34, -6); c.lineTo(-34, -6); c.moveTo(34, -6); c.lineTo(34, -6); c.stroke(); c.lineWidth = 9; c.beginPath(); c.arc(0, 12, 38, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); });
      });
      confetti(c, t, 41.6, 40, 500, 1400, 160, 500, 3);
    },
  },
];

