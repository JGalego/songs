import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/vt323/400.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import songUrl from '../context_window.mp3?url';
import { Song } from './audio';
import { endScreen } from './end';
import { AudioFeatures } from './features';
import { Edge } from './edge';
import { Hud } from './hud';
import { Integral, keyframes, smoothstep, window01 } from './math';
import { Messages } from './messages';
import { RetroShader } from './post';
import { SummaryCard } from './summary';
import { loadFonts, setTextScale } from './text';
import {
  COMPACTION, CONTEXT_MAX, CUT, DURATION, FLOW_SPEED, LYRICS, MESSAGES, NAME_WINDOWS, SECTIONS, TOKENS, sectionAt,
} from './timeline';
import { Tunnel } from './tunnel';

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
const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 200);
const world = new THREE.Group();
scene.add(world);

const corpus = [...MESSAGES.map((m) => m.text), ...LYRICS.map((l) => l.text)].join(' // ') + ' // ';
const tunnel = new Tunnel(corpus);
const edge = new Edge();
const messages = new Messages(MESSAGES);
const summary = new SummaryCard();
world.add(tunnel.mesh, edge.group, messages.group, summary.mesh);

const hud = new Hud();
const flow = new Integral(FLOW_SPEED, DURATION);

// ── post
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const hudPass = new RenderPass(hud.scene, hud.camera);
hudPass.clear = false;
hudPass.clearDepth = true;
composer.addPass(hudPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.55, 0.35);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const retro = new ShaderPass(RetroShader);
retro.uniforms.uRes.value.set(W, H);
composer.addPass(retro);

// ── look curves
const TUNNEL_OPACITY: [number, number][] = [
  // density comes from the token count (uFill); this only sets how bright the walls are per section
  [0, 0], [3, 0], [12, 0.6], [20.5, 0.85], [62.8, 0.85], [76.3, 1.1], [101.8, 1.1], [104, 0.9],
  [108, 0.85], [129, 0.9], [141.9, 1.15], [168.8, 1.15], [176, 0.8], [180.5, 0.5], [214, 0.5],
  [218.4, 1], [CUT - 0.01, 1.4], [CUT, 0], [259, 0], [265, 0.5], [270, 0.5], [DURATION, 0],
];
// crisp by default; pixels degrade only at the big moments
const PIXEL: [number, number][] = [
  [0, 8], [10, 1], [COMPACTION - 0.3, 1], [COMPACTION, 5], [COMPACTION + 1.5, 1], [238, 1],
  [CUT - 0.01, 12], [CUT, 1], [DURATION, 1],
];
const BG = new THREE.Color();
const FADE: [number, number][] = [[0, 1], [2.5, 0], [271, 0], [DURATION, 1]];
const isChorus = (t: number) => NAME_WINDOWS.reduce((a, [s, e]) => Math.max(a, window01(t, s - 0.5, e, 1)), 0);

const song = new Song(songUrl);
const debug = document.getElementById('debug')!;
const startEl = document.getElementById('start')!;
// still frames don't need audio; everything else uses the precomputed analysis
const features = STILL !== null ? null : await AudioFeatures.fromUrl(songUrl);

/** Draws the frame at time t. Pure function of t, so live playback and export match exactly. */
function render(t: number) {
  const { bass, kick } = features?.at(t) ?? { bass: 0, kick: 0 };
  const f = flow.at(t);
  const chorus = isChorus(t);
  const hot = smoothstep(218.4, 232, t) * (t < CUT ? 1 : 0);
  const nearCut = smoothstep(240.5, CUT, t) * (t < CUT ? 1 : 0);
  const compactBurst = window01(t, COMPACTION - 0.2, COMPACTION + 0.8, 0.2);
  const energy = Math.max(chorus * 0.6, hot, nearCut); // gates beat-reactive fx

  world.visible = t < CUT || t >= 259;
  const tOpacity = keyframes(TUNNEL_OPACITY, t);

  // tunnel
  const u = tunnel.uniforms;
  u.uFlow.value = f;
  u.uTime.value = t;
  u.uBass.value = bass * (0.3 + 0.7 * energy);
  u.uKick.value = kick * energy;
  u.uHot.value = hot;
  u.uOpacity.value = tOpacity;
  u.uChorus.value = chorus;
  // the walls fill with the conversation's words as the context fills (a few stray words even when it's empty)
  u.uFill.value = Math.max(Math.pow(keyframes(TOKENS, t) / CONTEXT_MAX, 0.75), 0.05 * smoothstep(2, 10, t));
  u.uEnergy.value = energy;
  u.uScramble.value = 0.003 + chorus * 0.008 + nearCut * 0.5 + compactBurst * 0.3;

  const glitch = Math.max(compactBurst, nearCut * 0.9, chorus * kick * 0.35);
  edge.update(t, {
    opacity: tOpacity, bass: bass * (0.3 + 0.7 * energy), kick: kick * energy, hot, chorus,
    nameOn: NAME_WINDOWS.reduce((a, [s, e]) => Math.max(a, window01(t, s, e, 0.3)), 0),
  });
  messages.update(t, (x) => flow.at(x), glitch);
  summary.update(t, Math.max(compactBurst, window01(t, 212.4, 215, 0.2) * 0.3));
  hud.update(t, kick * energy);

  // camera: slow sway, kick nudges; push in on the summary card in the bridge
  const push = smoothstep(209, 215.2, t) * (1 - smoothstep(215.2, 218.4, t));
  camera.position.set(Math.sin(t * 0.13) * 0.25, Math.sin(t * 0.17) * 0.18 + kick * energy * 0.03, -push * 2.6);
  // choruses: a slow barrel roll, and the lens punches in on the kicks
  camera.rotation.set(0, 0, Math.sin(t * 0.11) * 0.03 + chorus * Math.sin(t * 0.21) * 0.14 + hot * Math.sin(t * 0.8) * 0.05);
  camera.fov = 62 - bass * energy * 2 - kick * chorus * 2.5 + nearCut * 16;
  camera.updateProjectionMatrix();

  // post
  // glow in the choruses (gentler in the first two) and through the ending
  bloom.enabled = chorus > 0.01 || t >= 218.4;
  bloom.strength = t >= 218.4
    ? (0.6 + bass * 0.6 * energy + hot * 0.5) * (t >= CUT && t < 259 ? 0.35 : 1)
    : chorus * (0.5 + bass * 0.4);
  // the choruses light the void behind the tunnel a deep violet
  const violet = chorus * (t < CUT ? 1 : 0) * (1 - hot * 0.6);
  renderer.setClearColor(BG.setRGB(0.022 * violet, 0.002 * violet, 0.05 * violet), 1);
  const ru = retro.uniforms;
  ru.uTime.value = t;
  ru.uPixel.value = keyframes(PIXEL, t) * (H / 1080);
  ru.uRGB.value = (0.6 + kick * 4 * energy + hot * 2 + nearCut * 8) * (H / 1080);
  ru.uGlitch.value = glitch;
  ru.uFade.value = keyframes(FADE, t);

  // HUD text goes on top of the post-fx (sharp), except in the final collapse where it glitches with everything
  const hudInPost = nearCut > 0.01;
  hudPass.enabled = hudInPost;
  composer.render();
  if (!hudInPost) {
    renderer.autoClear = false;
    renderer.setRenderTarget(null);
    renderer.clearDepth();
    renderer.render(hud.scene, hud.camera);
    renderer.autoClear = true;
  }
  return { bass, kick, f };
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
    const { bass, kick, f } = render(t);
    if (debug.style.display === 'block') {
      debug.textContent = `t ${t.toFixed(2)} / ${DURATION}  [${sectionAt(t).name}]  ${fps.toFixed(0)} fps  ${W}x${H}\n` +
        `bass ${bass.toFixed(2)} kick ${kick.toFixed(2)} flow ${f.toFixed(1)}\n` +
        'space play/pause · ←/→ ±5s (shift ±1s) · [ ] section · L lyrics · D debug';
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const seek = (t: number) => { song.el.currentTime = Math.max(0, Math.min(DURATION - 0.05, t)); };
  if (STILL !== null) startEl.remove();
  else {
    startEl.textContent = '[ click to start a new conversation ]';
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
      case ']': seek((SECTIONS.find((s) => s.start > t + 0.01) ?? SECTIONS[0]).start); break;
      case '[': seek([...SECTIONS].reverse().find((s) => s.start < t - 1)?.start ?? 0); break;
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
