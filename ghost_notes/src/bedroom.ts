// Her bedroom, 2004, at midnight: cosy and cluttered, warm under the desk lamp, cool through the window. Toon-shaded
// with ink outlines so it reads like an illustration (in the spirit of the lo-fi study-girl streams, and its
// colours: the green sweater, the coral scarf, cream headphones, the red chair, an orange cat). The desk holds the beige CRT, the keyboard and mouse, speakers, CDs, a mug that steams, a pencil
// cup and a plant; on the wall a gig poster, a calendar open at March 2004, photos and fairy lights; a big window onto
// a hillside town at night with a cat asleep on the sill; a bookshelf. And her, from behind, headphones on.
// Units are the monitor's (the screen is 4 × 3, about 7.5 cm a unit); the origin is the centre of the screen.
import * as THREE from 'three';
import { CanvasTex, PIXEL, SANS } from './text';

export const DESK_Y = -2.175; // top of the desk (where the monitor's stand sits)
const FLOOR_Y = DESK_Y - 10;
const WALL_Z = -6.2;
/** Where she sits (her head). */
export const GIRL_AT = new THREE.Vector3(1.2, 2.6, 9.6);

// ── toon shading and ink
const RAMP = (() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();
const toon = (color: string, map?: THREE.Texture) =>
  new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: RAMP, ...(map ? { map } : {}) });
const INK = new THREE.MeshBasicMaterial({ color: new THREE.Color('#1c1210'), side: THREE.BackSide });

/** Gives a mesh an ink outline about `w` units thick (a slightly bigger copy, back faces only). */
function ink<T extends THREE.Mesh>(m: T, w = 0.07): T {
  m.geometry.computeBoundingBox();
  const s = new THREE.Vector3();
  m.geometry.boundingBox!.getSize(s);
  const o = new THREE.Mesh(m.geometry, INK);
  o.scale.set(1 + (2 * w) / Math.max(s.x, 0.05), 1 + (2 * w) / Math.max(s.y, 0.05), 1 + (2 * w) / Math.max(s.z, 0.05));
  m.add(o);
  return m;
}

/** Ink for smooth shapes: the same surface pushed out along its normals, back faces only. */
const inkFor = (w: number) => new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { uW: { value: w } },
  vertexShader: 'uniform float uW; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW, 1.0); }',
  fragmentShader: 'void main() { gl_FragColor = vec4(0.012, 0.007, 0.006, 1.0); }',
});
function outline<T extends THREE.Mesh>(m: T, w = 0.06): T {
  m.add(new THREE.Mesh(m.geometry, inkFor(w)));
  return m;
}

/** A tube along a smooth curve through `pts`, tapering from radius r0 to r1 (hair, arms). */
function taperTube(pts: THREE.Vector3[], r0: number, r1: number, segs = 32, radial = 16) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    const u = i / segs, r = r0 + (r1 - r0) * u * u * (0.6 + 0.4 * u) / 1;
    const round = Math.min(1, Math.sin(Math.min(1, u * 8) * Math.PI / 2) * 0.35 + 0.65); // a rounded root
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r * round).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, line = 0.07) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return line > 0 ? ink(m, line) : m;
}

function canvasTex(pxW: number, pxH: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void) {
  const tex = new CanvasTex(pxW, pxH);
  tex.draw('once', (c) => draw(c, pxW, pxH));
  return tex.texture;
}

/** A flat picture (on a wall, a desk), drawn once on a canvas. `glow` pictures ignore the lights. */
function picture(w: number, h: number, pxW: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, glow = false) {
  const map = canvasTex(pxW, Math.round((pxW * h) / w), draw);
  const mat = glow ? new THREE.MeshBasicMaterial({ map }) : toon('#ffffff', map);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

export class Bedroom {
  readonly group = new THREE.Group();
  private screenLight = new THREE.PointLight(new THREE.Color('#9fc0ff'), 0, 0, 2);
  private lampLight = new THREE.PointLight(new THREE.Color('#ffb066'), 0, 0, 2);
  private fill = new THREE.PointLight(new THREE.Color('#ff9a60'), 0, 0, 2);
  private ambient = new THREE.AmbientLight(new THREE.Color('#5a4048'), 0.85);
  private moon = new THREE.DirectionalLight(new THREE.Color('#7f9de0'), 0.5);
  private bulbs: { m: THREE.Mesh; c: THREE.Color }[] = [];
  private girl = new THREE.Group();
  private cat = new THREE.Group();
  private steam: THREE.Sprite[] = [];

  constructor() {
    const g = this.group;
    this.screenLight.position.set(0, 0.2, 3.2);
    this.moon.position.set(10, 8, -20);
    this.moon.target.position.set(0, -4, 8);
    this.fill.position.set(-2, 9, 14);
    g.add(this.screenLight, this.lampLight, this.fill, this.ambient, this.moon, this.moon.target);

    // ── the room: warm walls, a wooden floor, a rug
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), toon('#6a432e'));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y;
    const rug = new THREE.Mesh(new THREE.CircleGeometry(9, 40), toon('#9c4a3c'));
    rug.rotation.x = -Math.PI / 2; rug.position.set(1, FLOOR_Y + 0.02, 12); rug.scale.set(1.3, 1, 1);
    // the back wall, with a real hole where the window is (x 4.6..14.4, y 0.3..11.6)
    const wallMat = toon('#b9785a');
    const wall = new THREE.Group();
    const piece = (x0: number, x1: number, y0: number, y1: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), wallMat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, WALL_Z);
      wall.add(m);
    };
    piece(-45, 4.6, FLOOR_Y, FLOOR_Y + 60); piece(14.4, 45, FLOOR_Y, FLOOR_Y + 60);
    piece(4.6, 14.4, 11.6, FLOOR_Y + 60); piece(4.6, 14.4, FLOOR_Y, 0.3);
    // the window's reveal: the wall has thickness
    g.add(box(9.8, 0.2, 1.2, wallMat, 9.5, 11.7, WALL_Z - 0.6, 0), box(0.2, 11.4, 1.2, wallMat, 4.5, 6, WALL_Z - 0.6, 0), box(0.2, 11.4, 1.2, wallMat, 14.5, 6, WALL_Z - 0.6, 0));
    g.add(this.town());
    const side = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), toon('#a86a4f'));
    side.rotation.y = Math.PI / 2; side.position.set(-17, FLOOR_Y + 30, 30);
    g.add(floor, rug, wall, side);

    // ── the window, a hillside town at night, the sill and a cat asleep on it
    const frameMat = toon('#e9dcc4');
    g.add(
      box(10.3, 0.5, 0.5, frameMat, 9.5, 11.6, WALL_Z + 0.2), box(0.5, 11.4, 0.5, frameMat, 4.6, 6, WALL_Z + 0.2),
      box(0.5, 11.4, 0.5, frameMat, 14.4, 6, WALL_Z + 0.2), box(0.25, 11, 0.3, frameMat, 9.5, 6, WALL_Z + 0.15, 0.04),
      box(9.6, 0.25, 0.3, frameMat, 9.5, 7.2, WALL_Z + 0.15, 0.04),
      box(11, 0.5, 2.2, frameMat, 9.5, 0.3, WALL_Z + 1.0));
    this.buildCat();
    this.cat.position.set(11.4, 0.55, WALL_Z + 1.1);
    this.cat.scale.setScalar(1.3);
    g.add(this.cat);
    g.add(this.plant(6.6, 0.55, WALL_Z + 1.0, 0.7)); // a small plant on the sill

    // ── the desk
    const wood = toon('#8a5634');
    g.add(box(24, 0.5, 9.5, wood, 1, DESK_Y - 0.25, -0.6));
    g.add(box(0.6, 10, 9, wood, -10.7, DESK_Y - 5.2, -0.6), box(0.6, 10, 9, wood, 12.7, DESK_Y - 5.2, -0.6));
    g.add(box(6, 4, 8.6, toon('#7a4a2c'), 9.4, DESK_Y - 2.6, -0.6));

    // the computer keyboard, the mouse on its pad
    const keysTop = picture(6.2, 2.1, 620, (c, W, H) => {
      c.fillStyle = '#d6cfbf'; c.fillRect(0, 0, W, H);
      [14, 14, 13, 12, 9].forEach((n, r) => {
        const kw = (W - 40) / 15.5;
        for (let i = 0; i < n; i++) {
          const w = r === 4 && i === 4 ? kw * 5 : kw - 4;
          const x = 20 + i * kw + (r === 4 && i > 4 ? kw * 4 : 0) + r * 4;
          c.fillStyle = '#ece6d9'; c.fillRect(x, 18 + r * 38, w, 32);
          c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(x, 18 + r * 38 + 28, w, 4);
        }
      });
    });
    keysTop.rotation.x = -Math.PI / 2 + 0.08;
    keysTop.position.set(0, DESK_Y + 0.27, 2.9);
    g.add(box(6.3, 0.25, 2.2, toon('#c9c1b0'), 0, DESK_Y + 0.12, 2.9, 0.05), keysTop);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), toon('#2e5a5e'));
    pad.rotation.x = -Math.PI / 2; pad.position.set(4.4, DESK_Y + 0.01, 3.2);
    const mouse = ink(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), toon('#d4ccbb')), 0.04);
    mouse.scale.set(0.75, 0.38, 1.1); mouse.position.set(4.3, DESK_Y + 0.18, 3.3);
    g.add(pad, mouse);

    // speakers
    const cone = canvasTex(170, 280, (c, W, H) => {
      c.fillStyle = '#2b2622'; c.fillRect(0, 0, W, H);
      for (const [cy, r] of [[H * 0.3, W * 0.22], [H * 0.68, W * 0.36]] as const) {
        c.fillStyle = '#16120f'; c.beginPath(); c.arc(W / 2, cy, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#4a403a'; c.beginPath(); c.arc(W / 2, cy, r * 0.35, 0, Math.PI * 2); c.fill();
      }
    });
    for (const sx of [-4.3, 4.3]) {
      g.add(box(1.8, 3, 1.8, toon('#3a302a'), sx, DESK_Y + 1.5, -1.4));
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.8), toon('#ffffff', cone));
      f.position.set(sx, DESK_Y + 1.5, -0.49);
      g.add(f);
    }

    // the desk lamp: warm, bent low over the desk
    const brass = toon('#c8643a');
    const lampBase = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.3, 20), brass));
    lampBase.position.set(-9.6, DESK_Y + 0.15, -2.2);
    const arm1 = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.2, 8), brass), 0.04);
    arm1.position.set(-9.0, DESK_Y + 3.1, -2.2); arm1.rotation.z = -0.25;
    const arm2 = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.6, 8), brass), 0.04);
    arm2.position.set(-6.9, DESK_Y + 6.4, -1.2); arm2.rotation.set(0.3, 0, -1.15);
    const shade = ink(new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.9, 24, 1, true), toon('#d9693d')), 0.06);
    (shade.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
    shade.position.set(-4.9, DESK_Y + 6.2, -0.2); shade.rotation.z = 0.55;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff0c0').multiplyScalar(2.2) }));
    bulb.position.set(-4.5, DESK_Y + 5.55, -0.2);
    this.lampLight.position.set(-4.6, DESK_Y + 4.6, 0.6);
    g.add(lampBase, arm1, arm2, shade, bulb);

    // CDs, a mug of tea (steaming), a pencil cup, notebooks, a plant
    for (let i = 0; i < 9; i++) {
      const hue = ['#c43c3c', '#2f6fd0', '#e0b030', '#3aa060', '#8a4fc0', '#d06a2a', '#e8e8e8', '#202020', '#c04a90'][i];
      const cd = box(1.5, 0.14, 1.35, toon(hue), -6.8 + Math.sin(i * 2.1) * 0.08, DESK_Y + 0.08 + i * 0.15, 1.5 + Math.cos(i * 1.7) * 0.06, 0.02);
      cd.rotation.y = Math.sin(i * 3.3) * 0.08;
      g.add(cd);
    }
    const mugMat = toon('#e7d9b8');
    const mug = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.42, 1.0, 20), mugMat), 0.05);
    mug.position.set(-4.6, DESK_Y + 0.5, 2.7);
    const handle = ink(new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 8, 16), mugMat), 0.03);
    handle.position.set(-4.1, DESK_Y + 0.55, 2.7);
    g.add(mug, handle);
    const puff = canvasTex(64, 64, (c, W) => {
      const gr = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, W, W);
    });
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0 }));
      this.steam.push(s);
      g.add(s);
    }
    const cup = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 1.4, 16), toon('#3f7a72')), 0.05);
    cup.position.set(-9.3, DESK_Y + 0.7, 2.0);
    g.add(cup);
    ['#f2c14e', '#e25b45', '#4f8fd8', '#7bc06a'].forEach((col, i) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), toon(col));
      p.position.set(-9.3 + (i - 1.5) * 0.18, DESK_Y + 1.6, 2.0 + (i % 2) * 0.15); p.rotation.z = (i - 1.5) * 0.12;
      g.add(p);
    });
    g.add(box(3.2, 0.3, 2.3, toon('#5f7fb0'), 8.2, DESK_Y + 0.15, 2.4, 0.04), box(3.0, 0.25, 2.2, toon('#e0c070'), 8.3, DESK_Y + 0.42, 2.35, 0.04));
    g.add(this.plant(-9.0, DESK_Y, -2.6, 1.2));

    // sticky notes on the monitor's bezel
    const note = (text: string, color: string, x: number, y: number, rot: number) => {
      const n = picture(1.1, 1.1, 120, (c, W, H) => {
        c.fillStyle = color; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, 0, W, 16);
        c.fillStyle = '#2a2a6a'; c.font = `400 30px ${PIXEL}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        text.split('\n').forEach((l, i, a) => c.fillText(l, W / 2, H / 2 + (i - (a.length - 1) / 2) * 30 + 6, W - 12));
      });
      n.position.set(x, y, 0.03); n.rotation.z = rot;
      g.add(n);
    };
    note('SAVE\n!!!', '#ffe46b', -2.15, 1.55, 0.12);
    note('kick\non 1', '#ff9ec0', 2.2, 1.6, -0.1);
    note('art hw\nfri', '#9fe3a8', 2.25, -1.25, 0.08);

    // ── the wall: a gig poster, the calendar at March 2004 (the 13th circled), photos, fairy lights
    const poster = picture(6, 8.4, 480, (c, W, H) => {
      c.fillStyle = '#26365a'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 7; i++) { c.fillStyle = ['#ff6b5b', '#ffd25b', '#5be0c0', '#b07bff'][i % 4]; c.beginPath(); c.arc(W * 0.5, H * 0.38, W * (0.42 - i * 0.055), 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#f4efe2'; c.font = `800 64px ${SANS}`; c.textAlign = 'center';
      c.fillText('BASEMENT', W / 2, H * 0.74, W - 30);
      c.font = `800 46px ${SANS}`; c.fillText('SHOW · SAT', W / 2, H * 0.82, W - 30);
      c.font = `600 30px ${SANS}`; c.fillStyle = '#ffd25b'; c.fillText('all ages · $5 · bring a friend', W / 2, H * 0.9, W - 30);
    });
    poster.position.set(-10, 6, WALL_Z + 0.02); poster.rotation.z = 0.03;
    const cal = picture(3.6, 4.6, 360, (c, W, H) => {
      c.fillStyle = '#f2efe6'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#6aa0c8'; c.fillRect(0, 0, W, H * 0.38);
      c.fillStyle = '#fff'; c.font = `800 44px ${SANS}`; c.textAlign = 'center'; c.fillText('MARCH 2004', W / 2, H * 0.3, W - 20);
      c.font = `500 20px ${SANS}`; c.fillStyle = '#333';
      for (let d = 1; d <= 31; d++) {
        const col = d % 7, row = Math.floor(d / 7); // March 1st 2004 was a Monday
        const x = 30 + col * ((W - 60) / 6.5), y = H * 0.48 + row * 46;
        c.fillText(String(d), x, y);
        if (d === 13) { c.strokeStyle = '#e0453a'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, y - 7, 22, 18, -0.2, 0, Math.PI * 2); c.stroke(); }
      }
    });
    cal.position.set(-4.6, 6.6, WALL_Z + 0.02);
    g.add(poster, cal);
    ([['#e8a46a', -0.2, 6.2, -0.08], ['#7fb2d9', 1.5, 7.3, 0.06], ['#d97a8a', 2.6, 5.6, -0.04], ['#9cc78a', 0.6, 4.6, 0.1]] as const).forEach(([col, x, y, r], i) => {
      const ph = picture(1.4, 1.7, 140, (c, W, H) => {
        c.fillStyle = '#f6f2ea'; c.fillRect(0, 0, W, H);
        c.fillStyle = col; c.fillRect(10, 10, W - 20, H - 44);
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(W * (0.3 + i * 0.1), H * 0.35, 18, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(240,225,170,0.8)'; c.fillRect(W / 2 - 18, 0, 36, 10);
      });
      ph.position.set(x, y, WALL_Z + 0.03); ph.rotation.z = r;
      g.add(ph);
    });
    const bulbGeo = new THREE.SphereGeometry(0.16, 8, 6);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 28; i++) {
      const u = i / 27, x = -15 + u * 32, y = 13.4 - Math.sin(u * Math.PI) * 1.4 - Math.sin(u * Math.PI * 3) * 0.3;
      const c = new THREE.Color(['#ffcf7a', '#ff8f6b', '#ffe9a8', '#9fd8ff'][i % 4]);
      const b = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: c.clone() }));
      b.position.set(x, y, WALL_Z + 0.3);
      pts.push(b.position.clone().add(new THREE.Vector3(0, 0.12, -0.05)));
      this.bulbs.push({ m: b, c });
      g.add(b);
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.025, 4), new THREE.MeshBasicMaterial({ color: '#2a1d18' })));

    // ── a bookshelf in the corner
    const shelfWood = toon('#6e4028');
    g.add(box(7, 22, 3, shelfWood, 19.5, FLOOR_Y + 11, WALL_Z + 1.6));
    for (let s = 0; s < 5; s++) {
      const y = FLOOR_Y + 2 + s * 4.2;
      g.add(box(6.4, 0.25, 2.8, toon('#5a3220'), 19.5, y, WALL_Z + 1.9, 0.02));
      let x = 16.6;
      for (let k = 0; x < 22.1; k++) {
        const w = 0.35 + ((k * 7 + s * 3) % 5) * 0.09, h = 2.4 + ((k * 5 + s) % 4) * 0.35;
        const col = ['#b8463a', '#3f6aa8', '#d9a441', '#4b8a5e', '#7a4f9a', '#e0d6c0', '#2f3a4a', '#c26a3a'][(k * 3 + s * 5) % 8];
        const bk = box(w, h, 2.1, toon(col), x + w / 2, y + 0.12 + h / 2, WALL_Z + 2.0, 0.02);
        if ((k + s) % 7 === 3) bk.rotation.z = 0.18;
        g.add(bk);
        x += w + 0.04;
      }
    }

    // ── the bed, on the left
    g.add(box(9, 3.2, 22, toon('#c86b5a'), -12.3, FLOOR_Y + 3.4, 12));
    g.add(box(9.2, 1.4, 22.4, toon('#5a3428'), -12.3, FLOOR_Y + 0.9, 12));
    g.add(box(6, 1.2, 3.4, toon('#f0e6da'), -12.3, FLOOR_Y + 5.6, 2.6));

    // ── her chair, and her
    const chairMat = toon('#b5292e');
    g.add(box(4.6, 0.8, 4.4, chairMat, GIRL_AT.x, DESK_Y - 4.2, GIRL_AT.z + 0.6));
    const back = box(4.6, 5.4, 0.8, chairMat, GIRL_AT.x, DESK_Y - 1.4, GIRL_AT.z + 3.0);
    back.rotation.x = -0.1;
    g.add(back, box(0.5, 6, 0.5, toon('#2a2420'), GIRL_AT.x, DESK_Y - 7.4, GIRL_AT.z + 0.6, 0.03));
    this.buildGirl();
    g.add(this.girl);
  }

  /** A potted plant: a terracotta pot and a crown of leaves. */
  private plant(x: number, y: number, z: number, s: number) {
    const p = new THREE.Group();
    const pot = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 1.1, 16), toon('#c4673f')), 0.05);
    pot.position.y = 0.55;
    p.add(pot);
    const leaf = toon('#5f9a4e'), leaf2 = toon('#7fb85e');
    for (let i = 0; i < 9; i++) {
      const l = ink(new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), i % 2 ? leaf : leaf2), 0.04);
      const a = i * 2.4;
      l.scale.set(1, 0.35, 0.6);
      l.position.set(Math.cos(a) * 0.6, 1.4 + (i % 3) * 0.45, Math.sin(a) * 0.5);
      l.rotation.set(0.3 * Math.sin(a), a, 0.6 * Math.cos(a));
      p.add(l);
    }
    p.position.set(x, y, z);
    p.scale.setScalar(s);
    return p;
  }

  /**
   * The town outside, in 3D: rows of houses climbing a hill away from the window, roofs, windows lit here and there,
   * a church spire, street lamps; the farther rows fade into the night sky. Instanced, so it's cheap.
   */
  private town() {
    const t = new THREE.Group();
    const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const sky = new THREE.Color('#2b2f5e');
    type House = { x: number; y: number; z: number; w: number; h: number; d: number; row: number };
    const houses: House[] = [];
    for (let row = 0; row < 10; row++) {
      const z = WALL_Z - 16 - row * 11, y = -9 + row * 3.6;
      for (let x = -38 + rand(row * 7) * 4; x < 60;) {
        const w = 4 + rand(row * 31 + x) * 4, h = 5 + rand(row * 17 + x * 3) * 5, d = 4 + rand(x * 5 + row) * 3;
        houses.push({ x: x + w / 2, y, z: z - rand(x + row * 9) * 3, w, h, d, row });
        x += w + 0.4 + rand(x * 11 + row) * 1.6;
      }
    }
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon('#ffffff'), houses.length);
    const roofGeo = new THREE.ConeGeometry(0.75, 1, 4); roofGeo.rotateY(Math.PI / 4);
    const roofs = new THREE.InstancedMesh(roofGeo, toon('#ffffff'), houses.length);
    const lit: THREE.Matrix4[] = [], litCol: THREE.Color[] = [];
    houses.forEach((hs, i) => {
      const far = hs.row / 9;
      dummy.position.set(hs.x, hs.y + hs.h / 2, hs.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(hs.w, hs.h, hs.d); dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
      walls.setColorAt(i, col.set(['#a89cd0', '#b9a6c8', '#9aa3d4', '#c0a2c0'][i % 4]).lerp(sky, far * 0.55));
      dummy.position.set(hs.x, hs.y + hs.h + 1.1, hs.z); dummy.scale.set(hs.w * 1.15, 2.2, hs.d * 1.15); dummy.updateMatrix();
      roofs.setMatrixAt(i, dummy.matrix);
      roofs.setColorAt(i, col.set(['#d0706a', '#c0606a', '#d8806a'][i % 3]).lerp(sky, far * 0.55));
      // windows on the front face, a few of them lit
      const cols = Math.max(1, Math.floor(hs.w / 1.8)), rows = Math.max(1, Math.floor(hs.h / 2.4));
      for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
        if (rand(i * 13 + a * 7 + b * 3) > 0.38) continue;
        dummy.position.set(hs.x - hs.w / 2 + (a + 0.5) * (hs.w / cols), hs.y + 1.2 + b * 2.4, hs.z + hs.d / 2 + 0.02);
        dummy.scale.set(0.8, 1.1, 1); dummy.updateMatrix();
        lit.push(dummy.matrix.clone());
        litCol.push(new THREE.Color(rand(i + a + b * 5) > 0.5 ? '#ffd27a' : '#ffb35c').multiplyScalar(1.4 - far * 0.5));
      }
    });
    const panes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial(), lit.length);
    lit.forEach((m, i) => { panes.setMatrixAt(i, m); panes.setColorAt(i, litCol[i]); });
    t.add(walls, roofs, panes);
    // the hill under it all
    const hill = new THREE.Mesh(new THREE.PlaneGeometry(200, 160), toon('#4a4878'));
    hill.rotation.x = -Math.PI / 2 + 0.33; hill.position.set(10, -6, WALL_Z - 70);
    t.add(hill);
    // a church, its spire over the roofs
    const church = box(5, 16, 5, toon('#a698c8'), 22, 6, WALL_Z - 52, 0);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.6, 8, 4), toon('#7a6a9a'));
    spire.position.set(22, 18, WALL_Z - 52); spire.rotation.y = Math.PI / 4;
    const belfry = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf80') }));
    belfry.position.set(22, 11, WALL_Z - 49.4);
    t.add(church, spire, belfry);
    // street lamps along the first rows
    for (let i = 0; i < 14; i++) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(1.8) }));
      lamp.position.set(-20 + i * 5.5, -7.5 + (i % 3) * 3.6, WALL_Z - 12 - (i % 3) * 11);
      t.add(lamp);
    }
    // the sky: a gradient dome far away, stars, the moon
    const skyTex = canvasTex(512, 256, (c, W, H) => {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#0c1338'); gr.addColorStop(0.55, '#26295a'); gr.addColorStop(1, '#4a3f6e');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + rand(i) * 0.6})`; c.fillRect(rand(i * 3) * W, rand(i * 7) * H * 0.6, 1.5, 1.5); }
    });
    const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(520, 260), new THREE.MeshBasicMaterial({ map: skyTex }));
    skyMesh.position.set(10, 60, WALL_Z - 170);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d6').multiplyScalar(1.6) }));
    moon.position.set(40, 62, WALL_Z - 165);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(12, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff0c8'), transparent: true, opacity: 0.12 }));
    halo.position.set(40, 62, WALL_Z - 165.5);
    t.add(skyMesh, halo, moon);
    return t;
  }

  /** An orange tabby, curled up asleep on the sill: head tucked in, paws in front, tail wrapped round. */
  private buildCat() {
    const orange = '#e2782c', dark = '#b4521c';
    // stripes run across the back: the body's poles point along its spine, the bands are latitudes
    const fur = canvasTex(64, 256, (c, W, H) => {
      c.fillStyle = orange; c.fillRect(0, 0, W, H);
      c.fillStyle = dark;
      for (let i = 1; i < 11; i++) c.fillRect(0, (i / 11) * H - 5, W, 9 + (i % 3) * 3);
    });
    const furMat = toon('#ffffff', fur), plain = toon(orange), cream = toon('#f3d9b8');
    const add = (m: THREE.Mesh, w = 0.035) => { this.cat.add(outline(m, w)); return m; };
    const bodyGeo = new THREE.SphereGeometry(1, 40, 28); bodyGeo.rotateZ(Math.PI / 2);
    const body = add(new THREE.Mesh(bodyGeo, furMat));
    body.scale.set(1.55, 0.78, 1.0); body.position.y = 0.72;
    const haunch = add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 28, 20), plain));
    haunch.position.set(0.85, 0.7, 0.05); haunch.scale.set(1, 0.9, 1.05);
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 24), plain));
    head.position.set(-1.25, 0.62, 0.35); head.scale.set(1, 0.9, 0.95);
    const muzzle = add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), cream), 0.02);
    muzzle.position.set(-1.6, 0.48, 0.65); muzzle.scale.set(1, 0.75, 0.9);
    for (const s of [-1, 1]) {
      const ear = add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 20), plain), 0.025);
      ear.position.set(-1.25 + s * 0.3, 1.1, 0.25 + s * 0.05); ear.rotation.set(-0.2, 0, -s * 0.35);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 16), toon('#f0a69a'));
      inner.position.set(-1.25 + s * 0.3, 1.08, 0.32 + s * 0.05); inner.rotation.copy(ear.rotation);
      this.cat.add(inner);
    }
    for (const dz of [0.0, 0.4]) {
      const paw = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), cream), 0.02);
      paw.position.set(-0.9 + dz * 0.4, 0.14, 0.85 + dz * 0.2); paw.scale.set(1.5, 0.7, 1);
    }
    add(new THREE.Mesh(taperTube([new THREE.Vector3(1.55, 0.45, -0.2), new THREE.Vector3(1.6, 0.25, 0.75), new THREE.Vector3(0.6, 0.18, 1.15), new THREE.Vector3(-0.4, 0.18, 1.1)], 0.2, 0.13), toon(dark)), 0.025);
  }

  /**
   * Her: smooth, toon-shaded, inked. A bob with bangs and a high ponytail tied with a green scrunchie, big headphones
   * (cream band, teal cups), a mustard sweater, elbows out, leaning in to the screen. Built from lathed and tapered
   * shapes rather than boxes, so she reads soft from every angle the camera takes. Local origin: the centre of her head;
   * she faces the screen (−z).
   */
  private buildGirl() {
    const skin = toon('#e8b08f'), hair = toon('#2e1a12'), sweater = toon('#33503f'), cream = toon('#e6dcc0'), red = toon('#b8343a'), cushion = toon('#3a2a2a'), scarf = toon('#e8566a');
    const p = this.girl;
    const add = (m: THREE.Mesh, w = 0.06) => { p.add(outline(m, w)); return m; };
    // torso: a lathed silhouette, sloping shoulders, flattened front to back
    const torso = add(new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.001, -6.4), new THREE.Vector2(1.9, -6.3), new THREE.Vector2(2.15, -4.6), new THREE.Vector2(2.2, -3.0),
      new THREE.Vector2(2.05, -2.0), new THREE.Vector2(1.55, -1.45), new THREE.Vector2(0.75, -1.15), new THREE.Vector2(0.001, -1.1),
    ], 40), sweater), 0.07);
    torso.scale.set(1, 1, 0.72); torso.rotation.x = -0.1;
    // a coral scarf, bunched round the neck
    const wrap = add(new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.38, 16, 36), scarf), 0.05);
    wrap.rotation.x = Math.PI / 2 - 0.15; wrap.position.set(0, -1.3, 0.05);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 1.0, 20), skin), 0.04).position.set(0, -0.95, 0.05);
    // head, face toward the screen
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(1.3, 40, 30), skin), 0.06);
    head.scale.set(0.95, 1.05, 1.0);
    const ear = add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skin), 0.03);
    ear.position.set(-1.22, -0.1, 0.05); ear.scale.set(0.5, 1, 0.8);
    // hair: a cap over the crown and the back, a soft bob to the jaw, bangs over the brow
    const cap = add(new THREE.Mesh(new THREE.SphereGeometry(1.42, 40, 30, 0, Math.PI * 2, 0, Math.PI * 0.56), hair), 0.06);
    cap.scale.set(0.98, 1.06, 1.02); cap.position.y = 0.04;
    const backHair = add(new THREE.Mesh(new THREE.SphereGeometry(1.44, 40, 30, 0, Math.PI, Math.PI * 0.3, Math.PI * 0.45), hair), 0.06);
    backHair.scale.set(1.0, 1.1, 1.05); // the half facing +z (away from the screen)
    for (const [x, y, z, r] of [[-0.55, 0.75, -1.05, 0.15], [0, 0.82, -1.15, 0], [0.55, 0.75, -1.05, -0.15]] as const) {
      const bang = add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), hair), 0.04);
      bang.position.set(x, y, z); bang.scale.set(0.95, 0.55, 0.45); bang.rotation.z = r;
    }
    for (const sx of [-1, 1]) { // side locks, to the jaw
      const lock = add(new THREE.Mesh(taperTube([new THREE.Vector3(sx * 1.25, 0.6, -0.5), new THREE.Vector3(sx * 1.38, -0.2, -0.45), new THREE.Vector3(sx * 1.22, -0.95, -0.55)], 0.32, 0.12), hair), 0.04);
      lock.userData.side = sx;
    }
    // the high ponytail, swinging a little, and the elastic that holds it
    const tail = [new THREE.Vector3(0, 1.0, 0.95), new THREE.Vector3(0, 1.28, 1.42), new THREE.Vector3(0, 0.95, 1.85), new THREE.Vector3(0.03, 0.1, 1.95), new THREE.Vector3(0.06, -0.55, 1.75)];
    add(new THREE.Mesh(taperTube(tail, 0.36, 0.07), hair), 0.04);
    const tie = add(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.15, 14, 28), toon('#2f4a3a')), 0.03);
    tie.position.set(0, 1.08, 1.12);
    tie.lookAt(tail[1]); // the ring's axis runs along the ponytail
    // headphones: a cream band over the crown, big teal cups with cream cushions
    const band = add(new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.15, 14, 48, Math.PI), cream), 0.04);
    band.position.set(0, 0.05, 0.05);
    for (const sx of [-1, 1]) {
      const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.64, 0.5, 32), cream), 0.05);
      cup.rotation.z = Math.PI / 2; cup.position.set(sx * 1.66, -0.12, 0.05);
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 10, 32), red), 0.02);
      ring.rotation.y = Math.PI / 2; ring.position.set(sx * 1.92, -0.12, 0.05);
      const pad = add(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.2, 12, 28), cushion), 0.03);
      pad.rotation.y = Math.PI / 2; pad.position.set(sx * 1.4, -0.12, 0.05);
    }
    // arms: shoulder, elbow out, forearm to the keys and to the mouse; small hands
    for (const [sx, hand] of [[-1, new THREE.Vector3(-1.9, -4.3, -6.3)], [1, new THREE.Vector3(3.0, -4.4, -6.0)]] as const) {
      add(new THREE.Mesh(taperTube([new THREE.Vector3(sx * 1.85, -1.75, 0.1), new THREE.Vector3(sx * 2.6, -3.3, -1.3), new THREE.Vector3(sx * 2.4, -4.1, -3.4), hand], 0.62, 0.42), sweater), 0.05);
      // the cuff, then a hand: palm, four fingers curling down onto the keys (or round the mouse), a thumb
      const cuff = add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.16, 12, 24), sweater), 0.03);
      cuff.position.copy(hand); cuff.lookAt(hand.clone().add(new THREE.Vector3(0, -0.15, -1)));
      const h = new THREE.Group();
      h.position.copy(hand).add(new THREE.Vector3(0, -0.05, -0.5));
      h.rotation.x = 0.12;
      const palm = outline(new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), skin), 0.025);
      palm.scale.set(0.82, 0.32, 1.0);
      h.add(palm);
      for (let f = 0; f < 4; f++) {
        const x = (f - 1.5) * 0.19 * (sx < 0 ? 1 : 0.9), len = [0.42, 0.5, 0.47, 0.36][sx < 0 ? f : 3 - f];
        const finger = outline(new THREE.Mesh(taperTube([new THREE.Vector3(x, 0.02, -0.38), new THREE.Vector3(x * 1.05, 0.0, -0.38 - len * 0.6),
          new THREE.Vector3(x * 1.08, -0.12 - (sx > 0 ? 0.05 : 0), -0.38 - len)], 0.085, 0.07, 12, 10), skin), 0.02);
        h.add(finger);
      }
      const tx = -sx * 0.42; // the thumb, on the inside
      h.add(outline(new THREE.Mesh(taperTube([new THREE.Vector3(tx * 0.8, -0.02, -0.05), new THREE.Vector3(tx, -0.06, -0.3), new THREE.Vector3(tx * 0.95, -0.1, -0.55)], 0.1, 0.075, 12, 10), skin), 0.02));
      p.add(h);
    }
    p.position.copy(GIRL_AT);
  }

  update(t: number, o: { power: number; kick: number; girl: boolean }) {
    this.screenLight.intensity = 7 * o.power * (0.92 + o.kick * 0.15 + 0.04 * Math.sin(t * 13));
    this.lampLight.intensity = 18 * (0.97 + 0.03 * Math.sin(t * 2.3));
    this.fill.intensity = 30;
    this.girl.visible = o.girl;
    // the cat breathes
    this.cat.scale.set(1.3, 1.3 * (1 + 0.025 * Math.sin(t * 1.4)), 1.3);
    this.bulbs.forEach(({ m, c }, i) => {
      const twinkle = 0.75 + 0.25 * Math.sin(t * (0.8 + (i % 5) * 0.3) + i);
      (m.material as THREE.MeshBasicMaterial).color.copy(c).multiplyScalar(twinkle * 1.6);
    });
    // steam off the tea
    this.steam.forEach((s, i) => {
      const k = (t * 0.35 + i / this.steam.length) % 1;
      s.position.set(-4.6 + Math.sin(t * 1.3 + i * 2) * 0.25 * k, DESK_Y + 1.2 + k * 2.4, 2.7);
      s.scale.setScalar(0.5 + k * 1.1);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(k * Math.PI) * 0.35;
    });
  }
}

