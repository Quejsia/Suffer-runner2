import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('c');
if (!canvas) throw new Error('SHORE DASH canvas not found');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 400, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x78c9f4);
scene.fog = new THREE.Fog(0x78c9f4, 55, 175);

const camera = new THREE.PerspectiveCamera(58, 2, 0.1, 260);
camera.position.set(0, 5.6, 10.5);

scene.add(new THREE.HemisphereLight(0xaadfff, 0x8b6a43, 1.8));
const sun = new THREE.DirectionalLight(0xffe2a6, 3.1);
sun.position.set(-25, 34, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 100;
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -10;
scene.add(sun);

const scoreEl = document.getElementById('scoreDisplay');
const livesEl = document.getElementById('livesDisplay');
const comboEl = document.getElementById('comboDisplay');
const overlay = document.getElementById('overlay');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');

const state = {
  mode: 'idle', score: 0, lives: 3, high: 0, time: 0, distance: 0,
  speed: 10.5, comboCount: 0, comboTimer: 0, travel: 0,
  laneOffset: 0, targetOffset: 0, y: 0, vy: 0, slideTimer: 0,
  invincible: 0, shake: 0, spawnTimer: 1.2, pickupTimer: .65, last: performance.now()
};
try { state.high = Number(localStorage.getItem('shoreDashHighScore')) || 0; } catch (_) {}

const PLAYER_Z = 4;
const PATH_SEGMENTS = 38;
const PATH_STEP = 5;
const pathParts = [];
const obstacles = [];
const pickups = [];
const particles = [];
const gltfLoader = new GLTFLoader();
const modelCache = new Map();
const ASSETS = {
  player: 'assets/models/player.glb',
  rock: 'assets/models/rock.glb',
  log: 'assets/models/log.glb',
  crab: 'assets/models/crab.glb',
  jellyfish: 'assets/models/jellyfish.glb'
};

function loadModel(path) {
  if (modelCache.has(path)) return modelCache.get(path);
  const promise = new Promise(resolve => gltfLoader.load(path, g => resolve(g.scene), undefined, () => resolve(null)));
  modelCache.set(path, promise);
  return promise;
}

function pathProfile(distance) {
  const center = Math.sin(distance * 0.045) * 4.2 + Math.sin(distance * 0.012 + 1.7) * 2.3;
  const width = THREE.MathUtils.clamp(10.5 + Math.sin(distance * 0.025 - 0.7) * 2.8 + Math.sin(distance * 0.008) * 1.8, 6.8, 15);
  return { center, width };
}

function createPathSegment() {
  const group = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(21, .28, PATH_STEP + .25),
    new THREE.MeshStandardMaterial({ color: 0x179bd0, roughness: .48, metalness: .04 })
  );
  water.position.y = -.22;
  water.receiveShadow = true;
  group.add(water);

  const sandMaterial = new THREE.MeshStandardMaterial({ color: 0xeac27a, roughness: .95 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(12, .32, PATH_STEP + .25), sandMaterial);
  const right = left.clone();
  left.position.set(-18, -.08, 0);
  right.position.set(18, -.08, 0);
  left.receiveShadow = right.receiveShadow = true;
  group.add(left, right);

  for (const side of [-1, 1]) {
    const palm = new THREE.Group();
    palm.position.set(side * (16 + Math.random() * 5), .2, (Math.random() - .5) * 2);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.14, .19, 2.4, 7), new THREE.MeshStandardMaterial({ color: 0x8a5a35, roughness: .9 }));
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    palm.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.8, 7, 5), new THREE.MeshStandardMaterial({ color: 0x2f8f55, roughness: .85 }));
    crown.scale.set(1.35, .55, 1);
    crown.position.y = 2.5;
    crown.castShadow = true;
    palm.add(crown);
    group.add(palm);
  }
  return group;
}
for (let i = 0; i < PATH_SEGMENTS; i++) {
  const part = createPathSegment();
  scene.add(part);
  pathParts.push(part);
}

const skyDome = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.MeshBasicMaterial({ color: 0x79c8f0, side: THREE.BackSide }));
scene.add(skyDome);

const player = new THREE.Group();
player.position.set(0, 0, PLAYER_Z);
scene.add(player);

const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, .16, 3.2, 1, 1, 3), new THREE.MeshStandardMaterial({ color: 0xf25f52, roughness: .45, metalness: .05 }));
board.castShadow = true;
player.add(board);
const playerBody = new THREE.Group();
playerBody.position.y = 1.15;
player.add(playerBody);

const shirt = new THREE.Mesh(new THREE.BoxGeometry(.78, .85, .48), new THREE.MeshStandardMaterial({ color: 0x286aa7, roughness: .75 }));
shirt.castShadow = true;
playerBody.add(shirt);
const head = new THREE.Mesh(new THREE.SphereGeometry(.35, 12, 8), new THREE.MeshStandardMaterial({ color: 0xd29b6f, roughness: .8 }));
head.position.y = .7;
head.castShadow = true;
playerBody.add(head);
const hair = new THREE.Mesh(new THREE.SphereGeometry(.37, 10, 7), new THREE.MeshStandardMaterial({ color: 0x2e211b, roughness: .95 }));
hair.scale.y = .62;
hair.position.y = .93;
hair.castShadow = true;
playerBody.add(hair);
for (const side of [-1, 1]) {
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.1, .11, .75, 7), new THREE.MeshStandardMaterial({ color: 0xd29b6f, roughness: .8 }));
  arm.rotation.z = side * .55;
  arm.position.set(side * .56, .12, 0);
  arm.castShadow = true;
  playerBody.add(arm);
}
const boardGlow = new THREE.PointLight(0x4ddcff, 1.2, 5);
boardGlow.position.y = .25;
player.add(boardGlow);

loadModel(ASSETS.player).then(model => {
  if (!model) return;
  while (playerBody.children.length) playerBody.remove(playerBody.children[0]);
  model.scale.setScalar(.95);
  model.position.y = .1;
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  playerBody.add(model);
});

function fallbackObstacle(type) {
  const group = new THREE.Group();
  if (type === 'rock') {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(.85, 1), new THREE.MeshStandardMaterial({ color: 0x647789, roughness: .92 }));
    mesh.scale.set(1.15, .85, 1);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  } else if (type === 'log') {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, 2.4, 9), new THREE.MeshStandardMaterial({ color: 0x85512f, roughness: .88 }));
    mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = true;
    group.add(mesh);
  } else if (type === 'crab') {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd7463e, roughness: .8 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(.46, 10, 7), mat);
    body.scale.set(1.25, .7, 1);
    body.castShadow = true;
    group.add(body);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.055, .065, .55, 6), mat);
      leg.rotation.z = side * (.8 + i * .12);
      leg.position.set(side * (.38 + i * .18), -.1, (i - 1) * .18);
      group.add(leg);
    }
  } else {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a74ef, roughness: .5, emissive: 0x2b1f6d, emissiveIntensity: .35 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 9), mat);
    bulb.scale.y = 1.2;
    bulb.castShadow = true;
    group.add(bulb);
    for (let i = 0; i < 5; i++) {
      const tent = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .55, 3, 5), mat);
      tent.position.set((i - 2) * .17, -.55, 0);
      tent.rotation.z = (i - 2) * .12;
      group.add(tent);
    }
  }
  return group;
}

function spawnObstacle() {
  const p = pathProfile(state.travel + 48);
  const roll = Math.random();
  const types = state.time > 14 ? ['rock', 'crab', 'log', 'jellyfish'] : ['rock', 'crab', 'log'];
  const type = types[Math.floor(Math.random() * types.length)];
  const host = new THREE.Group();
  const obstacle = { type, dist: state.travel + 48 + Math.random() * 34, offset: (Math.random() * 2 - 1) * p.width * .72, host, hit: false, phase: Math.random() * Math.PI * 2 };
  obstacle.visual = fallbackObstacle(type);
  host.add(obstacle.visual);
  scene.add(host);
  obstacle.visual.position.y = type === 'jellyfish' ? 1.55 : type === 'log' ? 1.45 : .45;
  obstacle.visual.scale.setScalar(type === 'jellyfish' ? .9 : .9);
  const path = ASSETS[type];
  if (path) loadModel(path).then(model => {
    if (!model || !host.parent) return;
    host.remove(obstacle.visual);
    model.scale.setScalar(type === 'log' ? .9 : .85);
    model.position.y = type === 'jellyfish' ? 1.55 : type === 'log' ? 1.45 : .45;
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    host.add(model);
    obstacle.visual = model;
  });
  obstacles.push(obstacle);
}

function spawnPickup() {
  const p = pathProfile(state.travel + 34);
  const type = Math.random() < .18 ? 'star' : Math.random() < .58 ? 'coin' : 'shell';
  const host = new THREE.Group();
  const mat = type === 'coin' ? new THREE.MeshStandardMaterial({ color: 0xffc534, metalness: .65, roughness: .28, emissive: 0x6d4d00, emissiveIntensity: .2 }) : type === 'star' ? new THREE.MeshStandardMaterial({ color: 0x06d6a0, emissive: 0x005a49, emissiveIntensity: .28 }) : new THREE.MeshStandardMaterial({ color: 0xffa455, roughness: .65 });
  const mesh = type === 'star' ? new THREE.Mesh(new THREE.OctahedronGeometry(.42), mat) : type === 'coin' ? new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .13, 16), mat) : new THREE.Mesh(new THREE.CapsuleGeometry(.25, .34, 4, 8), mat);
  if (type === 'coin') mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  host.add(mesh);
  scene.add(host);
  pickups.push({ type, dist: state.travel + 34 + Math.random() * 38, offset: (Math.random() * 2 - 1) * p.width * .7, host, collected: false });
}

function setHud() {
  if (scoreEl) scoreEl.textContent = Math.max(0, Math.floor(state.score)).toLocaleString();
  if (livesEl) livesEl.querySelectorAll('.heart').forEach((h, i) => { h.style.opacity = i < state.lives ? '1' : '.2'; h.style.transform = i < state.lives ? 'scale(1)' : 'scale(.85)'; });
}
function burst(pos, color) {
  for (let i = 0; i < 10; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.045, 5, 4), new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(pos);
    scene.add(mesh);
    particles.push({ mesh, life: .45 + Math.random() * .2, vx: (Math.random() - .5) * 3.2, vy: Math.random() * 3.2, vz: (Math.random() - .5) * 3.2 });
  }
}
function jump() { if (state.mode === 'playing' && state.y <= .03 && state.slideTimer <= 0) { state.vy = 7.8; state.y = .03; } }
function slide() { if (state.mode === 'playing' && state.y <= .03) state.slideTimer = .58; }
function dodge(dir) { if (state.mode !== 'playing') return; const p = pathProfile(state.travel + 6); state.targetOffset = THREE.MathUtils.clamp(state.targetOffset + dir * Math.max(1.8, p.width * .22), -p.width * .78, p.width * .78); }
function resetGame() {
  obstacles.forEach(o => scene.remove(o.host)); pickups.forEach(c => scene.remove(c.host));
  obstacles.length = 0; pickups.length = 0;
  Object.assign(state, { mode: 'playing', score: 0, lives: 3, time: 0, distance: 0, speed: 10.5, comboCount: 0, comboTimer: 0, travel: 0, laneOffset: 0, targetOffset: 0, y: 0, vy: 0, slideTimer: 0, invincible: 0, shake: 0, spawnTimer: .85, pickupTimer: .55 });
  player.position.set(0, 0, PLAYER_Z); player.rotation.set(0, 0, 0); player.scale.set(1, 1, 1);
  finalScoreEl.style.display = 'none';
  overlay.classList.add('hidden');
  setHud();
}
function endGame() {
  if (state.mode === 'idle') return;
  state.mode = 'idle';
  const final = Math.floor(state.score);
  const isNew = final > state.high;
  if (isNew) { state.high = final; try { localStorage.setItem('shoreDashHighScore', String(final)); } catch (_) {} }
  overlay.querySelector('h1').textContent = isNew ? 'GNARLY!' : 'WIPED OUT';
  overlay.querySelector('.subtitle').textContent = isNew ? '🏆 NEW HIGH SCORE!' : 'Better luck next wave';
  finalScoreEl.textContent = `SCORE: ${formatScore(final)} • BEST: ${formatScore(state.high)}`;
  finalScoreEl.style.display = 'block';
  startBtn.textContent = 'PADDLE BACK';
  overlay.classList.remove('hidden');
}
function formatScore(v) { return Math.max(0, Math.floor(v || 0)).toLocaleString(); }

function tick(dt) {
  if (state.mode !== 'playing') return;
  state.time += dt;
  state.speed = Math.min(25, 10.5 + state.time * .23);
  state.travel += state.speed * dt;
  state.distance = state.travel;
  state.score += dt * 10 + state.speed * dt * .15;
  if (state.slideTimer > 0) state.slideTimer -= dt;
  if (state.invincible > 0) state.invincible -= dt;
  state.vy -= 22 * dt;
  state.y += state.vy * dt;
  if (state.y <= 0) { state.y = 0; state.vy = 0; }
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) { spawnObstacle(); state.spawnTimer = Math.max(.68, 1.12 - state.time * .006) + Math.random() * .45; }
  state.pickupTimer -= dt;
  if (state.pickupTimer <= 0) { spawnPickup(); state.pickupTimer = .65 + Math.random() * .95; }

  const profile = pathProfile(state.travel + 6);
  state.targetOffset = THREE.MathUtils.clamp(state.targetOffset, -profile.width * .78, profile.width * .78);
  state.laneOffset = THREE.MathUtils.damp(state.laneOffset, state.targetOffset, 14, dt);
  player.position.x = THREE.MathUtils.damp(player.position.x, profile.center + state.laneOffset, 14, dt);
  player.position.y = state.y + (state.slideTimer > 0 ? .45 : 0);
  player.rotation.z = THREE.MathUtils.damp(player.rotation.z, THREE.MathUtils.clamp((state.targetOffset - state.laneOffset) * .18, -.32, .32), 10, dt);
  player.scale.y = THREE.MathUtils.damp(player.scale.y, state.slideTimer > 0 ? .65 : 1, 12, dt);

  for (const o of obstacles) {
    const ahead = o.dist - state.travel;
    const p = pathProfile(o.dist);
    o.host.position.x = p.center + o.offset;
    o.host.position.z = PLAYER_Z - ahead;
    if (o.type === 'jellyfish') o.host.position.y = 0;
    o.host.rotation.y = Math.sin(o.dist * .2) * .12;
    if (o.hit || Math.abs(ahead) > 1.55 || state.invincible > 0) continue;
    const horizontal = Math.abs(state.laneOffset - o.offset) < 1.15;
    const jumping = state.y > 1.05 && o.type !== 'jellyfish';
    const sliding = state.slideTimer > 0 && o.type === 'log';
    const jellyClear = o.type === 'jellyfish' && (Math.abs(state.laneOffset - o.offset) > .95 || state.y < .65);
    if (horizontal && !(jumping || sliding || jellyClear)) {
      o.hit = true; state.lives--; state.invincible = 1.15; state.comboCount = 0; state.shake = .25; burst(player.position, 0xff6b6b); setHud();
      if (state.lives <= 0) { state.mode = 'dying'; setTimeout(endGame, 350); }
    }
  }

  for (const c of pickups) {
    const ahead = c.dist - state.travel;
    const p = pathProfile(c.dist);
    c.host.position.x = p.center + c.offset;
    c.host.position.z = PLAYER_Z - ahead;
    c.host.position.y = 1.05 + Math.sin(state.time * 5 + c.dist) * .12;
    c.host.rotation.y += dt * 2.4;
    if (!c.collected && Math.abs(ahead) < 1.25 && Math.abs(state.laneOffset - c.offset) < 1.2) {
      c.collected = true; c.host.visible = false; state.comboCount++; state.comboTimer = 1.35;
      const points = c.type === 'star' ? 50 : c.type === 'coin' ? 20 : 10;
      state.score += points + (state.comboCount >= 3 ? Math.min(50, state.comboCount * 5) : 0);
      burst(c.host.position, c.type === 'star' ? 0x06d6a0 : c.type === 'coin' ? 0xffd166 : 0xffa455);
      if (state.comboCount >= 2 && comboEl) { comboEl.textContent = `NICE! ×${state.comboCount}`; comboEl.style.opacity = '1'; }
    }
  }
  if (state.comboTimer > 0) state.comboTimer -= dt; else { state.comboCount = 0; if (comboEl) comboEl.style.opacity = '0'; }
  for (const p of particles) { p.life -= dt; p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt; p.vy -= 8 * dt; p.mesh.scale.setScalar(Math.max(.1, p.life * 1.8)); }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) { scene.remove(particles[i].mesh); particles.splice(i, 1); }
  for (let i = obstacles.length - 1; i >= 0; i--) if (obstacles[i].dist < state.travel - 8) { scene.remove(obstacles[i].host); obstacles.splice(i, 1); }
  for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].dist < state.travel - 7) { scene.remove(pickups[i].host); pickups.splice(i, 1); }
  setHud();
}

function render(dt) {
  for (let i = 0; i < pathParts.length; i++) {
    const logical = state.travel + (PATH_SEGMENTS - 1 - i) * PATH_STEP;
    const p = pathProfile(logical);
    const next = pathProfile(logical + 4);
    const part = pathParts[i];
    part.position.x = p.center;
    part.position.z = PLAYER_Z - (logical - state.travel);
    part.rotation.y = Math.atan2(next.center - p.center, 4);
    part.children[0].scale.x = (p.width * 2) / 21;
    part.children[1].position.x = -(p.width + 6);
    part.children[2].position.x = +(p.width + 6);
  }
  camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * .25, 3.5, dt || .016);
  camera.position.y = 5.2 + Math.min(1.6, state.y * .18);
  camera.lookAt(player.position.x * .18, .9 + state.y * .1, PLAYER_Z - 17);
  if (state.shake > 0) { state.shake -= dt; camera.position.x += (Math.random() - .5) * state.shake; camera.position.y += (Math.random() - .5) * state.shake; }
  player.visible = !(state.invincible > 0 && Math.floor(state.time * 18) % 2 === 0);
  renderer.render(scene, camera);
}

function resize() {
  const w = Math.max(1, canvas.clientWidth);
  const h = Math.max(1, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize, { passive: true });
resize();

let pointerId = null, sx = 0, sy = 0, st = 0;
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  pointerId = e.pointerId; sx = e.clientX; sy = e.clientY; st = performance.now(); e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
}, { passive: false });
canvas.addEventListener('pointerup', e => {
  if (e.pointerId !== pointerId) return;
  e.preventDefault();
  const dx = e.clientX - sx, dy = e.clientY - sy, dist = Math.hypot(dx, dy), elapsed = performance.now() - st;
  if (state.mode === 'playing') {
    if (dist < 22 && elapsed < 280) jump();
    else if (dist >= 42) {
      if (Math.abs(dx) > Math.abs(dy)) dodge(dx > 0 ? 1 : -1);
      else if (dy < 0) jump();
      else slide();
    }
  }
  pointerId = null;
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
}, { passive: false });
canvas.addEventListener('pointercancel', () => { pointerId = null; }, { passive: true });

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); dodge(-1); }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); dodge(1); }
  else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); slide(); }
});
startBtn.addEventListener('click', e => { e.preventDefault(); resetGame(); });
setHud();
(function loop(now) { const dt = Math.min(.05, Math.max(0, (now - state.last) / 1000)); state.last = now; tick(dt); render(dt); requestAnimationFrame(loop); })(performance.now());
