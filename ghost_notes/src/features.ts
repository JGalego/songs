// Offline audio analysis: band energies precomputed once from the decoded MP3,
// so every frame is a pure function of time (live preview == offline export).
// Mirrors what an AnalyserNode (fft 2048, Blackman window, -100..-30 dB) would report.

const RATE = 100; // feature frames per second
const N = 2048;
const MIN_DB = -100, MAX_DB = -30;

export interface Bands { bass: number; mid: number; high: number; kick: number }

// radix-2 FFT with precomputed bit-reversal and twiddle tables (fixed size N)
const BITREV = new Uint32Array(N);
for (let i = 0, bits = Math.log2(N); i < N; i++) {
  let r = 0;
  for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
  BITREV[i] = r;
}
const COS = new Float64Array(N / 2), SIN = new Float64Array(N / 2);
for (let i = 0; i < N / 2; i++) { COS[i] = Math.cos((-2 * Math.PI * i) / N); SIN[i] = Math.sin((-2 * Math.PI * i) / N); }

function fft(re: Float64Array, im: Float64Array) {
  for (let i = 0; i < N; i++) {
    const j = BITREV[i];
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1, step = N / len;
    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const cr = COS[k * step], ci = SIN[k * step];
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}

// cache in localStorage so reloads skip the analysis (~450 KB)
function loadCache(key: string): Float32Array | null {
  try {
    const b64 = localStorage.getItem(key);
    if (!b64) return null;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Float32Array(bytes.buffer);
  } catch { return null; }
}
function saveCache(key: string, data: Float32Array) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('features:')) localStorage.removeItem(k);
    const bytes = new Uint8Array(data.buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    localStorage.setItem(key, btoa(bin));
  } catch { /* storage full or unavailable: just recompute next time */ }
}

export class AudioFeatures {
  private constructor(private data: Float32Array, private frames: number) {}

  static async fromUrl(url: string): Promise<AudioFeatures> {
    const buf = await (await fetch(url)).arrayBuffer();
    const key = `features:v1:${url}:${buf.byteLength}`;
    const cached = loadCache(key);
    if (cached) return new AudioFeatures(cached, cached.length / 4);
    const audio = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(buf);
    const sr = audio.sampleRate;
    const len = audio.length;
    const mono = new Float32Array(len);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const ch = audio.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += ch[i] / audio.numberOfChannels;
    }

    const hop = sr / RATE;
    const frames = Math.floor(len / hop);
    const win = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const x = i / N;
      win[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * x) + 0.08 * Math.cos(4 * Math.PI * x);
    }
    const binHz = sr / N;
    const range = (lo: number, hi: number): [number, number] => {
      const a = Math.max(1, Math.floor(lo / binHz));
      return [a, Math.max(a + 1, Math.floor(hi / binHz))];
    };
    const bands = [range(25, 150), range(150, 2000), range(2000, 10000)];

    const re = new Float64Array(N), im = new Float64Array(N);
    const maxBin = bands[2][1];
    const magA = new Float64Array(maxBin), magB = new Float64Array(maxBin);
    // two real frames per complex FFT: x = a + i·b  →  |A[k]| = |X[k] + conj X[N-k]| / 2, |B[k]| = |X[k] − conj X[N-k]| / 2
    const spectra = (fa: number, fb: number) => {
      const sa = Math.round(fa * hop) - N / 2, sb = Math.round(fb * hop) - N / 2;
      for (let i = 0; i < N; i++) {
        const ia = sa + i, ib = sb + i;
        re[i] = ia >= 0 && ia < len ? mono[ia] * win[i] : 0;
        im[i] = ib >= 0 && ib < len ? mono[ib] * win[i] : 0;
      }
      fft(re, im);
      for (let k = 1; k < maxBin; k++) {
        const r1 = re[k], i1 = im[k], r2 = re[N - k], i2 = im[N - k];
        magA[k] = Math.hypot(r1 + r2, i1 - i2) / (2 * N);
        magB[k] = Math.hypot(i1 + i2, r2 - r1) / (2 * N);
      }
    };

    const smooth = new Float64Array(maxBin);
    const tau = Math.pow(0.7, 60 / RATE); // analyser smoothing 0.7 at ~60 Hz, rescaled to our rate
    const dt = 1 / RATE;
    const follow = (cur: number, target: number, up: number, down: number) =>
      cur + (target - cur) * (1 - Math.exp(-dt * (target > cur ? up : down)));

    let bass = 0, mid = 0, high = 0, bassSlow = 0;
    const data = new Float32Array(frames * 4);
    const step = (f: number, mag: Float64Array) => {
      const avg = ([a, b]: [number, number]) => {
        let sum = 0;
        for (let k = a; k < b; k++) {
          smooth[k] = tau * smooth[k] + (1 - tau) * mag[k];
          const db = 20 * Math.log10(smooth[k] + 1e-12);
          sum += Math.min(1, Math.max(0, (db - MIN_DB) / (MAX_DB - MIN_DB)));
        }
        return sum / (b - a);
      };
      const b = avg(bands[0]), m = avg(bands[1]), h = avg(bands[2]);
      bass = follow(bass, b, 30, 6);
      mid = follow(mid, m, 20, 5);
      high = follow(high, h, 25, 6);
      bassSlow = follow(bassSlow, b, 2, 2);
      data.set([bass, mid, high, Math.min(1, Math.max(0, (bass - bassSlow) * 6))], f * 4);
    };
    for (let f = 0; f < frames; f += 2) {
      spectra(f, f + 1);
      step(f, magA);
      if (f + 1 < frames) step(f + 1, magB);
    }
    saveCache(key, data);
    return new AudioFeatures(data, frames);
  }

  at(t: number): Bands {
    const x = Math.min(Math.max(t * RATE, 0), this.frames - 1.001);
    const i = Math.floor(x), u = x - i;
    const g = (k: number) => this.data[i * 4 + k] * (1 - u) + this.data[(i + 1) * 4 + k] * u;
    return { bass: g(0), mid: g(1), high: g(2), kick: g(3) };
  }
}
