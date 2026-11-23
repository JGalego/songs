#!/usr/bin/env python3
"""
Karaoke word timings for a song folder.

  python tools/karaoke.py transcribe <song_dir>   # Whisper word timestamps -> <song_dir>/scripts/transcript.json
  python tools/karaoke.py align <song_dir>        # transcript + LYRICS in src/timeline.ts -> src/karaoke.ts

`transcribe` needs faster-whisper and ffmpeg; `align` needs nothing but Python. The transcript is kept in the
song folder, so after editing the lyrics you only need to re-run `align`.
"""
import difflib, json, re, subprocess, sys
from pathlib import Path


def lyric_lines(song: Path):
    """The (start, end, text) of every L(...) call in src/timeline.ts. A non-numeric end is looked up as a constant."""
    src = (song / "src/timeline.ts").read_text()
    const = lambda name: float(re.search(rf"\b{name}\s*=\s*([\d.]+)", src).group(1))
    num = lambda v: float(v) if re.fullmatch(r"[\d.]+", v) else const(v)
    pat = r"""^\s*L\(([\w.]+),\s*([\w.]+),\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")"""
    return [(num(a), num(b), eval(s)) for a, b, s in re.findall(pat, src, re.M)]


def transcribe(song: Path):
    from faster_whisper import WhisperModel
    import numpy as np
    audio = song / f"{song.name}.mp3"
    prompt = " ".join(text for _, _, text in lyric_lines(song))[:800]  # bias Whisper toward the real words
    pcm = subprocess.run(["ffmpeg", "-nostdin", "-i", str(audio), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(np.frombuffer(pcm, np.float32), language="en", word_timestamps=True,
                               initial_prompt=prompt, vad_filter=False, condition_on_previous_text=False)
    res = []
    for s in segs:
        res.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
                    "words": [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for w in s.words]})
        print(f"{s.start:7.2f}-{s.end:7.2f} {s.text.strip()}", flush=True)
    out = song / "scripts/transcript.json"
    out.write_text(json.dumps(res, indent=1))
    print(f"wrote {out}")


def align(song: Path):
    words = [w for seg in json.loads((song / "scripts/transcript.json").read_text()) for w in seg["words"]]
    lines = lyric_lines(song)
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    toks = [(li, norm(x)) for li, (_, _, text) in enumerate(lines) for x in text.split()]
    B = [norm(w["w"]) for w in words]

    def sim(i, j):  # fuzzy word match, only near the line's own time window
        t0, t1, _ = lines[toks[i][0]]
        if words[j]["e"] < t0 - 1.0 or words[j]["s"] > t1 + 1.0: return None
        r = difflib.SequenceMatcher(None, toks[i][1], B[j]).ratio()
        return r if r >= 0.45 else None

    # one global in-order alignment (weighted LCS) of every lyric word against every transcribed word
    n, m = len(toks), len(B)
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            best = max(D[i + 1][j], D[i][j + 1])
            s = sim(i, j)
            if s is not None: best = max(best, s + D[i + 1][j + 1])
            D[i][j] = best
    match, i, j = {}, 0, 0
    while i < n and j < m:
        s = sim(i, j)
        if s is not None and abs(D[i][j] - (s + D[i + 1][j + 1])) < 1e-9: match[i] = j; i += 1; j += 1
        elif D[i][j] == D[i + 1][j]: i += 1
        else: j += 1

    # Whisper sometimes splits one word in two ("twenty" "-six", "200" ",000"): let a match absorb the tail
    used = set(match.values())
    ends = {}
    for i, j in match.items():
        e = words[j]["e"]
        while j + 1 < m and j + 1 not in used and words[j + 1]["w"][:1] in "-,": j += 1; e = words[j]["e"]
        ends[i] = e

    res, k = [], 0
    for t0, t1, text in lines:
        ts = text.split(); times = []; miss = []
        for w in ts:
            j = match.get(k); k += 1
            times.append([words[j]["s"], ends[k - 1]] if j is not None else None)
            if j is None: miss.append(w)
        if all(x is None for x in times):  # nothing heard: spread the line evenly over its own window
            times = [[t0 + (t1 - t0) * q / len(ts), t0 + (t1 - t0) * (q + 1) / len(ts)] for q in range(len(ts))]
        for i in range(len(ts)):  # unmatched words: interpolate between their neighbours
            if times[i] is None:
                j = i
                while j < len(ts) and times[j] is None: j += 1
                hi = times[j][0] if j < len(ts) else None
                if i > 0: lo = times[i - 1][1]
                else:  # leading words: fill the gap after the previous line, at most 0.6 s a word
                    lo = hi - 0.6 * (j - i)
                    if res: lo = max(lo, min(res[-1][-1][1], hi - 0.15 * (j - i)))
                if hi is None: hi = lo + 0.3 * (j - i)
                for q in range(j - i): times[i + q] = [lo + (hi - lo) * q / (j - i), lo + (hi - lo) * (q + 1) / (j - i)]
        # Whisper stretches a word that follows silence back into the silence: cap those at 0.6 s
        for i, (s, e) in enumerate(times):
            if (i == 0 or s - times[i - 1][1] > 0.25) and e - s > 0.6: times[i][0] = e - 0.6
        times = [[round(s, 2), round(e, 2)] for s, e in times]
        res.append(times)
        print(f"{t0:7.2f} {times[0][0]:7.2f}-{times[-1][1]:7.2f}{'  missing: ' + ' '.join(miss) if miss else ''} | {text}")

    out = song / "src/karaoke.ts"
    with out.open("w") as f:
        f.write("// Generated by tools/karaoke.py: [start, end] of each word of each LYRICS line (split on spaces).\n")
        f.write("export const WORD_TIMES: [number, number][][] = [\n")
        for r in res: f.write("  [" + ", ".join(f"[{s}, {e}]" for s, e in r) + "],\n")
        f.write("];\n")
    print(f"wrote {out}")


if __name__ == "__main__":
    cmd, song = sys.argv[1], Path(sys.argv[2]).resolve()
    {"transcribe": transcribe, "align": align}[cmd](song)
