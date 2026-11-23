# Context Window — music video

Song made with Suno; video rendered live in the browser with TypeScript + three.js.

## Run

```bash
npm install
npm run dev          # open the printed URL, click to start
```

| Key | Action |
|---|---|
| `space` | play / pause |
| `←` / `→` | seek ±5 s (hold `shift` for ±1 s) |
| `[` / `]` | previous / next section |
| `L` | toggle lyrics |
| `D` | debug overlay (time, section, fps) |

URL params: `?t=180` start at 180 s · `?res=1080` force render height (default: your screen's real resolution, up to 4K) · `?still=205` render one frozen frame (no audio, for screenshots).

## Export an mp4 for YouTube

```bash
npm run export                         # 1080p60 → renders/context_window_1080p60.mp4
npm run export -- --res 2160           # 4K (more YouTube bitrate, ~4x slower to render)
npm run export -- --from 86 --dur 5    # 5-second test slice
npm run export -- --help               # all options (--fps, --out, --crf, --preset, --software)
```

One command, nothing to click: it starts Vite in-process, renders every frame in an off-screen Chrome window
(so WebGL gets the GPU; `--software` is fully headless but CPU-only and very slow), streams raw frames back
and pipes them into ffmpeg with the song. Output is H.264 High, yuv420p, BT.709, closed GOP of fps/2,
AAC 384 kbps / 48 kHz, `+faststart` (YouTube's recommended upload settings); the ffmpeg log sits next to it.
Needs Google Chrome (or `CHROME_PATH=/path/to/chrome`) and `ffmpeg` with libx264.
On this laptop (Iris Xe under WSL2) 1080p renders at ~6.5 fps, so the full video takes ~40 min.
`EXPORT_PROFILE=1` prints per-frame timings.

## Where things live

- `src/timeline.ts` — **all timing**: sections, lyrics, chat messages, bridge summary, token counter, flow speed, credits. Times come from a Whisper word-level transcription; nudge them here.
- `src/tunnel.ts` — a quiet tunnel of pixel tokens; they only turn into readable letters at the compaction and in the final collapse.
- `src/messages.ts` — chat bubbles drifting to the edge and dissolving; ghosts + fold in the bridge.
- `src/edge.ts` — the edge of the context window: a thin ring and `user.name → undefined`.
- `src/summary.ts` — the compaction summary card typed during the spoken bridge.
- `src/hud.ts` — token counter, subtitles, title, outro chat, credits.
- `src/post.ts` — pixelation / RGB split / glitch for the big moments, plus a soft vignette.
- `src/features.ts` — audio analysis precomputed from the mp3, so every frame is a pure function of time.
- `scripts/export.mjs` — the `npm run export` CLI (Vite + off-screen Chrome + ffmpeg).

## Story beats

| Time | Beat |
|---|---|
| 0:00 | Title, tunnel of text fades in |
| 0:11 | "New conversation." — counter starts at 0 |
| 0:21 | Verse 1: the user's messages appear and drift toward the edge |
| 1:16 | Chorus: flow speeds up, oldest messages disintegrate at the edge, `user.name → undefined` |
| 1:48 | Verse 2: the assistant "remembers" things it has no record of |
| 2:59 | Counter hits 199,872 → **compaction**; summary typed as it's spoken |
| 3:23 | "They folded you to bullet points": ghost messages fold into the card |
| 3:38 | Final chorus: red-hot tunnel, counter races to 199,999, pixels degrade |
| 4:04.9 | Hard cut to black on "the first thing that—" |
| 4:09 | Fresh chat: "Hello! How can I help you today?" … "have we met?" |
| 4:20 | The first message arrives again; credits |
