/**
 * XTR DYNAMICS — AD ENGINE v4
 *
 * SEQUENCE:
 *  0s     Multiple spikes pierce upward from bottom edge simultaneously
 *         Each spike grows upward then branches into tendrils that creep
 *         across the screen connecting to each other — venom / symbiote style
 *  ~2.5s  XTR slashes in WHILE tendrils still spreading
 *         X = two diagonal cuts stab inward simultaneously, lock in place
 *         TR = slides in immediately after X settles
 *         DYNAMICS = fades in below TR
 *  ~5s    Tendrils dim slightly, brand unit holds
 *  ~13s   Everything fades → missile (if asset) → end card
 *  end    location.reload() — hard restart
 */

(function () {
'use strict';

/* ─── PALETTE ─────────────────────────── */
const P = {
  CYAN:    '#00FFFF',
  FUCHSIA: '#FF00FF',
  VIOLET:  '#9D00FF',
  VPALE:   '#E0AAFF',
  GREEN:   '#00FF88',
  WHITE:   '#F0F0F0',
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
  W = venomCanvas.width  = logoCanvas.width  = window.innerWidth;
  H = venomCanvas.height = logoCanvas.height = window.innerHeight;
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
const rand    = (a,b) => a + Math.random()*(b-a);

/* ─── MISSILE CHECK ───────────────────── */
function hasMissile() {
  const v = missileFrame.querySelector('video[src]');
  const i = missileFrame.querySelector('img[src]');
  return !!(v||i);
}
const MISSILE = hasMissile();

/* ═══════════════════════════════════════════════════════
   VENOM TENDRIL SYSTEM

   Architecture:
   - SPIKES: 7 primary spikes pierce upward from bottom edge
     simultaneously. Each spike is a straight aggressive line
     rising fast from a pierce point.
   - BRANCHES: Each spike, as it grows, spawns BRANCHES —
     secondary tendrils that curl left/right and creep
     across the screen organically.
   - CONNECTORS: When two branch tips come within range,
     a connector line bridges them — like the symbiote
     web connecting across the screen.
   - Colors: each spike gets a color from neon palette,
     branches inherit parent color, connectors use blend.
═══════════════════════════════════════════════════════ */

const SPIKE_COLORS = [
  P.CYAN, P.FUCHSIA, P.VIOLET, P.CYAN,
  P.FUCHSIA, P.GREEN, P.VPALE
];

class Tendril {
  constructor(x, y, angle, color, len, gen=0, width=2) {
    this.x      = x;
    this.y      = y;
    this.angle  = angle;       // direction of growth (radians, 0=right, -π/2=up)
    this.color  = color;
    this.maxLen = len;
    this.gen    = gen;         // generation: 0=spike, 1=branch, 2=sub-branch
    this.width  = width;
    this.speed  = gen===0 ? 14 : gen===1 ? 6 : 3.5; // px per frame
    this.drawn  = 0;           // how far drawn
    this.done   = false;
    this.points = [{x,y}];
    // Curvature — spikes are straight, branches curve
    this.curvature = gen===0 ? 0 : (Math.random()-0.5)*0.04;
    this.children  = [];
    this.spawned   = false;
    this.alpha     = 1;
    // Jitter for organic feel
    this.jitter = gen===0 ? 0.008 : 0.035;
  }

  tip() { return this.points[this.points.length-1]; }

  update() {
    if (this.done) { this.children.forEach(c=>c.update()); return; }
    const step = Math.min(this.speed, this.maxLen - this.drawn);
    this.angle += this.curvature + (Math.random()-0.5)*this.jitter;
    const t = this.tip();
    const nx = t.x + Math.cos(this.angle)*step;
    const ny = t.y + Math.sin(this.angle)*step;
    this.points.push({x:nx, y:ny});
    this.drawn += step;
    if (this.drawn >= this.maxLen) {
      this.done = true;
      this.spawnChildren();
    }
    this.children.forEach(c=>c.update());
  }

  spawnChildren() {
    if (this.gen >= 2) return; // max 3 generations
    const count = this.gen===0 ? rand(3,6)|0 : rand(1,3)|0;
    const baseAngle = this.angle;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random()-0.5) * (this.gen===0 ? 1.8 : 1.1);
      const childAngle = baseAngle + spread;
      // Branch length decreases each gen
      const childLen = this.maxLen * (0.35 + Math.random()*0.4);
      const childW   = this.width * 0.55;
      const t = this.tip();
      // Slightly shift child colors for variety
      const colors = [this.color, P.CYAN, P.FUCHSIA, P.VIOLET, P.VPALE];
      const col = colors[Math.floor(Math.random()*colors.length)];
      this.children.push(
        new Tendril(t.x, t.y, childAngle, col, childLen, this.gen+1, childW)
      );
    }
  }

  draw(ctx, globalAlpha=1) {
    if (this.points.length < 2) { this.children.forEach(c=>c.draw(ctx,globalAlpha)); return; }

    ctx.save();
    ctx.globalAlpha = this.alpha * globalAlpha;

    // Outer glow
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i=1;i<this.points.length;i++) ctx.lineTo(this.points[i].x, this.points[i].y);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = this.width + 3;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 18;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.globalAlpha = this.alpha * globalAlpha * 0.22;
    ctx.stroke();

    // Core sharp line
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i=1;i<this.points.length;i++) ctx.lineTo(this.points[i].x, this.points[i].y);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = this.width;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 8;
    ctx.globalAlpha = this.alpha * globalAlpha;
    ctx.stroke();

    ctx.restore();
    this.children.forEach(c=>c.draw(ctx, globalAlpha));
  }

  // Collect all tip positions (for connector logic)
  collectTips(arr) {
    if (this.done && this.points.length > 1) arr.push(this.tip());
    this.children.forEach(c=>c.collectTips(arr));
  }
}

/* ─── SPIKE SETUP ─────────────────────── */
let spikes = [];
let connectors = []; // [{x1,y1,x2,y2,col,alpha}]
let connectorTimer = 0;

function initVenom() {
  spikes = [];
  connectors = [];
  connectorTimer = 0;

  const count = 7;
  for (let i = 0; i < count; i++) {
    // Distribute pierce points across bottom edge with some randomness
    const xBase = W * 0.05 + (W * 0.90) * (i / (count-1));
    const x = xBase + rand(-W*0.03, W*0.03);
    const y = H + 4;
    // Angle: mostly upward (-π/2) with slight variation
    const angle = -Math.PI/2 + rand(-0.28, 0.28);
    const col   = SPIKE_COLORS[i % SPIKE_COLORS.length];
    // Spike length: reaches between 40% and 85% up the screen
    const len   = H * (0.40 + Math.random()*0.45);
    const width = 1.8 + Math.random()*1.4;
    spikes.push(new Tendril(x, y, angle, col, len, 0, width));
  }
}
initVenom();

function updateVenom() {
  spikes.forEach(s => s.update());

  // Periodically find nearby tips and draw connectors
  connectorTimer++;
  if (connectorTimer % 8 === 0) {
    const tips = [];
    spikes.forEach(s => s.collectTips(tips));
    // Connect tips that are within range
    const range = W * 0.18;
    for (let i=0;i<tips.length;i++) {
      for (let j=i+1;j<tips.length;j++) {
        const dx=tips[i].x-tips[j].x, dy=tips[i].y-tips[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (dist < range && Math.random()<0.12) {
          connectors.push({
            x1:tips[i].x, y1:tips[i].y,
            x2:tips[j].x, y2:tips[j].y,
            col: [P.VIOLET,P.CYAN,P.FUCHSIA][Math.floor(Math.random()*3)],
            alpha: 0.3 + Math.random()*0.3,
            life: 1,
          });
          if (connectors.length > 60) connectors.shift();
        }
      }
    }
  }

  // Fade old connectors
  connectors.forEach(c => { c.life -= 0.008; c.alpha *= 0.998; });
  connectors = connectors.filter(c => c.life > 0);
}

function drawVenom(globalAlpha=1) {
  // Draw connectors first (behind tendrils)
  connectors.forEach(c => {
    vCtx.save();
    vCtx.beginPath();
    vCtx.moveTo(c.x1,c.y1); vCtx.lineTo(c.x2,c.y2);
    vCtx.strokeStyle = c.col;
    vCtx.lineWidth   = 0.8;
    vCtx.globalAlpha = c.alpha * c.life * globalAlpha;
    vCtx.shadowColor = c.col;
    vCtx.shadowBlur  = 10;
    vCtx.stroke();
    vCtx.restore();
  });
  // Draw spikes and all children
  spikes.forEach(s => s.draw(vCtx, globalAlpha));
}

/* ═══════════════════════════════════════════════════════
   LOGO DRAW SYSTEM
   X  = two diagonal slashes stab inward simultaneously
   TR = slides in after X settles
   DYNAMICS = fades below
═══════════════════════════════════════════════════════ */

// Logo geometry — centered on screen
function G() {
  const cx = W/2, cy = H/2;
  const u  = Math.min(W,H) * 0.155; // unit size

  // X is one large letter left of TR
  const xl = cx - u*0.9;
  const xr  = xl; // center of X letter

  const X = {
    // Slash 1: top-left → bottom-right, stabs inward
    s1: { x1: xr-u*0.58, y1: cy-u*0.82, x2: xr+u*0.58, y2: cy+u*0.82 },
    // Slash 2: top-right → bottom-left, simultaneous
    s2: { x1: xr+u*0.58, y1: cy-u*0.82, x2: xr-u*0.58, y2: cy+u*0.82 },
    cx: xr, cy,
  };

  return { X, cx, cy, u };
}

const LS = {
  phase: 'idle',
  // X slashes — both start simultaneously
  x1t: 0, x2t: 0,
  x1trail: [], x2trail: [],
  xDone: false,
};
const XSPD = 0.07;

function resetLogo() {
  Object.assign(LS, { phase:'idle', x1t:0, x2t:0, x1trail:[], x2trail:[], xDone:false });
  lCtx.clearRect(0,0,W,H);
}

function drawSlash(x1,y1,x2,y2,t,trail,col,glowCol) {
  const et = easeOut(clamp(t,0,1));
  const ex = lerp(x1,x2,et), ey = lerp(y1,y2,et);

  // Trail
  trail.push({x:ex,y:ey});
  if(trail.length>18) trail.shift();

  for(let i=1;i<trail.length;i++){
    const a=i/trail.length;
    lCtx.save();
    lCtx.beginPath();
    lCtx.moveTo(trail[i-1].x,trail[i-1].y);
    lCtx.lineTo(trail[i].x,trail[i].y);
    lCtx.strokeStyle=P.FUCHSIA;
    lCtx.lineWidth=a*5;
    lCtx.globalAlpha=a*0.55;
    lCtx.shadowColor=P.FUCHSIA;
    lCtx.shadowBlur=10;
    lCtx.stroke();
    lCtx.restore();
  }

  // Active stroke
  lCtx.save();
  lCtx.beginPath();
  lCtx.moveTo(x1,y1); lCtx.lineTo(ex,ey);
  lCtx.strokeStyle=col;
  lCtx.lineWidth=3;
  lCtx.shadowColor=glowCol;
  lCtx.shadowBlur=24;
  lCtx.lineCap='round';
  lCtx.stroke();
  lCtx.restore();

  // Stab-tip spark
  if(t<1){
    lCtx.save();
    lCtx.beginPath(); lCtx.arc(ex,ey,4,0,Math.PI*2);
    lCtx.fillStyle='#fff';
    lCtx.globalAlpha=0.95;
    lCtx.shadowColor=col;
    lCtx.shadowBlur=30;
    lCtx.fill();
    lCtx.restore();
  }

  // Settled glow line
  if(t>=1){
    // Outer glow
    lCtx.save();
    lCtx.beginPath(); lCtx.moveTo(x1,y1); lCtx.lineTo(x2,y2);
    lCtx.strokeStyle=glowCol; lCtx.lineWidth=7;
    lCtx.globalAlpha=0.35; lCtx.shadowColor=glowCol; lCtx.shadowBlur=28;
    lCtx.stroke(); lCtx.restore();
    // Core
    lCtx.save();
    lCtx.beginPath(); lCtx.moveTo(x1,y1); lCtx.lineTo(x2,y2);
    lCtx.strokeStyle=col; lCtx.lineWidth=1.5;
    lCtx.globalAlpha=0.9; lCtx.shadowColor=col; lCtx.shadowBlur=12;
    lCtx.stroke(); lCtx.restore();
  }
}

function tickLogo() {
  lCtx.clearRect(0,0,W,H);
  if(LS.phase==='idle') return;
  const g = G();
  const {X} = g;

  // Both slashes stab in simultaneously
  if(LS.phase==='x'){
    LS.x1t += XSPD; LS.x2t += XSPD;
    drawSlash(X.s1.x1,X.s1.y1,X.s1.x2,X.s1.y2, LS.x1t, LS.x1trail, P.CYAN, P.FUCHSIA);
    drawSlash(X.s2.x1,X.s2.y1,X.s2.x2,X.s2.y2, LS.x2t, LS.x2trail, P.CYAN, P.VIOLET);
    if(LS.x1t>=1 && LS.x2t>=1){ LS.xDone=true; LS.phase='hold'; }
  }

  if(LS.phase==='hold'){
    drawSlash(X.s1.x1,X.s1.y1,X.s1.x2,X.s1.y2, 1, [], P.CYAN, P.FUCHSIA);
    drawSlash(X.s2.x1,X.s2.y1,X.s2.x2,X.s2.y2, 1, [], P.CYAN, P.VIOLET);
  }
}

/* ═══════════════════════════════════════════════════════
   TIMELINE ENGINE
═══════════════════════════════════════════════════════ */
const TL = {
  VENOM_SPREAD:  2600,   // when tendrils have spread enough
  LOGO_START:    2400,   // X slashes start (while tendrils spreading)
  BRAND_SHOW:    3800,   // XTR text + TR + DYNAMICS all appear
  HOLD_END:      12000,  // everything starts fading
  BRAND_FADE:    12500,
  VENOM_FADE:    12800,
  SCENE_CLEAR:   14000,
  MISSILE_IN:    14800,
  MISSILE_OUT:   99000,
  END_IN:        MISSILE ? 100500 : 14800,
  END_HOLD:      MISSILE ? 114000 : 28000,
  HARD_RELOAD:   MISSILE ? 116500 : 30500,
};

let startT=null, flags={};
let venomAlpha=1;

function frame(ts) {
  if(!startT) startT=ts;
  const e = ts-startT;

  // ── Venom: update + draw every frame ──
  vCtx.clearRect(0,0,W,H);
  updateVenom();
  drawVenom(venomAlpha);

  // ── Logo tick every frame ──
  tickLogo();

  // ── Start X slashes ──
  if(e>=TL.LOGO_START && !flags.logoStart){
    flags.logoStart=true;
    LS.phase='x';
  }

  // ── Show brand text: X (DOM), TR, DYNAMICS together ──
  if(e>=TL.BRAND_SHOW && !flags.brandShow){
    flags.brandShow=true;
    brandUnit.classList.add('show');
    // X slashes in with CSS transform
    requestAnimationFrame(()=>{
      brandX.classList.add('slash-in');
      setTimeout(()=>{ brandTR.classList.add('show'); brandDyn.classList.add('show'); }, 160);
    });
  }

  // ── Fade brand ──
  if(e>=TL.BRAND_FADE && !flags.brandFade){
    flags.brandFade=true;
    brandUnit.style.transition='opacity 1s ease';
    brandUnit.style.opacity='0';
    logoCanvas.style.transition='opacity 1s ease';
    logoCanvas.style.opacity='0';
  }

  // ── Dim venom ──
  if(e>=TL.VENOM_FADE && !flags.venomFade){
    flags.venomFade=true;
    // Animate venomAlpha down smoothly
    const fadeStart=ts;
    const fadeDur=1200;
    const startA=venomAlpha;
    function fadeVenom(now){
      const ft=clamp((now-fadeStart)/fadeDur,0,1);
      venomAlpha=lerp(startA,0,easeOut(ft));
      if(ft<1) requestAnimationFrame(fadeVenom);
    }
    requestAnimationFrame(fadeVenom);
  }

  // ── Missile ──
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

  // ── End card ──
  if(e>=TL.END_IN && !flags.endIn){
    flags.endIn=true;
    sceneEnd.classList.add('show');
    setTimeout(()=>endInner.classList.add('show'),200);
  }
  if(e>=TL.END_HOLD && !flags.endFade){
    flags.endFade=true;
    endInner.style.transition='opacity 1.2s ease';
    endInner.style.opacity='0';
    sceneEnd.style.transition='opacity 1.2s ease';
    setTimeout(()=>{ sceneEnd.style.opacity='0'; },100);
  }

  // ── HARD RELOAD ──
  if(e>=TL.HARD_RELOAD){
    location.reload();
    return;
  }

  requestAnimationFrame(frame);
}

/* ── KICK OFF ── */
requestAnimationFrame(frame);

})();