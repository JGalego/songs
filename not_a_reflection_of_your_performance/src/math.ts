export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** 1 inside [a, b], with `fade`-second ramps on both sides. */
export const window01 = (x: number, a: number, b: number, fade = 0.4) =>
  smoothstep(a - fade, a, x) * (1 - smoothstep(b, b + fade, x));

/** Piecewise-linear lookup in sorted [t, value] keyframes. */
export function keyframes(kf: [number, number][], t: number): number {
  if (t <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) {
    const [t1, v1] = kf[i];
    if (t <= t1) {
      const [t0, v0] = kf[i - 1];
      return t1 === t0 ? v1 : lerp(v0, v1, (t - t0) / (t1 - t0));
    }
  }
  return kf[kf.length - 1][1];
}

/** Precomputed integral of a speed curve, so positions are a pure function of time (seekable). */
export class Integral {
  private table: Float64Array;
  constructor(private speed: [number, number][], private duration: number, private hz = 100) {
    const n = Math.ceil(duration * hz) + 2;
    this.table = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      const t = (i - 0.5) / hz;
      this.table[i] = this.table[i - 1] + keyframes(this.speed, t) / hz;
    }
  }
  at(t: number): number {
    const x = clamp(t, 0, this.duration) * this.hz;
    const i = Math.floor(x);
    const a = this.table[Math.min(i, this.table.length - 1)];
    const b = this.table[Math.min(i + 1, this.table.length - 1)];
    return lerp(a, b, x - i);
  }
}

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
