(function () {

const bg = document.getElementById("bg-canvas");
const b = bg.getContext("2d");

const logo = document.getElementById("logo-canvas");
const l = logo.getContext("2d");

const brand = document.getElementById("brand-unit");

let W, H;

function resize() {
  W = bg.width = logo.width = window.innerWidth;
  H = bg.height = logo.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const cursor = document.getElementById("cursor");
const trail = document.getElementById("cursor-trail");

document.addEventListener("mousemove", (e) => {
  cursor.style.left = e.clientX + "px";
  cursor.style.top = e.clientY + "px";
  trail.style.left = e.clientX + "px";
  trail.style.top = e.clientY + "px";
});

function drawBackground(t) {
  const time = t * 0.001;

  for (let i = 0; i < 6; i++) {
    b.beginPath();

    for (let x = 0; x < W; x += 2) {
      const y =
        H * 0.5 +
        Math.sin(x * 0.01 + time + i) * 60 +
        Math.sin(x * 0.004 + time * 0.5 + i) * 40;

      if (x === 0) b.moveTo(x, y);
      else b.lineTo(x, y);
    }

    const grad = b.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "rgba(0,255,255,0.08)");
    grad.addColorStop(1, "rgba(255,0,255,0.08)");

    b.strokeStyle = grad;
    b.lineWidth = 1.2;
    b.shadowColor = "#00FFFF";
    b.shadowBlur = 25;

    b.stroke();
  }

  b.shadowBlur = 0;
}

function neonLine(x1, y1, x2, y2, color) {
  l.beginPath();
  l.moveTo(x1, y1);
  l.lineTo(x2, y2);

  l.strokeStyle = color;
  l.lineWidth = 3;
  l.shadowColor = color;
  l.shadowBlur = 30;
  l.stroke();

  l.lineWidth = 1;
  l.shadowBlur = 10;
  l.strokeStyle = "#ffffff";
  l.stroke();
}

function getGeometry() {
  const cx = W / 2;
  const cy = H / 2;
  const u = Math.min(W, H) * 0.15;

  return {
    x1: { x1: cx - u * 2, y1: cy - u, x2: cx - u, y2: cy + u },
    x2: { x1: cx - u, y1: cy - u, x2: cx - u * 2, y2: cy + u },
    tTop: { x1: cx - u * 0.6, y1: cy - u, x2: cx + u * 0.6, y2: cy - u },
    tStem: { x1: cx, y1: cy - u, x2: cx, y2: cy + u },
    rStem: { x1: cx + u, y1: cy - u, x2: cx + u, y2: cy + u },
    rLeg: { x1: cx + u, y1: cy, x2: cx + u * 1.6, y2: cy + u },
    rArc: { cx: cx + u * 1.05, cy: cy - u * 0.2, r: u * 0.5 }
  };
}

let start = null;
let xAlpha = 0, tAlpha = 0, rAlpha = 0;

function frame(ts) {
  if (!start) start = ts;
  const e = ts - start;

  b.clearRect(0, 0, W, H);
  l.clearRect(0, 0, W, H);

  drawBackground(e);

  const g = getGeometry();

  if (e > 2000) xAlpha = Math.min(xAlpha + 0.02, 1);
  if (e > 2600) tAlpha = Math.min(tAlpha + 0.02, 1);
  if (e > 3200) rAlpha = Math.min(rAlpha + 0.02, 1);

  l.globalAlpha = xAlpha;
  neonLine(g.x1.x1, g.x1.y1, g.x1.x2, g.x1.y2, "#00FFFF");
  neonLine(g.x2.x1, g.x2.y1, g.x2.x2, g.x2.y2, "#FF00FF");

  l.globalAlpha = tAlpha;
  neonLine(g.tTop.x1, g.tTop.y1, g.tTop.x2, g.tTop.y2, "#FF00FF");
  neonLine(g.tStem.x1, g.tStem.y1, g.tStem.x2, g.tStem.y2, "#FF00FF");

  l.globalAlpha = rAlpha;

  neonLine(g.rStem.x1, g.rStem.y1, g.rStem.x2, g.rStem.y2, "#9D00FF");

  l.beginPath();
  l.arc(g.rArc.cx, g.rArc.cy, g.rArc.r, 0, Math.PI * 1.4);
  l.strokeStyle = "#9D00FF";
  l.lineWidth = 3;
  l.shadowColor = "#9D00FF";
  l.shadowBlur = 30;
  l.stroke();

  neonLine(g.rLeg.x1, g.rLeg.y1, g.rLeg.x2, g.rLeg.y2, "#FF00FF");

  l.globalAlpha = 1;

  if (e > 5000) brand.classList.add("show");

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

})();