// The songs behind the song: every ghost layer of the piano roll is somebody's track. All seeded, so every
// frame (and every export) sees exactly the same notes.
import { CHANNEL } from './art';
import { MELODY } from './melody';
import { beatAt } from './timeline';

/** One note in beats: [start, length, midi, velocity 0..1]. */
export type Note = [number, number, number, number];

export interface Layer { name: string; notes: Note[] }

/** The first four layers are the ones the lyrics name; the rest are everybody else. */
export const LAYER_NAMES = [
  'girl_beat_01.flp · 2004',
  'VID_0347.mp4 · sideways',
  'session drums · uncredited',
  'Voice Memo 14 · car',
  'demo_final_FINAL.flp',
  'hymn no. 214',
  'wedding set, 2011',
  'practice, tuesday',
  'for_mia.mp3',
  'busking in the rain',
  'audition take 2',
  'Pattern 1',
  'untitled loop 88',
  'song for dad',
  'bedroom take 4',
  'b-side, 1997',
  'jam w/ sam',
  'not finished',
  'church organ, 6am',
  'first song ever',
  'MIDI_0042.mid',
  'tape_3_side_b',
  'kids choir, spring',
  'night shift',
];
export const N_LAYERS = LAYER_NAMES.length;

/** Her beat is red, the cello purple, the drummer coral, the lullaby teal; everybody else cycles through the rest. */
const ORDER = [2, 5, 3, 7, 1, 4, 6, 0];
export const LAYER_COLORS = LAYER_NAMES.map((_, i) => CHANNEL[[0, 6, 1, 4][i] ?? ORDER[(i - 4) % ORDER.length]]);

// ── her 2004 pattern: sixteen steps lit across four channels (4 + 2 + 8 + 2 = 16 squares)
export const RACK_CHANNELS = ['Kick', 'Clap', 'Hat', 'Snare'];
export const RACK_STEPS: number[][] = [
  [0, 3, 8, 10],
  [4, 12],
  [0, 2, 4, 6, 8, 10, 12, 14],
  [7, 15],
];
/** The order she clicks them in (channel, step), sixteen clicks. */
export const CLICK_ORDER: [number, number][] = [
  [0, 0], [0, 3], [0, 8], [0, 10], [1, 4], [1, 12], [2, 0], [2, 2], [2, 4], [2, 6], [2, 8], [2, 10], [2, 12], [2, 14], [3, 7], [3, 15],
];
const RACK_PITCH = [55, 57, 62, 59]; // where her channels land in the piano roll

// ── the old man's four bars, D minor, one long note each
export const CELLO = [50, 46, 53, 45];

function mulberry(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FROM = 40, TO = 500; // beats where the roll can be seen (with margin)
const MINOR = [0, 2, 3, 5, 7, 8, 10], MAJOR = [0, 2, 4, 5, 7, 9, 11];
const inScale = (root: number, scale: number[], deg: number) => root + 12 * Math.floor(deg / 7) + scale[((deg % 7) + 7) % 7];

function girl(): Note[] {
  const out: Note[] = [];
  for (let bar = FROM / 4; bar < TO / 4; bar++)
    RACK_STEPS.forEach((steps, ch) => steps.forEach((s) => out.push([bar * 4 + s / 4, 0.22, RACK_PITCH[ch], ch === 2 ? 0.6 : 1])));
  return out;
}

function cello(): Note[] {
  const out: Note[] = [];
  for (let bar = FROM / 4; bar < TO / 4; bar++) out.push([bar * 4, 3.85, CELLO[bar % 4], 0.9]);
  return out;
}

/** A session drummer's half-time groove: big hits, and the soft ghost notes in between that hold it up. */
export function drummerBar(bar: number): Note[] {
  const b = bar * 4;
  return [
    [b, 0.2, 36, 1], [b + 2.5, 0.2, 36, 0.95], // kick
    [b + 2, 0.2, 38, 1], // backbeat (half time)
    [b + 0.75, 0.15, 38, 0.16], [b + 1.25, 0.15, 38, 0.2], [b + 1.75, 0.15, 38, 0.14], // ghost notes
    [b + 3.25, 0.15, 38, 0.18], [b + 3.5, 0.15, 38, 0.22], [b + 3.75, 0.15, 38, 0.15],
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k): Note => [b + k / 2, 0.15, 42, k % 2 ? 0.45 : 0.75]),
  ];
}
function drummer(): Note[] {
  const out: Note[] = [];
  for (let bar = FROM / 4; bar < TO / 4; bar++) out.push(...drummerBar(bar));
  return out;
}

function lullaby(): Note[] {
  // a little tune in F, high and slow, the same four bars over and over
  const tune = [[0, 1.5, 77], [1.5, 0.5, 76], [2, 2, 74], [4, 1, 72], [5, 1, 74], [6, 2, 77], [8, 1.5, 79], [9.5, 0.5, 77], [10, 2, 76], [12, 3.5, 72]];
  const out: Note[] = [];
  for (let b = FROM; b < TO; b += 16) for (const [s, l, m] of tune) out.push([b + s, l - 0.05, m, 0.7]);
  return out;
}

function stranger(seed: number): Note[] {
  const r = mulberry(seed * 7919 + 13);
  const kind = ['melody', 'chords', 'bass', 'arp', 'drums', 'melody', 'chords', 'arp'][seed % 8];
  const root = 50 + Math.floor(r() * 12), scale = r() < 0.5 ? MINOR : MAJOR;
  const out: Note[] = [];
  const offset = Math.floor(r() * 4) * 4; // songs start on different bars
  if (kind === 'melody') {
    let deg = 7 + Math.floor(r() * 5);
    for (let bar = FROM / 4; bar < TO / 4; bar++) {
      if (r() < 0.25) continue; // rests
      let b = 0;
      while (b < 4) {
        const len = [0.5, 0.5, 1, 1, 1.5, 2][Math.floor(r() * 6)];
        deg = Math.max(3, Math.min(14, deg + Math.round((r() - 0.5) * 4)));
        if (r() < 0.85) out.push([bar * 4 + b, Math.min(len, 4 - b) - 0.06, inScale(root, scale, deg), 0.5 + r() * 0.5]);
        b += len;
      }
    }
  } else if (kind === 'chords') {
    for (let b = FROM + offset; b < TO; b += 8) {
      const deg = [0, 5, 3, 4, 0, 3, 5, 4][Math.floor(b / 8) % 8];
      for (const k of [0, 2, 4]) out.push([b, 7.8, inScale(root, scale, deg + k), 0.6]);
    }
  } else if (kind === 'bass') {
    for (let b = FROM; b < TO; b += 1) {
      const deg = [0, 5, 3, 4][Math.floor(b / 8) % 4];
      if (r() < 0.8) out.push([b, r() < 0.5 ? 0.45 : 0.9, inScale(root - 12, scale, deg) - (root > 56 ? 12 : 0), 0.8]);
    }
  } else if (kind === 'arp') {
    for (let bar = FROM / 4; bar < TO / 4; bar++) {
      if (bar % 4 >= 2) continue;
      const deg = [0, 5, 3, 4][bar % 4];
      for (let k = 0; k < 16; k++) out.push([bar * 4 + k / 4, 0.2, inScale(root + 12, scale, deg + [0, 2, 4, 7][k % 4]), 0.4 + 0.3 * r()]);
    }
  } else {
    for (let bar = FROM / 4; bar < TO / 4; bar++) {
      const b = bar * 4;
      out.push([b, 0.2, 36, 1], [b + 1, 0.2, 40, 0.9], [b + 2, 0.2, 36, 1], [b + 3, 0.2, 40, 0.9]);
      for (let k = 0; k < 8; k++) if (r() < 0.8) out.push([b + k / 2, 0.15, 44, 0.5]);
    }
  }
  return out;
}

export const LAYERS: Layer[] = LAYER_NAMES.map((name, i) => ({
  name,
  notes: i === 0 ? girl() : i === 1 ? cello() : i === 2 ? drummer() : i === 3 ? lullaby() : stranger(i),
}));

// ── the AI's own notes: the sung melody, one note per word (beats), and where each one's twin is hiding
export interface Bright { start: number; len: number; midi: number; twin: number; color: string }
export const BRIGHT: Bright[] = MELODY.flat().map(([s, e, m], i) => {
  const start = beatAt(s), len = Math.max(0.3, beatAt(e) - start - 0.06);
  const twin = 5 + Math.floor(mulberry(i * 31 + 7)() * (N_LAYERS - 4)); // a depth, 5..N (layers 1-4 are the ones the lyrics name)
  return { start, len, midi: m, twin, color: LAYER_COLORS[twin - 1] };
});
