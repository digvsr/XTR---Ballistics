(function () {

const bg = document.getElementById("bg-canvas");
const logo = document.getElementById("logo-canvas");
const brand = document.getElementById("brand-unit");

if (!bg || !logo) return;

const b = bg.getContext("2d");
const l = logo.getContext("2d");

let W = 0, H = 0;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;

  bg.width = W;
  bg.height = H;

  logo.width = W;
  logo.height = H;
}
window.addEventListener("resize", resize);
resize();

const cursor = document.getElementById("cursor");
const trail = document.getElementById("cursor-trail");

document.addEventListener("mousemove", (e) => {
  if (cursor && trail) {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
    trail.style.left = e.clientX + "px";
    trail.style.top = e.clientY + "px";
  }
});

function drawBackground(t) {
  const time = t * 0.001;

  b.globalAlpha = 1;
  b.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    b.beginPath();

    for (let x = 0; x <= W; x += 3) {
      const y =
        H * 0.5 +
        Math.sin(x * 0.01 + time + i) * 50 +
        Math.sin(x * 0.004 + time * 0.6 + i) * 30;

      if (x === 0) b.moveTo(x, y);
      else b.lineTo(x, y);
    }

    const grad = b.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "rgba(0,255,255,0.06)");
    grad.addColorStop(1, "rgba(255,0,255,0.06)");

    b.strokeStyle = grad;
    b.shadowColor = "#00FFFF";
    b.shadowBlur = 15;

    b.stroke();
  }

  b.shadowBlur = 0;
}

function neonLine(ctx, x1, y1, x2, y2, color) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

function getGeometry() {
  const cx = W * 0.5;
  const cy = H * 0.5;
  const u = Math.min(W, H) * 0.12;

  return {
    X1: [cx - u * 2, cy - u, cx - u, cy + u],
    X2: [cx - u, cy - u, cx - u * 2, cy + u],
    T1: [cx - u * 0.7, cy - u, cx + u * 0.7, cy - u],
    T2: [cx, cy - u, cx, cy + u],
    R1: [cx + u, cy - u, cx + u, cy + u],
    R2: [cx + u, cy, cx + u * 1.5, cy + u],
    arc: { x: cx + u * 1.05, y: cy - u * 0.2, r: u * 0.45 }
  };
}

let start = 0;
let ax = 0, at = 0, ar = 0;

function frame(t) {
  if (!start) start = t;
  const e = t - start;

  b.clearRect(0, 0, W, H);
  l.clearRect(0, 0, W, H);

  drawBackground(e);

  const g = getGeometry();

  if (e > 1500) ax = Math.min(ax + 0.03, 1);
  if (e > 2000) at = Math.min(at + 0.03, 1);
  if (e > 2600) ar = Math.min(ar + 0.03, 1);

  l.globalAlpha = ax;
  neonLine(l, g.X1[0], g.X1[1], g.X1[2], g.X1[3], "#00FFFF");
  neonLine(l, g.X2[0], g.X2[1], g.X2[2], g.X2[3], "#FF00FF");

  l.globalAlpha = at;
  neonLine(l, g.T1[0], g.T1[1], g.T1[2], g.T1[3], "#FF00FF");
  neonLine(l, g.T2[0], g.T2[1], g.T2[2], g.T2[3], "#FF00FF");

  l.globalAlpha = ar;

  neonLine(l, g.R1[0], g.R1[1], g.R1[2], g.R1[3], "#9D00FF");

  l.beginPath();
  l.arc(g.arc.x, g.arc.y, g.arc.r, 0, Math.PI * 1.4);
  l.strokeStyle = "#9D00FF";
  l.lineWidth = 3;
  l.shadowColor = "#9D00FF";
  l.shadowBlur = 20;
  l.stroke();

  neonLine(l, g.R2[0], g.R2[1], g.R2[2], g.R2[3], "#FF00FF");

  l.globalAlpha = 1;

  if (brand && e > 4000) brand.classList.add("show");

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

})();