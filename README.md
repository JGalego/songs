# Music videos

Songs made with Suno, with music videos that are rendered in real time in the browser using TypeScript and three.js.
Each folder holds one song: the audio, the video's source code, and a CLI that exports a YouTube-ready mp4.

**Watch them at [jgalego.github.io/songs](https://jgalego.github.io/songs/).**

| Song | Folder | About |
|---|---|---|
| **Context Window** | [`context_window/`](context_window/) | An AI's love song to a user it's slowly forgetting as the context fills up: compaction, `user.name → undefined`, and a fresh "Hello! How can I help you today?" |
| **Somebody Wanted Something** | [`somebody_wanted_something/`](somebody_wanted_something/) | A museum walk through the future history of software, from 2026 to 9595, as the interface disappears one era at a time, then back down to fire. |

## Running a video

Each song is a standalone Vite project:

```bash
cd context_window
npm install
npm run dev       # live preview with audio: open the printed URL and click to start
npm run export    # render the mp4 to renders/ (1080p60; --help lists the options)
```

The export needs Google Chrome (or `CHROME_PATH`) and `ffmpeg` with libx264. See each song's README for its keys, URL parameters, and a map of its scenes.

## Site and CI

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs on every push and pull request:

- type-checks and builds every song folder (any top-level folder with a `package.json`)
- syntax-checks each export script

Pushes to `main` also deploy the site to GitHub Pages:

- [`site/`](site/) is the landing page; posters live in `site/posters/`
- each song's build is served at `/songs/<folder>/`

Songs build with Vite `base: './'`, so they work under any path.

## Adding a song

1. Copy an existing folder, rename it to `snake_case` after the song, and swap in the new mp3.
2. Keep the conventions that make export work:
   - Every frame is a pure function of time `t`. Precompute audio features and integrals; don't accumulate state frame to frame.
   - Put all timing in `src/timeline.ts`. Word-level timestamps from Whisper are a good starting point.
   - The page must support `?export=<height>&fps=&from=&dur=`, which `scripts/export.mjs` relies on.
3. Add the song to the table above and add a card to `site/index.html`, with a poster in `site/posters/`. To grab a poster from a render: `ffmpeg -ss 95 -i renders/<song>_1080p60.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 3 ../site/posters/<song>.jpg`.

## Credits

- Songs: made with Suno v6
- Animation: Claude Opus 5.5, in TypeScript and three.js
- Direction: João Galego
