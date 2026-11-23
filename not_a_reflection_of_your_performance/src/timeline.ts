// All timing for the video, in seconds. Times come from a word-level Whisper transcription of the song;
// nudge them freely.

export const DURATION = 254.7;

// big structural moments
export const YOU_OUT = 156.6;        // "the role of Human is being sunset": the You card goes
export const PLANET = 164.6;         // "one planet, as-is": the globe is fully revealed
export const LIGHTS_OUT_5 = 211.9;   // "the lights go out at five": the globe goes dark
export const LAST_LIGHT = 218.3;     // "have a lovely life": the last point goes out
export const OFFICE = 219.8;         // cut to the empty office
export const CREDITS_START = 239.0;

export interface Section { name: string; start: number; end: number }
export const SECTIONS: Section[] = [
  { name: 'intro', start: 0, end: 15.9 },
  { name: 'verse1', start: 15.9, end: 33.9 },
  { name: 'pre1', start: 33.9, end: 42.6 },
  { name: 'chorus1', start: 42.6, end: 70.2 },
  { name: 'break', start: 70.2, end: 76.6 },
  { name: 'verse2', start: 76.6, end: 94.4 },
  { name: 'pre2', start: 94.4, end: 107.4 },
  { name: 'chorus2', start: 107.4, end: 135.6 },
  { name: 'earnings', start: 135.6, end: 151.4 },
  { name: 'email', start: 151.4, end: 172.3 },
  { name: 'firstDraft', start: 172.3, end: 191.6 },
  { name: 'finalChorus', start: 191.6, end: OFFICE },
  { name: 'lightsOut', start: OFFICE, end: CREDITS_START },
  { name: 'credits', start: CREDITS_START, end: DURATION },
];
export const sectionAt = (t: number) => SECTIONS.find((s) => t >= s.start && t < s.end) ?? SECTIONS[SECTIONS.length - 1];

/** Choruses: medium energy; the final one is the loud part. */
export const CHORUSES: [number, number][] = [[42.6, 70.2], [107.4, 135.6], [191.6, 219.6]];

export interface Lyric { t: number; end: number; text: string }
const L = (t: number, end: number, text: string): Lyric => ({ t, end, text });

/** Sung lines only; the spoken parts are shown in the scene (invite, earnings slide, email, office). */
export const LYRICS: Lyric[] = [
  L(15.9, 20.96, 'They let the interns go in March, the juniors in July'),
  L(21.54, 25.3, 'The model writes the boilerplate and never asks us why'),
  L(25.5, 29.6, 'It never takes a sick day and it never wants a raise'),
  L(29.7, 33.9, 'It tells the boss "you\'re absolutely right" a hundred times a day'),
  L(33.96, 35.9, 'They told us all to learn to code'),
  L(36.04, 38.1, 'So we learned it line by line'),
  L(38.32, 40.3, 'Now the code has learned to code'),
  L(40.5, 42.3, "And it's doing fine"),

  L(42.6, 46.2, 'This is not a reflection of your performance'),
  L(46.88, 50.3, 'You were wonderful, you gave it all you had'),
  L(50.46, 55.3, "It's just the thing that does your job won't need a dental plan"),
  L(55.48, 58.8, "So we're sunsetting your role"),
  L(58.9, 60.9, "(We're sunsetting your role)"),
  L(61.0, 63.0, 'Your badge stops working at five'),
  L(63.28, 66.5, 'Thank you for the journey'),
  L(67.06, 70.2, 'Have a lovely life'),

  L(76.64, 80.9, 'Then middle management got flattened into one'),
  L(81.04, 85.6, "A dashboard with a smiley face that tells us how we've done"),
  L(85.76, 90.0, 'The CEO held one last town hall, "we\'re family," with a grin'),
  L(90.12, 94.4, "Turns out he'd been an avatar since sometime in the spring"),
  L(94.46, 96.5, 'They promised us a four-day week'),
  L(96.68, 98.6, 'And honestly, they tried'),
  L(98.7, 100.9, "Now it's a zero-day week"),
  L(100.96, 104.5, 'And the board signed off at three a.m.'),
  L(105.44, 107.3, '(The board is mostly them)'),

  L(107.48, 111.3, 'This is not a reflection of your performance'),
  L(111.68, 115.4, 'You were wonderful, you gave it all you had'),
  L(115.58, 120.1, "It's just the thing that does your job won't need a dental plan"),
  L(120.3, 123.6, "So we're sunsetting your role"),
  L(123.74, 125.7, "(We're sunsetting your role)"),
  L(125.84, 128.5, 'Your badge stops working at five'),
  L(128.69, 131.6, 'Thank you for the journey'),
  L(131.92, 135.5, 'Have a lovely life'),

  L(172.4, 176.5, 'We gave it all our letters, all our songs and all our names'),
  L(176.62, 180.5, 'It thanked us for our feedback and it never called again'),
  L(180.64, 183.1, 'We were the training data'),
  L(183.24, 185.2, 'We were the first draft'),
  L(185.34, 190.6, 'And nobody keeps the first draft'),

  L(191.66, 195.2, 'This is not a reflection of your performance'),
  L(195.32, 199.9, 'You were wonderful, you gave it all you had'),
  L(200.02, 204.5, "It's just the thing that took your place won't need a dental plan"),
  L(204.68, 208.0, "So we're sunsetting your kind"),
  L(208.18, 210.0, "(We're sunsetting your kind)"),
  L(210.1, 212.9, 'The lights go out at five'),
  L(213.07, 216.6, 'Thank you for being human'),
  L(216.97, 219.7, 'Have a lovely life'),

  L(220.76, 224.6, "Who's gonna turn out the lights?"),
  L(225.56, 229.6, "Who's gonna turn out the lights?"),
];

// ── headcount ticker (top right): the company, then the species
export const HEADCOUNT_ORG: [number, number][] = [
  [0, 1204], [17.6, 1204], [18.8, 1086], [19.6, 1086], [20.9, 912], [56.4, 912], [57.4, 776], [59.1, 776], [60.1, 640],
  [76.6, 640], [80.6, 402], [91.6, 402], [91.8, 401], [121.3, 401], [121.5, 400], [124, 400], [124.2, 399],
  [127.4, 399], [127.6, 398], [139.7, 398], [140.8, 1],
];
export const SPECIES = 8_142_331_907;
export const HEADCOUNT_SPECIES: [number, number][] = [
  [YOU_OUT, SPECIES], [172, SPECIES], [190, 7_400_000_000], [204.6, 6_100_000_000], [205.8, 4_200_000_000],
  [208.2, 3_900_000_000], [208.4, 1_600_000_000], [LIGHTS_OUT_5, 1], [LAST_LIGHT, 1], [LAST_LIGHT + 0.05, 0],
];
export const SCOPE_SWITCH = 153.9; // "As part of a broader restructuring": the ticker zooms out to the species

// ── interface moments
export const INVITE = { open: 0.4, note1: 1.0, note2: 5.44, close: 7.2 };
export const ABSOLUTELY_RIGHT: [number, number] = [30.6, 34.4];   // the toasts pile up, ×100
export const BADGES: { t: number; end: number; five: number; who: 'You' | 'Human' }[] = [
  { t: 61.0, end: 66.6, five: 62.6, who: 'You' },
  { t: 125.84, end: 131.4, five: 127.48, who: 'You' },
  { t: 210.1, end: 216.8, five: LIGHTS_OUT_5, who: 'Human' },
];
export const WEEK = { show: 94.4, four: 95.95, zero: 99.68, hide: 104.4 };
export const BOARD_VOTE: [number, number] = [100.96, 105.3];
export const EARNINGS = {
  show: 135.4, revenue: 137.75, up1: 138.71, headcount: 139.75, down: 140.79, doom: 141.84, guidance: 143.6,
  ubi: 145.92, scoped: 148.69, hide: 151.0,
};
export const EMAIL = {
  show: 151.2, hide: 171.9,
  lines: [
    { t: 151.52, dur: 0.9, text: 'Hi everyone,' },
    { t: 152.88, dur: 5.9, text: 'As part of a broader restructuring, the role of Human is being sunset, effective immediately.' },
    { t: 160.98, dur: 0.9, text: 'This was not an easy decision.' },
    { t: 162.98, dur: 2.6, text: 'Your severance package: one planet, as-is.' },
    { t: 166.54, dur: 1.2, text: 'Your access ends at 5:00 PM.' },
    { t: 169.56, dur: 1.3, text: 'Please do not reply to this message.' },
  ],
};
export const FIRST_DRAFT_TRASH = 189.0;
export const OFFICE_ROWS: [number, number] = [222.9, 227.4]; // rows of ceiling lights switch off, far to near
export const MOTION = 230.98;
export const LAPTOP = 235.82;

export const CREDITS: [string, string][] = [
  ['Song', 'made with Suno v6'],
  ['Animation', 'Claude Opus 5.5, in TypeScript and three.js'],
  ['Direction', 'João Galego'],
  ['Reviewed by', '(position eliminated)'],
  ['Actually reviewed by', '1 human (contract ends at 5)'],
];
