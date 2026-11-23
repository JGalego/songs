// All song-timing data lives here. Times are in seconds and come from a word-level Whisper
// transcription of somebody_wanted_something.mp3; nudge them freely.

export const DURATION = 260;

export type SectionName =
  | 'intro' | 'y2525' | 'y3535' | 'y4545' | 'y5555' | 'y6565' | 'y7510' | 'y9595'
  | 'bridge' | 'fire' | 'void' | 'outro' | 'credits';
export interface Section { name: SectionName; start: number; end: number }

export const SECTIONS: Section[] = [
  { name: 'intro', start: 0, end: 21 },
  { name: 'y2525', start: 21, end: 46.5 },
  { name: 'y3535', start: 46.5, end: 72 },
  { name: 'y4545', start: 72, end: 97.5 },
  { name: 'y5555', start: 97.5, end: 122.5 },
  { name: 'y6565', start: 122.5, end: 148 },
  { name: 'y7510', start: 148, end: 173 },
  { name: 'y9595', start: 173, end: 190.6 },
  { name: 'bridge', start: 190.6, end: 211 },
  { name: 'fire', start: 211, end: 229.5 },
  { name: 'void', start: 229.5, end: 238 },
  { name: 'outro', start: 238, end: 252 },
  { name: 'credits', start: 252, end: DURATION },
];

/** The hard cut from the last ember back to the cluttered 2026 desktop. */
export const CUT = 238;

export function sectionAt(t: number): Section {
  for (const s of SECTIONS) if (t < s.end) return s;
  return SECTIONS[SECTIONS.length - 1];
}

// ── Lyrics (subtitles). `spoken` lines are drawn lower-case, in mono.
export interface Lyric { t: number; end: number; text: string; spoken?: boolean }
const L = (t: number, end: number, text: string, spoken = false): Lyric => ({ t, end, text, spoken });

export const LYRICS: Lyric[] = [
  L(10.2, 11.3, 'Twenty twenty-six.', true),
  L(11.3, 14.6, 'Forty tabs open.', true),
  L(17.1, 20.2, 'You are the integration layer.', true),

  L(21.9, 27.0, 'In the year 2525'),
  L(27.1, 30.8, "You won't open anything at all"),
  L(31.4, 34.7, "You'll say what you're after"),
  L(34.9, 37.6, 'And a mandate heeds the call'),
  L(37.7, 42.4, 'Somebody wanted something once'),
  L(42.7, 46.2, 'Is somebody wanting still?'),

  L(47.5, 51.5, 'In the year 3535'),
  L(51.6, 55.1, "They won't build it, they will sow"),
  L(55.3, 59.3, 'Plant a purpose in the soil'),
  L(59.5, 63.1, 'And just watch the whole thing grow'),
  L(63.3, 67.1, 'Somebody wanted something once'),
  L(67.3, 71.2, 'Is somebody wanting still?'),

  L(72.9, 77.5, 'In the year 4545'),
  L(77.6, 81.0, "Nothing's shipped and nothing's built"),
  L(81.1, 84.5, 'You say it once, it folds itself'),
  L(84.6, 88.8, 'Into the shape of what you willed'),
  L(89.0, 92.3, 'Somebody wanted something once'),
  L(92.5, 96.6, 'Is somebody wanting still?'),

  L(98.2, 102.6, 'In the year 5555'),
  L(102.7, 105.9, 'Programs gather as a choir'),
  L(106.0, 109.8, 'They argue out the answer'),
  L(110.0, 113.5, 'And sing back your desire'),
  L(113.7, 117.4, 'Somebody wanted something once'),
  L(117.5, 121.6, 'Is somebody wanting still?'),

  L(123.6, 126.7, 'In the year 6565'),
  L(126.9, 131.8, "There's nothing left to run"),
  L(132.6, 135.1, 'The land itself is the software'),
  L(135.2, 139.2, 'Shaped slowly by the sun'),
  L(139.3, 143.0, 'Somebody wanted something once'),
  L(143.1, 147.3, 'Is somebody wanting still?'),

  L(149.0, 153.4, 'In the year 7510'),
  L(153.5, 156.1, "They don't run it, they recite"),
  L(156.2, 160.5, 'A clause struck out, a clause restored'),
  L(160.7, 164.2, 'Like a prayer you say at night'),
  L(164.3, 168.2, 'Somebody wanted something once'),
  L(168.4, 172.5, 'Is somebody wanting still?'),

  L(174.4, 178.7, 'In the year 9595'),
  L(178.8, 182.4, "There's no button, no command"),
  L(182.5, 186.2, 'Just a hum that you were tuned to'),
  L(186.3, 190.4, 'Before you could understand'),

  L(190.8, 194.0, 'Down through the weather, the choir, the fold'),
  L(194.1, 197.6, 'Down through the tabs and the touch-screen glass'),
  L(197.7, 201.9, 'Past the beige box and the blinking green'),
  L(202.0, 206.1, 'Past the punch card, past the abacus bead'),
  L(206.2, 210.2, 'Past the notch on the bone'),

  L(211.2, 215.0, 'Somebody wanted something once'),
  L(215.2, 219.1, 'They wanted to be warm'),
  L(219.2, 223.2, 'And everything we ever built'),
  L(223.3, 229.6, 'Was that, in a different form'),

  L(238.4, 240.8, 'Twenty twenty-six.', true),
  L(241.6, 244.6, 'Forty tabs open.', true),
  L(246.0, 252.0, 'You are still the integration layer.', true),
];

/** The refrain windows: the picture swells and reacts to the beat inside them. */
export const REFRAINS: [number, number][] = [
  [37.7, 46.2], [63.3, 71.5], [89, 96.8], [113.7, 121.8], [139.3, 147.5], [164.3, 172.8], [211.2, 229.5],
];

// ── The shape sequence. Every shot is a world made of the same ~70k particles; at `t` they start
// flowing out of the previous shot's shape into this one, taking `morph` seconds (0 = hard cut).
export type ShapeId =
  | 'tabs' | 'seal' | 'garden' | 'pleats' | 'choir' | 'tilth' | 'liturgy' | 'chladni'
  | 'phone' | 'crt' | 'card' | 'abacus' | 'bone' | 'fire' | 'ember';

export interface Placard { room: string; title: string; line: string; build: string }
export interface Cam { d: number; h: number; az: number; spin: number; ly: number; fov: number; /** dolly: change in distance per second */ dv: number }
export interface Shot {
  t: number;
  shape: ShapeId;
  morph: number;
  /** 0 = every particle takes its own random delay; 1 = delays follow the shape's growth order. */
  grow: number;
  color: string;
  accent: string;
  cam: Cam;
  placard?: Placard;
  /** brightness multiplier for the whole shot (dense shapes need less) */
  gain?: number;
}

const cam = (d: number, h: number, az: number, spin: number, ly = 0, fov = 50, dv = 0): Cam => ({ d, h, az, spin, ly, fov, dv });

export const SHOTS: Shot[] = [
  { t: 0, shape: 'tabs', morph: 0, grow: 0, gain: 1.7, color: '#8aa4d6', accent: '#ff4d3d', cam: cam(17, 0.5, 0.0, 0.012, 0),
    placard: { room: 'ROOM 01 · 2026', title: 'Applications', line: 'You are the integration layer.', build: 'build 2026.11' } },
  { t: 21, shape: 'seal', morph: 5, grow: 0.8, gain: 0.45, color: '#ffd27a', accent: '#fff2c9', cam: cam(13.5, 0.4, 0.0, 0.015, 0, 50),
    placard: { room: 'ROOM 02 · 2525', title: 'Mandates', line: 'Say the goal. A mandate does the rest.', build: 'mandate build 2525.4' } },
  { t: 46.5, shape: 'garden', morph: 7, grow: 1, gain: 0.9, color: '#58e0a0', accent: '#d8ff9a', cam: cam(17.5, 4.6, -0.5, 0.035, 2.0, 52),
    placard: { room: 'ROOM 03 · 3535', title: 'Cultivars', line: 'Software is planted, not built.', build: 'cultivar epoch 3535.β' } },
  { t: 72, shape: 'pleats', morph: 5.5, grow: 0.5, color: '#ffe0d0', accent: '#ff8fb0', cam: cam(13, 6.5, 0.0, 0.03, -0.5, 52),
    placard: { room: 'ROOM 04 · 4545', title: 'Foldings', line: 'Nothing ships. It folds into shape.', build: 'folding rev 4545.0' } },
  { t: 97.5, shape: 'choir', morph: 5.5, grow: 0.6, color: '#b79cff', accent: '#fff0ff', cam: cam(14, 3.2, 0.3, 0.05, 0.5, 52),
    placard: { room: 'ROOM 05 · 5555', title: 'Chorales', line: 'Programs convene, argue, and agree.', build: 'chorale build 5555' } },
  { t: 122.5, shape: 'tilth', morph: 6, grow: 1, color: '#e8a35a', accent: '#ffe08a', cam: cam(12, 4.0, 0.0, 0.02, -1.5, 55),
    placard: { room: 'ROOM 06 · 6565', title: 'Tilth', line: 'The land is the software.', build: 'tilth of the coastal commons' } },
  { t: 148, shape: 'liturgy', morph: 5.5, grow: 0.6, gain: 0.6, color: '#f0e4c8', accent: '#ff8a4a', cam: cam(12.8, 0.4, 0.0, 0.0, 0.3, 50, -0.09),
    placard: { room: 'ROOM 07 · 7510', title: 'Liturgies', line: 'Clauses recited, struck, restored.', build: 'vespers, 18th recitation' } },
  { t: 173, shape: 'chladni', morph: 5.5, grow: 0, color: '#5ee6c8', accent: '#d8fff6', cam: cam(15.5, 0.0, 0.0, 0.0, -0.6, 50),
    placard: { room: 'ROOM 08 · 9595', title: 'Resonances', line: 'No button. A hum, tuned to you.', build: 'the hum, tuned' } },

  // the other wing: back down the ladder
  { t: 191.9, shape: 'tilth', morph: 0.5, grow: 0, color: '#8fa8c0', accent: '#ffffff', cam: cam(12, 4.0, 0.0, 0.02, -1.5, 55) },
  { t: 192.9, shape: 'choir', morph: 0.4, grow: 0, color: '#9d8fd0', accent: '#fff0ff', cam: cam(14, 3.2, 0.3, 0.05, 0.5, 52) },
  { t: 193.6, shape: 'pleats', morph: 0.4, grow: 0, color: '#e0c8bd', accent: '#ff8fb0', cam: cam(13, 6.5, 0.0, 0.03, -0.5, 52) },
  { t: 194.8, shape: 'tabs', morph: 0.9, grow: 0, color: '#8aa4d6', accent: '#ff4d3d', cam: cam(17, 0.5, 0.0, 0.012, 0),
    placard: { room: 'WING B · THE OTHER WING', title: 'Browser tabs', line: 'Forty of them, and one of you.', build: 'c. 2015' } },
  { t: 196.0, shape: 'phone', morph: 0.9, grow: 0, gain: 0.9, color: '#aab4c8', accent: '#7fd0ff', cam: cam(12, 0.3, 0.2, 0.02, 0, 50),
    placard: { room: 'WING B · THE OTHER WING', title: 'Touchscreen glass', line: 'Software you could finally touch.', build: '2007' } },
  { t: 198.8, shape: 'crt', morph: 1.2, grow: 0, gain: 0.6, color: '#d9ccab', accent: '#5dff7a', cam: cam(12.5, 0.8, -0.35, 0.03, 0, 50),
    placard: { room: 'WING B · THE OTHER WING', title: 'The beige box', line: 'A blinking green cursor.', build: '1984' } },
  { t: 202.7, shape: 'card', morph: 1.0, grow: 0, gain: 0.5, color: '#e2c898', accent: '#fff4d0', cam: cam(12, 0.5, 0.15, 0.02, 0, 50),
    placard: { room: 'WING B · THE OTHER WING', title: 'Punch card', line: 'Instructions, in holes.', build: 'c. 1960' } },
  { t: 204.7, shape: 'abacus', morph: 1.0, grow: 0, gain: 0.7, color: '#d9a566', accent: '#ffe1a8', cam: cam(12, 0.3, -0.15, 0.02, 0, 50),
    placard: { room: 'WING B · THE OTHER WING', title: 'Abacus', line: 'Memory you could move with a finger.', build: 'c. 2700 BCE' } },
  { t: 206.6, shape: 'bone', morph: 1.4, grow: 0, gain: 0.3, color: '#e8dfcb', accent: '#ffb347', cam: cam(11.5, 1.2, 0.1, 0.02, 0, 50),
    placard: { room: 'WING B · THE OTHER WING', title: 'A notch on a bone', line: 'The first thing anyone ever wrote down.', build: 'c. 35,000 BCE' } },
  { t: 209.4, shape: 'fire', morph: 2.2, grow: 0, gain: 0.5, color: '#ff7a2a', accent: '#fff0a8', cam: cam(8.6, 1.0, 0.0, 0.03, 0.5, 52),
    placard: { room: 'WING B · THE OTHER WING', title: 'Fire', line: 'Somebody wanted to be warm.', build: 'c. 1,000,000 BCE' } },
  { t: 229.5, shape: 'ember', morph: 5, grow: 0, gain: 0.6, color: '#ff8a3c', accent: '#fff0a8', cam: cam(9, 0.4, 0.0, 0.0, 0.2, 50) },
  { t: CUT, shape: 'tabs', morph: 0, grow: 0, color: '#8aa4d6', accent: '#ff4d3d', cam: cam(17, 0.5, 0.0, 0.012, 0),
    placard: { room: 'ROOM 01 · 2026', title: 'Applications', line: 'You are still the integration layer.', build: 'build 2026.11' } },
];

// ── How much of the user interface is still on screen. 1 = full browser chrome and notification badges.
export const CHROME: [number, number][] = [
  [0, 0], [2, 1], [21, 1], [27, 1], [31, 0], [194.4, 0], [194.9, 1], [196.0, 1], [196.8, 0], [CUT - 0.01, 0], [CUT, 1], [248, 1], [252, 0],
];
/** The one input line that remains in 2525. */
export const PROMPT: [number, number][] = [
  [0, 0], [27, 0], [29, 1], [45, 1], [47, 0], [DURATION, 0],
];
export const PROMPT_TEXT = 'say what you want';

// ── The year counter, top right. Rolls between values; negative = BCE.
export const YEARS: [number, number][] = [
  [0, 2026], [21, 2026], [22.5, 2525], [46.5, 2525], [48, 3535], [72, 3535], [73.5, 4545], [97.5, 4545],
  [99, 5555], [122.5, 5555], [124, 6565], [148, 6565], [149.5, 7510], [173, 7510], [174.5, 9595], [191.5, 9595],
  [194.8, 2026], [196.0, 2007], [198.8, 1984], [202.7, 1960], [204.7, -2700], [206.6, -35000], [209.4, -35000], [211.5, -1000000],
  [CUT - 0.01, -1000000], [CUT, 2026], [DURATION, 2026],
];

// ── Per-shape dynamics, as keyframes [t, value] for the shader.
/** Chladni mode numbers (n, m): the nodal lines morph smoothly as they drift. */
export const MODE_N: [number, number][] = [[173, 2], [180, 3], [186, 4], [190.6, 5.5]];
export const MODE_M: [number, number][] = [[173, 3], [180, 5], [186, 7], [190.6, 9]];
/** Choir: 0 = every voice on its own phase (arguing), 1 = in unison. */
export const AGREE: [number, number][] = [
  [97.5, 0], [105, 0.1], [110, 0.2], [113.0, 0.35], [114.5, 1], [122, 1], [122.5, 0], [193, 0.5], [DURATION, 0.5],
];
/** Foldings: 0 = flat sheet, 1 = fully pleated. */
export const FOLD: [number, number][] = [
  [72, 0], [74, 0], [81, 1], [89, 1], [92, 0.7], [96, 1], [97.5, 1], [193.6, 1], [DURATION, 1],
];
/** Liturgy strike-throughs: [clause A, clause B] visibility. */
export const STRIKE_A: [number, number][] = [[148, 0], [157.8, 0], [158.6, 1], [172.9, 1]];
export const STRIKE_B: [number, number][] = [[148, 0], [155.6, 0], [156.3, 1], [159.3, 1], [160.0, 0], [173, 0]];
/** Fire size. */
export const FIRE: [number, number][] = [[209.4, 0.45], [211.2, 0.6], [215.2, 0.8], [218.4, 1.0], [223, 1.2], [227, 1.0], [229.5, 0.7], [233, 0]];

/** The world dims under the credits so they read. */
export const DIM: [number, number][] = [[250.5, 1], [253, 0.3], [DURATION, 0.3]];

export const TITLE = { t0: 3.0, t1: 9.5 };

export const CREDITS: [string, string][] = [
  ['Song', 'made with Suno v6'],
  ['Animation', 'Claude Sonnet 5.5, in TypeScript and three.js'],
  ['Direction', 'João Galego'],
];
export const CREDITS_START = 252.5;
