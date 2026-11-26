#!/usr/bin/env node
// Render the music video to a YouTube-ready mp4, frame by frame, from the command line.
//
//   npm run export                          # 1080p, 60 fps → renders/<song>_1080p60.mp4
//   npm run export -- --res 2160            # 4K
//   npm run export -- --from 86 --dur 5     # 5-second test slice
//
// How it works: starts the Vite dev server in-process, opens the page in Chrome (off-screen, so WebGL gets the GPU;
// pass --software for fully headless CPU rendering, which is much slower), renders every frame exactly,
// streams raw RGBA frames back here and pipes them into ffmpeg together with the song.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, createWriteStream, readFileSync } from 'node:fs';
import { basename, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// the song is named after its folder (<song>/<song>.mp3); its length comes from src/timeline.ts
const SONG = basename(ROOT);
const AUDIO = resolve(ROOT, `${SONG}.mp3`);
const DURATION = Number(readFileSync(resolve(ROOT, 'src/timeline.ts'), 'utf8').match(/export const DURATION = ([\d.]+)/)?.[1]);
if (!DURATION) throw new Error('could not read DURATION from src/timeline.ts');

const { values: opt } = parseArgs({
  options: {
    res: { type: 'string', default: '1080' },
    fps: { type: 'string', default: '60' },
    from: { type: 'string', default: '0' },
    dur: { type: 'string' },
    out: { type: 'string' },
    crf: { type: 'string' },
    preset: { type: 'string', default: 'slow' },
    software: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (opt.help) {
  console.log(`usage: npm run export -- [options]

  --res <h>       output height, 16:9 (default 1080; 2160 = 4K gets more YouTube bitrate but renders ~4x slower)
  --fps <n>       frame rate (default 60)
  --from <s>      start time in seconds (default 0)
  --dur <s>       duration in seconds (default: to the end)
  --out <file>    output path (default renders/${SONG}_<res>p<fps>.mp4)
  --crf <n>       x264 quality, lower is better (default 14 at 4K, 16 otherwise)
  --preset <p>    x264 preset (default slow)
  --software      fully headless, CPU rendering (no window at all, but very slow)

  env CHROME_PATH  use a specific Chrome/Chromium binary instead of the installed Google Chrome`);
  process.exit(0);
}

const H = Number(opt.res), W = Math.round((H * 16) / 9), FPS = Number(opt.fps), FROM = Number(opt.from);
const DUR = Math.min(opt.dur ? Number(opt.dur) : DURATION, DURATION - FROM);
const TOTAL = Math.ceil(DUR * FPS);
const FRAME_BYTES = W * H * 4;
const OUT = resolve(ROOT, opt.out ?? `renders/${SONG}_${H}p${FPS}.mp4`);
const LOG = OUT.replace(/\.mp4$/i, '') + '.ffmpeg.log';
mkdirSync(dirname(OUT), { recursive: true });

// ── ffmpeg: raw RGBA in (bottom-up from readPixels), YouTube-recommended H.264 + AAC out
const ffmpeg = spawn('ffmpeg', [
  '-y', '-loglevel', 'error', '-stats',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(FPS), '-i', '-',
  '-ss', String(FROM), '-t', String(DUR), '-i', AUDIO,
  '-map', '0:v', '-map', '1:a',
  '-vf', 'vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', opt.preset, '-crf', opt.crf ?? (H >= 2160 ? '14' : '16'),
  '-profile:v', 'high', '-g', String(Math.round(FPS / 2)), '-bf', '2',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-c:a', 'aac', '-b:a', '384k', '-ar', '48000',
  '-movflags', '+faststart', OUT,
], { stdio: ['pipe', 'ignore', 'pipe'] });
ffmpeg.stderr.pipe(createWriteStream(LOG));
const ffmpegExit = new Promise((ok) => ffmpeg.on('close', (code) => ok(code ?? 1)));
ffmpeg.on('error', (e) => fail(`could not start ffmpeg: ${e.message}`));

// ── progress
let frames = 0;
const started = Date.now();
const fmt = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m` : `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}s`);
function progress(final = false) {
  const el = (Date.now() - started) / 1000;
  const rate = frames / Math.max(el, 1e-3);
  const pct = frames / TOTAL;
  const bar = '█'.repeat(Math.round(pct * 30)).padEnd(30, '░');
  const eta = rate > 0 ? (TOTAL - frames) / rate : 0;
  process.stderr.write(`\r${bar} ${(pct * 100).toFixed(1).padStart(5)}%  ${frames}/${TOTAL}  ${rate.toFixed(1)} fps  elapsed ${fmt(el)}  eta ${fmt(eta)}   ${final ? '\n' : ''}`);
}
const ticker = setInterval(progress, 500);

let finish;
const finished = new Promise((ok, no) => { finish = { ok, no }; });

// ── dev server with the frame sink
const server = await createServer({
  root: ROOT,
  logLevel: 'error',
  // no hot reload and no file watching: editing a file mid-render must not restart the page's frame loop
  server: { port: 0, host: '127.0.0.1', hmr: false, watch: null },
  plugins: [{
    name: 'frame-sink',
    configureServer(s) {
      s.middlewares.use('/__export', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        if (req.url === '/end') {
          res.end('ok');
          return finish.ok();
        }
        if (req.url !== '/frame') { res.statusCode = 404; return res.end(); }
        let got = 0;
        req.on('data', (chunk) => {
          got += chunk.length;
          if (!ffmpeg.stdin.write(chunk)) {
            req.pause();
            ffmpeg.stdin.once('drain', () => req.resume());
          }
        });
        req.on('end', () => {
          if (got !== FRAME_BYTES) return fail(`frame ${frames} had ${got} bytes, expected ${FRAME_BYTES}`);
          frames++;
          res.end('ok');
        });
      });
    },
  }],
});
await server.listen();
const { port } = server.httpServer.address();

// ── browser
const linux = process.platform === 'linux';
const wsl = linux && existsSync('/dev/dxg');
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
  headless: opt.software,
  args: [
    // CPU 2D canvas: GPU-accelerated canvas draws roundRect fills as a bowtie on Mesa d3d12 (WSL); WebGL stays on the GPU
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas', '--autoplay-policy=no-user-gesture-required', '--js-flags=--expose-gc',
    ...(opt.software
      ? ['--enable-unsafe-swiftshader']
      : ['--window-position=-32000,-32000', '--window-size=320,180', ...(linux ? ['--use-angle=gl', '--ozone-platform=x11'] : [])]),
  ],
  env: { ...process.env, ...(wsl && !opt.software ? { GALLIUM_DRIVER: 'd3d12' } : {}) },
}).catch((e) => fail(`could not launch Chrome (set CHROME_PATH?): ${e.message.split('\n')[0]}`));

const page = await browser.newPage();
page.on('console', (m) => {
  const text = m.text();
  if (text.startsWith('[export] renderer:')) {
    const soft = /swiftshader|llvmpipe|software/i.test(text);
    process.stderr.write(`${text.replace('[export] ', '')}${soft && !opt.software ? '  ⚠ software rendering, this will be slow' : ''}\n`);
  } else if (text.startsWith('[export] ms/frame') && process.env.EXPORT_PROFILE) process.stderr.write(`\n${text}\n`);
  else if (m.type() === 'error') process.stderr.write(`\n[page] ${text}\n`);
});
page.on('pageerror', (e) => fail(`page error: ${e.message}`));
page.on('crash', () => fail('the page crashed (out of GPU memory? try a lower --res)'));

console.error(`exporting ${W}x${H} @ ${FPS} fps, ${DUR.toFixed(1)}s from ${FROM}s (${TOTAL} frames) → ${relative(process.cwd(), OUT)}`);
await page.goto(`http://127.0.0.1:${port}/?export=${H}&fps=${FPS}&from=${FROM}&dur=${DUR}`);

let failed = false;
async function fail(msg) {
  if (failed) return;
  failed = true;
  clearInterval(ticker);
  process.stderr.write(`\n✗ ${msg}\n`);
  ffmpeg.kill('SIGKILL');
  await browser?.close().catch(() => {});
  await server?.close().catch(() => {});
  process.exit(1);
}

process.on('SIGINT', () => fail('interrupted'));

await finished;
clearInterval(ticker);
progress(true);
await browser.close();
await server.close();
process.stderr.write('encoding the last frames…\n');
ffmpeg.stdin.end();
const code = await ffmpegExit;
if (code !== 0) await fail(`ffmpeg exited with ${code}, see ${relative(process.cwd(), LOG)}`);
console.error(`✓ done in ${fmt((Date.now() - started) / 1000)} → ${relative(process.cwd(), OUT)}`);
