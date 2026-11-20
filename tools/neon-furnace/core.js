'use strict';
/* ==========================================================================
   NEON FURNACE - an original raycasting shooter.
   Everything below is generated at load: no images, no audio files, no data
   files. The world is a 320x168 software framebuffer blitted to a canvas,
   with the status bar, menus and effects drawn on top in 2D.
   ========================================================================== */

/* ------------------------------------------------------------- utilities */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const TAU=Math.PI*2;
function angDiff(a,b){let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;}
const fmtTime=t=>{t=t|0;return (t/60|0)+':'+String(t%60).padStart(2,'0');};
const fmtNum=n=>Math.round(n).toLocaleString('en-US');

/* ---------------------------------------------------------- screen setup */
const RW=320, RH=200, VIEW_H=168;          // 200-line screen, 32-line status bar
const cvs=document.getElementById('game');
const ctx=cvs.getContext('2d',{alpha:false});
let SCALE=4;
const fbc=document.createElement('canvas');fbc.width=RW;fbc.height=VIEW_H;
const fbx=fbc.getContext('2d');
const frame=fbx.createImageData(RW,VIEW_H);
const buf=new Uint32Array(frame.data.buffer);
const zbuf=new Float32Array(RW);
// Glow: a quarter-size bright pass, softened and added back on top. Neon
// signs bleed light into the dark around them, which is most of the look.
const GW=80, GH=42;
const gcv=document.createElement('canvas');gcv.width=GW;gcv.height=GH;
const gcx=gcv.getContext('2d');
const gimg=gcx.createImageData(GW,GH);
const gbuf=new Uint32Array(gimg.data.buffer);
const gacc=new Float32Array(GW*GH*3), gtmp=new Float32Array(GW*GH*3);

function resizeCanvas(){
  const r=cvs.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const w=Math.max(RW,Math.round((r.width||640)*dpr));
  if(cvs.width!==w){cvs.width=w;cvs.height=Math.round(w*RH/RW);}
  SCALE=cvs.width/RW;
  ctx.imageSmoothingEnabled=false;
}
function buildGlow(){
  gacc.fill(0);
  for(let y=0;y<VIEW_H;y++){
    const gy=(y*GH/VIEW_H)|0, o=y*RW;
    for(let x=0;x<RW;x++){
      const c=buf[o+x], r=c&255, g=(c>>8)&255, b=(c>>16)&255;
      const m=r>g?(r>b?r:b):(g>b?g:b);
      if(m<170)continue;
      const k=(m-170)/85, i=(gy*GW+(x>>2))*3;
      gacc[i]+=r*k;gacc[i+1]+=g*k;gacc[i+2]+=b*k;
    }
  }
  // two box passes, horizontal then vertical
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    let r=0,g=0,b=0;
    for(let d=-2;d<=2;d++){const xx=clamp(x+d,0,GW-1),i=(y*GW+xx)*3;r+=gacc[i];g+=gacc[i+1];b+=gacc[i+2];}
    const i=(y*GW+x)*3;gtmp[i]=r;gtmp[i+1]=g;gtmp[i+2]=b;
  }
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    let r=0,g=0,b=0;
    for(let d=-2;d<=2;d++){const yy=clamp(y+d,0,GH-1),i=(yy*GW+x)*3;r+=gtmp[i];g+=gtmp[i+1];b+=gtmp[i+2];}
    const s=1/300;
    gbuf[y*GW+x]=0xff000000|(Math.min(255,b*s)<<16)|(Math.min(255,g*s)<<8)|Math.min(255,r*s);
  }
  gcx.putImageData(gimg,0,0);
}
// Blit the finished software frame (with shake), add the glow, then hand
// the context back in 320x200 user units.
function blitWorld(sx,sy,glow){
  fbx.putImageData(frame,0,0);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.imageSmoothingEnabled=false;
  const ox=Math.round((sx||0)*SCALE), oy=Math.round((sy||0)*SCALE);
  if(ox||oy){ctx.fillStyle='#000';ctx.fillRect(0,0,cvs.width,VIEW_H*SCALE);}
  ctx.drawImage(fbc,0,0,RW,VIEW_H,ox,oy,cvs.width,VIEW_H*SCALE);
  if(glow){
    buildGlow();
    ctx.imageSmoothingEnabled=true;
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.85;
    ctx.drawImage(gcv,0,0,GW,GH,ox,oy,cvs.width,VIEW_H*SCALE);
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    ctx.imageSmoothingEnabled=false;
  }
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
}
function beginUI(){
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  ctx.imageSmoothingEnabled=false;
}
addEventListener('resize',resizeCanvas);
document.addEventListener('fullscreenchange',resizeCanvas);

/* Shade tables. Light falls off with distance through 32 levels, and what
   is lost fades into the level's fog colour instead of plain black, one
   table per channel so it stays a lookup, not a multiply. */
const SHADES=32;
const SHR=new Uint8Array(SHADES*256), SHG=new Uint8Array(SHADES*256), SHB=new Uint8Array(SHADES*256);
function setFog(f){
  for(let l=0;l<SHADES;l++){
    const k=l/(SHADES-1), fk=(1-k)*0.85;
    for(let v=0;v<256;v++){
      SHR[l*256+v]=Math.min(255,v*k+f[0]*fk);
      SHG[l*256+v]=Math.min(255,v*k+f[1]*fk);
      SHB[l*256+v]=Math.min(255,v*k+f[2]*fk);
    }
  }
}
setFog([20,10,30]);
// One shaded pixel. Alpha 255 marks an emissive texel: neon ignores distance.
function shadePx(c32,ls){
  if((c32>>>24)===255)return c32;
  return 0xff000000|(SHB[ls+((c32>>16)&255)]<<16)|(SHG[ls+((c32>>8)&255)]<<8)|SHR[ls+(c32&255)];
}

/* ------------------------------------------------- procedural texture kit */
const TW=64;
const tcv=document.createElement('canvas');tcv.width=TW;tcv.height=TW;
const tcx=tcv.getContext('2d',{willReadFrequently:true});

// Bright, saturated texels are marked emissive automatically, so painting a
// neon strip is all it takes to make it glow in the dark.
function markEmissive(u,opaque){
  for(let i=0;i<u.length;i++){
    const c=u[i], a=c>>>24;
    if(!opaque&&a<128){u[i]=0;continue;}
    const r=c&255,g=(c>>8)&255,b=(c>>16)&255;
    const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
    const em=(mx>=205&&mx-mn>=110)||mn>=236;
    u[i]=(c&0x00ffffff)|((em?255:254)<<24);
  }
  return u;
}
function makeTex(draw){
  tcx.setTransform(1,0,0,1,0,0);
  tcx.clearRect(0,0,TW,TW);
  draw(tcx);
  const d=tcx.getImageData(0,0,TW,TW);
  return markEmissive(new Uint32Array(d.data.buffer.slice(0)),true);
}
function noise(c,n,a,seed,tint){
  const r=mulberry32(seed);
  for(let i=0;i<n;i++){
    const x=(r()*TW)|0,y=(r()*TW)|0,s=1+((r()*2)|0);
    const v=(r()*120)|0;
    c.fillStyle=tint?'rgba('+tint+','+(a*r()).toFixed(3)+')':'rgba('+v+','+v+','+(v+20)+','+(a*r()).toFixed(3)+')';
    c.fillRect(x,y,s,s);
  }
}
function panel(c,base,edge,dark){
  c.fillStyle=base;c.fillRect(0,0,TW,TW);
  c.strokeStyle=dark;c.lineWidth=2;c.strokeRect(1,1,TW-2,TW-2);
  c.strokeStyle=edge;c.lineWidth=1;
  c.beginPath();c.moveTo(2,2);c.lineTo(TW-3,2);c.moveTo(2,2);c.lineTo(2,TW-3);c.stroke();
}
function bolts(c,col,inset){
  c.fillStyle=col;
  for(const [x,y] of [[inset,inset],[TW-inset-2,inset],[inset,TW-inset-2],[TW-inset-2,TW-inset-2]])c.fillRect(x,y,2,2);
}
function stains(c,seed,n,col){
  const r=mulberry32(seed);
  for(let i=0;i<n;i++){
    c.fillStyle='rgba('+col+','+(0.08+r()*0.18).toFixed(2)+')';
    const x=r()*TW,y=r()*TW;c.fillRect(x,y,1+r()*3,4+r()*18);
  }
}
const NEON={pink:'#ff3fb4',cyan:'#2ef2ff',amber:'#ffb12e',violet:'#b46bff',lime:'#9dff3c',red:'#ff3b4e',white:'#f2f6ff'};

const TEX={};
/* walls: one per theme */
TEX.concrete=makeTex(c=>{               // undercity: wet concrete slabs
  c.fillStyle='#252433';c.fillRect(0,0,TW,TW);
  const r=mulberry32(5);
  for(let i=0;i<70;i++){const v=30+r()*16|0;c.fillStyle='rgb('+v+','+(v-2)+','+(v+12)+')';c.fillRect(r()*TW,r()*TW,4+r()*14,3+r()*8);}
  c.fillStyle='#17181d';c.fillRect(0,31,TW,2);c.fillRect(31,0,2,31);c.fillRect(15,33,2,31);c.fillRect(47,33,2,31);
  stains(c,6,26,'10,10,16');noise(c,420,0.12,7);
  c.fillStyle=NEON.pink;c.fillRect(0,58,TW,1);                // a strip of LED along the kerb
  c.fillStyle='rgba(255,63,180,.22)';c.fillRect(0,55,TW,3);
});
TEX.circuit=makeTex(c=>{                // data vault: navy panels, cyan traces
  panel(c,'#141c2e','#24314d','#0a0f1a');
  c.strokeStyle='#1d6f85';c.lineWidth=1;
  const r=mulberry32(13);
  for(let i=0;i<9;i++){
    let x=4+(r()*56|0),y=4+(r()*56|0);c.beginPath();c.moveTo(x+.5,y+.5);
    for(let k=0;k<3;k++){if(r()<.5)x=4+(r()*56|0);else y=4+(r()*56|0);c.lineTo(x+.5,y+.5);}
    c.stroke();c.fillStyle='#2ef2ff';c.fillRect(x-1,y-1,2,2);
  }
  c.fillStyle=NEON.cyan;c.fillRect(6,58,52,1);
  noise(c,240,0.08,17);
});
TEX.steel=makeTex(c=>{                  // the core: scorched steel, red glow seams
  panel(c,'#2b1e22','#45313a','#120b0e');
  c.fillStyle='#21161a';for(let y=6;y<TW-6;y+=14)c.fillRect(6,y,TW-12,9);
  c.fillStyle='#3a2a30';for(let y=6;y<TW-6;y+=14)c.fillRect(6,y,TW-12,1);
  c.fillStyle='#ff3b4e';c.fillRect(30,4,4,1);c.fillRect(30,59,4,1);
  bolts(c,'#5e4a52',4);stains(c,23,18,'0,0,0');noise(c,420,0.10,29);
});
TEX.glass=makeTex(c=>{                  // the spire: smoked glass curtain wall
  const g=c.createLinearGradient(0,0,TW,TW);g.addColorStop(0,'#141631');g.addColorStop(1,'#0b0c1c');
  c.fillStyle=g;c.fillRect(0,0,TW,TW);
  c.fillStyle='rgba(180,107,255,.10)';c.beginPath();c.moveTo(0,0);c.lineTo(26,0);c.lineTo(0,40);c.fill();
  c.fillStyle='#2a2d52';c.fillRect(0,0,TW,2);c.fillRect(0,0,2,TW);c.fillRect(31,0,2,TW);
  c.fillStyle=NEON.violet;c.fillRect(0,62,TW,1);
  noise(c,160,0.07,31);
});
TEX.roof=makeTex(c=>{                   // rooftops: weathered parapet blocks
  c.fillStyle='#262531';c.fillRect(0,0,TW,TW);
  const r=mulberry32(37);
  for(let y=0;y<TW;y+=16){const off=((y/16)&1)?16:0;
    for(let x=-16;x<TW;x+=32){const v=0.75+r()*0.4;c.fillStyle='rgb('+(44*v|0)+','+(42*v|0)+','+(56*v|0)+')';c.fillRect(x+off+1,y+1,30,14);}}
  stains(c,38,30,'8,6,14');noise(c,380,0.11,39);
  c.fillStyle=NEON.cyan;c.fillRect(0,1,TW,1);c.fillStyle='rgba(46,242,255,.2)';c.fillRect(0,2,TW,2);
});
TEX.pipes=makeTex(c=>{
  c.fillStyle='#16171d';c.fillRect(0,0,TW,TW);
  for(let i=0;i<4;i++){const x=4+i*15;
    const g=c.createLinearGradient(x,0,x+10,0);g.addColorStop(0,'#2a2c36');g.addColorStop(.45,'#5a5e70');g.addColorStop(1,'#1b1c23');
    c.fillStyle=g;c.fillRect(x,0,10,TW);c.fillStyle='#0d0e12';c.fillRect(x,20+i*7,10,3);}
  c.fillStyle=NEON.amber;c.fillRect(8,44,2,2);
  noise(c,200,0.08,41);
});
TEX.brick=makeTex(c=>{
  c.fillStyle='#1d1219';c.fillRect(0,0,TW,TW);
  const r=mulberry32(43);
  for(let y=0;y<TW;y+=8){const off=((y/8)&1)?8:0;
    for(let x=-8;x<TW;x+=16){const v=0.7+r()*0.5;c.fillStyle='rgb('+(60*v|0)+','+(30*v|0)+','+(44*v|0)+')';c.fillRect(x+off+1,y+1,14,6);}}
  // a tag sprayed across it
  c.strokeStyle='#ff3fb4';c.lineWidth=2;c.beginPath();c.moveTo(10,40);c.bezierCurveTo(20,20,30,50,40,28);c.lineTo(52,36);c.stroke();
  noise(c,420,0.14,47);
});
TEX.hazard=makeTex(c=>{
  c.fillStyle='#141318';c.fillRect(0,0,TW,TW);
  c.fillStyle='#d9a21c';
  for(let i=-TW;i<TW*2;i+=18){c.beginPath();c.moveTo(i,0);c.lineTo(i+9,0);c.lineTo(i+9-TW,TW);c.lineTo(i-TW,TW);c.closePath();c.fill();}
  c.fillStyle='#09090c';c.fillRect(0,0,TW,4);c.fillRect(0,TW-4,TW,4);
  noise(c,300,0.18,53);
});
TEX.terminal=makeTex(c=>{
  panel(c,'#1c2029','#2d3442','#0c0e13');
  c.fillStyle='#03080a';c.fillRect(7,7,50,32);
  const r=mulberry32(59);
  for(let i=0;i<7;i++){c.fillStyle=i===2?NEON.pink:NEON.cyan;c.fillRect(10,10+i*4,6+(r()*38|0),2);}
  c.fillStyle='#0e1117';c.fillRect(7,44,50,13);
  for(let i=0;i<10;i++){c.fillStyle=r()<.3?NEON.lime:'#2f3646';c.fillRect(9+i*5,47,3,3);c.fillRect(9+i*5,52,3,2);}
  noise(c,160,0.07,61);
});
function signTex(col,col2,seed,glyph){
  return makeTex(c=>{
    c.fillStyle='#121019';c.fillRect(0,0,TW,TW);
    c.fillStyle='#07060b';c.fillRect(6,8,52,46);
    c.strokeStyle=col;c.lineWidth=2;c.strokeRect(9,11,46,40);
    c.fillStyle=col2;glyph(c);
    c.fillStyle='#2a2833';c.fillRect(20,54,3,10);c.fillRect(41,54,3,10);
    noise(c,120,0.08,seed);
  });
}
TEX.signA=signTex(NEON.pink,NEON.cyan,67,c=>{c.fillRect(18,18,4,26);c.fillRect(18,18,14,4);c.fillRect(18,29,12,4);c.fillRect(36,18,4,26);c.fillRect(36,40,12,4);});
TEX.signB=signTex(NEON.cyan,NEON.amber,71,c=>{for(let i=0;i<3;i++){c.fillRect(17+i*11,18,7,4);c.fillRect(20+i*11,22,2,20);c.fillRect(16+i*11,30,9,3);}});
TEX.signC=signTex(NEON.violet,NEON.pink,73,c=>{c.beginPath();c.arc(32,31,13,0,TAU);c.lineWidth=3;c.strokeStyle=NEON.pink;c.stroke();c.fillRect(30,20,4,22);c.fillRect(22,30,20,3);});
TEX.window=makeTex(c=>{
  const g=c.createLinearGradient(0,0,0,TW);g.addColorStop(0,'#0b0820');g.addColorStop(1,'#3a1240');
  c.fillStyle=g;c.fillRect(0,0,TW,TW);
  const r=mulberry32(79);
  for(let i=0;i<7;i++){const x=r()*TW|0,w=6+r()*10|0,h=18+r()*40|0;c.fillStyle='#07060f';c.fillRect(x,TW-h,w,h);
    for(let k=0;k<10;k++){c.fillStyle=[NEON.amber,NEON.cyan,'#ffe9b0',NEON.pink][(r()*4)|0];c.fillRect(x+1+(r()*(w-2)|0),TW-h+2+(r()*(h-4)|0),1,1);}}
  c.fillStyle='#1b1a24';c.fillRect(0,0,TW,3);c.fillRect(0,TW-3,TW,3);c.fillRect(0,0,3,TW);c.fillRect(TW-3,0,3,TW);c.fillRect(31,0,2,TW);
});
TEX.vent=makeTex(c=>{
  panel(c,'#22232b','#33353f','#0f1014');
  c.fillStyle='#0b0b0f';c.beginPath();c.arc(32,32,22,0,TAU);c.fill();
  c.strokeStyle='#3b3e4b';c.lineWidth=3;
  for(let i=0;i<5;i++){const a=i*TAU/5;c.beginPath();c.moveTo(32,32);c.lineTo(32+Math.cos(a)*20,32+Math.sin(a)*20);c.stroke();}
  c.fillStyle=NEON.red;c.fillRect(54,6,3,3);
  noise(c,160,0.08,83);
});
function doorTex(stripe,base){
  return makeTex(c=>{
    panel(c,base||'#2a2e3a','#3d4354','#11131a');
    c.fillStyle='#1d2029';c.fillRect(4,4,TW-8,TW-8);
    c.fillStyle='#121419';c.fillRect(TW/2-1,4,2,TW-8);
    c.fillStyle=stripe;c.fillRect(6,28,TW/2-8,3);c.fillRect(TW/2+2,28,TW/2-8,3);
    c.fillRect(6,10,2,14);c.fillRect(TW-8,10,2,14);
    c.fillStyle='#0b0c10';for(let y=40;y<58;y+=4)c.fillRect(8,y,TW-16,2);
    bolts(c,'#4b5265',6);noise(c,160,0.07,89);
  });
}
TEX.door =doorTex(NEON.cyan);
TEX.doorB=doorTex('#3c8bff');
TEX.doorY=doorTex(NEON.amber);
TEX.doorR=doorTex(NEON.red);
TEX.doorO=doorTex(NEON.pink,'#2a1830');
TEX.exit =makeTex(c=>{
  panel(c,'#191b24','#2b2f3d','#0b0c10');
  c.fillStyle='#050608';c.fillRect(12,10,40,44);
  c.fillStyle=NEON.lime;
  c.beginPath();c.moveTo(22,20);c.lineTo(42,32);c.lineTo(22,44);c.closePath();c.fill();
  c.fillStyle='#0b1a05';c.fillRect(25,28,8,8);
  c.fillStyle=NEON.lime;c.fillRect(12,56,40,2);
  bolts(c,'#454b5c',4);
});
/* floors and ceilings */
TEX.asphalt=makeTex(c=>{
  c.fillStyle='#17161d';c.fillRect(0,0,TW,TW);
  const r=mulberry32(101);
  for(let i=0;i<120;i++){const v=0.7+r()*0.6;c.fillStyle='rgb('+(26*v|0)+','+(25*v|0)+','+(33*v|0)+')';c.fillRect(r()*TW,r()*TW,2+r()*6,2+r()*6);}
  // puddle sheen catching the signs
  c.fillStyle='rgba(255,63,180,.16)';c.beginPath();c.ellipse(20,40,14,5,0.3,0,TAU);c.fill();
  c.fillStyle='rgba(46,242,255,.12)';c.beginPath();c.ellipse(48,14,10,4,-0.2,0,TAU);c.fill();
  noise(c,300,0.1,103);
});
TEX.gridfloor=makeTex(c=>{
  c.fillStyle='#0f1420';c.fillRect(0,0,TW,TW);
  c.fillStyle='#18203a';c.fillRect(2,2,28,28);c.fillRect(34,2,28,28);c.fillRect(2,34,28,28);c.fillRect(34,34,28,28);
  c.fillStyle='#1f6f86';c.fillRect(0,0,TW,1);c.fillRect(0,0,1,TW);
  c.fillStyle=NEON.cyan;c.fillRect(0,0,2,2);
  noise(c,200,0.06,107);
});
TEX.grate=makeTex(c=>{
  c.fillStyle='#16151a';c.fillRect(0,0,TW,TW);
  c.fillStyle='#3a3540';for(let y=0;y<TW;y+=8)c.fillRect(0,y,TW,5);
  c.fillStyle='#2a262f';for(let x=0;x<TW;x+=16)c.fillRect(x,0,3,TW);
  c.fillStyle='#07060a';for(let y=5;y<TW;y+=8)c.fillRect(0,y,TW,3);
  c.fillStyle='rgba(255,59,78,.35)';for(let y=5;y<TW;y+=16)c.fillRect(0,y+1,TW,1);
  noise(c,240,0.1,109);
});
TEX.marble=makeTex(c=>{
  c.fillStyle='#121222';c.fillRect(0,0,TW,TW);
  c.strokeStyle='rgba(120,110,190,.25)';c.lineWidth=1;
  const r=mulberry32(113);
  for(let i=0;i<6;i++){c.beginPath();let x=r()*TW,y=0;c.moveTo(x,y);while(y<TW){x+=(r()-.5)*10;y+=6;c.lineTo(x,y);}c.stroke();}
  c.fillStyle='#1d1c33';c.fillRect(0,0,TW,1);c.fillRect(0,0,1,TW);
  noise(c,180,0.06,117);
});
TEX.tiles=makeTex(c=>{
  c.fillStyle='#1a1820';c.fillRect(0,0,TW,TW);
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){c.fillStyle=(x+y)&1?'#24212c':'#1e1c26';c.fillRect(x*16+1,y*16+1,14,14);}
  noise(c,260,0.09,119);
});
TEX.runoff=makeTex(c=>{
  c.fillStyle='#061a24';c.fillRect(0,0,TW,TW);
  const r=mulberry32(127);
  for(let i=0;i<120;i++){c.fillStyle='rgba(20,'+(80+r()*60|0)+','+(110+r()*60|0)+',.5)';c.beginPath();c.ellipse(r()*TW,r()*TW,2+r()*8,1+r()*4,r()*3,0,TAU);c.fill();}
  c.strokeStyle=NEON.cyan;c.lineWidth=1;
  for(let i=0;i<5;i++){let x=r()*TW,y=r()*TW;c.beginPath();c.moveTo(x,y);for(let k=0;k<4;k++){x+=(r()-.5)*14;y+=(r()-.5)*14;c.lineTo(x,y);}c.stroke();}
  noise(c,200,0.1,131,'120,255,255');
});
TEX.ceilPanel=makeTex(c=>{
  c.fillStyle='#14151b';c.fillRect(0,0,TW,TW);
  c.fillStyle='#1b1c24';c.fillRect(2,2,60,60);
  c.fillStyle='#0b0b0f';c.fillRect(0,31,TW,2);
  c.fillStyle='#e8f6ff';c.fillRect(14,14,36,3);
  c.fillStyle='rgba(46,242,255,.35)';c.fillRect(12,12,40,7);
  noise(c,200,0.07,137);
});
TEX.ceilRed=makeTex(c=>{
  c.fillStyle='#160c10';c.fillRect(0,0,TW,TW);
  c.fillStyle='#1f1217';for(let x=0;x<TW;x+=16)c.fillRect(x+2,0,12,TW);
  c.fillStyle=NEON.red;c.fillRect(30,0,3,TW);
  noise(c,200,0.08,139);
});
TEX.ceilDark=makeTex(c=>{
  c.fillStyle='#0f0f19';c.fillRect(0,0,TW,TW);
  c.strokeStyle='#1c1c2e';c.lineWidth=2;c.strokeRect(1,1,TW-2,TW-2);
  c.fillStyle=NEON.violet;c.fillRect(30,30,4,4);
  noise(c,160,0.06,149);
});

/* Each theme names its wall, floor and ceiling, plus the decorations that
   get scattered onto exposed walls at load. */
const THEMES={
  market:{wall:'concrete',floor:'asphalt',ceil:null,deco:['signA','signB','signC','brick','window','signA','signB']},
  vault: {wall:'circuit', floor:'gridfloor',ceil:'ceilPanel',deco:['terminal','terminal','pipes','vent','signB']},
  roof:  {wall:'roof',    floor:'asphalt',ceil:null,deco:['signC','signA','vent','pipes','window']},
  core:  {wall:'steel',   floor:'grate',ceil:'ceilRed',deco:['hazard','pipes','terminal','vent']},
  spire: {wall:'glass',   floor:'marble',ceil:'ceilDark',deco:['window','terminal','signC','window']},
  arena: {wall:'circuit', floor:'gridfloor',ceil:null,deco:['signA','signB','terminal','window']}
};

/* The sky: a night skyline wrapped round the player, painted once. Columns
   index it by view angle, so it turns with you and never gets closer. */
const SKYW=1024, SKYH=96;
const SKY=(function(){
  const c=document.createElement('canvas');c.width=SKYW;c.height=SKYH;
  const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,SKYH);
  g.addColorStop(0,'#05040e');g.addColorStop(.55,'#1a0b2e');g.addColorStop(.85,'#4a1450');g.addColorStop(1,'#7a1f5c');
  x.fillStyle=g;x.fillRect(0,0,SKYW,SKYH);
  const r=mulberry32(211);
  for(let i=0;i<70;i++){x.fillStyle='rgba(255,255,255,'+(0.2+r()*0.5).toFixed(2)+')';x.fillRect(r()*SKYW,r()*40,1,1);}
  // two layers of towers, far then near
  for(const layer of [0,1]){
    let px=0;
    while(px<SKYW){
      const w=(layer?14:9)+r()*(layer?34:22), h=(layer?26:38)+r()*(layer?50:40);
      const top=SKYH-h;
      x.fillStyle=layer?'#0a0814':'#160f26';x.fillRect(px,top,w,h);
      if(r()<.2){x.fillStyle=layer?'#0a0814':'#160f26';x.fillRect(px+w/2-1,top-10,2,10);x.fillStyle=NEON.red;x.fillRect(px+w/2-1,top-11,2,2);}
      const dens=layer?0.16:0.08;
      for(let yy=top+3;yy<SKYH-2;yy+=3)for(let xx=px+2;xx<px+w-2;xx+=3)
        if(r()<dens){x.fillStyle=['#ffcf7a','#7ae6ff','#ff7ad0','#fff2d0'][(r()*4)|0];x.fillRect(xx,yy,1,1);}
      if(layer&&r()<.14){x.fillStyle=[NEON.pink,NEON.cyan,NEON.amber][(r()*3)|0];x.fillRect(px+2,top+6+r()*12,Math.max(4,w-4),2);}
      px+=w+(layer?r()*6:r()*3);
    }
  }
  const d=x.getImageData(0,0,SKYW,SKYH);
  const u=new Uint32Array(d.data.buffer.slice(0));
  for(let i=0;i<u.length;i++)u[i]|=0xff000000;
  return u;
})();
