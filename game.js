const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });

const W = 800;
const H = 400;
const GROUND = 300;
const STEP = 1 / 60;
const PATH_MIN_X = 42;
const PATH_MAX_X = W - 42;

let state = 'idle';
let score = 0;
let lives = 3;
let highScore = 0;
let speed = 240;
let time = 0;
let accumulator = 0;
let lastTime = performance.now();
let moveDir = 0;
let obstacleTimer = 1.1;
let collectibleTimer = 0.8;
let combo = 0;
let comboTimer = 0;
let gameOverTimer = null;
let pathPhase = 0;

try { highScore = Number(localStorage.getItem('shoreDashHighScore')) || 0; } catch (_) { highScore = 0; }

const player = { x: 120, y: GROUND, w: 40, h: 54, vy: 0, jumps: 0, invincible: 0, slideTimer: 0 };
const obstacles = [];
const collectibles = [];
const particles = [];
const stars = Array.from({length:45}, () => ({x:Math.random()*W,y:Math.random()*150,r:.4+Math.random()*1.2,p:Math.random()*6.28}));
const clouds = Array.from({length:5}, (_,i)=>({x:i*190+Math.random()*40,y:35+Math.random()*60,w:85+Math.random()*60,s:8+Math.random()*8}));

const $ = id => document.getElementById(id);
const scoreEl = $('scoreDisplay');
const livesEl = $('livesDisplay');
const comboEl = $('comboDisplay');
const overlay = $('overlay');
const finalScoreEl = $('finalScore');
const startBtn = $('startBtn');

function formatScore(value) { return Math.max(0, Math.floor(Number(value)||0)).toLocaleString(); }
function setHud(){
  if(scoreEl) scoreEl.textContent = formatScore(score);
  if(livesEl) livesEl.querySelectorAll('.heart').forEach((h,i)=>{h.style.opacity=i<lives?'1':'.2';h.style.transform=i<lives?'scale(1)':'scale(.85)';});
}
function showCombo(text){ if(!comboEl)return; comboEl.textContent=text; comboEl.style.opacity='1'; comboTimer=1.1; }
function particle(x,y,vx,vy,life,color,r){ if(particles.length>180)particles.splice(0,particles.length-180); particles.push({x,y,vx,vy,life,max:life,color,r}); }

function jump(){
  if(state!=='playing'||player.jumps>=2||player.slideTimer>0)return;
  player.vy=player.jumps===0?-840:-660; player.jumps++;
  for(let i=0;i<6;i++)particle(player.x+20,player.y+player.h,(Math.random()-.5)*220,-60-Math.random()*120,.35,'#8fe9ff',2+Math.random()*2);
}
function slide(){
  if(state!=='playing'||player.y<GROUND-1)return;
  player.slideTimer=.55;
  for(let i=0;i<5;i++)particle(player.x+14,GROUND+48,(Math.random()-.5)*180,-20-Math.random()*70,.28,'#c8eeff',2);
}
function startGame(){
  if(gameOverTimer){clearTimeout(gameOverTimer);gameOverTimer=null;}
  state='playing'; score=0;lives=3;speed=240;time=0;accumulator=0;obstacleTimer=1.1;collectibleTimer=.8;combo=0;comboTimer=0;pathPhase=0;
  player.x=120;player.y=GROUND;player.vy=0;player.jumps=0;player.invincible=0;player.slideTimer=0;
  obstacles.length=0;collectibles.length=0;particles.length=0;setHud();
  if(comboEl)comboEl.style.opacity='0'; finalScoreEl.style.display='none';
  overlay.querySelector('h1').textContent='SHORE DASH'; overlay.querySelector('.subtitle').textContent='Endless Beach Runner'; startBtn.textContent='CATCH A WAVE'; overlay.classList.add('hidden');
}
function endGame(){
  if(state==='idle')return; state='idle'; const final=Math.floor(score); const isNew=final>highScore;
  if(isNew){highScore=final;try{localStorage.setItem('shoreDashHighScore',String(highScore));}catch(_){} }
  overlay.querySelector('h1').textContent=isNew?'GNARLY!':'WIPED OUT'; overlay.querySelector('.subtitle').textContent=isNew?'🏆 NEW HIGH SCORE!':'Better luck next wave'; finalScoreEl.textContent=`SCORE: ${formatScore(final)} • BEST: ${formatScore(highScore)}`; finalScoreEl.style.display='block'; startBtn.textContent='PADDLE BACK'; overlay.classList.remove('hidden');
}

function pathBoundsAt(x){
  const center=400+Math.sin(time*.22)*12+Math.sin(x*.005+time*.32)*18;
  const half=Math.max(185,Math.min(310,250+Math.sin(x*.004-time*.18)*35));
  return {left:Math.max(PATH_MIN_X,center-half),right:Math.min(PATH_MAX_X,center+half)};
}
function clampPlayerToPath(){const b=pathBoundsAt(player.y+50);player.x=Math.max(b.left,Math.min(b.right-player.w,player.x));}
function spawnObstacle(){
  const r=Math.random(); const type=time>18&&r<.16?'jelly':r<.52?'crab':r<.78?'rock':'log'; const b=pathBoundsAt(W+30); const usable=Math.max(30,b.right-b.left-70); const x=b.left+35+Math.random()*usable;
  if(type==='crab')obstacles.push({x,y:GROUND+20,w:40,h:28,type,phase:Math.random()*6.28});
  else if(type==='rock'){const h=30+Math.random()*28;obstacles.push({x,y:GROUND+48-h,w:42,h,type});}
  else if(type==='log')obstacles.push({x,y:GROUND-2,w:58,h:18,type,phase:Math.random()*6.28});
  else obstacles.push({x,y:GROUND-58-Math.random()*24,w:34,h:34,type,phase:Math.random()*6.28});
  obstacleTimer=Math.max(.72,1.15-time*.007)+Math.random()*.42;
}
function spawnCollectible(){
  const r=Math.random();const type=r<.16?'star':r<.60?'coin':'shell';const b=pathBoundsAt(W+20);const usable=Math.max(30,b.right-b.left-60);const x=b.left+30+Math.random()*usable;const y=GROUND-20-Math.random()*78;
  collectibles.push({x,y,w:20,h:20,type,phase:Math.random()*6.28});collectibleTimer=.65+Math.random()*1.05;
}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function playerHitbox(){return player.slideTimer>0?{x:player.x+7,y:player.y+22,w:player.w-14,h:29}:{x:player.x+7,y:player.y+5,w:player.w-14,h:player.h-9};}

function update(dt){
  if(state!=='playing')return; time+=dt;pathPhase+=dt*.08;speed=Math.min(700,240+time*8);score+=dt*10;
  if(player.slideTimer>0)player.slideTimer-=dt;if(player.invincible>0)player.invincible-=dt;
  player.vy+=2520*dt;player.y+=player.vy*dt;if(player.y>=GROUND){player.y=GROUND;player.vy=0;player.jumps=0;}
  player.x+=moveDir*260*dt;clampPlayerToPath();

  obstacleTimer-=dt;if(obstacleTimer<=0)spawnObstacle();
  for(const o of obstacles){o.x-=speed*dt;if(o.phase!==undefined)o.phase+=dt*7;}
  for(let i=obstacles.length-1;i>=0;i--)if(obstacles[i].x<-140)obstacles.splice(i,1);
  collectibleTimer-=dt;if(collectibleTimer<=0)spawnCollectible();
  for(const c of collectibles){c.x-=speed*dt;c.phase+=dt*5;}
  for(let i=collectibles.length-1;i>=0;i--)if(collectibles[i].x<-90)collectibles.splice(i,1);

  const box=playerHitbox();
  if(player.invincible<=0){
    for(let i=0;i<obstacles.length;i++){
      const o=obstacles[i];const ob={x:o.x+4,y:o.y+3,w:Math.max(1,o.w-8),h:Math.max(1,o.h-6)};
      if(!hit(box,ob))continue;
      lives--;player.invincible=1.25;player.vy=-470;combo=0;for(let k=0;k<12;k++)particle(player.x+20,player.y+25,(Math.random()-.5)*360,-Math.random()*360,.55,'#ff6b6b',2+Math.random()*3);obstacles[i].x=-220;setHud();
      if(lives<=0){state='dying';gameOverTimer=setTimeout(endGame,300);}break;
    }
  }
  for(const c of collectibles){if(c.x<-50)continue;if(!hit(box,{x:c.x+2,y:c.y+2,w:c.w-4,h:c.h-4}))continue;const points=c.type==='star'?50:c.type==='coin'?20:10;const px=c.x+10,py=c.y+10;c.x=-220;combo++;comboTimer=1.4;score+=points+(combo>=3?Math.min(50,combo*5):0);const color=c.type==='star'?'#06d6a0':c.type==='coin'?'#ffd166':'#ff9f43';for(let k=0;k<10;k++)particle(px,py,(Math.random()-.5)*260,(Math.random()-.5)*260,.45,color,2+Math.random()*2);if(combo>=2)showCombo(`NICE! ×${combo}`);}
  if(comboTimer>0)comboTimer-=dt;else{combo=0;if(comboEl)comboEl.style.opacity='0';}
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=700*dt;p.life-=dt;}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);setHud();
}

function sky(){const g=ctx.createLinearGradient(0,0,0,260);g.addColorStop(0,'#07152a');g.addColorStop(.42,'#17345f');g.addColorStop(.8,'#df7846');g.addColorStop(1,'#f5a84a');ctx.fillStyle=g;ctx.fillRect(0,0,W,260);const s=ctx.createRadialGradient(600,70,0,600,70,60);s.addColorStop(0,'#fff8d0');s.addColorStop(.35,'#ffd166');s.addColorStop(.75,'#ff9f43');s.addColorStop(1,'rgba(255,120,0,0)');ctx.fillStyle=s;ctx.beginPath();ctx.arc(600,70,60,0,Math.PI*2);ctx.fill();}
function drawStars(){for(const s of stars){s.p+=.025;ctx.globalAlpha=.35+.45*Math.sin(s.p);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
function drawClouds(){for(const c of clouds){if(state==='playing'){c.x-=c.s/60;if(c.x+c.w<0)c.x=W+c.w;}ctx.globalAlpha=.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(c.x,c.y,c.w/2,15,0,0,Math.PI*2);ctx.ellipse(c.x-20,c.y+8,c.w/3,11,0,0,Math.PI*2);ctx.ellipse(c.x+20,c.y+6,c.w/3.5,10,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
function ocean(){const g=ctx.createLinearGradient(0,240,0,350);g.addColorStop(0,'#1a7abf');g.addColorStop(.5,'#0a4a7a');g.addColorStop(1,'#062040');ctx.fillStyle=g;ctx.fillRect(0,240,W,110);for(let layer=0;layer<3;layer++){const base=288+layer*5,amp=8-layer*2;ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x+=5)ctx.lineTo(x,base+Math.sin(x*.02+time*(1.4+layer*.4))*amp);ctx.lineTo(W,H);ctx.closePath();ctx.globalAlpha=.65-layer*.17;ctx.fillStyle=['#4db8e8','#62c8f0','#c8eeff'][layer];ctx.fill();}ctx.globalAlpha=1;}
function sand(){const g=ctx.createLinearGradient(0,340,0,H);g.addColorStop(0,'#f5c87a');g.addColorStop(.5,'#e8b456');g.addColorStop(1,'#c4873a');ctx.fillStyle=g;ctx.fillRect(0,340,W,60);ctx.globalAlpha=.16;ctx.fillStyle='#9f642f';for(let i=0;i<35;i++){let x=(i*25-time*70)%825;if(x<0)x+=825;ctx.beginPath();ctx.arc(x,352+(i%3)*12,1.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
function drawPath(){
  const points=[];for(let x=-10;x<=W+10;x+=16){const b=pathBoundsAt(x);points.push({x,left:b.left,right:b.right});}
  ctx.save();ctx.globalAlpha=.20;ctx.fillStyle='#082f50';ctx.beginPath();ctx.moveTo(points[0].left,330);for(const p of points)ctx.lineTo(p.left,315+Math.sin(p.x*.03+time)*2);for(let i=points.length-1;i>=0;i--){const p=points[i];ctx.lineTo(p.right,315+Math.sin(p.x*.03+time)*2);}ctx.closePath();ctx.fill();ctx.globalAlpha=.30;ctx.strokeStyle='#c8eeff';ctx.lineWidth=2;ctx.setLineDash([10,12]);
  ctx.beginPath();points.forEach((p,i)=>{const y=326+Math.sin(p.x*.03+time*1.2)*2;if(i===0)ctx.moveTo(p.left+14,y);else ctx.lineTo(p.left+14,y);});ctx.stroke();ctx.beginPath();points.forEach((p,i)=>{const y=326+Math.sin(p.x*.03+time*1.2)*2;if(i===0)ctx.moveTo(p.right-14,y);else ctx.lineTo(p.right-14,y);});ctx.stroke();ctx.setLineDash([]);ctx.restore();
}
function drawPlayer(){
  if(player.invincible>0&&Math.floor(time*16)%2===0)return;const x=player.x,y=player.y,sliding=player.slideTimer>0;ctx.save();if(sliding){ctx.translate(x+20,y+34);ctx.scale(1.08,.70);ctx.translate(-(x+20),-(y+34));}
  ctx.fillStyle='#06d6a0';ctx.shadowColor='#06d6a0';ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(x+20,y+50,26,6,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ff6b6b';ctx.beginPath();ctx.roundRect?ctx.roundRect(x+8,y+20,24,27,4):ctx.rect(x+8,y+20,24,27);ctx.fill();ctx.fillStyle='#ffd6b0';ctx.beginPath();ctx.arc(x+20,y+12,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3d2b1f';ctx.beginPath();ctx.arc(x+20,y+9,8,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(x+17,y+14,1.5,0,Math.PI*2);ctx.arc(x+23,y+14,1.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffd6b0';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+9,y+26);ctx.lineTo(x+2,y+23+Math.sin(time*10)*4);ctx.moveTo(x+31,y+26);ctx.lineTo(x+38,y+23-Math.sin(time*10)*4);ctx.stroke();ctx.restore();
}
function drawObstacle(o){ctx.save();ctx.translate(o.x,o.y);if(o.type==='crab'){ctx.fillStyle='#e63946';ctx.beginPath();ctx.ellipse(20,14,20,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(12,8,2.5,0,Math.PI*2);ctx.arc(28,8,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e63946';ctx.lineWidth=2;for(let i=0;i<3;i++){const yy=12+i*6;ctx.beginPath();ctx.moveTo(5,yy);ctx.lineTo(-5,yy+5+Math.sin(o.phase+i)*2);ctx.moveTo(35,yy);ctx.lineTo(45,yy+5-Math.sin(o.phase+i)*2);ctx.stroke();}}else if(o.type==='rock'){const g=ctx.createLinearGradient(0,0,42,o.h);g.addColorStop(0,'#8a9bb0');g.addColorStop(1,'#3d4f6a');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(8,o.h);ctx.lineTo(0,o.h*.55);ctx.lineTo(5,7);ctx.lineTo(21,0);ctx.lineTo(37,8);ctx.lineTo(42,o.h*.6);ctx.closePath();ctx.fill();}else if(o.type==='log'){ctx.fillStyle='#754c2b';ctx.fillRect(0,3,58,13);ctx.fillStyle='#a87544';ctx.fillRect(3,5,52,4);ctx.fillStyle='#c59a62';ctx.beginPath();ctx.arc(5,9.5,5.5,0,Math.PI*2);ctx.fill();}else{ctx.translate(0,Math.sin(o.phase)*4);ctx.fillStyle='#55c2ff';ctx.beginPath();ctx.arc(17,18,16,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0f67a1';ctx.beginPath();ctx.arc(17,18,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9fbff';ctx.beginPath();ctx.arc(11,12,3,0,Math.PI*2);ctx.fill();}ctx.restore();}
function drawCollectible(c){const bob=Math.sin(c.phase)*4;ctx.save();ctx.translate(c.x+10,c.y+10+bob);if(c.type==='coin'){ctx.fillStyle='#ffd166';ctx.shadowColor='#ffd166';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#f0a329';ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.stroke();}else if(c.type==='shell'){ctx.fillStyle='#ff9f43';ctx.beginPath();ctx.arc(0,2,9,Math.PI,0);ctx.fill();ctx.strokeStyle='#ffd3ad';ctx.lineWidth=2;for(let i=-4;i<=4;i+=4){ctx.beginPath();ctx.moveTo(i,1);ctx.lineTo(i*.6,-5);ctx.stroke();}}else{ctx.fillStyle='#06d6a0';ctx.shadowColor='#06d6a0';ctx.shadowBlur=10;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?10:4,px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();ctx.shadowBlur=0;}ctx.restore();}
function drawParticles(){for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
function render(){ctx.clearRect(0,0,W,H);sky();drawStars();drawClouds();ocean();sand();drawPath();if(state!=='idle'){for(const c of collectibles)if(c.x>-80)drawCollectible(c);for(const o of obstacles)if(o.x>-120)drawObstacle(o);drawPlayer();drawParticles();}}
function frameLoop(now){const delta=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;accumulator+=delta;let steps=0;while(accumulator>=STEP&&steps<4){update(STEP);accumulator-=STEP;steps++;}if(steps===4&&accumulator>STEP*4)accumulator=0;render();requestAnimationFrame(frameLoop);}

startBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();startGame();});
document.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'){e.preventDefault();jump();}else if(e.code==='ArrowDown'||e.code==='KeyS'){e.preventDefault();slide();}else if(e.code==='ArrowLeft'||e.code==='KeyA'){e.preventDefault();moveDir=-1;}else if(e.code==='ArrowRight'||e.code==='KeyD'){e.preventDefault();moveDir=1;}});
document.addEventListener('keyup',e=>{if(['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(e.code))moveDir=0;});window.addEventListener('blur',()=>moveDir=0);document.addEventListener('visibilitychange',()=>{if(document.hidden){moveDir=0;accumulator=0;lastTime=performance.now();}});
setHud();requestAnimationFrame(frameLoop);
