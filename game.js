const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
const W = 800;
const H = 400;
const GROUND = 300;
const STEP = 1 / 60;

let state = 'idle';
let score = 0;
let lives = 3;
let highScore = 0;
let speed = 240;
let time = 0;
let accumulator = 0;
let lastTime = performance.now();
let moveDir = 0;
let joystickId = null;
let obstacleTimer = 1.2;
let collectibleTimer = 0.8;
let combo = 0;
let comboTimer = 0;
let gameOverTimer = null;

try { highScore = Number(localStorage.getItem('shoreDashHighScore')) || 0; } catch (_) { highScore = 0; }

const player = { x: 120, y: GROUND, w: 40, h: 54, vy: 0, jumps: 0, invincible: 0 };
const obstacles = [];
const collectibles = [];
const particles = [];
const stars = Array.from({length: 45}, () => ({x: Math.random()*W,y:Math.random()*150,r:.4+Math.random()*1.2,p:Math.random()*6.28}));
const clouds = Array.from({length:5}, (_,i)=>({x:i*190+Math.random()*40,y:35+Math.random()*60,w:85+Math.random()*60,s:8+Math.random()*8}));

const $ = id => document.getElementById(id);
const scoreEl = $('scoreDisplay');
const livesEl = $('livesDisplay');
const comboEl = $('comboDisplay');
const overlay = $('overlay');
const finalScoreEl = $('finalScore');
const startBtn = $('startBtn');

function formatScore(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString();
}

function setHud() {
  // DOM HUD is intentionally kept tiny and above the canvas by CSS.
  if (scoreEl) scoreEl.textContent = formatScore(score);
  if (livesEl) livesEl.querySelectorAll('.heart').forEach((h, i) => {
    h.style.opacity = i < lives ? '1' : '.2';
    h.style.transform = i < lives ? 'scale(1)' : 'scale(.85)';
  });
}

function showCombo(text) {
  if (!comboEl) return;
  comboEl.textContent = text;
  comboEl.style.opacity = '1';
  comboTimer = 1.1;
}

function jump() {
  if (state !== 'playing' || player.jumps >= 2) return;
  player.vy = player.jumps === 0 ? -840 : -660;
  player.jumps++;
  for (let i=0;i<6;i++) particle(player.x+20, player.y+54, (Math.random()-.5)*220, -60-Math.random()*120, .35, '#8fe9ff', 2+Math.random()*2);
}

function startGame() {
  if (gameOverTimer) { clearTimeout(gameOverTimer); gameOverTimer = null; }
  state = 'playing';
  score = 0; lives = 3; speed = 240; time = 0; accumulator = 0;
  obstacleTimer = 1.1; collectibleTimer = .8; combo = 0; comboTimer = 0;
  player.x = 120; player.y = GROUND; player.vy = 0; player.jumps = 0; player.invincible = 0;
  obstacles.length = 0; collectibles.length = 0; particles.length = 0;
  setHud();
  if (comboEl) comboEl.style.opacity = '0';
  finalScoreEl.style.display = 'none';
  startBtn.textContent = 'CATCH A WAVE';
  overlay.classList.add('hidden');
}

function endGame() {
  if (state === 'idle') return;
  state = 'idle';
  const final = Math.floor(score);
  const isNew = final > highScore;
  if (isNew) {
    highScore = final;
    try { localStorage.setItem('shoreDashHighScore', String(highScore)); } catch (_) {}
  }
  overlay.querySelector('h1').textContent = isNew ? 'GNARLY!' : 'WIPED OUT';
  overlay.querySelector('.subtitle').textContent = isNew ? '🏆 NEW HIGH SCORE!' : 'Better luck next wave';
  finalScoreEl.textContent = `SCORE: ${formatScore(final)} • BEST: ${formatScore(highScore)}`;
  finalScoreEl.style.display = 'block';
  startBtn.textContent = 'PADDLE BACK';
  overlay.classList.remove('hidden');
}

function particle(x,y,vx,vy,life,color,r) {
  if (particles.length > 180) particles.splice(0, particles.length - 180);
  particles.push({x,y,vx,vy,life,max:life,color,r});
}

function spawnObstacle() {
  const type = time > 18 && Math.random() < .2 ? 'jelly' : (Math.random() < .55 ? 'crab' : 'rock');
  if (type === 'crab') obstacles.push({x:W+30,y:GROUND+20,w:40,h:28,type,phase:Math.random()*6.28});
  else if (type === 'rock') { const h=30+Math.random()*28; obstacles.push({x:W+30,y:GROUND+48-h,w:42,h,type}); }
  else obstacles.push({x:W+30,y:GROUND-55-Math.random()*35,w:34,h:34,type,phase:Math.random()*6.28});
  obstacleTimer = Math.max(.75, 1.2 - time*.008) + Math.random()*.5;
}

function spawnCollectible() {
  const type = Math.random() < .18 ? 'star' : (Math.random() < .55 ? 'coin' : 'shell');
  collectibles.push({x:W+25,y:GROUND-22-Math.random()*75,w:20,h:20,type,phase:Math.random()*6.28});
  collectibleTimer = .65 + Math.random()*1.15;
}

function hit(a,b,p=5) {
  return a.x+p < b.x+b.w-p && a.x+a.w-p > b.x+p && a.y+p < b.y+b.h-p && a.y+a.h-p > b.y+p;
}

function update(dt) {
  if (state !== 'playing') return;
  time += dt;
  speed = Math.min(700, 240 + time*8);
  score += dt*10;

  player.vy += 2520*dt;
  player.y += player.vy*dt;
  if (player.y >= GROUND) { player.y=GROUND; player.vy=0; player.jumps=0; }
  player.x += moveDir*250*dt;
  player.x = Math.max(8, Math.min(W-player.w-8, player.x));
  if (player.invincible > 0) player.invincible -= dt;

  obstacleTimer -= dt;
  if (obstacleTimer <= 0) spawnObstacle();
  for (const o of obstacles) { o.x -= speed*dt; if (o.phase !== undefined) o.phase += dt*7; }
  while (obstacles.length && obstacles[0].x < -120) obstacles.shift();

  collectibleTimer -= dt;
  if (collectibleTimer <= 0) spawnCollectible();
  for (const c of collectibles) { c.x -= speed*dt; c.phase += dt*5; }
  while (collectibles.length && collectibles[0].x < -80) collectibles.shift();

  const box = {x:player.x,y:player.y,w:player.w,h:player.h};
  if (player.invincible <= 0) {
    for (let i=0;i<obstacles.length;i++) {
      if (!hit(box, obstacles[i])) continue;
      lives--;
      player.invincible = 1.25;
      player.vy = -470;
      combo = 0;
      for (let k=0;k<12;k++) particle(player.x+20,player.y+25,(Math.random()-.5)*360,-Math.random()*360,.55,'#ff6b6b',2+Math.random()*3);
      obstacles[i].x = -200;
      setHud();
      if (lives <= 0) { state='dying'; gameOverTimer=setTimeout(endGame,300); }
      break;
    }
  }

  for (const c of collectibles) {
    if (c.x < -50 || !hit(box,{x:c.x,y:c.y,w:c.w,h:c.h},2)) continue;
    const points = c.type==='star' ? 50 : c.type==='coin' ? 20 : 10;
    c.x = -200;
    combo++;
    comboTimer = 1.4;
    score += points + (combo >= 3 ? Math.min(50,combo*5) : 0);
    const color = c.type==='star' ? '#06d6a0' : c.type==='coin' ? '#ffd166' : '#ff9f43';
    for (let k=0;k<10;k++) particle(c.x+10,c.y+10,(Math.random()-.5)*260,(Math.random()-.5)*260,.45,color,2+Math.random()*2);
    if (combo >= 2) showCombo(`NICE! ×${combo}`);
  }

  if (comboTimer > 0) comboTimer -= dt;
  else { combo = 0; if (comboEl) comboEl.style.opacity='0'; }

  for (const p of particles) { p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 700*dt; p.life -= dt; }
  for (let i=particles.length-1;i>=0;i--) if (particles[i].life<=0) particles.splice(i,1);

  setHud();
}

function sky() {
  const g=ctx.createLinearGradient(0,0,0,260);
  g.addColorStop(0,'#0a1628'); g.addColorStop(.42,'#1a3a6e'); g.addColorStop(.8,'#e8834a'); g.addColorStop(1,'#f5a84a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,260);
  const s=ctx.createRadialGradient(600,70,0,600,70,60);
  s.addColorStop(0,'#fff8d0'); s.addColorStop(.35,'#ffd166'); s.addColorStop(.75,'#ff9f43'); s.addColorStop(1,'rgba(255,120,0,0)');
  ctx.fillStyle=s; ctx.beginPath(); ctx.arc(600,70,60,0,Math.PI*2); ctx.fill();
}

function ocean() {
  const g=ctx.createLinearGradient(0,240,0,310);
  g.addColorStop(0,'#1a7abf'); g.addColorStop(.5,'#0a4a7a'); g.addColorStop(1,'#062040');
  ctx.fillStyle=g; ctx.fillRect(0,240,W,70);
  for(let layer=0;layer<3;layer++){
    const base=290+layer*4, amp=8-layer*2;
    ctx.beginPath(); ctx.moveTo(0,H);
    for(let x=0;x<=W;x+=5) ctx.lineTo(x,base+Math.sin(x*.02+time*(1.4+layer*.4))*amp);
    ctx.lineTo(W,H); ctx.closePath(); ctx.globalAlpha=.65-layer*.17; ctx.fillStyle=['#4db8e8','#62c8f0','#c8eeff'][layer]; ctx.fill();
  }
  ctx.globalAlpha=1;
}

function sand() {
  const g=ctx.createLinearGradient(0,348,0,H); g.addColorStop(0,'#f5c87a'); g.addColorStop(.5,'#e8b456'); g.addColorStop(1,'#c4873a');
  ctx.fillStyle=g; ctx.fillRect(0,348,W,52);
  ctx.globalAlpha=.16; ctx.fillStyle='#c4873a';
  for(let i=0;i<35;i++){let x=(i*25-time*70)%825;if(x<0)x+=825;ctx.beginPath();ctx.arc(x,360+(i%3)*10,1.5,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}

function drawClouds(){
  for(const c of clouds){ if(state==='playing'){c.x-=c.s/60;if(c.x+c.w<0)c.x=W+c.w;} ctx.globalAlpha=.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(c.x,c.y,c.w/2,15,0,0,Math.PI*2);ctx.ellipse(c.x-20,c.y+8,c.w/3,11,0,0,Math.PI*2);ctx.ellipse(c.x+20,c.y+6,c.w/3.5,10,0,0,Math.PI*2);ctx.fill(); }
  ctx.globalAlpha=1;
}

function drawStars(){ for(const s of stars){s.p+=.025;ctx.globalAlpha=.35+.45*Math.sin(s.p);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1; }

function drawPlayer(){
  if(player.invincible>0 && Math.floor(time*16)%2===0) return;
  const x=player.x,y=player.y;
  ctx.save();
  ctx.fillStyle='#06d6a0'; ctx.shadowColor='#06d6a0'; ctx.shadowBlur=10; ctx.beginPath();ctx.ellipse(x+20,y+50,26,6,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#ff6b6b';ctx.beginPath();ctx.roundRect?ctx.roundRect(x+8,y+20,24,27,4):(ctx.rect(x+8,y+20,24,27));ctx.fill();
  ctx.fillStyle='#ffd6b0';ctx.beginPath();ctx.arc(x+20,y+12,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3d2b1f';ctx.beginPath();ctx.arc(x+20,y+9,8,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(x+17,y+14,1.5,0,Math.PI*2);ctx.arc(x+23,y+14,1.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffd6b0';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+9,y+26);ctx.lineTo(x+2,y+23+Math.sin(time*10)*4);ctx.moveTo(x+31,y+26);ctx.lineTo(x+38,y+23-Math.sin(time*10)*4);ctx.stroke();
  ctx.restore();
}

function drawObstacle(o){
  ctx.save();ctx.translate(o.x,o.y);
  if(o.type==='crab'){ctx.fillStyle='#e63946';ctx.beginPath();ctx.ellipse(20,14,20,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(12,8,2.5,0,Math.PI*2);ctx.arc(28,8,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e63946';ctx.lineWidth=2;for(let i=0;i<3;i++){let yy=12+i*6;ctx.beginPath();ctx.moveTo(5,yy);ctx.lineTo(-5,yy+5+Math.sin(o.phase+i)*2);ctx.moveTo(35,yy);ctx.lineTo(45,yy+5-Math.sin(o.phase+i)*2);ctx.stroke();}}
  else if(o.type==='rock'){const g=ctx.createLinearGradient(0,0,42,o.h);g.addColorStop(0,'#8a9bb0');g.addColorStop(1,'#3d4f6a');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(8,o.h);ctx.lineTo(0,o.h*.55);ctx.lineTo(5,7);ctx.lineTo(21,0);ctx.lineTo(37,7);ctx.lineTo(42,o.h*.55);ctx.lineTo(35,o.h);ctx.closePath();ctx.fill();ctx.strokeStyle='#aabccc';ctx.stroke();}
  else {const g=ctx.createRadialGradient(17,17,0,17,17,18);g.addColorStop(0,'rgba(220,130,255,.95)');g.addColorStop(1,'rgba(90,0,160,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(17,17,18,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(190,100,245,.8)';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(6+i*8,23);ctx.quadraticCurveTo(2+i*10,35,7+i*8,48);ctx.stroke();}}
  ctx.restore();
}

function drawCollectible(c){
  ctx.save();ctx.translate(c.x,c.y+Math.sin(c.phase)*4);
  if(c.type==='coin'){ctx.fillStyle='#ffd166';ctx.shadowColor='#ffd166';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(10,10,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ff9f43';ctx.beginPath();ctx.arc(10,10,6,0,Math.PI*2);ctx.fill();}
  else if(c.type==='shell'){ctx.fillStyle='#ff9f43';ctx.strokeStyle='#ff6b6b';ctx.beginPath();ctx.arc(10,10,10,0,Math.PI*2);ctx.fill();ctx.stroke();}
  else {ctx.fillStyle='#06d6a0';ctx.strokeStyle='#fff';ctx.shadowColor='#06d6a0';ctx.shadowBlur=12;ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?5:10;ctx.lineTo(10+Math.cos(a)*r,10+Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.restore();
}

function drawParticles(){for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*Math.max(.2,p.life/p.max),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}

function render(){
  ctx.clearRect(0,0,W,H);
  sky(); drawStars(); drawClouds(); ocean(); sand();
  if(state!=='idle'){ for(const c of collectibles) if(c.x>-80) drawCollectible(c); for(const o of obstacles) if(o.x>-100) drawObstacle(o); drawPlayer(); drawParticles(); }
}

function frameLoop(now){
  let delta=Math.min(.1,Math.max(0,(now-lastTime)/1000));
  lastTime=now; accumulator+=delta;
  let steps=0;
  while(accumulator>=STEP && steps<4){update(STEP);accumulator-=STEP;steps++;}
  if(steps===4 && accumulator>STEP*4) accumulator=0;
  render(); requestAnimationFrame(frameLoop);
}

startBtn.addEventListener('click', e=>{e.preventDefault();e.stopPropagation();startGame();});
canvas.addEventListener('pointerdown', e=>{if(state==='playing' && e.pointerType!=='mouse'){e.preventDefault();jump();}});
document.addEventListener('keydown', e=>{if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'){e.preventDefault();jump();}});

const joystick=$('joystick');const stick=$('stick');const jumpBtn=$('jumpBtn');
function resetJoystick(){joystickId=null;moveDir=0;if(stick){stick.style.left='16px';stick.style.top='16px';}}
function joyMove(e){const r=joystick.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2);const dy=e.clientY-(r.top+r.height/2);const max=Math.max(18,(r.width-30)/2);const x=Math.max(-max,Math.min(max,dx));const y=Math.max(-max,Math.min(max,dy));moveDir=x/max;stick.style.left=`calc(50% + ${x}px - 12px)`;stick.style.top=`calc(50% + ${y}px - 12px)`;}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();joystickId=e.pointerId;joystick.setPointerCapture(e.pointerId);joyMove(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joystickId){e.preventDefault();joyMove(e);}});
joystick.addEventListener('pointerup',resetJoystick);joystick.addEventListener('pointercancel',resetJoystick);
jumpBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();jump();});
window.addEventListener('blur',resetJoystick);document.addEventListener('visibilitychange',()=>{if(document.hidden){resetJoystick();accumulator=0;lastTime=performance.now();}});

setHud();
requestAnimationFrame(frameLoop);
