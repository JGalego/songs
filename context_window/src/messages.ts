import * as THREE from 'three';
import { dissolveMaterial, type DissolveMaterial } from './materials';
import { hash, smoothstep, lerp, clamp } from './math';
import { CanvasTex, MONO, roundRect, wrap } from './text';
import { FOLD_START, COMPACTION, type Message } from './timeline';

const PX_PER_UNIT = 320;
const W = 1000;
export const EDGE_DIST = 34;
export const CARD_POS = new THREE.Vector3(0, 0.1, -7);

const STYLE = {
  user: { label: 'you', fg: '#e3ecff', bg: 'rgba(38, 58, 96, 0.88)', accent: '#7fa8ff' },
  assistant: { label: 'assistant', fg: '#ffeadb', bg: 'rgba(28, 16, 10, 0.55)', accent: '#ff9d5c' },
  file: { label: 'you · attachment', fg: '#e3ecff', bg: 'rgba(20, 26, 40, 0.88)', accent: '#7fa8ff' },
};

function drawBubble(m: Message): CanvasTex {
  const measure = document.createElement('canvas').getContext('2d')!;
  const pad = 36;
  const textFont = `400 40px ${MONO}`;
  measure.font = textFont;
  const text = m.who === 'file' ? `[+] ${m.text}` : m.text;
  const lines = wrap(measure, text, W - pad * 2 - 20);
  const lineH = 54;
  const h = pad + 40 + lines.length * lineH + (m.meta ? 44 : 0) + pad;

  const tex = new CanvasTex(W, Math.ceil(h));
  const s = STYLE[m.who];
  tex.draw('static', (ctx) => {
    ctx.fillStyle = s.bg;
    roundRect(ctx, 4, 4, W - 8, h - 8, 26);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = s.accent;
    if (m.who === 'file') ctx.setLineDash([14, 10]);
    if (m.who === 'assistant') {
      ctx.fillStyle = s.accent;
      ctx.fillRect(4, 18, 6, h - 36);
    } else {
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.setLineDash([]);

    ctx.textBaseline = 'top';
    ctx.font = `700 24px ${MONO}`;
    ctx.fillStyle = s.accent;
    ctx.fillText(s.label.toUpperCase(), pad + 6, pad - 6);

    ctx.font = textFont;
    ctx.fillStyle = s.fg;
    lines.forEach((l, i) => ctx.fillText(l, pad + 6, pad + 36 + i * lineH));

    if (m.meta) {
      ctx.font = `400 26px ${MONO}`;
      ctx.fillStyle = m.meta.startsWith('!') || m.meta.includes('source: none') ? '#ff6a5c' : '#8a96b0';
      ctx.fillText(m.meta, pad + 6, pad + 46 + lines.length * lineH);
    }
  });
  return tex;
}

interface Bubble { msg: Message; mesh: THREE.Mesh; mat: DissolveMaterial; w: number; h: number; index: number }

/** The chat messages: drift toward the edge, dissolve there; in the bridge they return as ghosts and get folded. */
export class Messages {
  readonly group = new THREE.Group();
  private bubbles: Bubble[] = [];

  constructor(messages: Message[]) {
    messages.forEach((msg, index) => {
      const tex = drawBubble(msg);
      const w = tex.w / PX_PER_UNIT, h = tex.h / PX_PER_UNIT;
      const mat = dissolveMaterial(tex.texture, w / h);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.renderOrder = 10;
      this.group.add(mesh);
      this.bubbles.push({ msg, mesh, mat, w, h, index });
    });
  }

  update(t: number, flowAt: (t: number) => number, glitch: number) {
    const flow = flowAt(t);
    const live = this.bubbles.filter((b) => t >= b.msg.t);

    for (const b of this.bubbles) {
      const { mesh, mat, msg } = b;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uGlitch.value = glitch;
      mat.uniforms.uTint.value.setRGB(1, 1, 1);
      mesh.visible = false;
      if (t < msg.t) continue;

      const age = t - msg.t;
      const side = msg.who === 'assistant' ? 1 : -1;
      const ghostPhase = !msg.loop && t >= COMPACTION - 0.2;

      if (!ghostPhase) {
        // newer messages push older ones back
        let push = 0;
        for (const o of live) if (o.msg.t > msg.t) push += 1.25 * smoothstep(0, 0.7, t - o.msg.t);
        const dist = msg.loop ? 3.6 + age * age * 1.6 : 3.6 + (flow - flowAt(msg.t)) + push;
        const dissolve = smoothstep(EDGE_DIST - 12, EDGE_DIST - 1, dist);
        if (dissolve >= 1) continue;
        const enter = smoothstep(0, 0.6, age);
        mesh.visible = true;
        mesh.renderOrder = 10;
        mesh.position.set(side * 1.05, 0.25 - (1 - enter) * 0.4 + Math.sin(t * 0.6 + b.index) * 0.05, -dist);
        mesh.scale.setScalar(lerp(0.92, 1, enter));
        mesh.rotation.set(0, -side * 0.06, Math.sin(t * 0.4 + b.index * 2) * 0.01);
        mat.uniforms.uOpacity.value = enter;
        mat.uniforms.uDissolve.value = dissolve;
        continue;
      }

      // ── bridge: ghosts of everything that was summarized, then folded into bullet points
      // an ellipse of ghosts framing the summary card
      const ang = (b.index / 12) * Math.PI * 2 + 0.3;
      const ghost = new THREE.Vector3(Math.cos(ang) * 7.6, Math.sin(ang) * 4.3, -12 - hash(b.index) * 3);
      const appear = smoothstep(COMPACTION + 0.5 + b.index * 0.15, COMPACTION + 2.5 + b.index * 0.15, t);
      const s0 = FOLD_START + b.index * 0.32;
      const fold = smoothstep(s0, s0 + 1.5, t);
      if (fold >= 1 || appear <= 0) continue;

      const target = new THREE.Vector3(CARD_POS.x, CARD_POS.y - 0.6, CARD_POS.z + 0.05);
      mesh.visible = true;
      mesh.renderOrder = fold > 0.35 ? 30 : 1; // ghosts behind the card, folded strips on top of it
      mesh.position.lerpVectors(ghost, target, fold * fold);
      mesh.position.y += Math.sin(t * 0.5 + b.index) * 0.08 * (1 - fold);
      mesh.scale.set(lerp(1.5, 0.55, fold), lerp(1.5, 0.03, smoothstep(0, 0.6, fold)), 1);
      mesh.rotation.set(0, 0, 0);
      const flicker = 0.75 + 0.25 * Math.sin(t * 23 + b.index * 7) * Math.sin(t * 3.1 + b.index);
      mat.uniforms.uOpacity.value = appear * clamp(0.45 * flicker + fold * 1.2) * (1 - smoothstep(0.85, 1, fold));
      mat.uniforms.uDissolve.value = 0;
      mat.uniforms.uTint.value.setRGB(lerp(0.62, 1.8, fold), lerp(0.68, 1.0, fold), lerp(0.78, 0.55, fold));
      mat.uniforms.uGlitch.value = Math.max(glitch, 0.25 * (1 - fold));
    }
  }
}
