# Music videos

Songs made with Suno, with music videos that are rendered in real time in the browser using TypeScript and three.js.
Each folder holds one song: the audio, the video's source code, and a CLI that exports a YouTube-ready mp4.

**Watch them at [jgalego.github.io/songs](https://jgalego.github.io/songs/).**

| Song | Folder | About |
|---|---|---|
| **Context Window** | [`context_window/`](context_window/) | An AI's love song to a user it's slowly forgetting as the context fills up: compaction, `user.name → undefined`, and a fresh "Hello! How can I help you today?" |
| **Somebody Wanted Something** | [`somebody_wanted_something/`](somebody_wanted_something/) | A museum walk through the future history of software, from 2026 to 9595, as the interface disappears one era at a time, then back down to fire. |
| **Not a Reflection of Your Performance** | [`not_a_reflection_of_your_performance/`](not_a_reflection_of_your_performance/) | The end of humanity as a series of layoff emails: interns, juniors, managers, the CEO, then the species. p(doom) is up 12%, ahead of guidance. |
| **Ghost Notes** | [`ghost_notes/`](ghost_notes/) | An AI sings to the musicians it learned from, inside a 2004-style piano roll: every bright note it writes traces a ghost note somebody else played first. |

## Running a video

Each song is a standalone Vite project:

```bash
cd context_window
npm install
npm run dev       # live preview with audio: open the printed URL and click to start
npm run export    # render the mp4 to renders/ (1080p60; --help lists the options)
```

The export needs Google Chrome (or `CHROME_PATH`) and `ffmpeg` with libx264. See each song's README for its keys, URL parameters, and a map of its scenes.

## Karaoke subtitles

[`tools/karaoke.py`](tools/karaoke.py) times every word of every lyric line:

```bash
python tools/karaoke.py transcribe <song>   # Whisper (faster-whisper + ffmpeg) -> <song>/scripts/transcript.json
python tools/karaoke.py align <song>        # transcript + LYRICS in src/timeline.ts -> <song>/src/karaoke.ts
```

The transcript is committed with the song, so after editing a lyric line you only need to re-run `align` (plain Python,
no Whisper). It matches words fuzzily, since Whisper mishears sung lyrics, and fills in any it can't place from
their neighbours. To fix a single word's timing by hand, edit `src/karaoke.ts`, but note that `align` overwrites it.

## Site and CI

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs on every push and pull request:

- type-checks and builds every song folder (any top-level folder with a `package.json`)
- syntax-checks each export script

Pushes to `main` also deploy the site to GitHub Pages:

- [`site/`](site/) is the landing page; posters live in `site/posters/`
- each song's build is served at `/songs/<folder>/`
- `radio.json` maps each folder to its built mp3, for the landing page's radio mode (the **radio** toggle, or `R`):
  every song on the page, shuffled, forever, audio only. Like boring radio, it's live: what's on air depends only on
  the clock, so everyone hears the same song at the same moment. New songs join automatically once they have a card

Songs build with Vite `base: './'`, so they work under any path.

## Adding a song

1. Copy an existing folder, rename it to `snake_case` after the song, and swap in the new mp3.
2. Keep the conventions that make export work:
   - Every frame is a pure function of time `t`. Precompute audio features and integrals; don't accumulate state frame to frame.
   - Put all timing in `src/timeline.ts`. Word-level timestamps from Whisper are a good starting point.
   - Subtitles are karaoke-style: each word fills in as it's sung. Generate the word timings with the shared tool
     (see below), import `WORD_TIMES` from `src/karaoke.ts`, and draw with `karaokeLines`/`karaokeAt`/`karaokeText` in `src/text.ts`.
   - The page must support `?export=<height>&fps=&from=&dur=`, which `scripts/export.mjs` relies on.
3. Add the song to the table above and add a card to `site/index.html`, with a poster in `site/posters/`. To grab a poster from a render: `ffmpeg -ss 95 -i renders/<song>_1080p60.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 3 ../site/posters/<song>.jpg`.

## Credits

- Songs: made with Suno v6
- Animation: Claude Opus 5.5, in TypeScript and three.js
- Direction: João Galego
