/* js/logo.js — XTR Sword Slash Reveal */

(function () {
  const canvas = document.getElementById('slash-canvas');
  const ctx = canvas.getContext('2d');
  const logoText = document.getElementById('logo-text');
  const logoTR = document.getElementById('logo-tr');
  const logoSub = document.getElementById('logo-sub');
  const tagline = document.getElementById('tagline');

  const VIOLET = '#9D00FF';
  const VIOLET_MID = '#BF5FFF';
  const VIOLET_PALE = '#E0AAFF';
  const WHITE = '#F0F0F0';

  let W, H;
  let phase = 'idle'; // idle → slash1 → slash2 → reveal → tr-slash → done
  let animId;

  // Slash state
  const slashes = [
    { progress: 0, speed: 0.05, trail: [] }, // top-left to bottom-right
    { progress: 0, speed: 0.05, trail: [] }, // top-right to bottom-left
  ];

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width = rect.width + 120;
    H = canvas.height = rect.height + 80;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  function getSlashPoints(index) {
    const cx = W / 2, cy = H / 2;
    const dx = W * 0.38, dy = H * 0.42;
    if (index === 0) {
      // top-left → bottom-right
      return {
        x1: cx - dx, y1: cy - dy,
        x2: cx + dx, y2: cy + dy
      };
    } else {
      // top-right → bottom-left
      return {
        x1: cx + dx, y1: cy - dy,
        x2: cx - dx, y2: cy + dy
      };
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function drawSlash(s, index, alpha) {
    const pts = getSlashPoints(index);
    const t = easeOut(s.progress);
    const ex = lerp(pts.x1, pts.x2, t);
    const ey = lerp(pts.y1, pts.y2, t);

    // Store trail
    s.trail.push({ x: ex, y: ey, t });
    if (s.trail.length > 30) s.trail.shift();

    // Draw trail (fading)
    for (let i = 1; i < s.trail.length; i++) {
      const p0 = s.trail[i - 1];
      const p1 = s.trail[i];
      const trailAlpha = (i / s.trail.length) * alpha;
      const trailWidth = (i / s.trail.length) * 3 + 0.5;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = VIOLET_PALE;
      ctx.globalAlpha = trailAlpha * 0.6;
      ctx.lineWidth = trailWidth;
      ctx.shadowColor = VIOLET;
      ctx.shadowBlur = 20;
      ctx.stroke();
    }

    // Draw main slash line from start to current
    ctx.beginPath();
    ctx.moveTo(pts.x1, pts.y1);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = WHITE;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = VIOLET_PALE;
    ctx.shadowBlur = 30;
    ctx.stroke();

    // Bright tip
    ctx.beginPath();
    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = VIOLET_PALE;
    ctx.shadowBlur = 40;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawCompletedSlash(index, alpha, glowIntensity) {
    const pts = getSlashPoints(index);
    ctx.beginPath();
    ctx.moveTo(pts.x1, pts.y1);
    ctx.lineTo(pts.x2, pts.y2);

    // Outer glow
    ctx.strokeStyle = VIOLET;
    ctx.globalAlpha = alpha * 0.4;
    ctx.lineWidth = 8 + glowIntensity * 6;
    ctx.shadowColor = VIOLET;
    ctx.shadowBlur = 40 + glowIntensity * 20;
    ctx.stroke();

    // Inner bright line
    ctx.strokeStyle = VIOLET_PALE;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = VIOLET_PALE;
    ctx.shadowBlur = 15;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // TR slashes — smaller scale, offset
  const trSlashes = [
    { progress: 0, speed: 0.06, trail: [] },
    { progress: 0, speed: 0.06, trail: [] },
  ];

  function getTRSlashPoints(index) {
    const cx = W * 0.72, cy = H / 2;
    const dx = W * 0.12, dy = H * 0.28;
    if (index === 0) {
      return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy };
    } else {
      return { x1: cx + dx, y1: cy - dy, x2: cx - dx, y2: cy + dy };
    }
  }

  function drawTRSlash(s, index, alpha) {
    const pts = getTRSlashPoints(index);
    const t = easeOut(s.progress);
    const ex = lerp(pts.x1, pts.x2, t);
    const ey = lerp(pts.y1, pts.y2, t);

    s.trail.push({ x: ex, y: ey });
    if (s.trail.length > 20) s.trail.shift();

    for (let i = 1; i < s.trail.length; i++) {
      const p0 = s.trail[i - 1];
      const p1 = s.trail[i];
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = VIOLET_MID;
      ctx.globalAlpha = (i / s.trail.length) * alpha * 0.5;
      ctx.lineWidth = (i / s.trail.length) * 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(pts.x1, pts.y1);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = WHITE;
    ctx.globalAlpha = alpha * 0.85;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = VIOLET_MID;
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawCompletedTRSlash(index, alpha) {
    const pts = getTRSlashPoints(index);
    ctx.beginPath();
    ctx.moveTo(pts.x1, pts.y1);
    ctx.lineTo(pts.x2, pts.y2);
    ctx.strokeStyle = VIOLET_MID;
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = 4;
    ctx.shadowColor = VIOLET_MID;
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.strokeStyle = VIOLET_PALE;
    ctx.globalAlpha = alpha * 0.7;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Phase timing
  let phaseTimer = 0;
  let slash1Done = false;
  let slash2Done = false;
  let trSlash1Done = false;
  let trSlash2Done = false;
  let revealAlpha = 0;
  let trRevealAlpha = 0;
  let glowPulse = 0;
  let completedSlashAlpha = 1;
  let trCompletedAlpha = 0;

  function tick() {
    ctx.clearRect(0, 0, W, H);
    glowPulse = (Math.sin(Date.now() * 0.003) + 1) / 2;

    if (phase === 'slash1') {
      slashes[0].progress = Math.min(slashes[0].progress + slashes[0].speed, 1);
      drawSlash(slashes[0], 0, 1);
      if (slashes[0].progress >= 1) {
        slash1Done = true;
        phase = 'slash2';
        setTimeout(() => {}, 60); // brief pause feel
      }
    }

    if (phase === 'slash2' || (phase === 'reveal' && !slash2Done)) {
      if (slash1Done) drawCompletedSlash(0, completedSlashAlpha, glowPulse);
      slashes[1].progress = Math.min(slashes[1].progress + slashes[1].speed, 1);
      drawSlash(slashes[1], 1, 1);
      if (slashes[1].progress >= 1) {
        slash2Done = true;
        phase = 'reveal';
        // Show X text
        logoText.classList.add('revealed');
      }
    }

    if (phase === 'reveal') {
      drawCompletedSlash(0, completedSlashAlpha, glowPulse);
      drawCompletedSlash(1, completedSlashAlpha, glowPulse);

      revealAlpha += 0.02;
      if (revealAlpha >= 1) {
        revealAlpha = 1;
        // Fade slash lines slightly and start TR
        completedSlashAlpha = Math.max(completedSlashAlpha - 0.008, 0.35);
      }

      if (revealAlpha > 0.5 && phase === 'reveal') {
        phase = 'tr-slash';
      }
    }

    if (phase === 'tr-slash') {
      drawCompletedSlash(0, completedSlashAlpha, glowPulse);
      drawCompletedSlash(1, completedSlashAlpha, glowPulse);
      completedSlashAlpha = Math.max(completedSlashAlpha - 0.005, 0.3);

      if (!trSlash1Done) {
        trSlashes[0].progress = Math.min(trSlashes[0].progress + trSlashes[0].speed, 1);
        drawTRSlash(trSlashes[0], 0, 1);
        if (trSlashes[0].progress >= 1) trSlash1Done = true;
      }

      if (trSlash1Done && !trSlash2Done) {
        drawCompletedTRSlash(0, 1);
        trSlashes[1].progress = Math.min(trSlashes[1].progress + trSlashes[1].speed, 1);
        drawTRSlash(trSlashes[1], 1, 1);
        if (trSlashes[1].progress >= 1) {
          trSlash2Done = true;
          logoTR.classList.add('revealed');
          logoSub.classList.add('revealed');
          tagline.classList.add('revealed');
          phase = 'done';
        }
      }
      if (trSlash1Done) drawCompletedTRSlash(0, 1);
    }

    if (phase === 'done') {
      drawCompletedSlash(0, completedSlashAlpha, glowPulse);
      drawCompletedSlash(1, completedSlashAlpha, glowPulse);
      drawCompletedTRSlash(0, 0.8);
      drawCompletedTRSlash(1, 0.8);
      completedSlashAlpha = Math.max(completedSlashAlpha - 0.003, 0.2);
    }

    animId = requestAnimationFrame(tick);
  }

  // Start when hero is ready
  window.addEventListener('xtr:hero-ready', () => {
    resize();
    phase = 'slash1';
    requestAnimationFrame(tick);
  });

  window.addEventListener('resize', () => {
    if (phase !== 'idle') resize();
  });
})();