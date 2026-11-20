/* ------------------------------------------------------ procedural sprites
   Sprites are drawn small (chunky pixels) into an offscreen canvas, then
   captured as ARGB. Alpha 0 is keyed out, 255 marks a glowing pixel.      */
const scv=document.createElement('canvas');
const scx=scv.getContext('2d',{willReadFrequently:true});
function makeSprite(w,h,draw){
  scv.width=w;scv.height=h;
  scx.setTransform(1,0,0,1,0,0);
  scx.clearRect(0,0,w,h);
  draw(scx,w,h);
  const d=scx.getImageData(0,0,w,h);
  return{w,h,data:markEmissive(new Uint32Array(d.data.buffer.slice(0)),false)};
}
function rr(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x|0,y|0,Math.max(1,w|0),Math.max(1,h|0));}
function shade(hex,f){
  const n=parseInt(hex.slice(1),16);
  const r=clamp(((n>>16)&255)*f,0,255)|0,g=clamp(((n>>8)&255)*f,0,255)|0,b=clamp((n&255)*f,0,255)|0;
  return'rgb('+r+','+g+','+b+')';
}

/* One parametric figure covers the guards and hackers: proportions, palette,
   visor, hood and trim are parameters. pose 0/1 walk, 2 attack, 3 pain.
   view 0 front, 1 side, 2 back. */
function figure(o,pose,view){
  const W=o.w,H=o.h;
  return makeSprite(W,H,(c)=>{
    const cx=W/2, cl=o.cloth, ar=o.armor, dk=shade(cl,0.55);
    const swing=pose===1?1:pose===0?-1:0;
    const lean=pose===2?-1:pose===3?2:0;
    const headY=Math.round(H*0.09)+(pose===3?1:0);
    const headH=Math.round(H*0.19), headW=Math.round(W*0.40);
    const torsoY=headY+headH-1, torsoH=Math.round(H*0.40), torsoW=Math.round(W*0.56);
    const legY=torsoY+torsoH-1, legH=H-legY-1;
    // legs and boots
    rr(c,cx-torsoW/2+1,legY,torsoW*0.34,legH-Math.max(0,swing),dk);
    rr(c,cx+torsoW/2-torsoW*0.34-1,legY,torsoW*0.34,legH-Math.max(0,-swing),dk);
    rr(c,cx-torsoW/2+1,H-3,torsoW*0.34,3,'#101016');
    rr(c,cx+torsoW/2-torsoW*0.34-1,H-3,torsoW*0.34,3,'#101016');
    if(o.trim){rr(c,cx-torsoW/2+2,legY+3,1,legH-6,o.trim);rr(c,cx+torsoW/2-3,legY+3,1,legH-6,o.trim);}
    // torso, or a long coat for the hood
    if(o.hood){
      rr(c,cx-torsoW/2-1+lean,torsoY,torsoW+2,torsoH+legH*0.55,cl);
      rr(c,cx-1+lean,torsoY+2,2,torsoH+legH*0.5,dk);
    }else{
      rr(c,cx-torsoW/2+lean,torsoY,torsoW,torsoH,cl);
      rr(c,cx-torsoW/2+lean,torsoY,torsoW,2,shade(cl,1.3));
      rr(c,cx-torsoW/2+lean,torsoY+torsoH-3,torsoW,3,dk);
    }
    if(ar){
      rr(c,cx-torsoW*0.34+lean,torsoY+2,torsoW*0.68,torsoH*0.5,ar);
      rr(c,cx-torsoW*0.34+lean,torsoY+2,torsoW*0.68,1,shade(ar,1.4));
      rr(c,cx-torsoW/2-2+lean,torsoY,5,4,shade(ar,1.1));rr(c,cx+torsoW/2-3+lean,torsoY,5,4,shade(ar,1.1));
    }
    if(o.trim&&view!==2){rr(c,cx-torsoW*0.3+lean,torsoY+torsoH*0.62,torsoW*0.6,1,o.trim);}
    // arms
    const armW=Math.max(2,Math.round(W*0.14)), sk=o.arm||shade(cl,0.8);
    if(pose===2){
      rr(c,cx-torsoW/2-armW+2,torsoY+2,armW,torsoH*0.42,sk);
      rr(c,cx+torsoW/2-2,torsoY+2,armW,torsoH*0.42,sk);
    }else{
      rr(c,cx-torsoW/2-armW+2,torsoY+2+swing,armW,torsoH*0.72,sk);
      rr(c,cx+torsoW/2-2,torsoY+2-swing,armW,torsoH*0.72,sk);
    }
    // head: helmet with a visor, or a hood with two eyes in the dark
    if(o.hood){
      rr(c,cx-headW/2-2+lean,headY-2,headW+4,headH+3,shade(cl,0.8));
      rr(c,cx-headW/2+lean,headY+1,headW,headH-1,'#050508');
      if(view===0){rr(c,cx-headW*0.28+lean,headY+headH*0.45,2,2,o.eye);rr(c,cx+headW*0.28-2+lean,headY+headH*0.45,2,2,o.eye);}
      else if(view===1)rr(c,cx+headW*0.2+lean,headY+headH*0.45,2,2,o.eye);
    }else{
      rr(c,cx-headW/2+lean,headY,headW,headH,o.helm);
      rr(c,cx-headW/2+lean,headY,headW,1,shade(o.helm,1.4));
      if(view===0)rr(c,cx-headW/2+1+lean,headY+headH*0.38,headW-2,3,o.eye);
      else if(view===1)rr(c,cx+lean,headY+headH*0.38,headW/2,3,o.eye);
      else rr(c,cx-headW/2+1+lean,headY+headH*0.5,headW-2,1,shade(o.helm,0.6));
    }
    // weapon
    if(o.weapon==='gun'){
      const gy=torsoY+(pose===2?4:6), gw=Math.round(W*0.32);
      rr(c,cx+torsoW/2-1,gy,gw,3,'#1c1d24');rr(c,cx+torsoW/2-1,gy,gw,1,'#4d5263');
      rr(c,cx+torsoW/2+gw-4,gy+1,2,1,o.trim||NEON.cyan);
      if(pose===2)rr(c,cx+torsoW/2+gw-2,gy-2,5,6,'#c8fbff');
    }else if(o.weapon==='orb'){
      const gy=torsoY+(pose===2?0:torsoH*0.5);
      if(pose===2){c.fillStyle='rgba(255,63,180,.5)';c.beginPath();c.arc(cx+lean,gy-2,6,0,TAU);c.fill();rr(c,cx-2+lean,gy-4,4,4,'#ffd0f0');}
      else rr(c,cx+torsoW/2,gy,3,3,o.eye);
    }
  });
}
// Machines don't bleed: they fold up into a heap of scrap that still sparks.
function scrapSprite(o,step){
  const W=o.w,H=o.h;
  return makeSprite(W,H,(c)=>{
    const t=step/3, r=mulberry32(o.w*31+step);
    const hh=Math.max(4,Math.round(H*(1-t*0.82))), y0=H-hh, ww=Math.round(W*(0.5+t*0.45));
    rr(c,W/2-ww/2,y0,ww,hh,o.cloth);
    rr(c,W/2-ww/2,y0,ww,2,shade(o.cloth,1.3));
    if(o.armor)rr(c,W/2-ww/3,y0+2,ww/1.5,Math.max(2,hh*0.3),o.armor);
    for(let i=0;i<5+step*2;i++)rr(c,W/2-ww/2-3+r()*(ww+6),H-2-r()*Math.min(hh,8),1+r()*3,1+r()*2,i%3?'#2a2b33':shade(o.cloth,0.7));
    if(step<3)rr(c,W/2-2+r()*4,y0-1,2,2,o.eye);
    rr(c,W/2-ww/2-2,H-2,ww+4,2,'#0d0d12');
  });
}

function droneSprite(o,pose){
  return makeSprite(o.w,o.h,(c,W,H)=>{
    const cx=W/2, cy=H/2+(pose===1?1:0)+(pose===3?2:0);
    rr(c,2,cy-1,W-4,2,'#3a3d4a');                     // rotor arms
    rr(c,1,cy-3,6,1,'#7a8094');rr(c,W-7,cy-3,6,1,'#7a8094');
    c.fillStyle='#1d1f29';c.beginPath();c.ellipse(cx,cy,W*0.28,H*0.32,0,0,TAU);c.fill();
    c.fillStyle='#343849';c.beginPath();c.ellipse(cx,cy-2,W*0.22,H*0.18,0,0,TAU);c.fill();
    c.fillStyle=pose===2?'#e6feff':o.eye;c.beginPath();c.arc(cx,cy+1,pose===2?4:3,0,TAU);c.fill();
    if(pose===2){c.fillStyle='rgba(46,242,255,.45)';c.beginPath();c.arc(cx,cy+1,7,0,TAU);c.fill();}
    rr(c,cx-1,cy+H*0.3,2,3,'#2a2c37');rr(c,cx-1,cy+H*0.3+3,2,1,NEON.red);
  });
}
function mechSprite(o,pose,view){
  return makeSprite(o.w,o.h,(c,W,H)=>{
    const cx=W/2, sw=pose===1?2:pose===0?-2:0, recoil=pose===2?2:0, hurt=pose===3?2:0;
    const bodyY=Math.round(H*0.22)+hurt, bodyH=Math.round(H*0.36), bodyW=Math.round(W*0.62);
    // legs: thighs and big feet
    for(const s of [-1,1]){
      const lx=cx+s*bodyW*0.28-5, off=s*sw;
      rr(c,lx,bodyY+bodyH-2,10,H*0.22-off,'#2b2d38');
      rr(c,lx-2,bodyY+bodyH+H*0.2-off,14,H-(bodyY+bodyH+H*0.2-off)-2,'#383b49');
      rr(c,lx-4,H-5,18,5,'#1c1d25');
      rr(c,lx+1,bodyY+bodyH+4,8,1,o.trim);
    }
    // hull
    rr(c,cx-bodyW/2,bodyY,bodyW,bodyH,o.cloth);
    rr(c,cx-bodyW/2,bodyY,bodyW,3,shade(o.cloth,1.35));
    rr(c,cx-bodyW/2,bodyY+bodyH-4,bodyW,4,shade(o.cloth,0.55));
    rr(c,cx-bodyW/2+3,bodyY+bodyH*0.55,bodyW-6,2,'#111218');
    if(view!==2){                                    // cockpit
      rr(c,cx-8,bodyY+5,16,8,'#07080c');
      rr(c,cx-6,bodyY+7,12,3,o.eye);
    }else{rr(c,cx-10,bodyY+4,20,10,shade(o.cloth,0.7));rr(c,cx-6,bodyY+6,12,1,o.trim);}
    // shoulder cannons
    for(const s of [-1,1]){
      const ax=s<0?cx-bodyW/2-11:cx+bodyW/2-1;
      rr(c,ax,bodyY+4+recoil,12,12,'#30323f');rr(c,ax,bodyY+4+recoil,12,2,'#555a6e');
      rr(c,ax+3,bodyY+14+recoil,6,10,'#1a1b23');
      rr(c,ax+4,bodyY+23+recoil,4,2,pose===2?'#fff0c8':o.trim);
    }
  });
}
// The Warden: the rogue AI's body, a floating core in a cage of cables.
function wardenSprite(o,pose,phase){
  return makeSprite(o.w,o.h,(c,W,H)=>{
    const cx=W/2, cy=H*0.46+(pose===1?1:0)+(pose===3?3:0);
    const glow=phase?NEON.red:NEON.violet;
    c.strokeStyle='#2d2b3d';c.lineWidth=3;
    for(let i=0;i<6;i++){const a=i*TAU/6+(pose===1?0.08:0);
      c.beginPath();c.moveTo(cx+Math.cos(a)*14,cy+Math.sin(a)*14);
      c.quadraticCurveTo(cx+Math.cos(a+0.4)*30,cy+Math.sin(a+0.4)*30,cx+Math.cos(a)*W*0.46,cy+Math.sin(a)*H*0.44);c.stroke();}
    c.fillStyle='#181624';c.beginPath();
    for(let i=0;i<8;i++){const a=i*TAU/8+TAU/16;c.lineTo(cx+Math.cos(a)*W*0.30,cy+Math.sin(a)*W*0.30);}
    c.closePath();c.fill();
    c.strokeStyle=glow;c.lineWidth=2;c.stroke();
    c.fillStyle='#0a0910';c.beginPath();c.arc(cx,cy,W*0.18,0,TAU);c.fill();
    const er=pose===2?W*0.14:W*0.10;
    c.fillStyle=glow;c.beginPath();c.arc(cx,cy,er,0,TAU);c.fill();
    c.fillStyle='#ffffff';c.beginPath();c.arc(cx,cy,er*0.4,0,TAU);c.fill();
    rr(c,cx-W*0.30,cy+W*0.34,W*0.6,3,'#22202f');
    rr(c,cx-W*0.24,cy+W*0.34+1,W*0.48,1,glow);
  });
}

/* Enemy types. The level codes are z g p m d. */
const ETYPE={
  drone: {key:'z',w:26,h:22,cloth:'#2a2d3b',eye:'#2ef2ff',fly:0.30,
          hp:24, spd:1.95,dmg:4,  rng:10,kind:'bolt',  pain:0.70,score:100, sight:0.62},
  guard: {key:'g',w:30,h:46,cloth:'#2c3140',armor:'#4a5068',helm:'#3a4052',eye:'#ff3b4e',trim:'#ff3b4e',weapon:'gun',
          hp:45, spd:1.30,dmg:6,  rng:12,kind:'hitscan',pain:0.50,score:150, sight:0.72},
  hacker:{key:'p',w:32,h:48,cloth:'#2a1730',eye:'#ff3fb4',trim:'#ff3fb4',hood:true,weapon:'orb',arm:'#20121f',
          hp:70, spd:1.15,dmg:13, rng:13,kind:'lob',    pain:0.38,score:250, sight:0.66, blink:true},
  mech:  {key:'m',w:54,h:64,cloth:'#3b3f4f',eye:'#ffb12e',trim:'#ffb12e',armor:'#4d5266',
          hp:420,spd:1.00,dmg:16, rng:15,kind:'rocket', pain:0.10,score:800, sight:0.80, heavy:true},
  warden:{key:'d',w:72,h:80,cloth:'#181624',eye:'#b46bff',fly:0.22,
          hp:1500,spd:0.95,dmg:18,rng:22,kind:'boss',   pain:0.05,score:5000,sight:1.0, boss:true, heavy:true}
};
for(const k in ETYPE){
  const o=ETYPE[k];
  if(k==='drone'){
    const f=[0,1].map(p=>droneSprite(o,p));
    o.walk=[f,f,f];o.atk=[0,1,2].map(()=>droneSprite(o,2));o.hurt=[0,1,2].map(()=>droneSprite(o,3));
  }else if(k==='mech'){
    o.walk=[0,1,2].map(v=>[0,1].map(p=>mechSprite(o,p,v)));o.atk=[0,1,2].map(v=>mechSprite(o,2,v));o.hurt=[0,1,2].map(v=>mechSprite(o,3,v));
  }else if(k==='warden'){
    o.walk=[0,1,2].map(()=>[0,1].map(p=>wardenSprite(o,p,0)));o.atk=[0,1,2].map(()=>wardenSprite(o,2,0));o.hurt=[0,1,2].map(()=>wardenSprite(o,3,0));
    o.walk2=[0,1,2].map(()=>[0,1].map(p=>wardenSprite(o,p,1)));o.atk2=[0,1,2].map(()=>wardenSprite(o,2,1));
  }else{
    o.walk=[0,1,2].map(v=>[0,1].map(p=>figure(o,p,v)));o.atk=[0,1,2].map(v=>figure(o,2,v));o.hurt=[0,1,2].map(v=>figure(o,3,v));
  }
  o.dead=[0,1,2,3].map(s=>scrapSprite(o,s));
}
const ENEMY_BY_KEY={};for(const k in ETYPE)ENEMY_BY_KEY[ETYPE[k].key]=k;

/* ------------------------------------------------------------- item art */
function itemSprite(draw,w,h){return makeSprite(w||24,h||24,draw);}
function gunItem(body,glow){return (c)=>{rr(c,2,10,20,5,body);rr(c,2,10,20,1,shade(body,1.6));rr(c,5,15,7,5,shade(body,0.7));rr(c,16,9,6,7,shade(body,0.8));rr(c,4,12,14,1,glow);};}
const ITEM={
  h:{name:'stim',          spr:itemSprite(c=>{rr(c,9,4,6,16,'#c9d4dd');rr(c,10,6,4,11,NEON.cyan);rr(c,9,4,6,2,'#eef4f8');rr(c,11,20,2,3,'#8a939b');})},
  H:{name:'medkit',        spr:itemSprite(c=>{rr(c,3,7,18,13,'#d8dbe6');rr(c,3,7,18,2,'#f6f7fb');rr(c,3,18,18,2,'#8a8fa0');rr(c,10,9,4,9,NEON.pink);rr(c,6,12,12,3,NEON.pink);})},
  v:{name:'armour shard',  spr:itemSprite(c=>{c.fillStyle=NEON.cyan;c.beginPath();c.moveTo(12,4);c.lineTo(17,12);c.lineTo(12,20);c.lineTo(7,12);c.fill();rr(c,11,7,2,6,'#e8feff');})},
  V:{name:'combat vest',   spr:itemSprite(c=>{rr(c,5,5,14,12,'#3a2a5a');rr(c,7,17,10,4,'#3a2a5a');rr(c,5,5,14,2,NEON.violet);rr(c,10,8,4,8,'#1d1430');rr(c,6,11,12,1,NEON.violet);})},
  c:{name:'rounds',        spr:itemSprite(c=>{rr(c,7,10,10,7,'#3a3e4c');rr(c,7,10,10,2,'#6a7088');rr(c,9,8,2,3,NEON.amber);rr(c,13,8,2,3,NEON.amber);})},
  C:{name:'box of rounds', spr:itemSprite(c=>{rr(c,4,8,16,10,'#2f3340');rr(c,4,8,16,2,'#5c6278');rr(c,6,13,12,1,NEON.amber);rr(c,6,6,3,3,'#d9c27a');rr(c,11,6,3,3,'#d9c27a');rr(c,16,6,3,3,'#d9c27a');})},
  s:{name:'shells',        spr:itemSprite(c=>{for(let i=0;i<4;i++){rr(c,6+i*3,10,2,8,NEON.red);rr(c,6+i*3,16,2,3,'#c9a227');}})},
  S:{name:'box of shells', spr:itemSprite(c=>{rr(c,4,9,16,10,'#3a1a24');rr(c,4,9,16,2,'#7a3a4a');rr(c,6,14,12,1,NEON.red);for(let i=0;i<5;i++)rr(c,6+i*3,6,2,4,'#c9a227');})},
  e:{name:'energy cell',   spr:itemSprite(c=>{rr(c,7,6,10,14,'#14202e');rr(c,8,7,8,12,NEON.cyan);rr(c,8,7,8,3,'#e8feff');rr(c,7,6,10,1,'#5ae4e4');})},
  w:{name:'SCATTERGUN',    spr:itemSprite(gunItem('#2d2f3b',NEON.red),26,24)},
  W:{name:'PULSE RIFLE',   spr:itemSprite(gunItem('#252836',NEON.pink),26,24)},
  Q:{name:'PLASMA ARC',    spr:itemSprite(c=>{rr(c,2,9,20,7,'#1c2433');rr(c,2,9,20,1,'#52688a');rr(c,17,7,6,11,NEON.cyan);rr(c,18,8,4,9,'#e8feff');rr(c,5,16,8,4,'#2a3446');},26,24)},
  L:{name:'RAIL CANNON',   spr:itemSprite(c=>{rr(c,1,10,24,4,'#22242f');rr(c,1,10,24,1,'#5a5f78');for(let i=0;i<5;i++)rr(c,4+i*4,9,2,6,NEON.violet);rr(c,6,14,8,5,'#2f3242');},26,24)},
  B:{name:'BLUE KEYCARD',  spr:itemSprite(c=>{rr(c,8,5,8,14,'#173a8a');rr(c,8,5,8,2,'#7ab4ff');rr(c,10,9,4,6,'#3c8bff');})},
  Y:{name:'YELLOW KEYCARD',spr:itemSprite(c=>{rr(c,8,5,8,14,'#7a5a10');rr(c,8,5,8,2,'#ffe89a');rr(c,10,9,4,6,NEON.amber);})},
  R:{name:'RED KEYCARD',   spr:itemSprite(c=>{rr(c,8,5,8,14,'#7a1020');rr(c,8,5,8,2,'#ff8a9a');rr(c,10,9,4,6,NEON.red);})}
};
function orbSprites(core,halo,size){
  return [0,1,2].map(i=>makeSprite(16,16,c=>{
    const r=size+i*0.8;
    c.fillStyle=halo;c.beginPath();c.arc(8,8,r+2.5,0,TAU);c.fill();
    c.fillStyle=core;c.beginPath();c.arc(8,8,r,0,TAU);c.fill();
    c.fillStyle='#ffffff';c.beginPath();c.arc(7.5,7.5,r*0.4,0,TAU);c.fill();
  }));
}
const SHOT={
  bolt:  orbSprites(NEON.cyan,'rgba(46,242,255,.3)',2.6),
  orb:   orbSprites(NEON.pink,'rgba(255,63,180,.32)',4.2),
  rocket:orbSprites(NEON.amber,'rgba(255,177,46,.32)',3.6),
  boss:  orbSprites(NEON.violet,'rgba(180,107,255,.34)',4.8),
  bossR: orbSprites(NEON.red,'rgba(255,59,78,.34)',4.8)
};
const PUFF=[0,1,2].map(i=>makeSprite(16,16,c=>{
  c.fillStyle='rgba(190,240,255,'+(0.55-i*0.16).toFixed(2)+')';
  c.beginPath();c.arc(8,8,2+i*3,0,TAU);c.fill();
}));
// The glitch column an enemy arrives in during Overdrive.
const WARP=[0,1,2,3].map(i=>makeSprite(24,48,c=>{
  const r=mulberry32(300+i);
  for(let k=0;k<14;k++){c.fillStyle=[NEON.cyan,NEON.pink,'#ffffff'][(r()*3)|0];c.fillRect(4+r()*16,r()*48,1+r()*4,2+r()*10);}
}));

/* ---------------------------------------------------------- weapon views
   Bottom-anchored on a 200x120 plate. Each part is drawn twice: expanded by
   a pixel in near-black for the outline, then in colour. Colours come from
   the chosen finish, so one drawing serves every paint job.               */
const WVW=200, WVH=120;
const INK='#07070a';
const FINISHES=[
  {id:'stock', name:'STOCK',  need:0, body:'#3b4054',light:'#8a93b8',dark:'#1c1f2c',grip:'#262838',accent:NEON.cyan, accent2:NEON.pink},
  {id:'chrome',name:'CHROME', need:4, body:'#7c8294',light:'#d8deea',dark:'#3a3e4a',grip:'#2a2c34',accent:NEON.cyan, accent2:'#ffffff'},
  {id:'toxic', name:'TOXIC',  need:8, body:'#1e3020',light:'#4a7a44',dark:'#0e1a10',grip:'#141c14',accent:NEON.lime, accent2:NEON.amber},
  {id:'gold',  name:'GOLD',   need:12,body:'#8a6a22',light:'#f2d27a',dark:'#4a3610',grip:'#2a2010',accent:NEON.amber,accent2:'#fff2c8'},
  {id:'glitch',name:'GLITCH', need:20,body:'#111116',light:'#2c2c38',dark:'#050507',grip:'#0c0c10',accent:NEON.pink, accent2:NEON.cyan}
];
function parts(c,list,P){
  const col=k=>k&&k[0]==='#'?k:P[k]||k;
  c.fillStyle=INK;
  for(const p of list)c.fillRect(p[0]-1,p[1]-1,p[2]+2,p[3]+2);
  for(const p of list){
    c.fillStyle=col(p[4]);c.fillRect(p[0],p[1],p[2],p[3]);
    if(p[5]){c.fillStyle=col(p[5]);c.fillRect(p[0],p[1],p[2],Math.min(2,p[3]));}
    if(p[6]){c.fillStyle=col(p[6]);c.fillRect(p[0],p[1]+p[3]-2,p[2],2);}
  }
}
// Gloved hands with a line of light across the knuckles.
function hand(c,x,y,w,h,P,lit){
  const glove='#1b1c24';
  c.fillStyle=INK;c.fillRect(x-1,y-1,w+2,h+2);
  c.fillStyle=glove;c.fillRect(x,y,w,h);
  c.fillStyle='#30323f';c.fillRect(x,y,w,2);c.fillRect(x,y,2,h-6);
  c.fillStyle='#0d0e13';c.fillRect(x,y+h-4,w,4);
  const fw=Math.max(3,Math.floor(w/4));
  c.fillStyle=INK;for(let i=1;i<4;i++)c.fillRect(x+i*fw-1,y-1,2,5);
  c.fillStyle=lit?P.accent:'#2a2c38';c.fillRect(x+2,y+5,w-4,1);
  c.fillStyle='#262833';c.fillRect(x,y+h-9,w,2);
}
function flash(c,cx,cy,n,big,col){
  const w=big?7:5;
  for(let i=n-1;i>=0;i--){
    c.fillStyle=i>n-3?col:'#ffffff';
    c.fillRect(cx-3-i*2,cy-i*3,w,w);c.fillRect(cx+i*2-2,cy-i*3,w,w);
  }
  c.fillStyle='#ffffff';c.fillRect(cx-7,cy-4,14,9);
}
function buildWeaponViews(P){
  const V={}, wv=d=>makeSprite(WVW,WVH,d);
  V.pistol=[0,1].map(f=>wv(c=>{
    // seen from behind: the back of the slide, the sights, and the grip in both hands
    const X=100,y=f?9:0;
    parts(c,[[X-15,60+y,31,24,'body','light','dark'],[X-15,52+y,8,9,'body','light'],[X+8,52+y,8,9,'body','light'],
      [X-2,48+y,5,9,'dark','light'],[X-12,84+y,25,9,'grip','light'],[X-10,92+y,21,28,'grip','light']],P);
    c.fillStyle='#14151d';for(let i=0;i<5;i++)c.fillRect(X-12+i*6,66+y,2,14);     // slide serrations
    c.fillStyle=P.accent;c.fillRect(X-13,55+y,2,2);c.fillRect(X+12,55+y,2,2);       // tritium dots
    c.fillStyle=P.accent2;c.fillRect(X,50+y,1,2);
    c.fillStyle=P.accent;c.fillRect(X-13,82+y,27,1);
    hand(c,X-32,88+y,23,32,P,f);hand(c,X+10,90+y,22,30,P,f);
    if(f)flash(c,X,40+y,6,false,P.accent);
  }));
  V.shotgun=[0,1,2].map(f=>wv(c=>{
    const X=100,y=f===1?13:f===2?21:0,pumpY=f===2?88:79;
    parts(c,[[X-11,10+y,23,7,'dark','light'],[X-8,16+y,17,50,'body','light'],[X-13,64+y,27,19,'body','light','dark'],
      [X+8,68+y,6,7,'#08080b'],[X-17,pumpY+y,35,13,'grip','light','dark'],[X-4,82+y,9,6,'dark'],[X-10,92+y,21,28,'grip','light']],P);
    c.fillStyle=P.accent2;c.fillRect(X-6,30+y,1,30);c.fillRect(X+6,30+y,1,30);
    c.fillStyle=P.accent;c.fillRect(X-15,pumpY+6+y,31,1);
    hand(c,X-36,pumpY-2+y,21,27,P,f===1);hand(c,X+11,90+y,20,28,P,f===1);
    if(f===1)flash(c,X,8+y,8,true,NEON.amber);
    if(f===2){c.fillStyle=INK;c.fillRect(X+19,65+y,9,6);c.fillStyle=NEON.red;c.fillRect(X+20,66+y,7,4);}
  }));
  V.rifle=[0,1].map(f=>wv(c=>{
    const X=100,y=f?6:0;
    parts(c,[[X-5,8+y,11,18,'dark','light'],[X-9,24+y,19,44,'body','light'],[X-20,66+y,41,20,'body','light','dark'],
      [X-24,86+y,15,14,'grip','light'],[X-8,84+y,18,36,'grip','light'],[X+14,70+y,9,12,'dark']],P);
    for(let i=0;i<5;i++){c.fillStyle=f&&i%2?'#ffffff':P.accent2;c.fillRect(X-8,30+y+i*7,17,2);}
    hand(c,X-40,84+y,21,32,P,f);hand(c,X+9,90+y,21,30,P,f);
    if(f)flash(c,X,6+y,7,true,P.accent2);
  }));
  V.arc=[0,1].map(f=>wv(c=>{
    const X=100,y=f?7:0;
    parts(c,[[X-11,15+y,23,10,f?'#ffffff':'accent','#ffffff'],[X-16,24+y,33,10,'dark','light'],[X-21,33+y,43,33,'body','light','dark'],
      [X-27,50+y,8,12,f?'#ffffff':'accent'],[X+20,50+y,8,12,f?'#ffffff':'accent'],[X-16,66+y,33,19,'body','light','dark'],[X-9,85+y,19,35,'grip','light']],P);
    hand(c,X-32,82+y,21,36,P,true);hand(c,X+11,88+y,21,32,P,true);
    if(f){c.fillStyle='rgba(150,240,255,.42)';c.beginPath();c.arc(X,20+y,24,0,TAU);c.fill();
      c.fillStyle='rgba(230,255,255,.85)';c.beginPath();c.arc(X,18+y,11,0,TAU);c.fill();}
  }));
  V.rail=[0,1,2].map(f=>wv(c=>{
    const X=100,y=f===1?16:f===2?8:0;
    parts(c,[[X-4,0+y,9,30,'dark','light'],[X-12,28+y,25,40,'body','light','dark'],[X-18,66+y,37,22,'body','light','dark'],
      [X-9,88+y,19,32,'grip','light'],[X+16,72+y,10,10,'dark']],P);
    for(let i=0;i<6;i++){c.fillStyle=f===1?'#ffffff':i<(f===2?6:3)?NEON.violet:'#3a2a5a';c.fillRect(X-10,32+y+i*6,21,2);}
    c.fillStyle=P.accent;c.fillRect(X-1,2+y,3,26);
    hand(c,X-34,84+y,21,34,P,f===1);hand(c,X+11,90+y,21,30,P,f===1);
    if(f===1){c.fillStyle='rgba(200,160,255,.5)';c.beginPath();c.arc(X,4+y,18,0,TAU);c.fill();c.fillStyle='#ffffff';c.fillRect(X-6,0,13,10);}
  }));
  return V;
}
let WVIEW=buildWeaponViews(FINISHES[0]);

/* --------------------------------------------------------- status faces
   A runner with a cheek implant. The implant light dims as health drops. */
function faceSprite(tier,mood){
  return makeSprite(26,30,(c)=>{
    const hurt=1-tier/4;
    const sk=`rgb(${(196-hurt*40)|0},${(150-hurt*60)|0},${(128-hurt*60)|0})`;
    rr(c,4,3,18,25,sk);
    rr(c,4,3,18,2,shade('#c49680',1.15));rr(c,4,26,18,2,shade('#c49680',0.6));
    rr(c,3,1,20,5,'#15131c');rr(c,3,1,6,12,'#15131c');           // undercut
    rr(c,14,1,9,2,NEON.pink);
    const ey=mood==='dead'?12:11;
    if(mood==='dead'){rr(c,7,ey,4,2,'#3a1010');rr(c,15,ey,4,2,'#3a1010');rr(c,8,21,10,2,'#4a1414');}
    else{
      rr(c,7,ey,4,3,'#ffffff');rr(c,15,ey,4,3,NEON.cyan);
      const px=mood==='left'?0:mood==='right'?2:1;
      rr(c,8+px,ey+1,2,2,'#141018');rr(c,16+px,ey+1,2,2,'#0a3a44');
      rr(c,6,ey-2,6,1,'#241a20');rr(c,14,ey-2,6,1,'#241a20');
      if(mood==='ouch'){rr(c,8,20,10,4,'#2a0c0c');rr(c,9,21,8,2,'#6a2020');}
      else if(tier>=3)rr(c,8,21,10,2,'#3a1c14');
      else{rr(c,8,20,10,3,'#2a1410');rr(c,9,21,8,1,'#7a3030');}
    }
    rr(c,18,16,3,6,'#2a2c38');rr(c,19,17,1,tier>=1?4:1,tier>=2?NEON.cyan:NEON.red);  // implant
    const r=mulberry32(9+tier*7);
    for(let i=0;i<Math.round(hurt*14);i++)rr(c,5+r()*16,5+r()*20,1+r()*2,1,'#8e2230');
  });
}
const FACES={};
for(let t=0;t<5;t++)FACES[t]={n:faceSprite(t,'mid'),l:faceSprite(t,'left'),r:faceSprite(t,'right'),o:faceSprite(t,'ouch')};
FACES.dead=faceSprite(0,'dead');

// Blit a sprite onto a 2D context (HUD and weapon art).
const hudCanvasCache=new Map();
function spriteToCanvas(s){
  if(hudCanvasCache.has(s))return hudCanvasCache.get(s);
  const cv=document.createElement('canvas');cv.width=s.w;cv.height=s.h;
  const cc=cv.getContext('2d');
  const id=cc.createImageData(s.w,s.h);
  const u=new Uint32Array(id.data.buffer);
  for(let i=0;i<s.data.length;i++){const v=s.data[i];u[i]=v>>>24?(v|0xff000000):0;}
  cc.putImageData(id,0,0);
  hudCanvasCache.set(s,cv);
  return cv;
}
