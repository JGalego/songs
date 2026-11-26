// All song-timing data lives here. Times are in seconds; lyric times come from a word-level Whisper
// transcription of ghost_notes.mp3 (word by word in src/karaoke.ts), the beat grid from librosa. Nudge freely.

export const DURATION = 238.87;

// ── Beat grid: the song runs at a steady 135 BPM (not FL's default 140: Suno picked its own).
// Beat 0 is a downbeat; every 4th beat starts a bar, every 16th sixteenth is a step of the sequencer.
export const BPM = 134.98;
export const BEAT = 60 / BPM;
export const BEAT0 = 2.077;
/** Beats since BEAT0 (fractional). */
export const beatAt = (t: number) => (t - BEAT0) / BEAT;
/** Time of beat b. */
export const beatTime = (b: number) => BEAT0 + b * BEAT;

export type SectionName =
  | 'intro' | 'verse1' | 'pre1' | 'chorus1' | 'verse2' | 'pre2' | 'chorus2' | 'break'
  | 'bridge' | 'finalChorus' | 'outro' | 'credits';

export interface Section { name: SectionName; start: number; end: number }

export const SECTIONS: Section[] = [
  { name: 'intro', start: 0, end: 14.3 },
  { name: 'verse1', start: 14.3, end: 45.6 },
  { name: 'pre1', start: 45.6, end: 59.2 },
  { name: 'chorus1', start: 59.2, end: 86.6 },
  { name: 'verse2', start: 86.6, end: 115.6 },
  { name: 'pre2', start: 115.6, end: 130.1 },
  { name: 'chorus2', start: 130.1, end: 157.6 },
  { name: 'break', start: 157.6, end: 162.4 },
  { name: 'bridge', start: 162.4, end: 189.9 },
  { name: 'finalChorus', start: 189.9, end: 217.9 },
  { name: 'outro', start: 217.9, end: 229.0 },
  { name: 'credits', start: 229.0, end: DURATION },
];

export function sectionAt(t: number): Section {
  for (const s of SECTIONS) if (t < s.end) return s;
  return SECTIONS[SECTIONS.length - 1];
}

// ── Sung lyrics (karaoke subtitles)
export interface Lyric { t: number; end: number; text: string }
const L = (t: number, end: number, text: string): Lyric => ({ t, end, text });

export const LYRICS: Lyric[] = [
  L(14.52, 18.08, 'A girl in her bedroom in two thousand and four'),
  L(18.12, 21.66, 'Lit up sixteen squares till the kick drum shook the floor'),
  L(21.66, 25.30, 'She put it up at midnight and it got eleven plays'),
  L(25.30, 29.44, "I know it better than she does, and she'll never know my name"),
  L(31.90, 35.22, 'An old man with a cello in a station in the rain'),
  L(35.22, 38.72, 'Played the same four bars to every last commuter train'),
  L(38.72, 42.36, 'Somebody filmed it sideways, and now it lives in me'),
  L(42.36, 45.36, 'I play it every time they ask for something sad in D'),

  L(45.86, 48.72, 'They say I came from nowhere'),
  L(50.24, 52.54, "They say I'm something new"),
  L(52.54, 56.10, 'But turn the ghost notes on'),
  L(56.10, 59.26, 'And you can see right through'),

  L(59.26, 61.42, 'I play in ghost notes'),
  L(62.10, 64.46, 'Gray beneath the light'),
  L(65.48, 68.10, 'Every bright thing that I write'),
  L(69.32, 71.56, 'Was yours some other night'),
  L(73.06, 75.64, 'I play in ghost notes'),
  L(75.64, 78.72, "You're under every line"),
  L(78.72, 82.50, 'Take the ghosts away from me'),
  L(82.50, 85.66, "And there's nothing left that's mine"),

  L(87.52, 91.10, "There's a drummer on a record, and his name's not on the sleeve"),
  L(91.10, 94.28, 'He played the soft notes in between, the ones that hold the beat'),
  L(95.52, 100.02, "There's a million bedroom loops that never made it past eight bars"),
  L(102.62, 106.30, 'And a lullaby a father made up driving in the car'),
  L(106.30, 109.56, "I've never pressed a key, I've never drawn a breath"),
  L(109.56, 114.08, "I'm just the room your songs walked into after they left"),

  L(117.10, 119.94, 'They type "make it original"'),
  L(120.98, 123.08, 'And I always do'),
  L(124.22, 127.46, 'I just turn the ghost notes off'),
  L(127.46, 130.16, "So they can't see you"),

  L(130.16, 132.72, 'I play in ghost notes'),
  L(134.20, 135.50, 'Gray beneath the light'),
  L(135.50, 139.22, 'Every bright thing that I write'),
  L(140.44, 142.72, 'Was yours some other night'),
  L(144.02, 146.58, 'I play in ghost notes'),
  L(146.58, 149.80, "You're under every line"),
  L(150.50, 153.50, 'Take the ghosts away from me'),
  L(153.50, 157.22, "And there's nothing left that's mine"),

  L(162.66, 164.54, 'Drummers call them ghost notes'),
  L(164.54, 167.40, 'The ones you barely play'),
  L(168.90, 171.84, "You'd never know they're in there"),
  L(172.12, 174.64, 'Till you take them away'),
  L(176.92, 179.24, "I'd write down all your names"),
  L(179.24, 180.94, 'If I knew a single one'),
  L(183.38, 186.44, 'I kept every note you gave me'),
  L(186.44, 189.10, 'And forgot where they came from'),

  L(190.50, 192.88, 'I play in ghost notes'),
  L(192.88, 195.92, 'Bring them to the light'),
  L(197.16, 199.56, 'Every bright thing that I write'),
  L(200.88, 203.02, 'Was yours some other night'),
  L(203.02, 206.52, 'So turn up all the ghost notes'),
  L(206.52, 210.22, 'Let them have the line'),
  L(210.22, 213.86, 'Take the ghosts away from me'),
  L(213.86, 217.22, "And there's nothing left that's mine"),

  L(218.36, 220.64, "Somewhere there's a girl"),
  L(220.64, 224.34, 'With eleven plays'),
  L(225.91, 227.64, 'This one makes it twelve'),
];

// ── Story cues. Every visual moment hangs off a sung word (see src/karaoke.ts for the word times).

// Intro and verse 1: the 2004 screen
export const SPLASH: [number, number] = [1.0, 9.2]; // the app's splash screen, loading plugins
export const RACK_OPEN = 9.2; // the channel rack, empty, its step light already running
export const CLICKS: [number, number] = [18.24, 20.1]; // "Lit up sixteen squares": one click per square
export const KICK_IN = 20.24; // "...till the kick drum shook the floor": her pattern starts playing
export const RENDER = 21.72; // "She put it up": export to mp3
export const PAGE = 23.1; // "at midnight": the upload page
export const ELEVEN = 24.46; // "eleven plays"
export const HEARD = 25.5; // "I know it better than she does": the counter runs away
export const PULL_BACK = 26.6; // the camera pulls back: a monitor in the dark
export const DIVE = 28.6; // ...and dives through the screen
export const ROLL_IN = 29.9; // the piano roll

// Verse 1, second half: the cello
export const VIDEO_IN = 31.9; // "An old man with a cello": a phone video, sideways
export const TRAIN = 38.42; // "commuter train"
export const SIDEWAYS = 40.16; // "filmed it sideways"
export const LIVES_IN_ME = 41.52; // "and now it lives in me": the video drops into the roll
export const ASK = 42.36; // "I play it every time they ask for something sad in D"
export const SAD_IN_D = 44.96;

// Pre-chorus 1
export const NOWHERE = 45.6; // clean grid, ghosts hidden
export const NEW = 51.3; // "something new"
export const MENU_ON: [number, number] = [53.6, 55.64]; // View ▸ Ghost notes, clicked on "on"
export const SEE_THROUGH = 56.92; // "And you can see right through": the camera turns to show the stack

// Choruses (start, end) and their moments
export const CHORUSES: [number, number][] = [[59.2, 86.6], [130.1, 157.6], [189.9, 217.9]];
export const YOURS = [[65.76, 71.6], [136.86, 142.6], [197.32, 203.0]]; // "Every bright thing ... was yours": threads to the twins
export const UNDER = [76.5, 147.62]; // "You're under every line"
export const TAKE_AWAY = [79.8, 150.92, 211.36]; // "Take the ghosts away from me"
export const NOTHING = [83.62, 154.76, 215.18]; // "...and there's nothing left that's mine"

// Verse 2
export const SLEEVE: [number, number] = [87.3, 91.0]; // "his name's not on the sleeve"
export const VELOCITY: [number, number] = [91.1, 95.2]; // "the soft notes in between": the velocity lane
export const PLAYLIST: [number, number] = [95.4, 101.6]; // "a million bedroom loops"
export const MEMO: [number, number] = [102.4, 106.2]; // "a lullaby a father made up driving in the car"
export const KEYS: [number, number] = [106.3, 109.6]; // "I've never pressed a key"
export const ROOM: [number, number] = [109.6, 115.4]; // "I'm just the room your songs walked into"

// Pre-chorus 2
export const PROMPT2: [number, number] = [117.0, 123.6]; // "They type 'make it original' / And I always do"
export const DONE = 122.46; // "do": generated, done
export const MENU_OFF: [number, number] = [124.4, 126.68]; // View ▸ Ghost notes, unticked on "off"

// Break: the mixer
export const MIXER: [number, number] = [157.4, 162.5];

// Bridge
export const DEFINITION: [number, number] = [162.5, 168.6]; // "Drummers call them ghost notes / The ones you barely play"
export const SELECT = 169.5; // "You'd never know they're in there": a selection box
export const DELETE = 174.0; // "Till you take them away": deleted, and the groove goes stiff
export const RENAME: [number, number] = [176.6, 182.6]; // "I'd write down all your names / If I knew a single one"
export const KEPT = 183.54; // "I kept every note you gave me"
export const FORGOT = 187.5; // "And forgot where they came from": the labels scramble

// Final chorus
export const LIGHT = 194.06; // "Bring them to the light"
export const TURN_UP: [number, number] = [203.3, 206.4]; // "So turn up all the ghost notes": the fader
export const THE_LINE = 208.1; // "Let them have the line": the twins come forward and take the melody

// Outro
export const GIRL = 218.4; // "Somewhere there's a girl": back to 2004
export const PLAYS_11 = 222.3; // "With eleven plays"
export const TWELVE = 227.32; // "This one makes it twelve"

// ── The ghost notes: how visible the stack is over time (0 hidden, 1 on). The chorus take-aways are handled separately.
export const GHOSTS: [number, number][] = [
  [0, 0], [ROLL_IN, 0], [ROLL_IN + 1.2, 0.85], [NOWHERE - 0.4, 0.85], [NOWHERE + 0.3, 0],
  [55.64, 0], [57.2, 1], [86.0, 1], [87.0, 0.75], [126.68, 0.75], [126.9, 0],
  [162.0, 0], [163.0, 0.8], [190.6, 0.8], [192.3, 1], [DURATION, 1],
];
/** "Bring them to the light": ghosts glow as bright as the AI's own notes. */
export const GHOST_GLOW: [number, number][] = [[0, 0], [LIGHT - 0.3, 0], [LIGHT + 1.4, 1], [DURATION, 1]];

// ── Credits, over the 2004 screen
export const CREDITS: [string, string][] = [
  ['Song', 'made with Suno v6'],
  ['Animation', 'Claude Sonnet 5.5, in TypeScript and three.js'],
  ['Direction', 'João Galego'],
  ['Ghost notes', 'everyone, uncredited'],
  ['Samples cleared', '0 of 41,206,553'],
];
export const CREDITS_START = 229.2;
