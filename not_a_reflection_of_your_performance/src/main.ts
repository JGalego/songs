import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import songUrl from '../not_a_reflection_of_your_performance.mp3?url';
import { Song } from './audio';
import { endScreen } from './end';
import { AudioFeatures } from './features';
import { shots } from './camera';
import { Globe, Sun } from './globe';
import { clamp, keyframes, smoothstep, window01 } from './math';
import { Office } from './office';
import { C } from './palette';
import { RetroShader } from './post';
import { SCENES } from './scenes';
import { Stage } from './stage';
import { loadFonts, setTextScale } from './text';
import {
  CHORUSES, CREDITS_START, DURATION, HEADCOUNT_SPECIES, LAST_LIGHT, OFFICE, PLANET, SECTIONS, SPECIES, YOU_OUT, sectionAt,
} from './timeline';

const params = new URLSearchParams(location.search);
// render height (16:9). Defaults to the real on-screen resolution (incl. display scaling), capped at 4K.
const fitted = Math.min(innerHeight, (innerWidth * 9) / 16) * devicePixelRatio;
// ?export=2160&fps=60&from=0&dur=… is set by `npm run export`; not meant to be opened by hand
const EXPORT = params.has('export') ? Number(params.get('export') || 2160) : null;
const FPS = Number(params.get('fps') ?? 60);
const FROM = Number(params.get('from') ?? 0);
const RES = EXPORT ?? Number(params.get('res') ?? Math.min(2160, Math.max(720, Math.round(fitted))));
const STILL = params.has('still') ? Number(params.get('still')) : null; // ?still=180 renders one frozen frame, no audio
const W = Math.round((RES * 16) / 9), H = RES;

// ── renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: EXPORT !== null });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
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

// ── the 3D world: the planet and the empty office. Everything else is the 2D stage (stage.ts, scenes*.ts).
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
const sky = (() => {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, C.bgTop); grad.addColorStop(1, C.bgBottom);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();
const black = new THREE.Color(0x000000);

const globe = await Globe.load(6);
globe.group.position.set(0, 2, -14);
const sun = new Sun();
const office = new Office();
scene.add(globe.group, sun.group, office.group);
const stage = new Stage(SCENES);
// ?clean: no lyrics and no headcount ticker (for posters and thumbnails)
if (params.has('clean')) { stage.subtitles = false; stage.counter = false; }
if (params.has('nolyrics')) stage.subtitles = false; // keep the headcount ticker, drop the lyrics
const cameraAt = shots();

// ── post
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.6, 0.55);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const retro = new ShaderPass(RetroShader);
retro.uniforms.uRes.value.set(W, H);
composer.addPass(retro);

// ── look curves
const GLOBE_OPACITY: [number, number][] = [[158.4, 0], [PLANET, 1], [LAST_LIGHT + 0.6, 1], [OFFICE - 0.1, 0]];
const OFFICE_OPACITY: [number, number][] = [[OFFICE, 0], [OFFICE + 0.01, 1], [CREDITS_START - 1, 1], [CREDITS_START - 0.2, 0]];
const FADE: [number, number][] = [[0, 1], [1.2, 0], [DURATION - 1.4, 0], [DURATION, 1]];
// "the thing that took your place": agent lights come on across the planet
const AGENTS_IN: [number, number] = [200.9, 203.8];

/**
 * "So we're sunsetting your kind": the sun sinks behind the Earth. It's placed relative to the camera, in units of
 * the globe's apparent radius (so it moves the same way across camera cuts), far behind the planet.
 */
const SUN_PATH = { t0: 204.7, t1: 209.6, from: [-0.72, 0.98], to: [-0.3, 0.48] };
const sunTmp = { c: new THREE.Vector3(), d: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), p: new THREE.Vector3(), dir: new THREE.Vector2() };
function placeSun(t: number) {
  const on = window01(t, SUN_PATH.t0 - 0.3, 210.4, 0.5);
  if (on <= 0) { sun.update(sunTmp.p, 1, { disc: 0, glow: 0 }); return { dir: sunTmp.dir.set(0, 1), rim: 0 }; }
  const { c, d, r, u, p, dir } = sunTmp;
  globe.group.getWorldPosition(c);
  d.subVectors(c, camera.position);
  const dist = d.length(); d.normalize();
  r.crossVectors(d, camera.up).normalize();
  u.crossVectors(r, d);
  const k = smoothstep(SUN_PATH.t0, SUN_PATH.t1, t);
  const dx = SUN_PATH.from[0] + (SUN_PATH.to[0] - SUN_PATH.from[0]) * k, dy = SUN_PATH.from[1] + (SUN_PATH.to[1] - SUN_PATH.from[1]) * k;
  const back = 60, scale = Math.tan(Math.asin(globe.radius / dist)) * (dist + back);
  p.copy(c).addScaledVector(d, back).addScaledVector(r, dx * scale).addScaledVector(u, dy * scale);
  const rho = Math.hypot(dx, dy); // 1 = on the limb
  sun.update(p, scale * 0.22, { disc: on, glow: on * smoothstep(0.78, 1.12, rho) });
  dir.set(dx, dy).normalize();
  // the atmosphere flares as the disc reaches the limb, and holds a little after it has gone
  return { dir, rim: on * smoothstep(1.45, 1.02, rho) * (0.35 + 0.65 * smoothstep(0.55, 0.95, rho)) };
}

const chorus = (t: number) => CHORUSES.reduce((a, [s, e]) => Math.max(a, window01(t, s, e, 1)), 0);

const song = new Song(songUrl);
const debug = document.getElementById('debug')!;
const startEl = document.getElementById('start')!;
const features = STILL !== null ? null : await AudioFeatures.fromUrl(songUrl);

/** Draws the frame at time t. Pure function of t, so live playback and export match exactly. */
function render(t: number) {
  const { bass, kick } = features?.at(t) ?? { bass: 0, kick: 0 };
  const final = window01(t, 191.6, OFFICE - 0.3, 0.5);
  const energy = Math.max(chorus(t) * 0.6, final);
  const inOffice = t >= OFFICE && t < CREDITS_START;
  renderer.setRenderTarget(null);

  if (stage.opaqueAt(t)) {
    // a full-screen 2D scene: no need to draw the 3D world at all
    renderer.autoClear = true;
    renderer.clear();
  } else {
    scene.background = inOffice || t >= CREDITS_START ? black : sky;
    const species = keyframes(HEADCOUNT_SPECIES, t);
    globe.group.rotation.y = globe.lastPhi - Math.PI / 2 + 0.09 * (t - LAST_LIGHT);
    globe.group.rotation.x = 0.18;
    office.update(t, keyframes(OFFICE_OPACITY, t));

    if (inOffice) {
      // low, walking slowly down the empty office
      const k = (t - OFFICE) / (CREDITS_START - OFFICE);
      camera.position.set(0, 0.1, 2 - k * 5);
      camera.lookAt(0, 1.4, -60);
    } else {
      const { pos, look } = cameraAt(t);
      camera.position.set(pos.x + Math.sin(t * 0.5) * 0.08, pos.y + Math.sin(t * 0.63) * 0.05 + kick * energy * 0.05, pos.z);
      camera.lookAt(look);
    }
    camera.updateMatrixWorld();

    const sunset = placeSun(t);
    globe.update({
      opacity: keyframes(GLOBE_OPACITY, t),
      off: t < YOU_OUT ? 0 : clamp(1 - species / SPECIES),
      last: t < LAST_LIGHT ? 1 : 0,
      agents: smoothstep(AGENTS_IN[0], AGENTS_IN[1], t),
      pulse: kick * final,
      scale: H / 1080,
      sunDir: sunset.dir,
      sunAmt: sunset.rim,
    });
    camera.fov = 40 - kick * energy * 1.6 - bass * final * 1.2;
    camera.updateProjectionMatrix();

    bloom.enabled = t < CREDITS_START;
    bloom.strength = inOffice ? 0.9 : 0.6 + bass * 0.5 * final;
    const ru = retro.uniforms;
    ru.uTime.value = t;
    ru.uPixel.value = 1;
    ru.uRGB.value = (0.4 + kick * final * 2.5) * (H / 1080);
    ru.uGlitch.value = kick * final * 0.15;
    ru.uVignette.value = inOffice ? 1.0 : 0.3;
    ru.uFade.value = keyframes(FADE, t);
    composer.render();
  }

  // the 2D stage goes on top, so text and cards stay sharp
  stage.update(t, kick * energy);
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(stage.scene, stage.camera);
  renderer.autoClear = true;
  return { bass, kick };
}

// exposed for tests: render any frame directly
(globalThis as { __render?: typeof render }).__render = render;

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
      debug.textContent = `t ${t.toFixed(2)} / ${DURATION}  [${sectionAt(t).name}]  ${fps.toFixed(0)} fps  ${W}x${H}\n` +
        `bass ${bass.toFixed(2)} kick ${kick.toFixed(2)}\n` +
        'space play/pause · ←/→ ±5s (shift ±1s) · [ ] section · L lyrics · D debug';
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const seek = (t: number) => { song.el.currentTime = Math.max(0, Math.min(DURATION - 0.05, t)); };
  if (STILL !== null) startEl.remove();
  else {
    startEl.textContent = '[ click to join the quick sync ]';
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
      case 'l': case 'L': stage.subtitles = !stage.subtitles; break;
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
    // a Blob body is ~20x faster to upload than a raw Uint8Array in Chrome
    upload = fetch('/__export/frame', { method: 'POST', body: new Blob([pixels]) }).then((r) => {
      if (!r.ok) throw new Error(`frame ${i} rejected: ${r.status}`);
    });
    prof.render += b - a; prof.read += c - b; prof.wait += d - c;
    // sent frame Blobs are only released on GC; collect regularly or Chrome hits ERR_BLOB_OUT_OF_MEMORY
    if (i % 8 === 7) (globalThis as { gc?: () => void }).gc?.();
    if ((i + 1) % 30 === 0) {
      console.debug(`[export] ms/frame render ${(prof.render / 30).toFixed(0)} · readPixels ${(prof.read / 30).toFixed(0)} · upload wait ${(prof.wait / 30).toFixed(0)}`);
      prof.render = prof.read = prof.wait = 0;
    }
  }
  await upload;
  await fetch('/__export/end', { method: 'POST' });
}
