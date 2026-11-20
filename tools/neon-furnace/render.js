/* ================================ RENDER ================================ */
const FOV=Math.PI/3;
const HALF=Math.tan(FOV/2);
const colAng=new Float32Array(RW), skyCol=new Int32Array(RW);
for(let x=0;x<RW;x++)colAng[x]=Math.atan((2*x/RW-1)*HALF);

function renderWorld(time){
  const L=G.L, th=THEMES[L.theme]||THEMES.market;
  const ca=Math.cos(G.pa), sa=Math.sin(G.pa);
  const planeX=-sa*HALF, planeY=ca*HALF;
  const horizon=(VIEW_H/2+G.vbob)|0;
  const lightK=G.light*13;
  const ctex=th.ceil&&!L.sky?TEX[th.ceil]:null;
  const ftexDefault=TEX[th.floor];
  const runShift=((time*7)|0)&63;
  for(let x=0;x<RW;x++)skyCol[x]=(((G.pa+colAng[x])/TAU*SKYW*2)|0)&(SKYW-1);

  /* ---- floor and ceiling, cast per pixel row; open sky where there is none ---- */
  for(let y=0;y<VIEW_H;y++){
    const isFloor=y>horizon, o=y*RW;
    if(!isFloor&&!ctex){
      let sy=SKYH-(horizon-y);if(sy<0)sy=0;if(sy>=SKYH)sy=SKYH-1;
      const so=sy*SKYW;
      for(let x=0;x<RW;x++)buf[o+x]=SKY[so+skyCol[x]];
      continue;
    }
    const p=isFloor?(y-horizon):(horizon-y);
    if(p<=0){for(let x=0;x<RW;x++)buf[o+x]=0xff0a0810;continue;}
    const rowDist=(VIEW_H/2)/p;
    const stepX=rowDist*2*planeX/RW, stepY=rowDist*2*planeY/RW;
    let wx=G.px+rowDist*(ca-planeX), wy=G.py+rowDist*(sa-planeY);
    let l=(SHADES-1)-((rowDist*1.9)|0)+((lightK*Math.max(0,1-rowDist/6))|0);
    if(l<3)l=3;if(l>31)l=31;
    const ls=l*256;
    for(let x=0;x<RW;x++){
      const cx=wx|0, cy=wy|0;
      let tex=ctex, tx=((wx-cx)*TW)&63;
      if(isFloor){
        const c=(cx>=0&&cy>=0&&cx<G.W&&cy<G.H)?G.grid[cy*G.W+cx]:null;
        tex=(c&&TEX[c.floor])?TEX[c.floor]:ftexDefault;
        if(tex===TEX.runoff)tx=(tx+runShift)&63;
      }
      const ty=((wy-cy)*TW)&63;
      buf[o+x]=shadePx(tex[ty*TW+tx],ls);
      wx+=stepX;wy+=stepY;
    }
  }

  /* ---- walls ---- */
  for(let x=0;x<RW;x++){
    const camX=2*x/RW-1;
    const rdx=ca+planeX*camX, rdy=sa+planeY*camX;
    let mx=G.px|0, my=G.py|0;
    const ddx=Math.abs(1/(rdx||1e-9)), ddy=Math.abs(1/(rdy||1e-9));
    let sx,sy,sdx,sdy;
    if(rdx<0){sx=-1;sdx=(G.px-mx)*ddx;}else{sx=1;sdx=(mx+1-G.px)*ddx;}
    if(rdy<0){sy=-1;sdy=(G.py-my)*ddy;}else{sy=1;sdy=(my+1-G.py)*ddy;}
    let hit=null,side=0,perp=0,texX=0;
    for(let step=0;step<160;step++){
      if(sdx<sdy){sdx+=ddx;mx+=sx;side=0;}else{sdy+=ddy;my+=sy;side=1;}
      if(mx<0||my<0||mx>=G.W||my>=G.H)break;
      const c=G.grid[my*G.W+mx];
      if(!c)break;
      if(c.door){
        // the door plane sits mid-cell, so a ray can pass the gap while it slides
        const entry=side===0?sdx-ddx:sdy-ddy;
        const pd=entry+(side===0?ddx:ddy)*0.5;
        const lat=side===0?(G.py+pd*rdy):(G.px+pd*rdx);
        const latCell=side===0?my:mx;
        if(Math.floor(lat)===latCell){
          const f=lat-Math.floor(lat);
          if(f>c.door.open){hit=c;perp=pd;texX=f-c.door.open;break;}
        }
        continue;
      }
      if(c.solid){
        perp=side===0?sdx-ddx:sdy-ddy;
        const wall=side===0?(G.py+perp*rdy):(G.px+perp*rdx);
        texX=wall-Math.floor(wall);
        if((side===0&&rdx>0)||(side===1&&rdy<0))texX=1-texX;
        hit=c;break;
      }
    }
    if(!hit){zbuf[x]=1e9;continue;}
    if(perp<0.01)perp=0.01;
    zbuf[x]=perp;
    const lineH=(VIEW_H/perp)|0;
    const y0=horizon-(lineH>>1), y1=y0+lineH;
    const drawY0=y0<0?0:y0, drawY1=y1>VIEW_H?VIEW_H:y1;
    const tex=TEX[hit.tex]||TEX.concrete;
    const tx=clamp((texX*TW)|0,0,TW-1);
    let l=(SHADES-1)-((perp*1.55)|0)-(side===1?4:0)+((lightK*Math.max(0,1-perp/7))|0);
    if(l<3)l=3;if(l>31)l=31;
    const ls=l*256, stepT=TW/lineH;
    let tp=(drawY0-y0)*stepT;
    for(let y=drawY0;y<drawY1;y++){buf[y*RW+x]=shadePx(tex[(tp&63)*TW+tx],ls);tp+=stepT;}
  }

  /* ---- sprites: enemies, items, shots, glitches and sparks, back to front ---- */
  const list=[];
  for(const e of G.ents)list.push({e,d:(e.x-G.px)**2+(e.y-G.py)**2});
  for(const p of G.parts)list.push({p,d:(p.x-G.px)**2+(p.y-G.py)**2});
  list.sort((a,b)=>b.d-a.d);
  const invDet=1/(planeX*sa-ca*planeY);
  for(const it of list){
    const o=it.e||it.p;
    const sx0=o.x-G.px, sy0=o.y-G.py;
    const tx=invDet*(sa*sx0-ca*sy0);
    const ty=invDet*(-planeY*sx0+planeX*sy0);
    if(ty<0.12)continue;
    const scrX=((RW/2)*(1+tx/ty))|0;
    let spr=null, vshift=0, scale=1;
    if(it.p){
      const P=it.p;
      if(P.puff){spr=PUFF[Math.min(2,(P.t/P.life*3)|0)];scale=0.5;vshift=-0.05;}
      else{
        const size=Math.max(1,(P.sz*VIEW_H/(ty*36))|0);
        const cy=(horizon+(VIEW_H/ty)*(0.5-(P.z||0)))|0;
        const a=1-P.t/P.life, col=P.col;
        const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
        for(let yy=0;yy<size;yy++)for(let xx=0;xx<size;xx++){
          const qx=scrX+xx-(size>>1), qy=cy+yy-(size>>1);
          if(qx<0||qx>=RW||qy<0||qy>=VIEW_H||zbuf[qx]<ty)continue;
          const idx=qy*RW+qx, prev=buf[idx];
          buf[idx]=0xff000000|((b*a+((prev>>16)&255)*(1-a))<<16)|((g*a+((prev>>8)&255)*(1-a))<<8)|(r*a+(prev&255)*(1-a));
        }
        continue;
      }
    }else if(o.kind==='enemy'){
      const t=ETYPE[o.type];
      if(o.dead)spr=t.dead[Math.min(3,(o.t*7)|0)];
      else{
        const rel=angDiff(Math.atan2(G.py-o.y,G.px-o.x),o.ang);
        const view=Math.abs(rel)<Math.PI/3?0:Math.abs(rel)>Math.PI*2/3?2:1;
        const walk=o.phase&&t.walk2?t.walk2:t.walk, atk=o.phase&&t.atk2?t.atk2:t.atk;
        if(o.state==='attack')spr=atk[view];
        else if(o.state==='pain')spr=t.hurt[view];
        else spr=walk[view][((o.anim*4.5)|0)&1];
        if(t.fly)vshift=-t.fly+Math.sin(o.anim*3)*0.03;
      }
    }else if(o.kind==='item'){spr=ITEM[o.what].spr;vshift=Math.sin(o.bob)*0.035;}
    else if(o.kind==='shot'){spr=SHOT[o.shot][((o.t*14)|0)%3];vshift=-o.fly;}
    else if(o.kind==='warp'){spr=WARP[((o.t*18)|0)%4];}
    if(!spr)continue;
    const h=Math.abs((VIEW_H/ty)*scale*(spr.h/48))|0;
    const w=(h*spr.w/spr.h)|0;
    if(h<1||w<1)continue;
    const bottom=horizon+((VIEW_H/ty)/2)|0;
    const y0=bottom-h+((vshift*VIEW_H/ty)|0);
    const x0=scrX-(w>>1);
    let l=(SHADES-1)-((ty*1.7)|0)+((lightK*Math.max(0,1-ty/7))|0);
    if(l<4)l=4;if(l>31)l=31;
    const ls=l*256, hurtFlash=o.kind==='enemy'&&o.state==='pain';
    for(let x=Math.max(0,x0);x<Math.min(RW,x0+w);x++){
      if(zbuf[x]<ty)continue;
      const sxp=(((x-x0)*spr.w/w)|0);
      for(let y=Math.max(0,y0);y<Math.min(VIEW_H,y0+h);y++){
        const c32=spr.data[(((y-y0)*spr.h/h)|0)*spr.w+sxp];
        if(!(c32>>>24))continue;
        buf[y*RW+x]=hurtFlash?0xffffffff:shadePx(c32,ls);
      }
    }
  }
}

/* --------------------------------------------------------- 2D HUD layer */
function px(c,txt,x,y,size,col,align){
  c.font='700 '+size+'px "JetBrains Mono",ui-monospace,monospace';
  c.textAlign=align||'left';c.textBaseline='alphabetic';
  c.fillStyle=col;c.fillText(txt,x,y);
}
function glowText(txt,x,y,size,col,glow,align){
  ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=size*0.6;px(ctx,txt,x,y,size,col,align);ctx.restore();
}
function drawStatusBar(){
  const y0=VIEW_H;
  const g=ctx.createLinearGradient(0,y0,0,RH);
  g.addColorStop(0,'#16131f');g.addColorStop(1,'#08070c');
  ctx.fillStyle=g;ctx.fillRect(0,y0,RW,RH-y0);
  ctx.fillStyle=NEON.pink;ctx.fillRect(0,y0,RW,1);
  ctx.fillStyle='rgba(255,63,180,.18)';ctx.fillRect(0,y0+1,RW,2);
  const sep=x=>{ctx.fillStyle='#2a2438';ctx.fillRect(x,y0+4,1,RH-y0-8);};
  const w=WEAPONS[G.wep];
  px(ctx,String(G.ammo[w.ammo]),46,y0+21,18,NEON.cyan,'right');
  px(ctx,'AMMO',24,y0+29,6,'#8a85a0');
  sep(52);
  px(ctx,Math.max(0,Math.round(G.hp))+'%',106,y0+21,18,G.hp>50?NEON.cyan:G.hp>25?NEON.amber:NEON.red,'right');
  px(ctx,'HEALTH',80,y0+29,6,'#8a85a0');
  sep(112);
  px(ctx,'ARMS',118,y0+9,6,'#8a85a0');
  for(let i=0;i<NWEP;i++)px(ctx,String(i+1),118+i*9,y0+21,10,G.has[i]?(i===G.wep?'#ffffff':NEON.pink):'#3a3448');
  sep(166);
  const tier=clamp(Math.floor(G.hp/20.0001),0,4);
  const f=G.hp<=0?FACES.dead:G.hurtT>0.35?FACES[tier].o:FACES[tier][G.faceDir==='l'?'l':G.faceDir==='r'?'r':'n'];
  ctx.drawImage(spriteToCanvas(f),172,y0+1,26,30);
  if(G.god){ctx.strokeStyle=NEON.cyan;ctx.lineWidth=1;ctx.strokeRect(171.5,y0+0.5,27,31);}
  sep(204);
  px(ctx,Math.round(G.armor)+'%',252,y0+21,18,NEON.violet,'right');
  px(ctx,'ARMOUR',224,y0+29,6,'#8a85a0');
  sep(258);
  if(G.mode==='campaign'){
    const kk=[['B','#3c8bff'],['Y',NEON.amber],['R',NEON.red]];
    kk.forEach((k,i)=>{const yy=y0+5+i*9;
      if(G.keys[k[0]]){ctx.fillStyle=k[1];ctx.fillRect(264,yy,9,6);}
      else{ctx.strokeStyle='#2e2a3c';ctx.lineWidth=1;ctx.strokeRect(264.5,yy+0.5,8,5);}});
    px(ctx,'L'+(G.level+1),282,y0+11,7,'#8a85a0');
    px(ctx,fmtTime(G.time),282,y0+21,8,NEON.amber);
    px(ctx,G.kills+'/'+G.killsTotal,282,y0+29,7,'#8a85a0');
  }else{
    px(ctx,'WAVE',264,y0+11,7,'#8a85a0');
    px(ctx,String(G.wave),264,y0+25,14,NEON.amber);
    const left=G.ents.filter(e=>e.kind==='enemy'&&!e.dead).length+G.spawnQ.length;
    px(ctx,left+' LEFT',316,y0+29,7,'#8a85a0','right');
  }
}
function drawWeapon(){
  const w=WEAPONS[G.wep], frames=WVIEW[w.view];
  let fi=0;
  if(G.wAnim>0){
    if(w.view==='shotgun')fi=G.wAnim>0.42?1:2;
    else if(w.view==='rail')fi=G.wAnim>0.38?1:2;
    else fi=1;
  }else if(w.view==='rail'&&G.cool>0.2)fi=2;
  const spr=frames[Math.min(fi,frames.length-1)];
  const bobX=Math.sin(G.bob*0.5)*3, bobY=Math.abs(Math.cos(G.bob*0.5))*3;
  ctx.drawImage(spriteToCanvas(spr),((RW-spr.w)/2+bobX)|0,(VIEW_H-spr.h+bobY+G.recoil)|0);
}
function drawCrosshair(){
  const c=G.combo>1?NEON.pink:NEON.cyan;
  ctx.fillStyle=c;
  ctx.fillRect(RW/2-4,VIEW_H/2,2,1);ctx.fillRect(RW/2+3,VIEW_H/2,2,1);
  ctx.fillRect(RW/2,VIEW_H/2-4,1,2);ctx.fillRect(RW/2,VIEW_H/2+3,1,2);
}
const RAIN=[];for(let i=0;i<90;i++)RAIN.push({x:Math.random()*RW,y:Math.random()*VIEW_H,s:140+Math.random()*120,l:4+Math.random()*6});
function drawRain(dt){
  ctx.strokeStyle='rgba(170,220,255,.28)';ctx.lineWidth=0.6;ctx.beginPath();
  for(const r of RAIN){
    r.y+=r.s*dt;r.x-=r.s*dt*0.18;
    if(r.y>VIEW_H){r.y=-r.l;r.x=Math.random()*(RW+40);}
    if(r.x<-10)r.x+=RW+20;
    ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-r.l*0.18,r.y+r.l);
  }
  ctx.stroke();
}
function drawPostFX(dt){
  if(G.beam>0){
    const a=G.beam/0.35;
    ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle='rgba(180,107,255,'+(0.7*a).toFixed(3)+')';ctx.lineWidth=7*a;
    ctx.beginPath();ctx.moveTo(RW/2,VIEW_H-24);ctx.lineTo(RW/2,VIEW_H/2);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,'+a.toFixed(3)+')';ctx.lineWidth=2*a;ctx.stroke();
    ctx.restore();
  }
  if(G.L.rain)drawRain(dt);
  if(G.glitch>0.02){                       // slices of the frame slip sideways
    const n=2+((G.glitch*6)|0);
    for(let i=0;i<n;i++){
      const sy=(Math.random()*VIEW_H)|0, sh=2+((Math.random()*10)|0), off=(Math.random()-0.5)*G.glitch*26;
      ctx.drawImage(fbc,0,sy,RW,sh,off,sy,RW,sh);
      ctx.fillStyle=Math.random()<.5?'rgba(255,63,180,.18)':'rgba(46,242,255,.16)';
      ctx.fillRect(0,sy,RW,1);
    }
  }
  if(G.hp>0&&G.hp<25&&G.scene==='play'){
    const a=0.18+Math.sin(performance.now()/180)*0.08;
    const g=ctx.createRadialGradient(RW/2,VIEW_H/2,40,RW/2,VIEW_H/2,190);
    g.addColorStop(0,'rgba(255,0,40,0)');g.addColorStop(1,'rgba(255,0,40,'+a.toFixed(3)+')');
    ctx.fillStyle=g;ctx.fillRect(0,0,RW,VIEW_H);
  }
}
function drawOverlayFX(){
  if(G.flash>0){
    const a=clamp(G.flash,0,0.6);
    ctx.fillStyle=G.flashCol===0?'rgba(255,20,60,'+a+')':G.flashCol===1?'rgba(200,140,255,'+a+')':'rgba(120,240,255,'+(a*0.5)+')';
    ctx.fillRect(0,0,RW,VIEW_H);
  }
  if(G.msgT>0&&G.msg){ctx.globalAlpha=clamp(G.msgT,0,1);px(ctx,G.msg,7,13,8.5,'#e6e2f2');ctx.globalAlpha=1;}
  if(G.god||G.noclip)px(ctx,(G.god?'IRONHIDE ':'')+(G.noclip?'GHOSTWALK':''),7,24,7,NEON.cyan);
}
function drawScoreHUD(dt){
  const x=RW-(G.touch?32:6);
  px(ctx,fmtNum(G.score),x,13,9.5,'#f2eefc','right');
  if(G.combo>1){
    glowText('×'+G.combo,x,30,15,'#ffffff',NEON.pink,'right');
    ctx.fillStyle='rgba(255,63,180,.25)';ctx.fillRect(x-40,34,40,2);
    ctx.fillStyle=NEON.pink;ctx.fillRect(x-40,34,40*clamp(G.comboT/3,0,1),2);
  }
  let y=50;
  for(const p of G.pops){
    p.t+=dt;
    const a=clamp(2.2-p.t,0,1);
    if(a<=0)continue;
    ctx.globalAlpha=a;
    px(ctx,p.text+(p.val?'  +'+fmtNum(p.val):''),RW/2,y-Math.min(6,p.t*8),8,NEON.amber,'center');
    ctx.globalAlpha=1;y+=10;
  }
  G.pops=G.pops.filter(p=>p.t<2.2);
  if(G.boss&&G.boss.seen&&!G.boss.dead){
    const b=G.boss, w=160, f=clamp(b.hp/b.hpMax,0,1);
    px(ctx,'THE WARDEN',RW/2,G.pops.length?96:46,7,b.phase?NEON.red:NEON.violet,'center');
    const by=G.pops.length?99:49;
    ctx.fillStyle='rgba(20,10,30,.8)';ctx.fillRect(RW/2-w/2-1,by-1,w+2,5);
    ctx.fillStyle=b.phase?NEON.red:NEON.violet;ctx.fillRect(RW/2-w/2,by,w*f,3);
  }
  if(G.mode!=='campaign'&&G.waveState==='break'&&G.wave>0)
    glowText('NEXT WAVE IN '+Math.ceil(G.waveT),RW/2,VIEW_H/2-26,10,'#ffffff',NEON.cyan,'center');
}
function drawTouch(){
  ctx.save();
  const ring=(b,label,on)=>{
    ctx.globalAlpha=on?0.55:0.32;ctx.fillStyle=on?NEON.pink:'#000';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();
    ctx.globalAlpha=0.8;ctx.strokeStyle=NEON.cyan;ctx.lineWidth=1;ctx.stroke();
    px(ctx,label,b.x,b.y+3,b.r>15?8:6,'#ffffff','center');
  };
  ring(TBTN.fire,'FIRE',G.fireHeld);ring(TBTN.use,'USE',false);ring(TBTN.wpn,'WPN',false);ring(TBTN.pause,'II',false);
  if(TOUCH.move){
    const m=TOUCH.move;ctx.globalAlpha=0.35;ctx.strokeStyle=NEON.cyan;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(m.ox,m.oy,26,0,TAU);ctx.stroke();
    let dx=m.x-m.ox,dy=m.y-m.oy;const d=Math.hypot(dx,dy);if(d>26){dx*=26/d;dy*=26/d;}
    ctx.globalAlpha=0.6;ctx.fillStyle=NEON.cyan;ctx.beginPath();ctx.arc(m.ox+dx,m.oy+dy,9,0,TAU);ctx.fill();
  }else{ctx.globalAlpha=0.22;px(ctx,'MOVE',42,VIEW_H-26,7,'#ffffff','center');px(ctx,'DRAG TO LOOK',RW*0.62,VIEW_H-26,7,'#ffffff','center');}
  ctx.restore();
}
function drawAutomap(){
  const W=G.W,H=G.H,s=Math.min((RW-20)/W,(VIEW_H-20)/H);
  const ox=(RW-W*s)/2, oy=(VIEW_H-H*s)/2;
  ctx.fillStyle='rgba(6,4,12,.9)';ctx.fillRect(0,0,RW,VIEW_H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const c=G.grid[y*W+x];
    if(!c||(!c.seen&&!G.allmap))continue;
    let col;
    if(c.exit)col=NEON.lime;
    else if(c.door)col=c.door.need?({B:'#3c8bff',Y:NEON.amber,R:NEON.red,O:NEON.pink})[c.door.need]:'#5a6a8a';
    else if(c.solid)col='#3a3458';
    else if(c.hurt)col='#0c4a5a';
    else col='#15121f';
    ctx.fillStyle=col;ctx.fillRect(ox+x*s,oy+y*s,Math.ceil(s),Math.ceil(s));
  }
  if(G.allmap)for(const e of G.ents){
    if(e.kind==='enemy'&&!e.dead){ctx.fillStyle=NEON.red;ctx.fillRect(ox+e.x*s-1,oy+e.y*s-1,2,2);}
    else if(e.kind==='item'){ctx.fillStyle=NEON.lime;ctx.fillRect(ox+e.x*s-1,oy+e.y*s-1,2,2);}
  }
  ctx.save();ctx.translate(ox+G.px*s,oy+G.py*s);ctx.rotate(G.pa);
  ctx.fillStyle=NEON.cyan;ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-3,-3.2);ctx.lineTo(-1,0);ctx.lineTo(-3,3.2);ctx.closePath();ctx.fill();
  ctx.restore();
  px(ctx,G.L.name,RW/2,VIEW_H-6,10,NEON.pink,'center');
}
let seenTick=0;
function markSeen(){
  if((seenTick++)%3)return;
  const r=7;
  for(let y=(G.py|0)-r;y<=(G.py|0)+r;y++)for(let x=(G.px|0)-r;x<=(G.px|0)+r;x++){
    const c=cellAt(x,y);
    if(c&&!c.seen&&Math.hypot(x+0.5-G.px,y+0.5-G.py)<r&&losClear(G.px,G.py,x+0.5,y+0.5))c.seen=true;
  }
}

/* --------------------------------------------------------------- screens */
const skyCanvas=(function(){
  const c=document.createElement('canvas');c.width=SKYW;c.height=SKYH;
  const x=c.getContext('2d'),d=x.createImageData(SKYW,SKYH);new Uint32Array(d.data.buffer).set(SKY);x.putImageData(d,0,0);return c;
})();
let titleT=0;
function bg(dt){
  titleT+=dt||0;
  ctx.fillStyle='#05040a';ctx.fillRect(0,0,RW,RH);
  const off=(titleT*12)%SKYW;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(skyCanvas,off,0,RW*1.2,SKYH,0,24,RW,SKYH*0.9);
  ctx.drawImage(skyCanvas,off-SKYW,0,RW*1.2,SKYH,0,24,RW,SKYH*0.9);
  // a synthwave floor grid running toward the horizon
  const hy=24+SKYH*0.9;
  const g=ctx.createLinearGradient(0,hy,0,RH);g.addColorStop(0,'#2a0a2e');g.addColorStop(1,'#05040a');
  ctx.fillStyle=g;ctx.fillRect(0,hy,RW,RH-hy);
  ctx.strokeStyle='rgba(255,63,180,.45)';ctx.lineWidth=0.6;ctx.beginPath();
  for(let i=-12;i<=12;i++){ctx.moveTo(RW/2+i*4,hy);ctx.lineTo(RW/2+i*48,RH);}
  for(let k=0;k<9;k++){const t=((k+(titleT*1.4)%1)/9),y=hy+(RH-hy)*t*t;ctx.moveTo(0,y);ctx.lineTo(RW,y);}
  ctx.stroke();
  ctx.fillStyle='rgba(5,4,10,.45)';ctx.fillRect(0,0,RW,RH);
}
function drawMenu(items,y0,rowH,x0,x1){
  menuRects=[];
  items.forEach((it,i)=>{
    const y=y0+i*rowH,on=i===G.menu;
    menuRects.push({x:x0,y:y-rowH+5,w:x1-x0,h:rowH,i});
    if(on){ctx.fillStyle='rgba(255,63,180,.14)';ctx.fillRect(x0,y-rowH+5,x1-x0,rowH-1);ctx.fillStyle=NEON.pink;ctx.fillRect(x0,y-rowH+5,2,rowH-1);}
    px(ctx,it.label,x0+10,y,10.5,it.lock?'#4c4560':on?'#ffffff':'#bdb5d6');
    if(it.sub)px(ctx,it.sub,x1-6,y,7,it.lock?'#4c4560':on?NEON.cyan:'#6f6888','right');
  });
}
function drawTitle(dt){
  bg(dt);
  const fl=0.85+Math.sin(titleT*9)*0.05+(Math.random()<0.02?-0.4:0);
  ctx.save();ctx.globalAlpha=fl;
  glowText('NEON',RW/2,40,26,'#ffd6f0',NEON.pink,'center');
  glowText('FURNACE',RW/2,64,26,'#d6fbff',NEON.cyan,'center');
  ctx.restore();
  px(ctx,'A ROGUE AI HAS TAKEN THE TOWER. TAKE IT BACK.',RW/2,77,6.5,'#a59cc4','center');
  MENU=menuItems();
  if(G.menu>=MENU.length)G.menu=0;
  drawMenu(MENU,96,15,46,RW-46);
  px(ctx,G.touch?'TAP TO CHOOSE':'↑ ↓ OR MOUSE · ENTER TO CHOOSE · M SOUND',RW/2,194,6.5,'#6f6888','center');
}
function drawSkill(dt){
  bg(dt);
  glowText('HOW HARD',RW/2,34,15,'#ffffff',NEON.pink,'center');
  MENU=menuItems();drawMenu(MENU,66,22,24,RW-24);
  px(ctx,'ESC TO GO BACK',RW/2,194,6.5,'#6f6888','center');
}
const MEDAL_NAMES=['NO DAMAGE','ALL SECRETS','PAR TIME','100% KILLS'];
const MEDAL_COLS=[NEON.cyan,NEON.violet,NEON.amber,NEON.pink];
function medalIcon(x,y,i,on){
  ctx.fillStyle=on?MEDAL_COLS[i]:'#2a2538';
  ctx.beginPath();
  if(i===0){ctx.moveTo(x,y-4);ctx.lineTo(x+4,y-2);ctx.lineTo(x+3,y+3);ctx.lineTo(x,y+5);ctx.lineTo(x-3,y+3);ctx.lineTo(x-4,y-2);}
  else if(i===1){for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,r=k%2?2:5;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}}
  else if(i===2){ctx.arc(x,y,4.5,0,TAU);}
  else{ctx.moveTo(x,y-5);ctx.lineTo(x+5,y);ctx.lineTo(x,y+5);ctx.lineTo(x-5,y);}
  ctx.closePath();ctx.fill();
  if(i===2&&on){ctx.fillStyle='#120c1a';ctx.fillRect(x-0.5,y-3,1,3);ctx.fillRect(x,y-0.5,2.5,1);}
}
function drawArmory(dt){
  bg(dt);
  glowText('ARMORY',RW/2,26,14,'#ffffff',NEON.cyan,'center');
  px(ctx,'MEDALS '+medalCount()+' OF 20 UNLOCK NEW FINISHES',RW/2,38,6.5,'#a59cc4','center');
  MENU=menuItems();drawMenu(MENU,56,13,16,170);
  // the medal board, one row per level
  NF_LEVELS.forEach((L,n)=>{
    const y=52+n*16;
    px(ctx,L.name,180,y+3,6,'#8a82a8');
    for(let i=0;i<4;i++)medalIcon(268+i*13,y,i,(SV.medals[n]>>i)&1);
  });
  MEDAL_NAMES.forEach((m,i)=>{medalIcon(186+(i%2)*68,144+((i/2)|0)*12,i,true);px(ctx,m,193+(i%2)*68,146+((i/2)|0)*12,5.5,'#8a82a8');});
  // a preview of the equipped finish
  const f=FINISHES[clamp(G.menu,0,FINISHES.length-1)];
  if(f&&G.menu<FINISHES.length){
    const prev=buildPreview(f);
    ctx.drawImage(prev,40,128,100,60);
  }
}
const previewCache={};
function buildPreview(f){
  if(previewCache[f.id])return previewCache[f.id];
  const v=buildWeaponViews(f);return previewCache[f.id]=spriteToCanvas(v.rifle[0]);
}
function drawSound(dt){
  bg(dt);
  glowText('SOUND',RW/2,34,15,'#ffffff',NEON.cyan,'center');
  MENU=menuItems();drawMenu(MENU,70,20,50,RW-50);
  px(ctx,'← → TO ADJUST · THE MUSIC IS GENERATED LIVE, NO FILES',RW/2,150,6.5,'#a59cc4','center');
}
function drawTally(dt){
  bg(dt);
  const t=G.tally;
  glowText('LEVEL '+(G.level+(t.last?1:0))+'  ·  '+t.name,RW/2,26,12,'#ffffff',NEON.pink,'center');
  px(ctx,'C L E A R E D',RW/2,38,7,'#8a82a8','center');
  const row=(label,val,y,good)=>{px(ctx,label,128,y,10,'#bdb5d6','right');px(ctx,val,140,y,10,good?NEON.lime:NEON.cyan,'left');};
  row('KILLS',t.kills+'%',58,t.kills>=100);
  row('ITEMS',t.items+'%',71,t.items>=100);
  row('SECRETS',t.secrets+'%',84,t.secrets>=100);
  row('TIME',fmtTime(t.time),97,t.time<=t.par);
  row('PAR',fmtTime(t.par),110,false);
  row('BONUS','+'+fmtNum(t.bonus),123,t.bonus>0);
  row('SCORE',fmtNum(G.score),136,t.newBest);
  if(t.newBest)px(ctx,'NEW BEST',236,136,7,NEON.amber);
  for(let i=0;i<4;i++){
    const x=RW/2-60+i*40,on=(t.medals>>i)&1;
    medalIcon(x,154,i,on);
    px(ctx,MEDAL_NAMES[i],x,168,5,on?MEDAL_COLS[i]:'#4c4560','center');
    if((t.fresh>>i)&1)px(ctx,'NEW',x,146,5.5,'#ffffff','center');
  }
  px(ctx,(G.touch?'TAP':'PRESS ENTER')+(t.last?' FOR THE ENDING':' FOR THE NEXT LEVEL'),RW/2,192,8,'#e6e2f2','center');
}
function drawEnd(dt){
  bg(dt);
  glowText('THE SPIRE IS DARK',RW/2,46,17,'#ffffff',NEON.cyan,'center');
  px(ctx,'The Warden is offline. The city keeps its lights.',RW/2,64,8,'#bdb5d6','center');
  const row=(l,v,y)=>{px(ctx,l,154,y,9,'#bdb5d6','right');px(ctx,v,166,y,9,NEON.cyan,'left');};
  row('TOTAL KILLS',String(G.totals.kills),90);
  row('SECRETS',String(G.totals.secrets),103);
  row('TOTAL TIME',fmtTime(G.totals.time),116);
  row('FINAL SCORE',fmtNum(G.score),129);
  px(ctx,'SKILL: '+SKILLS[G.skill].n+'  ·  OVERDRIVE AND THE DAILY RUN ARE OPEN',RW/2,152,6.5,'#8a82a8','center');
  px(ctx,G.touch?'TAP TO CONTINUE':'PRESS ENTER',RW/2,186,9,'#e6e2f2','center');
}
function drawDead(){
  ctx.fillStyle='rgba(40,0,20,.55)';ctx.fillRect(0,0,RW,VIEW_H);
  glowText('FLATLINED',RW/2,80,26,'#ffffff',NEON.red,'center');
  if(G.mode==='campaign')px(ctx,G.touch?'TAP TO RETRY THE LEVEL':'ENTER OR R TO RETRY · ESC FOR TITLE',RW/2,104,8,'#e6e2f2','center');
}
function drawPaused(){
  ctx.fillStyle='rgba(5,4,10,.72)';ctx.fillRect(0,0,RW,VIEW_H);
  glowText('PAUSED',RW/2,44,16,'#ffffff',NEON.cyan,'center');
  MENU=menuItems();drawMenu(MENU,80,18,60,RW-60);
}
function drawOdResult(){
  ctx.fillStyle='rgba(5,4,10,.8)';ctx.fillRect(0,0,RW,VIEW_H);
  const r=G.odResult;if(!r)return;
  glowText(G.mode==='daily'?'DAILY '+G.daily.label:'OVERDRIVE',RW/2,26,12,'#ffffff',NEON.pink,'center');
  px(ctx,'WAVE '+r.wave+'  ·  '+fmtNum(r.score)+'  ·  ×'+r.maxCombo+' MAX',RW/2,46,10,NEON.cyan,'center');
  px(ctx,r.isBest?'NEW BEST':'BEST '+fmtNum(r.best),RW/2,60,8,r.isBest?NEON.amber:'#8a82a8','center');
  MENU=menuItems();drawMenu(MENU,90,18,60,RW-60);
  if(G.copied>0)px(ctx,'COPIED: '+shareLine(),RW/2,150,6,NEON.lime,'center');
}

/* ------------------------------------------------------------- main loop */
let last=performance.now(),fpsAcc=0,fpsN=0;
const fpsOut=document.getElementById('fpsOut');
function loop(now){
  let dt=(now-last)/1000;last=now;
  if(dt>0.1)dt=0.1;
  resizeCanvas();
  fpsAcc+=dt;fpsN++;
  if(fpsAcc>0.5){fpsOut.textContent=Math.round(fpsN/fpsAcc)+' fps · 320×200';fpsAcc=0;fpsN=0;}
  if(G.copied>0)G.copied-=dt;
  const world=['play','dead','paused','odresult'].includes(G.scene);
  if(G.scene==='play'){
    let gdt=dt;
    if(G.hitstop>0){G.hitstop-=dt;gdt=dt*0.08;}
    G.time+=gdt;
    updatePlayer(gdt);updateDoors(gdt);updateEnemies(gdt);
    if(G.mode!=='campaign'&&G.scene==='play')updateWaves(gdt);
    AUDIO.music.intensity(musicIntensity());
    markSeen();
  }
  if(world){
    G.shake*=Math.pow(0.002,dt);G.light*=Math.pow(0.0004,dt);G.beam-=dt;
    G.glitch=Math.max(0,G.glitch-dt*(G.scene==='play'?1.6:0.3));
    renderWorld(now/1000);
    const s=G.shake>0.3&&G.scene==='play'?G.shake:0;
    blitWorld((Math.random()-0.5)*s,(Math.random()-0.5)*s,true);
    drawPostFX(dt);
    if(G.scene==='play'){
      if(G.mapOn)drawAutomap();else{drawWeapon();drawCrosshair();}
      drawScoreHUD(dt);drawOverlayFX();
    }else if(G.scene==='dead')drawDead();
    else if(G.scene==='paused')drawPaused();
    else drawOdResult();
    drawStatusBar();
    if(G.touch&&G.scene==='play')drawTouch();
  }else{
    beginUI();
    if(G.scene==='title')drawTitle(dt);
    else if(G.scene==='skill')drawSkill(dt);
    else if(G.scene==='armory')drawArmory(dt);
    else if(G.scene==='sound')drawSound(dt);
    else if(G.scene==='tally')drawTally(dt);
    else if(G.scene==='end')drawEnd(dt);
  }
  requestAnimationFrame(loop);
}

/* --------------------------------------------------------------- startup */
function begin(){
  if(G.started)return;
  AUDIO.init();AUDIO.setVolumes(SV.mus,SV.sfx);
  G.started=true;
  document.getElementById('clickToPlay').classList.add('hide');
  document.body.classList.add('nf-playing');
  if(G.touch){const el=document.getElementById('screenwrap');try{const p=el.requestFullscreen&&el.requestFullscreen();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
  toTitle();
}
document.getElementById('startBtn').addEventListener('click',e=>{e.stopPropagation();begin();});
screenEl.addEventListener('click',()=>{if(!G.started)begin();});
document.getElementById('fsBtn').addEventListener('click',()=>{
  const el=document.getElementById('screenwrap');
  if(!document.fullscreenElement)el.requestFullscreen&&el.requestFullscreen();
  else document.exitFullscreen();
});
if(window.matchMedia&&matchMedia('(pointer: coarse)').matches){G.touch=true;document.body.classList.add('nf-touch');}
resizeCanvas();
G.mode='campaign';loadLevel(0);
G.scene='title';
// A small handle for the automated browser tests.
window.__NF={G,SV,startCampaign,startArena,startLevel,loadLevel,toTitle,fire,hurtPlayer,damageEnemy,finishLevel,use,pause,shareLine,menuItems,AUDIO};
requestAnimationFrame(loop);
