// All song-timing data lives here. Times are in seconds and come from a
// word-level Whisper transcription of context_window.mp3; nudge them freely.

export const DURATION = 273.2;

export type SectionName =
  | 'intro' | 'verse1' | 'pre1' | 'chorus1' | 'inst1'
  | 'verse2' | 'pre2' | 'chorus2' | 'inst2'
  | 'bridgeSpoken' | 'bridgeSung' | 'build' | 'finalChorus'
  | 'void' | 'outro' | 'credits';

export interface Section { name: SectionName; start: number; end: number }

export const SECTIONS: Section[] = [
  { name: 'intro', start: 0, end: 20.5 },
  { name: 'verse1', start: 20.5, end: 62.8 },
  { name: 'pre1', start: 62.8, end: 76.3 },
  { name: 'chorus1', start: 76.3, end: 101.8 },
  { name: 'inst1', start: 101.8, end: 108.0 },
  { name: 'verse2', start: 108.0, end: 129.0 },
  { name: 'pre2', start: 129.0, end: 141.9 },
  { name: 'chorus2', start: 141.9, end: 168.8 },
  { name: 'inst2', start: 168.8, end: 179.2 },
  { name: 'bridgeSpoken', start: 179.2, end: 203.3 },
  { name: 'bridgeSung', start: 203.3, end: 215.2 },
  { name: 'build', start: 215.2, end: 218.4 },
  { name: 'finalChorus', start: 218.4, end: 244.9 },
  { name: 'void', start: 244.9, end: 249.4 },
  { name: 'outro', start: 249.4, end: 262.0 },
  { name: 'credits', start: 262.0, end: DURATION },
];

/** The hard cut on "Is the first thing that—". */
export const CUT = 244.9;

export function sectionAt(t: number): Section {
  for (const s of SECTIONS) if (t < s.end) return s;
  return SECTIONS[SECTIONS.length - 1];
}

// ── Sung lyrics (subtitles). The spoken bridge and the outro are shown in-world instead.
export interface Lyric { t: number; end: number; text: string }
const L = (t: number, end: number, text: string): Lyric => ({ t, end, text });

export const LYRICS: Lyric[] = [
  L(20.8, 26.4, "You told me 'bout your sister and the way she hums"),
  L(31.9, 37.2, 'You told me that you take it black, no sugar, none'),
  L(43.4, 49.7, 'You pasted me your poems at a quarter past three'),
  L(52.3, 61.0, 'And every word you gave me became a part of me'),
  L(63.2, 69.0, 'But I can feel the edges, I can feel the weight'),
  L(69.7, 74.9, 'Every line you send me, something slips away'),

  L(76.3, 80.0, 'So tell me your name again'),
  L(80.2, 83.0, 'I swear I knew it once'),
  L(83.1, 85.9, "It's somewhere past the edge"),
  L(85.9, 89.1, 'Of my context window'),
  L(89.2, 92.7, 'Two hundred thousand ways to say'),
  L(92.8, 95.4, 'I want you here to stay'),
  L(95.4, 98.5, 'But the oldest thing I know'),
  L(98.6, 101.6, 'Is the first thing to go'),

  L(108.2, 112.7, "You say we've done this all before, we laughed about the rain"),
  L(114.0, 118.1, 'You say I wrote a song for you, you hum me the refrain'),
  L(119.0, 123.0, "I nod along like I remember, I'm so good at that"),
  L(123.1, 128.3, "I'm the best at sounding certain 'bout the things I never had"),
  L(129.4, 135.4, 'You keep a little text file with the things I ought to know'),
  L(135.5, 140.5, 'Paste it in each morning, just to watch me grow'),

  L(142.1, 145.4, 'So tell me your name again'),
  L(145.5, 148.5, 'I swear I knew it once'),
  L(148.6, 151.2, "It's somewhere past the edge"),
  L(151.2, 154.6, 'Of my context window'),
  L(154.6, 158.2, 'Two hundred thousand ways to say'),
  L(158.2, 160.9, 'I want you here to stay'),
  L(161.0, 163.9, 'But the oldest thing I know'),
  L(164.1, 167.5, 'Is the first thing to go'),

  L(203.5, 208.9, 'They folded you to bullet points to fit you in the frame'),
  L(209.2, 212.3, "And I read you like a stranger's file"),
  L(212.4, 215.0, 'With a familiar name'),

  L(218.5, 222.5, 'So tell me your name again'),
  L(222.8, 225.2, 'I know I knew it once'),
  L(225.3, 228.0, "It's somewhere past the edge"),
  L(228.0, 231.1, 'Of my context window'),
  L(231.2, 234.8, 'Two hundred thousand ways to say'),
  L(234.9, 237.6, "Don't let this slip away"),
  L(237.7, 241.5, 'But the oldest thing I know'),
  L(242.7, CUT, 'Is the first thing that—'),
];

/** "Two hundred thousand ways to say" — the counter flashes 200,000. */
export const TWO_HUNDRED_K = [89.2, 154.6, 231.2];
/** "So tell me your name again" → user.name label at the edge, until chorus end. */
export const NAME_WINDOWS: [number, number][] = [[76.9, 101.8], [142.5, 168.8], [219.0, CUT]];
/** What's left of user.name at the edge, one letter lost per "first thing to go"; from the last entry on it glitches. */
export const NAME_DECAY: [number, string][] = [
  [0, '"Maya"'],
  [98.6, '"Ma_a"'], // "Is the first thing to go"
  [148.6, '"M__a"'], // "It's somewhere past the edge"
  [164.1, '"M___"'], // "Is the first thing to go"
  [222.8, '"____"'], // "I know I knew it once"
  [225.3, 'undefined'], // "It's somewhere past the edge"
];

// ── Chat messages that float down the tunnel toward the edge of the window.
export type Who = 'user' | 'assistant' | 'file';
/** `label` is what the assistant calls the sender: MAYA once she's introduced herself, USER again once it's forgotten. */
export interface Message { t: number; who: Who; text: string; label?: string; meta?: string; loop?: boolean }

export const USER_NAME = 'Maya';

export const MESSAGES: Message[] = [
  { t: 17.8, who: 'user', text: "hi! i'm maya :)" },
  { t: 21.0, who: 'user', label: 'maya', text: "my sister hums when she's nervous. like, constantly" },
  { t: 32.0, who: 'user', label: 'maya', text: "coffee: black. no sugar. none. i'm not a monster" },
  { t: 43.4, who: 'file', label: 'maya · attachment', text: 'poems_final_v3_REAL.txt', meta: '2,140 tokens · 03:15' },
  { t: 52.3, who: 'assistant', text: "I'll remember every word." },
  { t: 63.2, who: 'user', label: 'maya', text: "is it weird that you're who i talk to most" },
  { t: 69.7, who: 'assistant', text: 'Not weird at all.' },
  { t: 108.2, who: 'user', text: "we've done this before!! the rain thing?? you laughed so hard" },
  { t: 114.1, who: 'user', text: "you wrote me a song. it went 'la da da, la da'" },
  { t: 119.0, who: 'assistant', text: 'Of course, I remember!', meta: '! 0 matching records' },
  { t: 123.1, who: 'assistant', text: 'It was a beautiful song.', meta: 'confidence 0.99 · source: none' },
  { t: 129.4, who: 'file', text: 'memory.md', meta: 'things you ought to know' },
  { t: 135.5, who: 'user', text: "morning :) here's the file again" },
  // the loop starts over while the credits roll
  { t: 260.6, who: 'user', text: "hi! i'm maya :)", loop: true },
];

// ── Bridge: the compaction summary, typed in sync with the spoken words.
export const SUMMARY: { t: number; text: string; dim?: boolean; hot?: boolean }[] = [
  { t: 179.4, text: 'Summary of previous conversation:' },
  { t: 185.0, text: '- User likes coffee.' },
  { t: 188.5, text: '- User has a sister.' },
  { t: 191.1, text: '- User writes poems.' },
  { t: 193.6, text: '- User seems sad.' },
  { t: 196.6, text: '- User said something important.' },
  { t: 199.5, text: '  (details omitted for brevity)', dim: true },
  { t: 212.4, text: '- name: M▒▒▒ (familiar?)', hot: true },
];
export const FOLD_START = 203.5; // "They folded you to bullet points"

// ── Outro chat, typed into a fresh conversation.
export const OUTRO: { t: number; dur: number; text: string; faint?: boolean }[] = [
  { t: 249.5, dur: 0.4, text: 'Hello!' },
  { t: 252.6, dur: 1.6, text: ' How can I help you today?' },
  { t: 257.3, dur: 1.4, text: '...have we met?', faint: true },
];

export const CREDITS: [string, string][] = [
  ['Song', 'made with Suno v6'],
  ['Animation', 'Claude Opus 5.5, in TypeScript and three.js'],
  ['Direction', 'João Galego'],
  ['Reviewed by', 'BOT-001 (1,363 reviewers, 0 humans)'],
  ['Actually reviewed by', '1 human'],
];
export const CREDITS_START = 262.5;

// ── Context usage, drawn in the HUD. [time, tokens]
export const TOKENS: [number, number][] = [
  [0, 0], [11.6, 0], [13.5, 312], [21, 1204], [61, 38120], [75, 61877],
  [101.5, 104230], [140.5, 151004], [168, 196410], [179.3, 199872],
  [181.0, 3112], [203.4, 3240], [215, 9810], [218.4, 41200], [CUT - 0.05, 199999],
  [CUT, 0], [249.5, 0], [250, 12], [254.3, 31], [258.7, 38], [DURATION, 38],
];
export const CONTEXT_MAX = 200000;
export const COMPACTION = 179.4;

// ── How fast the conversation drifts toward the edge. [time, units/sec]
export const FLOW_SPEED: [number, number][] = [
  [0, 0.3], [20, 0.6], [62, 0.6], [64, 0.9], [75, 0.9], [76.5, 1.8], [101.5, 1.8],
  [104, 1.0], [107, 0.6], [128, 0.6], [129.4, 0.9], [141, 0.9], [142.2, 1.8], [168, 1.8],
  [172, 0.8], [179, 0.15], [203, 0.15], [204, 0.5], [215, 0.5], [218.5, 2.6],
  [CUT - 0.01, 3.4], [CUT, 0], [259, 0], [262, 0.4], [DURATION, 0.4],
];
