/**
 * XTR DYNAMICS — AD ENGINE v6
 *
 * PATTERN: Looping oval clusters exactly like the sketch —
 * each "node" is a figure-8 / oval loop drawn continuously,
 * exit stroke connects to the next node. Starts from both
 * bottom corners, rapidly chains upward and across screen.
 *
 * SEQUENCE:
 *  0s      Loop clusters explode from bottom-left + bottom-right
 *  ~2.5s   X drawn as two crossing slash strokes (same energy)
 *  ~3.8s   TR + DYNAMICS text appear
 *  ~12s    Fade → end card → hard reload
 */

(function () {
'use strict';

const P = {
  CYAN:    '#00FFFF',
  FUCHSIA: '#FF00FF',
  VIOLET:  '#9D00FF',
  VPALE:   '#CC88FF',
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

function hasMissile() {
  return !!(missileFrame.querySelector('video[src]') ||
            missileFrame.querySelector('img[src]'));
}
const MISSILE = hasMissile();

/* ═══════════════════════════════════════════════════════
   OVAL LOOP CLUSTER SYSTEM

   Each "OvalNode" draws a looping oval (or figure-8) —
   exactly like the sketch shows. The oval is drawn as a
   continuous parametric curve. When done, it fires a
   connector stroke to the next node's anchor, then
   the next node starts drawing its oval.

   OvalNode math:
     A tilted ellipse drawn continuously:
     x(t) = cx + rx*cos(t)*cos(tilt) - ry*sin(t)*sin(tilt)
     y(t) = cy + rx*cos(t)*sin(tilt) + ry*sin(t)*cos(tilt)

   Chains spread from bottom corners upward,
   each node positioned relative to parent exit point
   + a random offset that biases upward/inward.
═══════════════════════════════════════════════════════ */

const PALETTE = [P.CYAN, P.FUCHSIA, P.VIOLET, P.VPALE, P.GREEN];

class OvalNode {
  constructor(cx, cy, rx, ry, tilt, col, lw, loops=1.3) {
    this.cx   = cx;
    this.cy   = cy;
    this.rx   = rx;     // semi-major
    this.ry   = ry;     // semi-minor
    this.tilt = tilt;   // rotation of oval
    this.col  = col;
    this.lw   = lw;
    this.loops= loops;  // how many times it wraps (1–2.5)
    this.maxT = loops * TAU;
    this.t    = 0;
    this.speed= 0.22 + Math.random()*0.30; // fast drawing
    this.done = false;
    this.child= null;
    this.connDone = false;
    this.connT    = 0;
    this.connPts  = null; // [{x,y}] connector path to child
    this.precompute();
  }

  precompute() {
    this.pts = [];
    const steps = Math.ceil(this.maxT / 0.05);
    for (let i = 0; i <= steps; i++) {
      const t  = (i/steps)*this.maxT;
      const ct = Math.cos(t), st = Math.sin(t);
      const tl = this.tilt;
      this.pts.push({
        x: this.cx + this.rx*ct*Math.cos(tl) - this.ry*st*Math.sin(tl),
        y: this.cy + this.rx*ct*Math.sin(tl) + this.ry*st*Math.cos(tl),
      });
    }
    this.exitPt = this.pts[this.pts.length-1];
  }

  // Compute where the child anchor will be
  // Bias: upward + spread left/right from current position
  childAnchor() {
    const spread   = rand(-1.5, 1.5);
    const upBias   = rand(0.4, 1.7);
    const diagX    = this.exitPt.x + spread * (this.rx * rand(1.2, 2.5));
    const diagY    = this.exitPt.y - upBias * (this.ry * rand(1.0, 2.2));
    return { x: diagX, y: diagY };
  }

  spawnChild() {
    if (!this.exitPt) return;
    const anchor = this.childAnchor();

    // Stop if way off screen
    if (anchor.x < -W*0.2 || anchor.x > W*1.2) return;
    if (anchor.y < -H*0.15) return;

    const scale  = rand(0.65, 1.25);
    const newRX  = this.rx * scale;
    const newRY  = this.ry * scale * rand(0.55, 1.0);
    const newTilt= this.tilt + rand(-0.9, 0.9);
    const newCol = PALETTE[Math.floor(Math.random()*PALETTE.length)];
    const newLW  = Math.max(0.5, this.lw * rand(0.7, 1.05));
    const newLoops=rand(1.1, 2.4);

    this.child = new OvalNode(anchor.x, anchor.y, newRX, newRY, newTilt, newCol, newLW, newLoops);

    // Build connector path (bezier-ish: 3 points)
    this.connPts = [
      this.exitPt,
      { x: lerp(this.exitPt.x, anchor.x, 0.5) + rand(-30,30),
        y: lerp(this.exitPt.y, anchor.y, 0.5) + rand(-20,20) },
      anchor,
    ];
    this.connSpeed = 0.07 + Math.random()*0.1;
  }

  update() {
    if (!this.done) {
      this.t = Math.min(this.t + this.speed, this.maxT);
      if (this.t >= this.maxT) {
        this.done = true;
        this.spawnChild();
      }
    } else if (!this.connDone && this.connPts) {
      this.connT = Math.min(this.connT + this.connSpeed, 1);
      if (this.connT >= 1) { this.connDone = true; }
    }
    if (this.child) this.child.update();
  }

  draw(ctx, ga) {
    if (this.pts.length < 2) { if(this.child) this.child.draw(ctx,ga); return; }
    const drawn = Math.max(2, Math.floor((this.t/this.maxT)*this.pts.length));

    // Glow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i=1;i<drawn;i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.strokeStyle = this.col;
    ctx.lineWidth   = this.lw + 4;
    ctx.globalAlpha = 0.15 * ga;
    ctx.shadowColor = this.col;
    ctx.shadowBlur  = 22;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // Core
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i=1;i<drawn;i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.strokeStyle = this.col;
    ctx.lineWidth   = this.lw;
    ctx.globalAlpha = ga * 0.85;
    ctx.shadowColor = this.col;
    ctx.shadowBlur  = 9;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // Live tip dot
    if (!this.done && drawn > 0) {
      const tip = this.pts[Math.min(drawn-1, this.pts.length-1)];
      ctx.save();
      ctx.beginPath(); ctx.arc(tip.x, tip.y, this.lw+1.5, 0, TAU);
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9*ga;
      ctx.shadowColor = this.col; ctx.shadowBlur = 20;
      ctx.fill(); ctx.restore();
    }

    // Connector stroke to child
    if (this.connPts && this.connT > 0) {
      const cPts = this.connPts;
      const t    = this.connT;
      // Quadratic bezier sample up to t
      const steps = 20;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cPts[0].x, cPts[0].y);
      for (let i=1; i<=Math.floor(steps*t); i++) {
        const tt = i/steps;
        const mt = 1-tt;
        const bx = mt*mt*cPts[0].x + 2*mt*tt*cPts[1].x + tt*tt*cPts[2].x;
        const by = mt*mt*cPts[0].y + 2*mt*tt*cPts[1].y + tt*tt*cPts[2].y;
        ctx.lineTo(bx, by);
      }
      ctx.strokeStyle = this.col;
      ctx.lineWidth   = this.lw * 0.7;
      ctx.globalAlpha = ga * 0.65;
      ctx.shadowColor = this.col;
      ctx.shadowBlur  = 10;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    if (this.child) this.child.draw(ctx, ga);
  }
}

/* ─── SEED CHAINS ─────────────────────── */
let chains = [];
let patternAlpha = 1;
const UNIT = () => Math.min(W,H) * 0.058;

function initPattern() {
  chains = [];
  patternAlpha = 1;
  const u = UNIT();

  // Bottom-left corner — fan of seeds
  const blSeeds = [
    { x:rand(10,40),  y:H-rand(10,40),  tilt:-0.3,  col:P.CYAN    },
    { x:rand(30,70),  y:H-rand(5,25),   tilt: 0.5,  col:P.FUCHSIA },
    { x:rand(5,30),   y:H-rand(30,60),  tilt:-0.9,  col:P.VIOLET  },
    { x:rand(60,100), y:H-rand(20,50),  tilt: 0.2,  col:P.VPALE   },
    { x:rand(15,50),  y:H-rand(50,90),  tilt:-0.6,  col:P.GREEN   },
  ];

  // Bottom-right corner — mirror fan
  const brSeeds = [
    { x:W-rand(10,40),  y:H-rand(10,40),  tilt: Math.PI+0.3,  col:P.FUCHSIA },
    { x:W-rand(30,70),  y:H-rand(5,25),   tilt: Math.PI-0.5,  col:P.CYAN    },
    { x:W-rand(5,30),   y:H-rand(30,60),  tilt: Math.PI+0.9,  col:P.VIOLET  },
    { x:W-rand(60,100), y:H-rand(20,50),  tilt: Math.PI-0.2,  col:P.GREEN   },
    { x:W-rand(15,50),  y:H-rand(50,90),  tilt: Math.PI+0.6,  col:P.VPALE   },
  ];

  [...blSeeds, ...brSeeds].forEach(s => {
    chains.push(new OvalNode(
      s.x, s.y,
      u * rand(0.7,1.4),
      u * rand(0.4,0.9),
      s.tilt,
      s.col,
      rand(0.9, 2.2),
      rand(1.2, 2.2)
    ));
  });
}

function updatePattern() { chains.forEach(c => c.update()); }
function drawPattern()   { chains.forEach(c => c.draw(vCtx, patternAlpha)); }

initPattern();

/* ═══════════════════════════════════════════════════════
   LOGO — X dual stab
═══════════════════════════════════════════════════════ */
function G() {
  const cx=W/2, cy=H/2;
  const u=Math.min(W,H)*0.155;
  const xl=cx-u*0.9;
  return {
    X:{
      s1:{x1:xl-u*0.58, y1:cy-u*0.82, x2:xl+u*0.58, y2:cy+u*0.82},
      s2:{x1:xl+u*0.58, y1:cy-u*0.82, x2:xl-u*0.58, y2:cy+u*0.82},
    }
  };
}

const LS = { phase:'idle', x1t:0, x2t:0, x1tr:[], x2tr:[] };

function drawSlash(x1,y1,x2,y2,t,tr,col,gc) {
  const et = easeOut(clamp(t,0,1));
  const ex = lerp(x1,x2,et), ey = lerp(y1,y2,et);
  tr.push({x:ex,y:ey}); if(tr.length>20) tr.shift();

  // Fuchsia trail
  for(let i=1;i<tr.length;i++){
    const a=i/tr.length;
    lCtx.save();
    lCtx.beginPath();
    lCtx.moveTo(tr[i-1].x,tr[i-1].y); lCtx.lineTo(tr[i].x,tr[i].y);
    lCtx.strokeStyle=P.FUCHSIA; lCtx.lineWidth=a*5;
    lCtx.globalAlpha=a*0.5; lCtx.shadowColor=P.FUCHSIA; lCtx.shadowBlur=10;
    lCtx.stroke(); lCtx.restore();
  }
  // Main stroke
  lCtx.save();
  lCtx.beginPath(); lCtx.moveTo(x1,y1); lCtx.lineTo(ex,ey);
  lCtx.strokeStyle=col; lCtx.lineWidth=3.2;
  lCtx.shadowColor=gc; lCtx.shadowBlur=28; lCtx.lineCap='round';
  lCtx.stroke(); lCtx.restore();
  // Tip spark
  if(t<1){
    lCtx.save();
    lCtx.beginPath(); lCtx.arc(ex,ey,4,0,TAU);
    lCtx.fillStyle='#fff'; lCtx.globalAlpha=0.95;
    lCtx.shadowColor=col; lCtx.shadowBlur=34;
    lCtx.fill(); lCtx.restore();
  }
  // Settled glow
  if(t>=1){
    lCtx.save();
    lCtx.beginPath(); lCtx.moveTo(x1,y1); lCtx.lineTo(x2,y2);
    lCtx.strokeStyle=gc; lCtx.lineWidth=9; lCtx.globalAlpha=0.28;
    lCtx.shadowColor=gc; lCtx.shadowBlur=32; lCtx.stroke(); lCtx.restore();
    lCtx.save();
    lCtx.beginPath(); lCtx.moveTo(x1,y1); lCtx.lineTo(x2,y2);
    lCtx.strokeStyle=col; lCtx.lineWidth=1.8; lCtx.globalAlpha=0.92;
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
  LOGO_START:  2400,
  BRAND_SHOW:  3700,
  BRAND_FADE:  12200,
  PAT_FADE:    12600,
  MISSILE_IN:  14500,
  MISSILE_OUT: 99000,
  END_IN:      MISSILE ? 100200 : 14500,
  END_HOLD:    MISSILE ? 113000 : 27500,
  RELOAD:      MISSILE ? 115500 : 30000,
};

let startT=null, flags={};

function frame(ts) {
  if(!startT) startT=ts;
  const e=ts-startT;

  vCtx.clearRect(0,0,W,H);
  updatePattern();
  drawPattern();
  tickLogo();

  if(e>=TL.LOGO_START && !flags.ls){ flags.ls=true; LS.phase='x'; }

  if(e>=TL.BRAND_SHOW && !flags.bs){
    flags.bs=true;
    brandUnit.classList.add('show');
    requestAnimationFrame(()=>{
      brandX.classList.add('slash-in');
      setTimeout(()=>{ brandTR.classList.add('show'); brandDyn.classList.add('show'); },160);
    });
  }

  if(e>=TL.BRAND_FADE && !flags.bf){
    flags.bf=true;
    brandUnit.style.transition='opacity 1s ease'; brandUnit.style.opacity='0';
    logoCanvas.style.transition='opacity 1s ease'; logoCanvas.style.opacity='0';
  }

  if(e>=TL.PAT_FADE && !flags.pf){
    flags.pf=true;
    const fs=ts, fd=1300;
    (function fade(now){
      patternAlpha=lerp(1,0,easeOut(clamp((now-fs)/fd,0,1)));
      if(patternAlpha>0) requestAnimationFrame(fade);
    })(ts);
  }

  if(MISSILE){
    if(e>=TL.MISSILE_IN && !flags.mi){
      flags.mi=true;
      sceneMissile.classList.add('show');
      setTimeout(()=>missileInner.classList.add('show'),200);
    }
    if(e>=TL.MISSILE_OUT && !flags.mo){
      flags.mo=true;
      missileInner.style.transition='opacity 1s ease'; missileInner.style.opacity='0';
      setTimeout(()=>sceneMissile.classList.remove('show'),1100);
    }
  }

  if(e>=TL.END_IN && !flags.ei){
    flags.ei=true;
    sceneEnd.classList.add('show');
    setTimeout(()=>endInner.classList.add('show'),200);
  }
  if(e>=TL.END_HOLD && !flags.eh){
    flags.eh=true;
    endInner.style.transition='opacity 1.2s ease'; endInner.style.opacity='0';
    setTimeout(()=>{ sceneEnd.style.transition='opacity 1.2s ease'; sceneEnd.style.opacity='0'; },100);
  }

  if(e>=TL.RELOAD){ location.reload(); return; }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

})();