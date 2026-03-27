/**
 * XTR DYNAMICS — AD ENGINE v5
 *
 * PATTERN: Mehndi coil system — tight spiraling loops that feed into
 * each other, expanding rapidly from both bottom corners simultaneously.
 * Each coil spawns the next coil from its tip, slightly rotated and
 * scaled, building an interlocking ornate pattern that consumes the screen.
 *
 * SEQUENCE:
 *  0s      Coils explode from bottom-left and bottom-right corners
 *  ~2.5s   XTR slashes in while coils still growing
 *  ~3.8s   TR + DYNAMICS appear with X as one unit
 *  ~12s    Fade out → missile (if asset) → end card → hard reload
 */

(function () {
'use strict';

const P = {
  CYAN:    '#00FFFF',
  FUCHSIA: '#FF00FF',
  VIOLET:  '#9D00FF',
  VPALE:   '#E0AAFF',
  GREEN:   '#00FF88',
};

/* ─── DOM ─────────────────────────────── */
const cursorDot   = document.getElementById('cursor');
const cursorRing  = document.getElementById('cursor-ring');
const venomCanvas = document.getElementById('venom-canvas');
const vCtx        = venomCanvas.getContext('2d');
const logoCanvas  = document.getElementById('logo-canvas');
const lCtx        = logoCanvas.getContext('2d');
const brandUnit   = document.getElementById('brand-unit');
const brandX      = document.getElementById('brand-x');
const brandTR     = document.getElementById('brand-tr');
const brandDyn    = document.getElementById('brand-dynamics');
const sceneMissile= document.getElementById('scene-missile');
const missileInner= document.getElementById('missile-inner');
const missileFrame= document.getElementById('missile-frame');
const sceneEnd    = document.getElementById('scene-end');
const endInner    = document.getElementById('end-inner');

let W = 0, H = 0;

function resize() {
  W = venomCanvas.width = logoCanvas.width  = window.innerWidth;
  H = venomCanvas.height= logoCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

/* ─── CURSOR ──────────────────────────── */
document.addEventListener('mousemove', e => {
  cursorDot.style.left  = e.clientX + 'px';
  cursorDot.style.top   = e.clientY + 'px';
  cursorRing.style.left = e.clientX + 'px';
  cursorRing.style.top  = e.clientY + 'px';
});

/* ─── HELPERS ─────────────────────────── */
const clamp   = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp    = (a,b,t) => a+(b-a)*t;
const easeOut = t => 1-Math.pow(1-t,3);
const rand    = (a,b) => a+Math.random()*(b-a);
const TAU     = Math.PI*2;

/* ─── MISSILE CHECK ───────────────────── */
function hasMissile() {
  return !!(missileFrame.querySelector('video[src]') ||
            missileFrame.querySelector('img[src]'));
}
const MISSILE = hasMissile();

/* ═══════════════════════════════════════════════════════
   MEHNDI COIL SYSTEM

   Each CoilChain starts at a corner.
   A CoilChain is a sequence of Coils — each Coil is a
   spiral arc (parametric Archimedean-style) that draws
   from its anchor point. When a coil finishes, it spawns
   the next coil from its exit tip, rotated and at a new
   scale, feeding the pattern across the screen.

   Coil math:
     For t in [0, turns*TAU]:
       r(t) = startR + growthRate * t
       x = anchor.x + r(t) * cos(t + phaseOffset)
       y = anchor.y + r(t) * sin(t + phaseOffset)

   Each coil draws stroke-by-stroke so you see it grow.
   After finishing, it immediately spawns its child coil
   from the exit point, with a new anchor direction.
═══════════════════════════════════════════════════════ */

class Coil {
  constructor(ax, ay, startAngle, startR, growth, turns, col, lw, direction=1) {
    this.ax       = ax;           // anchor x
    this.ay       = ay;           // anchor y
    this.startA   = startAngle;   // phase offset
    this.startR   = startR;       // inner radius
    this.growth   = growth;       // how much r grows per radian
    this.turns    = turns;        // how many loops
    this.col      = col;
    this.lw       = lw;
    this.dir      = direction;    // 1=CCW, -1=CW
    this.maxT     = turns * TAU;
    this.t        = 0;
    this.speed    = 0.18 + Math.random()*0.14; // radians per frame — fast
    this.done     = false;
    this.child    = null;
    this.points   = [];
    this.precompute();
  }

  precompute() {
    // Pre-build all points for fast drawing
    this.pts = [];
    const steps = Math.ceil(this.maxT / 0.06);
    for (let i = 0; i <= steps; i++) {
      const tt = (i/steps)*this.maxT;
      const r  = this.startR + this.growth*tt;
      this.pts.push({
        x: this.ax + r*Math.cos(this.dir*tt + this.startA),
        y: this.ay + r*Math.sin(this.dir*tt + this.startA),
      });
    }
    // Exit point = last point
    this.exitPt = this.pts[this.pts.length-1];
  }

  update() {
    if (this.done) { if(this.child) this.child.update(); return; }
    this.t = Math.min(this.t + this.speed, this.maxT);
    if (this.t >= this.maxT) {
      this.done = true;
      this.spawnChild();
    }
    if (this.child) this.child.update();
  }

  spawnChild() {
    if (!this.exitPt) return;
    // Next coil starts where this one ended
    // Rotate phase by ~90°–150°, scale radius slightly
    const newAngle  = this.startA + rand(0.8, 1.8) * this.dir;
    const newStartR = rand(2, 6);
    const newGrowth = this.growth * rand(0.7, 1.2);
    const newTurns  = rand(1.2, 3.0);
    const newDir    = Math.random() < 0.35 ? -this.dir : this.dir;
    const cols      = [P.CYAN, P.FUCHSIA, P.VIOLET, P.VPALE, P.GREEN];
    const newCol    = cols[Math.floor(Math.random()*cols.length)];
    const newLW     = Math.max(0.4, this.lw * rand(0.6,0.95));

    // Clamp exit point — don't let coils go off-screen
    const ex = clamp(this.exitPt.x, -W*0.1, W*1.1);
    const ey = clamp(this.exitPt.y, -H*0.1, H*1.1);

    // Stop spawning if we've gone very far off screen
    if (ex < -W*0.15 || ex > W*1.15 || ey < -H*0.15 || ey > H*1.15) return;

    this.child = new Coil(ex, ey, newAngle, newStartR, newGrowth, newTurns, newCol, newLW, newDir);
  }

  draw(ctx, globalAlpha) {
    if (this.pts.length < 2) return;
    const drawn = Math.floor((this.t/this.maxT)*this.pts.length);
    if (drawn < 2) { if(this.child) this.child.draw(ctx, globalAlpha); return; }

    // Glow pass
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i=1;i<drawn;i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.strokeStyle = this.col;
    ctx.lineWidth   = this.lw + 3;
    ctx.globalAlpha = 0.18 * globalAlpha;
    ctx.shadowColor = this.col;
    ctx.shadowBlur  = 20;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    ctx.restore();

    // Core line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i=1;i<drawn;i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.strokeStyle = this.col;
    ctx.lineWidth   = this.lw;
    ctx.globalAlpha = globalAlpha * 0.88;
    ctx.shadowColor = this.col;
    ctx.shadowBlur  = 8;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    ctx.restore();

    // Active tip dot
    if (!this.done && drawn > 0) {
      const tip = this.pts[drawn-1];
      ctx.save();
      ctx.beginPath(); ctx.arc(tip.x, tip.y, this.lw+1, 0, TAU);
      ctx.fillStyle   = '#fff';
      ctx.globalAlpha = 0.9 * globalAlpha;
      ctx.shadowColor = this.col;
      ctx.shadowBlur  = 18;
      ctx.fill();
      ctx.restore();
    }

    if (this.child) this.child.draw(ctx, globalAlpha);
  }
}

/* ─── COIL CHAINS from each corner ─────── */
// Each corner spawns multiple seed coils at different angles
// so the pattern fans out and covers the screen fast

let chains = [];
let patternAlpha = 1;

function initPattern() {
  chains = [];
  patternAlpha = 1;

  const baseR   = Math.min(W,H)*0.012;
  const growth  = Math.min(W,H)*0.0028;

  // ── BOTTOM LEFT corner ──
  const blx = 0, bly = H;
  const blAngles = [-Math.PI*0.5, -Math.PI*0.35, -Math.PI*0.65, -Math.PI*0.2, -Math.PI*0.8];
  const blCols   = [P.CYAN, P.FUCHSIA, P.VIOLET, P.CYAN, P.VPALE];
  blAngles.forEach((ang, i) => {
    chains.push(new Coil(
      blx + rand(-10,20), bly + rand(-10,15),
      ang, baseR * rand(0.5,1.5),
      growth * rand(0.8,1.3),
      rand(1.8, 3.2),
      blCols[i % blCols.length],
      rand(0.8, 2.0),
      i%2===0 ? 1 : -1
    ));
  });

  // ── BOTTOM RIGHT corner ──
  const brx = W, bry = H;
  const brAngles = [-Math.PI*0.5, -Math.PI*0.65, -Math.PI*0.35, -Math.PI*0.8, -Math.PI*0.2];
  const brCols   = [P.FUCHSIA, P.CYAN, P.GREEN, P.VIOLET, P.VPALE];
  brAngles.forEach((ang, i) => {
    chains.push(new Coil(
      brx + rand(-20,10), bry + rand(-10,15),
      ang, baseR * rand(0.5,1.5),
      growth * rand(0.8,1.3),
      rand(1.8, 3.2),
      brCols[i % brCols.length],
      rand(0.8, 2.0),
      i%2===0 ? -1 : 1
    ));
  });
}

function updatePattern() { chains.forEach(c=>c.update()); }
function drawPattern()   { chains.forEach(c=>c.draw(vCtx, patternAlpha)); }

initPattern();

/* ═══════════════════════════════════════════════════════
   LOGO — X dual simultaneous stab, then TR + DYNAMICS
═══════════════════════════════════════════════════════ */
function G() {
  const cx=W/2, cy=H/2;
  const u=Math.min(W,H)*0.155;
  const xl=cx-u*0.9;
  return {
    X:{
      s1:{x1:xl-u*0.58,y1:cy-u*0.82,x2:xl+u*0.58,y2:cy+u*0.82},
      s2:{x1:xl+u*0.58,y1:cy-u*0.82,x2:xl-u*0.58,y2:cy+u*0.82},
    }
  };
}

const LS = { phase:'idle', x1t:0, x2t:0, x1tr:[], x2tr:[] };

function resetLogo() {
  Object.assign(LS,{phase:'idle',x1t:0,x2t:0,x1tr:[],x2tr:[]});
  lCtx.clearRect(0,0,W,H);
}

function drawSlash(x1,y1,x2,y2,t,tr,col,gc) {
  const et=easeOut(clamp(t,0,1));
  const ex=lerp(x1,x2,et), ey=lerp(y1,y2,et);
  tr.push({x:ex,y:ey}); if(tr.length>18)tr.shift();

  // Trail
  for(let i=1;i<tr.length;i++){
    const a=i/tr.length;
    lCtx.save();
    lCtx.beginPath();
    lCtx.moveTo(tr[i-1].x,tr[i-1].y); lCtx.lineTo(tr[i].x,tr[i].y);
    lCtx.strokeStyle=P.FUCHSIA; lCtx.lineWidth=a*5;
    lCtx.globalAlpha=a*0.5; lCtx.shadowColor=P.FUCHSIA; lCtx.shadowBlur=10;
    lCtx.stroke(); lCtx.restore();
  }

  // Stroke
  lCtx.save();
  lCtx.beginPath(); lCtx.moveTo(x1,y1); lCtx.lineTo(ex,ey);
  lCtx.strokeStyle=col; lCtx.lineWidth=3;
  lCtx.shadowColor=gc; lCtx.shadowBlur=26; lCtx.lineCap='round';
  lCtx.stroke(); lCtx.restore();

  // Tip spark
  if(t<1){
    lCtx.save();
    lCtx.beginPath(); lCtx.arc(ex,ey,4,0,TAU);
    lCtx.fillStyle='#fff'; lCtx.globalAlpha=0.95;
    lCtx.shadowColor=col; lCtx.shadowBlur=32;
    lCtx.fill(); lCtx.restore();
  }

  // Settled glow
  if(t>=1){
    lCtx.save();
    lCtx.beginPath(); lCtx.moveTo(x1,y1); lCtx.lineTo(x2,y2);
    lCtx.strokeStyle=gc; lCtx.lineWidth=8; lCtx.globalAlpha=0.3;
    lCtx.shadowColor=gc; lCtx.shadowBlur=30; lCtx.stroke(); lCtx.restore();
    lCtx.save();
    lCtx.beginPath(); lCtx.moveTo(x1,y1); lCtx.lineTo(x2,y2);
    lCtx.strokeStyle=col; lCtx.lineWidth=1.6; lCtx.globalAlpha=0.92;
    lCtx.shadowColor=col; lCtx.shadowBlur=14; lCtx.stroke(); lCtx.restore();
  }
}

function tickLogo() {
  lCtx.clearRect(0,0,W,H);
  if(LS.phase==='idle') return;
  const {X}=G();
  if(LS.phase==='x'||LS.phase==='hold'){
    if(LS.phase==='x'){ LS.x1t+=0.07; LS.x2t+=0.07; }
    drawSlash(X.s1.x1,X.s1.y1,X.s1.x2,X.s1.y2,LS.x1t,LS.x1tr,P.CYAN,P.FUCHSIA);
    drawSlash(X.s2.x1,X.s2.y1,X.s2.x2,X.s2.y2,LS.x2t,LS.x2tr,P.CYAN,P.VIOLET);
    if(LS.x1t>=1&&LS.x2t>=1) LS.phase='hold';
  }
}

/* ═══════════════════════════════════════════════════════
   TIMELINE
═══════════════════════════════════════════════════════ */
const TL = {
  LOGO_START:   2400,
  BRAND_SHOW:   3700,
  BRAND_FADE:   12200,
  VENOM_FADE:   12600,
  MISSILE_IN:   14500,
  MISSILE_OUT:  99000,
  END_IN:       MISSILE ? 100200 : 14500,
  END_HOLD:     MISSILE ? 113000 : 27500,
  HARD_RELOAD:  MISSILE ? 115500 : 30000,
};

let startT=null, flags={};

function frame(ts) {
  if(!startT) startT=ts;
  const e=ts-startT;

  // Pattern — update + draw every frame
  vCtx.clearRect(0,0,W,H);
  updatePattern();
  drawPattern();

  // Logo
  tickLogo();

  // Start X slashes
  if(e>=TL.LOGO_START && !flags.logoStart){
    flags.logoStart=true;
    LS.phase='x';
  }

  // Brand unit: X dom text + TR + DYNAMICS
  if(e>=TL.BRAND_SHOW && !flags.brandShow){
    flags.brandShow=true;
    brandUnit.classList.add('show');
    requestAnimationFrame(()=>{
      brandX.classList.add('slash-in');
      setTimeout(()=>{ brandTR.classList.add('show'); brandDyn.classList.add('show'); },160);
    });
  }

  // Fade brand + logo canvas
  if(e>=TL.BRAND_FADE && !flags.brandFade){
    flags.brandFade=true;
    brandUnit.style.transition='opacity 1s ease';
    brandUnit.style.opacity='0';
    logoCanvas.style.transition='opacity 1s ease';
    logoCanvas.style.opacity='0';
  }

  // Fade pattern
  if(e>=TL.VENOM_FADE && !flags.venomFade){
    flags.venomFade=true;
    const fs=ts, fd=1300, sa=patternAlpha;
    (function fade(now){
      const ft=clamp((now-fs)/fd,0,1);
      patternAlpha=lerp(sa,0,easeOut(ft));
      if(ft<1) requestAnimationFrame(fade);
    })(ts);
  }

  // Missile
  if(MISSILE){
    if(e>=TL.MISSILE_IN && !flags.missileIn){
      flags.missileIn=true;
      sceneMissile.classList.add('show');
      setTimeout(()=>missileInner.classList.add('show'),200);
    }
    if(e>=TL.MISSILE_OUT && !flags.missileOut){
      flags.missileOut=true;
      missileInner.style.transition='opacity 1s ease';
      missileInner.style.opacity='0';
      setTimeout(()=>sceneMissile.classList.remove('show'),1100);
    }
  }

  // End card
  if(e>=TL.END_IN && !flags.endIn){
    flags.endIn=true;
    sceneEnd.classList.add('show');
    setTimeout(()=>endInner.classList.add('show'),200);
  }
  if(e>=TL.END_HOLD && !flags.endFade){
    flags.endFade=true;
    endInner.style.transition='opacity 1.2s ease';
    endInner.style.opacity='0';
    setTimeout(()=>{ sceneEnd.style.transition='opacity 1.2s ease'; sceneEnd.style.opacity='0'; },100);
  }

  // HARD RELOAD
  if(e>=TL.HARD_RELOAD){ location.reload(); return; }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

})();