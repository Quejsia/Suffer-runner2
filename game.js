const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 800, H = 400;
const FIXED_DT = 1 / 60;
const GROUND = 300;

let state = 'idle';
let score = 0;
let lives = 3;
let speed = 240;
let elapsed = 0;
let frame = 0;
let highScore = Number.parseInt(localStorage.getItem('shoreDashHighScore') || '0', 10) || 0;
let accumulator = 0;
let lastTime = performance.now();
let obstacleTimer = 1.35;
let collectibleTimer = 0.9;
let comboTimer = 0;
let combo = 0;
let moveDir = 0;
let joystickPointerId = null;

const player = {
  x: 120, y: GROUND, w: 40, h: 54,
  vy: 0, jumps: 0, maxJumps: 2,
  invincible: 0, squish: 1, trail: []
};

let obstacles = [];
let collectibles = [];
let particles = [];
let waveOffset = 0;
let scrollX = 0;

const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * W, y: Math.random() * 160,
  r: Math.random() * 1.5 + 0.3, twinkle: Math.random() * Math.PI * 2
}));
const clouds = Array.from({ length: 5 }, (_, i) => ({
  x: i * 180 + Math.random() * 60, y: 40 + Math.random() * 60,
  w: 80 + Math.random() * 60, speed: 12 + Math.random() * 12,
  alpha: 0.3 + Math.random() * 0.3
}));

const $ = id => document.getElementById(id);

function jump() {
  if (state !== 'playing' || player.jumps >= player.maxJumps) return;
  player.vy = player.jumps === 0 ? -14 * 60 : -11 * 60;
  player.jumps++;
  player.squish = 0.6;
  spawnJumpParticles();
}

function setMoveDirection(dir) {
  moveDir = Math.max(-1, Math.min(1, dir));
}

function startGame() {
  state = 'playing'; score = 0; lives = 3; speed = 240; elapsed = 0; frame = 0;
  accumulator = 0; obstacleTimer = 1.35; collectibleTimer = 0.9; combo = 0; comboTimer = 0;
  player.x = 120; player.y = GROUND; player.vy = 0; player.jumps = 0; player.invincible = 0; player.squish = 1; player.trail = [];
  obstacles = []; collectibles = []; particles = [];
  updateLivesUI(); updateScoreUI(); hideGameOver();
}

function endGame() {
  if (state === 'idle') return;
  state = 'idle';
  const previousBest = highScore;
  const isNewHighScore = score > previousBest;
  if (isNewHighScore) {
    highScore = score;
    localStorage.setItem('shoreDashHighScore', String(highScore));
  }
  const title = $('overlay').querySelector('h1');
  const subtitle = $('overlay').querySelector('.subtitle');
  title.textContent = isNewHighScore ? 'GNARLY!' : 'WIPED OUT';
  subtitle.textContent = isNewHighScore ? '🏆 NEW HIGH SCORE!' : 'Better luck next wave';
  $('finalScore').style.display = 'block';
  $('finalScore').textContent = `SCORE: ${score} • BEST: ${highScore}`;
  $('startBtn').textContent = 'PADDLE BACK';
  $('overlay').classList.remove('hidden');
}

function hideGameOver() {
  $('finalScore').style.display = 'none';
  $('startBtn').textContent = 'CATCH A WAVE';
  $('overlay').querySelector('h1').textContent = 'SHORE DASH';
  $('overlay').querySelector('.subtitle').textContent = 'Endless Beach Runner';
  $('overlay').classList.add('hidden');
}

function updateScoreUI() { $('scoreDisplay').textContent = Math.floor(score); }
function updateLivesUI() {
  document.querySelectorAll('.heart').forEach((heart, i) => {
    heart.style.opacity = i < lives ? '1' : '0.2';
    heart.style.filter = i < lives ? 'drop-shadow(0 0 4px #ff6b6b)' : 'none';
  });
}

function showCombo(text) {
  const el = $('comboDisplay');
  el.textContent = text;
  el.style.opacity = '1';
  comboTimer = 1;
}

function spawnObstacle() {
  const types = speed > 420 ? ['crab', 'rock', 'jellyfish'] : ['crab', 'rock'];
  const type = types[Math.floor(Math.random() * types.length)];
  if (type === 'crab') obstacles.push({ x: W + 20, y: GROUND + 20, w: 38, h: 28, type, anim: 0 });
  if (type === 'rock') {
    const h = 30 + Math.random() * 30;
    obstacles.push({ x: W + 20, y: GROUND + 48 - h, w: 40, h, type });
  }
  if (type === 'jellyfish') obstacles.push({ x: W + 20, y: GROUND - 20 - Math.random() * 40, w: 32, h: 32, type, anim: Math.random() * 6.28 });
  const min = Math.max(0.72, 1.2 - (speed - 240) / 1200);
  obstacleTimer = min + Math.random() * 0.75;
}

function spawnCollectible() {
  const types = ['shell', 'coin', 'star'];
  const type = types[Math.floor(Math.random() * types.length)];
  collectibles.push({ x: W + 30, y: GROUND - 10 - Math.random() * 60, type, anim: Math.random() * 6.28, collected: false });
  collectibleTimer = 0.7 + Math.random() * 1.2;
}

function rectOverlap(a, b, pad = 8) {
  return a.x + pad < b.x + b.w - pad && a.x + a.w - pad > b.x + pad && a.y + pad < b.y + b.h - pad && a.y + a.h - pad > b.y + pad;
}

function spawnParticle(x, y, vx, vy, life, color, r) {
  particles.push({ x, y, vx, vy, life, decay: 1 / life, color, r });
}
function spawnJumpParticles() {
  for (let i = 0; i < 8; i++) spawnParticle(player.x + player.w / 2, player.y + player.h, (Math.random() - .5) * 4 * 60, Math.random() * -3 * 60, .35, `hsl(${190 + Math.random() * 40},80%,70%)`, 3 + Math.random() * 3);
}
function spawnCollectParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const s = 120 + Math.random() * 180;
    spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, .45, color, 2 + Math.random() * 3);
  }
}
function spawnHitParticles(x, y) {
  for (let i = 0; i < 16; i++) spawnParticle(x, y, (Math.random() - .5) * 480, -Math.random() * 360, .55, `hsl(${Math.random() * 30},80%,60%)`, 3 + Math.random() * 4);
}

function update(dt) {
  if (state !== 'playing') return;
  frame++;
  elapsed += dt;
  speed = Math.min(720, 240 + elapsed * 8);
  scrollX += speed * dt;
  waveOffset += speed * dt;

  player.vy += 42 * 60 * dt;
  player.y += player.vy * dt;
  if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.jumps = 0; }
  player.x += moveDir * 260 * dt;
  player.x = Math.max(8, Math.min(W - player.w - 8, player.x));
  player.squish += (1 - player.squish) * Math.min(1, dt * 10);
  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > 8) player.trail.shift();
  if (player.invincible > 0) player.invincible -= dt;

  obstacleTimer -= dt;
  if (obstacleTimer <= 0) spawnObstacle();
  for (const o of obstacles) { o.x -= speed * dt; if (o.anim !== undefined) o.anim += dt * 9; }
  obstacles = obstacles.filter(o => o.x > -100);

  collectibleTimer -= dt;
  if (collectibleTimer <= 0) spawnCollectible();
  for (const c of collectibles) { c.x -= speed * dt; c.anim += dt * 4; }
  collectibles = collectibles.filter(c => c.x > -60 && !c.collected);

  const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (player.invincible <= 0) {
    for (const o of obstacles) {
      if (!rectOverlap(playerBox, o)) continue;
      lives--;
      updateLivesUI();
      player.invincible = 1.35;
      player.vy = -8 * 60;
      combo = 0;
      spawnHitParticles(player.x + player.w / 2, player.y + player.h / 2);
      if (lives <= 0) { state = 'dying'; setTimeout(endGame, 350); }
      break;
    }
  }

  for (const c of collectibles) {
    if (c.collected || !rectOverlap(playerBox, { x: c.x, y: c.y, w: 20, h: 20 }, 4)) continue;
    c.collected = true;
    combo++;
    comboTimer = 1.5;
    const base = c.type === 'star' ? 50 : c.type === 'coin' ? 20 : 10;
    const bonus = combo >= 3 ? Math.min(50, combo * 5) : 0;
    score += base + bonus;
    const colors = { star: '#06d6a0', coin: '#ffd166', shell: '#ff9f43' };
    spawnCollectParticles(c.x + 10, c.y + 10, colors[c.type]);
    if (combo >= 2) showCombo(`NICE! ×${combo}`);
  }

  score += dt * 10;
  updateScoreUI();
  if (comboTimer > 0) comboTimer -= dt;
  else { combo = 0; $('comboDisplay').style.opacity = '0'; }

  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= p.decay * dt; }
  particles = particles.filter(p => p.life > 0);
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#0a1628'); g.addColorStop(.4, '#1a3a6e'); g.addColorStop(.8, '#e8834a'); g.addColorStop(1, '#f5a84a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 260);
  const sx = W * .75, sy = 70, sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 50); sg.addColorStop(0, '#fff8d0'); sg.addColorStop(.3, '#ffd166'); sg.addColorStop(.7, '#ff9f43'); sg.addColorStop(1, 'rgba(255,120,0,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 50, 0, Math.PI * 2); ctx.fill();
}
function drawStars() { for (const s of stars) { s.twinkle += .03; ctx.globalAlpha = .4 + .5 * Math.sin(s.twinkle); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
function drawClouds() { for (const c of clouds) { if (state === 'playing') c.x -= c.speed / 60; if (c.x + c.w < 0) c.x = W + c.w; ctx.globalAlpha = c.alpha; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w / 2, 16, 0, 0, Math.PI * 2); ctx.ellipse(c.x - 20, c.y + 8, c.w / 3, 12, 0, 0, Math.PI * 2); ctx.ellipse(c.x + 22, c.y + 6, c.w / 3.5, 11, 0, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
function drawOcean() {
  const g = ctx.createLinearGradient(0, 240, 0, 310); g.addColorStop(0, '#1a7abf'); g.addColorStop(.5, '#0a4a7a'); g.addColorStop(1, '#062040'); ctx.fillStyle = g; ctx.fillRect(0, 240, W, 70);
  for (let layer = 0; layer < 3; layer++) { const amp = [8,5,3][layer], freq = [.015,.022,.03][layer], spd = [1.5,2,2.5][layer], base = [290,295,300][layer]; ctx.beginPath(); ctx.moveTo(0,H); for (let x=0;x<=W;x+=4) ctx.lineTo(x, base + Math.sin((x + waveOffset * spd) * freq) * amp); ctx.lineTo(W,H); ctx.closePath(); ctx.globalAlpha=[.7,.5,.3][layer]; ctx.fillStyle=['#4db8e8','#62c8f0','#c8eeff'][layer]; ctx.fill(); } ctx.globalAlpha=1;
}
function drawSand() { const g=ctx.createLinearGradient(0,GROUND+48,0,H); g.addColorStop(0,'#f5c87a');g.addColorStop(.4,'#e8b456');g.addColorStop(1,'#c4873a');ctx.fillStyle=g;ctx.fillRect(0,GROUND+48,W,H-GROUND-48);ctx.globalAlpha=.15;ctx.fillStyle='#c4873a';for(let i=0;i<40;i++){const x=((i*22-scrollX*.8)%(W+22));ctx.beginPath();ctx.arc(x,GROUND+56+(i%3)*10,1.5,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1; }
function drawPlayer() { if(player.invincible>0 && Math.floor(elapsed*12)%2===0)return; const sw=player.w*player.squish, sh=player.h/player.squish, ox=(player.w-sw)/2, oy=player.h-sh;ctx.save();ctx.translate(player.x+ox,player.y+oy);ctx.shadowColor='#06d6a0';ctx.shadowBlur=12;ctx.fillStyle='#06d6a0';ctx.beginPath();ctx.ellipse(sw/2,sh-4,sw/2+6,6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#ff6b6b';ctx.beginPath();ctx.roundRect(sw*.2,sh*.35,sw*.6,sh*.5,4);ctx.fill();ctx.fillStyle='#ff9f43';ctx.beginPath();ctx.roundRect(sw*.32,sh*.38,sw*.12,sh*.44,2);ctx.fill();ctx.fillStyle='#ffd6b0';ctx.beginPath();ctx.arc(sw/2,sh*.22,sw*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3d2b1f';ctx.beginPath();ctx.arc(sw/2,sh*.14,sw*.2,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(sw*.38,sh*.2,2,0,Math.PI*2);ctx.arc(sw*.62,sh*.2,2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffd6b0';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sw*.2,sh*.45);ctx.lineTo(sw*.05,sh*.45+Math.sin(elapsed*12)*8);ctx.moveTo(sw*.8,sh*.45);ctx.lineTo(sw*.95,sh*.45-Math.sin(elapsed*12)*8);ctx.stroke();ctx.restore(); }
function drawObstacle(o) { ctx.save();ctx.translate(o.x,o.y); if(o.type==='crab'){ctx.fillStyle='#e63946';ctx.beginPath();ctx.ellipse(o.w/2,o.h/2,o.w/2,o.h/2-2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(o.w*.3,o.h*.2,3,0,Math.PI*2);ctx.arc(o.w*.7,o.h*.2,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e63946';ctx.lineWidth=2;for(let i=0;i<3;i++){let y=o.h*.5+i*6;ctx.beginPath();ctx.moveTo(3,y);ctx.lineTo(-8,y+6+Math.sin(o.anim+i)*3);ctx.moveTo(o.w-3,y);ctx.lineTo(o.w+8,y+6-Math.sin(o.anim+i)*3);ctx.stroke()}} else if(o.type==='rock'){const g=ctx.createLinearGradient(0,0,o.w,o.h);g.addColorStop(0,'#8a9bb0');g.addColorStop(1,'#3d4f6a');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(o.w*.15,o.h);ctx.lineTo(0,o.h*.5);ctx.lineTo(o.w*.1,o.h*.1);ctx.lineTo(o.w*.5,0);ctx.lineTo(o.w*.9,o.h*.15);ctx.lineTo(o.w,o.h*.6);ctx.lineTo(o.w*.85,o.h);ctx.closePath();ctx.fill();ctx.strokeStyle='#aabccc';ctx.stroke()} else {const g=ctx.createRadialGradient(o.w/2,o.h/2,0,o.w/2,o.h/2,o.w/2);g.addColorStop(0,'rgba(200,100,255,.9)');g.addColorStop(.6,'rgba(120,40,200,.6)');g.addColorStop(1,'rgba(80,0,150,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(o.w/2,o.h/2,o.w/2,Math.PI,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(180,80,240,.7)';for(let i=0;i<5;i++){let x=o.w*(.15+i*.18);ctx.beginPath();ctx.moveTo(x,o.h*.75);ctx.quadraticCurveTo(x+Math.sin(o.anim+i)*6,o.h*1.2,x+Math.sin(o.anim+i+1)*4,o.h*1.6);ctx.stroke()}}ctx.restore(); }
function drawCollectible(c) { if(c.collected)return;const bob=Math.sin(c.anim)*4;ctx.save();ctx.translate(c.x,c.y+bob);if(c.type==='shell'){ctx.fillStyle='#ff9f43';ctx.strokeStyle='#ff6b6b';ctx.beginPath();ctx.arc(10,10,10,0,Math.PI*2);ctx.fill();ctx.stroke()}else if(c.type==='coin'){ctx.shadowColor='#ffd166';ctx.shadowBlur=12;ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(10,10,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff9f43';ctx.beginPath();ctx.arc(10,10,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}else{ctx.shadowColor='#06d6a0';ctx.shadowBlur=14;ctx.fillStyle='#06d6a0';ctx.strokeStyle='#fff';ctx.beginPath();for(let i=0;i<10;i++){let a=i*Math.PI/5-Math.PI/2,r=i%2?5:10;ctx.lineTo(10+Math.cos(a)*r,10+Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0}ctx.restore(); }
function drawParticles(){for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;}
function drawTrail(){for(let i=0;i<player.trail.length;i++){const t=player.trail[i];ctx.globalAlpha=(i/player.trail.length)*.25;ctx.fillStyle='#06d6a0';ctx.beginPath();ctx.ellipse(t.x+player.w/2,t.y+player.h-6,16,5,0,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;}

function render() {
  ctx.clearRect(0,0,W,H); drawSky(); drawStars(); drawClouds(); drawOcean(); drawSand();
  if(state!=='idle'){drawTrail();collectibles.forEach(drawCollectible);obstacles.forEach(drawObstacle);drawPlayer();drawParticles();}
}

// One animation loop only. Game simulation uses a fixed timestep so speed/physics are stable across devices.
function loop(now) {
  let delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  accumulator += delta;
  while (accumulator >= FIXED_DT) { update(FIXED_DT); accumulator -= FIXED_DT; }
  render();
  requestAnimationFrame(loop);
}

// Keyboard input: no global touch handler, so mobile controls cannot accidentally jump.
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
});

$('startBtn').addEventListener('click', e => { e.stopPropagation(); startGame(); });

// Desktop/tap-to-jump only when the canvas itself is pressed.
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' || e.pointerType === 'touch' || e.pointerType === 'pen') {
    if (state === 'playing') { e.preventDefault(); jump(); }
  }
});

const joystick = $('joystick');
const stick = $('stick');
const jumpBtn = $('jumpBtn');

function resetJoystick() {
  joystickPointerId = null;
  setMoveDirection(0);
  stick.style.left = '28px';
  stick.style.top = '28px';
}
function updateJoystick(e) {
  const r = joystick.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const max = 30;
  const clampedX = Math.max(-max, Math.min(max, dx));
  const clampedY = Math.max(-max, Math.min(max, dy));
  setMoveDirection(clampedX / max);
  stick.style.left = `${28 + clampedX}px`;
  stick.style.top = `${28 + clampedY}px`;
}
joystick.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); joystickPointerId = e.pointerId; joystick.setPointerCapture(e.pointerId); updateJoystick(e); });
joystick.addEventListener('pointermove', e => { if (e.pointerId === joystickPointerId) { e.preventDefault(); updateJoystick(e); } });
joystick.addEventListener('pointerup', e => { if (e.pointerId === joystickPointerId) resetJoystick(); });
joystick.addEventListener('pointercancel', resetJoystick);
jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); jump(); });

window.addEventListener('blur', resetJoystick);
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetJoystick(); lastTime = performance.now(); accumulator = 0; } });

updateLivesUI();
updateScoreUI();
render();
requestAnimationFrame(loop);
