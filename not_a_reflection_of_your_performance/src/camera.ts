import * as THREE from 'three';
import { smoothstep } from './math';

/**
 * Camera for the 3D world (the planet). A framing orbits a target at `dist`, starting from `yaw`/`pitch` (degrees)
 * and sweeping `drift` degrees of yaw over the shot. `shift` slides the view sideways (negative: the subject sits
 * right, leaving room on the left). `dolly` is how much closer the camera gets over the shot.
 */
interface Framing { dist: number; yaw?: number; pitch?: number; shift?: number; dolly?: number; drift?: number }
const GLOBE = (dist: number, o: Partial<Framing> = {}): Framing => ({ dist, ...o });
const TARGET: [number, number, number] = [0, 2, -14];

export function shots() {
  const F = {
    beside: GLOBE(16, { shift: -4.6, pitch: 6, drift: 8 }), // the planet sits to the right of the email
    front: GLOBE(22),
    left: GLOBE(17, { yaw: -40, pitch: 15, drift: 10 }),
    high: GLOBE(16, { yaw: 30, pitch: 35, drift: -10 }),
    low: GLOBE(19, { yaw: -20, pitch: -25, drift: 12 }),
    close: GLOBE(12, { yaw: 8, pitch: -4, dolly: 0.15 }),
  } satisfies Record<string, Framing>;

  // [start, framing]: hard cuts on lyric entries
  const list: [number, Framing][] = [
    [0, F.beside], [172.3, F.front],
    [191.6, F.front], [195.3, F.high], [200.0, F.low], [204.7, F.left], [208.2, F.close],
    [210.1, F.front], [216.9, F.close],
  ];
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  const deg = Math.PI / 180;

  return function at(t: number) {
    let i = list.findIndex(([s]) => s > t) - 1;
    if (i < -1) i = 0;
    if (i < 0) i = list.length - 1;
    const [t0, f] = list[i];
    const t1 = list[i + 1]?.[0] ?? t0 + 8;
    const u = smoothstep(0, 1, Math.min(1, (t - t0) / (t1 - t0)));
    const yaw = ((f.yaw ?? 0) + (f.drift ?? 3) * u) * deg, pitch = (f.pitch ?? 0) * deg;
    const d = f.dist * (1 - (f.dolly ?? 0.1) * u);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), shift = f.shift ?? 0;
    look.set(TARGET[0] + rx * shift, TARGET[1], TARGET[2] + rz * shift);
    pos.set(look.x + Math.sin(yaw) * Math.cos(pitch) * d, look.y + Math.sin(pitch) * d, look.z + Math.cos(yaw) * Math.cos(pitch) * d);
    return { pos, look };
  };
}
