/**
 * XTR DYNAMICS — AD ENGINE v3
 *
 * SEQUENCE:
 *  0s      Lissajous figures bloom from ground, spread across full screen
 *  ~4s     XTR slashes animate ON TOP of living Lissajous background
 *          X = two katana cuts, T = simultaneous velocity streaks + stem UP
 *          R = ground shockwave then r-shape rises
 *  ~11s    XTR + DYNAMICS fade in together as one unit (canvas draws stay)
 *  ~15s    Everything fades → missile scene (if asset present) OR end card
 *  end     HARD page reload (location.reload())
 */

(function () {
'use strict';

/* ─────────────────────────────────────────
   PALETTE
───────────────────────────────────────── */
const P = {
  CYAN:    '#00FFFF',
  FUCHSIA: '#FF00FF',
  VIOLET:  '#9D00FF',
  VPALE:   '#E0AAFF',
  WHITE:   '#F5F5F5',
};

/* ─────────────────────────────────────────
   DOM
───────────────────────────────────────── */
const cursor      = document.getElementById('cursor');
const cursorTrail = document.getElementById('cursor-trail');
const bgCanvas    = document.getElementById('bg-canvas');
const bCtx        = bgCanvas.getContext('2d');
const logoCanvas  = document.getElementById('logo-canvas');
const lCtx        = logoCanvas.getContext('2d');
const brandUnit   = document.getElementById('brand-unit');
const sceneMissile= document.getElementById('scene-missile');
const missileInner= document.getElementById('missile-inner');
const missileFrame= document.getElementById('missile-frame');
const sceneEnd    = document.getElementById('scene-end');
const endInner    = document.getElementById('end-inner');

let W = 0, H = 0;

/* ─────────────────────────────────────────
   RESIZE
───────────────────────────────────────── */
function resize() {
  W = bgCanvas.width  = logoCanvas.width  = window.innerWidth;
  H = bgCanvas.height = logoCanvas.height = window.innerHeight;
  logoCanvas.style.width  = bgCanvas.style.width  = W + 'px';
  logoCanvas.style.height = bgCanvas.style.height = H + 'px';
}
window.addEventListener('resize', () => { resize(); initLissa(); });
resize();

/* ─────────────────────────────────────────
   CUSTOM CURSOR
───────────────────────────────────────── */
let mx = W/2, my = H/2;
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px';
  cursor.style.top  = my + 'px';
  cursorTrail.style.left = mx + 'px';
  cursorTrail.style.top  = my + 'px';
});

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const lerp    = (a,b,t) => a+(b-a)*t;
const clamp   = (v,a,b) => Math.max(a,Math.min(b,v));
const easeOut = t => 1-Math.pow(1-t,3);

/* ─────────────────────────────────────────
   MISSILE ASSET CHECK
───────────────────────────────────────── */
function hasMissileAsset() {
  const v = missileFrame.querySelector('video');
  const i = missileFrame.querySelector('img');
  if (v && v.getAttribute('src')) return true;
  if (i && i.getAttribute('src')) return true;
  return false;
}
const MISSILE = hasMissileAsset();

/* ═══════════════════════════════════════════
   LISSAJOUS SYSTEM
   Figures bloom from ground pierce points,
   stay alive as animated background throughout
═══════════════════════════════════════════ */
let figures = [];

const LISSA_RATIOS = [
  [3,2],[5,4],[2,3],[7,4],[3,4],
  [5,2],[4,3],[7,6],[2,5],[5,3],[8,5]
];
const LISSA_COLORS = [
  [P.CYAN,    P.FUCHSIA],
  [P.FUCHSIA, P.VIOLET ],
  [P.VIOLET,  P.CYAN   ],
  [P.VPALE,   P.FUCHSIA],
  [P.CYAN,    P.VIOLET ],
];

function initLissa() {
  figures = [];
  const count = 11;
  for (let i = 0; i < count; i++) {
    const xCenter = W * 0.05 + (W * 0.90) * (i / (count - 1));
    const [a, b]  = LISSA_RATIOS[i % LISSA_RATIOS.length];
    const [c1,c2] = LISSA_COLORS[i % LISSA_COLORS.length];
    const maxSc   = W * 0.048 + Math.random() * W * 0.038;

    figures.push({
      cx:      xCenter,
      groundY: H,
      riseY:   H * 0.12 + Math.random() * H * 0.60,
      a, b,
      delta:   (Math.PI / 5) * i,
      c1, c2,
      scale:   0,
      maxScale: maxSc,
      drawT:   0,          // how much of stroke is drawn (0→1)
      drawSpd: 0.007 + Math.random() * 0.005,
      bloom:   0,          // 0→1 controls rise + size
      bloomSpd:0.012 + Math.random() * 0.008,
      bloomDelay: i * 0.07,
      alpha:   0.55 + Math.random() * 0.35,
      lw:      0.7 + Math.random() * 1.1,
      // slow drift after bloom
      driftAng: Math.random() * Math.PI * 2,
      driftSpd: 0.003 + Math.random() * 0.003,
    });
  }
}
initLissa();

function drawLissajous(globalProgress) {
  figures.forEach(fig => {
    // Bloom gated by delay
    const local = clamp((globalProgress - fig.bloomDelay) / (1 - fig.bloomDelay), 0, 1);
    if (local <= 0) return;

    fig.bloom  = Math.min(fig.bloom  + fig.bloomSpd,  1);
    fig.drawT  = Math.min(fig.drawT  + fig.drawSpd,   1);
    fig.driftAng += fig.driftSpd;

    // Center rises from ground to riseY
    const cy    = lerp(fig.groundY, fig.riseY, easeOut(fig.bloom));
    fig.scale   = easeOut(fig.bloom) * fig.maxScale;

    const totalAngle = Math.PI * 2 * 5; // 5 complete loops
    const steps      = Math.floor(fig.drawT * 500);
    if (steps < 2) return;

    // Outer glow pass
    bCtx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const tt = (s / steps) * totalAngle;
      const px = fig.cx + fig.scale * Math.sin(fig.a * tt + fig.delta + fig.driftAng * 0.1);
      const py = cy      - fig.scale * 0.65 * Math.sin(fig.b * tt);
      s === 0 ? bCtx.moveTo(px, py) : bCtx.lineTo(px, py);
    }
    bCtx.strokeStyle = fig.c1;
    bCtx.lineWidth   = fig.lw + 3.5;
    bCtx.globalAlpha = fig.alpha * 0.18 * local;
    bCtx.shadowColor = fig.c1;
    bCtx.shadowBlur  = 28;
    bCtx.stroke();

    // Sharp colored inner stroke
    bCtx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const tt = (s / steps) * totalAngle;
      const px = fig.cx + fig.scale * Math.sin(fig.a * tt + fig.delta + fig.driftAng * 0.1);
      const py = cy      - fig.scale * 0.65 * Math.sin(fig.b * tt);
      s === 0 ? bCtx.moveTo(px, py) : bCtx.lineTo(px, py);
    }
    const grad = bCtx.createLinearGradient(
      fig.cx - fig.scale, cy - fig.scale,
      fig.cx + fig.scale, cy + fig.scale * 0.3
    );
    grad.addColorStop(0, fig.c1);
    grad.addColorStop(1, fig.c2);
    bCtx.strokeStyle = grad;
    bCtx.lineWidth   = fig.lw;
    bCtx.globalAlpha = fig.alpha * local;
    bCtx.shadowColor = fig.c2;
    bCtx.shadowBlur  = 12;
    bCtx.stroke();

    // Pierce dot at ground
    bCtx.beginPath();
    bCtx.arc(fig.cx, H - 1, 2.8, 0, Math.PI * 2);
    bCtx.fillStyle  = fig.c1;
    bCtx.globalAlpha= local * 0.9;
    bCtx.shadowColor= fig.c1;
    bCtx.shadowBlur = 20;
    bCtx.fill();

    bCtx.globalAlpha = 1;
    bCtx.shadowBlur  = 0;
  });
}

/* ═══════════════════════════════════════════
   LOGO DRAWING ON logoCanvas
   X — katana slash × 2
   T — simultaneous center-out, stem UP
   R — ground shockwave → r shape rises
═══════════════════════════════════════════ */

// Geometry relative to screen center
function G() {
  const cx = W / 2, cy = H / 2;
  const unit = Math.min(W, H) * 0.16;

  // X — left of center
  const xl = cx - unit * 1.55;
  const X = {
    s1: { x1: xl-unit*0.62, y1: cy-unit, x2: xl+unit*0.62, y2: cy+unit },
    s2: { x1: xl+unit*0.62, y1: cy-unit, x2: xl-unit*0.62, y2: cy+unit },
  };

  // T — center
  const T = {
    barY:  cy + unit * 0.08,
    barLX: cx - unit * 0.75,
    barRX: cx + unit * 0.75,
    barCX: cx,
    stemBotY: cy + unit * 0.08,
    stemTopY: cy - unit * 0.92,
    stemX: cx,
  };

  // R — right of center
  const rl  = cx + unit * 1.38;
  const rTop= cy - unit;
  const rBot= cy + unit;
  const R = {
    stemX:  rl - unit * 0.28,
    stemTop: rTop,
    stemBot: rBot,
    groundY: rBot,
    bowlCX: rl - unit * 0.05,
    bowlCY: cy - unit * 0.18,
    bowlRX: unit * 0.46,
    bowlRY: unit * 0.52,
    legX1:  rl - unit * 0.06,
    legY1:  cy + unit * 0.05,
    legX2:  rl + unit * 0.55,
    legY2:  rBot,
  };

  return { X, T, R };
}

/* Logo animation state */
const LS = {
  phase: 'idle',
  x1t: 0, x2t: 0, x1trail: [], x2trail: [],
  tBarL: 0, tBarR: 0, tStem: 0,
  rGroundT: 0, rRings: [], rStem: 0, rBowl: 0, rLeg: 0,
};

const SPD = { x: 0.06, t: 0.045, r: 0.034 };

function resetLogo() {
  Object.assign(LS, {
    phase:'idle',
    x1t:0, x2t:0, x1trail:[], x2trail:[],
    tBarL:0, tBarR:0, tStem:0,
    rGroundT:0, rRings:[],
    rStem:0, rBowl:0, rLeg:0,
  });
  lCtx.clearRect(0, 0, W, H);
}

function gStroke(x1,y1,x2,y2,col,lw,blur,alpha=1) {
  lCtx.save();
  lCtx.beginPath();
  lCtx.moveTo(x1,y1); lCtx.lineTo(x2,y2);
  lCtx.strokeStyle=col; lCtx.lineWidth=lw;
  lCtx.globalAlpha=alpha;
  lCtx.shadowColor=col; lCtx.shadowBlur=blur;
  lCtx.stroke(); lCtx.restore();
}

function trail(arr, col, maxW) {
  for (let i = 1; i < arr.length; i++) {
    const a = i / arr.length;
    lCtx.save();
    lCtx.beginPath();
    lCtx.moveTo(arr[i-1].x, arr[i-1].y);
    lCtx.lineTo(arr[i].x,   arr[i].y);
    lCtx.strokeStyle=col; lCtx.lineWidth=a*maxW;
    lCtx.globalAlpha=a*0.6;
    lCtx.shadowColor=col; lCtx.shadowBlur=8;
    lCtx.stroke(); lCtx.restore();
  }
}

function spark(x, y, col) {
  lCtx.save();
  lCtx.beginPath(); lCtx.arc(x,y,3.5,0,Math.PI*2);
  lCtx.fillStyle='#fff'; lCtx.globalAlpha=0.92;
  lCtx.shadowColor=col; lCtx.shadowBlur=28;
  lCtx.fill(); lCtx.restore();
}

function drawX(g) {
  const {s1,s2} = g.X;
  if (LS.x1t > 0) {
    const t=easeOut(clamp(LS.x1t,0,1));
    const ex=lerp(s1.x1,s1.x2,t), ey=lerp(s1.y1,s1.y2,t);
    LS.x1trail.push({x:ex,y:ey}); if(LS.x1trail.length>24)LS.x1trail.shift();
    trail(LS.x1trail, P.FUCHSIA, 5);
    gStroke(s1.x1,s1.y1,ex,ey, P.CYAN,2.8,22);
    if(LS.x1t<1) spark(ex,ey,P.CYAN);
  }
  if(LS.x1t>=1){
    gStroke(s1.x1,s1.y1,s1.x2,s1.y2, P.VIOLET,6,24,0.4);
    gStroke(s1.x1,s1.y1,s1.x2,s1.y2, P.CYAN,1.4,10,0.9);
  }
  if (LS.x2t > 0) {
    const t=easeOut(clamp(LS.x2t,0,1));
    const ex=lerp(s2.x1,s2.x2,t), ey=lerp(s2.y1,s2.y2,t);
    LS.x2trail.push({x:ex,y:ey}); if(LS.x2trail.length>24)LS.x2trail.shift();
    trail(LS.x2trail, P.FUCHSIA, 5);
    gStroke(s2.x1,s2.y1,ex,ey, P.CYAN,2.8,22);
    if(LS.x2t<1) spark(ex,ey,P.CYAN);
  }
  if(LS.x2t>=1){
    gStroke(s2.x1,s2.y1,s2.x2,s2.y2, P.VIOLET,6,24,0.4);
    gStroke(s2.x1,s2.y1,s2.x2,s2.y2, P.CYAN,1.4,10,0.9);
  }
}

function drawT(g) {
  const {T} = g;
  if (LS.tBarL > 0) {
    const lx = lerp(T.barCX, T.barLX, easeOut(LS.tBarL));
    const rx = lerp(T.barCX, T.barRX, easeOut(LS.tBarR));
    gStroke(T.barCX,T.barY, lx,T.barY, P.FUCHSIA,2.8,22);
    gStroke(T.barCX,T.barY, rx,T.barY, P.FUCHSIA,2.8,22);
    // velocity tails
    if(LS.tBarL>0.3){
      const tgl=lCtx.createLinearGradient(lx,0,lx+50,0);
      tgl.addColorStop(0,P.VPALE); tgl.addColorStop(1,'transparent');
      lCtx.save(); lCtx.beginPath();
      lCtx.moveTo(lx,T.barY); lCtx.lineTo(lx+50,T.barY);
      lCtx.strokeStyle=tgl; lCtx.lineWidth=1.5;
      lCtx.globalAlpha=0.55*LS.tBarL; lCtx.stroke(); lCtx.restore();

      const tgr=lCtx.createLinearGradient(rx,0,rx-50,0);
      tgr.addColorStop(0,P.VPALE); tgr.addColorStop(1,'transparent');
      lCtx.save(); lCtx.beginPath();
      lCtx.moveTo(rx,T.barY); lCtx.lineTo(rx-50,T.barY);
      lCtx.strokeStyle=tgr; lCtx.lineWidth=1.5;
      lCtx.globalAlpha=0.55*LS.tBarR; lCtx.stroke(); lCtx.restore();
    }
    if(LS.tBarL<1){ spark(lx,T.barY,P.FUCHSIA); spark(rx,T.barY,P.FUCHSIA); }
  }
  if (LS.tStem > 0) {
    const ty = lerp(T.stemBotY, T.stemTopY, easeOut(LS.tStem));
    gStroke(T.stemX,T.stemBotY, T.stemX,ty, P.FUCHSIA,2.8,22);
    if(LS.tStem<1) spark(T.stemX,ty,P.CYAN);
    if(LS.tStem>0.2){
      const tg=lCtx.createLinearGradient(0,ty,0,ty+45);
      tg.addColorStop(0,P.VPALE); tg.addColorStop(1,'transparent');
      lCtx.save(); lCtx.beginPath();
      lCtx.moveTo(T.stemX,ty); lCtx.lineTo(T.stemX,ty+45);
      lCtx.strokeStyle=tg; lCtx.lineWidth=1.5;
      lCtx.globalAlpha=0.5*LS.tStem; lCtx.stroke(); lCtx.restore();
    }
  }
}

function drawR(g) {
  const r = g.R;
  // Ground rings
  LS.rRings.forEach(ring => {
    ring.radius += 2.4; ring.alpha = Math.max(0, ring.alpha - 0.022);
    if (ring.alpha <= 0) return;
    lCtx.save();
    lCtx.beginPath();
    lCtx.ellipse(r.stemX, r.groundY, ring.radius, ring.radius*0.2, 0, 0, Math.PI*2);
    lCtx.strokeStyle=P.VIOLET; lCtx.lineWidth=1.3;
    lCtx.globalAlpha=ring.alpha;
    lCtx.shadowColor=P.VIOLET; lCtx.shadowBlur=16;
    lCtx.stroke(); lCtx.restore();
  });
  // Stem
  if(LS.rStem>0){
    const sy=lerp(r.stemBot,r.stemTop,easeOut(LS.rStem));
    gStroke(r.stemX,r.stemBot,r.stemX,sy,P.VIOLET,2.8,18);
    if(LS.rStem<1) spark(r.stemX,sy,P.VIOLET);
  }
  // Bowl arc
  if(LS.rBowl>0){
    lCtx.save();
    lCtx.beginPath();
    lCtx.ellipse(r.bowlCX,r.bowlCY,r.bowlRX,r.bowlRY,0,
      -Math.PI*0.88, -Math.PI*0.88 + Math.PI*easeOut(LS.rBowl));
    lCtx.strokeStyle=P.VIOLET; lCtx.lineWidth=2.8;
    lCtx.globalAlpha=0.92;
    lCtx.shadowColor=P.VIOLET; lCtx.shadowBlur=18;
    lCtx.stroke(); lCtx.restore();
  }
  // Leg — diagonal recoil kick to ground
  if(LS.rLeg>0){
    const ex=lerp(r.legX1,r.legX2,easeOut(LS.rLeg));
    const ey=lerp(r.legY1,r.legY2,easeOut(LS.rLeg));
    gStroke(r.legX1,r.legY1,ex,ey,P.FUCHSIA,2.8,18);
    if(LS.rLeg>0.75){
      const ia=(LS.rLeg-0.75)/0.25;
      lCtx.save();
      lCtx.beginPath(); lCtx.arc(ex,ey,3,0,Math.PI*2);
      lCtx.fillStyle='#fff'; lCtx.globalAlpha=ia*0.88;
      lCtx.shadowColor=P.FUCHSIA; lCtx.shadowBlur=22;
      lCtx.fill(); lCtx.restore();
    }
  }
}

function tickLogo() {
  lCtx.clearRect(0, 0, W, H);
  const g = G();

  if (LS.phase === 'idle') return;

  switch(LS.phase) {
    case 'x':
      LS.x1t += SPD.x;
      if (LS.x1t >= 0.55) LS.x2t += SPD.x;
      drawX(g);
      if (LS.x2t >= 1) LS.phase = 't';
      break;

    case 't':
      drawX(g);
      LS.tBarL += SPD.t; LS.tBarR += SPD.t; LS.tStem += SPD.t;
      drawT(g);
      if (LS.tBarL >= 1 && LS.tStem >= 1) LS.phase = 'r-ground';
      break;

    case 'r-ground':
      drawX(g); drawT(g);
      LS.rGroundT += 0.07;
      if (LS.rRings.length < 6) LS.rRings.push({ radius:3, alpha:0.85 });
      drawR(g);
      if (LS.rGroundT >= 1) LS.phase = 'r-rise';
      break;

    case 'r-rise':
      drawX(g); drawT(g);
      LS.rStem += SPD.r;
      if (LS.rStem > 0.38) LS.rBowl += SPD.r * 0.88;
      if (LS.rBowl > 0.52) LS.rLeg  += SPD.r * 1.1;
      drawR(g);
      if (LS.rLeg >= 1) LS.phase = 'hold';
      break;

    case 'hold':
      drawX(g); drawT(g); drawR(g);
      break;
  }
}

/* ═══════════════════════════════════════════
   TIMELINE
═══════════════════════════════════════════ */
const TL = {
  LISSA_FULL:    4200,   // Lissajous fully bloomed
  LOGO_START:    4500,   // XTR slashes begin
  BRAND_SHOW:    11200,  // XTR + DYNAMICS text unit fades in
  SCENE_FADE:    15000,  // everything fades out
  MISSILE_IN:    16200,  // missile scene (if asset)
  MISSILE_OUT:   100000,
  END_IN:        MISSILE ? 101500 : 16200,
  END_HOLD:      MISSILE ? 115000 : 29000,
  HARD_RELOAD:   MISSILE ? 117000 : 31000,
};

let startT = null, flags = {};
let lissaProgress = 0;

function frame(ts) {
  if (!startT) startT = ts;
  const e = ts - startT;

  /* BG — clear then draw Lissajous every frame */
  bCtx.clearRect(0, 0, W, H);

  // Lissajous progress: 0→1 over first 4.2s, then stays at 1 (figures keep animating)
  lissaProgress = Math.min(lissaProgress + 0.0022, 1);
  drawLissajous(Math.min(e / TL.LISSA_FULL, 1));

  /* Logo tick */
  if (LS.phase !== 'idle') tickLogo();

  /* ── Start XTR slashes ── */
  if (e >= TL.LOGO_START && !flags.logoStarted) {
    flags.logoStarted = true;
    LS.phase = 'x';
  }

  /* ── Brand unit: XTR + DYNAMICS together ── */
  if (e >= TL.BRAND_SHOW && !flags.brandShown) {
    flags.brandShown = true;
    brandUnit.style.transition = 'opacity 1.0s ease';
    brandUnit.classList.add('show');
  }

  /* ── Fade everything out before next scene ── */
  if (e >= TL.SCENE_FADE && !flags.sceneFading) {
    flags.sceneFading = true;
    // Fade logo canvas + brand unit
    logoCanvas.style.transition = 'opacity 1s ease';
    logoCanvas.style.opacity = '0';
    brandUnit.style.transition = 'opacity 1s ease';
    brandUnit.style.opacity = '0';
    // Also dim Lissajous on bg
    bgCanvas.style.transition = 'opacity 1s ease';
    bgCanvas.style.opacity = '0.15';
  }

  /* ── Missile scene ── */
  if (MISSILE) {
    if (e >= TL.MISSILE_IN && !flags.missileIn) {
      flags.missileIn = true;
      sceneMissile.classList.add('show');
      sceneMissile.style.transition = 'opacity 1s ease';
      setTimeout(() => missileInner.classList.add('show'), 200);
    }
    if (e >= TL.MISSILE_OUT && !flags.missileOut) {
      flags.missileOut = true;
      missileInner.style.transition = 'opacity 1s ease';
      missileInner.style.opacity = '0';
      setTimeout(() => { sceneMissile.classList.remove('show'); }, 1100);
    }
  }

  /* ── End card ── */
  if (e >= TL.END_IN && !flags.endIn) {
    flags.endIn = true;
    sceneEnd.style.transition = 'opacity 1s ease';
    sceneEnd.classList.add('show');
    setTimeout(() => endInner.classList.add('show'), 200);
  }

  if (e >= TL.END_HOLD && !flags.endFading) {
    flags.endFading = true;
    endInner.style.transition = 'opacity 1.2s ease';
    endInner.style.opacity = '0';
    sceneEnd.style.transition = 'opacity 1.2s ease';
    setTimeout(() => { sceneEnd.style.opacity = '0'; }, 100);
  }

  /* ── HARD RELOAD ── */
  if (e >= TL.HARD_RELOAD) {
    location.reload();
    return;
  }

  requestAnimationFrame(frame);
}

/* ── KICK OFF ── */
requestAnimationFrame(frame);

})();