/* js/loader.js — XTR Ballistics rising blade-curve intro */

(function () {
  const canvas = document.getElementById('loader-canvas');
  const ctx = canvas.getContext('2d');
  const bar = document.getElementById('loader-bar');
  const loader = document.getElementById('loader');
  const main = document.getElementById('main');

  let W, H, lines = [], progress = 0, animId;
  const VIOLET = '#9D00FF';
  const VIOLET_MID = '#BF5FFF';
  const VIOLET_PALE = '#E0AAFF';

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  // Each "blade curve" is a bezier path that rises from bottom
  function createLine() {
    const x = Math.random() * W;
    const color = [VIOLET, VIOLET_MID, VIOLET_PALE][Math.floor(Math.random() * 3)];
    const alpha = 0.15 + Math.random() * 0.5;
    const width = 0.5 + Math.random() * 1.5;
    const speed = 0.008 + Math.random() * 0.018;
    // bezier curve shape — slash/blade style
    const cpx1 = x + (Math.random() - 0.5) * 300;
    const cpx2 = x + (Math.random() - 0.5) * 200;
    return { x, cpx1, cpx2, color, alpha, width, speed, t: 0, done: false };
  }

  // Seed initial lines
  for (let i = 0; i < 28; i++) {
    const l = createLine();
    l.t = Math.random(); // stagger
    lines.push(l);
  }

  function drawLine(l) {
    if (l.t <= 0) return;
    const tClamped = Math.min(l.t, 1);

    // Compute points along bezier: start at bottom, end at top
    const y0 = H + 20;
    const y1 = H * 0.6;
    const y2 = H * 0.3;
    const y3 = -20;

    // Sample bezier up to tClamped for partial draw
    const steps = 60;
    ctx.beginPath();
    ctx.lineWidth = l.width;
    ctx.strokeStyle = l.color;
    ctx.globalAlpha = l.alpha * (tClamped < 0.1 ? tClamped * 10 : tClamped > 0.9 ? (1 - tClamped) * 10 : 1);
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 12;

    let started = false;
    for (let i = 0; i <= steps * tClamped; i++) {
      const tt = i / steps;
      const bx = cubicBezier(l.x, l.cpx1, l.cpx2, l.x + (Math.random() * 2 - 1) * 10, tt);
      const by = cubicBezier(y0, y1, y2, y3, tt);
      if (!started) { ctx.moveTo(bx, by); started = true; }
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function cubicBezier(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  }

  function drawGrid() {
    // subtle horizontal scan lines
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = VIOLET;
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  let startTime = null;
  const DURATION = 3200; // ms total loader time

  function tick(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    progress = Math.min(elapsed / DURATION, 1);

    ctx.clearRect(0, 0, W, H);
    drawGrid();

    lines.forEach(l => {
      l.t += l.speed;
      if (l.t > 1.3) {
        // recycle
        Object.assign(l, createLine());
        l.t = 0;
      }
      drawLine(l);
    });

    // Central convergence glow at top as loader nears end
    if (progress > 0.6) {
      const gAlpha = (progress - 0.6) / 0.4;
      const grad = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, H * 0.4);
      grad.addColorStop(0, `rgba(157,0,255,${0.15 * gAlpha})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Update bar
    bar.style.width = (progress * 100) + '%';

    if (progress < 1) {
      animId = requestAnimationFrame(tick);
    } else {
      endLoader();
    }
  }

  function endLoader() {
    // Final flash
    let flash = 0;
    const flashAnim = () => {
      flash += 0.08;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - flash * 2);
      ctx.fillStyle = VIOLET;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      if (flash < 1) requestAnimationFrame(flashAnim);
      else {
        loader.classList.add('fade-out');
        main.classList.remove('hidden');
        main.classList.add('visible');
        setTimeout(() => {
          loader.style.display = 'none';
          // Trigger hero animations
          window.dispatchEvent(new Event('xtr:hero-ready'));
        }, 800);
      }
    };
    requestAnimationFrame(flashAnim);
  }

  requestAnimationFrame(tick);
})();