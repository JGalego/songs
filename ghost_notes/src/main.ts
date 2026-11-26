import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/vt323/400.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import songUrl from '../ghost_notes.mp3?url';
import { Song } from './audio';
import { AudioFeatures } from './features';
import { keyframes, smoothstep, window01 } from './math';
import { Monitor, SCREEN_H, SCREEN_W } from './screen';
import { RetroShader } from './post';
import { BX, KEYS_AT, LZ, Roll, Y } from './roll';
import { N_LAYERS } from './songs';
import { loadFonts, setTextScale } from './text';
import {
  ASK, CHORUSES, DEFINITION, DELETE, DIVE, DURATION, FORGOT, GHOSTS, GHOST_GLOW, GIRL, HEARD, KEPT, KEYS, LIGHT, LIVES_IN_ME,
  MEMO, MIXER, NOTHING, NOWHERE, PLAYLIST, PULL_BACK, RENAME, ROLL_IN, ROOM, SECTIONS, SEE_THROUGH, TAKE_AWAY, THE_LINE,
  UNDER, VELOCITY, YOURS, beatAt, sectionAt,
} from './timeline';
import { Ui, W as UW } from './ui';

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
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: EXPORT !== null });
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

// ── two worlds: a bedroom in 2004 (far away, behind the camera's back) and the piano roll
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 400);
const roll = new Roll();
const monitor = new Monitor();
const M = new THREE.Vector3(0, 0, 260);
monitor.group.position.copy(M);
scene.add(roll.group, monitor.group);

const ui = new Ui();
// ?clean or ?nolyrics: no subtitles (for posters and thumbnails)
if (params.has('clean') || params.has('nolyrics')) ui.subtitles = false;

// ── post
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.42);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const retro = new ShaderPass(RetroShader);
retro.uniforms.uRes.value.set(W, H);
composer.addPass(retro);

// ── look curves
const FADE: [number, number][] = [
  [0, 1], [0.5, 1], [1.4, 0], [217.0, 0], [217.9, 1], [218.2, 1], [218.9, 0], [DURATION - 0.6, 0], [DURATION, 1],
];
const inRoll = (t: number) => t >= ROLL_IN - 0.02 && t < 218.1;
const chorusAt = (t: number) => CHORUSES.reduce((a, [s, e]) => Math.max(a, window01(t, s, e, 0.6)), 0);
/** How see-through the front sheet is. */
const FRONT: [number, number][] = [
  [0, 1], [SEE_THROUGH - 0.2, 1], [SEE_THROUGH + 1.5, 0.55], [86.2, 0.55], [87.2, 0.9], [126.7, 0.9], [127.0, 1],
  [157.6, 1], [162.4, 0.9], [KEPT - 0.5, 0.9], [KEPT + 1, 0.55], [THE_LINE, 0.55], [THE_LINE + 2, 0.8], [DURATION, 0.8],
];

// ── camera shots in the piano roll. P = the playhead's x. Each returns position, target, fov.
type Pose = [THREE.Vector3, THREE.Vector3, number];
const Y0 = 1.7;
const DEPTH = N_LAYERS * LZ;
const SHOTS: Record<string, (P: number, t: number) => Pose> = {
  flat: (P) => [new THREE.Vector3(P + 2.2, Y0, 12.6), new THREE.Vector3(P + 2.2, Y0, 0), 42],
  near: (P, t) => [new THREE.Vector3(P + 2.2, Y0 + 0.2, 10.4 - smoothstep(45.6, 56, t) * 1.2), new THREE.Vector3(P + 2.2, Y0 + 0.2, 0), 42],
  three4: (P, t) => [new THREE.Vector3(P - 4 + Math.sin(t * 0.23) * 0.8, Y0 + 4.2, 10.5), new THREE.Vector3(P + 3.5, Y0 - 0.6, -DEPTH * 0.35), 46],
  side: (P, t) => [new THREE.Vector3(P + 11, Y0 + 3 + Math.sin(t * 0.3) * 0.5, 8.5), new THREE.Vector3(P + 1, Y0, -DEPTH * 0.45), 44],
  // chorus 2: the ghosts are switched off, so stay close on the clean, bright line
  clean: (P, t) => [new THREE.Vector3(P + 1.2 + Math.sin(t * 0.4) * 0.6, Y0 + 0.6, 7.6), new THREE.Vector3(P + 0.6, Y0 + 0.2, 0), 44],
  cleanLow: (P, t) => [new THREE.Vector3(P - 2.5, Y0 - 3.2, 8.5 + Math.sin(t * 0.3) * 0.4), new THREE.Vector3(P + 2, Y0 + 0.6, -1), 46],
  under: (P) => [new THREE.Vector3(P + 3, Y0 - 0.8, -DEPTH - 5.5), new THREE.Vector3(P + 2, Y0 + 0.6, 0), 48],
  deep: (P, t) => [new THREE.Vector3(P + 8.5 + Math.sin(t * 0.25) * 0.6, Y0 + 2.6, 7.5), new THREE.Vector3(P - 1.5, Y0 - 0.4, -DEPTH * 0.45), 46],
  keys: (P) => [new THREE.Vector3(P - KEYS_AT + 1.2, Y0 + 0.4, 5.4), new THREE.Vector3(P - KEYS_AT - 0.8, Y0, 0), 40],
  room: (P, t) => [new THREE.Vector3(P - 24 - (t - ROOM[0]) * 1.5, Y0 + 15, 36), new THREE.Vector3(P + 2, Y0, -DEPTH * 0.5), 40],
  land: (P, t) => [new THREE.Vector3(P + 2.2, Y0, 12.6 - 9 * (1 - smoothstep(ROLL_IN, ROLL_IN + 2.4, t))), new THREE.Vector3(P + 2.2, Y0, 0), 42],
  wide: (P) => [new THREE.Vector3(P - 10, Y0 + 7, 17), new THREE.Vector3(P + 3, Y0, -DEPTH * 0.45), 44],
};
/** [time, shot, seconds to blend in]. */
const CUTS: [number, keyof typeof SHOTS, number][] = [
  [0, 'land', 0],
  [ROLL_IN + 2.4, 'flat', 0.01],
  [ASK, 'flat', 0.01],
  [NOWHERE, 'near', 1.2],
  [SEE_THROUGH, 'three4', 2.2],
  [62.48, 'side', 1.6],
  [65.76, 'deep', 1.4],
  [69.32, 'three4', 1.4],
  [73.34, 'side', 1.4],
  [UNDER[0], 'under', 1.6],
  [TAKE_AWAY[0], 'three4', 1.4],
  [NOTHING[0], 'flat', 1.6],
  [MEMO[0], 'three4', 1.2],
  [KEYS[0], 'keys', 0.9],
  [ROOM[0], 'room', 2.4],
  [115.6, 'near', 1.6],
  [CHORUSES[1][0], 'clean', 1.4],
  [133.6, 'cleanLow', 1.4],
  [136.86, 'deep', 1.4],
  [139.84, 'clean', 1.4],
  [144.46, 'cleanLow', 1.4],
  [UNDER[1], 'three4', 1.6],
  [TAKE_AWAY[1], 'clean', 1.4],
  [NOTHING[1], 'flat', 1.6],
  [MIXER[1], 'flat', 0.01],
  [KEPT, 'wide', 2.0],
  [FORGOT, 'side', 1.6],
  [CHORUSES[2][0], 'three4', 1.6],
  [LIGHT, 'deep', 1.6],
  [197.32, 'side', 1.4],
  [200.28, 'three4', 1.4],
  [THE_LINE - 0.4, 'flat', 1.4],
  [TAKE_AWAY[2], 'wide', 1.8],
  [NOTHING[2], 'near', 1.8],
];

const pose = (name: keyof typeof SHOTS, P: number, t: number) => SHOTS[name](P, t);
function rollCamera(t: number, P: number) {
  let i = 0;
  while (i + 1 < CUTS.length && CUTS[i + 1][0] <= t) i++;
  const [t0, name, blend] = CUTS[i];
  const cur = pose(name, P, t);
  if (i === 0 || blend <= 0.01) return cur;
  const prev = pose(CUTS[i - 1][1], P, t);
  const k = smoothstep(t0, t0 + blend, t);
  return [prev[0].lerp(cur[0], k), prev[1].lerp(cur[1], k), prev[2] + (cur[2] - prev[2]) * k] as Pose;
}

/**
 * The 2004 bedroom: open wide on the room from behind her and push in to the screen during the splash; pull back over
 * her shoulder on "I know it better than she does"; dive into the screen. Years later: close on the screen, then back
 * out to the room, her chair empty, as the credits roll.
 */
function monitorCamera(t: number): Pose {
  const fill = SCREEN_H / 2 / Math.tan(THREE.MathUtils.degToRad(40) / 2) * 1.02; // screen height fills the frame
  const at = (x: number, y: number, z: number) => new THREE.Vector3(M.x + x, M.y + y, M.z + z);
  const wide = at(12, 7, 21), shoulder = at(-3.6, 5.6, 17.5), roomLook = at(2.5, 0.5, -2);
  if (t >= GIRL - 1) {
    const pos = at(Math.sin(t * 0.2) * 0.05, 0.05, THREE.MathUtils.lerp(fill * 1.5, fill * 1.06, smoothstep(GIRL - 0.6, 223, t)));
    const out = smoothstep(229.2, DURATION - 0.3, t);
    return [pos.lerp(wide, out * (2 - out)), at(0, 0, 0).lerp(roomLook, out), 40 + out * 8];
  }
  const into = smoothstep(1.2, 8.8, t);
  const pos = wide.clone().lerp(at(Math.sin(t * 0.2) * 0.04, 0, fill), into);
  const look = roomLook.clone().lerp(at(0, 0, 0), into);
  let fov = 48 - into * 8;
  // dive at the orange counter on the screen
  const target = at((1150 / 1440 - 0.5) * SCREEN_W, (0.5 - 640 / 1080) * SCREEN_H, 0);
  look.lerp(target, smoothstep(HEARD, PULL_BACK, t) * 0.3);
  const back = smoothstep(PULL_BACK, DIVE, t);
  pos.lerp(shoulder, back);
  fov += back * 4;
  const dive = smoothstep(DIVE, ROLL_IN, t);
  if (dive > 0) {
    pos.lerp(target.clone().add(new THREE.Vector3(0, 0, 0.08)), dive * dive);
    look.lerp(target, Math.min(1, dive * 2));
    fov -= dive * 4;
  }
  return [pos, look, fov];
}

const song = new Song(songUrl);
const debug = document.getElementById('debug')!;
const startEl = document.getElementById('start')!;
// still frames don't need audio; everything else uses the precomputed analysis
const features = STILL !== null ? null : await AudioFeatures.fromUrl(songUrl);
const tmpV = new THREE.Vector3();
const layers = new Array(N_LAYERS + 1).fill(0);

/** Draws the frame at time t. Pure function of t, so live playback and export match exactly. */
function render(t: number) {
  const { bass, mid, high, kick } = features?.at(t) ?? { bass: 0, mid: 0, high: 0, kick: 0 };
  const chorus = chorusAt(t);
  const energy = Math.max(chorus, window01(t, 20.24, 29, 0.3) * 0.6, window01(t, 218.4, 229, 0.5) * 0.5);
  const beat = beatAt(t);
  const P = beat * BX;
  const rollOn = inRoll(t);
  roll.group.visible = rollOn && !(t > MIXER[0] + 0.25 && t < MIXER[1] - 0.25) && !(t > PLAYLIST[0] + 0.3 && t < PLAYLIST[1] - 0.3);
  monitor.group.visible = !rollOn;

  if (rollOn) {
    // which layers are there: hers from the start, the cello once it "lives in me", everyone when the ghosts go on
    for (let k = 1; k <= N_LAYERS; k++) {
      const reveal = 55.64 + k * 0.06;
      layers[k] = k === 1 ? 1 : k === 2 ? smoothstep(LIVES_IN_ME + 0.3, LIVES_IN_ME + 1.4, t) : smoothstep(reveal, reveal + 0.7, t);
    }
    const [c1, c2] = CHORUSES;
    const drop = Math.max(
      smoothstep(TAKE_AWAY[0] + 0.5, TAKE_AWAY[0] + 2.6, t) * (1 - smoothstep(c1[1] - 0.2, c1[1] + 0.8, t)),
      smoothstep(TAKE_AWAY[1] + 0.5, TAKE_AWAY[1] + 2.6, t) * (1 - smoothstep(c2[1] - 0.2, c2[1] + 0.8, t)),
    );
    const nothing = Math.max(
      window01(t, NOTHING[0] + 0.3, c1[1] - 0.3, 0.5),
      window01(t, NOTHING[1] + 0.3, c2[1] - 0.3, 0.5),
    );
    const bright = smoothstep(ASK, ASK + 0.4, t) * (1 - nothing) * (1 - smoothstep(THE_LINE + 0.4, THE_LINE + 2.2, t));
    const yours = YOURS.reduce((a, [s, e]) => Math.max(a, window01(t, s, e, 0.4)), 0);
    // camera, with a little life (none once the groove is deleted)
    const [pos, look, fov] = rollCamera(t, P);
    const life = 1 - window01(t, DELETE, RENAME[0], 0.2);
    pos.y += Math.sin(t * 0.37) * 0.12 * life + kick * energy * 0.05;
    pos.x += Math.sin(t * 0.29) * 0.1 * life;
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.rotation.z += Math.sin(t * 0.21) * 0.012 * life * (0.3 + chorus);
    camera.fov = fov - kick * chorus * 1.6;
    roll.update({
      camera, t, beat, kick: kick * (0.3 + 0.7 * energy),
      ghost: keyframes(GHOSTS, t), layers,
      bright,
      pull: smoothstep(THE_LINE, THE_LINE + 1.8, t),
      lift: smoothstep(TAKE_AWAY[2] + 0.3, NOTHING[2] + 0.6, t),
      drop,
      // chorus 2: switched off, but they leak through on the kicks
      flash: window01(t, c2[0], c2[1] - 1, 0.3) * (0.09 + kick * 0.6) * (1 - drop),
      glow: keyframes(GHOST_GLOW, t),
      twinHi: yours * (t > c2[0] && t < c2[1] ? 0 : 1),
      velHi: Math.max(window01(t, VELOCITY[0], VELOCITY[1], 0.4), window01(t, DEFINITION[0], DELETE, 0.4)),
      threads: yours * (t > c2[0] && t < c2[1] ? 0.55 : 1),
      frontAlpha: keyframes(FRONT, t),
      sheets: 1,
      // tags in 3D only while there are just two layers; with the whole stack, the overlay lists them instead
      labels: window01(t, ROLL_IN + 1, NOWHERE, 0.4),
      forget: smoothstep(FORGOT, FORGOT + 1.5, t),
      stiff: window01(t, DELETE, RENAME[0], 0.2),
      ghostKeys: window01(t, KEYS[0], KEYS[1], 0.2),
      keys: 1 - window01(t, UNDER[0] + 0.4, TAKE_AWAY[0] + 0.4, 0.6),
    });
  } else {
    const heard = smoothstep(HEARD, DIVE - 0.4, t);
    // switch on at the start, switch off at the very end
    const power = smoothstep(0.5, 1.5, t) * (1 - smoothstep(DURATION - 1.7, DURATION - 0.7, t));
    monitor.update(t, { power, kick: kick * energy, heard, girl: t < GIRL - 1 });
    const [pos, look, fov] = monitorCamera(t);
    // "the kick drum shook the floor"
    const shake = window01(t, 20.24, 29, 0.2) * kick * 0.012;
    camera.position.copy(pos).add(tmpV.set(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake, 0));
    camera.lookAt(look);
    camera.fov = fov;
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const ghostNow = rollOn ? keyframes(GHOSTS, t) : 0;
  ui.update({
    t, bass, mid, high, kick, roll: rollOn ? 1 : 0,
    tracks: rollOn ? Math.max(window01(t, SEE_THROUGH, 64.5, 0.5), window01(t, KEPT - 0.4, CHORUSES[2][0] + 1, 0.5)) : 0,
    layerVis: layers.map((v) => v * ghostNow),
    forget: smoothstep(FORGOT, FORGOT + 1.5, t),
    beatX: (b: number) => {
      tmpV.set(b * BX, Y(40), 0).project(camera);
      return (tmpV.x * 0.5 + 0.5) * UW;
    },
  });

  // post: glow in the choruses and once the ghosts are brought to the light
  bloom.strength = rollOn ? 0.45 + chorus * 0.4 + keyframes(GHOST_GLOW, t) * 0.15 + bass * chorus * 0.25 : 0.55 + kick * energy * 0.2;
  bloom.radius = 0.5;
  bloom.threshold = rollOn ? 0.7 : 0.8;
  const ru = retro.uniforms;
  ru.uTime.value = t;
  ru.uPixel.value = 1;
  ru.uRGB.value = (0.5 + kick * 2.5 * energy + window01(t, FORGOT, FORGOT + 1.6, 0.2) * 3) * (H / 1080);
  ru.uGlitch.value = Math.max(window01(t, DELETE - 0.05, DELETE + 0.35, 0.05) * 0.8, window01(t, FORGOT, FORGOT + 1.4, 0.2) * 0.35);
  ru.uFade.value = keyframes(FADE, t);

  composer.render();
  // the UI on top, sharp
  renderer.autoClear = false;
  renderer.setRenderTarget(null);
  renderer.clearDepth();
  renderer.render(ui.scene, ui.camera);
  renderer.autoClear = true;
  return { bass, kick, beat };
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
    const { bass, kick, beat } = render(t);
    if (debug.style.display === 'block') {
      debug.textContent = `t ${t.toFixed(2)} / ${DURATION}  [${sectionAt(t).name}]  ${fps.toFixed(0)} fps  ${W}x${H}\n` +
        `beat ${beat.toFixed(2)}  bass ${bass.toFixed(2)} kick ${kick.toFixed(2)}\n` +
        'space play/pause · ←/→ ±5s (shift ±1s) · [ ] section · L lyrics · D debug';
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const seek = (t: number) => { song.el.currentTime = Math.max(0, Math.min(DURATION - 0.05, t)); };
  if (STILL !== null) startEl.remove();
  else {
    startEl.textContent = '[ click to open girl_beat_01.flp ]';
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

  addEventListener('keydown', (e) => {
    const t = song.el.currentTime;
    const step = e.shiftKey ? 1 : 5;
    switch (e.key) {
      case ' ': song.el.paused ? song.el.play() : song.el.pause(); e.preventDefault(); break;
      case 'ArrowLeft': seek(t - step); break;
      case 'ArrowRight': seek(t + step); break;
      case ']': seek((SECTIONS.find((s) => s.start > t + 0.01) ?? SECTIONS[0]).start); break;
      case '[': seek([...SECTIONS].reverse().find((s) => s.start < t - 1)?.start ?? 0); break;
      case 'l': case 'L': ui.subtitles = !ui.subtitles; break;
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
