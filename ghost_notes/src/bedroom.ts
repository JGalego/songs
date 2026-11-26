// Her bedroom, 2004, at midnight, in 3D: cel-shaded and inked, in the spirit (and the colours) of the lo-fi
// study-girl streams. Warm under the desk lamp, which casts real shadows; cool where the moon comes through the
// window and lays its panes across the desk; her face lit by the CRT. Outside, a town on a hill (room/town.ts).
// At the desk, her (room/girl.ts). Years later, in the outro, the same room: lamp off, chair empty, her headphones
// on the desk, the monitor still glowing.
//
// Units are the monitor's (the screen is 4 × 3, about 7.5 cm a unit); the origin is the centre of the screen.
import * as THREE from 'three';
import { PIXEL, SANS } from './text';
import { Girl, chair, headphonesOff } from './room/girl';
import { canvas, glow, lathe, loft, picture, put, rbox, rnd, solid, toon, tube } from './room/kit';
import { Town } from './room/town';

export const DESK_Y = -2.175; // top of the desk (where the monitor's stand sits)
const FLOOR_Y = DESK_Y - 10;
const WALL_Z = -6.2;
const CEIL_Y = 22, LEFT_X = -21, RIGHT_X = 27, BACK_Z = 34;
/** The window's opening in the back wall. */
const WIN = { x0: 4.4, x1: 15.2, y0: 0.7, y1: 12.6 };
/** Where she sits (the centre of her head). */
export const GIRL_AT = new THREE.Vector3(1.2, 2.6, 9.6);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export interface RoomState {
  /** The monitor's power, 0..1 (its light on the room). */
  power: number;
  kick: number;
  /** Is she here (2004), or is this years later? */
  girl: boolean;
  /** How much she nods along, 0..1, and the beat she nods to. */
  nod: number;
  beat: number;
  /** Her mouse hand, −1..1 across the pad. */
  mouse: number;
}

export class Bedroom {
  readonly group = new THREE.Group();
  private lamp = new THREE.SpotLight(new THREE.Color('#ffb25e'), 0, 40, 1.0, 0.65, 2);
  private screenLight = new THREE.PointLight(new THREE.Color('#9cc4ff'), 0, 30, 2);
  private moon = new THREE.DirectionalLight(new THREE.Color('#9db6ff'), 0);
  private sky = new THREE.HemisphereLight(new THREE.Color('#8a84dc'), new THREE.Color('#8a5568'), 1);
  private fairy = new THREE.PointLight(new THREE.Color('#ffb070'), 0, 26, 2);
  private fill = new THREE.DirectionalLight(new THREE.Color('#ffc9a0'), 0);
  private town = new Town(WALL_Z - 1.2);
  private girl = new Girl();
  private chair = chair();
  private phones = headphonesOff();
  private cat = new THREE.Group();
  private catEars: THREE.Object3D[] = [];
  private catTail = new THREE.Group();
  private bulbs: { m: THREE.MeshBasicMaterial; c: THREE.Color }[] = [];
  private bulb!: THREE.MeshBasicMaterial;
  private beam!: THREE.Mesh;
  private steam: THREE.Sprite[] = [];
  private mug = new THREE.Group();
  private motes!: THREE.Points;
  private sillPlant!: THREE.Group;

  constructor() {
    const g = this.group;
    this.shell();
    this.window();
    this.desk();
    this.monitor();
    this.lampOnDesk();
    this.clutter();
    this.wall();
    this.furniture();
    this.buildCat();
    g.add(this.town.group);

    this.girl.group.position.copy(GIRL_AT);
    this.chair.position.copy(GIRL_AT);
    put(this.phones, 6.1, DESK_Y + 0.72, 0.3, -0.12, 0.45, 0); // standing on their cups, the band arching up
    g.add(this.girl.group, this.chair, this.phones);

    // ── light
    // the monitor on her face; the moon through the window (it lays the window's panes across the desk and the floor)
    this.screenLight.position.set(0, 0.9, 4.8);
    this.moon.position.set(21.5, 38, -27);
    this.moon.target.position.set(6.5, -2.2, -0.9);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    const sc = this.moon.shadow.camera;
    sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 4; sc.far = 110;
    this.moon.shadow.bias = -0.0012; this.moon.shadow.normalBias = 0.05;
    this.fairy.position.set(-3, 9.5, WALL_Z + 3);
    // a faint warm fill from behind us (the rest of the house), so her back and the chair have some form
    this.fill.position.set(14, 12, 34);
    this.fill.target.position.set(0, -2, 0);
    g.add(this.screenLight, this.moon, this.moon.target, this.sky, this.fairy, this.fill, this.fill.target);
  }

  // ── the room: walls with thickness (they cast shadows), a plank floor, a ceiling to keep the moon out
  private shell() {
    const g = this.group, wall = toon('#bd8468'), wallB = toon('#b27a62');
    const slab = (x0: number, x1: number, y0: number, y1: number) => put(solid(new THREE.BoxGeometry(x1 - x0, y1 - y0, 1.2), wall, { ink: 0 }), (x0 + x1) / 2, (y0 + y1) / 2, WALL_Z - 0.6);
    g.add(slab(LEFT_X - 1, WIN.x0, FLOOR_Y, CEIL_Y), slab(WIN.x1, RIGHT_X + 1, FLOOR_Y, CEIL_Y), slab(WIN.x0, WIN.x1, WIN.y1, CEIL_Y), slab(WIN.x0, WIN.x1, FLOOR_Y, WIN.y0));
    const depth = BACK_Z - WALL_Z;
    g.add(put(solid(new THREE.BoxGeometry(1, CEIL_Y - FLOOR_Y, depth + 2), wallB, { ink: 0 }), LEFT_X - 0.5, (FLOOR_Y + CEIL_Y) / 2, (WALL_Z + BACK_Z) / 2));
    g.add(put(solid(new THREE.BoxGeometry(1, CEIL_Y - FLOOR_Y, depth + 2), wallB, { ink: 0 }), RIGHT_X + 0.5, (FLOOR_Y + CEIL_Y) / 2, (WALL_Z + BACK_Z) / 2));
    g.add(put(solid(new THREE.BoxGeometry(RIGHT_X - LEFT_X + 2, CEIL_Y - FLOOR_Y, 1), wallB, { ink: 0 }), (LEFT_X + RIGHT_X) / 2, (FLOOR_Y + CEIL_Y) / 2, BACK_Z + 0.5));
    g.add(put(solid(new THREE.BoxGeometry(RIGHT_X - LEFT_X + 2, 1, depth + 2), toon('#8a6a66'), { ink: 0 }), (LEFT_X + RIGHT_X) / 2, CEIL_Y + 0.5, (WALL_Z + BACK_Z) / 2));
    // skirting board
    g.add(put(solid(rbox(RIGHT_X - LEFT_X, 0.9, 0.3, 0.1), toon('#e6d6bd'), { ink: 0.03 }), (LEFT_X + RIGHT_X) / 2, FLOOR_Y + 0.45, WALL_Z + 0.15));
    g.add(put(solid(rbox(0.3, 0.9, depth, 0.1), toon('#e6d6bd'), { ink: 0.03 }), LEFT_X + 0.15, FLOOR_Y + 0.45, (WALL_Z + BACK_Z) / 2));
    // floorboards
    const planks = canvas(512, 512, (c, W, H) => {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = ['#8a5a3c', '#946242', '#835437', '#8f5e3f'][(i * 3) % 4];
        c.fillRect(0, (i * H) / 8, W, H / 8);
        c.fillStyle = 'rgba(40,20,10,0.5)'; c.fillRect(0, (i * H) / 8, W, 3);
        c.fillRect(((i * 197) % W), (i * H) / 8, 3, H / 8);
        c.fillStyle = 'rgba(255,220,170,0.05)';
        for (let k = 0; k < 5; k++) c.fillRect(0, (i * H) / 8 + 10 + k * 11, W, 2);
      }
    }, [3.2, 3.2]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RIGHT_X - LEFT_X, depth), toon('#ffffff', { map: planks }));
    floor.receiveShadow = true;
    g.add(put(floor, (LEFT_X + RIGHT_X) / 2, FLOOR_Y, (WALL_Z + BACK_Z) / 2, -Math.PI / 2));
    // a round rug under her chair
    const rings = canvas(512, 512, (c, W) => {
      c.clearRect(0, 0, W, W);
      ['#a8483a', '#e8cfa6', '#c0604a', '#3f6e63', '#e8cfa6', '#a8483a'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(W / 2, W / 2, (W / 2) * (1 - i * 0.16), 0, Math.PI * 2); c.fill(); });
    });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(8.6, 56), toon('#ffffff', { map: rings }));
    rug.receiveShadow = true;
    g.add(put(rug, 2.2, FLOOR_Y + 0.04, 12.5, -Math.PI / 2));
    // the far end of the room (behind us, mostly): a door, a wardrobe
    const door = solid(rbox(8.4, 18.5, 0.5, 0.15), toon('#e2d2b8'), { ink: 0.05 });
    g.add(put(door, -7, FLOOR_Y + 9.25, BACK_Z - 0.3));
    for (const y of [4.6, -4.2]) g.add(put(solid(rbox(6.2, 7.2, 0.2, 0.2), toon('#d6c4a8'), { ink: 0.03 }), -7, FLOOR_Y + 9.25 + y, BACK_Z - 0.62));
    g.add(put(solid(new THREE.SphereGeometry(0.35, 14, 10), toon('#c8a24a'), { ink: 0.03 }), -4, FLOOR_Y + 8.4, BACK_Z - 0.9));
    g.add(put(solid(rbox(11, 20, 4.4, 0.3), toon('#7a4c34'), { ink: 0.06 }), 14, FLOOR_Y + 10, BACK_Z - 2.4));
    for (const x of [11.2, 16.8]) g.add(put(solid(rbox(5.1, 18.6, 0.25, 0.2), toon('#8a583c'), { ink: 0.03 }), x, FLOOR_Y + 10, BACK_Z - 4.7));
  }

  // ── the window: frame, glazing bars, a deep sill, curtains on a rod
  private window() {
    const g = this.group, frame = toon('#eee2ca');
    const w = WIN.x1 - WIN.x0, h = WIN.y1 - WIN.y0, cx = (WIN.x0 + WIN.x1) / 2, cy = (WIN.y0 + WIN.y1) / 2, z = WALL_Z - 0.35;
    g.add(put(solid(rbox(w + 1.0, 0.55, 1.0, 0.12), frame), cx, WIN.y1 + 0.1, z), put(solid(rbox(0.55, h + 0.6, 1.0, 0.12), frame), WIN.x0 - 0.1, cy, z), put(solid(rbox(0.55, h + 0.6, 1.0, 0.12), frame), WIN.x1 + 0.1, cy, z));
    g.add(put(solid(rbox(0.3, h, 0.3, 0.08), frame, { ink: 0.03 }), cx, cy, z), put(solid(rbox(w, 0.3, 0.3, 0.08), frame, { ink: 0.03 }), cx, WIN.y0 + h * 0.6, z));
    g.add(put(solid(rbox(w + 2.2, 0.5, 3.0, 0.16), frame), cx, WIN.y0 - 0.1, WALL_Z + 0.5));
    // the faintest reflections on the glass
    const sheen = canvas(128, 128, (c, W) => {
      c.clearRect(0, 0, W, W);
      const gr = c.createLinearGradient(0, W, W, 0);
      gr.addColorStop(0.3, 'rgba(180,200,255,0)'); gr.addColorStop(0.42, 'rgba(180,200,255,0.10)'); gr.addColorStop(0.5, 'rgba(180,200,255,0)');
      gr.addColorStop(0.62, 'rgba(180,200,255,0.06)'); gr.addColorStop(0.7, 'rgba(180,200,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, W, W);
    });
    g.add(put(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: sheen, transparent: true, depthWrite: false })), cx, cy, z - 0.2));
    // curtains: gathered at the top, falling in folds
    const cloth = toon('#e9d3b0', { side: THREE.DoubleSide });
    const curtain = (x0: number, x1: number) => {
      const geo = new THREE.PlaneGeometry(x1 - x0, 15.6, 28, 12);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), v = 0.5 - y / 15.6; // 0 at the rod, 1 at the hem
        p.setZ(i, Math.sin(x * 4.2 + v * 0.8) * (0.14 + 0.2 * v) + Math.sin(x * 9.1) * 0.04);
        p.setX(i, x * (0.78 + 0.22 * v));
      }
      geo.computeVertexNormals();
      return put(solid(geo, cloth, { ink: 0.04 }), (x0 + x1) / 2, WIN.y1 + 1.3 - 7.8, WALL_Z + 0.75);
    };
    g.add(curtain(WIN.x0 - 2.0, WIN.x0 + 1.5), curtain(WIN.x1 - 1.3, WIN.x1 + 2.2));
    const rod = solid(new THREE.CylinderGeometry(0.13, 0.13, w + 6.4, 10), toon('#6a4630'), { ink: 0.03 });
    g.add(put(rod, cx, WIN.y1 + 1.35, WALL_Z + 0.75, 0, 0, Math.PI / 2));
    for (const s of [-1, 1]) g.add(put(solid(new THREE.SphereGeometry(0.3, 12, 10), toon('#6a4630'), { ink: 0.03 }), cx + s * (w / 2 + 3.2), WIN.y1 + 1.35, WALL_Z + 0.75));
    this.sillPlant = this.plant(0.8);
    g.add(put(this.sillPlant, 7.4, WIN.y0 + 0.15, WALL_Z + 0.7));
  }

  private desk() {
    const g = this.group, wood = toon('#a56c42'), woodD = toon('#8e5a37');
    g.add(put(solid(rbox(24.5, 0.55, 9.6, 0.16), wood, { ink: 0.06 }), 1, DESK_Y - 0.275, -0.55));
    g.add(put(solid(rbox(0.7, 9.6, 8.8, 0.14), woodD, { ink: 0.05 }), -10.6, DESK_Y - 5.3, -0.6));
    g.add(put(solid(rbox(6.4, 9.5, 8.8, 0.16), woodD, { ink: 0.05 }), 9.8, DESK_Y - 5.3, -0.6));
    for (let i = 0; i < 3; i++) {
      g.add(put(solid(rbox(5.6, 2.7, 0.25, 0.14), wood, { ink: 0.035 }), 9.8, DESK_Y - 2.2 - i * 3.05, 3.85));
      g.add(put(solid(new THREE.SphereGeometry(0.22, 12, 10), toon('#d9b56a'), { ink: 0.025 }), 9.8, DESK_Y - 2.2 - i * 3.05, 4.1));
    }
    // keyboard, with its cable; mouse, with its tail, on a pad
    const keys = picture(6.2, 2.1, 620, (c, W, H) => {
      c.fillStyle = '#c9c0ac'; c.fillRect(0, 0, W, H);
      [14, 14, 13, 12, 9].forEach((n, r) => {
        const kw = (W - 40) / 15.5;
        for (let i = 0; i < n; i++) {
          const w = r === 4 && i === 4 ? kw * 5 : kw - 4, x = 20 + i * kw + (r === 4 && i > 4 ? kw * 4 : 0) + r * 4;
          c.fillStyle = '#e2dac8'; c.fillRect(x, 18 + r * 38, w, 32);
          c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(x, 18 + r * 38 + 28, w, 4);
        }
      });
    });
    g.add(put(solid(rbox(6.5, 0.32, 2.4, 0.12), toon('#cfc6b3'), { ink: 0.04 }), 0, DESK_Y + 0.16, 2.9, 0.05), put(keys, 0, DESK_Y + 0.335, 2.9, -Math.PI / 2 + 0.05));
    g.add(solid(tube([V(1.5, DESK_Y + 0.1, 1.75), V(2.2, DESK_Y + 0.05, 0.6), V(1.2, DESK_Y + 0.05, -1.2), V(1.6, DESK_Y + 0.05, -3.4)], 0.05, { segs: 20, radial: 6 }), toon('#bdb4a0'), { ink: 0 }));
    g.add(put(solid(rbox(3.5, 0.08, 2.9, 0.04), toon('#2f6f6a'), { ink: 0.025 }), 4.4, DESK_Y + 0.04, 3.3));
    const mouse = solid(new THREE.SphereGeometry(0.5, 20, 14), toon('#d8cfbc'), { ink: 0.03 });
    g.add(put(mouse, 4.3, DESK_Y + 0.22, 3.35)); mouse.scale.set(0.72, 0.42, 1.12);
    g.add(solid(tube([V(4.3, DESK_Y + 0.12, 2.8), V(4.6, DESK_Y + 0.05, 1.6), V(3.4, DESK_Y + 0.05, 0.2), V(2.6, DESK_Y + 0.05, -3.0)], 0.04, { segs: 20, radial: 6 }), toon('#bdb4a0'), { ink: 0 }));
    // speakers either side of the monitor
    const cone = canvas(190, 320, (c, W, H) => {
      c.fillStyle = '#332a28'; c.fillRect(0, 0, W, H);
      for (const [cy, r] of [[H * 0.27, W * 0.2], [H * 0.66, W * 0.36]] as const) {
        c.fillStyle = '#191313'; c.beginPath(); c.arc(W / 2, cy, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#4c4040'; c.beginPath(); c.arc(W / 2, cy, r * 0.36, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#5a4c4a'; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, cy, r, 0, Math.PI * 2); c.stroke();
      }
    });
    for (const sx of [-4.4, 4.2]) {
      g.add(put(solid(rbox(1.9, 3.2, 1.9, 0.16), toon('#3b302e'), { ink: 0.045 }), sx, DESK_Y + 1.6, -1.7));
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.9), toon('#ffffff', { map: cone }));
      g.add(put(f, sx, DESK_Y + 1.6, -0.74));
    }
  }

  /** The CRT's shell, round the screen that screen.ts draws (a 4 × 3 plane at z = 0.02). */
  private monitor() {
    const g = this.group, beige = toon('#cfc4aa'), beigeD = toon('#bcb096');
    g.add(put(solid(rbox(5.0, 4.05, 0.7, 0.3, 5), beige, { ink: 0.05 }), 0, -0.08, -0.35));
    g.add(put(new THREE.Mesh(rbox(4.3, 3.3, 0.1, 0.12), toon('#2a2826')), 0, 0, -0.038)); // the dark lip round the glass
    // the tube's housing, tapering back
    const back = loft([{ y: 0, rx: 2.35, rz: 1.9, n: 6 }, { y: 0.6, rx: 2.3, rz: 1.86, n: 6 }, { y: 2.2, rx: 1.75, rz: 1.45, n: 5 }, { y: 3.0, rx: 1.45, rz: 1.2, n: 4 }, { y: 3.15, rx: 0.6, rz: 0.5, n: 3 }], 44);
    back.rotateX(-Math.PI / 2);
    g.add(put(solid(back, beigeD, { ink: 0.05 }), 0, -0.08, -0.55));
    // foot
    g.add(put(solid(lathe([[0, 0.5], [0.8, 0.5], [1.0, 0.3], [1.35, 0.12], [1.4, 0], [0, 0]], 28), beigeD, { ink: 0.04 }), 0, DESK_Y, -1.1));
    for (let i = 0; i < 4; i++) g.add(put(solid(rbox(0.22, 0.1, 0.06, 0.03), beigeD, { ink: 0.015, cast: false }), 0.9 + i * 0.34, -1.86, 0.0));
    g.add(put(new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), glow('#7dff8a', 1.6)), 2.25, -1.86, 0.012));
    // sticky notes on the bezel
    const note = (text: string, color: string, x: number, y: number, rot: number) => {
      const n = picture(1.1, 1.1, 120, (c, W, H) => {
        c.fillStyle = color; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, 0, W, 16);
        c.fillStyle = '#2a2a6a'; c.font = `400 30px ${PIXEL}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        text.split('\n').forEach((l, i, a) => c.fillText(l, W / 2, H / 2 + (i - (a.length - 1) / 2) * 30 + 6, W - 12));
      });
      n.castShadow = true;
      g.add(put(n, x, y, 0.04, 0.06, 0, rot));
    };
    note('SAVE\n!!!', '#ffe46b', -2.22, 1.62, 0.12);
    note('kick\non 1', '#ff9ec0', 2.25, 1.66, -0.1);
    note('art hw\nfri', '#9fe3a8', 2.3, -1.35, 0.08);
  }

  /** The desk lamp: a weighted foot, two arms, a bell of a shade; it lights the desk and throws the shadows. */
  private lampOnDesk() {
    const g = this.group, paint = toon('#cf5530'), foot = V(-9.2, DESK_Y, -3.0), elbow = V(-10.2, 4.6, -2.8), head = V(-6.6, 7.4, -1.2), aim = V(-3.0, DESK_Y, 1.6);
    g.add(put(solid(lathe([[0, 0.42], [0.5, 0.42], [1.05, 0.2], [1.15, 0], [0, 0]], 28), paint, { ink: 0.045 }), foot.x, foot.y, foot.z));
    const strut = (a: THREE.Vector3, b: THREE.Vector3) => solid(tube([a, b], 0.12, { segs: 4, radial: 10 }), paint, { ink: 0.035 });
    g.add(strut(foot.clone().add(V(0, 0.4, 0)), elbow), strut(elbow, head));
    for (const p of [elbow, head]) g.add(put(solid(new THREE.SphereGeometry(0.24, 14, 10), toon('#6a4630'), { ink: 0.03 }), p.x, p.y, p.z));
    const dir = aim.clone().sub(head).normalize();
    const shade = new THREE.Group();
    const bell: [number, number][] = [[0.22, 0.05], [0.42, -0.05], [0.8, -0.45], [1.22, -1.05], [1.5, -1.75], [1.56, -1.95]];
    shade.add(solid(lathe(bell, 36), toon('#cf5530', { side: THREE.DoubleSide }), { ink: 0.045 }));
    // the inside of the shade, bright with its own bulb
    this.bulb = glow('#ffe2a8', 2.4);
    shade.add(new THREE.Mesh(lathe(bell.map(([r, y]) => [r * 0.93, y - 0.03] as [number, number]), 36), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb46a'), side: THREE.BackSide })));
    shade.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), this.bulb), 0, -1.25, 0));
    shade.position.copy(head).addScaledVector(dir, 0.1);
    shade.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
    g.add(shade);
    // the light itself
    const at = head.clone().addScaledVector(dir, 1.3);
    this.lamp.position.copy(at);
    this.lamp.target.position.copy(aim);
    this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(1536, 1536);
    this.lamp.shadow.camera.near = 0.6; this.lamp.shadow.camera.far = 42;
    this.lamp.shadow.bias = -0.0015; this.lamp.shadow.normalBias = 0.03;
    g.add(this.lamp, this.lamp.target);
    // the beam, in the dusty air: a soft cone, and motes drifting through it
    const fall = canvas(64, 256, (c, W, H) => {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(255,200,130,0)'); gr.addColorStop(0.12, 'rgba(255,200,130,0.5)'); gr.addColorStop(1, 'rgba(255,200,130,0)');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
    });
    const coneGeo = new THREE.ConeGeometry(6.6, 10.5, 40, 1, true); coneGeo.translate(0, -5.25, 0);
    this.beam = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ map: fall, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.beam.position.copy(at).addScaledVector(dir, -0.9);
    this.beam.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
    g.add(this.beam);
    const N = 70, pos = new Float32Array(N * 3);
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dot = canvas(32, 32, (c, W) => { const gr = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,230,180,1)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); });
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: dot, size: 0.16, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    this.motes.frustumCulled = false;
    this.motes.userData = { at, dir };
    g.add(this.motes);
  }

  /** What's on the desk: tea, CDs (in cases and on a spindle), floppies, pencils, a notebook, a plant. */
  private clutter() {
    const g = this.group;
    // tea, steaming
    const cream = toon('#efe3c6');
    this.mug.add(put(solid(lathe([[0, 0], [0.42, 0], [0.47, 0.1], [0.47, 1.0], [0.4, 1.0], [0.4, 0.14], [0, 0.14]], 24), cream, { ink: 0.04 }), 0, 0, 0));
    this.mug.add(put(solid(new THREE.TorusGeometry(0.27, 0.07, 8, 18), cream, { ink: 0.03 }), 0.5, 0.52, 0));
    this.mug.add(put(new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), toon('#a0603a')), 0, 0.86, 0, -Math.PI / 2));
    this.mug.add(put(solid(new THREE.TorusGeometry(0.475, 0.03, 6, 24), toon('#cf5530'), { ink: 0 }), 0, 0.62, 0, Math.PI / 2));
    g.add(put(this.mug, -3.7, DESK_Y, 2.5, 0, 0.5, 0));
    const puff = canvas(64, 64, (c, W) => { const gr = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,245,230,0.6)'); gr.addColorStop(1, 'rgba(255,245,230,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); });
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0 }));
      this.steam.push(s); g.add(s);
    }
    // a stack of CDs in their cases, a spindle of blanks
    ['#c43c3c', '#2f6fd0', '#e0b030', '#3aa060', '#8a4fc0', '#d06a2a', '#ecebe6', '#27242a'].forEach((hue, i) => {
      g.add(put(solid(rbox(1.55, 0.15, 1.4, 0.03), toon(hue), { ink: 0.02 }), -6.5 + Math.sin(i * 2.1) * 0.07, DESK_Y + 0.08 + i * 0.155, 1.7 + Math.cos(i * 1.7) * 0.06, 0, Math.sin(i * 3.3) * 0.1));
    });
    g.add(put(solid(lathe([[0, 0], [0.95, 0], [0.95, 0.12], [0.86, 0.14], [0.86, 1.5], [0.2, 1.55], [0.12, 1.9], [0, 1.9]], 28), toon('#c9cfd8'), { ink: 0.035 }), -8.3, DESK_Y, 0.5));
    for (let i = 0; i < 6; i++) g.add(put(new THREE.Mesh(new THREE.TorusGeometry(0.865, 0.012, 4, 28), toon('#8d949e')), -8.3, DESK_Y + 0.3 + i * 0.22, 0.5, Math.PI / 2));
    // floppies, by the mouse
    ([['#2f5fa8', 6.9, 0.9, 0.3], ['#c0392b', 7.3, 1.2, -0.5], ['#2b2b30', 6.6, 0.2, 1.1]] as const).forEach(([col, x, z, r], i) => {
      const f = new THREE.Group();
      f.add(solid(rbox(1.2, 0.05, 1.2, 0.02), toon(col), { ink: 0.02 }));
      f.add(put(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), toon('#c9cfd8')), 0.08, 0.03, -0.38, -Math.PI / 2));
      f.add(put(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), toon('#f2ecdc')), 0, 0.03, 0.3, -Math.PI / 2));
      g.add(put(f, x, DESK_Y + 0.03 + i * 0.01, z, 0, r, 0));
    });
    // pencils in a cup
    g.add(put(solid(lathe([[0, 0], [0.5, 0], [0.56, 1.4], [0.5, 1.4], [0.46, 0.1], [0, 0.1]], 20), toon('#3f7a72'), { ink: 0.04 }), -9.9, DESK_Y, 1.7));
    ['#f2c14e', '#e25b45', '#4f8fd8', '#7bc06a', '#f2c14e'].forEach((col, i) => {
      g.add(put(solid(new THREE.CylinderGeometry(0.075, 0.075, 2.5, 6), toon(col), { ink: 0.02 }), -9.9 + (i - 2) * 0.16, DESK_Y + 1.55, 1.7 + ((i * 7) % 3 - 1) * 0.14, ((i % 2) - 0.5) * 0.25, 0, (i - 2) * 0.13));
    });
    // her notebook, open, a pencil across it
    const page = (side: number) => picture(1.9, 2.6, 190, (c, W, H) => {
      c.fillStyle = '#f6f0e0'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(70,90,150,0.35)'; c.lineWidth = 1.5;
      for (let y = 26; y < H - 10; y += 20) { c.beginPath(); c.moveTo(12, y); c.lineTo(W - 12, y); c.stroke(); }
      c.strokeStyle = '#3a3550'; c.lineWidth = 2.2;
      for (let l = 0; l < (side < 0 ? 9 : 4); l++) { // her handwriting: drum patterns, mostly
        c.beginPath();
        for (let x = 16; x < W - 20 - rnd(l * 3 + side) * 60; x += 4) c.lineTo(x, 22 + l * 20 + Math.sin(x * 0.7 + l) * 3 * rnd(x + l));
        c.stroke();
      }
      if (side > 0) for (let s = 0; s < 16; s++) { c.fillStyle = [0, 3, 8, 10].includes(s) ? '#e0453a' : 'rgba(60,60,90,0.25)'; c.fillRect(14 + s * 10.2, 128, 7, 12); }
    });
    const book = new THREE.Group();
    book.add(solid(rbox(4.1, 0.16, 2.8, 0.05), toon('#35507a'), { ink: 0.03 }));
    book.add(put(page(-1), -0.98, 0.1, 0, -Math.PI / 2, 0, 0), put(page(1), 0.98, 0.1, 0, -Math.PI / 2, 0, 0));
    const pencil = new THREE.Group();
    pencil.add(put(solid(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 6), toon('#f2c14e'), { ink: 0.02 }), 0, 0, 0, 0, 0, Math.PI / 2));
    pencil.add(put(solid(new THREE.ConeGeometry(0.07, 0.26, 6), toon('#e8d2a8'), { ink: 0.015 }), 1.08, 0, 0, 0, 0, -Math.PI / 2));
    book.add(put(pencil, 0.5, 0.2, 0.3, 0, 0.5, 0));
    g.add(put(book, 8.4, DESK_Y + 0.08, 1.4, 0, -0.18, 0));
    // books under the window, a plant by the lamp
    ([['#b8463a', 3.2, 0], ['#e0d6c0', 3.0, 0.2], ['#3f6aa8', 2.7, -0.12]] as const).forEach(([col, w, r], i) => g.add(put(solid(rbox(w, 0.5, 2.2, 0.08), toon(col), { ink: 0.035 }), 11.2, DESK_Y + 0.25 + i * 0.5, -3.2, 0, r, 0)));
    g.add(put(this.plant(1.25), -10.4, DESK_Y, -3.2));
  }

  /** The wall above the desk: a shelf (books, a trailing plant, a globe), a gig poster, the calendar, photos, lights. */
  private wall() {
    const g = this.group, z = WALL_Z;
    // shelf
    g.add(put(solid(rbox(8.6, 0.35, 2.2, 0.1), toon('#8e5a37'), { ink: 0.045 }), -0.9, 5.4, z + 1.1));
    for (const x of [-4.4, 2.2]) g.add(put(solid(rbox(0.25, 1.3, 1.6, 0.08), toon('#6a4630'), { ink: 0.03 }), x, 4.7, z + 0.85));
    let bx = -4.9;
    ['#b8463a', '#3f6aa8', '#d9a441', '#4b8a5e', '#7a4f9a', '#e0d6c0', '#d97a8a'].forEach((col, i) => {
      const w = 0.42 + (i % 3) * 0.12, h = 2.3 + ((i * 5) % 4) * 0.32, lean = i === 6 ? 0.32 : 0;
      g.add(put(solid(rbox(w, h, 1.7, 0.05), toon(col), { ink: 0.03 }), bx + w / 2 + lean * 1.1, 5.58 + h / 2 - lean * 0.3, z + 1.1, 0, 0, -lean));
      bx += w + 0.05;
    });
    // a little globe, and a pothos trailing off the end
    g.add(put(solid(new THREE.SphereGeometry(0.62, 20, 14), toon('#4f8fb8'), { ink: 0.035 }), 0.2, 6.5, z + 1.2), put(solid(lathe([[0, 0], [0.5, 0], [0.4, 0.2], [0.1, 0.28], [0, 0.28]], 16), toon('#6a4630'), { ink: 0.03 }), 0.2, 5.58, z + 1.2));
    const pot = put(this.plant(0.95), 2.2, 5.58, z + 1.2);
    g.add(pot);
    const leafGeo = new THREE.SphereGeometry(0.3, 10, 8), leafA = toon('#5f9a4e'), leafB = toon('#7fb85e');
    for (let v = 0; v < 3; v++) {
      const pts = [V(2.3 + v * 0.3, 6.2, z + 1.7), V(2.75 + v * 0.42, 5.6, z + 2.2), V(2.95 + v * 0.45, 4.0 - v * 0.4, z + 2.25), V(2.8 + v * 0.5, 2.6 - v * 0.9, z + 2.1)];
      g.add(solid(tube(pts, 0.04, { segs: 18, radial: 5 }), toon('#4a7a40'), { ink: 0 }));
      const curve = new THREE.CatmullRomCurve3(pts);
      for (let i = 1; i < 7; i++) {
        const p = curve.getPoint(i / 7), l = solid(leafGeo, i % 2 ? leafA : leafB, { ink: 0.03 });
        g.add(put(l, p.x + (i % 2 ? 0.22 : -0.22), p.y, p.z + 0.1, 0.4, 0, i % 2 ? -0.7 : 0.7));
        l.scale.set(1, 0.3, 0.7);
      }
    }
    // a gig poster
    const poster = picture(6.4, 9, 512, (c, W, H) => {
      c.fillStyle = '#243a5e'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 7; i++) { c.fillStyle = ['#ff6b5b', '#ffd25b', '#5be0c0', '#b07bff'][i % 4]; c.beginPath(); c.arc(W * 0.5, H * 0.37, W * (0.42 - i * 0.055), 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#f4efe2'; c.font = `800 68px ${SANS}`; c.textAlign = 'center';
      c.fillText('BASEMENT', W / 2, H * 0.74, W - 30);
      c.font = `800 48px ${SANS}`; c.fillText('SHOW · SAT', W / 2, H * 0.82, W - 30);
      c.font = `600 30px ${SANS}`; c.fillStyle = '#ffd25b'; c.fillText('all ages · $5 · bring a friend', W / 2, H * 0.9, W - 30);
    });
    g.add(put(poster, -14.6, 5.2, z + 0.03, 0, 0, 0.025));
    // the calendar: March 2004, the 13th circled
    const cal = picture(3.4, 4.4, 360, (c, W, H) => {
      c.fillStyle = '#f2efe6'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#6aa0c8'; c.fillRect(0, 0, W, H * 0.36);
      c.fillStyle = '#fff'; c.font = `800 44px ${SANS}`; c.textAlign = 'center'; c.fillText('MARCH 2004', W / 2, H * 0.27, W - 20);
      c.font = `500 20px ${SANS}`; c.fillStyle = '#333';
      for (let d = 1; d <= 31; d++) {
        const col = d % 7, row = Math.floor(d / 7); // March 1st 2004 was a Monday
        const x = 30 + col * ((W - 60) / 6.5), y = H * 0.48 + row * 46;
        c.fillText(String(d), x, y);
        if (d === 13) { c.strokeStyle = '#e0453a'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, y - 7, 22, 18, -0.2, 0, Math.PI * 2); c.stroke(); }
      }
    });
    g.add(put(cal, -6.6, 2.2, z + 0.03, 0, 0, -0.02));
    // photos, taped up above the shelf
    ([['#e8a46a', -3.9, 9.6, -0.08], ['#7fb2d9', -2.2, 10.5, 0.06], ['#d97a8a', -0.6, 9.4, -0.04], ['#9cc78a', 1.0, 10.3, 0.1], ['#c9a0d8', 2.6, 9.3, -0.07]] as const).forEach(([col, x, y, r], i) => {
      const ph = picture(1.5, 1.8, 150, (c, W, H) => {
        c.fillStyle = '#f6f2ea'; c.fillRect(0, 0, W, H);
        c.fillStyle = col; c.fillRect(10, 10, W - 20, H - 46);
        // a little landscape: a sun, two hills
        c.save(); c.beginPath(); c.rect(10, 10, W - 20, H - 46); c.clip();
        c.fillStyle = 'rgba(255,250,235,0.75)'; c.beginPath(); c.arc(W * (0.3 + i * 0.1), H * 0.26, 13, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(40,30,60,0.3)'; c.beginPath(); c.arc(W * 0.25, H * 0.95, 70, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(40,30,60,0.45)'; c.beginPath(); c.arc(W * 0.85, H * 1.0, 80, 0, Math.PI * 2); c.fill();
        c.restore();
        c.fillStyle = 'rgba(240,225,170,0.85)'; c.fillRect(W / 2 - 20, 0, 40, 11);
      });
      g.add(put(ph, x, y, z + 0.03, 0, 0, r));
    });
    // fairy lights: strung high across the wall, and along the front of the shelf
    const strings: [THREE.Vector3[], number][] = [
      [[V(LEFT_X + 0.5, 13.6, z + 0.3), V(-12, 12.3, z + 0.35), V(-4, 13.3, z + 0.35), V(2.5, 12.6, z + 0.35), V(WIN.x0 - 2.6, 14.1, z + 0.6)], 22],
      [[V(-5.2, 5.25, z + 2.25), V(-3.2, 4.85, z + 2.3), V(-1, 5.05, z + 2.3), V(1.2, 4.8, z + 2.3), V(3.4, 5.25, z + 2.25)], 10],
    ];
    const bulbGeo = new THREE.SphereGeometry(0.15, 8, 6);
    strings.forEach(([pts, n]) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.022, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#1c1214') })));
      for (let i = 0; i < n; i++) {
        const c = new THREE.Color(['#ffcf7a', '#ff8f6b', '#ffe9a8', '#8fd0ff'][(i + n) % 4]), m = new THREE.MeshBasicMaterial({ color: c.clone() });
        const p = curve.getPoint((i + 0.5) / n);
        g.add(put(new THREE.Mesh(bulbGeo, m), p.x, p.y - 0.14, p.z));
        this.bulbs.push({ m, c });
      }
    });
  }

  /** The bookshelf, the PC under it all, and her bed with a ghost on the pillow. */
  private furniture() {
    const g = this.group, wood = toon('#7a4a30');
    // bookshelf, in the corner by the window
    const sx = 21.6, sz = WALL_Z + 1.7;
    g.add(put(solid(rbox(7.6, 24, 3.2, 0.14), wood, { ink: 0.05 }), sx, FLOOR_Y + 12, sz - 0.1));
    const books: { m: THREE.Matrix4; c: THREE.Color }[] = [], d = new THREE.Object3D();
    for (let s = 0; s < 6; s++) {
      const y = FLOOR_Y + 1.2 + s * 3.9;
      g.add(put(solid(rbox(7.0, 3.5, 0.4, 0.1), toon('#4a2a1c'), { ink: 0, cast: false }), sx, y + 1.75, sz + 1.3)); // the shadowed back of each shelf
      for (let x = sx - 3.3, k = 0; x < sx + 3.0; k++) {
        const w = 0.34 + ((k * 7 + s * 3) % 5) * 0.1, h = 2.1 + ((k * 5 + s) % 4) * 0.34;
        if ((k + s * 2) % 9 !== 7) {
          d.position.set(x + w / 2, y + h / 2, sz + 1.05); d.scale.set(w, h, 1.6); d.rotation.set(0, 0, (k + s) % 8 === 5 ? 0.14 : 0); d.updateMatrix();
          books.push({ m: d.matrix.clone(), c: new THREE.Color(['#b8463a', '#3f6aa8', '#d9a441', '#4b8a5e', '#7a4f9a', '#e0d6c0', '#2f3a4a', '#c26a3a', '#d97a8a'][(k * 3 + s * 5) % 9]) });
        }
        x += w + 0.05;
      }
    }
    const spines = new THREE.InstancedMesh(rbox(1, 1, 1, 0.06, 1), toon('#ffffff'), books.length);
    books.forEach((b, i) => { spines.setMatrixAt(i, b.m); spines.setColorAt(i, b.c); });
    spines.castShadow = spines.receiveShadow = true;
    g.add(spines);
    // the PC: a beige tower on the floor, its power light on
    const pc = new THREE.Group();
    pc.add(solid(rbox(2.8, 6.2, 6.4, 0.16), toon('#958c78'), { ink: 0.05 }));
    for (const y of [2.2, 1.4]) pc.add(put(solid(rbox(2.1, 0.55, 0.1, 0.05), toon('#857c6a'), { ink: 0.02, cast: false }), 0, y, 3.22));
    pc.add(put(solid(rbox(1.3, 0.2, 0.1, 0.04), toon('#756d5c'), { ink: 0.015, cast: false }), -0.3, 0.6, 3.22));
    pc.add(put(new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), glow('#7dff8a', 1.8)), 0.8, -0.4, 3.24));
    pc.add(put(solid(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), toon('#857c6a'), { ink: 0.02, cast: false }), 0.2, -0.4, 3.22, Math.PI / 2));
    g.add(put(pc, -7.8, FLOOR_Y + 3.1, -1.9));
    // her bed, along the left wall
    const bx = -15.4, bz = 13.5;
    g.add(put(solid(rbox(10.6, 2.2, 24.6, 0.25), wood, { ink: 0.06 }), bx, FLOOR_Y + 1.5, bz));
    g.add(put(solid(rbox(10.6, 7, 0.7, 0.3), wood, { ink: 0.06 }), bx, FLOOR_Y + 4.4, bz - 12.2));
    g.add(put(solid(rbox(10.0, 1.9, 23.6, 0.7, 5), toon('#cbbfb0'), { ink: 0.05 }), bx, FLOOR_Y + 3.4, bz));
    g.add(put(solid(rbox(10.5, 1.5, 16.5, 0.65, 5), toon('#4f8484'), { ink: 0.06 }), bx + 0.1, FLOOR_Y + 4.3, bz + 3.6, 0, 0.02, 0));
    g.add(put(solid(rbox(10.4, 0.7, 2.6, 0.3, 4), toon('#d6cbbc'), { ink: 0.04 }), bx + 0.1, FLOOR_Y + 5.0, bz - 4.2, 0.05, 0.03, 0));
    g.add(put(solid(rbox(6.6, 1.5, 3.8, 0.7, 5), toon('#ddd3c4'), { ink: 0.05 }), bx, FLOOR_Y + 5.0, bz - 9.6, 0.12, 0.06, 0));
    // the ghost: a plush of the thing on her screen
    const ghost = new THREE.Group(), plush = toon('#ffab45');
    ghost.add(solid(lathe([[0, 0], [0.9, 0], [1.0, 0.3], [1.0, 1.2], [0.86, 1.75], [0.5, 2.1], [0, 2.2]], 28), plush, { ink: 0.045 }));
    for (const s of [-1, 1]) ghost.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toon('#2a1a10')), s * 0.34, 1.35, 0.9).translateZ(0));
    const leaf = solid(new THREE.SphereGeometry(0.3, 10, 8), toon('#7fd36a'), { ink: 0.03 });
    ghost.add(put(leaf, 0.28, 2.3, 0, 0, 0, -0.6)); leaf.scale.set(1.3, 0.35, 0.7);
    g.add(put(ghost, bx + 1.2, FLOOR_Y + 5.6, bz - 8.6, -0.25, 0.6, 0.12));
  }

  /** A potted plant: a terracotta pot and a crown of leaves on stems. */
  private plant(s: number) {
    const p = new THREE.Group();
    p.add(solid(lathe([[0, 0], [0.52, 0], [0.72, 1.0], [0.8, 1.0], [0.8, 1.16], [0.62, 1.16], [0.6, 1.02], [0, 1.02]], 20), toon('#c4673f'), { ink: 0.04 }));
    const geo = new THREE.SphereGeometry(0.5, 12, 8), a = toon('#5f9a4e'), b = toon('#7fb85e');
    for (let i = 0; i < 11; i++) {
      const ang = i * 2.4, up = 1.5 + (i % 4) * 0.42, out = 0.35 + (i % 3) * 0.28;
      const l = solid(geo, i % 2 ? a : b, { ink: 0.035 });
      p.add(put(l, Math.cos(ang) * out, up, Math.sin(ang) * out, 0.35 * Math.sin(ang), -ang, 0.55));
      l.scale.set(1.15, 0.24, 0.6);
    }
    p.scale.setScalar(s);
    return p;
  }

  /** An orange tabby asleep on the sill: curled, chin on its paws, tail wrapped round. */
  private buildCat() {
    const c = this.cat, orange = '#e58432', dark = '#b9571f';
    const fur = canvas(64, 256, (cx, W, H) => {
      cx.fillStyle = orange; cx.fillRect(0, 0, W, H);
      cx.fillStyle = dark;
      for (let i = 1; i < 12; i++) cx.fillRect(0, (i / 12) * H - 4 + ((i * 7) % 5), W, 7 + (i % 3) * 3);
    });
    const striped = toon('#ffffff', { map: fur }), plain = toon(orange), cream = toon('#f6dfc0'), add = (m: THREE.Object3D) => { c.add(m); return m; };
    const bodyGeo = new THREE.SphereGeometry(1, 40, 28); bodyGeo.rotateZ(Math.PI / 2); // poles along the spine: the stripes run across the back
    const body = solid(bodyGeo, striped, { ink: 0.035 });
    add(put(body, 0.1, 0.72, 0)); body.scale.set(1.55, 0.78, 1.05);
    const haunch = solid(new THREE.SphereGeometry(0.88, 28, 20), plain, { ink: 0.035 });
    add(put(haunch, 0.95, 0.7, 0.12)); haunch.scale.set(1, 0.92, 1.05);
    // head: resting on the front paws, a soft wedge with cheeks
    const head = new THREE.Group();
    const skull = solid(new THREE.SphereGeometry(0.62, 30, 22), plain, { ink: 0.035 });
    skull.scale.set(1.05, 0.88, 1); head.add(skull);
    const muzzle = solid(new THREE.SphereGeometry(0.3, 18, 14), cream, { ink: 0.02 });
    head.add(put(muzzle, 0, -0.16, 0.46)); muzzle.scale.set(1.25, 0.7, 0.8);
    head.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon('#e58a84')), 0, -0.07, 0.7));
    for (const s of [-1, 1]) {
      // eyes shut: two small downward arcs
      head.add(solid(tube([V(s * 0.16, 0.06, 0.57), V(s * 0.28, 0.0, 0.54), V(s * 0.4, 0.07, 0.47)], 0.022, { segs: 8, radial: 5 }), toon('#3a2010'), { ink: 0, cast: false }));
      const ear = new THREE.Group();
      ear.add(solid(new THREE.ConeGeometry(0.24, 0.44, 20), plain, { ink: 0.025 }));
      ear.add(put(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 16), toon('#f0a69a')), 0, -0.03, 0.07));
      head.add(put(ear, s * 0.36, 0.5, 0.02, 0.1, 0, -s * 0.38));
      this.catEars.push(ear);
    }
    add(put(head, -1.3, 0.56, 0.42, 0.15, -0.5, 0.1));
    for (const dz of [0, 0.42]) {
      const paw = solid(new THREE.SphereGeometry(0.24, 16, 12), cream, { ink: 0.02 });
      add(put(paw, -1.25 + dz * 0.5, 0.15, 0.8 + dz * 0.3)); paw.scale.set(1.6, 0.7, 1);
    }
    // the tail, round the front; its tip twitches when it dreams
    add(solid(tube([V(1.6, 0.4, -0.3), V(1.75, 0.24, 0.7), V(0.9, 0.2, 1.22), V(0.0, 0.2, 1.26)], (u) => 0.21 - 0.03 * u, { segs: 20, radial: 10 }), toon(dark), { ink: 0.025 }));
    this.catTail.position.set(0, 0.2, 1.26);
    this.catTail.add(solid(tube([V(0, 0, 0), V(-0.45, 0.02, -0.02), V(-0.85, 0.06, -0.1)], (u) => 0.18 - 0.08 * u, { segs: 10, radial: 10 }), plain, { ink: 0.025 }));
    add(this.catTail);
    put(c, 11.9, WIN.y0 + 0.15, WALL_Z + 0.75, 0, 0.1, 0);
    c.scale.setScalar(1.25);
    this.group.add(c);
  }

  update(t: number, o: RoomState) {
    const here = o.girl;
    // light: the lamp is hers; years later it's the moon and the monitor
    this.lamp.intensity = here ? 250 * (0.97 + 0.03 * Math.sin(t * 2.3)) : 0;
    this.bulb.color.set('#ffe2a8').multiplyScalar(here ? 2.4 : 0.12);
    this.beam.visible = this.motes.visible = here;
    this.screenLight.intensity = 20 * o.power * (0.92 + o.kick * 0.2 + 0.04 * Math.sin(t * 13));
    this.moon.intensity = here ? 2.2 : 4.4;
    this.sky.intensity = here ? 2.1 : 2.5;
    this.fairy.intensity = here ? 26 : 0;
    this.fill.intensity = here ? 0.7 : 0.55;
    this.bulbs.forEach(({ m, c }, i) => m.color.copy(c).multiplyScalar(here ? (0.75 + 0.25 * Math.sin(t * (0.8 + (i % 5) * 0.3) + i)) * 1.7 : 0.1));

    // her, or her absence
    this.girl.group.visible = here;
    this.phones.visible = !here;
    this.mug.visible = here;
    this.cat.visible = here;
    this.sillPlant.scale.setScalar(here ? 0.8 : 1.15); // it grew
    this.chair.rotation.y = here ? 0 : -0.7;
    this.chair.position.set(GIRL_AT.x + (here ? 0 : 2.4), GIRL_AT.y, GIRL_AT.z + (here ? 0 : 2.2));
    if (here) this.girl.update(t, { nod: o.nod, beat: o.beat, mouse: o.mouse });

    // the cat breathes; an ear flicks, the tail tip twitches, now and then
    this.cat.scale.set(1.25, 1.25 * (1 + 0.03 * Math.sin(t * 1.3)), 1.25);
    const flick = (period: number, at: number) => { const k = (t % period) - at; return k > 0 && k < 0.35 ? Math.sin((k / 0.35) * Math.PI * 2) : 0; };
    this.catEars[0].rotation.z = 0.38 + 0.3 * flick(7.3, 3.1);
    this.catEars[1].rotation.z = -0.38 - 0.25 * flick(11.1, 6.4);
    this.catTail.rotation.y = 0.5 * flick(5.7, 2.2);

    // steam off the tea
    this.steam.forEach((s, i) => {
      const k = (t * 0.33 + i / this.steam.length) % 1;
      s.position.set(-3.7 + Math.sin(t * 1.1 + i * 2) * 0.3 * k, DESK_Y + 1.05 + k * 2.6, 2.5);
      s.scale.setScalar(0.45 + k * 1.2);
      s.visible = here;
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(k * Math.PI) * 0.3;
    });
    // dust in the lamp's beam: each mote on its own slow loop, all a pure function of t
    const { at, dir } = this.motes.userData as { at: THREE.Vector3; dir: THREE.Vector3 };
    const pos = this.motes.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const d = 1 + ((rnd(i * 3.1) + t * (0.012 + rnd(i * 5.3) * 0.02)) % 1) * 8.5, a = rnd(i * 7.7) * Math.PI * 2 + t * 0.07 * (rnd(i) - 0.5), r = Math.sqrt(rnd(i * 9.1)) * d * 0.55;
      pos.setXYZ(i, at.x + dir.x * d + Math.cos(a) * r, at.y + dir.y * d + Math.sin(t * 0.3 + i) * 0.12, at.z + dir.z * d + Math.sin(a) * r);
    }
    pos.needsUpdate = true;
    this.town.update(t);
  }
}
