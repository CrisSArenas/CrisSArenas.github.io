/* ================================== HUD ==================================
   Drawn on a 2D canvas over the world in a fixed 480x270 space. Warnings sit
   over enemies' heads: red means counter it, amber means get out of the way. */
function tx(t,x,y,size,col,align,weight){
  hx.font=(weight||700)+' '+size+'px "JetBrains Mono",ui-monospace,monospace';
  hx.textAlign=align||'left';hx.textBaseline='alphabetic';hx.fillStyle=col;hx.fillText(t,x,y);
}
function gtx(t,x,y,size,col,glow,align){hx.save();hx.shadowColor=glow;hx.shadowBlur=size*0.7;tx(t,x,y,size,col,align);hx.restore();}
const css=c=>'rgb('+(c[0]*255|0)+','+(c[1]*255|0)+','+(c[2]*255|0)+')';
function wrap(text,x,y,maxW,size,col,lh,weight){
  hx.font=(weight||500)+' '+size+'px "JetBrains Mono",ui-monospace,monospace';
  const words=text.split(' ');let line='',yy=y;
  for(const w of words){const t=line?line+' '+w:w;if(hx.measureText(t).width>maxW&&line){tx(line,x,yy,size,col,'left',weight||500);line=w;yy+=lh;}else line=t;}
  if(line)tx(line,x,yy,size,col,'left',weight||500);return yy;
}
function portrait(name,x,y,s){
  const i=TILE[name];if(i===undefined)return;
  hx.imageSmoothingEnabled=false;hx.drawImage(atlasCanvas,(i%ATN)*TS,((i/ATN)|0)*TS,TS,TS,x,y,s,s);
  hx.strokeStyle='rgba(255,255,255,.25)';hx.lineWidth=0.6;hx.strokeRect(x+0.3,y+0.3,s-0.6,s-0.6);
}
const MENU_HEAD={skill:['HOW HARD',NEON.pink],challenges:['CHALLENGES',NEON.amber],upgrades:['UPGRADES',NEON.lime],sound:['SETTINGS',NEON.cyan],log:['STORY LOG',NEON.violet],scores:['HIGH SCORES',NEON.amber]};

function drawHUD(dt){
  hx.setTransform(1,0,0,1,0,0);hx.clearRect(0,0,hud.width,hud.height);
  hx.setTransform(US,0,0,US,0,0);
  if(!GL_OK){
    hx.fillStyle='#05040a';hx.fillRect(0,0,UW,UH);
    gtx('NEON FURNACE',UW/2,110,22,'#ffe1f4',NEON.pink,'center');
    tx('This game draws its city with WebGL2, which this browser has turned off.',UW/2,140,8,'#c4bcdc','center',500);
    tx('Try a current Chrome, Edge, Firefox or Safari.',UW/2,154,8,'#c4bcdc','center',500);
    return;
  }
  const S=G.scene;
  if(S==='play'||S==='paused')playHUD(dt);
  if(S==='cut')cutHUD();
  if(S==='play'&&G.map)mapOverlay();
  if(S==='paused'){dim(0.6);gtx('PAUSED',UW/2,70,20,'#ffffff',NEON.cyan,'center');drawMenu(menuItems(),110,22,140,UW-140);controlsCard();}
  else if(S==='result')resultPanel();
  else if(S==='initials')initialsPanel();
  else if(S==='title'||S==='boot')titleScreen();
  else if(S==='armory')armoryScreen();
  else if(S==='upgrades')upgradesScreen();
  else if(S==='log')logScreen();
  else if(S==='scores')scoresScreen();
  else if(MENU_HEAD[S]){sidePanel();const [h,c]=MENU_HEAD[S];gtx(h,40,54,18,'#ffffff',c);
    if(S==='challenges')tx('THREE STARS EACH · STARS UNLOCK SUITS',40,68,7,'#b8afd6','left',600);
    drawMenu(menuItems(),S==='challenges'?92:96,S==='challenges'?21:24,30,290);
    tx(S==='sound'?'← → TO ADJUST · THE MUSIC IS COMPOSED LIVE, NO FILES':'ESC TO GO BACK',40,UH-14,6.5,'#8a82a8','left',600);}
  else if(S==='tally')tallyScreen();
  else if(S==='end'||S==='tally2')endScreen();
}
function dim(a){hx.fillStyle='rgba(5,4,10,'+a+')';hx.fillRect(0,0,UW,UH);}
function sidePanel(w){w=w||330;const g=hx.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(5,4,10,.9)');g.addColorStop(0.7,'rgba(5,4,10,.7)');g.addColorStop(1,'rgba(5,4,10,0)');hx.fillStyle=g;hx.fillRect(0,0,w,UH);}
function drawMenu(items,y0,rowH,x0,x1,maxRows){
  menuRects=[];if(G.menu>=items.length)G.menu=0;
  maxRows=maxRows||Math.floor((UH-24-y0)/rowH)+1;
  const first=Math.max(0,Math.min(G.menu-maxRows+2,items.length-maxRows));
  items.forEach((it,i)=>{
    if(i<first||i>=first+maxRows)return;
    const y=y0+(i-first)*rowH,on=i===G.menu;
    menuRects.push({x:x0,y:y-rowH+6,w:x1-x0,h:rowH,i});
    if(on){hx.fillStyle='rgba(255,63,180,.16)';hx.fillRect(x0,y-rowH+6,x1-x0,rowH-2);hx.fillStyle=NEON.pink;hx.fillRect(x0,y-rowH+6,2,rowH-2);}
    const big=rowH>=20;
    tx(it.label,x0+12,y-(big?0:0),big?12:10,it.lock&&!it.up?'#4c4560':on?'#ffffff':'#c9c1e2');
    if(it.sub)tx(it.sub,x1-8,y,6.5,it.lock&&!it.up?'#4c4560':on?NEON.cyan:'#7d7698','right',600);
  });
  if(first>0)tx('▲',x0+4,y0-rowH+4,6,'#7d7698');
  if(first+maxRows<items.length)tx('▼',x0+4,y0+maxRows*rowH-rowH+12,6,'#7d7698');
}
function controlsCard(){
  if(G.touch)return;
  const L=['WASD MOVE · MOUSE LOOK','SPACE JUMP, HOLD TO GLIDE','LEFT CLICK / J STRIKE','RIGHT CLICK / K COUNTER','V SPECIAL · SHIFT DASH · E GRAPPLE','Q DISC · F EMP · C SMOKE','TAB MAP · M SOUND · P PAUSE'];
  L.forEach((l,i)=>tx(l,UW/2,190+i*10,6.5,'#8a82a8','center',600));
}

/* ---------------------------------------------------------------- in play */
function playHUD(dt){
  // warnings over heads, and the grapple point you would take
  for(const e of G.ents){
    if(e.dead||e.hidden)continue;
    const top=e.y+(e.type==='mech'||e.type==='atlas'?3.8:e.type==='warden'?3:e.type==='hammer'?2:e.type==='brute'?2.7:e.fly?0.9:2.25);
    const p=toScreen(e.x,top,e.z);if(!p||p[2]>45)continue;
    if(e.state==='windup'){
      const k=1+0.25*Math.sin(G.clock*30);
      if(e.counterable){hx.fillStyle=NEON.red;
        for(const dx of [-5,5]){hx.beginPath();hx.moveTo(p[0]+dx-4*k,p[1]-9);hx.lineTo(p[0]+dx,p[1]-3);hx.lineTo(p[0]+dx+4*k,p[1]-9);hx.lineTo(p[0]+dx+4*k,p[1]-6);hx.lineTo(p[0]+dx,p[1]);hx.lineTo(p[0]+dx-4*k,p[1]-6);hx.fill();}}
      else{hx.strokeStyle=NEON.amber;hx.lineWidth=1.6;hx.beginPath();hx.arc(p[0],p[1]-5,5*k,0,TAU);hx.stroke();tx('!',p[0],p[1]-2,7,NEON.amber,'center');}
    }else if(e.state==='blind'||(e.state==='idle'&&!e.boss&&isTakedown(e)&&Math.hypot(e.x-P.x,e.z-P.z)<6)){
      tx(e.state==='blind'?'?':'TAKEDOWN',p[0],p[1]-3,e.state==='blind'?9:6,'#d6cfee','center');
    }else if(e.state==='stun'||e.state==='open'){tx(e.state==='open'?'OPEN':'~',p[0],p[1]-3,e.state==='open'?6:10,e.state==='open'?NEON.lime:NEON.cyan,'center');}
    else if(e.state==='down'&&Math.hypot(e.x-P.x,e.z-P.z)<5)tx('FINISH',p[0],p[1]+8,5.5,NEON.amber,'center');
    if(!e.boss&&e.hp<e.hpMax&&e.hpMax>2&&e.state!=='down'){const w=16,f=clamp(e.hp/e.hpMax,0,1);hx.fillStyle='rgba(5,4,10,.6)';hx.fillRect(p[0]-w/2,p[1]+1,w,2);hx.fillStyle=NEON.red;hx.fillRect(p[0]-w/2,p[1]+1,w*f,2);}
  }
  // shouted lines over heads
  for(const b of G.bubbles){const e=b.e,p=toScreen(e.x,e.y+2.6,e.z);if(!p||p[2]>35)continue;
    hx.globalAlpha=clamp(b.t*2,0,1);hx.font='700 6px "JetBrains Mono",ui-monospace,monospace';const w=hx.measureText(b.text).width+8;
    hx.fillStyle='rgba(5,4,10,.75)';hx.fillRect(p[0]-w/2,p[1]-16,w,10);hx.fillStyle='rgba(5,4,10,.75)';hx.beginPath();hx.moveTo(p[0]-3,p[1]-6);hx.lineTo(p[0],p[1]-2);hx.lineTo(p[0]+3,p[1]-6);hx.fill();
    tx(b.text,p[0],p[1]-9,6,'#ffe1f4','center');hx.globalAlpha=1;}
  if(P.state==='move'&&!P.grap){const a=grappleTarget();if(a){const p=toScreen(a.x,a.y,a.z);if(p){
    hx.strokeStyle=NEON.cyan;hx.lineWidth=1.4;hx.beginPath();hx.moveTo(p[0],p[1]-7);hx.lineTo(p[0]+7,p[1]);hx.lineTo(p[0],p[1]+7);hx.lineTo(p[0]-7,p[1]);hx.closePath();hx.stroke();
    if(!G.touch)tx('E',p[0],p[1]+17,7,NEON.cyan,'center');}}}
  // boss bars
  const bosses=G.ents.filter(e=>e.boss&&e.aware&&!e.dead);
  let topY=30;
  bosses.forEach((b,i)=>{const B=bossInfo(b),w=bosses.length>1?140:220,x=bosses.length>1?UW/2-150+i*160:UW/2-w/2,f=clamp(b.hp/b.hpMax,0,1),y=34;
    const name=b.type==='twin'?(b.twin?'ECHO':'NULL'):B.name;
    tx(name,x,y,8,css(B.color));tx(B.title,x+w,y,5.5,'#8a82a8','right',600);
    hx.fillStyle='rgba(5,4,10,.7)';hx.fillRect(x-1,y+3,w+2,6);hx.fillStyle=css(B.color);hx.fillRect(x,y+4,w*f,4);
    for(const s of b.summon||[]){hx.fillStyle='rgba(5,4,10,.8)';hx.fillRect(x+w*s,y+3,1,6);}
    const v=bossVulnerable(b);if(v)tx('OPEN · HIT IT NOW',x+w/2,y+17,6,NEON.lime,'center',600);
    topY=y+22;});
  // objective compass
  const ob=objective();
  if(ob){
    const oy=Math.atan2(ob.x-P.x,ob.z-P.z),off=clamp(-angDiff(oy,CAM.yaw)/(Math.PI/2),-1,1),d=Math.hypot(ob.x-P.x,ob.z-P.z),dy=ob.y-P.y;
    hx.fillStyle='rgba(5,4,10,.45)';hx.fillRect(UW/2-90,8,180,4);
    hx.fillStyle=ob.c?css(ob.c):NEON.lime;hx.fillRect(UW/2+off*88-2,6,4,8);
    tx(ob.label+'  ·  '+Math.round(d)+' M'+(Math.abs(dy)>4?(dy>0?'  ▲':'  ▼'):''),UW/2,23,7,'#e6e2f2','center');
  }
  if(G.mode==='challenge')challengeHUD();
  else if(G.mode!=='campaign'){tx('WAVE '+G.wave+(G.mode==='weekly'?'/10':''),12,20,12,NEON.amber);const left=G.ents.filter(e=>!e.dead).length+G.spawnQ.length;tx(left+' LEFT',12,31,7,'#c4bcdc');
    if(G.daily)tx(G.daily.twist.name,12,41,6,NEON.cyan,'left',600);
    if(G.waveState==='break'&&G.wave>0)gtx('NEXT WAVE IN '+Math.ceil(G.waveT),UW/2,70,12,'#ffffff',NEON.cyan,'center');}
  else{tx('D'+(G.level+1)+' · '+G.D.name,12,20,7,'#c4bcdc');tx(fmtTime(G.time)+' / PAR '+fmtTime(G.D.par),12,30,6.5,G.time<=G.D.par?'#8a82a8':NEON.red,'left',600);}
  if(G.msgT>0&&G.msg){hx.globalAlpha=clamp(G.msgT,0,1);gtx(G.msg,UW/2,Math.max(48,topY+18),9,'#ffffff',NEON.pink,'center');hx.globalAlpha=1;}
  // style pops
  let y=Math.max(64,topY+32);
  for(const p of G.pops){const a=clamp(2.2-p.t,0,1);hx.globalAlpha=a;tx(p.text+(p.val?'  '+(p.val>0?'+':'')+fmtNum(p.val):''),UW/2,y-Math.min(5,p.t*7),7.5,p.val<0?NEON.red:NEON.amber,'center');hx.globalAlpha=1;y+=10;}
  // score, combo and special
  const sx=UW-(G.touch?64:12);
  tx(fmtNum(G.score),sx,20,11,'#f2eefc','right');
  if(G.combo>1){
    const keep=has('keeper')?2.6:1.8;
    gtx(G.combo+' HITS',sx,40,14,'#ffffff',NEON.pink,'right');
    tx('×'+comboMult(),sx,52,9,NEON.cyan,'right');
    hx.fillStyle='rgba(255,63,180,.25)';hx.fillRect(sx-60,56,60,2);hx.fillStyle=NEON.pink;const f=clamp(G.comboT/keep,0,1);hx.fillRect(sx-60*f,56,60*f,2);
  }
  const need=has('special2')?6:8,prog=G.special>=2?1:(G.combo%need)/need;
  for(let i=0;i<2;i++){const x=sx-8-i*14,yy=66,on=G.special>i;
    hx.save();hx.translate(x,yy);hx.rotate(Math.PI/4);hx.fillStyle=on?NEON.amber:'rgba(255,255,255,.1)';if(on){hx.shadowColor=NEON.amber;hx.shadowBlur=6;}hx.fillRect(-4,-4,8,8);
    if(!on&&i===Math.floor(G.special)){hx.fillStyle='rgba(255,177,46,.6)';hx.fillRect(-4,4-8*prog,8,8*prog);}hx.restore();}
  if(G.special>=1&&!G.touch)tx('V SPECIAL',sx-36,69,5.5,NEON.amber,'right',600);
  // health, keys, collectibles
  const hp=clamp(P.hp/P.hpMax,0,1),cells=Math.round(P.hpMax/10),cw=Math.min(12.4,124/cells*1.0);
  hx.fillStyle='rgba(5,4,10,.55)';hx.fillRect(10,UH-24,cells*cw+4,12);
  for(let i=0;i<cells;i++){const f=clamp(hp*cells-i,0,1);hx.fillStyle='rgba(255,255,255,.08)';hx.fillRect(12+i*cw,UH-22,cw-1.4,8);
    if(f>0){hx.fillStyle=hp>0.5?NEON.cyan:hp>0.25?NEON.amber:NEON.red;hx.fillRect(12+i*cw,UH-22,(cw-1.4)*f,8);}}
  tx('HP '+Math.ceil(P.hp),12,UH-28,7,'#c4bcdc');
  tx('LV '+level(),60,UH-28,6.5,NEON.lime,'left',600);
  let kx=cells*cw+22;
  if(G.mode==='campaign'){
    for(const k of districtKeys()){hx.fillStyle=G.keys[k]?css(KEYCOL[k]):'rgba(255,255,255,.12)';hx.fillRect(kx,UH-22,8,8);kx+=11;}
    if(G.shardTotal)tx('◆ '+G.shards+'/'+G.shardTotal,kx+4,UH-14,7,NEON.lime);
    if(G.tagTotal)tx('✎ '+G.tags+'/'+G.tagTotal,kx+46,UH-14,7,NEON.pink);
  }
  // gadgets
  if(!G.touch){
    const gd=[['DISC','Q',P.disc?1:P.cdDisc/0.5],['EMP','F',P.cdEmp/(has('empPlus')?6:9)],['SMOKE','C',P.cdSmoke/12]];
    gd.forEach(([n,k,c],i)=>{const x=UW-150+i*48,yy=UH-28;hx.fillStyle='rgba(5,4,10,.55)';hx.fillRect(x,yy,42,18);
      const r=clamp(c,0,1);hx.fillStyle='rgba(46,242,255,.25)';hx.fillRect(x,yy,42*(1-r),18);
      tx(n,x+21,yy+9,6.5,r>0?'#7d7698':'#ffffff','center');tx(k,x+21,yy+16,6,NEON.cyan,'center',500);});
  }
  radioBox();
  if(P.state==='down')gtx('FLATLINED',UW/2,UH/2,26,'#ffffff',NEON.red,'center');
  if(G.touch&&G.scene==='play')touchHUD();
}
function challengeHUD(){
  const C=G.chal;tx(C.name,12,20,9,NEON.amber);
  if(C.type==='combat'){tx('WAVE '+G.wave+'/'+C.waves.length,12,31,7,'#c4bcdc');if(G.waveState==='break'&&G.wave<C.waves.length)gtx(G.wave?'NEXT WAVE':'GET READY',UW/2,70,12,'#ffffff',NEON.cyan,'center');}
  else if(C.type==='stealth'){const left=G.ents.filter(e=>!e.dead&&!e.hidden).length;tx(left+' LEFT · SEEN '+G.spotted+' TIME'+(G.spotted===1?'':'S'),12,31,7,G.spotted?NEON.red:'#c4bcdc');}
  else{tx('RINGS '+G.ringsGot+'/'+WORLD.rings.length+'  ·  '+G.time.toFixed(1)+'s',12,31,7,'#c4bcdc');}
  const st=C.stars,v=C.type==='glide'?G.time:G.score;
  tx('★ '+(C.type==='glide'?st.map(s=>s+'s').join(' / '):st.map(fmtNum).join(' / ')),12,41,6,'#8a82a8','left',600);
}
function radioBox(){
  const r=G.radioQ[0];if(!r)return;
  const V=VOICES[r.who],a=clamp(Math.min(r.t*4,(r.dur-r.t)*3),0,1),x=10,y=G.touch?42:UH-80,w=210,h=40;
  hx.globalAlpha=a;
  hx.fillStyle='rgba(5,4,10,.78)';hx.fillRect(x,y,w,h);hx.fillStyle=V.col;hx.fillRect(x,y,2,h);
  portrait(V.tile,x+5,y+4,32);
  if(Math.sin(G.clock*40)>0.6){hx.fillStyle='rgba(255,255,255,.06)';hx.fillRect(x+5,y+4+((G.clock*60)%32),32,2);}
  tx(V.name,x+42,y+10,6.5,V.col);
  const shown=r.text.slice(0,Math.floor(r.t*45));
  wrap(shown,x+42,y+19,w-48,5.8,'#e6e2f2',7.2,500);
  hx.globalAlpha=1;
}
function touchHUD(){
  hx.save();
  for(const k in TBTN){const b=TBTN[k];
    const cd=k==='disc'?(P.disc?1:P.cdDisc/0.5):k==='emp'?P.cdEmp/9:k==='smoke'?P.cdSmoke/12:k==='special'?(G.special>=1?0:1):0;
    hx.globalAlpha=0.32;hx.fillStyle='#000';hx.beginPath();hx.arc(b.x,b.y,b.r,0,TAU);hx.fill();
    hx.globalAlpha=0.85;hx.strokeStyle=k==='strike'?NEON.pink:k==='counter'?NEON.red:k==='special'?NEON.amber:NEON.cyan;hx.lineWidth=1.2;hx.stroke();
    if(cd>0){hx.globalAlpha=0.4;hx.fillStyle=NEON.cyan;hx.beginPath();hx.moveTo(b.x,b.y);hx.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+TAU*(1-clamp(cd,0,1)));hx.fill();}
    hx.globalAlpha=0.9;tx(b.l,b.x,b.y+2.5,b.r>20?8:b.r>14?6:b.r>12?5:4.5,'#ffffff','center');}
  if(TOUCH.move){const m=TOUCH.move;hx.globalAlpha=0.4;hx.strokeStyle=NEON.cyan;hx.beginPath();hx.arc(m.ox,m.oy,34,0,TAU);hx.stroke();
    let dx=m.x-m.ox,dy=m.y-m.oy;const d=Math.hypot(dx,dy);if(d>34){dx*=34/d;dy*=34/d;}hx.globalAlpha=0.6;hx.fillStyle=NEON.cyan;hx.beginPath();hx.arc(m.ox+dx,m.oy+dy,12,0,TAU);hx.fill();}
  else if(G.time<12){hx.globalAlpha=0.3;tx('MOVE',60,UH-60,8,'#ffffff','center');tx('DRAG TO LOOK',UW*0.55,UH-60,7,'#ffffff','center');}
  hx.restore();
}
/* ---- the map: the district from above, cached per build ---- */
let mapCache=null,mapFor=null;
function mapOverlay(){
  const b=WORLD.bounds,W=WORLD.W;if(!b)return;
  const mw=300,mh=200,s=Math.min(mw/(b.x1-b.x0),mh/(b.z1-b.z0)),ox=UW/2-(b.x1-b.x0)*s/2,oz=UH/2-(b.z1-b.z0)*s/2+6;
  const X=x=>ox+(b.x1-x)*s,Z=z=>oz+(b.z1-z)*s;   // north up: the start faces -z
  if(mapFor!==W){mapFor=W;mapCache=document.createElement('canvas');mapCache.width=UW*2;mapCache.height=UH*2;const c=mapCache.getContext('2d');c.scale(2,2);
    const list=WORLD.boxes.filter(o=>o.k==='deck'||o.k==='bridge'||o.k==='tower'||o.k==='pad').sort((p,q)=>p.y1-q.y1);
    for(const o of list){const t=clamp((o.y1-b.minY)/Math.max(1,b.maxY-b.minY),0,1);
      c.fillStyle=o.k==='bridge'?'rgba(46,242,255,.5)':'rgba('+(40+t*80|0)+','+(36+t*60|0)+','+(70+t*90|0)+',.95)';
      c.fillRect(X(o.x1),Z(o.z1),Math.max(1,(o.x1-o.x0)*s),Math.max(1,(o.z1-o.z0)*s));}}
  dim(0.9);
  hx.drawImage(mapCache,0,0,UW,UH);
  gtx('MAP',UW/2,22,12,'#ffffff',NEON.cyan,'center');
  for(const it of WORLD.items){if(it.taken||it.t==='stim')continue;
    const c=it.t==='key'?css(KEYCOL[it.key]):it.t==='shard'?NEON.lime:it.t==='tag'?NEON.pink:NEON.violet;
    hx.fillStyle=c;hx.fillRect(X(it.x)-1.5,Z(it.z)-1.5,3,3);}
  for(const g of WORLD.gates)if(!G.keys[g.key]){hx.strokeStyle=css(KEYCOL[g.key]);hx.lineWidth=1;hx.strokeRect(X(g.x1),Z(g.z1),Math.max(2,(g.x1-g.x0)*s),Math.max(2,(g.z1-g.z0)*s));}
  for(const e of G.ents)if(e.boss&&!e.dead){hx.fillStyle=css(bossInfo(e).color);hx.beginPath();hx.arc(X(e.x),Z(e.z),3.2,0,TAU);hx.fill();}
  else if(!e.dead&&!e.hidden&&e.aware){hx.fillStyle=NEON.red;hx.fillRect(X(e.x)-1,Z(e.z)-1,2,2);}
  const ex=W.exit;if(ex){hx.strokeStyle=uplinkReady()?NEON.lime:'#8a82a8';hx.lineWidth=1.2;hx.beginPath();hx.arc(X(ex.x),Z(ex.z),4,0,TAU);hx.stroke();}
  const px=X(P.x),pz=Z(P.z),a=Math.PI-P.yaw;
  hx.save();hx.translate(px,pz);hx.rotate(a);hx.fillStyle='#ffffff';hx.beginPath();hx.moveTo(0,-5);hx.lineTo(3.5,4);hx.lineTo(-3.5,4);hx.closePath();hx.fill();hx.restore();
  const leg=[['KEY',NEON.cyan],['SHARD',NEON.lime],['TAG',NEON.pink],['RADIO',NEON.violet],['UPLINK','#8a82a8']];
  leg.forEach(([l,c],i)=>{hx.fillStyle=c;hx.fillRect(UW/2-120+i*50,UH-16,4,4);tx(l,UW/2-114+i*50,UH-12,5.5,'#c4bcdc','left',600);});
}
function cutHUD(){
  const C=G.cut;if(!C)return;
  const k=C.i===0?clamp(C.t/0.6,0,1):1;
  hx.globalAlpha=k;
  gtx(C.title,UW/2,UH-58,13,'#ffffff',NEON.pink,'center');
  if(C.sub)tx(C.sub,UW/2,UH-44,7,'#c9c1e2','center',500);
  hx.globalAlpha=0.6;tx(G.touch?'TAP TO SKIP':'ENTER TO SKIP',UW-12,UH-12,6,'#c4bcdc','right',600);hx.globalAlpha=1;
  radioBox();
}

/* ---------------------------------------------------------------- screens */
function titleScreen(){
  sidePanel();
  const fl=0.88+Math.sin(G.clock*9)*0.04+(Math.random()<0.015?-0.4:0);
  hx.globalAlpha=fl;gtx('NEON',38,46,26,'#ffe1f4',NEON.pink);gtx('FURNACE',38,72,26,'#dcfdff',NEON.cyan);hx.globalAlpha=1;
  tx('KESTREL VS. THE WARDEN · FIVE DISTRICTS, FIVE BOSSES',40,85,6.5,'#b8afd6','left',600);
  if(G.scene==='title')drawMenu(menuItems(),104,15,30,310);
  tx(G.touch?'TAP TO CHOOSE':'↑ ↓ OR MOUSE · ENTER TO CHOOSE · M SOUND',40,UH-8,6,'#7d7698','left',600);
}
const MEDAL_NAMES=['NO DAMAGE','ALL SECRETS','PAR TIME','EVERY ENEMY'];
const MEDAL_COLS=[NEON.cyan,NEON.lime,NEON.amber,NEON.pink];
function medal(x,y,i,on){
  hx.fillStyle=on?MEDAL_COLS[i]:'#2a2538';hx.beginPath();
  if(i===0){hx.moveTo(x,y-5);hx.lineTo(x+5,y-2.5);hx.lineTo(x+4,y+3.5);hx.lineTo(x,y+6);hx.lineTo(x-4,y+3.5);hx.lineTo(x-5,y-2.5);}
  else if(i===1){hx.moveTo(x,y-6);hx.lineTo(x+5,y);hx.lineTo(x,y+6);hx.lineTo(x-5,y);}
  else if(i===2)hx.arc(x,y,5.5,0,TAU);
  else for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,r=k%2?2.5:6;hx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}
  hx.closePath();hx.fill();
}
function armoryScreen(){
  sidePanel(250);
  gtx('ARMORY',40,48,18,'#ffffff',NEON.cyan);
  tx('MEDALS '+medalCount()+'/20 · STARS '+starCount()+'/18',40,62,7,'#b8afd6','left',600);
  drawMenu(menuItems(),84,18,30,250);
  hx.fillStyle='rgba(5,4,10,.7)';hx.fillRect(280,40,184,140);
  NF_DISTRICTS.forEach((D,n)=>{const y=58+n*22;tx(D.name,290,y+3,6.5,'#b8afd6','left',600);for(let i=0;i<4;i++)medal(400+i*15,y,i,(SV.medals[n]>>i)&1);});
  MEDAL_NAMES.forEach((m,i)=>{medal(290+(i%2)*90,196+((i/2)|0)*14,i,true);tx(m,298+(i%2)*90,199+((i/2)|0)*14,6,'#b8afd6','left',600);});
  tx('YOUR SUIT IS SHOWN ON KESTREL IN EVERY MODE',40,UH-14,6.5,'#8a82a8','left',600);
}
function upgradesScreen(){
  sidePanel(300);
  gtx('UPGRADES',40,40,16,'#ffffff',NEON.lime);
  const lv=level(),x0=xpFor(lv),x1=xpFor(lv+1),f=clamp((SV.xp-x0)/(x1-x0),0,1);
  tx('LEVEL '+lv+'  ·  '+points()+' POINT'+(points()===1?'':'S')+' TO SPEND',40,53,7,'#b8afd6','left',600);
  hx.fillStyle='rgba(255,255,255,.1)';hx.fillRect(40,57,200,3);hx.fillStyle=NEON.lime;hx.fillRect(40,57,200*f,3);
  tx(fmtNum(SV.xp-x0)+' / '+fmtNum(x1-x0)+' XP TO NEXT LEVEL',40,68,5.5,'#8a82a8','left',600);
  drawMenu(menuItems(),86,14,30,300);
  const it=menuItems()[G.menu];
  hx.fillStyle='rgba(5,4,10,.78)';hx.fillRect(316,70,150,90);
  if(it&&it.up){tx(it.up.cat,324,84,6,NEON.cyan,'left',600);tx(it.up.name,324,97,8,'#ffffff');wrap(it.up.d,324,110,136,6,'#c9c1e2',8.5);}
  else tx('EARN XP FROM EVERY MODE',324,100,6,'#8a82a8','left',600);
}
function logScreen(){
  sidePanel(300);
  gtx('STORY LOG',40,48,18,'#ffffff',NEON.violet);
  tx('ONE GANG RADIO IS HIDDEN IN EACH DISTRICT',40,62,7,'#b8afd6','left',600);
  drawMenu(menuItems(),92,22,30,290);
  const it=menuItems()[G.menu];
  if(it&&it.log!==undefined&&SV.logs[it.log]){hx.fillStyle='rgba(5,4,10,.8)';hx.fillRect(300,70,168,110);hx.fillStyle=NEON.violet;hx.fillRect(300,70,2,110);
    tx(LOGS[it.log].t,310,86,8,'#ffffff');wrap(LOGS[it.log].x,310,102,150,6.2,'#d8d0f0',9);}
}
function scoresScreen(){
  dim(0.82);menuItems();
  gtx('HIGH SCORES',UW/2,32,15,'#ffffff',NEON.amber,'center');
  const T=SV.tables,cols=[['OVERDRIVE',T.od],['DAILY',T.daily.key===nfDaily().key?T.daily.list:[]],['WEEKLY',T.weekly.key===nfWeekly().key?T.weekly.list:[]]];
  cols.forEach(([n,L],c)=>{const x=40+c*140;tx(n,x,54,8,NEON.cyan);
    for(let i=0;i<10;i++){const r=L[i],y=68+i*12;tx(String(i+1).padStart(2,' '),x,y,6.5,'#8a82a8','left',600);
      if(r){tx(r.n,x+16,y,7,'#ffffff');tx(fmtNum(r.v),x+120,y,7,NEON.amber,'right');}else tx('---',x+16,y,7,'#3a3450');}});
  const stars=NF_CHALLENGES.map(C=>{const n=SV.stars[C.id]||0;return C.id.toUpperCase()+' '+'★'.repeat(n)+'☆'.repeat(3-n);}).join('   ');
  tx(stars,UW/2,206,6,'#c4bcdc','center',600);
  menuRects=[{x:UW/2-60,y:UH-30,w:120,h:18,i:0}];
  hx.fillStyle='rgba(255,63,180,.16)';hx.fillRect(UW/2-60,UH-30,120,18);tx('BACK',UW/2,UH-18,10,'#ffffff','center');
}
function tallyScreen(){
  dim(0.82);const t=G.tally;
  gtx('DISTRICT '+(G.level+1)+'  ·  '+t.name,UW/2,34,14,'#ffffff',NEON.pink,'center');
  tx('C L E A R E D',UW/2,47,7,'#8a82a8','center');
  const row=(l,v,y,good)=>{tx(l,UW/2-8,y,9,'#c9c1e2','right');tx(v,UW/2+8,y,9,good?NEON.lime:NEON.cyan);};
  row('ENEMIES',t.ko+'%',66,t.ko>=100);row('SECRETS',t.secrets+'%',79,t.secrets>=100);row('TIME',fmtTime(t.time),92,t.time<=t.par);
  row('PAR',fmtTime(t.par),105,false);row('FLATLINED',String(t.deaths),118,t.deaths===0);row('BONUS','+'+fmtNum(t.bonus),131,t.bonus>0);
  row('SCORE',fmtNum(G.score),144,t.newBest);if(t.newBest)tx('NEW BEST',UW/2+96,144,7,NEON.amber);
  row('XP','+'+fmtNum(t.xp)+'  ·  LEVEL '+level(),157,false);
  for(let i=0;i<4;i++){const x=UW/2-90+i*60,on=(t.medals>>i)&1;medal(x,186,i,on);tx(MEDAL_NAMES[i],x,202,6,on?MEDAL_COLS[i]:'#4c4560','center');if((t.fresh>>i)&1)tx('NEW',x,176,6,'#ffffff','center');}
  if(points()>0)tx(points()+' UPGRADE POINT'+(points()===1?'':'S')+' TO SPEND FROM THE TITLE MENU',UW/2,222,6.5,NEON.lime,'center',600);
  tx((G.touch?'TAP':'PRESS ENTER')+' FOR THE NEXT DISTRICT',UW/2,UH-14,8,'#e6e2f2','center');
}
function endScreen(){
  dim(0.85);
  gtx('THE SPIRE IS DARK',UW/2,64,20,'#ffffff',NEON.cyan,'center');
  tx('The Warden is offline. The city keeps its lights.',UW/2,84,9,'#c9c1e2','center',500);
  const row=(l,v,y)=>{tx(l,UW/2-8,y,9,'#c9c1e2','right');tx(v,UW/2+8,y,9,NEON.cyan);};
  row('ENEMIES DOWN',String(G.totals.kos),112);row('DATA SHARDS',String(G.totals.shards),125);row('TOTAL TIME',fmtTime(G.totals.time),138);row('FINAL SCORE',fmtNum(G.score),151);row('LEVEL',String(level()),164);
  tx('SKILL: '+SKILLS[G.skill].n+'  ·  CHALLENGES, OVERDRIVE, DAILY AND WEEKLY ARE OPEN',UW/2,188,6.5,'#8a82a8','center',600);
  tx(G.touch?'TAP TO CONTINUE':'PRESS ENTER',UW/2,UH-18,8,'#e6e2f2','center');
}
function resultPanel(){
  dim(0.75);const r=G.result;if(!r)return;
  gtx(r.name,UW/2,42,15,'#ffffff',NEON.pink,'center');
  if(r.kind==='challenge'){
    for(let i=0;i<3;i++)gtx(i<r.stars?'★':'☆',UW/2-24+i*24,70,18,i<r.stars?NEON.amber:'#4c4560',NEON.amber,'center');
    tx((r.type==='glide'?r.value.toFixed(1)+' SECONDS':fmtNum(r.value)+' POINTS')+(r.newStars?'  ·  NEW STARS':''),UW/2,86,8,NEON.cyan,'center');
    tx(r.isBest?'NEW BEST':'BEST '+(r.type==='glide'?r.best.toFixed(1)+'s':fmtNum(r.best)),UW/2,98,7,r.isBest?NEON.amber:'#8a82a8','center');
  }else{
    if(r.won)tx('GAUNTLET CLEARED',UW/2,58,8,NEON.lime,'center');
    tx('WAVE '+r.wave+'  ·  '+fmtNum(r.value)+'  ·  '+r.maxCombo+' HIT COMBO',UW/2,72,9,NEON.cyan,'center');
    tx(r.isBest?'NEW BEST':'BEST '+fmtNum(r.best),UW/2,86,7,r.isBest?NEON.amber:'#8a82a8','center');
  }
  drawMenu(menuItems(),128,22,150,UW-150);
  if(G.copied>0)tx('COPIED: '+shareLine(),UW/2,206,6.5,NEON.lime,'center',500);
}
function initialsPanel(){
  dim(0.85);const I=G.initials;if(!I)return;
  gtx('NEW HIGH SCORE',UW/2,62,16,'#ffffff',NEON.amber,'center');
  tx(fmtNum(Math.abs(I.value))+'  ·  ENTER YOUR INITIALS',UW/2,80,8,'#c9c1e2','center');
  for(let i=0;i<3;i++){const x=UW/2-40+i*40,on=i===I.i;
    tx('▲',x,UH/2-12,8,on?NEON.cyan:'#4c4560','center');
    gtx(I.letters[i],x,UH/2+16,24,on?'#ffffff':'#8a82a8',on?NEON.pink:'transparent','center');
    tx('▼',x,UH/2+34,8,on?NEON.cyan:'#4c4560','center');}
  tx(G.touch?'TAP ▲ ▼ TO CHANGE · TAP HERE TO SAVE':'↑ ↓ TO CHANGE · ← → TO MOVE · ENTER TO SAVE',UW/2,UH/2+56,7,'#e6e2f2','center',600);
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
  if(!document.fullscreenElement)el.requestFullscreen&&el.requestFullscreen();else document.exitFullscreen();
});
if(window.matchMedia&&matchMedia('(pointer: coarse)').matches){G.touch=true;document.body.classList.add('nf-touch');}
applyQuality();
resizeCanvas();
if(glInit()){const D=NF_DISTRICTS[0];G.D=D;loadDistrict(0,nfBuild(D),D.theme,D.rain);for(const e of G.ents)if(e.boss)e.hidden=true;}
G.scene='boot';
// A small handle for the automated browser tests.
window.__NF={G,SV,P,CAM,WORLD,IN,startCampaign,startDistrict,startArena,startChallenge,toTitle,hitEnemy,playerDamage,finishDistrict,pause,shareLine,menuItems,AUDIO,
  grappleTarget,beginStrike,tryCounter,trySpecial,makeEnemy,makeBoss,uplinkReady,endCut,radio,initialsDone,throwDisc,useEMP,useSmoke,knockOut,
  // waits in game time; a test has no real mouse, so a lost pointer lock must not leave it paused
  wait:sec=>new Promise(res=>{const t0=G.clock;(function f(){if(G.scene==='paused')G.scene='play';if(G.scene==='cut')endCut();if(G.clock-t0>=sec||['tally','end','result','initials'].includes(G.scene))res();else requestAnimationFrame(f);})();})};
requestAnimationFrame(frame);
