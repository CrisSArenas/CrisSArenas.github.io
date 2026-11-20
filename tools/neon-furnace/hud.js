/* ================================== HUD ==================================
   Drawn on a 2D canvas over the world in a fixed 480x270 space. Warnings sit
   over enemies' heads: red means counter it, amber means get out of the way. */
function tx(t,x,y,size,col,align,weight){
  hx.font=(weight||700)+' '+size+'px "JetBrains Mono",ui-monospace,monospace';
  hx.textAlign=align||'left';hx.textBaseline='alphabetic';hx.fillStyle=col;hx.fillText(t,x,y);
}
function gtx(t,x,y,size,col,glow,align){hx.save();hx.shadowColor=glow;hx.shadowBlur=size*0.7;tx(t,x,y,size,col,align);hx.restore();}
const css=c=>'rgb('+(c[0]*255|0)+','+(c[1]*255|0)+','+(c[2]*255|0)+')';

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
  if(S==='play'||S==='paused'||S==='odresult')playHUD(dt);
  if(S==='paused'){dim(0.6);gtx('PAUSED',UW/2,70,20,'#ffffff',NEON.cyan,'center');drawMenu(menuItems(),110,22,140,UW-140);}
  else if(S==='odresult')odPanel();
  else if(S==='title'||S==='boot')titleScreen();
  else if(S==='skill'){sidePanel();gtx('HOW HARD',40,62,18,'#ffffff',NEON.pink);drawMenu(menuItems(),96,24,30,270);tx('ESC TO GO BACK',40,UH-18,7,'#8a82a8');}
  else if(S==='armory')armoryScreen();
  else if(S==='sound'){sidePanel();gtx('SETTINGS',40,62,18,'#ffffff',NEON.cyan);drawMenu(menuItems(),100,24,30,270);tx('← → TO ADJUST · THE MUSIC IS COMPOSED LIVE, NO FILES',40,UH-18,7,'#8a82a8');}
  else if(S==='tally')tallyScreen();
  else if(S==='end')endScreen();
}
function dim(a){hx.fillStyle='rgba(5,4,10,'+a+')';hx.fillRect(0,0,UW,UH);}
function sidePanel(){const g=hx.createLinearGradient(0,0,320,0);g.addColorStop(0,'rgba(5,4,10,.88)');g.addColorStop(1,'rgba(5,4,10,0)');hx.fillStyle=g;hx.fillRect(0,0,320,UH);}
function drawMenu(items,y0,rowH,x0,x1){
  menuRects=[];if(G.menu>=items.length)G.menu=0;
  items.forEach((it,i)=>{
    const y=y0+i*rowH,on=i===G.menu;
    menuRects.push({x:x0,y:y-rowH+6,w:x1-x0,h:rowH,i});
    if(on){hx.fillStyle='rgba(255,63,180,.16)';hx.fillRect(x0,y-rowH+6,x1-x0,rowH-2);hx.fillStyle=NEON.pink;hx.fillRect(x0,y-rowH+6,2,rowH-2);}
    tx(it.label,x0+12,y,13,it.lock?'#4c4560':on?'#ffffff':'#c9c1e2');
    if(it.sub)tx(it.sub,x1-8,y,7.5,it.lock?'#4c4560':on?NEON.cyan:'#7d7698','right',600);
  });
}

/* ---------------------------------------------------------------- in play */
function playHUD(dt){
  // warnings over heads, and the grapple point you would take
  for(const e of G.ents){
    if(e.dead)continue;
    const top=e.y+(e.type==='mech'?3.8:e.type==='warden'?3:e.fly?0.9:2.25);
    const p=toScreen(e.x,top,e.z);if(!p||p[2]>45)continue;
    if(e.state==='windup'){
      const k=1+0.25*Math.sin(G.clock*30);
      if(e.counterable){hx.fillStyle=NEON.red;
        for(const dx of [-5,5]){hx.beginPath();hx.moveTo(p[0]+dx-4*k,p[1]-9);hx.lineTo(p[0]+dx,p[1]-3);hx.lineTo(p[0]+dx+4*k,p[1]-9);hx.lineTo(p[0]+dx+4*k,p[1]-6);hx.lineTo(p[0]+dx,p[1]);hx.lineTo(p[0]+dx-4*k,p[1]-6);hx.fill();}}
      else{hx.strokeStyle=NEON.amber;hx.lineWidth=1.6;hx.beginPath();hx.arc(p[0],p[1]-5,5*k,0,TAU);hx.stroke();tx('!',p[0],p[1]-2,7,NEON.amber,'center');}
    }else if(e.state==='blind'||(e.state==='idle'&&isTakedown(e)&&Math.hypot(e.x-P.x,e.z-P.z)<6)){
      tx(e.state==='blind'?'?':'TAKEDOWN',p[0],p[1]-3,e.state==='blind'?9:6,'#d6cfee','center');
    }else if(e.state==='stun'){tx('~',p[0],p[1]-3,10,NEON.cyan,'center');}
  }
  if(P.state==='move'&&!P.grap){const a=grappleTarget();if(a){const p=toScreen(a.x,a.y,a.z);if(p){
    hx.strokeStyle=NEON.cyan;hx.lineWidth=1.4;hx.beginPath();hx.moveTo(p[0],p[1]-7);hx.lineTo(p[0]+7,p[1]);hx.lineTo(p[0],p[1]+7);hx.lineTo(p[0]-7,p[1]);hx.closePath();hx.stroke();
    if(!G.touch)tx('E',p[0],p[1]+17,7,NEON.cyan,'center');}}}
  // objective compass
  const ob=objective();
  if(ob){
    const oy=Math.atan2(ob.x-P.x,ob.z-P.z),off=clamp(-angDiff(oy,CAM.yaw)/(Math.PI/2),-1,1),d=Math.hypot(ob.x-P.x,ob.z-P.z);
    hx.fillStyle='rgba(5,4,10,.45)';hx.fillRect(UW/2-90,8,180,4);
    hx.fillStyle=ob.c?css(ob.c):NEON.lime;hx.fillRect(UW/2+off*88-2,6,4,8);
    tx(ob.label+'  ·  '+Math.round(d)+' M',UW/2,25,7.5,'#e6e2f2','center');
  }
  if(G.mode!=='campaign'){tx('WAVE '+G.wave,12,20,12,NEON.amber);const left=G.ents.filter(e=>!e.dead).length+G.spawnQ.length;tx(left+' LEFT',12,31,7,'#c4bcdc');
    if(G.waveState==='break'&&G.wave>0)gtx('NEXT WAVE IN '+Math.ceil(G.waveT),UW/2,70,12,'#ffffff',NEON.cyan,'center');}
  if(G.msgT>0&&G.msg){hx.globalAlpha=clamp(G.msgT,0,1);gtx(G.msg,UW/2,G.boss&&G.boss.aware&&!G.boss.dead?74:48,10,'#ffffff',NEON.pink,'center');hx.globalAlpha=1;}
  // style pops
  let y=G.boss&&G.boss.aware&&!G.boss.dead?96:86;
  for(const p of G.pops){const a=clamp(2.2-p.t,0,1);hx.globalAlpha=a;tx(p.text+(p.val?'  '+(p.val>0?'+':'')+fmtNum(p.val):''),UW/2,y-Math.min(5,p.t*7),8,p.val<0?NEON.red:NEON.amber,'center');hx.globalAlpha=1;y+=11;}
  // score and combo
  const sx=UW-(G.touch?36:12);
  tx(fmtNum(G.score),sx,20,11,'#f2eefc','right');
  if(G.combo>1){
    gtx(G.combo+' HITS',sx,40,14,'#ffffff',NEON.pink,'right');
    tx('×'+comboMult(),sx,52,9,NEON.cyan,'right');
    hx.fillStyle='rgba(255,63,180,.25)';hx.fillRect(sx-60,56,60,2);hx.fillStyle=NEON.pink;hx.fillRect(sx-60*clamp(G.comboT/1.8,0,1),56,60*clamp(G.comboT/1.8,0,1),2);
  }
  // health, keys, shards
  const hp=clamp(P.hp/100,0,1);
  hx.fillStyle='rgba(5,4,10,.55)';hx.fillRect(10,UH-24,128,12);
  for(let i=0;i<10;i++){const f=clamp(hp*10-i,0,1);hx.fillStyle=f>0?(hp>0.5?NEON.cyan:hp>0.25?NEON.amber:NEON.red):'rgba(255,255,255,.08)';hx.fillRect(12+i*12.4,UH-22,11*Math.max(f,f>0?1:1),8);if(f<1&&f>0){hx.fillStyle='rgba(5,4,10,.6)';hx.fillRect(12+i*12.4+11*f,UH-22,11*(1-f),8);}}
  tx('HP '+Math.ceil(P.hp),12,UH-28,7,'#c4bcdc');
  let kx=146;
  for(const k of districtKeys()){hx.fillStyle=G.keys[k]?css(KEYCOL[k]):'rgba(255,255,255,.12)';hx.fillRect(kx,UH-22,8,8);kx+=11;}
  if(G.mode==='campaign'&&G.shardTotal)tx('◆ '+G.shards+'/'+G.shardTotal,kx+4,UH-14,7,NEON.lime);
  if(G.boss&&G.boss.aware&&!G.boss.dead){const b=G.boss,w=220,f=clamp(b.hp/b.hpMax,0,1);
    tx('THE WARDEN',UW/2,38,8,b.phase===2?NEON.red:NEON.violet,'center');
    hx.fillStyle='rgba(5,4,10,.7)';hx.fillRect(UW/2-w/2-1,41,w+2,6);hx.fillStyle=b.phase===2?NEON.red:NEON.violet;hx.fillRect(UW/2-w/2,42,w*f,4);
    tx(b.grounded||b.state==='stun'?'IT IS DOWN · HIT IT NOW':'IT CAN ONLY BE HURT ON THE GROUND · EMP IT OR WAIT FOR THE SLAM',UW/2,56,6,b.grounded||b.state==='stun'?NEON.lime:'#c4bcdc','center',600);}
  // gadgets
  if(!G.touch){
    const gd=[['DISC','Q',P.disc?1:P.cdDisc/0.5],['EMP','F',P.cdEmp/9],['SMOKE','C',P.cdSmoke/12]];
    gd.forEach(([n,k,c],i)=>{const x=UW-150+i*48,yy=UH-28;hx.fillStyle='rgba(5,4,10,.55)';hx.fillRect(x,yy,42,18);
      const r=clamp(c,0,1);hx.fillStyle='rgba(46,242,255,.25)';hx.fillRect(x,yy,42*(1-r),18);
      tx(n,x+21,yy+9,6.5,r>0?'#7d7698':'#ffffff','center');tx(k,x+21,yy+16,6,NEON.cyan,'center',500);});
  }
  if(P.state==='down')gtx('FLATLINED',UW/2,UH/2,26,'#ffffff',NEON.red,'center');
  if(G.touch&&G.scene==='play')touchHUD();
}
function touchHUD(){
  hx.save();
  for(const k in TBTN){const b=TBTN[k];
    const cd=k==='disc'?(P.disc?1:P.cdDisc/0.5):k==='emp'?P.cdEmp/9:k==='smoke'?P.cdSmoke/12:0;
    hx.globalAlpha=0.32;hx.fillStyle='#000';hx.beginPath();hx.arc(b.x,b.y,b.r,0,TAU);hx.fill();
    hx.globalAlpha=0.85;hx.strokeStyle=k==='strike'?NEON.pink:k==='counter'?NEON.red:NEON.cyan;hx.lineWidth=1.2;hx.stroke();
    if(cd>0){hx.globalAlpha=0.4;hx.fillStyle=NEON.cyan;hx.beginPath();hx.moveTo(b.x,b.y);hx.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+TAU*(1-clamp(cd,0,1)));hx.fill();}
    hx.globalAlpha=0.9;tx(b.l,b.x,b.y+2.5,b.r>20?8:b.r>14?6:5,'#ffffff','center');}
  if(TOUCH.move){const m=TOUCH.move;hx.globalAlpha=0.4;hx.strokeStyle=NEON.cyan;hx.beginPath();hx.arc(m.ox,m.oy,34,0,TAU);hx.stroke();
    let dx=m.x-m.ox,dy=m.y-m.oy;const d=Math.hypot(dx,dy);if(d>34){dx*=34/d;dy*=34/d;}hx.globalAlpha=0.6;hx.fillStyle=NEON.cyan;hx.beginPath();hx.arc(m.ox+dx,m.oy+dy,12,0,TAU);hx.fill();}
  else{hx.globalAlpha=0.3;tx('MOVE',60,UH-60,8,'#ffffff','center');tx('DRAG TO LOOK',UW*0.55,UH-60,7,'#ffffff','center');}
  hx.restore();
}

/* ---------------------------------------------------------------- screens */
function titleScreen(){
  sidePanel();
  const fl=0.88+Math.sin(G.clock*9)*0.04+(Math.random()<0.015?-0.4:0);
  hx.globalAlpha=fl;gtx('NEON',38,56,30,'#ffe1f4',NEON.pink);gtx('FURNACE',38,86,30,'#dcfdff',NEON.cyan);hx.globalAlpha=1;
  tx('A ROGUE AI HAS TAKEN THE TOWER. TAKE IT BACK.',40,101,7,'#b8afd6',600);
  if(G.scene==='title')drawMenu(menuItems(),128,19,30,300);
  tx(G.touch?'TAP TO CHOOSE':'↑ ↓ OR MOUSE · ENTER TO CHOOSE · M SOUND',40,UH-14,6.5,'#7d7698',600);
}
const MEDAL_NAMES=['NO DAMAGE','ALL SHARDS','PAR TIME','EVERY ENEMY'];
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
  sidePanel();
  gtx('ARMORY',40,54,18,'#ffffff',NEON.cyan);
  tx('MEDALS '+medalCount()+' OF 20 UNLOCK NEW SUITS',40,68,7,'#b8afd6',600);
  drawMenu(menuItems(),96,19,30,250);
  hx.fillStyle='rgba(5,4,10,.7)';hx.fillRect(280,40,184,140);
  NF_DISTRICTS.forEach((D,n)=>{const y=58+n*22;tx(D.name,290,y+3,6.5,'#b8afd6',600);for(let i=0;i<4;i++)medal(400+i*15,y,i,(SV.medals[n]>>i)&1);});
  MEDAL_NAMES.forEach((m,i)=>{medal(290+(i%2)*90,196+((i/2)|0)*14,i,true);tx(m,298+(i%2)*90,199+((i/2)|0)*14,6,'#b8afd6',600);});
}
function tallyScreen(){
  dim(0.82);const t=G.tally;
  gtx('DISTRICT '+(G.level+1)+'  ·  '+t.name,UW/2,38,14,'#ffffff',NEON.pink,'center');
  tx('C L E A R E D',UW/2,52,7,'#8a82a8','center');
  const row=(l,v,y,good)=>{tx(l,UW/2-8,y,10,'#c9c1e2','right');tx(v,UW/2+8,y,10,good?NEON.lime:NEON.cyan);};
  row('ENEMIES',t.ko+'%',76,t.ko>=100);row('DATA SHARDS',t.sh+'%',90,t.sh>=100);row('TIME',fmtTime(t.time),104,t.time<=t.par);
  row('PAR',fmtTime(t.par),118,false);row('FLATLINED',String(t.deaths),132,t.deaths===0);row('BONUS','+'+fmtNum(t.bonus),146,t.bonus>0);
  row('SCORE',fmtNum(G.score),160,t.newBest);if(t.newBest)tx('NEW BEST',UW/2+96,160,7,NEON.amber);
  for(let i=0;i<4;i++){const x=UW/2-90+i*60,on=(t.medals>>i)&1;medal(x,190,i,on);tx(MEDAL_NAMES[i],x,206,6,on?MEDAL_COLS[i]:'#4c4560','center');if((t.fresh>>i)&1)tx('NEW',x,180,6,'#ffffff','center');}
  tx((G.touch?'TAP':'PRESS ENTER')+(t.last?' FOR THE ENDING':' FOR THE NEXT DISTRICT'),UW/2,UH-18,8,'#e6e2f2','center');
}
function endScreen(){
  dim(0.85);
  gtx('THE SPIRE IS DARK',UW/2,70,20,'#ffffff',NEON.cyan,'center');
  tx('The Warden is offline. The city keeps its lights.',UW/2,90,9,'#c9c1e2','center',500);
  const row=(l,v,y)=>{tx(l,UW/2-8,y,9,'#c9c1e2','right');tx(v,UW/2+8,y,9,NEON.cyan);};
  row('ENEMIES DOWN',String(G.totals.kos),118);row('DATA SHARDS',String(G.totals.shards),131);row('TOTAL TIME',fmtTime(G.totals.time),144);row('FINAL SCORE',fmtNum(G.score),157);
  tx('SKILL: '+SKILLS[G.skill].n+'  ·  OVERDRIVE AND THE DAILY RUN ARE OPEN',UW/2,182,7,'#8a82a8','center',600);
  tx(G.touch?'TAP TO CONTINUE':'PRESS ENTER',UW/2,UH-18,8,'#e6e2f2','center');
}
function odPanel(){
  dim(0.75);const r=G.odResult;if(!r)return;
  gtx(G.mode==='daily'?'DAILY '+G.daily.label:'OVERDRIVE',UW/2,46,16,'#ffffff',NEON.pink,'center');
  tx('WAVE '+r.wave+'  ·  '+fmtNum(r.score)+'  ·  '+r.maxCombo+' HIT COMBO',UW/2,68,10,NEON.cyan,'center');
  tx(r.isBest?'NEW BEST':'BEST '+fmtNum(r.best),UW/2,82,8,r.isBest?NEON.amber:'#8a82a8','center');
  drawMenu(menuItems(),118,22,150,UW-150);
  if(G.copied>0)tx('COPIED: '+shareLine(),UW/2,196,6.5,NEON.lime,'center',500);
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
// phones start at a lighter render resolution; the frame-rate watch lowers it further if needed
if(window.matchMedia&&matchMedia('(pointer: coarse)').matches){G.touch=true;document.body.classList.add('nf-touch');renderScale=Math.min(renderScale,0.7);}
resizeCanvas();
if(glInit()){const D=NF_DISTRICTS[0];G.D=D;loadDistrict(0,nfBuild(D),D.theme,D.rain);}
G.scene='boot';
// A small handle for the automated browser tests.
window.__NF={G,SV,P,CAM,WORLD,IN,startCampaign,startDistrict,startArena,toTitle,hitEnemy,playerDamage,finishDistrict,pause,shareLine,menuItems,AUDIO,
  grappleTarget,beginStrike,tryCounter,makeEnemy,uplinkReady,
  // waits in game time; a test has no real mouse, so a lost pointer lock must not leave it paused
  wait:sec=>new Promise(res=>{const t0=G.clock;(function f(){if(G.scene==='paused')G.scene='play';if(G.clock-t0>=sec||['tally','end','odresult'].includes(G.scene))res();else requestAnimationFrame(f);})();})};
requestAnimationFrame(frame);
