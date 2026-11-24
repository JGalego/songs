import * as THREE from 'three';
import { CanvasTex, MONO } from './text';
import { NAME_DECAY, USER_NAME } from './timeline';

/** Once the name is fully gone it glitches through these. */
const LOST = ['undefined', 'null', '"???"', 'undefined', '[REDACTED]', 'undefined', 'NaN'];

/** magenta -> cyan -> amber -> magenta (the same neon as the tunnel walls). */
const NEON = [new THREE.Color(1.0, 0.16, 0.72), new THREE.Color(0.12, 0.86, 1.0), new THREE.Color(1.0, 0.64, 0.16)];
export function neonAt(u: number, out = new THREE.Color()) {
  const x = (((u % 1) + 1) % 1) * 3;
  const i = Math.floor(x);
  const f = x - i;
  return out.copy(NEON[i]).lerp(NEON[(i + 1) % 3], f * f * (3 - 2 * f));
}

function nameAt(t: number) {
  let v = NAME_DECAY[0][1];
  for (const [t0, s] of NAME_DECAY) if (t >= t0) v = s;
  return v;
}

/** The far end of the tunnel: a coloured glow, and what's left of user.name during the choruses. */
export class Edge {
  readonly group = new THREE.Group();
  private glowMat: THREE.MeshBasicMaterial;
  private label = new CanvasTex(1400, 180);
  private labelMat: THREE.MeshBasicMaterial;
  private warm = new THREE.Color(1.0, 0.55, 0.3);
  private tint = new THREE.Color();

  constructor() {
    const glow = document.createElement('canvas');
    glow.width = glow.height = 256;
    const g = glow.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    this.glowMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(glow), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), this.glowMat);
    glowMesh.position.z = -48;
    this.group.add(glowMesh);

    this.labelMat = new THREE.MeshBasicMaterial({ map: this.label.texture, transparent: true, depthWrite: false });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(9.3, 1.2), this.labelMat);
    label.position.z = -13;
    label.renderOrder = 15;
    this.group.add(label);
  }

  update(t: number, opts: { opacity: number; bass: number; kick: number; hot: number; chorus: number; nameOn: number }) {
    const { opacity, bass, kick, hot, chorus, nameOn } = opts;

    // the light at the end of the tunnel: a dim warm ember in the verses, neon in the choruses, red-hot at the end
    neonAt(t * 0.05, this.tint).lerp(this.warm, 1 - chorus).lerp(new THREE.Color(1, 0.2, 0.1), hot);
    this.glowMat.color.copy(this.tint);
    this.glowMat.opacity = Math.min(1, opacity) * (0.1 + chorus * (0.4 + bass * 0.5 + kick * 0.25) + hot * 0.3);

    const state = nameAt(t);
    const lost = state === 'undefined';
    const value = lost ? LOST[Math.floor(t * 2.5) % LOST.length] : state;
    const glitchy = Math.floor(t * 12) % 9 === 0;
    // a corrupted name sometimes flickers back to what it was
    const remember = !lost && state !== `"${USER_NAME}"` && Math.floor(t * 7) % 11 === 0;
    const color = lost ? '#ff5a4a' : state === `"${USER_NAME}"` ? '#7ff3ff' : '#ff6ad5';
    this.label.draw(`${value}|${glitchy}|${remember}`, (ctx) => {
      ctx.textBaseline = 'middle';
      ctx.font = `700 92px ${MONO}`;
      ctx.fillStyle = 'rgba(4, 6, 14, 0.82)';
      ctx.beginPath();
      ctx.roundRect(40, 22, 1320, 140, 20);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const shown = remember ? `"${USER_NAME}"` : value;
      const key = 'user.name → ';
      const w = ctx.measureText(key + shown).width;
      const x = 700 - w / 2 + (glitchy ? 12 : 0);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8a96b0';
      ctx.fillText(key, x, 92);
      const vx = x + ctx.measureText(key).width;
      ctx.shadowColor = color;
      ctx.shadowBlur = 28;
      ctx.fillStyle = remember ? 'rgba(255,255,255,0.55)' : color;
      ctx.fillText(shown, vx, 92);
      ctx.shadowBlur = 0;
      if (glitchy || remember) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,60,60,0.7)';
        ctx.fillText(shown, vx - 18, 92);
      }
    });
    this.labelMat.opacity = nameOn * Math.min(1, opacity);
  }
}
