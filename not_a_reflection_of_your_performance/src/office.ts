import * as THREE from 'three';
import { hash, smoothstep } from './math';
import { OFFICE_ROWS } from './timeline';

const COLS = 4, ROWS = 14, SPACING = 4.2, CEILING = 3.2, FLOOR = -2.2;

/**
 * The empty office: a ceiling of light panels over rows of desks. Motion sensors notice nobody is there
 * and the rows switch off one by one, far to near.
 */
export class Office {
  readonly group = new THREE.Group();
  private panels: THREE.InstancedMesh;
  private pools: THREE.InstancedMesh;
  private desks: THREE.InstancedMesh;
  private panelColor = new THREE.Color();
  private deskMat: THREE.MeshBasicMaterial;
  private panelMat: THREE.MeshBasicMaterial;
  private poolMat: THREE.MeshBasicMaterial;

  constructor() {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    const xOf = (c: number) => (c - (COLS - 1) / 2) * 4.4;
    const zOf = (r: number) => -3 - r * SPACING;

    // ceiling panels, facing down
    this.panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
    this.panels = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6, 1.3), this.panelMat, COLS * ROWS);
    q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      this.panels.setMatrixAt(r * COLS + c, m.compose(p.set(xOf(c), CEILING, zOf(r)), q, s));
      this.panels.setColorAt(r * COLS + c, this.panelColor.setRGB(1, 1, 1));
    }

    // soft pools of light on the floor
    const pool = document.createElement('canvas');
    pool.width = pool.height = 128;
    const g = pool.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.poolMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pool), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(5.2, 3.6), this.poolMat, COLS * ROWS);
    q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      this.pools.setMatrixAt(r * COLS + c, m.compose(p.set(xOf(c), FLOOR + 0.01, zOf(r)), q, s));
      this.pools.setColorAt(r * COLS + c, this.panelColor.setRGB(1, 1, 1));
    }

    // desks: dark silhouettes, each with a dark monitor
    this.deskMat = new THREE.MeshBasicMaterial({ color: 0x1a1d33, transparent: true });
    const desk = new THREE.BoxGeometry(1.8, 0.08, 0.9);
    const monitor = new THREE.BoxGeometry(0.7, 0.45, 0.04).translate(0, 0.3, -0.25);
    const merged = mergeBoxes(desk, monitor);
    this.desks = new THREE.InstancedMesh(merged, this.deskMat, COLS * 2 * ROWS);
    let k = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const dx of [-1, 1]) {
      this.desks.setMatrixAt(k++, m.compose(p.set(xOf(c) + dx * 1.0, FLOOR + 0.75, zOf(r) + 0.6), new THREE.Quaternion(), s));
    }

    // draw order: floor light, then the desks over it (silhouettes), then the ceiling
    this.pools.renderOrder = 0;
    this.desks.renderOrder = 1;
    this.panels.renderOrder = 2;
    this.group.add(this.pools, this.desks, this.panels);
  }

  /** 0..1 how lit each row is at time t (rows switch off far to near across OFFICE_ROWS, with a flicker). */
  private rowLight(r: number, t: number) {
    const [a, b] = OFFICE_ROWS;
    const tOff = b - (r / (ROWS - 1)) * (b - a); // far rows (high r) first
    if (t >= tOff) return 0;
    const flick = t > tOff - 0.25 && hash(Math.floor(t * 30) + r * 13) > 0.55 ? 0.35 : 1;
    return flick;
  }

  update(t: number, opacity: number) {
    this.group.visible = opacity > 0.001;
    if (!this.group.visible) return;
    for (let r = 0; r < ROWS; r++) {
      const l = this.rowLight(r, t);
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        this.panels.setColorAt(i, this.panelColor.setRGB(0.06 + 0.94 * l, 0.06 + 0.94 * l, 0.07 + 0.93 * l));
        this.pools.setColorAt(i, this.panelColor.setRGB(l * 0.9, l * 0.92, l));
      }
    }
    this.panels.instanceColor!.needsUpdate = true;
    this.pools.instanceColor!.needsUpdate = true;
    // desks read as silhouettes only while there is light
    const anyLight = 1 - smoothstep(OFFICE_ROWS[1] - 0.5, OFFICE_ROWS[1] + 0.4, t);
    this.deskMat.opacity = opacity * (0.25 + 0.75 * anyLight);
    this.panelMat.opacity = opacity;
    this.poolMat.opacity = opacity;
  }
}

/** Two boxes into one geometry (non-indexed), so a desk + monitor is one instance. */
function mergeBoxes(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const A = a.toNonIndexed(), B = b.toNonIndexed();
  const pos = new Float32Array(A.attributes.position.array.length + B.attributes.position.array.length);
  pos.set(A.attributes.position.array as Float32Array, 0);
  pos.set(B.attributes.position.array as Float32Array, A.attributes.position.array.length);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}
