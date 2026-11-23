import * as THREE from 'three';
import { EDGE_DIST } from './messages';
import { CanvasTex, MONO } from './text';

const NAMES = ['undefined', 'null', '"???"', 'undefined', '[REDACTED]', 'undefined', 'NaN'];

/** The far end of the tunnel: a thin ring, and the user.name label during the choruses. */
export class Edge {
  readonly group = new THREE.Group();
  private ringMat: THREE.MeshBasicMaterial;
  private label = new CanvasTex(1400, 180);
  private labelMat: THREE.MeshBasicMaterial;

  constructor() {
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xff9d5c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.3, 160), this.ringMat);
    ring.position.z = -EDGE_DIST;
    this.group.add(ring);

    this.labelMat = new THREE.MeshBasicMaterial({ map: this.label.texture, transparent: true, depthWrite: false });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(9.3, 1.2), this.labelMat);
    label.position.z = -19;
    label.renderOrder = 15;
    this.group.add(label);
  }

  update(t: number, opts: { opacity: number; bass: number; kick: number; hot: number; nameOn: number }) {
    const { opacity, bass, kick, hot, nameOn } = opts;
    this.ringMat.opacity = opacity * (0.35 + bass * 0.9 + kick * 0.6);
    this.ringMat.color.setRGB(1, 0.62 - hot * 0.45, 0.36 - hot * 0.25);

    const value = NAMES[Math.floor(t * 2.5) % NAMES.length];
    const glitchy = Math.floor(t * 12) % 9 === 0;
    this.label.draw(value + glitchy, (ctx) => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 92px ${MONO}`;
      const x = 700 + (glitchy ? 12 : 0);
      ctx.fillStyle = 'rgba(4, 6, 12, 0.72)';
      ctx.beginPath();
      ctx.roundRect(60, 22, 1280, 140, 20);
      ctx.fill();
      ctx.fillStyle = '#8fb1ff';
      ctx.fillText(`user.name → ${value}`, x, 92);
      if (glitchy) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,60,60,0.7)';
        ctx.fillText(`user.name → ${value}`, x - 18, 92);
      }
    });
    this.labelMat.opacity = nameOn * opacity;
  }
}
