/* js/bg.js — Hero ambient background + footer pulse */

(function () {
  // ── HERO BG ─────────────────────────────────────
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W, H;
    let particles = [];

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + Math.random() * 1.5,
        alpha: 0.1 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.4,
        life: 1,
        decay: 0.002 + Math.random() * 0.003
      };
    }

    for (let i = 0; i < 80; i++) particles.push(createParticle());

    function bgTick() {
      ctx.clearRect(0, 0, W, H);

      // Subtle radial center glow
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.55);
      grad.addColorStop(0, 'rgba(157,0,255,0.06)');
      grad.addColorStop(0.5, 'rgba(100,0,180,0.03)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0 || p.y < -10) {
          particles[i] = createParticle();
          particles[i].y = H + 5;
          return;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(191,95,255,${p.alpha * p.life})`;
        ctx.shadowColor = '#9D00FF';
        ctx.shadowBlur = 6;
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      requestAnimationFrame(bgTick);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('xtr:hero-ready', () => requestAnimationFrame(bgTick));
  }

  // ── FOOTER CANVAS ────────────────────────────────
  const fCanvas = document.getElementById('footer-canvas');
  if (fCanvas) {
    const ctx2 = fCanvas.getContext('2d');
    let FW, FH;

    function fresz() {
      FW = fCanvas.width = fCanvas.offsetWidth;
      FH = fCanvas.height = fCanvas.offsetHeight;
    }

    fresz();
    window.addEventListener('resize', fresz);

    let ft = 0;
    function footerTick() {
      ctx2.clearRect(0, 0, FW, FH);
      ft += 0.015;

      // Horizontal sweep lines
      for (let i = 0; i < 5; i++) {
        const y = ((ft * 60 + i * 40) % (FH + 20)) - 10;
        ctx2.beginPath();
        ctx2.moveTo(0, y);
        ctx2.lineTo(FW, y);
        ctx2.strokeStyle = 'rgba(157,0,255,0.15)';
        ctx2.lineWidth = 1;
        ctx2.stroke();
      }

      requestAnimationFrame(footerTick);
    }

    requestAnimationFrame(footerTick);
  }
})();