const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');

document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  ring.style.left = e.clientX + 'px';
  ring.style.top = e.clientY + 'px';
});

/* SIMPLE BACKGROUND PATTERN */
const canvas = document.getElementById('venom-canvas');
const ctx = canvas.getContext('2d');

let W, H;
function resize(){
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

let dots = [];
for(let i=0;i<60;i++){
  dots.push({
    x:Math.random()*W,
    y:Math.random()*H,
    vx:(Math.random()-0.5)*0.3,
    vy:(Math.random()-0.5)*0.3
  });
}

function draw(){
  ctx.clearRect(0,0,W,H);

  for(let d of dots){
    d.x += d.vx;
    d.y += d.vy;

    if(d.x<0||d.x>W) d.vx*=-1;
    if(d.y<0||d.y>H) d.vy*=-1;

    ctx.fillStyle="#222";
    ctx.beginPath();
    ctx.arc(d.x,d.y,2,0,Math.PI*2);
    ctx.fill();
  }

  requestAnimationFrame(draw);
}
draw();

/* SEQUENCE */
const brand = document.getElementById('brand-unit');
const missile = document.getElementById('scene-missile');
const missileInner = document.getElementById('missile-inner');
const end = document.getElementById('scene-end');
const endInner = document.getElementById('end-inner');

function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function run(){
  await delay(500);

  brand.classList.add('show');

  await delay(2500);

  brand.style.opacity = "0";

  await delay(800);

  missile.classList.add('show');
  missileInner.classList.add('show');

  await delay(6000);

  missile.style.opacity = "0";

  await delay(800);

  end.classList.add('show');
  endInner.classList.add('show');
}

run();