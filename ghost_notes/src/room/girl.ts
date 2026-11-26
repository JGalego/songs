// Her. Dark brown hair with a blunt fringe and a high ponytail in a green elastic, cream headphones with red rings,
// a dark green sweater with a coral cowl: the colours of the lo-fi study girl, on a figure of our own. Modelled from
// smooth shapes (a head with a jaw and a chin; a lofted body; jointed arms; hands with fingers), cel-shaded and inked.
// We never see her face: the camera stays behind her, and she keeps her eyes on the screen.
//
// Local space: the origin is the centre of her head; she faces −z (the screen); +x is her right.
import * as THREE from 'three';
import { canvas, lathe, loft, put, rbox, shell, solid, toon, tube } from './kit';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const SKIN = '#f0c2a4', HAIR = '#3b2318', SWEATER = '#4a7a62', COWL = '#e8586c', CREAM = '#e9dfc4', RED = '#b03a3c', JEANS = '#4f62a0';
const HEAD = 1.25;

/** The head's radius in every direction: an egg, narrower at the jaw, with a chin. */
function headR(phi: number, th: number) {
  const s = Math.sin(th), dx = s * Math.sin(phi), dy = Math.cos(th), dz = -s * Math.cos(phi);
  let r = HEAD / Math.sqrt((dx / 0.95) ** 2 + (dy / 1.03) ** 2 + (dz / 1.0) ** 2);
  r *= 1 - 0.2 * sm(-0.1, -0.95, dy) * (0.3 + 0.7 * Math.abs(dx)); // the jaw tapers
  r *= 1 + 0.04 * Math.max(0, dz) * (1 - Math.abs(dy)); // a fuller back to the skull
  r *= 1 - 0.03 * sm(0.55, 1, -dz); // the face a touch flatter
  r *= 1 + 0.08 * sm(0.9, 1, dx * 0 + dy * -0.834 + dz * -0.552); // chin
  return r;
}

/** A hand: palm, four fingers and a thumb. `curl` bends the fingers down (over a mouse); `side` −1 left, +1 right. */
function hand(side: number, curl: number) {
  const g = new THREE.Group(), skin = toon(SKIN);
  const palm = solid(new THREE.SphereGeometry(0.5, 24, 16), skin, { ink: 0.025 });
  palm.scale.set(0.86, 0.34, 1.0);
  g.add(palm);
  for (let f = 0; f < 4; f++) {
    const k = side < 0 ? f : 3 - f; // index finger on the inside
    const x = (f - 1.5) * 0.2, len = [0.5, 0.58, 0.54, 0.42][k];
    g.add(solid(tube([V(x, 0.02, -0.4), V(x * 1.06, 0.03 - curl * 0.05, -0.4 - len * 0.55), V(x * 1.1, -0.06 - curl * 0.22, -0.4 - len)], (u) => 0.095 - 0.02 * u, { segs: 8, radial: 8 }), skin, { ink: 0.02 }));
  }
  const tx = -side * 0.44; // the thumb, on the inside
  g.add(solid(tube([V(tx * 0.75, -0.02, 0), V(tx * 1.05, -0.06, -0.28), V(tx * 0.98, -0.1 - curl * 0.1, -0.56)], (u) => 0.11 - 0.025 * u, { segs: 8, radial: 8 }), skin, { ink: 0.02 }));
  return g;
}

export class Girl {
  readonly group = new THREE.Group();
  private head = new THREE.Group();
  private tail = new THREE.Group();
  private body = new THREE.Group();
  private forearmR = new THREE.Group();

  constructor() {
    this.buildBody();
    this.buildHead();
    this.group.add(this.body, this.head);
  }

  private buildHead() {
    const h = this.head, PIVOT = V(0, -1.3, 0.15); // she nods from the top of her neck
    h.position.copy(PIVOT);
    const add = (o: THREE.Object3D) => { o.position.sub(PIVOT); h.add(o); return o; };
    add(solid(shell(headR, { theta1: Math.PI, phiSeg: 64, thetaSeg: 40 }), toon(SKIN), { ink: 0.045 }));
    // hair: one shell, short across the brow (the fringe), down to the jaw at the sides, to the nape behind
    const strands = canvas(256, 64, (c, W, H) => {
      c.fillStyle = HAIR; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) {
        c.fillStyle = i % 3 ? 'rgba(96,60,36,0.5)' : 'rgba(18,8,6,0.55)';
        c.fillRect((i * 37.7) % W, 0, 1 + (i % 4), H);
      }
    });
    const hairMat = toon('#ffffff', { map: strands, side: THREE.DoubleSide });
    const edge = (phi: number) => {
      const a = Math.abs(phi);
      const fringe = 1.4 - 0.05 * Math.cos(a * 1.6) - 0.05 * Math.exp(-(((a - 0.36) / 0.05) ** 2)) - 0.035 * Math.exp(-(((a - 0.72) / 0.04) ** 2));
      return fringe + (2.08 - fringe) * sm(0.92, 1.22, a) + 0.14 * sm(1.9, 2.5, a);
    };
    const hairR = (p: number, t: number) => headR(p, t) + 0.11 + 0.07 * sm(0.5, 1.6, Math.abs(p)) + 0.05 * sm(1.2, 0.2, t);
    add(solid(shell(hairR, { theta1: edge, phiSeg: 96, thetaSeg: 28 }), hairMat, { ink: 0.05 }));
    // an ink line under the hair's edge, where the outline can't reach
    // (a slightly longer shell just inside the hair: only its bottom 0.03 rad shows)
    add(new THREE.Mesh(
      shell((p, t) => hairR(p, t) - 0.008, { theta1: (p) => edge(p) + 0.03, phiSeg: 96, thetaSeg: 28 }),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#150b0a'), side: THREE.DoubleSide }),
    ));

    // the ponytail: gathered high at the back, full, falling to the nape; and the elastic
    const base = V(0, 0.98, 0.9);
    this.tail.position.copy(base).sub(PIVOT);
    const pts = [V(0, 0, 0), V(0, 0.34, 0.42), V(0, 0.3, 0.98), V(0.03, -0.45, 1.32), V(0.07, -1.5, 1.22)];
    const tailR = (u: number) => (u < 0.32 ? 0.3 + 0.17 * Math.sin((u / 0.32) * Math.PI / 2) : 0.47 - 0.41 * Math.pow((u - 0.32) / 0.68, 0.8));
    this.tail.add(solid(tube(pts, tailR, { segs: 36, radial: 18 }), toon(HAIR), { ink: 0.05 }));
    const tie = solid(new THREE.TorusGeometry(0.33, 0.12, 12, 28), toon('#2f5a44'), { ink: 0.03 });
    tie.position.set(0, 0.07, 0.1); tie.lookAt(V(0, 0.3, 0.4).add(tie.position));
    this.tail.add(tie);
    h.add(this.tail);

    // headphones: a flat cream band over the crown; cups with a red ring, two little screws, dark cushions
    const cream = toon(CREAM);
    add(solid(tube([V(-1.5, 0.3, 0.06), V(-1.28, 1.12, 0.02), V(0, 1.68, -0.04), V(1.28, 1.12, 0.02), V(1.5, 0.3, 0.06)], 0.085, { segs: 40, radial: 10, squash: 2.3 }), cream, { ink: 0.035 }));
    for (const s of [-1, 1]) {
      const cup = new THREE.Group();
      const shellGeo = lathe([[0, 0.46], [0.46, 0.46], [0.62, 0.4], [0.7, 0.26], [0.7, 0.08], [0.62, 0], [0, 0]], 36);
      cup.add(solid(shellGeo, cream, { ink: 0.04 }));
      cup.add(put(solid(new THREE.TorusGeometry(0.5, 0.075, 10, 36), toon(RED), { ink: 0 }), 0, 0.45, 0, Math.PI / 2));
      cup.add(put(solid(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 28), toon('#d9cfb2'), { ink: 0 }), 0, 0.47, 0));
      cup.add(put(solid(new THREE.TorusGeometry(0.2, 0.03, 8, 24), toon('#b9ad90'), { ink: 0 }), 0, 0.495, 0, Math.PI / 2));
      cup.add(put(solid(new THREE.TorusGeometry(0.5, 0.2, 12, 30), toon('#3b2a2c'), { ink: 0.03 }), 0, -0.1, 0, Math.PI / 2));
      // a short yoke up to the band (the cup's own axis, +y here, points out from her ear)
      cup.add(put(solid(rbox(0.66, 0.16, 0.16, 0.07), cream, { ink: 0.025 }), -s * 0.45, 0.2, 0));
      add(put(cup, s * 1.32, -0.12, 0.08, 0, 0, -s * Math.PI / 2));
    }
    // the cable, down over her left shoulder to the desk
    this.body.add(solid(tube([V(-1.55, -0.85, 0.1), V(-1.9, -2.1, -0.75), V(-2.9, -3.6, -2.2), V(-3.9, -4.7, -4.6), V(-5.2, -4.74, -6.6), V(-5.4, -4.74, -9.2)], 0.035, { segs: 40, radial: 6 }), toon('#2a2024'), { ink: 0 }));
  }

  private buildBody() {
    const b = this.body, sweater = toon(SWEATER), cowl = toon(COWL), jeans = toon(JEANS);
    b.add(solid(new THREE.CylinderGeometry(0.42, 0.5, 0.9, 20), toon(SKIN), { ink: 0.035 }).translateY(-1.45).translateZ(0.12));
    // the sweater: big, soft, slumped a little toward the screen
    b.add(solid(loft([
      { y: -1.45, rx: 0.5, rz: 0.5, z: 0.12 }, { y: -1.8, rx: 1.1, rz: 0.9, z: 0.14, n: 2.2 }, { y: -2.2, rx: 1.98, rz: 1.12, z: 0.16, n: 2.5 },
      { y: -3.0, rx: 2.28, rz: 1.34, z: 0.2, n: 2.6 }, { y: -4.6, rx: 2.32, rz: 1.46, z: 0.3, n: 2.6 }, { y: -6.4, rx: 2.28, rz: 1.52, z: 0.44, n: 2.6 },
      { y: -8.0, rx: 2.4, rz: 1.64, z: 0.56, n: 2.6 }, { y: -8.75, rx: 2.2, rz: 1.5, z: 0.6, n: 2.4 }, { y: -8.95, rx: 1.0, rz: 0.8, z: 0.6 },
    ], 48), sweater, { ink: 0.06 }));
    // the coral cowl, bunched round her neck, and the hood of it lying on her back
    const wrap = solid(new THREE.TorusGeometry(0.92, 0.46, 18, 40), cowl, { ink: 0.05 });
    b.add(put(wrap, 0, -1.72, 0.12, Math.PI / 2 - 0.2));
    wrap.scale.set(1.08, 1, 0.9);
    const hood = solid(new THREE.SphereGeometry(1, 28, 20), cowl, { ink: 0.05 });
    b.add(put(hood, 0, -2.25, 1.0, 0.5));
    hood.scale.set(1.35, 0.62, 0.7);

    // arms: shoulder, elbow, wrist; the sleeves bunch before the cuff
    const sleeve = (u: number) => 0.6 + 0.07 * Math.sin(Math.min(1, u / 0.8) * Math.PI) - 0.12 * sm(0.8, 1, u);
    const arm = (s: number, elbow: THREE.Vector3, wrist: THREE.Vector3, curl: number) => {
      const shoulder = V(s * 2.05, -2.4, 0.16);
      b.add(put(solid(new THREE.SphereGeometry(0.76, 22, 16), sweater, { ink: 0.05 }), shoulder.x, shoulder.y, shoulder.z));
      b.add(solid(tube([shoulder, shoulder.clone().lerp(elbow, 0.5).add(V(s * 0.12, 0.05, 0.1)), elbow], (u) => 0.74 - 0.1 * u, { segs: 14, radial: 14 }), sweater, { ink: 0.05 }));
      // the forearm hangs off the elbow, so it can move
      const fore = new THREE.Group();
      fore.position.copy(elbow);
      const w = wrist.clone().sub(elbow);
      fore.add(solid(new THREE.SphereGeometry(0.66, 20, 14), sweater, { ink: 0.05 }));
      fore.add(solid(tube([V(0, 0, 0), w.clone().multiplyScalar(0.5).add(V(0, 0.06, 0)), w], sleeve, { segs: 16, radial: 14 }), sweater, { ink: 0.05 }));
      const cuff = solid(new THREE.TorusGeometry(0.4, 0.17, 12, 24), toon('#3d6852'), { ink: 0.03 });
      cuff.position.copy(w); cuff.lookAt(w.clone().multiplyScalar(2));
      const hnd = hand(s, curl);
      hnd.position.copy(w).add(w.clone().normalize().multiplyScalar(0.5)).add(V(0, -0.04, 0));
      hnd.rotation.y = Math.atan2(-w.x, -w.z);
      fore.add(cuff, hnd);
      b.add(fore);
      return fore;
    };
    arm(-1, V(-2.95, -4.3, -1.9), V(-2.15, -4.4, -5.85), 0.25); // left hand on the keys
    this.forearmR = arm(1, V(3.05, -4.35, -1.7), V(3.0, -4.42, -5.75), 1); // right hand on the mouse
    // legs: thighs forward under the desk, shins down, socks
    for (const s of [-1, 1]) {
      const hip = V(s * 0.98, -8.5, 0.3), knee = V(s * 1.08, -8.35, -5.0), ankle = V(s * 1.08, -14.0, -4.6);
      b.add(solid(tube([hip, knee], (u) => 1.02 - 0.2 * u, { segs: 10, radial: 14 }), jeans, { ink: 0.05 }));
      b.add(solid(tube([knee, knee.clone().lerp(ankle, 0.5).add(V(0, 0, -0.15)), ankle], (u) => 0.8 - 0.3 * u, { segs: 12, radial: 14 }), jeans, { ink: 0.05 }));
      const sock = solid(new THREE.SphereGeometry(0.55, 18, 12), toon('#efe6d6'), { ink: 0.035 });
      b.add(put(sock, s * 1.08, -14.42, -5.05));
      sock.scale.set(0.95, 0.62, 1.7);
    }
  }

  /**
   * t: seconds. nod: 0..1, how much she's nodding along; beat: beats since the song's first downbeat;
   * mouse: −1..1, where her mouse hand is across the pad.
   */
  update(t: number, o: { nod: number; beat: number; mouse: number }) {
    // breathing, and the small sway of someone who's been sitting a while
    const breath = Math.sin(t * 1.25);
    this.body.scale.set(1 + 0.006 * breath, 1 + 0.004 * breath, 1 + 0.012 * breath);
    // she nods on the beat: down on it, back up after, the ponytail a moment behind
    const phase = o.beat - Math.floor(o.beat);
    const down = Math.exp(-phase * 5) * (1 - Math.exp(-phase * 40));
    this.head.rotation.set(-0.16 - o.nod * 0.11 * down + 0.012 * Math.sin(t * 0.7), 0.05 * Math.sin(t * 0.31), 0.02 * Math.sin(t * 0.47));
    const lag = Math.exp(-((phase + 0.82) % 1) * 5);
    this.tail.rotation.set(o.nod * 0.16 * lag + 0.02 * Math.sin(t * 0.9), 0, 0.03 * Math.sin(t * 0.6));
    this.forearmR.rotation.y = -o.mouse * 0.07;
  }
}

/** Her chair: red, soft, a tall rounded back, on a swivel base with five castors. Origin: where her head would be. */
export function chair() {
  const g = new THREE.Group(), red = toon('#b3272c'), dark = toon('#2a2428');
  g.add(put(solid(rbox(5.4, 1.15, 5.2, 0.5, 5), red, { ink: 0.06 }), 0, -9.45, 0.75));
  // the back: a rounded panel, curved round her, leaning a little
  const backGeo = rbox(5.3, 6.6, 1.15, 0.52, 6);
  const p = backGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - p.getX(i) ** 2 * 0.07);
  backGeo.computeVertexNormals();
  g.add(put(solid(backGeo, red, { ink: 0.06 }), 0, -5.35, 3.35, 0.11));
  g.add(put(solid(rbox(0.9, 1.6, 0.5, 0.2), dark, { ink: 0.04 }), 0, -8.9, 3.25));
  g.add(put(solid(new THREE.CylinderGeometry(0.32, 0.38, 3.4, 14), dark, { ink: 0.04 }), 0, -11.7, 0.75));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    g.add(put(solid(rbox(3.0, 0.34, 0.5, 0.15), dark, { ink: 0.03 }), Math.sin(a) * 1.5, -13.5, 0.75 + Math.cos(a) * 1.5, 0, a + Math.PI / 2));
    g.add(put(solid(new THREE.SphereGeometry(0.36, 12, 10), dark, { ink: 0.03 }), Math.sin(a) * 2.9, -14.4, 0.75 + Math.cos(a) * 2.9));
  }
  return g;
}

/** Her headphones, off, lying on the desk (for when she isn't there). */
export function headphonesOff() {
  const g = new THREE.Group(), cream = toon(CREAM);
  g.add(solid(tube([V(-1.3, 0.2, 0), V(-1.15, 1.0, 0), V(0, 1.5, 0), V(1.15, 1.0, 0), V(1.3, 0.2, 0)], 0.085, { segs: 32, radial: 10, squash: 2.3 }), cream, { ink: 0.035 }));
  for (const s of [-1, 1]) {
    const cup = solid(lathe([[0, 0.46], [0.46, 0.46], [0.62, 0.4], [0.7, 0.26], [0.7, 0.08], [0.62, 0], [0, 0]], 30), cream, { ink: 0.04 });
    g.add(put(cup, s * 1.25, 0, 0, 0, 0, -s * Math.PI / 2));
    g.add(put(solid(new THREE.TorusGeometry(0.5, 0.075, 10, 30), toon(RED), { ink: 0 }), s * 1.71, 0, 0, 0, Math.PI / 2));
    g.add(put(solid(new THREE.TorusGeometry(0.5, 0.2, 12, 26), toon('#3b2a2c'), { ink: 0.03 }), s * 1.12, 0, 0, 0, Math.PI / 2));
  }
  return g;
}

