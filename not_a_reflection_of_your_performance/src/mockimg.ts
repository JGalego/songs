import { rnd, rr, type G } from './art';

export const MOCK_KINDS = 6;

/** A tiny procedural "photo" in a white frame, centred on (0, 0). `seed` picks the colours, `kind` the subject. */
export function mockImage(c: G, kind: number, seed: number, w = 92, h = 70) {
  const hue = Math.floor(rnd(seed * 3.1) * 360), hue2 = (hue + 40 + rnd(seed * 5.7) * 80) % 360;
  const col = (hh: number, s: number, l: number) => `hsl(${hh},${s}%,${l}%)`;
  c.save();
  c.shadowColor = 'rgba(5,6,20,0.45)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  rr(c, -w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 8); c.fillStyle = '#fffaf3'; c.fill();
  c.restore();
  c.save();
  rr(c, -w / 2, -h / 2, w, h, 4); c.clip();
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, col(hue, 70, 62)); g.addColorStop(1, col(hue2, 75, 78));
  c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
  const poly = (pts: number[][], fill: string) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h))); c.closePath(); c.fillStyle = fill; c.fill(); };
  const disc = (x: number, y: number, r: number, fill: string) => { c.beginPath(); c.arc(x * w, y * h, r * h, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
  switch (kind % MOCK_KINDS) {
    case 0: // mountains and a sun
      disc(0.2, -0.22, 0.17, 'rgba(255,248,220,0.95)');
      poly([[-0.6, 0.6], [-0.25, -0.05], [0.05, 0.6]], col(hue2, 35, 38));
      poly([[-0.2, 0.6], [0.2, -0.2], [0.65, 0.6]], col(hue2, 30, 28));
      break;
    case 1: // sunset over water
      disc(0, 0.02, 0.24, 'rgba(255,230,160,0.95)');
      c.fillStyle = col(hue, 55, 30); c.fillRect(-w / 2, 0.08 * h, w, h);
      c.fillStyle = 'rgba(255,230,160,0.55)'; for (let i = 0; i < 4; i++) c.fillRect(-(0.2 - i * 0.04) * w, (0.16 + i * 0.1) * h, (0.4 - i * 0.08) * w, 0.04 * h);
      break;
    case 2: // portrait
      c.fillStyle = col(hue2, 40, 40); c.beginPath(); c.ellipse(0, 0.62 * h, 0.34 * w, 0.3 * h, 0, Math.PI, 0); c.fill();
      disc(0, -0.08, 0.2, '#ffd9bd');
      c.fillStyle = col(hue, 30, 22); c.beginPath(); c.arc(0, -0.1 * h, 0.21 * h, Math.PI, 0); c.fill();
      break;
    case 3: // cat
      poly([[-0.2, -0.05], [-0.17, -0.38], [-0.04, -0.12]], '#3a3a4a'); poly([[0.2, -0.05], [0.17, -0.38], [0.04, -0.12]], '#3a3a4a');
      c.fillStyle = '#3a3a4a'; c.beginPath(); c.ellipse(0, 0.08 * h, 0.22 * w, 0.22 * h, 0, 0, Math.PI * 2); c.fill();
      disc(-0.08, 0.04, 0.045, '#ffe27a'); disc(0.08, 0.04, 0.045, '#ffe27a');
      poly([[-0.02, 0.14], [0.02, 0.14], [0, 0.18]], '#ff9fb4');
      break;
    case 4: // city skyline
      for (let i = 0; i < 6; i++) {
        const bw = 0.15 + rnd(seed + i) * 0.05, bh = 0.25 + rnd(seed * 2 + i * 3) * 0.4, bx = -0.46 + i * 0.16;
        c.fillStyle = col(hue2, 30, 20 + i * 2); c.fillRect(bx * w, (0.5 - bh) * h, bw * w, bh * h);
        c.fillStyle = 'rgba(255,226,140,0.85)'; for (let k = 0; k < 3; k++) c.fillRect((bx + 0.03) * w, (0.5 - bh + 0.06 + k * 0.12) * h, 0.04 * w, 0.04 * h);
      }
      break;
    default: // a tree on a hill
      c.fillStyle = col(hue2, 45, 34); c.beginPath(); c.ellipse(0, 0.7 * h, 0.7 * w, 0.4 * h, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#6b4a2f'; c.fillRect(-0.02 * w, 0.05 * h, 0.04 * w, 0.3 * h);
      disc(0, -0.08, 0.2, col(120, 45, 38)); disc(-0.1, 0, 0.14, col(125, 45, 42)); disc(0.1, 0, 0.14, col(115, 45, 42));
  }
  c.restore();
}
