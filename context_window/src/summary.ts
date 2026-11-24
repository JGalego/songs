import * as THREE from 'three';
import { dissolveMaterial, type DissolveMaterial } from './materials';
import { CARD_POS } from './messages';
import { smoothstep } from './math';
import { CanvasTex, MONO, cursor, roundRect, typed } from './text';
import { SUMMARY } from './timeline';

const W = 1200, H = 820;

/** The compaction summary from the spoken bridge, typed live as the words are said. */
export class SummaryCard {
  readonly mesh: THREE.Mesh;
  private tex = new CanvasTex(W, H);
  private mat: DissolveMaterial;

  constructor() {
    this.mat = dissolveMaterial(this.tex.texture, W / H);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(W / 230, H / 230), this.mat);
    this.mesh.position.copy(CARD_POS);
    this.mesh.renderOrder = 20;
  }

  update(t: number, glitch: number) {
    const appear = smoothstep(179.1, 180.4, t);
    const leave = smoothstep(215.2, 217.6, t);
    this.mesh.visible = appear > 0 && leave < 1;
    if (!this.mesh.visible) return;
    this.mat.uniforms.uDissolve.value = Math.max(1 - appear, leave);
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uGlitch.value = glitch;

    // each line types for up to 1.4s, or until the next one starts
    const shown = SUMMARY.map((l, i) => {
      const next = SUMMARY[i + 1]?.t ?? l.t + 3;
      return typed(l.text, t, l.t, Math.min(1.4, (next - l.t) * 0.8));
    });
    const lastIdx = shown.reduce((acc, s, i) => (s ? i : acc), -1);
    const cur = cursor(t);
    const hotFlicker = Math.floor(t * 10) % 7 === 0;

    this.tex.draw(shown.join('|') + cur + hotFlicker, (ctx) => {
      ctx.fillStyle = 'rgb(9, 11, 17)';
      roundRect(ctx, 6, 6, W - 12, H - 12, 22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 157, 92, 0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.textBaseline = 'top';
      ctx.font = `700 26px ${MONO}`;
      ctx.fillStyle = '#ff9d5c';
      ctx.fillText('⟲ CONTEXT COMPACTED · 199,872 → 3,112 TOKENS', 48, 40);
      ctx.fillStyle = 'rgba(255,157,92,0.25)';
      ctx.fillRect(48, 84, W - 96, 2);

      shown.forEach((s, i) => {
        const line = SUMMARY[i];
        const y = 116 + i * 78 + (i > 0 ? 14 : 0);
        ctx.font = i === 0 ? `700 42px ${MONO}` : `400 40px ${MONO}`;
        ctx.fillStyle = line.hot ? (hotFlicker ? '#ffffff' : '#ff6a5c') : line.dim ? '#6f7891' : '#e9ecf4';
        ctx.fillText(s + (i === lastIdx ? cur : ''), 48 + (line.hot && hotFlicker ? 6 : 0), y);
      });
    });
  }
}
