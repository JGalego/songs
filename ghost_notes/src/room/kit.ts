// The modelling kit for the bedroom: a cel-shading ramp, ink outlines, and a few ways to make soft shapes out of
// numbers (rounded boxes, lofted bodies, tapering tubes, spherical shells), so nothing in the room has to be a box.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CanvasTex } from '../text';

// ── cel shading: a hard step from shadow to light, with one narrow half-tone at the terminator.
// The ramp is sampled across N·L = −1..1; anything facing away from a light gets nothing from it (the violet ambient
// fills the shadows instead), which is what makes the forms read like a drawing.
const RAMP = (() => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 20, 150, 255, 255, 255, 255, 255, 255]), 16, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const mats = new Map<string, THREE.MeshToonMaterial>();
/** A cel-shaded material. Cached by colour unless it has a map. */
export function toon(color: string, o: { map?: THREE.Texture; side?: THREE.Side; transparent?: boolean; emissive?: string } = {}) {
  const key = !o.map && !o.transparent && !o.emissive ? `${color}|${o.side ?? 0}` : '';
  const hit = key && mats.get(key);
  if (hit) return hit;
  const m = new THREE.MeshToonMaterial({
    color: new THREE.Color(color), gradientMap: RAMP, side: o.side ?? THREE.FrontSide,
    ...(o.map ? { map: o.map } : {}),
    ...(o.transparent ? { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } : {}),
    ...(o.emissive ? { emissive: new THREE.Color(o.emissive) } : {}),
  });
  if (key) mats.set(key, m);
  return m;
}

/** Something that shines by itself (bulbs, screens, lit windows); `gain` above 1 feeds the bloom. */
export const glow = (color: string, gain = 1, map?: THREE.Texture) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), ...(map ? { map } : {}) });

// ── ink: the same surface pushed out along its normals, back faces only
const inks = new Map<number, THREE.ShaderMaterial>();
function inkMat(w: number) {
  let m = inks.get(w);
  if (!m) {
    m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uW: { value: w } },
      vertexShader: 'uniform float uW; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normalize(normal) * uW, 1.0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(0.016, 0.008, 0.014, 1.0); }',
    });
    inks.set(w, m);
  }
  return m;
}

export interface SolidOpts { ink?: number; cast?: boolean; receive?: boolean }
/** A mesh with an ink outline (`ink` units thick; 0 for none) that casts and receives shadows. */
export function solid(geo: THREE.BufferGeometry, mat: THREE.Material, o: SolidOpts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  const w = o.ink ?? 0.05;
  if (w > 0) m.add(new THREE.Mesh(geo, inkMat(w)));
  return m;
}

/** Places an object: position, then optional rotation (radians). Returns it, for chaining into add(). */
export function put<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): T {
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  return o;
}

// ── shapes
/** A box with rounded edges (radius r). */
export const rbox = (w: number, h: number, d: number, r = 0.12, seg = 3) =>
  new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));

export interface Section { y: number; rx: number; rz: number; x?: number; z?: number; n?: number }
/**
 * A body lofted through horizontal sections: each is a superellipse (rx × rz, exponent n: 2 round, higher boxier)
 * centred on (x, z) at height y. Sections are joined smoothly; the ends are closed.
 */
export function loft(sections: Section[], radial = 40, sub = 6) {
  const a = new THREE.CatmullRomCurve3(sections.map((s) => new THREE.Vector3(s.rx, s.y, s.rz)), false, 'catmullrom', 0.5);
  const b = new THREE.CatmullRomCurve3(sections.map((s) => new THREE.Vector3(s.x ?? 0, s.n ?? 2, s.z ?? 0)), false, 'catmullrom', 0.5);
  const rings = (sections.length - 1) * sub + 1;
  const pos: number[] = [], idx: number[] = [];
  const pa = new THREE.Vector3(), pb = new THREE.Vector3();
  for (let i = 0; i < rings; i++) {
    a.getPoint(i / (rings - 1), pa); b.getPoint(i / (rings - 1), pb);
    const e = 2 / Math.max(1.2, pb.y);
    for (let j = 0; j < radial; j++) {
      const t = (j / radial) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      pos.push(pb.x + Math.sign(c) * Math.pow(Math.abs(c), e) * Math.max(pa.x, 1e-3), pa.y, pb.z + Math.sign(s) * Math.pow(Math.abs(s), e) * Math.max(pa.z, 1e-3));
    }
  }
  const up = sections[sections.length - 1].y > sections[0].y; // keeps the faces pointing outward either way
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < radial; j++) {
    const p = i * radial + j, q = i * radial + ((j + 1) % radial);
    if (up) idx.push(p, p + radial, q, q, p + radial, q + radial);
    else idx.push(p, q, p + radial, q, q + radial, p + radial);
  }
  // caps
  for (const [ring, last] of [[0, false], [rings - 1, true]] as const) {
    a.getPoint(ring / (rings - 1), pa); b.getPoint(ring / (rings - 1), pb);
    const c = pos.length / 3;
    pos.push(pb.x, pa.y, pb.z);
    for (let j = 0; j < radial; j++) {
      const p = ring * radial + j, q = ring * radial + ((j + 1) % radial);
      if (last === up) idx.push(c, q, p); else idx.push(c, p, q);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A tube along a smooth curve through `pts`. `radius` is a number or a function of u (0 at the start, 1 at the end);
 * `squash` flattens it along the curve's binormal (ribbons, locks of hair). Both ends are rounded off.
 */
export function tube(pts: THREE.Vector3[], radius: number | ((u: number) => number), o: { segs?: number; radial?: number; squash?: number } = {}) {
  const segs = o.segs ?? 24, radial = o.radial ?? 12, squash = o.squash ?? 1, CAP = 4;
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const frames = curve.computeFrenetFrames(segs, false);
  const r = typeof radius === 'number' ? () => radius : radius;
  const pos: number[] = [], idx: number[] = [];
  const P = new THREE.Vector3();
  const ring = (c: THREE.Vector3, i: number, rad: number) => {
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j < radial; j++) {
      const t = (j / radial) * Math.PI * 2, cn = Math.cos(t) * rad, sn = Math.sin(t) * rad * squash;
      pos.push(c.x + N.x * cn + B.x * sn, c.y + N.y * cn + B.y * sn, c.z + N.z * cn + B.z * sn);
    }
  };
  // a rounded cap, the tube, another cap
  for (let k = 0; k < CAP; k++) {
    const a = (k / CAP) * Math.PI / 2, r0 = r(0);
    ring(curve.getPointAt(0, P).clone().addScaledVector(frames.tangents[0], -Math.cos(a) * r0 * 0.9), 0, Math.max(1e-3, Math.sin(a) * r0));
  }
  for (let i = 0; i <= segs; i++) ring(curve.getPointAt(i / segs, P), i, r(i / segs));
  for (let k = 1; k <= CAP; k++) {
    const a = (k / CAP) * Math.PI / 2, r1 = r(1);
    ring(curve.getPointAt(1, P).clone().addScaledVector(frames.tangents[segs], Math.sin(a) * r1 * 0.9), segs, Math.max(1e-3, Math.cos(a) * r1));
  }
  const rings = pos.length / 3 / radial;
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < radial; j++) {
    const p = i * radial + j, q = i * radial + ((j + 1) % radial);
    idx.push(p, q, p + radial, q, q + radial, p + radial);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Part of a sphere-like surface, in the head's own coordinates: φ runs round the vertical axis from the face (0, at −z)
 * through her right side (+x), θ runs down from the crown. The radius and the lower edge can both vary with direction,
 * which is all a head, a fringe or a cap of hair needs. Carries uv = (φ, θ) normalised over the patch.
 */
export function shell(
  radius: (phi: number, theta: number) => number,
  o: { phi?: [number, number]; theta0?: number; theta1: number | ((phi: number) => number); phiSeg?: number; thetaSeg?: number },
) {
  const [p0, p1] = o.phi ?? [-Math.PI, Math.PI], full = !o.phi;
  const ps = o.phiSeg ?? 56, ts = o.thetaSeg ?? 24, t0 = o.theta0 ?? 0;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= ps; i++) {
    const phi = p0 + ((p1 - p0) * i) / ps;
    const t1 = typeof o.theta1 === 'number' ? o.theta1 : o.theta1(phi);
    for (let j = 0; j <= ts; j++) {
      const th = t0 + ((t1 - t0) * j) / ts, r = radius(phi, th), s = Math.sin(th);
      pos.push(r * s * Math.sin(phi), r * Math.cos(th), -r * s * Math.cos(phi));
      uv.push(i / ps, 1 - j / ts);
    }
  }
  for (let i = 0; i < ps; i++) for (let j = 0; j < ts; j++) {
    const p = i * (ts + 1) + j, q = p + ts + 1;
    idx.push(p, q, p + 1, q, q + 1, p + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (full) weldSeam(g, ps, ts);
  return g;
}

/** Averages the normals along a shell's φ seam (first and last columns coincide), so the ink doesn't split there. */
function weldSeam(g: THREE.BufferGeometry, ps: number, ts: number) {
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let j = 0; j <= ts; j++) {
    const a = j, b = ps * (ts + 1) + j;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
}

/** A surface of revolution from a profile of [radius, y] points. */
export const lathe = (profile: [number, number][], seg = 32) =>
  new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-3), y)), seg);

// ── pictures
/** A canvas drawn once (W × H logical px), as a texture. */
export function canvas(w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, repeat?: [number, number]) {
  const tex = new CanvasTex(w, h);
  tex.draw('once', (c) => draw(c, w, h));
  if (repeat) {
    tex.texture.wrapS = tex.texture.wrapT = THREE.RepeatWrapping;
    tex.texture.repeat.set(repeat[0], repeat[1]);
  }
  return tex.texture;
}

/** A flat, lit picture (w × h units), drawn once at `px` pixels wide: posters, photos, notes. */
export function picture(w: number, h: number, px: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', { map: canvas(px, Math.round((px * h) / w), draw) }));
  m.receiveShadow = true;
  return m;
}

export const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
