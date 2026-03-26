/**
 * XTR DYNAMICS — CINEMATIC AD ENGINE
 * Single file controls the entire ad timeline like a video playback.
 *
 * TIMELINE (soft loop, ~120s total):
 *   0s   – Loader (rising blade curves, 3.5s)
 *   3.5s – Logo reveal: X (katana slashes), T (velocity streak), R (shockwave)
 *   ~8s  – "DYNAMICS" subtitle fades in
 *   ~11s – Logo holds + glows
 *   ~14s – Logo fades out → black
 *   ~16s – Missile prototype scene fades in, slow rotation
 *   ~100s– Missile fades out
 *   ~102s– End card fades in
 *   ~115s– End card fades, loop restarts from 0
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  //  CONSTANTS & PALETTE
  // ─────────────────────────────────────────────
  const C = {
    BLACK:      '#000000',
    DEEP:       '#05000a',
    VIOLET:     '#9D00FF',
    VIOLET_MID: '#BF5FFF',
    VIOLET_PALE:'#E0AAFF',
    WHITE:      '#F0F0F0',
  };

  // Ad total duration in ms before soft loop restart
  const AD_DURATION = 120_000;

  // ─────────────────────────────────────────────
  //  DOM REFS
  // ─────────────────────────────────────────────
  const mainCanvas   = document.getElementById('main-canvas');
  const mCtx         = mainCanvas.getContext('2d');
  const loaderBar    = document.getElementById('loader-bar');
  const sceneLoader  = document.getElementById('scene-loader');
  const sceneLogo    = document.getElementById('scene-logo');
  const sceneMissile = document.getElementById('scene-missile');
  const sceneEnd     = document.getElementById('scene-end');
  const logoCanvas   = document.getElementById('logo-canvas');
  const lCtx         = logoCanvas.getContext('2d');
  const missileCanvas= document.getElementById('missile-canvas');
  const mslCtx       = missileCanvas ? missileCanvas.getContext('2d') : null;
  const logoTagline  = document.getElementById('logo-tagline');
  const missileWrap  = document.getElementById('missile-wrap');
  const endWrap      = document.getElementById('end-wrap');

  let W = 0, H = 0;
  let adStartTime = null;
  let loopCount = 0;

  // ─────────────────────────────────────────────
  //  RESIZE
  // ─────────────────────────────────────────────
  function resize() {
    W = mainCanvas.width  = window.innerWidth;
    H = mainCanvas.height = window.innerHeight;

    // Logo canvas: big enough for letter rendering
    const logoSize = Math.min(W * 0.85, H * 0.55, 700);
    logoCanvas.width  = logoSize;
    logoCanvas.height = logoSize * 0.55;
    logoCanvas.style.width  = logoCanvas.width  + 'px';
    logoCanvas.style.height = logoCanvas.height + 'px';

    if (missileCanvas) {
      const mf = document.getElementById('missile-frame');
      if (mf) {
        missileCanvas.width  = mf.offsetWidth  || 600;
        missileCanvas.height = mf.offsetHeight || 380;
      }
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // ─────────────────────────────────────────────
  //  UTILITY
  // ─────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut3(t)   { return 1 - Math.pow(1 - t, 3); }
  function easeIn3(t)    { return t * t * t; }
  function easeInOut(t)  { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function clamp(v,a,b)  { return Math.max(a, Math.min(b, v)); }

  function showScene(el)  { el.classList.remove('hidden', 'fade-out'); el.classList.add('fade-in'); }
  function hideScene(el)  { el.classList.add('fade-out'); setTimeout(() => el.classList.add('hidden'), 900); }

  // ─────────────────────────────────────────────
  //  MAIN CANVAS BACKGROUND EFFECTS
  // ─────────────────────────────────────────────
  let bgParticles = [];

  function initParticles() {
    bgParticles = [];
    for (let i = 0; i < 60; i++) bgParticles.push(newParticle());
  }

  function newParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.4 + Math.random() * 1.2,
      alpha: 0.05 + Math.random() * 0.25,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.08 - Math.random() * 0.3,
      life: 1,
      decay: 0.002 + Math.random() * 0.003,
    };
  }

  function drawBg(alpha = 1) {
    mCtx.clearRect(0, 0, W, H);
    mCtx.globalAlpha = alpha;

    // Deep radial glow
    const g = mCtx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.6);
    g.addColorStop(0, 'rgba(90,0,160,0.07)');
    g.addColorStop(1, 'transparent');
    mCtx.fillStyle = g;
    mCtx.fillRect(0, 0, W, H);

    bgParticles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0 || p.y < -5) { bgParticles[i] = newParticle(); bgParticles[i].y = H + 4; return; }
      mCtx.beginPath();
      mCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      mCtx.fillStyle = `rgba(191,95,255,${p.alpha * p.life})`;
      mCtx.shadowColor = C.VIOLET;
      mCtx.shadowBlur = 5;
      mCtx.fill();
    });
    mCtx.globalAlpha = 1;
    mCtx.shadowBlur = 0;
  }

  initParticles();

  // ─────────────────────────────────────────────
  //  SCENE 1 — LOADER
  //  Rising fluid blade-curve lines from bottom
  // ─────────────────────────────────────────────
  let loaderLines = [];
  const LOADER_DURATION = 3500;

  function initLoader() {
    loaderLines = [];
    for (let i = 0; i < 32; i++) {
      loaderLines.push(newLoaderLine(Math.random())); // pre-stagger
    }
    loaderBar.style.width = '0%';
  }

  function newLoaderLine(tOffset = 0) {
    const x = Math.random() * W;
    return {
      x,
      cp1x: x + (Math.random() - 0.5) * 320,
      cp2x: x + (Math.random() - 0.5) * 180,
      color: [C.VIOLET, C.VIOLET_MID, C.VIOLET_PALE][Math.floor(Math.random()*3)],
      alpha: 0.15 + Math.random() * 0.55,
      width: 0.5 + Math.random() * 1.8,
      speed: 0.006 + Math.random() * 0.016,
      t: tOffset,
    };
  }

  function drawLoaderLines() {
    loaderLines.forEach(l => {
      l.t += l.speed;
      if (l.t > 1.4) Object.assign(l, newLoaderLine(0));
      const t = clamp(l.t, 0, 1);
      if (t <= 0) return;

      // Cubic bezier: bottom → top
      const steps = 55;
      mCtx.beginPath();
      mCtx.lineWidth = l.width;
      mCtx.strokeStyle = l.color;
      mCtx.shadowColor = l.color;
      mCtx.shadowBlur = 14;
      mCtx.globalAlpha = l.alpha * (t < 0.1 ? t*10 : t > 0.85 ? (1-t)*6.67 : 1);

      let started = false;
      for (let i = 0; i <= steps * t; i++) {
        const tt = i / steps;
        const mt = 1 - tt;
        const bx = mt*mt*mt*l.x + 3*mt*mt*tt*l.cp1x + 3*mt*tt*tt*l.cp2x + tt*tt*tt*l.x;
        const by = mt*mt*mt*(H+20) + 3*mt*mt*tt*(H*0.6) + 3*mt*tt*tt*(H*0.25) + tt*tt*tt*(-20);
        if (!started) { mCtx.moveTo(bx, by); started = true; }
        else mCtx.lineTo(bx, by);
      }
      mCtx.stroke();
    });
    mCtx.globalAlpha = 1;
    mCtx.shadowBlur = 0;
  }

  // ─────────────────────────────────────────────
  //  SCENE 2 — LOGO: X T R
  //  X = katana slash reveal (no exterior effects)
  //  T = velocity streak draw
  //  R = shockwave/ripple assemble
  // ─────────────────────────────────────────────

  // Logo state machine
  const LOGO = {
    phase: 'idle',  // idle→x-slash→x-done→t-streak→t-done→r-shockwave→r-done→hold→fadeout
    x: { s1: { t: 0, trail: [] }, s2: { t: 0, trail: [] }, done: false, alpha: 1 },
    t: { t: 0, streaks: [], done: false, alpha: 1 },
    r: { t: 0, rings: [], done: false, alpha: 1 },
    textAlpha: 0,
    holdTimer: 0,
  };

  function getLW() { return logoCanvas.width; }
  function getLH() { return logoCanvas.height; }

  // X letter geometry — just the two stroke paths, no glow border
  function getXStrokes() {
    const w = getLW(), h = getLH();
    const cx = w * 0.22, cy = h * 0.5;
    const sx = w * 0.13, sy = h * 0.40;
    return [
      { x1: cx - sx, y1: cy - sy, x2: cx + sx, y2: cy + sy }, // TL→BR
      { x1: cx + sx, y1: cy - sy, x2: cx - sx, y2: cy + sy }, // TR→BL
    ];
  }

  // T letter geometry — vertical + horizontal
  function getTPoints() {
    const w = getLW(), h = getLH();
    const cx = w * 0.5, cy = h * 0.5;
    const hw = w * 0.09, ht = h * 0.38;
    return {
      hLine: { x1: cx - hw, y1: cy - ht, x2: cx + hw, y2: cy - ht }, // crossbar
      vLine: { x1: cx, y1: cy - ht, x2: cx, y2: cy + ht },            // stem
    };
  }

  // R letter geometry — vertical + arc + leg
  function getRPoints() {
    const w = getLW(), h = getLH();
    const cx = w * 0.78, cy = h * 0.5;
    const rh = h * 0.38, rw = w * 0.065;
    return {
      stem: { x1: cx - rw*0.5, y1: cy - rh, x2: cx - rw*0.5, y2: cy + rh },
      bowl: { x: cx - rw*0.5, y: cy - rh, rx: rw, ry: rh*0.48 },
      leg:  { x1: cx, y1: cy, x2: cx + rw*0.9, y2: cy + rh },
    };
  }

  // ── Draw X (blade strokes, clean — no outer glow corona) ──
  function drawX(phase, slashAlpha) {
    const strokes = getXStrokes();
    lCtx.save();

    strokes.forEach((s, i) => {
      const si = LOGO.x[`s${i+1}`];
      const t = easeOut3(clamp(si.t, 0, 1));
      const ex = lerp(s.x1, s.x2, t);
      const ey = lerp(s.y1, s.y2, t);

      // Trail
      si.trail.push({ x: ex, y: ey });
      if (si.trail.length > 28) si.trail.shift();

      for (let j = 1; j < si.trail.length; j++) {
        const p0 = si.trail[j-1], p1 = si.trail[j];
        const a = (j / si.trail.length);
        lCtx.beginPath();
        lCtx.moveTo(p0.x, p0.y);
        lCtx.lineTo(p1.x, p1.y);
        lCtx.strokeStyle = C.VIOLET_MID;
        lCtx.globalAlpha = a * 0.5 * slashAlpha;
        lCtx.lineWidth = a * 3;
        lCtx.shadowBlur = 0;
        lCtx.stroke();
      }

      // Drawn stroke so far
      if (si.t > 0) {
        lCtx.beginPath();
        lCtx.moveTo(s.x1, s.y1);
        lCtx.lineTo(ex, ey);
        lCtx.strokeStyle = C.VIOLET_PALE;
        lCtx.globalAlpha = slashAlpha;
        lCtx.lineWidth = 2.5;
        lCtx.shadowColor = C.VIOLET_PALE;
        lCtx.shadowBlur = 18;
        lCtx.stroke();

        // Blade tip spark
        lCtx.beginPath();
        lCtx.arc(ex, ey, 3.5, 0, Math.PI*2);
        lCtx.fillStyle = '#fff';
        lCtx.globalAlpha = slashAlpha * 0.9;
        lCtx.shadowColor = C.VIOLET_PALE;
        lCtx.shadowBlur = 30;
        lCtx.fill();
      }

      // Completed stroke — just the clean line, glowing violet
      if (si.t >= 1) {
        lCtx.beginPath();
        lCtx.moveTo(s.x1, s.y1);
        lCtx.lineTo(s.x2, s.y2);
        lCtx.strokeStyle = C.VIOLET;
        lCtx.globalAlpha = slashAlpha * 0.55;
        lCtx.lineWidth = 5;
        lCtx.shadowColor = C.VIOLET;
        lCtx.shadowBlur = 22;
        lCtx.stroke();

        lCtx.beginPath();
        lCtx.moveTo(s.x1, s.y1);
        lCtx.lineTo(s.x2, s.y2);
        lCtx.strokeStyle = C.VIOLET_PALE;
        lCtx.globalAlpha = slashAlpha * 0.85;
        lCtx.lineWidth = 1.2;
        lCtx.shadowColor = C.VIOLET_PALE;
        lCtx.shadowBlur = 10;
        lCtx.stroke();
      }
    });

    lCtx.restore();
  }

  // ── Draw T (velocity streak — horizontal bar shoots across, stem drops down) ──
  function drawT(alpha) {
    const pts = getTPoints();
    lCtx.save();
    const t = easeOut3(clamp(LOGO.t.t, 0, 1));

    // Crossbar — streaks from center outward
    const cxBar = (pts.hLine.x1 + pts.hLine.x2) / 2;
    const leftT  = clamp(t * 2, 0, 1);
    const rightT = clamp(t * 2, 0, 1);

    // Left streak
    lCtx.beginPath();
    lCtx.moveTo(cxBar, pts.hLine.y1);
    lCtx.lineTo(lerp(cxBar, pts.hLine.x1, leftT), pts.hLine.y1);
    lCtx.strokeStyle = C.VIOLET_MID;
    lCtx.globalAlpha = alpha * 0.9;
    lCtx.lineWidth = 2.5;
    lCtx.shadowColor = C.VIOLET_MID;
    lCtx.shadowBlur = 18;
    lCtx.stroke();

    // Right streak
    lCtx.beginPath();
    lCtx.moveTo(cxBar, pts.hLine.y1);
    lCtx.lineTo(lerp(cxBar, pts.hLine.x2, rightT), pts.hLine.y1);
    lCtx.strokeStyle = C.VIOLET_MID;
    lCtx.globalAlpha = alpha * 0.9;
    lCtx.lineWidth = 2.5;
    lCtx.shadowColor = C.VIOLET_MID;
    lCtx.shadowBlur = 18;
    lCtx.stroke();

    // Velocity streak tails (motion blur feel)
    if (t > 0.1) {
      const streakLen = 0.3;
      // Left tail
      lCtx.beginPath();
      const lx = lerp(cxBar, pts.hLine.x1, leftT);
      lCtx.moveTo(lx, pts.hLine.y1);
      lCtx.lineTo(lx + Math.min(40, (pts.hLine.x2 - pts.hLine.x1) * streakLen), pts.hLine.y1);
      const lg1 = lCtx.createLinearGradient(lx, 0, lx + 50, 0);
      lg1.addColorStop(0, C.VIOLET_PALE);
      lg1.addColorStop(1, 'transparent');
      lCtx.strokeStyle = lg1;
      lCtx.globalAlpha = alpha * 0.6 * leftT;
      lCtx.lineWidth = 1.5;
      lCtx.shadowBlur = 0;
      lCtx.stroke();

      // Right tail
      const rx = lerp(cxBar, pts.hLine.x2, rightT);
      lCtx.beginPath();
      lCtx.moveTo(rx, pts.hLine.y1);
      lCtx.lineTo(rx - Math.min(40, (pts.hLine.x2 - pts.hLine.x1) * streakLen), pts.hLine.y1);
      const lg2 = lCtx.createLinearGradient(rx, 0, rx - 50, 0);
      lg2.addColorStop(0, C.VIOLET_PALE);
      lg2.addColorStop(1, 'transparent');
      lCtx.strokeStyle = lg2;
      lCtx.globalAlpha = alpha * 0.6 * rightT;
      lCtx.lineWidth = 1.5;
      lCtx.stroke();
    }

    // Stem — drops down after crossbar
    const stemT = clamp((t - 0.2) / 0.8, 0, 1);
    if (stemT > 0) {
      const sy = lerp(pts.vLine.y1, pts.vLine.y2, easeOut3(stemT));
      lCtx.beginPath();
      lCtx.moveTo(pts.vLine.x1, pts.vLine.y1);
      lCtx.lineTo(pts.vLine.x2, sy);
      lCtx.strokeStyle = C.VIOLET_MID;
      lCtx.globalAlpha = alpha * 0.9;
      lCtx.lineWidth = 2.5;
      lCtx.shadowColor = C.VIOLET_MID;
      lCtx.shadowBlur = 18;
      lCtx.stroke();

      // Drop tip spark
      lCtx.beginPath();
      lCtx.arc(pts.vLine.x2, sy, 2.5, 0, Math.PI*2);
      lCtx.fillStyle = '#fff';
      lCtx.globalAlpha = alpha * stemT;
      lCtx.shadowColor = C.VIOLET_PALE;
      lCtx.shadowBlur = 20;
      lCtx.fill();
    }

    lCtx.restore();
  }

  // ── Draw R (shockwave/ripple assemble) ──
  function drawR(alpha) {
    const pts = getRPoints();
    lCtx.save();
    const t = easeOut3(clamp(LOGO.r.t, 0, 1));

    // Emit shockwave rings from center of R bowl
    const bowlCx = pts.bowl.x + pts.bowl.rx;
    const bowlCy = pts.bowl.y + pts.bowl.ry;

    // Rings — emit at start, expand outward
    if (LOGO.r.t > 0 && LOGO.r.t < 0.8) {
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const rt = clamp(LOGO.r.t * 3 - i * 0.3, 0, 1);
        if (rt <= 0) continue;
        const radius = rt * getLW() * 0.12;
        lCtx.beginPath();
        lCtx.ellipse(bowlCx, bowlCy, radius, radius * 0.6, 0, 0, Math.PI*2);
        lCtx.strokeStyle = C.VIOLET;
        lCtx.globalAlpha = alpha * (1 - rt) * 0.5;
        lCtx.lineWidth = 1.5;
        lCtx.shadowColor = C.VIOLET;
        lCtx.shadowBlur = 12;
        lCtx.stroke();
      }
    }

    // Stem
    const stemT = clamp(t * 1.4, 0, 1);
    if (stemT > 0) {
      const sy = lerp(pts.stem.y1, pts.stem.y2, stemT);
      lCtx.beginPath();
      lCtx.moveTo(pts.stem.x1, pts.stem.y1);
      lCtx.lineTo(pts.stem.x2, sy);
      lCtx.strokeStyle = C.VIOLET_MID;
      lCtx.globalAlpha = alpha * 0.9;
      lCtx.lineWidth = 2.5;
      lCtx.shadowColor = C.VIOLET_MID;
      lCtx.shadowBlur = 16;
      lCtx.stroke();
    }

    // Bowl arc — draws in from stem outward
    const bowlT = clamp((t - 0.15) / 0.6, 0, 1);
    if (bowlT > 0) {
      lCtx.beginPath();
      lCtx.ellipse(
        pts.bowl.x + pts.bowl.rx,
        pts.bowl.y + pts.bowl.ry,
        pts.bowl.rx, pts.bowl.ry,
        0,
        -Math.PI * 0.5,
        -Math.PI * 0.5 + Math.PI * bowlT
      );
      lCtx.strokeStyle = C.VIOLET_MID;
      lCtx.globalAlpha = alpha * 0.9;
      lCtx.lineWidth = 2.5;
      lCtx.shadowColor = C.VIOLET_MID;
      lCtx.shadowBlur = 16;
      lCtx.stroke();
    }

    // Leg — diagonal kick out
    const legT = clamp((t - 0.5) / 0.5, 0, 1);
    if (legT > 0) {
      const ex = lerp(pts.leg.x1, pts.leg.x2, easeOut3(legT));
      const ey = lerp(pts.leg.y1, pts.leg.y2, easeOut3(legT));
      lCtx.beginPath();
      lCtx.moveTo(pts.leg.x1, pts.leg.y1);
      lCtx.lineTo(ex, ey);
      lCtx.strokeStyle = C.VIOLET_MID;
      lCtx.globalAlpha = alpha * 0.9;
      lCtx.lineWidth = 2.5;
      lCtx.shadowColor = C.VIOLET_MID;
      lCtx.shadowBlur = 16;
      lCtx.stroke();

      // Recoil spark at tip
      if (legT < 0.9) {
        lCtx.beginPath();
        lCtx.arc(ex, ey, 2.5, 0, Math.PI*2);
        lCtx.fillStyle = '#fff';
        lCtx.globalAlpha = alpha * (1 - legT);
        lCtx.shadowColor = C.VIOLET_PALE;
        lCtx.shadowBlur = 20;
        lCtx.fill();
      }
    }

    lCtx.restore();
  }

  function tickLogo() {
    lCtx.clearRect(0, 0, getLW(), getLH());

    const ph = LOGO.phase;

    // X phase
    if (ph === 'x-slash' || ph === 'x-done' || ph === 't-streak' || ph === 't-done' || ph === 'r-shockwave' || ph === 'r-done' || ph === 'hold') {
      if (ph === 'x-slash') {
        LOGO.x.s1.t += 0.045;
        if (LOGO.x.s1.t >= 1) {
          LOGO.x.s2.t += 0.045;
          if (LOGO.x.s2.t >= 1) { LOGO.x.done = true; LOGO.phase = 't-streak'; }
        }
      }
      drawX(ph, LOGO.x.alpha);
    }

    // T phase
    if (ph === 't-streak' || ph === 't-done' || ph === 'r-shockwave' || ph === 'r-done' || ph === 'hold') {
      if (ph === 't-streak') {
        LOGO.t.t += 0.032;
        if (LOGO.t.t >= 1) { LOGO.t.done = true; LOGO.phase = 'r-shockwave'; }
      }
      drawT(LOGO.t.alpha);
    }

    // R phase
    if (ph === 'r-shockwave' || ph === 'r-done' || ph === 'hold') {
      if (ph === 'r-shockwave') {
        LOGO.r.t += 0.022;
        if (LOGO.r.t >= 1) { LOGO.r.done = true; LOGO.phase = 'hold'; logoTagline.classList.add('show'); }
      }
      drawR(LOGO.r.alpha);
    }
  }

  function resetLogo() {
    LOGO.phase = 'idle';
    LOGO.x.s1.t = 0; LOGO.x.s1.trail = [];
    LOGO.x.s2.t = 0; LOGO.x.s2.trail = [];
    LOGO.x.done = false; LOGO.x.alpha = 1;
    LOGO.t.t = 0; LOGO.t.done = false; LOGO.t.alpha = 1;
    LOGO.r.t = 0; LOGO.r.done = false; LOGO.r.alpha = 1;
    logoTagline.classList.remove('show');
    lCtx.clearRect(0, 0, getLW(), getLH());
  }

  // ─────────────────────────────────────────────
  //  SCENE 3 — MISSILE PLACEHOLDER ANIMATION
  //  Slow rotating wireframe missile silhouette
  //  (replaced by Blender export when ready)
  // ─────────────────────────────────────────────
  let missileAngle = 0;

  function drawMissilePlaceholder() {
    if (!mslCtx) return;
    const mw = missileCanvas.width, mh = missileCanvas.height;
    mslCtx.clearRect(0, 0, mw, mh);

    // Check if real asset is already in the frame (video/img)
    const realAsset = document.querySelector('#missile-frame video, #missile-frame img');
    if (realAsset) return; // real asset present — don't draw placeholder

    missileAngle += 0.004;
    const cx = mw / 2, cy = mh / 2;
    const scale = Math.min(mw, mh) * 0.32;

    mslCtx.save();
    mslCtx.translate(cx, cy);

    // Perspective foreshortening from rotation
    const scaleX = Math.cos(missileAngle);
    mslCtx.scale(scaleX, 1);

    mslCtx.strokeStyle = C.VIOLET;
    mslCtx.lineWidth = 1.2;
    mslCtx.shadowColor = C.VIOLET;
    mslCtx.shadowBlur = 10;
    mslCtx.globalAlpha = 0.7;

    // Missile body outline
    const bw = scale * 0.22, bh = scale;
    mslCtx.beginPath();
    mslCtx.roundRect(-bw, -bh, bw*2, bh*1.6, [bw, bw, 4, 4]);
    mslCtx.stroke();

    // Nose cone
    mslCtx.beginPath();
    mslCtx.moveTo(-bw, -bh);
    mslCtx.lineTo(0, -bh - scale * 0.45);
    mslCtx.lineTo(bw, -bh);
    mslCtx.stroke();

    // Fins
    mslCtx.beginPath();
    mslCtx.moveTo(-bw, bh * 0.5);
    mslCtx.lineTo(-bw - scale*0.25, bh * 0.75);
    mslCtx.lineTo(-bw, bh * 0.75);
    mslCtx.stroke();
    mslCtx.beginPath();
    mslCtx.moveTo(bw, bh * 0.5);
    mslCtx.lineTo(bw + scale*0.25, bh * 0.75);
    mslCtx.lineTo(bw, bh * 0.75);
    mslCtx.stroke();

    // Center line detail
    mslCtx.setLineDash([4, 6]);
    mslCtx.globalAlpha = 0.25;
    mslCtx.beginPath();
    mslCtx.moveTo(0, -bh);
    mslCtx.lineTo(0, bh * 0.6);
    mslCtx.stroke();
    mslCtx.setLineDash([]);

    mslCtx.restore();
    mslCtx.globalAlpha = 1;
    mslCtx.shadowBlur = 0;
  }

  // ─────────────────────────────────────────────
  //  AD TIMELINE ENGINE
  // ─────────────────────────────────────────────
  // Times in ms from ad start
  const T = {
    LOADER_END:       3500,
    LOGO_START:       3600,
    LOGO_X_START:     3700,
    LOGO_TAGLINE:     9500,
    LOGO_HOLD_END:    13000,
    LOGO_FADEOUT:     14200,
    MISSILE_IN:       15500,
    MISSILE_HOLD_END: 100000,
    MISSILE_FADEOUT:  101500,
    END_IN:           103000,
    END_HOLD_END:     115000,
    END_FADEOUT:      117000,
    LOOP_RESTART:     119000,
  };

  let prevT = {};
  let missileVisible = false;
  let endVisible = false;

  function adTick(ts) {
    if (!adStartTime) adStartTime = ts;
    const elapsed = ts - adStartTime;

    // ── Background ──
    drawBg();

    // ── LOADER ──
    if (elapsed < T.LOADER_END) {
      loaderBar.style.width = clamp(elapsed / T.LOADER_END * 100, 0, 100) + '%';
      drawLoaderLines();
    }

    // ── Transition loader → logo ──
    if (elapsed >= T.LOADER_END && !prevT.loaderDone) {
      prevT.loaderDone = true;
      hideScene(sceneLoader);
      setTimeout(() => {
        showScene(sceneLogo);
        resize();
        LOGO.phase = 'x-slash';
      }, 400);
    }

    // ── Logo tick ──
    if (elapsed >= T.LOGO_X_START && elapsed < T.LOGO_FADEOUT) {
      tickLogo();
    }

    // ── Logo fade out ──
    if (elapsed >= T.LOGO_HOLD_END && elapsed < T.LOGO_FADEOUT && !prevT.logoFading) {
      prevT.logoFading = true;
      sceneLogo.style.transition = 'opacity 1.2s ease';
      sceneLogo.style.opacity = '0';
    }

    if (elapsed >= T.LOGO_FADEOUT && !prevT.logoDone) {
      prevT.logoDone = true;
      sceneLogo.classList.add('hidden');
    }

    // ── Missile in ──
    if (elapsed >= T.MISSILE_IN && !prevT.missileIn) {
      prevT.missileIn = true;
      showScene(sceneMissile);
      resize();
      setTimeout(() => { missileWrap.classList.add('show'); }, 100);
      missileVisible = true;
    }

    // ── Missile placeholder rotation ──
    if (missileVisible && elapsed < T.MISSILE_FADEOUT) {
      drawMissilePlaceholder();
    }

    // ── Missile fade out ──
    if (elapsed >= T.MISSILE_HOLD_END && !prevT.missileFading) {
      prevT.missileFading = true;
      missileWrap.style.transition = 'opacity 1.2s ease';
      missileWrap.style.opacity = '0';
    }

    if (elapsed >= T.MISSILE_FADEOUT && !prevT.missileDone) {
      prevT.missileDone = true;
      hideScene(sceneMissile);
      missileVisible = false;
    }

    // ── End card in ──
    if (elapsed >= T.END_IN && !prevT.endIn) {
      prevT.endIn = true;
      showScene(sceneEnd);
      setTimeout(() => { endWrap.classList.add('show'); }, 100);
      endVisible = true;
    }

    // ── End card fade out ──
    if (elapsed >= T.END_HOLD_END && !prevT.endFading) {
      prevT.endFading = true;
      endWrap.style.transition = 'opacity 1.2s ease';
      endWrap.style.opacity = '0';
    }

    if (elapsed >= T.END_FADEOUT && !prevT.endDone) {
      prevT.endDone = true;
      hideScene(sceneEnd);
      endVisible = false;
    }

    // ── SOFT LOOP RESTART ──
    if (elapsed >= T.LOOP_RESTART) {
      softRestart();
      return;
    }

    requestAnimationFrame(adTick);
  }

  // ─────────────────────────────────────────────
  //  SOFT LOOP — reset state, replay from top
  // ─────────────────────────────────────────────
  function softRestart() {
    loopCount++;
    adStartTime = null;
    prevT = {};
    missileVisible = false;
    endVisible = false;

    // Reset DOM scenes
    [sceneLogo, sceneMissile, sceneEnd].forEach(s => {
      s.classList.add('hidden');
      s.style.opacity = '';
      s.style.transition = '';
    });
    sceneLoader.classList.remove('hidden', 'fade-out');
    sceneLoader.style.opacity = '';

    // Reset missile & end DOM
    missileWrap.classList.remove('show');
    missileWrap.style.opacity = '';
    missileWrap.style.transition = '';
    endWrap.classList.remove('show');
    endWrap.style.opacity = '';
    endWrap.style.transition = '';

    // Reset logo
    resetLogo();
    initLoader();
    initParticles();

    requestAnimationFrame(adTick);
  }

  // ─────────────────────────────────────────────
  //  KICK OFF
  // ─────────────────────────────────────────────
  initLoader();
  requestAnimationFrame(adTick);

})();