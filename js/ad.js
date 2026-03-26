(function(){

const bg = document.getElementById("bg-canvas");
const b = bg.getContext("2d");

const logo = document.getElementById("logo-canvas");
const l = logo.getContext("2d");

const brand = document.getElementById("brand-unit");

let W,H;
function resize(){
  W = bg.width = logo.width = innerWidth;
  H = bg.height = logo.height = innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* CURSOR */
const cursor = document.getElementById("cursor");
const trail = document.getElementById("cursor-trail");

document.addEventListener("mousemove", e=>{
  cursor.style.left = e.clientX+"px";
  cursor.style.top  = e.clientY+"px";
  trail.style.left  = e.clientX+"px";
  trail.style.top   = e.clientY+"px";
});

/* BACKGROUND (CONTROLLED) */
function drawBG(t){
  for(let i=0;i<4;i++){
    b.beginPath();
    for(let x=0;x<W;x+=2){
      let y = H*0.3 + i*80 + Math.sin(x*0.008 + t*0.002 + i)*40;
      x===0 ? b.moveTo(x,y) : b.lineTo(x,y);
    }
    b.strokeStyle="rgba(0,255,255,0.08)";
    b.lineWidth=1;
    b.shadowColor="#00FFFF";
    b.shadowBlur=20;
    b.stroke();
  }
  b.shadowBlur=0;
}

/* NEON LINE */
function neon(x1,y1,x2,y2,color){
  l.beginPath();
  l.moveTo(x1,y1);
  l.lineTo(x2,y2);

  l.strokeStyle=color;
  l.lineWidth=3;
  l.shadowColor=color;
  l.shadowBlur=30;
  l.stroke();

  l.lineWidth=1;
  l.shadowBlur=10;
  l.strokeStyle="#fff";
  l.stroke();
}

/* LOGO GEOMETRY */
function G(){
  let cx=W/2, cy=H/2;
  let u=Math.min(W,H)*0.15;

  return {
    X:[
      [cx-u*2,cy-u, cx-u,cy+u],
      [cx-u,cy-u, cx-u*2,cy+u]
    ],
    T:[
      [cx-u*0.5,cy-u, cx+u*0.5,cy-u],
      [cx,cy-u, cx,cy+u]
    ],
    R:{
      stem:[cx+u,cy-u, cx+u,cy+u],
      leg:[cx+u,cy, cx+u*1.6,cy+u]
    }
  };
}

/* ANIMATION */
let start=null;
let ax=0, at=0, ar=0;

function frame(t){
  if(!start) start=t;
  let e=t-start;

  b.clearRect(0,0,W,H);
  l.clearRect(0,0,W,H);

  drawBG(e);

  let g=G();

  if(e>2000) ax=Math.min(ax+0.03,1);
  if(e>2600) at=Math.min(at+0.03,1);
  if(e>3200) ar=Math.min(ar+0.03,1);

  l.globalAlpha=ax;
  neon(...g.X[0],"#00FFFF");
  neon(...g.X[1],"#FF00FF");

  l.globalAlpha=at;
  neon(...g.T[0],"#FF00FF");
  neon(...g.T[1],"#FF00FF");

  l.globalAlpha=ar;
  neon(...g.R.stem,"#9D00FF");

  l.beginPath();
  l.arc(W/2+80,H/2-20,50,0,Math.PI*1.5);
  l.strokeStyle="#9D00FF";
  l.lineWidth=3;
  l.shadowBlur=30;
  l.stroke();

  neon(...g.R.leg,"#FF00FF");

  l.globalAlpha=1;

  if(e>5000) brand.classList.add("show");

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

})();