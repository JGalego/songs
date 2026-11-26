// The town outside her window, at midnight, in 3D: houses climbing a hill, drawn by one shader (walls, window grids,
// a third of the windows lit, a few going on and off through the night, haze with distance), roofs, trees, a church
// on the ridge, street lamps, hills, and a sky with stars, clouds and a moon. Instanced: a handful of draw calls.
import * as THREE from 'three';
import { canvas, rnd } from './kit';

const HAZE = new THREE.Color('#2f3a78');

const VERT = /* glsl */ `
  varying vec3 vLocal, vN, vON, vScale, vColor;
  varying float vDist, vId;
  void main() {
    vLocal = position;
    vON = normal;
    vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vN = normalize(mat3(instanceMatrix) * normal);
    vColor = instanceColor;
    vId = instanceMatrix[3].x * 7.13 + instanceMatrix[3].z * 3.71;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */ `
  uniform float uTime, uRoof;
  uniform vec3 uHaze, uMoon;
  varying vec3 vLocal, vN, vON, vScale, vColor;
  varying float vDist, vId;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    // two tones: faces the moon catches, and the rest
    float lit = step(0.15, dot(vN, uMoon));
    vec3 col = vColor * mix(0.5, 1.0, lit);
    float glow = 0.0;
    if (uRoof < 0.5 && abs(vON.y) < 0.5) {
      // a grid of windows on every wall, in real units, so big houses get more of them
      float side = step(0.5, abs(vON.x));
      float u = mix(vLocal.x * vScale.x, vLocal.z * vScale.z, side) + 40.0;
      float v = (vLocal.y + 0.5) * vScale.y;
      vec2 g = vec2(u / 1.9, v / 2.5);
      vec2 cell = floor(g), f = fract(g);
      float pane = step(0.26, f.x) * step(f.x, 0.74) * step(0.24, f.y) * step(f.y, 0.8);
      pane *= step(0.5, v) * step(v, vScale.y - 0.7);
      float h = hash(cell + vId + side * 17.0 + vON.z * 5.0);
      float on = step(0.68, h);
      // someone goes to bed, someone gets up for a glass of water
      float restless = step(0.9, hash(cell * 1.7 + vId + 3.0));
      on = mix(on, step(0.2, sin(uTime * (0.18 + h * 0.2) + h * 60.0)), restless);
      vec3 warm = mix(vec3(1.0, 0.62, 0.28), vec3(1.0, 0.85, 0.5), hash(cell + vId + 9.0));
      // a cross of glazing bars on the lit ones
      float bars = 1.0 - 0.5 * (step(abs(f.x - 0.5), 0.025) + step(abs(f.y - 0.52), 0.02));
      vec3 dark = vColor * 0.22 + vec3(0.01, 0.015, 0.04);
      col = mix(col, mix(dark, warm * 1.7 * bars, on), pane);
      glow = pane * on;
    }
    // the night air between here and there
    float haze = smoothstep(18.0, 150.0, vDist);
    col = mix(col, uHaze, haze * mix(0.9, 0.55, glow));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Town {
  readonly group = new THREE.Group();
  private uniforms = { uTime: { value: 0 }, uHaze: { value: HAZE.clone() }, uMoon: { value: new THREE.Vector3(0.45, 0.6, 0.66).normalize() } };

  /** `wallZ`: the plane of the window; everything is built behind it (z below wallZ). */
  constructor(wallZ: number) {
    const mat = (roof: boolean) => new THREE.ShaderMaterial({ uniforms: { ...this.uniforms, uRoof: { value: roof ? 1 : 0 } }, vertexShader: VERT, fragmentShader: FRAG });
    type House = { x: number; y: number; z: number; w: number; h: number; d: number; rot: number; row: number };
    const houses: House[] = [];
    // rows climbing away; the first sits just below the sill, so we look down on its roofs
    for (let row = 0; row < 13; row++) {
      const z = wallZ - 9 - row * 8.5 - row * row * 0.25, y = -17 + row * 3.1 + Math.sin(row * 1.3) * 0.8;
      for (let x = -85 + rnd(row * 7) * 6; x < 105;) {
        const w = 4.2 + rnd(row * 31 + x) * 4.5, h = 7 + rnd(row * 17 + x * 3) * 6 + (rnd(x * 2.3 + row) > 0.9 ? 6 : 0), d = 5 + rnd(x * 5 + row) * 3;
        // the ground rolls a little along each street
        houses.push({ x: x + w / 2, y: y + Math.sin(x * 0.05 + row) * 1.6, z: z - rnd(x + row * 9) * 3.5, w, h, d, rot: (rnd(x * 3.3 + row * 1.9) - 0.5) * 0.22, row });
        x += w + 0.3 + rnd(x * 11 + row) * 2.2;
      }
    }
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(false), houses.length);
    const roofGeo = new THREE.ConeGeometry(0.72, 1, 4, 1); roofGeo.rotateY(Math.PI / 4);
    const roofs = new THREE.InstancedMesh(roofGeo, mat(true), houses.length);
    const WALLS = ['#8d87b8', '#a294bd', '#7f8fbe', '#b09ab4', '#9aa0c8', '#c2a9b0'], ROOFS = ['#8a4f62', '#9c5a5e', '#7a4a6a', '#a8645c'];
    houses.forEach((h, i) => {
      dummy.position.set(h.x, h.y + h.h / 2, h.z); dummy.rotation.set(0, h.rot, 0); dummy.scale.set(h.w, h.h, h.d); dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
      walls.setColorAt(i, col.set(WALLS[Math.floor(rnd(i * 3.7) * WALLS.length)]).multiplyScalar(0.75 + rnd(i * 1.3) * 0.4));
      const rh = 1.8 + rnd(i * 2.9) * 1.6;
      dummy.position.set(h.x, h.y + h.h + rh / 2, h.z); dummy.scale.set(h.w * 1.12, rh, h.d * 1.12); dummy.updateMatrix();
      roofs.setMatrixAt(i, dummy.matrix);
      roofs.setColorAt(i, col.set(ROOFS[Math.floor(rnd(i * 5.1) * ROOFS.length)]).multiplyScalar(0.8 + rnd(i * 2.1) * 0.35));
    });
    // chimneys on some
    const stacks = houses.filter((_, i) => rnd(i * 9.7) > 0.55);
    const chimneys = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(true), stacks.length);
    stacks.forEach((h, i) => {
      dummy.position.set(h.x + (rnd(i) - 0.5) * h.w * 0.5, h.y + h.h + 1.6, h.z); dummy.rotation.set(0, h.rot, 0); dummy.scale.set(0.7, 2.2, 0.7); dummy.updateMatrix();
      chimneys.setMatrixAt(i, dummy.matrix);
      chimneys.setColorAt(i, col.set('#6a4a5c'));
    });
    // trees between the houses: dark, round
    const N_TREES = 110;
    const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), mat(true), N_TREES);
    for (let i = 0; i < N_TREES; i++) {
      const h = houses[Math.floor(rnd(i * 4.3) * houses.length)], s = 1.6 + rnd(i * 7.7) * 2.2;
      dummy.position.set(h.x + h.w * 0.5 + 0.8, h.y + s * 1.1, h.z + h.d * 0.3); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, s * 1.35, s); dummy.updateMatrix();
      trees.setMatrixAt(i, dummy.matrix);
      trees.setColorAt(i, col.set(['#2f4a5a', '#284458', '#35505a'][i % 3]));
    }
    for (const m of [walls, roofs, chimneys, trees]) { m.frustumCulled = false; this.group.add(m); }

    // the hill itself, under the houses, and a church on the ridge
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 260), new THREE.MeshBasicMaterial({ color: new THREE.Color('#1c2550') }));
    ground.rotation.x = -Math.PI / 2 + 0.345; ground.position.set(10, 7, wallZ - 100);
    this.group.add(ground);
    const churchMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#404a8c') });
    const nave = new THREE.Mesh(new THREE.BoxGeometry(16, 11, 9), churchMat), tower = new THREE.Mesh(new THREE.BoxGeometry(5, 22, 5), churchMat);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(3.4, 12, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#363f7c') }));
    nave.position.set(40, 33, wallZ - 128); tower.position.set(30, 39, wallZ - 127); spire.position.set(30, 56, wallZ - 127); spire.rotation.y = Math.PI / 4;
    const clock = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd590').multiplyScalar(1.5) }));
    clock.position.set(30, 44, wallZ - 124.4);
    this.group.add(nave, tower, spire, clock);

    // street lamps: little warm halos down the nearer streets
    const halo = canvas(64, 64, (c, W) => {
      const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      g.addColorStop(0, 'rgba(255,214,150,1)'); g.addColorStop(0.25, 'rgba(255,190,110,0.5)'); g.addColorStop(1, 'rgba(255,170,90,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, W);
    });
    const N_LAMPS = 46;
    const lamps = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), N_LAMPS);
    for (let i = 0; i < N_LAMPS; i++) {
      const h = houses[Math.floor(rnd(i * 6.1 + 2) * houses.length * 0.6)], s = 2.2 + rnd(i) * 1.4;
      dummy.position.set(h.x - h.w * 0.5 - 0.6, h.y + 2.6, h.z + h.d * 0.5 + 0.6); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, s, 1); dummy.updateMatrix();
      lamps.setMatrixAt(i, dummy.matrix);
    }
    lamps.frustumCulled = false;
    this.group.add(lamps);

    // far hills, as a silhouette
    const ridge = canvas(1024, 256, (c, W, H) => {
      c.clearRect(0, 0, W, H);
      for (const [base, amp, colr] of [[0.42, 46, '#232c66'], [0.62, 30, '#1c2456']] as const) {
        c.fillStyle = colr;
        c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) c.lineTo(x, H * base - Math.sin(x * 0.006 + base * 9) * amp - Math.sin(x * 0.021 + base * 4) * amp * 0.4);
        c.lineTo(W, H); c.fill();
      }
    });
    const hills = new THREE.Mesh(new THREE.PlaneGeometry(640, 60), new THREE.MeshBasicMaterial({ map: ridge, transparent: true }));
    hills.position.set(10, 26, wallZ - 185);
    this.group.add(hills);

    // the sky: deep blue falling to a violet horizon, stars, long thin clouds
    const sky = canvas(1024, 512, (c, W, H) => {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#070b26'); g.addColorStop(0.45, '#141c52'); g.addColorStop(0.78, '#2e3682'); g.addColorStop(1, '#5a4c92');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 420; i++) {
        const s = rnd(i * 2.2) > 0.93 ? 2.6 : 1.3;
        c.fillStyle = `rgba(${220 + rnd(i) * 35},${225 + rnd(i * 3) * 30},255,${0.35 + rnd(i * 5) * 0.65})`;
        c.fillRect(rnd(i * 3.1) * W, Math.pow(rnd(i * 7.3), 1.4) * H * 0.8, s, s);
      }
      for (let i = 0; i < 7; i++) {
        const x = rnd(i * 4.1) * W, y = H * (0.42 + rnd(i * 2.7) * 0.36), w = 150 + rnd(i) * 220;
        const cg = c.createRadialGradient(x, y, 0, x, y, w);
        cg.addColorStop(0, 'rgba(120,120,190,0.34)'); cg.addColorStop(1, 'rgba(120,120,190,0)');
        c.save(); c.translate(x, y); c.scale(1, 0.14); c.translate(-x, -y);
        c.fillStyle = cg; c.fillRect(x - w, y - w, w * 2, w * 2);
        c.restore();
      }
    });
    const dome = new THREE.Mesh(new THREE.PlaneGeometry(760, 380), new THREE.MeshBasicMaterial({ map: sky }));
    dome.position.set(10, 130, wallZ - 200);
    this.group.add(dome);
    // the moon, and the glow round it
    const moonGlow = canvas(256, 256, (c, W) => {
      const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      g.addColorStop(0, 'rgba(255,246,214,0.55)'); g.addColorStop(0.2, 'rgba(210,214,255,0.22)'); g.addColorStop(1, 'rgba(150,160,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, W);
    });
    const moonAt = new THREE.Vector3(27, 50, wallZ - 190);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(6.5, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6dc').multiplyScalar(1.7) }));
    disc.position.copy(moonAt);
    const aura = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: moonGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    aura.position.copy(moonAt).add(new THREE.Vector3(0, 0, -0.5));
    this.group.add(aura, disc);
  }

  update(t: number) {
    this.uniforms.uTime.value = t;
  }
}
