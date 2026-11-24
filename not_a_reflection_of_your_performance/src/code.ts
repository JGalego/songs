import type { G } from './art';
import { C } from './palette';
import { MONO } from './text';

/** A tiny syntax highlighter for the code windows: just enough Rust, Python and TypeScript to look real. */
export type Lang = 'rust' | 'python' | 'ts';
export type Theme = 'dark' | 'light';

const KEYWORDS: Record<Lang, Set<string>> = {
  rust: new Set('use pub struct impl fn let mut mod unsafe match if else for in return async await loop while const static trait where as ref move dyn enum type crate super mut'.split(' ')),
  python: new Set('import from def class for in if elif else return while with as not and or lambda try except raise yield pass None True False'.split(' ')),
  ts: new Set('import from export function const let var async await return if else for of while new class interface type try catch throw true false null undefined'.split(' ')),
};
const SELFS = new Set(['self', 'Self', 'this']);
const COMMENT: Record<Lang, string> = { rust: '//', python: '#', ts: '//' };
const DECL = new Set(['fn', 'def', 'function', 'class', 'struct', 'enum', 'trait']);

const PALETTE: Record<Theme, Record<string, string>> = {
  dark: {
    plain: C.cream, punct: 'rgba(255,244,230,0.62)', keyword: C.pink, type: C.teal, fn: C.sun, str: C.peach, num: C.lavender,
    macro: C.lavender, comment: 'rgba(255,244,230,0.38)', attr: 'rgba(94,225,214,0.62)', self: '#8ec5ff',
  },
  light: {
    plain: C.ink, punct: C.inkSoft, keyword: '#d6336c', type: '#0f9b92', fn: '#b87800', str: '#d9622b', num: '#6d4fe0',
    macro: '#6d4fe0', comment: '#9a9bb5', attr: '#0f9b92', self: '#2f6fd0',
  },
};

export type Token = [text: string, kind: string];

const TOKEN_RE: Record<Lang, RegExp> = (() => {
  const mk = (comment: string, quotes: string, attr: string) =>
    new RegExp(`(${comment}.*$)|(${attr}"(?:[^"\\\\]|\\\\.)*(?:"|$)${quotes})|(\\d[\\d_.]*)|([A-Za-z_][A-Za-z0-9_]*)|(\\s+)|(.)`, 'y');
  return {
    rust: mk('//', '', '#!?\\[[^\\]]*\\]|'),
    python: mk('#', "|'(?:[^'\\\\]|\\\\.)*(?:'|$)", ''),
    ts: mk('//', "|'(?:[^'\\\\]|\\\\.)*(?:'|$)|`(?:[^`\\\\]|\\\\.)*(?:`|$)", ''),
  };
})();

export function tokenize(line: string, lang: Lang): Token[] {
  const re = TOKEN_RE[lang], out: Token[] = [];
  re.lastIndex = 0;
  let prevWord = '';
  while (re.lastIndex < line.length) {
    const m = re.exec(line);
    if (!m) break;
    const [s, com, str, num, id, ws] = m;
    if (com !== undefined && s.startsWith(COMMENT[lang])) out.push([s, 'comment']);
    else if (str !== undefined) out.push([s, s.startsWith('#') ? 'attr' : 'str']);
    else if (num !== undefined) out.push([s, 'num']);
    else if (id !== undefined) {
      const next = line[re.lastIndex] ?? '';
      let kind = 'plain';
      if (KEYWORDS[lang].has(s)) kind = 'keyword';
      else if (SELFS.has(s)) kind = 'self';
      else if (DECL.has(prevWord)) kind = prevWord === 'fn' || prevWord === 'def' || prevWord === 'function' ? 'fn' : 'type';
      else if (next === '!' && lang === 'rust') kind = 'macro';
      else if (next === '(') kind = /^[A-Z]/.test(s) ? 'type' : 'fn';
      else if (/^[A-Z]/.test(s) || /^(u8|u16|u32|u64|usize|i8|i16|i32|i64|isize|f32|f64|bool|str|string|number|boolean)$/.test(s)) kind = 'type';
      out.push([s, kind]);
      prevWord = s;
      continue;
    } else if (ws !== undefined) out.push([s, 'plain']);
    else out.push([s, 'punct']);
    if (ws === undefined) prevWord = '';
  }
  return out;
}

/** Draws one highlighted line of code starting at (x, y); `max` shrinks the font so the line fits. */
export function drawCode(c: G, line: string, x: number, y: number, o: { lang: Lang; size: number; theme?: Theme; max?: number; alpha?: number; full?: string }) {
  const pal = PALETTE[o.theme ?? 'dark'];
  let size = o.size;
  const font = (s: number) => { c.font = `400 ${s}px ${MONO}`; };
  font(size);
  let cw = c.measureText('M').width;
  const span = (o.full ?? line).length * cw;
  if (o.max !== undefined && span > o.max) { size = Math.max(9, Math.floor((size * o.max) / span)); font(size); cw = c.measureText('M').width; }
  c.letterSpacing = '0px';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
  let col = 0;
  for (const [text, kind] of tokenize(line, o.lang)) {
    if (kind !== 'plain' || text.trim()) { c.fillStyle = pal[kind]; c.fillText(text, x + col * cw, y); }
    col += text.length;
  }
  if (o.alpha !== undefined) c.globalAlpha /= o.alpha || 1;
}
