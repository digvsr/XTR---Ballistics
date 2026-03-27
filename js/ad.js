(function () {
'use strict';

/* ─── COLORS ─────────────────────────── */
const P = {
  CYAN:    '#00FFFF',
  FUCHSIA: '#FF00FF',
  VIOLET:  '#9D00FF',
  GREEN:   '#00FF88',
};

/* ─── DOM ────────────────────────────── */
const venomCanvas = document.getElementById('venom-canvas');
const vCtx        = venomCanvas.getContext('2d');
const logoCanvas  = document.getElementById('logo-canvas');
const lCtx        = logoCanvas.getContext('2d');

const brandUnit   = document.getElementById('brand-unit');
const brandX      = document.getElementById('brand-x');
const brandTR     = document.getElementById('brand-tr');
const brandDyn    = document.getElementById('brand-dynamics');

const sceneMedia  = document.getElementById('scene-missile'); // reuse container

let W=0,H=0;
function resize(){
  W = venomCanvas.width = logoCanvas.width = window.innerWidth;
  H = venomCanvas.height= logoCanvas.height= window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

/* ─── HELPERS ────────────────────────── */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp =(a,b,t)=>a+(b-a)*t;
const easeOut=t=>1-Math.pow(1-t,3);
const rand =(a,b)=>a+Math.random()*(b-a);
const TAU  =Math.PI*2;

/* ═══════════════════════════════════════
   NETWORK OVAL SYSTEM (FAST + CLEAN)
═══════════════════════════════════════ */

class OvalNode {
  constructor(cx, cy, rx, ry, tilt, col, lw, loops=1.5){
    this.cx=cx; this.cy=cy;
    this.rx=rx; this.ry=ry;
    this.tilt=tilt;
    this.col=col;
    this.lw=lw;
    this.loops=loops;

    this.maxT = loops * TAU;
    this.t=0;
    this.speed = 0.6 + Math.random()*0.3; // ⚡ FAST

    this.done=false;
    this.spawned=false;
    this.children=[];

    this.precompute();
  }

  precompute(){
    this.pts=[];
    const steps=Math.ceil(this.maxT/0.05);
    for(let i=0;i<=steps;i++){
      const t=(i/steps)*this.maxT;
      const ct=Math.cos(t), st=Math.sin(t);
      const tl=this.tilt;

      this.pts.push({
        x:this.cx + this.rx*ct*Math.cos(tl) - this.ry*st*Math.sin(tl),
        y:this.cy + this.rx*ct*Math.sin(tl) + this.ry*st*Math.cos(tl),
      });
    }
    this.exitPt=this.pts[this.pts.length-1];
  }

  childAnchor(){
    const spread = rand(-1.2,1.2);
    const up     = rand(1.4,2.4);

    return {
      x: this.exitPt.x + spread * this.rx * 2.4,
      y: this.exitPt.y - up * this.ry * 2.6
    };
  }

  spawnChild(){
    const branches = Math.floor(rand(1,3)); // controlled branching

    for(let i=0;i<branches;i++){
      const a=this.childAnchor();

      if(a.x<-W*0.2||a.x>W*1.2) continue;
      if(a.y<-H*0.2) continue;

      const scale = rand(1.2,1.8);

      const child=new OvalNode(
        a.x, a.y,
        this.rx*scale,
        this.ry*scale*rand(0.6,1),
        this.tilt + rand(-0.4,0.4),
        this.col,
        this.lw*0.95,
        rand(1.4,2.4)
      );

      this.children.push(child);
    }
  }

  update(){
    this.t = Math.min(this.t + this.speed, this.maxT);

    if(!this.spawned && this.t > this.maxT*0.45){
      this.spawned=true;
      this.spawnChild();
    }

    if(this.t>=this.maxT) this.done=true;

    this.children.forEach(c=>c.update());
  }

  draw(ctx, ga){
    const drawn=Math.floor((this.t/this.maxT)*this.pts.length);
    if(drawn<2) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x,this.pts[0].y);
    for(let i=1;i<drawn;i++){
      ctx.lineTo(this.pts[i].x,this.pts[i].y);
    }

    ctx.strokeStyle=this.col;
    ctx.lineWidth=this.lw*2.2; // bold
    ctx.globalAlpha=ga;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.stroke();
    ctx.restore();

    this.children.forEach(c=>c.draw(ctx,ga));
  }
}

/* ─── INIT PATTERN ───────────────────── */
let chains=[];
let patternAlpha=1;

function initPattern(){
  chains=[];
  patternAlpha=1;

  const u=Math.min(W,H)*0.09;

  const seeds=[
    {x:40,y:H-40, tilt:-0.3,col:P.CYAN},
    {x:W-40,y:H-40, tilt:Math.PI+0.3,col:P.CYAN},
    {x:80,y:H-80, tilt:-0.6,col:P.CYAN},
    {x:W-80,y:H-80, tilt:Math.PI+0.6,col:P.CYAN},
  ];

  seeds.forEach(s=>{
    chains.push(new OvalNode(
      s.x,s.y,
      u*rand(0.8,1.4),
      u*rand(0.5,1),
      s.tilt,
      s.col,
      2.2,
      rand(1.4,2.4)
    ));
  });
}

function updatePattern(){ chains.forEach(c=>c.update()); }
function drawPattern(){ chains.forEach(c=>c.draw(vCtx,patternAlpha)); }

initPattern();

/* ═══════════════════════════════════════
   LOGO
═══════════════════════════════════════ */

function G(){
  const cx=W/2, cy=H/2;
  const u=Math.min(W,H)*0.18;
  return {
    s1:{x1:cx-u,y1:cy-u,x2:cx+u,y2:cy+u},
    s2:{x1:cx+u,y1:cy-u,x2:cx-u,y2:cy+u}
  };
}

let xT=0;

function drawLogo(){
  lCtx.clearRect(0,0,W,H);

  const {s1,s2}=G();

  xT=Math.min(xT+0.08,1);
  const t=easeOut(xT);

  function drawLine(s){
    const ex=lerp(s.x1,s.x2,t);
    const ey=lerp(s.y1,s.y2,t);

    lCtx.beginPath();
    lCtx.moveTo(s.x1,s.y1);
    lCtx.lineTo(ex,ey);
    lCtx.strokeStyle=P.FUCHSIA;
    lCtx.lineWidth=6;
    lCtx.lineCap='round';
    lCtx.stroke();
  }

  drawLine(s1);
  drawLine(s2);
}

/* ═══════════════════════════════════════
   TIMELINE
═══════════════════════════════════════ */

let start=null;
let flags={};

function frame(ts){
  if(!start) start=ts;
  const e=ts-start;

  vCtx.clearRect(0,0,W,H);

  updatePattern();
  drawPattern();

  if(e>1800){
    drawLogo();
    patternAlpha=0.3;
  }

  // fade pattern completely
  if(e>2600 && !flags.fadePattern){
    flags.fadePattern=true;
    const s=ts;
    (function fade(n){
      const t=clamp((n-s)/600,0,1);
      patternAlpha=lerp(0.3,0,easeOut(t));
      if(t<1) requestAnimationFrame(fade);
    })(ts);
  }

  // show brand
  if(e>2200 && !flags.brand){
    flags.brand=true;
    brandUnit.classList.add('show');
    brandX.classList.add('slash-in');
    brandTR.classList.add('show');
    brandDyn.classList.add('show');
  }

  // fade logo → reveal media
  if(e>3600 && !flags.logoOut){
    flags.logoOut=true;

    logoCanvas.style.transition='opacity 0.8s ease';
    logoCanvas.style.opacity='0';

    brandUnit.style.transition='opacity 0.8s ease';
    brandUnit.style.opacity='0';

    sceneMedia.classList.add('show');
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

})();