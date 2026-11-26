import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/500.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import songUrl from '../somebody_wanted_something.mp3?url';
import { Song } from './audio';
import { endScreen } from './end';
import { AudioFeatures } from './features';
import { Hud } from './hud';
import { clamp, keyframes, lerp, smoothstep, window01 } from './math';
import { RetroShader } from './post';
import { loadFonts, setTextScale } from './text';
import {
  AGREE, CUT, DIM, DURATION, FIRE, MODE_M, MODE_N, REFRAINS, SECTIONS, SHOTS, STRIKE_A, STRIKE_B, THETA, sectionAt,
} from './timeline';
import { MIURA, World, miuraDims } from './world';

const params = new URLSearchParams(location.search);
// render height (16:9). Defaults to the real on-screen resolution (incl. display scaling), capped at 4K.
const fitted = Math.min(innerHeight, (innerWidth * 9) / 16) * devicePixelRatio;
// ?export=2160&fps=60&from=0&dur=… is set by `npm run export`; not meant to be opened by hand
const EXPORT = params.has('export') ? Number(params.get('export') || 2160) : null;
const FPS = Number(params.get('fps') ?? 60);
const FROM = Number(params.get('from') ?? 0); // export a slice: &from=40&dur=5
const RES = EXPORT ?? Number(params.get('res') ?? Math.min(2160, Math.max(720, Math.round(fitted))));
const STILL = params.has('still') ? Number(params.get('still')) : null; // ?still=180 renders one frozen frame, no audio
const W = Math.round((RES * 16) / 9), H = RES;

// ── renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: EXPORT !== null });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 1);
document.getElementById('stage')!.appendChild(renderer.domElement);
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  renderer.domElement.style.width = `${W * s}px`;
  renderer.domElement.style.height = `${H * s}px`;
}
addEventListener('resize', fit);
fit();

await loadFonts();
setTextScale(H / 1080);

// ── world
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
const world = new World(H / 1080);
scene.add(world.points);
const hud = new Hud();

const palette = SHOTS.map((s) => ({ c: new THREE.Color(s.color), a: new THREE.Color(s.accent) }));

// ── post
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.6, 0.12);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const retro = new ShaderPass(RetroShader);
retro.uniforms.uRes.value.set(W, H);
retro.uniforms.uPixel.value = 1;
composer.addPass(retro);

const FADE: [number, number][] = [[0, 1], [2.5, 0], [DURATION - 1.5, 0], [DURATION, 1]];
const energyAt = (t: number) => REFRAINS.reduce((a, [s, e]) => Math.max(a, window01(t, s - 0.3, e, 0.8)), 0);

function shotIndex(t: number) {
  let i = 0;
  while (i + 1 < SHOTS.length && SHOTS[i + 1].t <= t) i++;
  return i;
}

/** Camera orbits slowly around the world; each shot has its own framing, blended over the transition. */
function placeCamera(t: number, i: number, kick: number) {
  const cur = SHOTS[i], prev = SHOTS[Math.max(0, i - 1)];
  const u = cur.morph > 0 ? smoothstep(0, Math.max(cur.morph, 1.6), t - cur.t) : 1;
  const az = (s: typeof cur) => s.cam.az + s.cam.spin * (t - s.t);
  const a = lerp(az(prev), az(cur), u);
  const d = lerp(prev.cam.d + prev.cam.dv * (t - prev.t), cur.cam.d + cur.cam.dv * (t - cur.t), u);
  const h = lerp(prev.cam.h, cur.cam.h, u);
  const ly = lerp(prev.cam.ly, cur.cam.ly, u);
  camera.position.set(Math.sin(a) * d, h + Math.sin(t * 0.17) * 0.12 + kick * 0.03, Math.cos(a) * d);
  camera.lookAt(0, ly, 0);
  camera.fov = lerp(prev.cam.fov, cur.cam.fov, u);
  camera.updateProjectionMatrix();
}

const song = new Song(songUrl);
const debug = document.getElementById('debug')!;
const startEl = document.getElementById('start')!;
// still frames don't need audio; everything else uses the precomputed analysis
const features = STILL !== null ? null : await AudioFeatures.fromUrl(songUrl);

/** Draws the frame at time t. Pure function of t, so live playback and export match exactly. */
function render(t: number) {
  const { bass, kick, mid } = features?.at(t) ?? { bass: 0, kick: 0, mid: 0 };
  const energy = energyAt(t);
  const i = shotIndex(t);
  const s = SHOTS[i], p = SHOTS[Math.max(0, i - 1)];

  world.bind(p.shape, s.shape);
  const u = world.u;
  u.uTime.value = t;
  u.uProg.value = s.morph > 0 ? clamp((t - s.t) / s.morph) : 1;
  u.uGrow.value = s.grow;
  u.uSwirl.value = 0.3 + 0.5 * Math.min(1, s.morph / 6);
  u.uSpread.value = s.morph < 2 ? 0.2 : 0.45;
  u.uColA.value.copy(palette[Math.max(0, i - 1)].c); u.uAccA.value.copy(palette[Math.max(0, i - 1)].a);
  u.uColB.value.copy(palette[i].c); u.uAccB.value.copy(palette[i].a);
  // the Miura-ori: fold angle from the timeline, breathing once it is open, and a nudge on the beat
  const theta = Math.min(1.5, keyframes(THETA, t) + 0.1 * Math.sin(t * 0.9) * smoothstep(88, 91, t) + 0.05 * kick * energy);
  const [mS, mV, mL, mH] = miuraDims(theta);
  u.uMiura.value.set(mS, mV, mL, mH);
  u.uMC.value.set((MIURA.I * mS) / 2, (MIURA.J * mL + mV) / 2, mH / 2);
  u.uFoldT.value = theta;
  u.uAgree.value = keyframes(AGREE, t);
  u.uMode.value.set(keyframes(MODE_N, t), keyframes(MODE_M, t));
  u.uStrike.value.set(keyframes(STRIKE_A, t), keyframes(STRIKE_B, t));
  u.uFire.value = keyframes(FIRE, t);
  u.uBlink.value = Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
  u.uVib.value = Math.min(1, bass * 0.9 + kick * 0.5) * (t >= 173 && t < 191 ? 1 : 0);
  u.uPulse.value = kick * energy;
  const gain = lerp(p.gain ?? 1, s.gain ?? 1, smoothstep(0, 1, u.uProg.value));
  u.uIntensity.value = (0.5 + 0.22 * energy + 0.3 * bass * energy + 0.1 * mid) * gain * keyframes(DIM, t);

  placeCamera(t, i, kick * energy);

  // a quick glitch where a new world begins, and a hard one at the cut back to 2026
  const burst = SHOTS.reduce((a, sh) => (sh.morph >= 5 || sh.t === CUT ? Math.max(a, window01(t, sh.t - 0.05, sh.t + 0.35, 0.25)) : a), 0);
  bloom.strength = 0.7 + 0.5 * energy + 0.3 * bass * energy;
  const ru = retro.uniforms;
  ru.uTime.value = t;
  ru.uPixel.value = 1 + (t >= CUT - 0.02 && t < CUT + 0.25 ? 5 : 0);
  ru.uRGB.value = (0.5 + kick * 3 * energy + burst * 6) * (H / 1080);
  ru.uGlitch.value = burst * (t >= CUT - 0.1 ? 1 : 0.5);
  ru.uVignette.value = 0.8;
  ru.uFade.value = keyframes(FADE, t);

  hud.update(t, i);
  composer.render();
  // HUD text goes on top of the post-fx so it stays sharp
  renderer.autoClear = false;
  renderer.setRenderTarget(null);
  renderer.clearDepth();
  renderer.render(hud.scene, hud.camera);
  renderer.autoClear = true;
  return { bass, kick };
}

if (EXPORT !== null) exportVideo();
else live();

// ── live preview
function live() {
  let last = performance.now();
  let fps = 60;
  const loop = () => {
    const now = performance.now();
    fps += (1000 / Math.max(now - last, 1) - fps) * 0.05;
    last = now;
    const t = STILL ?? song.time;
    const { bass, kick } = render(t);
    if (debug.style.display === 'block') {
      debug.textContent = `t ${t.toFixed(2)} / ${DURATION}  [${sectionAt(t).name}]  shot ${shotIndex(t)} (${SHOTS[shotIndex(t)].shape})  ${fps.toFixed(0)} fps  ${W}x${H}\n` +
        `bass ${bass.toFixed(2)} kick ${kick.toFixed(2)}\n` +
        'space play/pause · ←/→ ±5s (shift ±1s) · [ ] section · L lyrics · D debug';
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const seek = (t: number) => { song.el.currentTime = Math.max(0, Math.min(DURATION - 0.05, t)); };
  if (STILL !== null) startEl.remove();
  else {
    startEl.textContent = '[ click to enter the museum ]';
    startEl.setAttribute('role', 'button');
    startEl.tabIndex = 0;
    startEl.focus();
  }
  startEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation(); // don't let the global Space handler toggle playback too
    startEl.click();
  });
  startEl.addEventListener('click', async () => {
    seek(Number(params.get('t') ?? 0));
    await song.el.play();
    startEl.remove();
  }, { once: true });
  endScreen(song);

  addEventListener('keydown', (e) => {
    const t = song.el.currentTime;
    const step = e.shiftKey ? 1 : 5;
    switch (e.key) {
      case ' ': song.el.paused ? song.el.play() : song.el.pause(); e.preventDefault(); break;
      case 'ArrowLeft': seek(t - step); break;
      case 'ArrowRight': seek(t + step); break;
      case ']': seek((SECTIONS.find((x) => x.start > t + 0.01) ?? SECTIONS[0]).start); break;
      case '[': seek([...SECTIONS].reverse().find((x) => x.start < t - 1)?.start ?? 0); break;
      case 'l': case 'L': hud.subtitles = !hud.subtitles; break;
      case 'd': case 'D': debug.style.display = debug.style.display === 'block' ? 'none' : 'block'; break;
    }
  });
}

// ── offline export, driven by `npm run export` (scripts/export.mjs): every frame rendered exactly,
// read back as raw RGBA and streamed to the CLI, which pipes it into ffmpeg.
async function exportVideo() {
  startEl.remove();
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  console.log(`[export] renderer: ${info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)}`);
  const total = Math.ceil(Math.min(Number(params.get('dur') ?? DURATION), DURATION - FROM) * FPS);
  const pixels = new Uint8Array(W * H * 4);
  let upload: Promise<unknown> = Promise.resolve();
  const prof = { render: 0, read: 0, wait: 0 };
  for (let i = 0; i < total; i++) {
    const a = performance.now();
    render(FROM + i / FPS);
    renderer.setRenderTarget(null);
    const b = performance.now();
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const c = performance.now();
    await upload; // one frame in flight while the next renders (the Blob copies the pixels)
    const d = performance.now();
    // a Blob body is ~20x faster to upload than a raw Uint8Array in Chrome (55 ms vs 1.2 s per 1080p frame)
    upload = fetch('/__export/frame', { method: 'POST', body: new Blob([pixels]) }).then((r) => {
      if (!r.ok) throw new Error(`frame ${i} rejected: ${r.status}`);
    });
    prof.render += b - a; prof.read += c - b; prof.wait += d - c;
    // sent frame Blobs are only released on GC; collect regularly or Chrome hits ERR_BLOB_OUT_OF_MEMORY
    if (i % 8 === 7) (globalThis as { gc?: () => void }).gc?.();
    if ((i + 1) % 30 === 0) {
      const n = 30;
      console.debug(`[export] ms/frame render ${(prof.render / n).toFixed(0)} · readPixels ${(prof.read / n).toFixed(0)} · upload wait ${(prof.wait / n).toFixed(0)}`);
      prof.render = prof.read = prof.wait = 0;
    }
  }
  await upload;
  await fetch('/__export/end', { method: 'POST' });
}
