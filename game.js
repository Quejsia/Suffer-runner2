const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 800, H = 400;

// ── State ──────────────────────────────────────────
let state = 'idle'; // idle | playing | dying
let score = 0, lives = 3, speed = 0, frame = 0;
let highScore = 0;

// ── Player ────────────────────────────────────────
const GROUND = 300;
const player = {
  x: 120, y: GROUND, w: 40, h: 54,
  vy: 0, jumps: 0,
  maxJumps: 2,
  invincible: 0,
  squish: 1, squishV: 0,
  trail: []
};

// ── Obstacles & collectibles ───────────────────────
let obstacles = [];
let collectibles = [];
let particles = [];
let waveOffset = 0;
let scrollX = 0;

// ── Stars / bg ─────────────────────────────────────
const stars = Array.from({length: 60}, () => ({
  x: Math.random() * W,
  y: Math.random() * 160,
  r: Math.random() * 1.5 + 0.3,
  twinkle: Math.random() * Math.PI * 2
}));

const clouds = Array.from({length: 5}, (_, i) => ({
  x: i * 180 + Math.random() * 60,
  y: 40 + Math.random() * 60,
  w: 80 + Math.random() * 60,
  speed: 0.2 + Math.random() * 0.2,
  alpha: 0.3 + Math.random() * 0.3
}));

// ── Input ─────────────────────────────────────────
function jump() {
  if (state !== 'playing') return;
  if (player.jumps < player.maxJumps) {
    player.vy = player.jumps === 0 ? -14 : -11;
    player.jumps++;
    spawnJumpParticles();
    player.squish = 0.6;
    player.squishV = 0.08;
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); jump(); }
});
document.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, {passive: false});
document.getElementById('gameWrapper').addEventListener('click', () => {
  if (state === 'playing') jump();
});

// ── Start / Restart ────────────────────────────────
document.getElementById('startBtn').addEventListener('click', e => {
  e.stopPropagation();
  startGame();
});

function startGame() {
  state = 'playing';
  score = 0; lives = 3; speed = 4; frame = 0;
  player.y = GROUND; player.vy = 0; player.jumps = 0;
  player.invincible = 0; player.squish = 1;
  obstacles = []; collectibles = []; particles = [];
  updateLivesUI();
  document.getElementById('scoreDisplay').textContent = '0';
  const ov = document.getElementById('overlay');
  ov.classList.add('hidden');
}

// ── Spawning ───────────────────────────────────────
let nextObstacle = 90, nextCollectible = 60;

function spawnObstacle() {
  const types = ['crab', 'rock', 'jellyfish'];
  const t = types[Math.floor(Math.random() * (speed > 7 ? 3 : 2))];
  if (t === 'crab') {
    obstacles.push({ x: W + 20, y: GROUND + 20, w: 38, h: 28, type: 'crab', anim: 0 });
  } else if (t === 'rock') {
    const h = 30 + Math.random() * 30;
    obstacles.push({ x: W + 20, y: GROUND + 20 - h + 28, w: 40, h, type: 'rock' });
  } else {
    obstacles.push({ x: W + 20, y: GROUND - 20 - Math.random() * 40, w: 32, h: 32, type: 'jellyfish', anim: 0, floatOffset: Math.random() * Math.PI * 2 });
  }
  nextObstacle = 80 + Math.random() * (120 - speed * 5);
}

function spawnCollectible() {
  const types = ['shell', 'coin', 'star'];
  const t = types[Math.floor(Math.random() * types.length)];
  collectibles.push({
    x: W + 30,
    y: GROUND - 10 - Math.random() * 60,
    type: t,
    anim: Math.random() * Math.PI * 2,
    collected: false
  });
  nextCollectible = 50 + Math.random() * 80;
}

// ── Particles ─────────────────────────────────────
function spawnJumpParticles() {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: player.x + player.w / 2,
      y: player.y + player.h,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * -3,
      life: 1, decay: 0.07,
      r: 3 + Math.random() * 3,
      color: `hsl(${190 + Math.random()*40}, 80%, 70%)`
    });
  }
}

function spawnCollectParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * (2 + Math.random() * 3),
      vy: Math.sin(angle) * (2 + Math.random() * 3),
      life: 1, decay: 0.05,
      r: 2 + Math.random() * 3,
      color
    });
  }
}

function spawnHitParticles(x, y) {
  for (let i = 0; i < 16; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6,
      life: 1, decay: 0.04,
      r: 3 + Math.random() * 4,
      color: `hsl(${Math.random()*30 + 0}, 80%, 60%)`
    });
  }
}

// ── Collision ──────────────────────────────────────
function rectOverlap(a, b, pad = 8) {
  return a.x + pad < b.x + b.w - pad &&
         a.x + a.w - pad > b.x + pad &&
         a.y + pad < b.y + b.h - pad &&
         a.y + a.h - pad > b.y + pad;
}

// ── Draw helpers ──────────────────────────────────
function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, 260);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(0.4, '#1a3a6e');
  grad.addColorStop(0.8, '#e8834a');
  grad.addColorStop(1, '#f5a84a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 260);

  const sunX = W * 0.75, sunY = 70;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 50);
  sunGrad.addColorStop(0, '#fff8d0');
  sunGrad.addColorStop(0.3, '#ffd166');
  sunGrad.addColorStop(0.7, '#ff9f43');
  sunGrad.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
  ctx.fill();

  const hGrad = ctx.createLinearGradient(0, 200, 0, 260);
  hGrad.addColorStop(0, 'rgba(255,180,80,0.4)');
  hGrad.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 200, W, 60);
}

function drawStars() {
  stars.forEach(s => {
    s.twinkle += 0.03;
    const alpha = 0.4 + 0.5 * Math.sin(s.twinkle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawClouds() {
  clouds.forEach(c => {
    if (state === 'playing') c.x -= c.speed;
    if (c.x + c.w < 0) c.x = W + c.w;
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x - 20, c.y + 8, c.w / 3, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + 22, c.y + 6, c.w / 3.5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawOcean() {
  const oGrad = ctx.createLinearGradient(0, 240, 0, 310);
  oGrad.addColorStop(0, '#1a7abf');
  oGrad.addColorStop(0.5, '#0a4a7a');
  oGrad.addColorStop(1, '#062040');
  ctx.fillStyle = oGrad;
  ctx.fillRect(0, 240, W, 70);

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#4db8e8';
  for (let i = 0; i < 8; i++) {
    const sx = ((i * 120 - scrollX * 0.3) % (W + 120)) - 20;
    ctx.beginPath();
    ctx.ellipse(sx, 268, 40, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let layer = 0; layer < 3; layer++) {
    const amp    = [8, 5, 3][layer];
    const freq   = [0.015, 0.022, 0.03][layer];
    const spd    = [1.5, 2, 2.5][layer];
    const yBase  = [290, 295, 300][layer];
    const alpha  = [0.7, 0.5, 0.3][layer];
    const color  = ['#4db8e8', '#62c8f0', '#c8eeff'][layer];

    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const y = yBase + Math.sin((x + waveOffset * spd) * freq) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSand() {
  const sGrad = ctx.createLinearGradient(0, GROUND + 48, 0, H);
  sGrad.addColorStop(0, '#f5c87a');
  sGrad.addColorStop(0.4, '#e8b456');
  sGrad.addColorStop(1, '#c4873a');
  ctx.fillStyle = sGrad;
  ctx.fillRect(0, GROUND + 48, W, H - GROUND - 48);

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#c4873a';
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 22 - scrollX * 0.8) % (W + 22));
    ctx.beginPath();
    ctx.arc(sx, GROUND + 56 + (i % 3) * 10, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(frame / 4) % 2 === 0) return;

  const px = player.x, py = player.y;
  const sw = player.w * player.squish;
  const sh = player.h / player.squish;
  const ox = (player.w - sw) / 2;
  const oy = player.h - sh;

  ctx.save();
  ctx.translate(px + ox, py + oy);

  ctx.shadowColor = '#06d6a0';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#06d6a0';
  ctx.beginPath();
  ctx.ellipse(sw / 2, sh - 4, sw / 2 + 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.roundRect(sw * 0.2, sh * 0.35, sw * 0.6, sh * 0.5, 4);
  ctx.fill();

  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.roundRect(sw * 0.32, sh * 0.38, sw * 0.12, sh * 0.44, 2);
  ctx.fill();

  ctx.fillStyle = '#ffd6b0';
  ctx.beginPath();
  ctx.arc(sw / 2, sh * 0.22, sw * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3d2b1f';
  ctx.beginPath();
  ctx.arc(sw / 2, sh * 0.14, sw * 0.2, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(sw * 0.38, sh * 0.2, 2, 0, Math.PI * 2);
  ctx.arc(sw * 0.62, sh * 0.2, 2, 0, Math.PI * 2);
  ctx.fill();

  const armAngle = Math.sin(frame * 0.2) * 0.3;
  ctx.strokeStyle = '#ffd6b0';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sw * 0.2, sh * 0.45);
  ctx.lineTo(sw * 0.05, sh * 0.45 + Math.sin(armAngle) * 8);
  ctx.moveTo(sw * 0.8, sh * 0.45);
  ctx.lineTo(sw * 0.95, sh * 0.45 - Math.sin(armAngle) * 8);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(o) {
  ctx.save();
  ctx.translate(o.x, o.y);

  if (o.type === 'crab') {
    o.anim = (o.anim || 0) + 0.15;
    const legOff = Math.sin(o.anim) * 4;
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.ellipse(o.w / 2, o.h / 2, o.w / 2, o.h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,180,0.3)';
    ctx.beginPath();
    ctx.ellipse(o.w / 2 - 4, o.h / 2 - 4, 8, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(o.w * 0.3, o.h * 0.2, 3, 0, Math.PI * 2);
    ctx.arc(o.w * 0.7, o.h * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(o.w * 0.3 + 1, o.h * 0.2 - 1, 1, 0, Math.PI * 2);
    ctx.arc(o.w * 0.7 + 1, o.h * 0.2 - 1, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2, o.h * 0.4 + legOff);
    ctx.lineTo(-10, o.h * 0.2 + legOff);
    ctx.moveTo(o.w - 2, o.h * 0.4 - legOff);
    ctx.lineTo(o.w + 10, o.h * 0.2 - legOff);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ly = o.h * 0.5 + i * 6;
      const lOff = Math.sin(o.anim + i) * 3;
      ctx.beginPath();
      ctx.moveTo(3, ly + lOff);
      ctx.lineTo(-8, ly + 6 + lOff);
      ctx.moveTo(o.w - 3, ly - lOff);
      ctx.lineTo(o.w + 8, ly + 6 - lOff);
      ctx.stroke();
    }
  } else if (o.type === 'rock') {
    const rGrad = ctx.createLinearGradient(0, 0, o.w, o.h);
    rGrad.addColorStop(0, '#8a9bb0');
    rGrad.addColorStop(1, '#3d4f6a');
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.moveTo(o.w * 0.15, o.h);
    ctx.lineTo(0, o.h * 0.5);
    ctx.lineTo(o.w * 0.1, o.h * 0.1);
    ctx.lineTo(o.w * 0.5, 0);
    ctx.lineTo(o.w * 0.9, o.h * 0.15);
    ctx.lineTo(o.w, o.h * 0.6);
    ctx.lineTo(o.w * 0.85, o.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#aabccc';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,220,240,0.2)';
    ctx.beginPath();
    ctx.moveTo(o.w * 0.2, o.h * 0.15);
    ctx.lineTo(o.w * 0.45, o.h * 0.05);
    ctx.lineTo(o.w * 0.55, o.h * 0.22);
    ctx.closePath();
    ctx.fill();
  } else if (o.type === 'jellyfish') {
    o.anim = (o.anim || 0) + 0.08;
    const pulse = Math.sin(o.anim) * 4;
    const jGrad = ctx.createRadialGradient(o.w/2, o.h/2, 0, o.w/2, o.h/2, o.w/2);
    jGrad.addColorStop(0, 'rgba(200,100,255,0.9)');
    jGrad.addColorStop(0.6, 'rgba(120,40,200,0.6)');
    jGrad.addColorStop(1, 'rgba(80,0,150,0)');
    ctx.fillStyle = jGrad;
    ctx.beginPath();
    ctx.arc(o.w / 2, o.h / 2, o.w / 2 + pulse * 0.3, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,80,240,0.6)';
    ctx.lineWidth = 1.5;
    for (let t = 0; t < 5; t++) {
      const tx = o.w * (0.15 + t * 0.18);
      ctx.beginPath();
      ctx.moveTo(tx, o.h * 0.8);
      ctx.quadraticCurveTo(tx + Math.sin(o.anim + t) * 6, o.h * 1.2, tx + Math.sin(o.anim + t + 1) * 4, o.h * 1.6);
      ctx.stroke();
    }
    ctx.shadowColor = '#c060ff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(220,150,255,0.5)';
    ctx.beginPath();
    ctx.arc(o.w / 2, o.h / 2, o.w * 0.3 + pulse * 0.2, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawCollectible(c) {
  if (c.collected) return;
  c.anim += 0.06;
  const bob = Math.sin(c.anim) * 4;
  ctx.save();
  ctx.translate(c.x, c.y + bob);

  if (c.type === 'shell') {
    ctx.fillStyle = '#ff9f43';
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(10, 10, 10, Math.PI, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(10, 10, 10, 0, Math.PI);
    ctx.fill(); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(10 + Math.cos(Math.PI + i * Math.PI/4) * 9, 10 + Math.sin(Math.PI + i * Math.PI/4) * 9);
      ctx.strokeStyle = 'rgba(255,200,100,0.4)';
      ctx.stroke();
    }
  } else if (c.type === 'coin') {
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(10, 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(10, 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 10px Nunito';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 10, 10);
    ctx.shadowBlur = 0;
  } else if (c.type === 'star') {
    ctx.shadowColor = '#06d6a0';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#06d6a0';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a  = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const ai = ((i * 4 + 2) * Math.PI / 5) - Math.PI / 2;
      const op = i === 0 ? 'moveTo' : 'lineTo';
      ctx[op](10 + Math.cos(a) * 10, 10 + Math.sin(a) * 10);
      ctx.lineTo(10 + Math.cos(ai) * 5, 10 + Math.sin(ai) * 5);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawTrail() {
  player.trail.forEach((t, i) => {
    const alpha = (i / player.trail.length) * 0.25;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#06d6a0';
    ctx.beginPath();
    ctx.ellipse(t.x + player.w / 2, t.y + player.h - 6, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Update ─────────────────────────────────────────
function update() {
  frame++;
  waveOffset += 1;
  scrollX += speed;

  if (frame % 300 === 0) speed = Math.min(speed + 0.3, 12);

  player.vy += 0.7;
  player.y += player.vy;
  if (player.y >= GROUND) {
    player.y = GROUND;
    player.vy = 0;
    player.jumps = 0;
  }

  player.squish += (1 - player.squish) * 0.15;

  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > 8) player.trail.shift();

  if (player.invincible > 0) player.invincible--;

  if (--nextObstacle <= 0) spawnObstacle();
  obstacles.forEach(o => o.x -= speed);
  obstacles = obstacles.filter(o => o.x > -100);

  if (--nextCollectible <= 0) spawnCollectible();
  collectibles.forEach(c => c.x -= speed);
  collectibles = collectibles.filter(c => c.x > -50 && !c.collected);

  if (player.invincible === 0) {
    for (const o of obstacles) {
      const hitbox = { x: o.x, y: o.y, w: o.w, h: o.h };
      if (rectOverlap({ x: player.x, y: player.y, w: player.w, h: player.h }, hitbox)) {
        spawnHitParticles(player.x + player.w / 2, player.y + player.h / 2);
        lives--;
        updateLivesUI();
        player.invincible = 90;
        player.vy = -8;
        if (lives <= 0) {
          setTimeout(gameOver, 400);
          state = 'dying';
        }
        break;
      }
    }
  }

  for (const c of collectibles) {
    const hitbox = { x: c.x, y: c.y, w: 20, h: 20 };
    if (rectOverlap({ x: player.x, y: player.y, w: player.w, h: player.h }, hitbox, 4)) {
      c.collected = true;
      const pts = c.type === 'star' ? 50 : c.type === 'coin' ? 20 : 10;
      score += pts;
      const colors = { star: '#06d6a0', coin: '#ffd166', shell: '#ff9f43' };
      spawnCollectParticles(c.x + 10, c.y + 10, colors[c.type]);
      document.getElementById('scoreDisplay').textContent = score;
    }
  }

  if (frame % 6 === 0) {
    score++;
    document.getElementById('scoreDisplay').textContent = score;
  }

  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.1;
    p.life -= p.decay;
  });
  particles = particles.filter(p => p.life > 0);
}

function updateLivesUI() {
  const hearts = document.querySelectorAll('.heart');
  hearts.forEach((h, i) => {
    h.style.opacity = i < lives ? '1' : '0.2';
    h.style.filter = i < lives ? 'drop-shadow(0 0 4px #ff6b6b)' : 'none';
  });
}

function gameOver() {
  state = 'idle';
  highScore = Math.max(highScore, score);
  const ov = document.getElementById('overlay');
  ov.querySelector('h1').textContent = score > highScore * 0.9 ? 'GNARLY!' : 'WIPED OUT';
  ov.querySelector('.subtitle').textContent = score === highScore ? '🏆 NEW HIGH SCORE!' : 'Better luck next wave';
  const fs = document.getElementById('finalScore');
  fs.style.display = 'block';
  fs.textContent = `SCORE: ${score}  •  BEST: ${highScore}`;
  document.getElementById('startBtn').textContent = 'PADDLE BACK';
  ov.classList.remove('hidden');
}

// ── Render loop ────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  drawSky();
  drawStars();
  drawClouds();
  drawOcean();
  drawSand();
  if (state === 'playing' || state === 'dying') {
    drawTrail();
    collectibles.forEach(drawCollectible);
    obstacles.forEach(drawObstacle);
    drawPlayer();
    drawParticles();
  }
}

function loop() {
  if (state === 'playing' || state === 'dying') update();
  render();
  requestAnimationFrame(loop);
}

loop();
