/** Playback only (analysis is precomputed in features.ts). Provides a smooth master clock. */
export class Song {
  readonly el: HTMLAudioElement;
  private lastMediaTime = -1;
  private lastStamp = 0;

  constructor(url: string) {
    this.el = new Audio(url);
    this.el.preload = 'auto';
  }

  /** currentTime only updates every few ms; interpolate between updates for smooth motion. */
  get time(): number {
    const media = this.el.currentTime;
    const now = performance.now();
    if (media !== this.lastMediaTime || this.el.paused) {
      this.lastMediaTime = media;
      this.lastStamp = now;
      return media;
    }
    return media + Math.min(0.1, (now - this.lastStamp) / 1000) * this.el.playbackRate;
  }
}
