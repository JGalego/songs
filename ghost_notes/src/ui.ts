// The 2D overlay: one full-screen canvas on top of the 3D world. The app's toolbar and hint bar, the windows the
// lyrics call up (a sideways video, a prompt, the View menu, a record sleeve, the velocity lane, the playlist, a voice
// memo, the mixer, a rename dialog), the karaoke subtitles and the credits.
import * as THREE from 'three';
import {
  C, CHANNEL, at, blink, clamp01, fmt, inCubic, lerp, logo, modernWindow, mono, outBack, outCubic, panel, pointer, pop, ramp, ripple,
  rnd, rr, smooth, txt, typed, win, wobble,
} from './art';
import { WORD_TIMES } from './karaoke';
import { CanvasTex, MONO, SANS, karaokeAt, karaokeLines, karaokeText } from './text';
import { LAYER_COLORS, LAYER_NAMES, drummerBar } from './songs';
import {
  ASK, CHORUSES, CREDITS, CREDITS_START, DEFINITION, DELETE, DIVE, DURATION, FORGOT, KEYS, LIGHT, LIVES_IN_ME, LYRICS,
  MEMO, MENU_OFF, MENU_ON, MIXER, NEW, NOTHING, NOWHERE, DONE, PLAYLIST, PROMPT2, RENAME, ROLL_IN, ROOM, SAD_IN_D,
  SELECT, SIDEWAYS, SLEEVE, THE_LINE, TRAIN, TURN_UP, VELOCITY, VIDEO_IN, beatAt,
} from './timeline';

export const W = 1920, H = 1080;
const KARAOKE = karaokeLines(WORD_TIMES);

export interface UiState {
  t: number;
  bass: number; mid: number; high: number; kick: number;
  /** Is the piano roll world on screen (toolbar, hint bar)? */
  roll: number;
  /** The track list of ghost layers on the right: how visible, each layer's visibility, how forgotten. */
  tracks: number;
  layerVis: number[];
  forget: number;
  /** Screen x (logical px) of a beat on the front sheet, at the velocity lane's height. */
  beatX: (beat: number) => number;
}

/** When the View menu ticks or unticks "Ghost notes": [open, click, ticked after the click]. */
const MENUS: [number, number, boolean][] = [[MENU_ON[0], MENU_ON[1], true], [MENU_OFF[0], MENU_OFF[1], false], [190.0, 191.58, true]];

export class Ui {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
  subtitles = true;
  private tex = new CanvasTex(W, H);

  constructor() {
    const mat = new THREE.MeshBasicMaterial({ map: this.tex.texture, transparent: true, depthTest: false, depthWrite: false });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat));
  }

  update(s: UiState) {
    this.tex.draw(`${s.t.toFixed(5)}|${s.kick.toFixed(3)}|${s.bass.toFixed(3)}`, (c) => {
      const { t } = s;
      if (s.roll > 0.01) {
        c.globalAlpha = s.roll;
        rain(c, t);
        train(c, t);
        video(c, t);
        prompt(c, t, ASK + 0.25, '/ something sad in D', SAD_IN_D, SAD_IN_D + 0.5);
        badgeNew(c, t);
        sleeve(c, t);
        velocityLane(c, s);
        definition(c, t);
        playlist(c, t);
        memo(c, t);
        midiToast(c, t);
        room(c, t);
        prompt(c, t, PROMPT2[0] + 0.3, '/ make it original', 121.22, DONE);
        rename(c, t);
        fader(c, t, s);
        mixer(c, s);
        trackList(c, s);
        toolbar(c, s);
        menus(c, t);
        c.globalAlpha = 1;
      }
      flash(c, t);
      if (this.subtitles) subtitle(c, t);
      credits(c, t);
    });
  }
}

// ── the app's top bar, always there in the piano roll world
function toolbar(c: CanvasRenderingContext2D, s: UiState) {
  const { t } = s;
  if (t > MIXER[0] && t < MIXER[1]) return; // the mixer has its own chrome
  const h = 58;
  c.fillStyle = C.bg; c.fillRect(0, 0, W, h);
  c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, h - 1, W, 1);
  logo(c, 34, 29, 34);
  txt(c, 'FrootyLoops', 60, 29, { size: 17, weight: 700, color: C.text });
  MENU.forEach((m, i) => {
    const open = m === 'VIEW' && MENUS.some(([o, k]) => t > o + 0.5 && t < k + 0.45);
    if (open) { c.fillStyle = C.panelHi; c.fillRect(menuX(i) - 10, 10, 64, 38); }
    txt(c, m, menuX(i), 29, { size: 14, weight: 600, color: open ? C.text : C.dim, spacing: 1 });
  });
  // transport
  const tx = 900;
  rr(c, tx, 12, 40, 34, 5); c.fillStyle = C.panel2; c.fill();
  c.fillStyle = C.green; c.beginPath(); c.moveTo(tx + 14, 20); c.lineTo(tx + 29, 29); c.lineTo(tx + 14, 38); c.fill();
  rr(c, tx + 46, 12, 40, 34, 5); c.fillStyle = C.panel2; c.fill();
  c.fillStyle = C.dim; c.fillRect(tx + 59, 22, 14, 14);
  rr(c, tx + 92, 12, 40, 34, 5); c.fillStyle = C.panel2; c.fill();
  c.fillStyle = C.red; c.beginPath(); c.arc(tx + 112, 29, 7, 0, Math.PI * 2); c.fill();
  // tempo and song position, in a little LCD
  lcd(c, tx + 150, 'BPM', '135.000', 112);
  const b = Math.max(0, beatAt(t));
  lcd(c, tx + 272, 'SONG', `${String(Math.floor(b / 4) + 1).padStart(3, '0')}:${Math.floor(b % 4) + 1}:${String(Math.floor((b % 1) * 4) + 1).padStart(2, '0')}`, 128);
  // pattern selector and the hint bar
  rr(c, tx + 410, 12, 150, 34, 5); c.fillStyle = C.panel2; c.fill();
  txt(c, 'Pattern 1', tx + 424, 29, { size: 15, weight: 600, color: C.orangeHot });
  rr(c, tx + 570, 12, W - (tx + 570) - 14, 34, 5); c.fillStyle = '#10151a'; c.fill();
  const [hintText, hot] = hint(t);
  mono(c, hintText, tx + 584, 29, { size: 14, color: hot ? C.orangeHot : C.dim, max: W - (tx + 584) - 30 });
}
const MENU = ['FILE', 'EDIT', 'ADD', 'PATTERNS', 'VIEW', 'OPTIONS', 'TOOLS', 'HELP'];
const MENU_W = [52, 52, 50, 100, 58, 86, 70, 56];
const menuX = (i: number) => 200 + MENU_W.slice(0, i).reduce((a, b) => a + b, 0);

function lcd(c: CanvasRenderingContext2D, x: number, label: string, value: string, w: number) {
  rr(c, x, 12, w, 34, 5); c.fillStyle = '#0b100c'; c.fill();
  mono(c, label, x + 8, 21, { size: 9, color: '#4f8a52' });
  mono(c, value, x + w - 8, 32, { size: 17, weight: 700, color: '#8dff86', align: 'right' });
}

/** The hint bar narrates, quietly. Second value: highlight it. */
function hint(t: number): [string, boolean] {
  const HINTS: [number, string, boolean?][] = [
    [0, 'Piano roll: girl_beat_01.flp (ghost)'],
    [VIDEO_IN, 'Import: VID_0347.mp4 (portrait, 0:41)'],
    [SIDEWAYS, 'VID_0347.mp4: rotated 90° (filmed sideways)'],
    [ASK, 'Prompt: something sad in D', true],
    [NOWHERE, 'New pattern: 100% generated, 0 sources'],
    [MENU_ON[0], 'View > Ghost notes: show notes from other patterns'],
    [CHORUSES[0][0], 'Ghost notes: 24 patterns visible (41,206,553 hidden)'],
    [86.6, 'Piano roll: Pattern 1'],
    [SLEEVE[0], 'Credits: drums (unknown)'],
    [VELOCITY[0], 'Velocity: 14% (ghost note)', true],
    [PLAYLIST[0], 'Playlist: 1,000,000 patterns, none longer than 8 bars'],
    [MEMO[0], 'Audio clip: Voice Memo 14 (in the car), 0:38'],
    [KEYS[0], 'MIDI input: no device connected'],
    [ROOM[0], 'Browser: /everything/'],
    [PROMPT2[0], 'Prompt: make it original', true],
    [MENU_OFF[0], 'View > Ghost notes: off'],
    [CHORUSES[1][0], 'Ghost notes: hidden'],
    [MIXER[0], 'Mixer: 41,206,553 inserts'],
    [DEFINITION[0], 'Ghost note: a note played very softly, between the beats', true],
    [DELETE, 'Deleted 1,184 ghost notes. Groove: 0%'],
    [RENAME[0], 'Rename channel'],
    [FORGOT, 'Source: unknown'],
    [190.0, 'View > Ghost notes: on'],
    [LIGHT, 'Ghost notes: 100%', true],
    [THE_LINE, 'Melody: 0 notes mine', true],
    [NOTHING[2], 'Pattern 1 is empty'],
  ];
  let cur = HINTS[0];
  for (const h of HINTS) if (t >= h[0]) cur = h;
  // type each new hint in
  return [typed(cur[1], t, cur[0], 60), !!cur[2]];
}

/** The ghost layers as a track list, each with its colour and a little green LED; "forgot where they came from"
 * scrambles the names to nothing. */
function trackList(c: CanvasRenderingContext2D, s: UiState) {
  const a = s.tracks;
  if (a <= 0.01) return;
  const x = W - 340, y = 76, w = 320, row = 28;
  c.save();
  c.globalAlpha *= a;
  panel(c, x, y, w, 44 + LAYER_NAMES.length * row, { fill: 'rgba(20,25,29,0.9)' });
  txt(c, 'GHOST LAYERS', x + 16, y + 22, { size: 13, weight: 700, color: C.dim, spacing: 2 });
  const shown = s.layerVis.slice(1).filter((v) => v > 0.5).length;
  mono(c, `${shown} / 41,206,553`, x + w - 16, y + 22, { size: 12, color: C.faint, align: 'right' });
  const tick = Math.floor(s.t * 14);
  LAYER_NAMES.forEach((name, i) => {
    const k = i + 1, vis = clamp01(s.layerVis[k] ?? 0);
    const ry = y + 44 + i * row;
    const lost = clamp01(s.forget * 2.2 - rnd(k * 1.7) * 1.2);
    let label = name;
    if (lost >= 1) label = 'unknown';
    else if (lost > 0) label = name.split('').map((ch, j) => (rnd(j * 3.7 + k) < lost ? '#%&?*·'[Math.floor(rnd(tick + j * 1.3 + k) * 6)] : ch)).join('');
    c.save();
    c.globalAlpha *= 0.25 + 0.75 * vis;
    c.fillStyle = i % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)';
    c.fillRect(x + 6, ry, w - 12, row - 2);
    rr(c, x + 12, ry + 4, 8, row - 10, 2); c.fillStyle = lost >= 1 ? C.faint : LAYER_COLORS[i]; c.fill();
    txt(c, label, x + 30, ry + row / 2 - 1, { size: 14, weight: 600, color: lost >= 1 ? C.faint : C.text, max: w - 72 });
    c.fillStyle = vis > 0.5 ? C.green : '#2a3136';
    c.beginPath(); c.arc(x + w - 22, ry + row / 2 - 1, 4, 0, Math.PI * 2); c.fill();
    c.restore();
  });
  c.restore();
}

// ── View ▸ Ghost notes
function menus(c: CanvasRenderingContext2D, t: number) {
  for (const [open, click, ticks] of MENUS) {
    const a = win(t, open + 0.45, click + 0.45, 0.12);
    const p = win(t, open, click + 0.6, 0.2);
    if (p <= 0) continue;
    const mx = menuX(4) - 10, my = 50, mw = 330;
    const items = ['Channel rack            F6', 'Piano roll              F7', 'Playlist                F5', 'Mixer                   F9', '-', 'Ghost notes'];
    const ticked = t >= click ? ticks : !ticks;
    if (a > 0) {
      c.save();
      c.globalAlpha *= a;
      panel(c, mx, my, mw, 32 + items.length * 40, { fill: C.panel2, r: 4 });
      items.forEach((it, i) => {
        const y = my + 20 + i * 40;
        if (it === '-') { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(mx + 12, y + 18, mw - 24, 1); return; }
        const hot = i === items.length - 1 && t > click - 0.8;
        if (hot) { c.fillStyle = 'rgba(255,152,56,0.22)'; c.fillRect(mx + 4, y, mw - 8, 38); }
        mono(c, it, mx + 50, y + 19, { size: 16, color: hot ? C.text : C.dim });
        if (i === items.length - 1) {
          rr(c, mx + 16, y + 9, 20, 20, 3); c.strokeStyle = hot ? C.orange : C.dim; c.lineWidth = 2; c.stroke();
          if (ticked) { c.strokeStyle = C.orange; c.lineWidth = 3; c.beginPath(); c.moveTo(mx + 20, y + 19); c.lineTo(mx + 25, y + 24); c.lineTo(mx + 33, y + 13); c.stroke(); }
        }
      });
      c.restore();
    }
    // the pointer: from mid-screen to VIEW, then down to Ghost notes, click
    const k1 = smooth(open, open + 0.5, t), k2 = smooth(click - 1.0, click - 0.15, t);
    const x = lerp(lerp(1100, menuX(4) + 20, k1), mx + 140, k2), y = lerp(lerp(620, 30, k1), my + 20 + 5 * 40 + 19, k2);
    c.save(); c.globalAlpha *= p;
    pointer(c, x, y, 1.1, t > click - 0.06 && t < click + 0.08);
    ripple(c, x, y, t - click);
    c.restore();
  }
}

// ── verse 1: the cello video
const RAIN = Array.from({ length: 140 }, (_, i) => [rnd(i * 1.3), rnd(i * 7.1), 0.6 + rnd(i * 3.7) * 0.8]);
function rain(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, VIDEO_IN - 0.2, LIVES_IN_ME + 0.6, 0.6) * 0.5;
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.strokeStyle = 'rgba(170,195,230,0.55)'; c.lineWidth = 1.5;
  c.beginPath();
  for (const [x0, y0, sp] of RAIN) {
    const y = ((y0 + t * 0.9 * sp) % 1) * (H + 200) - 100, x = x0 * (W + 300) - y * 0.18;
    c.moveTo(x, y); c.lineTo(x - 9 * sp, y + 46 * sp);
  }
  c.stroke();
  c.restore();
}

/** "every last commuter train": a train goes through, right to left. */
function train(c: CanvasRenderingContext2D, t: number) {
  const k = ramp(t, TRAIN - 0.35, TRAIN + 0.9);
  if (k <= 0 || k >= 1) return;
  const len = 3600, x = lerp(W + 50, -len - 50, k), y = 640, h = 230;
  c.save();
  c.globalAlpha *= 0.85 * Math.sin(k * Math.PI);
  c.fillStyle = 'rgba(14,18,24,0.92)'; c.fillRect(x, y, len, h);
  for (let i = 0; i < 26; i++) {
    const wx = x + 40 + i * 136;
    c.fillStyle = `rgba(255,${200 + Math.floor(rnd(i) * 40)},140,${0.55 + rnd(i * 3) * 0.35})`;
    c.fillRect(wx, y + 40, 96, 70);
  }
  c.fillStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < 12; i++) c.fillRect(x - 900 - i * 40, y + 20 + i * 18, 900, 2); // speed lines
  c.restore();
}

function video(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, VIDEO_IN, LIVES_IN_ME + 0.9, 0.25);
  if (a <= 0) return;
  // a phone video, portrait; on "filmed it sideways" it tips over onto its side, then drops into the roll
  const drop = outCubic(ramp(t, LIVES_IN_ME, LIVES_IN_ME + 0.9));
  const tip = outBack(ramp(t, SIDEWAYS - 0.15, SIDEWAYS + 0.45));
  const cx = lerp(1480, 660, drop), cy = lerp(lerp(450, 430, tip), 640, drop);
  const s = lerp(1, 0.08, inCubic(drop)) * pop(t, VIDEO_IN, 0.45) * lerp(1, 0.86, tip);
  at(c, cx, cy, { s, a, rot: -Math.PI / 2 * tip }, () => {
    const w = 400, h = 660;
    panel(c, -w / 2 - 10, -h / 2 - 46, w + 20, h + 92, { fill: '#0c0f13', r: 10 });
    txt(c, 'VID_0347.mp4', -w / 2 + 6, -h / 2 - 24, { size: 16, weight: 600, color: C.text, max: w - 70 });
    mono(c, '0:41', w / 2 - 6, -h / 2 - 24, { size: 14, color: C.dim, align: 'right' });
    c.save();
    c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
    station(c, t, w, h);
    c.restore();
    // scrub bar
    const k = ramp(t, VIDEO_IN, LIVES_IN_ME);
    c.fillStyle = C.faint; c.fillRect(-w / 2 + 6, h / 2 + 22, w - 12, 4);
    c.fillStyle = C.orange; c.fillRect(-w / 2 + 6, h / 2 + 22, (w - 12) * (0.2 + 0.8 * k), 4);
    // "filmed it sideways": the rotate icon
    const r = win(t, SIDEWAYS - 0.1, LIVES_IN_ME, 0.15);
    if (r > 0) {
      c.save(); c.globalAlpha *= r;
      rr(c, -44, -44, 88, 88, 44); c.fillStyle = 'rgba(0,0,0,0.6)'; c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 5;
      c.beginPath(); c.arc(0, 0, 26, -Math.PI * 0.2, Math.PI * 1.35); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(22, -26); c.lineTo(36, -6); c.lineTo(13, -4); c.fill();
      c.restore();
    }
  });
}

/**
 * Inside the video (portrait, w × h, centred on 0,0): a station hall at night, rain on the tall window, and an old
 * man in a flat cap, white beard and glasses, playing his cello on a stool, the case open at his feet.
 */
function station(c: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const S = Math.min(w / 360, h / 640);
  c.save();
  c.scale(S, S);
  // the hall
  c.fillStyle = '#1a212c'; c.fillRect(-200, -340, 400, 680);
  // the tall arched window, rain running down it
  c.save();
  c.beginPath(); c.moveTo(-140, 10); c.lineTo(-140, -200); c.arc(0, -200, 140, Math.PI, 0); c.lineTo(140, 10); c.closePath();
  const glass = c.createLinearGradient(0, -340, 0, 10);
  glass.addColorStop(0, '#3b5578'); glass.addColorStop(1, '#22324a');
  c.fillStyle = glass; c.fill();
  c.clip();
  c.strokeStyle = 'rgba(170,200,235,0.55)'; c.lineWidth = 1.6;
  for (let i = 0; i < 40; i++) {
    const x = -140 + rnd(i * 1.7) * 280, y = -340 + ((rnd(i * 5.3) + t * (0.5 + rnd(i) * 0.5)) % 1) * 360;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + 18); c.stroke();
  }
  c.restore();
  c.strokeStyle = '#121820'; c.lineWidth = 6;
  c.beginPath(); c.moveTo(0, -340); c.lineTo(0, 10); c.moveTo(-140, -110); c.lineTo(140, -110); c.stroke();
  c.beginPath(); c.arc(0, -200, 140, Math.PI, 0); c.stroke();
  // the station clock
  c.fillStyle = '#e9e4d6'; c.beginPath(); c.arc(-100, 40, 22, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(-100, 40); c.lineTo(-100, 26); c.moveTo(-100, 40); c.lineTo(-90, 46); c.stroke();
  // the floor, and the lamp that lights him
  c.fillStyle = '#121720'; c.fillRect(-200, 120, 400, 220);
  c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1;
  for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 20, 120); c.lineTo(i * 90, 340); c.stroke(); }
  const lamp = c.createRadialGradient(0, 90, 10, 0, 90, 260);
  lamp.addColorStop(0, 'rgba(255,196,120,0.38)'); lamp.addColorStop(1, 'rgba(255,196,120,0)');
  c.fillStyle = lamp; c.fillRect(-200, -340, 400, 680);

  // the open case on the floor, a few coins in it
  c.fillStyle = '#20120c';
  c.beginPath(); c.ellipse(118, 292, 62, 18, -0.08, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#7a1f24';
  c.beginPath(); c.ellipse(118, 290, 52, 12, -0.08, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e8c15a';
  [[96, 288], [112, 294], [130, 286], [142, 292]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 4.5, 2.5, 0, 0, Math.PI * 2); c.fill(); });

  // stool
  c.fillStyle = '#2b241e'; c.fillRect(-48, 150, 70, 10);
  c.fillRect(-44, 160, 6, 130); c.fillRect(12, 160, 6, 130);
  // legs: trousers, knees apart, shoes
  c.fillStyle = '#2b2e35';
  c.beginPath(); c.moveTo(-60, 120); c.lineTo(-78, 200); c.lineTo(-70, 290); c.lineTo(-50, 290); c.lineTo(-52, 205); c.lineTo(-25, 130); c.fill();
  c.beginPath(); c.moveTo(40, 120); c.lineTo(86, 200); c.lineTo(80, 290); c.lineTo(60, 290); c.lineTo(62, 208); c.lineTo(15, 130); c.fill();
  c.fillStyle = '#0d0d0f';
  c.beginPath(); c.ellipse(-62, 294, 20, 8, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(74, 294, 20, 8, 0, 0, Math.PI * 2); c.fill();
  // the overcoat
  const coat = c.createLinearGradient(0, -30, 0, 140);
  coat.addColorStop(0, '#5a4a3c'); coat.addColorStop(1, '#3d3229');
  c.fillStyle = coat;
  c.beginPath();
  c.moveTo(-58, -12); c.quadraticCurveTo(-72, -8, -72, 20); c.lineTo(-74, 150); c.lineTo(66, 150); c.lineTo(62, 20);
  c.quadraticCurveTo(62, -8, 48, -12); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-5, 0); c.lineTo(-5, 150); c.stroke();
  // scarf
  c.fillStyle = '#9a3a31';
  c.beginPath(); c.moveTo(-34, -16); c.quadraticCurveTo(-5, 2, 26, -16); c.lineTo(28, -4); c.quadraticCurveTo(-5, 16, -36, -4); c.fill();
  c.fillRect(8, -8, 16, 56);
  // head: an old face, glasses, white hair at the sides, a full white beard, a flat cap
  c.fillStyle = '#c8a083';
  c.beginPath(); c.ellipse(-5, -62, 28, 34, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(-33, -60, 6, 9, 0, 0, Math.PI * 2); c.ellipse(23, -60, 6, 9, 0, 0, Math.PI * 2); c.fill(); // ears
  c.fillStyle = '#e8e4dc';
  c.beginPath(); c.ellipse(-30, -72, 8, 12, 0.2, 0, Math.PI * 2); c.ellipse(20, -72, 8, 12, -0.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); // beard
  c.moveTo(-31, -62); c.quadraticCurveTo(-34, -20, -5, -12); c.quadraticCurveTo(24, -20, 21, -62);
  c.quadraticCurveTo(14, -44, -5, -46); c.quadraticCurveTo(-24, -44, -31, -62); c.fill();
  c.beginPath(); c.ellipse(-12, -47, 10, 4, 0.2, 0, Math.PI * 2); c.ellipse(2, -47, 10, 4, -0.2, 0, Math.PI * 2); c.fill(); // moustache
  c.fillStyle = '#b88c6f'; c.beginPath(); c.ellipse(-5, -56, 5, 7, 0, 0, Math.PI * 2); c.fill(); // nose
  // eyes closed, lost in it, behind round glasses
  c.strokeStyle = '#3a2a22'; c.lineWidth = 2;
  c.beginPath(); c.arc(-15, -68, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.arc(5, -68, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  c.strokeStyle = '#1c1c1c'; c.lineWidth = 2;
  c.beginPath(); c.arc(-15, -67, 9, 0, Math.PI * 2); c.moveTo(14, -67); c.arc(5, -67, 9, 0, Math.PI * 2); c.moveTo(-6, -68); c.lineTo(-4, -68); c.stroke();
  c.fillStyle = '#3b3630'; // flat cap
  c.beginPath(); c.moveTo(-36, -80); c.quadraticCurveTo(-34, -108, -2, -106); c.quadraticCurveTo(30, -104, 30, -84);
  c.quadraticCurveTo(12, -78, -36, -80); c.fill();
  c.beginPath(); c.ellipse(-8, -80, 34, 6, -0.05, 0, Math.PI * 2); c.fill();

  // the cello, leaning into his left shoulder
  c.save();
  c.translate(10, 160); c.rotate(0.2);
  const wood = c.createLinearGradient(-60, 0, 60, 0);
  wood.addColorStop(0, '#6e3416'); wood.addColorStop(0.45, '#b9652a'); wood.addColorStop(1, '#6a3115');
  c.fillStyle = wood;
  c.beginPath(); // upper bout, waist, lower bout
  c.moveTo(0, -78);
  c.bezierCurveTo(30, -78, 46, -66, 44, -40); c.bezierCurveTo(42, -22, 28, -16, 30, 0);
  c.bezierCurveTo(32, 16, 58, 26, 56, 52); c.bezierCurveTo(54, 76, 28, 84, 0, 84);
  c.bezierCurveTo(-28, 84, -54, 76, -56, 52); c.bezierCurveTo(-58, 26, -32, 16, -30, 0);
  c.bezierCurveTo(-28, -16, -42, -22, -44, -40); c.bezierCurveTo(-46, -66, -30, -78, 0, -78);
  c.fill();
  c.strokeStyle = '#3a1a0a'; c.lineWidth = 2; c.stroke();
  // f-holes
  c.strokeStyle = '#1a0c05'; c.lineWidth = 2.5;
  for (const sx of [-1, 1]) {
    c.beginPath(); c.moveTo(sx * 18, -16); c.bezierCurveTo(sx * 26, -4, sx * 12, 14, sx * 20, 28); c.stroke();
  }
  // endpin, tailpiece, bridge, fingerboard, neck, pegbox, scroll
  c.strokeStyle = '#999'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 84); c.lineTo(0, 132); c.stroke();
  c.fillStyle = '#141414'; c.beginPath(); c.moveTo(-9, 76); c.lineTo(9, 76); c.lineTo(6, 40); c.lineTo(-6, 40); c.fill();
  c.fillStyle = '#e3cfa0'; c.fillRect(-15, 26, 30, 5);
  c.fillStyle = '#121212'; c.beginPath(); c.moveTo(-8, 10); c.lineTo(8, 10); c.lineTo(5, -230); c.lineTo(-5, -230); c.fill();
  c.fillStyle = '#7a3c18'; c.fillRect(-5, -262, 10, 34);
  c.beginPath(); c.arc(2, -268, 9, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#3a1a0a'; c.lineWidth = 2; c.beginPath(); c.arc(2, -268, 5, 0, Math.PI * 1.6); c.stroke();
  c.fillStyle = '#2a160a'; c.fillRect(-11, -252, 4, 4); c.fillRect(7, -246, 4, 4); c.fillRect(-11, -240, 4, 4); c.fillRect(7, -234, 4, 4);
  c.strokeStyle = 'rgba(235,225,200,0.75)'; c.lineWidth = 0.9;
  for (let k = 0; k < 4; k++) { const x = -4.5 + k * 3; c.beginPath(); c.moveTo(x * 1.3, 42); c.lineTo(x, -228); c.stroke(); }
  c.restore();

  // his left hand high on the neck, the coat sleeve reaching up to it
  c.strokeStyle = '#4e4034'; c.lineWidth = 18; c.lineCap = 'round';
  c.beginPath(); c.moveTo(46, -2); c.quadraticCurveTo(70, 10, 52, -40); c.stroke();
  c.fillStyle = '#c8a083'; c.beginPath(); c.ellipse(46, -48, 10, 12, 0.3, 0, Math.PI * 2); c.fill();
  // his right arm draws the bow across the strings, just above the bridge
  const bow = Math.sin(t * 2.6) * 34;
  const hx = -58 + bow * 0.9, hy = 166 + bow * 0.18;
  c.strokeStyle = '#4e4034'; c.lineWidth = 18;
  c.beginPath(); c.moveTo(-62, -2); c.quadraticCurveTo(-98, 80, hx, hy); c.stroke();
  c.lineCap = 'butt';
  c.strokeStyle = '#4a2d16'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(hx - 6, hy - 4); c.lineTo(hx + 178, hy + 40); c.stroke();
  c.strokeStyle = 'rgba(240,232,210,0.85)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(hx, hy + 3); c.lineTo(hx + 176, hy + 46); c.stroke();
  c.fillStyle = '#c8a083'; c.beginPath(); c.ellipse(hx, hy, 11, 9, 0.2, 0, Math.PI * 2); c.fill();
  c.restore();
}

// ── a prompt box: something gets asked of me
/** A prompt box: typed from t0, Generate pressed at `go`, "generating…" until `done`. */
function prompt(c: CanvasRenderingContext2D, t: number, t0: number, text: string, go: number, done: number) {
  const a = win(t, t0 - 0.2, done + 1.3, 0.25);
  if (a <= 0) return;
  const w = 860, h = 92, x = W / 2 - w / 2 + 140, y = 820 - 140;
  c.save();
  c.globalAlpha *= a;
  at(c, x + w / 2, y + h / 2, { s: 0.94 + 0.06 * outBack(ramp(t, t0 - 0.2, t0 + 0.2)) }, () => {
    panel(c, -w / 2, -h / 2, w, h, { fill: '#1d2328', r: 14, stroke: 'rgba(255,152,56,0.45)' });
    const s = typed(text, t, t0, 16);
    mono(c, s + (t < go && blink(t) ? '▍' : ''), -w / 2 + 30, 0, { size: 30, color: C.text, max: w - 260 });
    const pressed = t > go - 0.05 && t < go + 0.15;
    rr(c, w / 2 - 190, -30, 170, 60, 10); c.fillStyle = pressed ? C.orangeHot : t > go ? C.panelHi : C.orange; c.fill();
    txt(c, t > go ? (t < done ? 'generating…' : 'done') : 'Generate', w / 2 - 105, 1, { size: 20, weight: 700, color: t > go ? C.text : '#1b1208', align: 'center', max: 150 });
    ripple(c, w / 2 - 105, 0, t - go);
  });
  c.restore();
}

function badgeNew(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, NEW - 0.2, 53.4, 0.2);
  if (a <= 0) return;
  at(c, 1430, 200, { s: pop(t, NEW - 0.2, 0.4), a }, () => {
    rr(c, -90, -34, 180, 68, 34); c.fillStyle = C.orange; c.fill();
    txt(c, '✦ NEW', 0, 2, { size: 26, weight: 800, color: '#1b1208', align: 'center', spacing: 1, max: 150 });
  });
}

// ── verse 2
function sleeve(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, SLEEVE[0], SLEEVE[1], 0.3);
  if (a <= 0) return;
  const s = 540;
  at(c, 1440, 470, { s: 0.9 + 0.1 * outCubic(ramp(t, SLEEVE[0] - 0.3, SLEEVE[0] + 0.5)), a, rot: 0.03 }, () => {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
    c.fillStyle = '#e9e1cf'; c.fillRect(-s / 2, -s / 2, s, s);
    c.restore();
    // ring wear
    c.strokeStyle = 'rgba(120,100,70,0.18)'; c.lineWidth = 10;
    c.beginPath(); c.arc(0, 0, s * 0.42, 0, Math.PI * 2); c.stroke();
    txt(c, 'SIDE A', -s / 2 + 36, -s / 2 + 50, { size: 18, weight: 800, color: '#3b3226', spacing: 3 });
    for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(59,50,38,0.4)'; rr(c, -s / 2 + 36, -s / 2 + 76 + i * 30, 160 + rnd(i) * 160, 12, 6); c.fill(); }
    txt(c, 'PERSONNEL', -s / 2 + 36, 20, { size: 18, weight: 800, color: '#3b3226', spacing: 3 });
    ['Vocals', 'Guitar', 'Bass', 'Keys', 'Drums'].forEach((r, i) => {
      const y = 62 + i * 38;
      txt(c, r, -s / 2 + 36, y, { size: 22, weight: 600, color: '#3b3226' });
      if (r !== 'Drums') { c.fillStyle = 'rgba(59,50,38,0.55)'; rr(c, -s / 2 + 170, y - 7, 140 + rnd(i * 4) * 140, 14, 7); c.fill(); return; }
      // ...and no name
      const p = 0.5 + 0.5 * Math.sin((t - 90.9) * 8);
      c.setLineDash([8, 6]); c.lineWidth = 2.5; c.strokeStyle = t > 90.6 ? `rgba(216,69,47,${0.5 + 0.5 * p})` : 'rgba(59,50,38,0.4)';
      rr(c, -s / 2 + 166, y - 16, 300, 32, 6); c.stroke(); c.setLineDash([]);
    });
  });
}

/** The event editor under the piano roll: velocity bars, the drummer's ghost notes tiny between the big hits. */
function velocityLane(c: CanvasRenderingContext2D, s: UiState) {
  const { t } = s;
  const a = Math.max(win(t, VELOCITY[0], VELOCITY[1], 0.3), win(t, DEFINITION[0], RENAME[0] - 0.4, 0.4));
  if (a <= 0) return;
  const y0 = 600, h = 250, base = y0 + h - 20;
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = 'rgba(14,18,22,0.92)'; c.fillRect(0, y0, W, h);
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, y0, W, 1);
  txt(c, 'VELOCITY', 24, y0 + 22, { size: 13, weight: 700, color: C.dim, spacing: 2 });
  mono(c, 'session drums · uncredited', 24, y0 + 44, { size: 13, color: C.faint });
  const beat = beatAt(t);
  const deleted = smooth(DELETE, DELETE + 0.35, t) * (t < RENAME[0] ? 1 : 0);
  const bars = Math.floor(beat / 4);
  // the selection box drags over the soft ones
  const sel = win(t, SELECT, DELETE + 0.1, 0.15);
  let lastLabel = -1e9;
  for (let bar = bars - 3; bar <= bars + 5; bar++) {
    for (const [st, , m, v] of drummerBar(bar)) {
      if (m === 42) continue; // hats: keep it readable
      const x = s.beatX(st);
      if (x < 300 || x > W - 10) continue;
      const soft = v < 0.3;
      const k = soft ? 1 - deleted : 1;
      if (k <= 0.001) continue;
      const bh = (h - 60) * v * k;
      const played = beat >= st;
      c.fillStyle = soft ? (played ? C.orangeHot : 'rgba(255,196,126,0.6)') : played ? C.ghost : 'rgba(168,179,196,0.5)';
      c.fillRect(x - 3, base - bh, 6, bh);
      c.beginPath(); c.arc(x, base - bh, 6, 0, Math.PI * 2); c.fill();
      // label the soft ones, but never on top of each other
      if (soft && t < DELETE && x - lastLabel > 44) {
        lastLabel = x;
        c.globalAlpha *= 0.85;
        mono(c, `${Math.round(v * 100)}%`, x, base - bh - 18, { size: 13, color: C.orangeHot, align: 'center' });
        c.globalAlpha /= 0.85;
      }
    }
  }
  if (sel > 0) {
    const k = outCubic(ramp(t, SELECT, SELECT + 1.4));
    c.save(); c.globalAlpha *= sel;
    c.setLineDash([10, 6]); c.strokeStyle = C.red; c.lineWidth = 2;
    c.fillStyle = 'rgba(255,90,78,0.08)';
    const sx = 330, sy = base - 70, sw = (W - 360) * k, sh = 66;
    c.fillRect(sx, sy, sw, sh); c.strokeRect(sx, sy, sw, sh);
    c.setLineDash([]);
    pointer(c, sx + sw, sy + sh, 1);
    c.restore();
  }
  if (t > DELETE - 0.1 && t < DELETE + 0.9) {
    const k = ramp(t, DELETE - 0.1, DELETE + 0.9);
    c.save(); c.globalAlpha *= 1 - k;
    txt(c, 'Delete', W / 2, y0 + 110, { size: 44, weight: 800, color: C.red, align: 'center' });
    c.restore();
  }
  c.restore();
}

function definition(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, DEFINITION[0], DEFINITION[1], 0.35);
  if (a <= 0) return;
  at(c, 1330, 300, { a, s: 0.96 + 0.04 * outCubic(ramp(t, DEFINITION[0] - 0.35, DEFINITION[0] + 0.4)) }, () => {
    panel(c, -400, -150, 800, 300, { fill: '#f3efe6', r: 10 });
    txt(c, 'ghost note', -360, -92, { size: 50, weight: 800, color: C.ink });
    txt(c, '/ˈɡōst nōt/   noun', -360, -40, { size: 22, weight: 500, color: '#7a7466' });
    const lines = ['A note played so softly you feel it', 'more than hear it, in between the', 'main beats. Take it out and the', "groove falls apart. Nobody knows why."];
    lines.forEach((l, i) => txt(c, l, -360, 12 + i * 34, { size: 24, weight: 500, color: '#3c3a34' }));
  });
}

/** "a million bedroom loops that never made it past eight bars" */
function playlist(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, PLAYLIST[0], PLAYLIST[1], 0.25);
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = '#1a2025'; c.fillRect(0, 58, W, H - 58);
  const z = Math.pow(0.012, inCubic(ramp(t, PLAYLIST[0] + 0.6, PLAYLIST[1] - 0.6)) * 0.9 + smooth(PLAYLIST[0] + 0.6, PLAYLIST[1], t) * 0.1);
  const th = 64 * z, bw = 38 * z, left = 250 * Math.min(1, z * 3);
  // header: bar numbers, and a line at bar 9 nobody ever crosses
  c.fillStyle = '#20272d'; c.fillRect(0, 58, W, 34);
  const bars = Math.ceil((W - left) / bw);
  if (bw > 8) for (let b = 0; b < bars; b += bw > 24 ? 1 : 8) mono(c, String(b + 1), left + b * bw + 4, 75, { size: 12, color: C.dim });
  const rows = Math.min(1400, Math.ceil((H - 92) / th) + 1);
  for (let r = 0; r < rows; r++) {
    const y = 92 + r * th;
    if (th > 6) { c.fillStyle = r % 2 ? '#1d2429' : '#1a2025'; c.fillRect(0, y, W, th); }
    // a track: one pattern, eight bars, then nothing
    const start = r < 6 ? 0 : Math.floor(rnd(r * 1.7) * (r < 60 ? 30 : 4000));
    const x = left + start * bw;
    if (x > W) continue;
    c.fillStyle = CHANNEL[Math.floor(rnd(r * 3.1) * CHANNEL.length)];
    c.globalAlpha = a * (th > 6 ? 0.9 : 0.75);
    c.fillRect(x + 1, y + 1, Math.max(1, 8 * bw - 2), Math.max(1, th - 2));
    c.globalAlpha = a;
    if (th > 30) {
      // the clip's own mini piano roll, and its name
      c.fillStyle = 'rgba(0,0,0,0.35)';
      for (let n = 0; n < 24; n++) c.fillRect(x + 6 + n * (8 * bw - 12) / 24, y + th * (0.35 + rnd(r * 9 + n) * 0.5), (8 * bw - 12) / 30, 3);
      txt(c, `Pattern ${r + 1}`, x + 8, y + 14, { size: 13, weight: 700, color: 'rgba(255,255,255,0.9)' });
    }
    if (th > 30) txt(c, `Track ${r + 1}`, 20, y + th / 2, { size: 14, weight: 600, color: C.dim });
  }
  // zoomed all the way out: a million loops, a mosaic of everyone's colours
  const far = smooth(16, 5, th);
  if (far > 0) {
    c.save();
    c.globalAlpha = a * far;
    const tile = mosaic(), k = Math.max(th / 3, 0.6); // the tile is drawn at 3 px per track
    c.translate(left, 92); c.scale(k, k);
    c.fillStyle = c.createPattern(tile, 'repeat')!;
    c.fillRect(0, 0, (W - left) / k, (H - 92) / k);
    c.restore();
  }
  // the bar 9 line (for the first tracks)
  const nine = left + 8 * bw;
  const lk = win(t, 98.2, PLAYLIST[1], 0.2);
  if (lk > 0 && nine < W) {
    c.globalAlpha = a * lk;
    c.fillStyle = C.red; c.fillRect(nine - 1, 58, 3, H);
    txt(c, 'bar 9 →', nine + 12, 112, { size: 22, weight: 800, color: C.red });
  }
  c.globalAlpha = a;
  // the counter
  const n = Math.floor(lerp(6, 1000000, Math.pow(ramp(t, PLAYLIST[0] + 0.6, PLAYLIST[1] - 0.8), 3)));
  panel(c, W - 470, H - 300, 420, 110, { fill: 'rgba(14,18,22,0.92)' });
  txt(c, 'PATTERNS', W - 440, H - 270, { size: 14, weight: 700, color: C.dim, spacing: 2 });
  mono(c, fmt(n), W - 80, H - 230, { size: 46, weight: 700, color: C.orangeHot, align: 'right' });
  c.restore();
}

let MOSAIC: HTMLCanvasElement | null = null;
/** A tile of tiny tracks, each with a few 8-bar loops in channel colours (3 px per track). Built once. */
function mosaic() {
  if (MOSAIC) return MOSAIC;
  const cv = document.createElement('canvas');
  cv.width = 1200; cv.height = 480;
  const g = cv.getContext('2d')!;
  for (let r = 0; r < 160; r++) {
    let x = rnd(r * 7.3) * 90;
    while (x < 1188) {
      g.fillStyle = CHANNEL[Math.floor(rnd(r * 13.1 + x) * CHANNEL.length)];
      g.globalAlpha = 0.6 + 0.35 * rnd(r + x * 0.37);
      g.fillRect(x, r * 3, 12, 2.2);
      x += 26 + rnd(r * 3.9 + x) * 90;
    }
  }
  MOSAIC = cv;
  return cv;
}

/** "a lullaby a father made up driving in the car" */
function memo(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, MEMO[0], MEMO[1], 0.3);
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  // the road at night, rushing toward us: centre-line dashes and passing street lights
  const vx = 760, vy = 560;
  const g = c.createLinearGradient(0, vy, 0, H);
  g.addColorStop(0, 'rgba(8,10,16,0)'); g.addColorStop(1, 'rgba(8,10,16,0.88)');
  c.fillStyle = g; c.fillRect(0, vy, W, H - vy);
  const road = (p: number, side: number) => [vx + p * p * (-260 + side * 1500), vy + p * p * 640] as const;
  c.fillStyle = 'rgba(30,34,44,0.55)';
  c.beginPath(); c.moveTo(vx, vy); c.lineTo(...road(1.15, -1)); c.lineTo(...road(1.15, 1)); c.closePath(); c.fill();
  for (let i = 0; i < 10; i++) {
    const p = (i / 10 + t * 0.5) % 1, q = p + 0.035;
    const [x1, y1] = road(p, 0), [x2, y2] = road(q, 0), w1 = 1 + p * p * 14, w2 = 1 + q * q * 14;
    c.fillStyle = `rgba(255,230,170,${0.2 + p * 0.7})`;
    c.beginPath(); c.moveTo(x1 - w1, y1); c.lineTo(x1 + w1, y1); c.lineTo(x2 + w2, y2); c.lineTo(x2 - w2, y2); c.closePath(); c.fill();
  }
  for (let i = 0; i < 6; i++) {
    const p = (i / 6 + t * 0.35) % 1;
    const x = vx + p * p * 1500, y = vy - p * p * 420;
    const r = 2 + p * p * 22;
    const lg = c.createRadialGradient(x, y, 0, x, y, r * 3);
    lg.addColorStop(0, `rgba(255,190,110,${0.3 + p * 0.6})`); lg.addColorStop(1, 'rgba(255,190,110,0)');
    c.fillStyle = lg; c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }
  // the phone
  at(c, 1470, 430, { s: 0.92 + 0.08 * outCubic(ramp(t, MEMO[0] - 0.3, MEMO[0] + 0.4)), rot: -0.04 }, () => {
    panel(c, -190, -300, 380, 600, { fill: '#0c0d10', r: 36 });
    rr(c, -170, -280, 340, 560, 26); c.fillStyle = '#16181d'; c.fill();
    txt(c, 'Voice Memo 14', -140, -210, { size: 30, weight: 700, color: '#f2f2f2' });
    txt(c, 'in the car · 0:38', -140, -170, { size: 20, weight: 500, color: '#8d929b' });
    // the waveform, scrolling
    for (let i = 0; i < 46; i++) {
      const v = 0.15 + 0.85 * Math.abs(Math.sin(i * 0.55 + t * 3) * rnd(i + Math.floor(t * 8)));
      c.fillStyle = i > 30 ? '#4a4f59' : C.red;
      rr(c, -150 + i * 6.5, -30 - v * 60, 3.5, v * 120, 2); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(-150 + 31 * 6.5, -110, 2, 160);
    mono(c, `0:${String(12 + Math.floor((t - MEMO[0]) * 1.6)).padStart(2, '0')}`, 0, 110, { size: 34, color: '#f2f2f2', align: 'center' });
    c.fillStyle = C.red; c.beginPath(); c.arc(0, 200, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; rr(c, -11, 189, 22, 22, 4); c.fill();
  });
  c.restore();
}

function midiToast(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, KEYS[0] + 0.3, KEYS[1], 0.25);
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  panel(c, W - 520, 100, 470, 84, { fill: C.panel2 });
  txt(c, 'MIDI keyboard', W - 490, 128, { size: 20, weight: 700, color: C.text });
  txt(c, 'no device connected · 0 keys pressed', W - 490, 158, { size: 17, weight: 500, color: C.dim });
  c.fillStyle = C.red; c.beginPath(); c.arc(W - 80, 142, 8, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** "I'm just the room your songs walked into after they left": their names drift in from the edges and are gone. */
function room(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, ROOM[0], ROOM[1], 0.4);
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  const names = [...LAYER_NAMES, 'lullaby (car)', 'cello, four bars', 'kid_kick04', 'take 7', 'karaoke night', 'grandma, humming'];
  names.forEach((name, i) => {
    const t0 = ROOM[0] + rnd(i * 2.3) * 3.6, k = ramp(t, t0, t0 + 2.2);
    if (k <= 0 || k >= 1) return;
    const ang = rnd(i * 5.1) * Math.PI * 2, r0 = 1250, cx = 980, cy = 520;
    const e = inCubic(k);
    const x = cx + Math.cos(ang) * r0 * (1 - e), y = cy + Math.sin(ang) * r0 * 0.6 * (1 - e);
    at(c, x, y, { s: 1 - e * 0.9, a: Math.sin(k * Math.PI) }, () => {
      c.font = `600 22px ${SANS}`;
      const w = c.measureText(name).width + 34;
      rr(c, -w / 2, -20, w, 40, 20); c.fillStyle = 'rgba(168,179,196,0.16)'; c.fill();
      c.strokeStyle = 'rgba(168,179,196,0.4)'; c.lineWidth = 1.5; c.stroke();
      txt(c, name, 0, 1, { size: 22, weight: 600, color: C.ghost, align: 'center' });
    });
  });
  c.restore();
}

// ── bridge
function rename(c: CanvasRenderingContext2D, t: number) {
  const a = win(t, RENAME[0], RENAME[1], 0.3);
  if (a <= 0) return;
  const knew = 179.76;
  const shake = wobble(t, 180.6, 18, 9);
  at(c, W / 2 + shake, 430, { a, s: 0.95 + 0.05 * outBack(ramp(t, RENAME[0] - 0.3, RENAME[0] + 0.15)) }, () => {
    const w = 700, h = 250;
    const top = modernWindow(c, -w / 2, -h / 2, w, h, 'Rename channel');
    txt(c, 'Channel 12 of 41,206,553', -w / 2 + 30, top + 36, { size: 18, weight: 500, color: C.dim });
    rr(c, -w / 2 + 30, top + 62, w - 60, 62, 6); c.fillStyle = '#10151a'; c.fill();
    c.strokeStyle = t > 180.5 && t < 181.4 ? C.red : C.orange; c.lineWidth = 2; c.stroke();
    // a name was about to go here
    let s = '';
    if (t > knew) s = t < 180.5 ? typed('?', t, knew, 3) : '';
    const placeholder = !s && t < knew;
    txt(c, placeholder ? 'name' : s, -w / 2 + 50, top + 93, { size: 30, weight: 500, color: placeholder ? C.faint : C.text });
    if (blink(t)) { c.fillStyle = C.orange; c.fillRect(-w / 2 + 50 + (s ? 22 : 0), top + 75, 3, 36); }
    if (t > 180.5 && t < 182) txt(c, 'unknown', w / 2 - 44, top + 93, { size: 20, weight: 600, color: C.red, align: 'right' });
  });
}

/** "So turn up all the ghost notes": one fader, all the way. */
function fader(c: CanvasRenderingContext2D, t: number, s: UiState) {
  const a = win(t, TURN_UP[0], TURN_UP[1], 0.3);
  if (a <= 0) return;
  const k = outCubic(ramp(t, TURN_UP[0] + 0.4, 205.9));
  at(c, 1600, 470, { a, s: 0.95 + 0.05 * outCubic(ramp(t, TURN_UP[0] - 0.3, TURN_UP[0] + 0.3)) }, () => {
    const w = 190, h = 560;
    panel(c, -w / 2, -h / 2, w, h, { fill: C.panel });
    txt(c, 'GHOSTS', 0, -h / 2 + 30, { size: 20, weight: 800, color: C.orangeHot, align: 'center', spacing: 2 });
    const top = -h / 2 + 80, bot = h / 2 - 80;
    c.fillStyle = '#0d1114'; c.fillRect(-40, top, 10, bot - top);
    // meter
    const lvl = clamp01(k * (0.85 + s.bass * 0.3));
    for (let i = 0; i < 30; i++) {
      const on = i / 30 < lvl, y = bot - (i + 1) * ((bot - top) / 30);
      c.fillStyle = on ? (i > 26 ? C.red : i > 21 ? C.amber : C.green) : '#1a2024';
      c.fillRect(20, y + 2, 26, (bot - top) / 30 - 4);
    }
    // fader cap
    const fy = lerp(bot - 10, top + 10, k);
    rr(c, -62, fy - 18, 54, 36, 5); c.fillStyle = '#c9cfd4'; c.fill();
    c.fillStyle = C.orange; c.fillRect(-62, fy - 2, 54, 4);
    mono(c, k > 0.98 ? '+6.0 dB' : `${lerp(-60, 6, k).toFixed(1)} dB`, 0, h / 2 - 40, { size: 18, weight: 700, color: C.text, align: 'center' });
    pointer(c, -20, fy + 6, 1, true);
  });
}

/** The break: the mixer, one insert per song, more than there's room for. */
function mixer(c: CanvasRenderingContext2D, s: UiState) {
  const { t } = s;
  const a = win(t, MIXER[0], MIXER[1], 0.2);
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = '#13181c'; c.fillRect(0, 0, W, H);
  const zoom = Math.pow(0.06, inCubic(ramp(t, MIXER[0] + 1.6, MIXER[1] - 0.3)));
  const sw = 120 * zoom, sh = 760 * Math.max(zoom, 0.12), y0 = H / 2 - sh / 2 - 20 * zoom;
  const n = Math.ceil(W / sw) + 1;
  const names = ['Master', ...LAYER_NAMES];
  for (let i = 0; i < n; i++) {
    const x = i * sw;
    c.fillStyle = i === 0 ? '#2a3238' : i % 2 ? '#20272c' : '#1d2429';
    c.fillRect(x + 1, y0, sw - 2, sh);
    // each insert wears its song's colour
    c.fillStyle = i === 0 ? C.orange : i <= LAYER_COLORS.length ? LAYER_COLORS[i - 1] : CHANNEL[i % CHANNEL.length];
    c.fillRect(x + 1, y0, sw - 2, Math.max(1, 8 * Math.max(zoom, 0.12)));
    // meter: each song bounces to its own share of the music
    const band = [s.bass, s.mid, s.high][i % 3];
    const lvl = clamp01(band * (0.7 + rnd(i * 1.9) * 0.5) + s.kick * 0.2 * rnd(i * 3.3));
    const mh = (sh - 120 * Math.max(zoom, 0.12)) * lvl;
    const g = c.createLinearGradient(0, y0 + sh, 0, y0);
    g.addColorStop(0, C.green); g.addColorStop(0.75, C.amber); g.addColorStop(1, C.red);
    c.fillStyle = g;
    c.fillRect(x + sw * 0.55, y0 + sh - 20 * Math.max(zoom, 0.12) - mh, sw * 0.18, mh);
    if (zoom > 0.4) {
      // fader track and cap
      c.fillStyle = '#0c1013'; c.fillRect(x + sw * 0.25, y0 + 120, 8, sh - 200);
      rr(c, x + sw * 0.25 - 16, y0 + 120 + (sh - 200) * (0.3 + rnd(i) * 0.3), 40, 24, 4); c.fillStyle = '#b9c0c6'; c.fill();
      const label = i < names.length ? names[i] : `Insert ${i}`;
      c.save(); c.translate(x + 22, y0 + sh - 40); c.rotate(-Math.PI / 2);
      txt(c, label, 0, 0, { size: 15, weight: 600, color: i === 0 ? C.orangeHot : C.text, max: sh - 200 });
      c.restore();
      mono(c, String(i), x + sw / 2, y0 + 30, { size: 14, color: C.dim, align: 'center' });
    }
  }
  // header and the count
  c.fillStyle = C.bg; c.fillRect(0, 0, W, 58);
  logo(c, 34, 29, 34);
  txt(c, 'Mixer', 64, 29, { size: 18, weight: 700, color: C.text });
  const count = Math.floor(lerp(25, 41206553, Math.pow(ramp(t, MIXER[0] + 1.6, MIXER[1] - 0.3), 2.5)));
  mono(c, `${fmt(count)} inserts`, W - 30, 29, { size: 18, weight: 700, color: C.orangeHot, align: 'right' });
  c.restore();
}

// ── always on top
/** The dive through the 2004 screen lands in a white flash. */
function flash(c: CanvasRenderingContext2D, t: number) {
  const a = smooth(DIVE + 0.9, ROLL_IN - 0.05, t) * (1 - smooth(ROLL_IN, ROLL_IN + 0.6, t));
  if (a <= 0) return;
  c.fillStyle = `rgba(255,246,232,${a})`;
  c.fillRect(0, 0, W, H);
}

function subtitle(c: CanvasRenderingContext2D, t: number) {
  const { i, alpha } = karaokeAt(KARAOKE, t);
  if (i < 0) return;
  c.save();
  const g = c.createLinearGradient(0, H - 210, 0, H);
  g.addColorStop(0, 'rgba(8,10,12,0)'); g.addColorStop(1, 'rgba(8,10,12,0.8)');
  c.globalAlpha = alpha; c.fillStyle = g; c.fillRect(0, H - 210, W, 210);
  c.font = `600 46px ${SANS}`;
  c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 16;
  karaokeText(c, LYRICS[i].text, WORD_TIMES[i], t, W / 2, H - 80, W - 200, 'rgba(200,210,222,0.4)', C.orangeHot);
  c.restore();
}

function credits(c: CanvasRenderingContext2D, t: number) {
  if (t < CREDITS_START - 0.2) return;
  const out = 1 - smooth(DURATION - 2.0, DURATION - 0.4, t);
  c.save();
  c.globalAlpha = smooth(CREDITS_START - 0.2, CREDITS_START + 0.8, t) * out * 0.75;
  c.fillStyle = '#05070a'; c.fillRect(0, 0, W, H);
  CREDITS.forEach(([label, value], i) => {
    const y = H / 2 - 170 + i * 85;
    c.globalAlpha = smooth(CREDITS_START + i * 0.8, CREDITS_START + i * 0.8 + 0.7, t) * out;
    txt(c, label.toUpperCase(), W / 2 - 230, y, { size: 24, weight: 700, color: C.orange, align: 'right', spacing: 3, max: 420 });
    txt(c, value, W / 2 - 190, y, { size: 32, color: '#eef1f4', font: MONO, max: 920 });
  });
  c.restore();
}
