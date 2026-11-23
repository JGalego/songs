import type { G } from './art';

export const W = 1920, H = 1080;

/** Everything a scene needs to draw one frame: time is absolute (t) and relative to the scene (k). */
export interface SceneCtx { c: G; t: number; k: number; d: number; u: number; kick: number }

export interface Scene {
  name: string;
  t0: number;
  t1: number;
  /** Backdrop gradient (top, bottom). Omit for a transparent scene that shows the 3D world behind it. */
  bg?: [string, string];
  /** Soft glow colors for the backdrop. */
  glow?: string[];
  /** Fades the backdrop out so the 3D world shows through (e.g. the planet appears beside the email). */
  bgAlpha?: (t: number) => number;
  /** A color wipe over the cut into this scene (default true). */
  wipe?: boolean;
  draw: (s: SceneCtx) => void;
}
