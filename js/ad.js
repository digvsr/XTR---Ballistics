/**
 * XTR DYNAMICS — AD ENGINE v2
 *
 * TIMELINE:
 *   0      → 4s    Loader  : Lissajous figures bloom from ground pierce points
 *   4s     → ~13s  Logo    : X (fruit-ninja slash) → T (simultaneous center-out, stem UP) → R (ground shockwave → r rises)
 *   ~10s           "DYNAMICS" fades in
 *   ~13s   → ~15s  Logo fade out
 *   ~15s   → ~100s Missile : only if asset detected in #missile-frame, else skip
 *   ~100s  → ~104s Missile fade / skip
 *   ~104s  → ~118s End card: XTR large, cyan + fuchsia
 *   ~118s          Soft loop restart
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
const bgCanvas     = document.getElementById('bg-canvas');
const bCtx         = bgCanvas.getContext('2d');
const loaderBar    = document.getElementById('loader-bar');
const sLoader      = document.getElementById('scene-loader');
const sLogo        = document.getElementById('scene-logo');
const sMissile     = document.getElementById('scene-missile');
const sEnd         = document.getElementById('scene-end');
const logoCanvas   = document.getElementById('logo-canvas');
const lCtx         = logoCanvas.getContext('2d');
const dynamicsText = document.getElementById('dynamics-text');
const missileInner = document.getElementById('missile-inner');
const missileFrame = document.getElementById('missile-frame');
const endInner     = document.getElementById('end-inner');

let W = 0, H = 0, LW = 0, LH = 0;

/* ─────────────────────────────────────────
   RESIZE
───────────────────────────────────────── */
function resize() {
  W = bgCanvas.width  = window.innerWidth;
  H = bgCanvas.height = window.innerHeight;

  LW = Math.min(W * 0.78, H * 0.48, 640);
  LH = LW * 0.42;
  logoCanvas.width  = LW;
  logoCanvas.height = LH;
  logoCanvas.style.width  = LW + 'px';
  logoCanvas.style.height = LH + 'px';
}
window.addEventListener('resize', resize);
resize();

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const lerp    = (a,b,t) => a + (b-a)*t;
const clamp   = (v,a,b) => Math.max(a, Math.min(b,v));
const easeOut = t => 1 - Math.pow(1-t, 3);
const easeIn  = t => t * t * t;

function sceneIn(el)  { el.classList.add('active','fade-in'); }
function sceneOut(el) {
  el.classList.remove('active','fade-in');
  el.style.transition = 'opacity 0.9s ease';
  el.style.opacity = '0';
  setTimeout(() => { el.style.opacity=''; el.style.transition=''; }, 950);
}

/* ─────────────────────────────────────────
   MISSILE ASSET DETECTION
   Check if anything was placed inside #missile-frame
───────────────────────────────────────── */
function hasMissileAsset() {
  const v = missileFrame.querySelector('video');
  const i = missileFrame.querySelector('img');
  if (v && v.src && !v.src.endsWith('/')) return true;
  if (i && i.src && !i.src.endsWith('/')) return true;
  return false;
}

/* ─────────────────────────────────────────
   BACKGROUND — subtle ambient particles
───────────────────────────────────────── */
let bgParts = [];
function initBg() {
  bgParts = Array.from({length:55}, () => newBgPart());
}
function newBgPart() {
  return {
    x: Math.random()*W, y: Math.random()*H,
    r: 0.3 + Math.random()*1.1,
    a: 0.04 + Math.random()*0.18,
    vx:(Math.random()-0.5)*0.2,
    vy:-0.06 - Math.random()*0.25,
    life:1, decay:0.002+Math.random()*0.003,
    col:[P.CYAN,P.FUCHSIA,P.VIOLET][Math.floor(Math.random()*3)]
  };
}
function drawBg() {
  bCtx.clearRect(0,0,W,H);
  bgParts.forEach((p,i) => {
    p.x+=p.vx; p.y+=p.vy; p.life-=p.decay;
    if(p.life<=0||p.y<-5){ bgParts[i]=newBgPart(); bgParts[i].y=H+4; return; }
    bCtx.beginPath();
    bCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
    bCtx.fillStyle=p.col;
    bCtx.globalAlpha=p.a*p.life;
    bCtx.shadowColor=p.col;
    bCtx.shadowBlur=6;
    bCtx.fill();
  });
  bCtx.globalAlpha=1; bCtx.shadowBlur=0;
}
initBg();

/* ═══════════════════════════════════════════════════════════
   SCENE 1 — LISSAJOUS BLOOM LOADER
   Lissajous figures bloom outward from pierce points
   along the bottom edge of the canvas.
   x(t) = A·sin(a·t + δ)
   y(t) = B·sin(b·t)
   Each figure starts at a ground pierce point and
   expands upward as progress increases.
═══════════════════════════════════════════════════════════ */
const LOADER_DUR = 4000;
let lissaFigures = [];

function initLissa() {
  lissaFigures = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const xCenter = (W * 0.08) + (W * 0.84) * (i / (count-1));
    // Lissajous params — varied ratios give different ornate shapes
    const ratios = [[3,2],[5,4],[2,3],[7,4],[3,4],[5,2],[4,3],[7,6],[2,5]];
    const [a, b] = ratios[i % ratios.length];
    const delta  = (Math.PI / 6) * i;
    const col    = [P.CYAN, P.FUCHSIA, P.VIOLET, P.VPALE][ i % 4 ];
    const col2   = [P.FUCHSIA, P.CYAN, P.VPALE, P.VIOLET][ i % 4 ];

    lissaFigures.push({
      cx: xCenter,
      cy: H,             // starts at ground
      a, b, delta,
      col, col2,
      progress: 0,       // 0→1 drives how much of the figure is drawn
      scale: 0,          // grows as it blooms
      maxScale: (W * 0.055) + Math.random() * W * 0.04,
      delay: i * 0.08,   // stagger bloom start
      speed: 0.009 + Math.random() * 0.006,
      alpha: 0.7 + Math.random() * 0.3,
      lineW: 0.8 + Math.random() * 1.2,
      // Rise: figure center moves upward as it blooms
      riseY: H - (H * 0.15 + Math.random() * H * 0.65),
    });
  }
}

function drawLissa(globalT) {
  // globalT: 0→1 over loader duration
  lissaFigures.forEach(fig => {
    const localT = clamp((globalT - fig.delay) / (1 - fig.delay), 0, 1);
    if (localT <= 0) return;

    fig.progress = Math.min(fig.progress + fig.speed, 1);
    fig.scale    = easeOut(localT) * fig.maxScale;

    // cy rises from H to riseY as localT grows
    const cy = lerp(H, fig.riseY, easeOut(localT));

    // Draw Lissajous stroke from t=0 to t=progress*2π*3 (multiple loops)
    const totalT  = fig.progress * Math.PI * 2 * 4; // 4 full loops
    const steps   = Math.floor(fig.progress * 420);
    if (steps < 2) return;

    // Glow pass
    bCtx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const tt = (s / steps) * totalT;
      const px = fig.cx + fig.scale * Math.sin(fig.a * tt + fig.delta);
      const py = cy      - fig.scale * 0.62 * Math.sin(fig.b * tt);
      s === 0 ? bCtx.moveTo(px,py) : bCtx.lineTo(px,py);
    }
    bCtx.strokeStyle = fig.col;
    bCtx.lineWidth   = fig.lineW + 2;
    bCtx.globalAlpha = fig.alpha * 0.25 * localT;
    bCtx.shadowColor = fig.col;
    bCtx.shadowBlur  = 22;
    bCtx.stroke();

    // Sharp inner line
    bCtx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const tt = (s / steps) * totalT;
      const px = fig.cx + fig.scale * Math.sin(fig.a * tt + fig.delta);
      const py = cy      - fig.scale * 0.62 * Math.sin(fig.b * tt);
      s === 0 ? bCtx.moveTo(px,py) : bCtx.lineTo(px,py);
    }
    // Gradient stroke: col → col2
    const grad = bCtx.createLinearGradient(
      fig.cx - fig.scale, cy,
      fig.cx + fig.scale, cy - fig.scale
    );
    grad.addColorStop(0, fig.col);
    grad.addColorStop(1, fig.col2);
    bCtx.strokeStyle = grad;
    bCtx.lineWidth   = fig.lineW;
    bCtx.globalAlpha = fig.alpha * localT;
    bCtx.shadowColor = fig.col;
    bCtx.shadowBlur  = 10;
    bCtx.stroke();

    // Pierce point — bright dot at ground origin
    bCtx.beginPath();
    bCtx.arc(fig.cx, H - 2, 2.5, 0, Math.PI*2);
    bCtx.fillStyle = fig.col;
    bCtx.globalAlpha = localT * 0.8;
    bCtx.shadowColor = fig.col;
    bCtx.shadowBlur  = 18;
    bCtx.fill();

    bCtx.globalAlpha = 1;
    bCtx.shadowBlur  = 0;
  });
}

/* ═══════════════════════════════════════════════════════════
   SCENE 2 — LOGO: X T R
═══════════════════════════════════════════════════════════ */

/* Letter geometry — normalized to LW / LH */
function geo() {
  const w = LW, h = LH;

  // X — centered left third
  const xcx = w * 0.16, xcy = h * 0.5;
  const xr  = h * 0.42;
  const X = {
    s1: { x1: xcx-xr*0.7, y1: xcy-xr, x2: xcx+xr*0.7, y2: xcy+xr },
    s2: { x1: xcx+xr*0.7, y1: xcy-xr, x2: xcx-xr*0.7, y2: xcy+xr },
  };

  // T — center third, simultaneous from center
  const tcx = w * 0.5, tcy = h * 0.5;
  const tHalf = w * 0.088, tStem = h * 0.41;
  const T = {
    bar: { cx: tcx, cy: tcy + tStem * 0.08, half: tHalf },   // crossbar center
    stem:{ cx: tcx, bot: tcy + tStem * 0.08, top: tcy - tStem * 0.92 }, // stem shoots UP
  };

  // R — right third
  const rcx = w * 0.835, rcy = h * 0.5;
  const rh  = h * 0.41, rw = w * 0.062;
  const R = {
    groundY: rcy + rh,                       // ground line y
    stemX:   rcx - rw * 0.5,
    stemTop: rcy - rh,
    stemBot: rcy + rh,
    bowl: { cx: rcx - rw*0.45, cy: rcy - rh*0.28, rx: rw*1.05, ry: rh*0.44 },
    leg:  { x1: rcx - rw*0.1, y1: rcy + rh*0.02, x2: rcx + rw*1.2, y2: rcy + rh },
  };

  return { X, T, R };
}

/* ── Logo state ── */
const LS = {
  phase: 'idle',
  // X
  x1t: 0, x2t: 0,
  x1trail: [], x2trail: [],
  // T
  tBarL: 0, tBarR: 0, tStemT: 0,   // 0→1 each direction
  // R
  rGroundT: 0,    // shockwave on ground
  rRings: [],
  rStemT: 0,
  rBowlT: 0,
  rLegT: 0,
};

const LOGO_SPEED = { x: 0.055, t: 0.04, r: 0.03 };

function resetLogoState() {
  Object.assign(LS, {
    phase:'idle',
    x1t:0, x2t:0, x1trail:[], x2trail:[],
    tBarL:0, tBarR:0, tStemT:0,
    rGroundT:0, rRings:[],
    rStemT:0, rBowlT:0, rLegT:0,
  });
  dynamicsText.classList.remove('show');
  lCtx.clearRect(0,0,LW,LH);
}

/* ── Stroke helper ── */
function stroke(ctx, x1,y1,x2,y2, col, lw, blur, alpha=1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
  ctx.strokeStyle = col;
  ctx.lineWidth   = lw;
  ctx.globalAlpha = alpha;
  ctx.shadowColor = col;
  ctx.shadowBlur  = blur;
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx, trail, col, maxW) {
  if (trail.length < 2) return;
  for (let i = 1; i < trail.length; i++) {
    const a = i / trail.length;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(trail[i-1].x, trail[i-1].y);
    ctx.lineTo(trail[i].x,   trail[i].y);
    ctx.strokeStyle = col;
    ctx.globalAlpha = a * 0.55;
    ctx.lineWidth   = a * maxW;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 8;
    ctx.stroke();
    ctx.restore();
  }
}

/* ── DRAW X ── */
function drawX(g) {
  const { s1, s2 } = g.X;

  // Slash 1
  if (LS.x1t > 0) {
    const t  = easeOut(clamp(LS.x1t,0,1));
    const ex = lerp(s1.x1,s1.x2,t), ey = lerp(s1.y1,s1.y2,t);
    LS.x1trail.push({x:ex,y:ey});
    if (LS.x1trail.length > 22) LS.x1trail.shift();
    drawTrail(lCtx, LS.x1trail, P.FUCHSIA, 4);
    stroke(lCtx, s1.x1,s1.y1, ex,ey,  P.CYAN,   2.5, 20);
    // tip spark
    lCtx.save();
    lCtx.beginPath(); lCtx.arc(ex,ey,3.5,0,Math.PI*2);
    lCtx.fillStyle='#fff'; lCtx.globalAlpha=0.9;
    lCtx.shadowColor=P.CYAN; lCtx.shadowBlur=28;
    lCtx.fill(); lCtx.restore();
  }
  if (LS.x1t >= 1) {
    stroke(lCtx, s1.x1,s1.y1, s1.x2,s1.y2, P.VIOLET, 5, 22, 0.45);
    stroke(lCtx, s1.x1,s1.y1, s1.x2,s1.y2, P.CYAN,   1.2, 8,  0.85);
  }

  // Slash 2
  if (LS.x2t > 0) {
    const t  = easeOut(clamp(LS.x2t,0,1));
    const ex = lerp(s2.x1,s2.x2,t), ey = lerp(s2.y1,s2.y2,t);
    LS.x2trail.push({x:ex,y:ey});
    if (LS.x2trail.length > 22) LS.x2trail.shift();
    drawTrail(lCtx, LS.x2trail, P.FUCHSIA, 4);
    stroke(lCtx, s2.x1,s2.y1, ex,ey, P.CYAN, 2.5, 20);
    lCtx.save();
    lCtx.beginPath(); lCtx.arc(ex,ey,3.5,0,Math.PI*2);
    lCtx.fillStyle='#fff'; lCtx.globalAlpha=0.9;
    lCtx.shadowColor=P.CYAN; lCtx.shadowBlur=28;
    lCtx.fill(); lCtx.restore();
  }
  if (LS.x2t >= 1) {
    stroke(lCtx, s2.x1,s2.y1, s2.x2,s2.y2, P.VIOLET, 5, 22, 0.45);
    stroke(lCtx, s2.x1,s2.y1, s2.x2,s2.y2, P.CYAN,   1.2, 8,  0.85);
  }
}

/* ── DRAW T ── */
function drawT(g) {
  const { bar, stem } = g.T;

  // Crossbar — fires left and right simultaneously from center
  if (LS.tBarL > 0) {
    const lx = lerp(bar.cx, bar.cx - bar.half, easeOut(LS.tBarL));
    const rx = lerp(bar.cx, bar.cx + bar.half, easeOut(LS.tBarR));
    const y  = bar.cy;

    // Left arm
    stroke(lCtx, bar.cx,y, lx,y, P.FUCHSIA, 2.5, 20);
    // Right arm
    stroke(lCtx, bar.cx,y, rx,y, P.FUCHSIA, 2.5, 20);

    // Velocity streak tails
    if (LS.tBarL > 0.3) {
      // left tail (fades rightward from tip)
      const tg1 = lCtx.createLinearGradient(lx,0, lx+44,0);
      tg1.addColorStop(0, P.VPALE); tg1.addColorStop(1,'transparent');
      lCtx.save();
      lCtx.beginPath(); lCtx.moveTo(lx,y); lCtx.lineTo(lx+44,y);
      lCtx.strokeStyle=tg1; lCtx.lineWidth=1.4; lCtx.globalAlpha=0.55*LS.tBarL;
      lCtx.stroke(); lCtx.restore();

      // right tail
      const tg2 = lCtx.createLinearGradient(rx,0, rx-44,0);
      tg2.addColorStop(0, P.VPALE); tg2.addColorStop(1,'transparent');
      lCtx.save();
      lCtx.beginPath(); lCtx.moveTo(rx,y); lCtx.lineTo(rx-44,y);
      lCtx.strokeStyle=tg2; lCtx.lineWidth=1.4; lCtx.globalAlpha=0.55*LS.tBarR;
      lCtx.stroke(); lCtx.restore();
    }
    // Tip sparks
    [lx, rx].forEach(tx => {
      lCtx.save();
      lCtx.beginPath(); lCtx.arc(tx,y,2.5,0,Math.PI*2);
      lCtx.fillStyle='#fff'; lCtx.globalAlpha=0.85;
      lCtx.shadowColor=P.FUCHSIA; lCtx.shadowBlur=18;
      lCtx.fill(); lCtx.restore();
    });
  }

  // Stem — shoots UPWARD from bar center
  if (LS.tStemT > 0) {
    const ty = lerp(stem.bot, stem.top, easeOut(LS.tStemT));
    stroke(lCtx, stem.cx, stem.bot, stem.cx, ty, P.FUCHSIA, 2.5, 20);

    // Upward spark at tip
    lCtx.save();
    lCtx.beginPath(); lCtx.arc(stem.cx, ty, 2.5, 0, Math.PI*2);
    lCtx.fillStyle='#fff'; lCtx.globalAlpha=0.9;
    lCtx.shadowColor=P.CYAN; lCtx.shadowBlur=22;
    lCtx.fill(); lCtx.restore();

    // Velocity streak tail — fades downward from tip
    if (LS.tStemT > 0.2) {
      const tg = lCtx.createLinearGradient(0, ty, 0, ty+40);
      tg.addColorStop(0, P.VPALE); tg.addColorStop(1,'transparent');
      lCtx.save();
      lCtx.beginPath(); lCtx.moveTo(stem.cx, ty); lCtx.lineTo(stem.cx, ty+40);
      lCtx.strokeStyle=tg; lCtx.lineWidth=1.4; lCtx.globalAlpha=0.5*LS.tStemT;
      lCtx.stroke(); lCtx.restore();
    }
  }
}

/* ── DRAW R ── */
function drawR(g) {
  const r = g.R;

  // Ground shockwave rings — emit from base of R
  LS.rRings.forEach(ring => {
    ring.r   += 2.2;
    ring.alpha = Math.max(0, ring.alpha - 0.025);
    if (ring.alpha <= 0) return;
    lCtx.save();
    lCtx.beginPath();
    // Flat ellipse on "ground"
    lCtx.ellipse(r.stemX, r.groundY, ring.r, ring.r * 0.22, 0, 0, Math.PI*2);
    lCtx.strokeStyle = P.VIOLET;
    lCtx.lineWidth   = 1.2;
    lCtx.globalAlpha = ring.alpha;
    lCtx.shadowColor = P.VIOLET;
    lCtx.shadowBlur  = 14;
    lCtx.stroke();
    lCtx.restore();
  });

  // Stem — rises from ground up
  if (LS.rStemT > 0) {
    const sy = lerp(r.stemBot, r.stemTop, easeOut(LS.rStemT));
    stroke(lCtx, r.stemX, r.stemBot, r.stemX, sy, P.VIOLET, 2.5, 18);
    // Rising spark
    lCtx.save();
    lCtx.beginPath(); lCtx.arc(r.stemX, sy, 2.5, 0, Math.PI*2);
    lCtx.fillStyle='#fff'; lCtx.globalAlpha=easeOut(1-LS.rStemT)*0.9;
    lCtx.shadowColor=P.VIOLET; lCtx.shadowBlur=20;
    lCtx.fill(); lCtx.restore();
  }

  // Bowl — arc draws from top of stem outward (lowercase r curve)
  if (LS.rBowlT > 0) {
    const endAngle = -Math.PI*0.5 + Math.PI * easeOut(LS.rBowlT);
    lCtx.save();
    lCtx.beginPath();
    lCtx.arc(r.bowl.cx + r.bowl.rx * 0.5, r.bowl.cy + r.bowl.ry,
             Math.sqrt(r.bowl.rx*r.bowl.rx + r.bowl.ry*r.bowl.ry) * 0.72,
             -Math.PI*0.85, endAngle);
    lCtx.strokeStyle = P.VIOLET;
    lCtx.lineWidth   = 2.5;
    lCtx.globalAlpha = 0.9;
    lCtx.shadowColor = P.VIOLET;
    lCtx.shadowBlur  = 18;
    lCtx.stroke();
    lCtx.restore();
  }

  // Leg — diagonal straight kick to ground (recoil)
  if (LS.rLegT > 0) {
    const ex = lerp(r.leg.x1, r.leg.x2, easeOut(LS.rLegT));
    const ey = lerp(r.leg.y1, r.leg.y2, easeOut(LS.rLegT));
    stroke(lCtx, r.leg.x1, r.leg.y1, ex, ey, P.FUCHSIA, 2.5, 18);
    // Impact spark at ground
    if (LS.rLegT > 0.7) {
      const impA = (LS.rLegT - 0.7) / 0.3;
      lCtx.save();
      lCtx.beginPath(); lCtx.arc(ex, ey, 2.8, 0, Math.PI*2);
      lCtx.fillStyle='#fff'; lCtx.globalAlpha=impA*0.85;
      lCtx.shadowColor=P.FUCHSIA; lCtx.shadowBlur=22;
      lCtx.fill(); lCtx.restore();
    }
  }
}

/* ── Logo tick ── */
function tickLogo() {
  lCtx.clearRect(0,0,LW,LH);
  const g = geo();

  switch(LS.phase) {

    case 'x':
      LS.x1t += LOGO_SPEED.x;
      if (LS.x1t >= 0.5) LS.x2t += LOGO_SPEED.x; // slight stagger
      drawX(g);
      if (LS.x2t >= 1) LS.phase = 't';
      break;

    case 't':
      drawX(g);
      LS.tBarL += LOGO_SPEED.t;
      LS.tBarR += LOGO_SPEED.t;
      LS.tStemT += LOGO_SPEED.t;
      drawT(g);
      if (LS.tBarL >= 1 && LS.tStemT >= 1) LS.phase = 'r-ground';
      break;

    case 'r-ground':
      drawX(g); drawT(g);
      LS.rGroundT += 0.06;
      // Emit shockwave rings rapidly at start
      if (LS.rRings.length < 5) {
        LS.rRings.push({ r: 2, alpha: 0.8 });
      }
      drawR(g);
      if (LS.rGroundT >= 1) LS.phase = 'r-rise';
      break;

    case 'r-rise':
      drawX(g); drawT(g); drawR(g);
      LS.rStemT += LOGO_SPEED.r;
      if (LS.rStemT > 0.35) LS.rBowlT += LOGO_SPEED.r * 0.9;
      if (LS.rBowlT > 0.5)  LS.rLegT  += LOGO_SPEED.r * 1.1;
      drawR(g);
      if (LS.rLegT >= 1) LS.phase = 'hold';
      break;

    case 'hold':
      drawX(g); drawT(g); drawR(g);
      break;
  }
}

/* ═══════════════════════════════════════════════════════════
   TIMELINE ENGINE
═══════════════════════════════════════════════════════════ */
const missileAsset = hasMissileAsset();

// Timeline markers (ms)
const TL = {
  LOADER_END:    4000,
  LOGO_IN:       4200,
  LOGO_X_START:  4400,
  DYNAMICS_SHOW: 10800,
  LOGO_FADE:     13200,
  LOGO_GONE:     14400,

  // Missile — only used if asset present
  MISSILE_IN:    15600,
  MISSILE_FADE:  99000,
  MISSILE_GONE:  100500,

  // End card
  END_IN:        missileAsset ? 101800 : 15200,
  END_FADE:      missileAsset ? 115000 : 28000,
  END_GONE:      missileAsset ? 117500 : 30500,
  LOOP:          missileAsset ? 119000 : 32000,
};

let startT   = null;
let flags    = {};

function softRestart() {
  startT = null;
  flags  = {};

  // Reset scenes
  [sLoader, sLogo, sMissile, sEnd].forEach(s => {
    s.classList.remove('active','fade-in');
    s.style.opacity    = '';
    s.style.transition = '';
  });
  sLoader.classList.add('active');
  loaderBar.style.width = '0%';

  // Reset logo
  resetLogoState();
  initLissa();
  initBg();
  if (missileInner) { missileInner.classList.remove('show'); missileInner.style.opacity=''; missileInner.style.transition=''; }
  if (endInner)     { endInner.classList.remove('show');     endInner.style.opacity='';     endInner.style.transition=''; }

  requestAnimationFrame(frame);
}

function frame(ts) {
  if (!startT) startT = ts;
  const e = ts - startT;   // elapsed ms

  // ── Background always ──
  drawBg();

  // ── LOADER ──
  if (e < TL.LOADER_END) {
    const p = e / TL.LOADER_END;
    loaderBar.style.width = clamp(p*100,0,100) + '%';
    drawLissa(p);
  }

  // ── Loader → Logo transition ──
  if (e >= TL.LOADER_END && !flags.loaderDone) {
    flags.loaderDone = true;
    sceneOut(sLoader);
    setTimeout(() => {
      sceneIn(sLogo);
      resize();
    }, 500);
  }

  // ── Start X slash ──
  if (e >= TL.LOGO_X_START && !flags.xStarted) {
    flags.xStarted = true;
    LS.phase = 'x';
  }

  // ── Logo tick ──
  if (LS.phase !== 'idle') tickLogo();

  // ── DYNAMICS text ──
  if (e >= TL.DYNAMICS_SHOW && !flags.dynamicsShown) {
    flags.dynamicsShown = true;
    dynamicsText.classList.add('show');
  }

  // ── Logo fade out ──
  if (e >= TL.LOGO_FADE && !flags.logoFading) {
    flags.logoFading = true;
    sLogo.style.transition = 'opacity 1.1s ease';
    sLogo.style.opacity    = '0';
  }
  if (e >= TL.LOGO_GONE && !flags.logoDone) {
    flags.logoDone = true;
    sLogo.classList.remove('active','fade-in');
  }

  // ── MISSILE (only if asset present) ──
  if (missileAsset) {
    if (e >= TL.MISSILE_IN && !flags.missileIn) {
      flags.missileIn = true;
      sceneIn(sMissile);
      setTimeout(() => missileInner.classList.add('show'), 100);
    }
    if (e >= TL.MISSILE_FADE && !flags.missileFading) {
      flags.missileFading = true;
      missileInner.style.transition = 'opacity 1.2s ease';
      missileInner.style.opacity    = '0';
    }
    if (e >= TL.MISSILE_GONE && !flags.missileDone) {
      flags.missileDone = true;
      sceneOut(sMissile);
    }
  }

  // ── END CARD ──
  if (e >= TL.END_IN && !flags.endIn) {
    flags.endIn = true;
    sceneIn(sEnd);
    setTimeout(() => endInner.classList.add('show'), 100);
  }
  if (e >= TL.END_FADE && !flags.endFading) {
    flags.endFading = true;
    endInner.style.transition = 'opacity 1.3s ease';
    endInner.style.opacity    = '0';
  }
  if (e >= TL.END_GONE && !flags.endDone) {
    flags.endDone = true;
    sceneOut(sEnd);
  }

  // ── SOFT LOOP ──
  if (e >= TL.LOOP) { softRestart(); return; }

  requestAnimationFrame(frame);
}

// ── KICK OFF ──
initLissa();
sLoader.classList.add('active');
requestAnimationFrame(frame);

})();