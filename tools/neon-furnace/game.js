/* ------------------------------------------------------------- settings */
const SKILLS=[
 {n:'TOURIST',  d:'half damage, generous pickups',  dmg:0.5, ammo:1.5, spd:0.85, drop:0.45, mult:0.5},
 {n:'STREET',   d:'a fair fight',                   dmg:0.75,ammo:1.2, spd:0.95, drop:0.30, mult:0.75},
 {n:'OPERATOR', d:'the way it is meant to be run',  dmg:1.0, ammo:1.0, spd:1.0,  drop:0.15, mult:1},
 {n:'BLACK ICE',d:'they hit harder and move first', dmg:1.4, ammo:0.8, spd:1.12, drop:0.0,  mult:1.5},
 {n:'FLATLINE', d:'you will not survive this',      dmg:1.9, ammo:0.65,spd:1.25, drop:0.0,  mult:2}
];
const WEAPONS=[
 {name:'SMART PISTOL',view:'pistol', ammo:'bul',use:1,rate:0.30, dmg:[10,16], pellets:1,spread:0.012,snd:'pistol', auto:false,rng:28,recoil:4, shake:0.5,light:0.5,assist:0.06},
 {name:'SCATTERGUN',  view:'shotgun',ammo:'shl',use:1,rate:0.78, dmg:[8,13],  pellets:9,spread:0.11, snd:'shotgun',auto:false,rng:20,recoil:8, shake:2.4,light:1},
 {name:'PULSE RIFLE', view:'rifle',  ammo:'bul',use:1,rate:0.095,dmg:[9,14],  pellets:1,spread:0.045,snd:'rifle',  auto:true, rng:28,recoil:3, shake:0.6,light:0.6},
 {name:'PLASMA ARC',  view:'arc',    ammo:'cel',use:1,rate:0.15, dmg:[22,34], pellets:1,spread:0.01, snd:'arc',    auto:true, rng:30,recoil:4, shake:0.9,light:0.8},
 {name:'RAIL CANNON', view:'rail',   ammo:'cel',use:8,rate:1.15, dmg:[130,170],pellets:1,spread:0,   snd:'rail',   auto:false,rng:60,recoil:12,shake:3.6,light:1,pierce:true}
];
const AMMO_MAX={bul:250,shl:80,cel:400};
const NWEP=WEAPONS.length;

/* ----------------------------------------------------------------- saves
   Progress lives in this browser only. Every read and write is guarded, so
   a private window or blocked storage just means nothing is remembered.  */
const SAVE_KEY='neonfurnace.v1';
const SV=Object.assign({reached:0,snap:null,medals:[0,0,0,0,0],best:[0,0,0,0,0],od:0,odWave:0,
  daily:{key:0,best:0,wave:0},finish:'stock',mus:0.7,sfx:0.8,skill:2,beaten:false},(function(){
  try{return JSON.parse(localStorage.getItem(SAVE_KEY))||{};}catch(e){return{};}
})());
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(SV));}catch(e){}}
try{localStorage.setItem('nf-found','1');}catch(e){}      // reaching the game counts as finding it
const medalCount=()=>SV.medals.reduce((a,m)=>a+((m&1)+((m>>1)&1)+((m>>2)&1)+((m>>3)&1)),0);
function applyFinish(id){
  const f=FINISHES.find(x=>x.id===id)||FINISHES[0];
  WVIEW=buildWeaponViews(f);hudCanvasCache.clear();
}
applyFinish(SV.finish);

/* ----------------------------------------------------------------- state */
const G={
  scene:'title', mode:'campaign', skill:SV.skill, level:0, L:null,
  px:0,py:0,pa:0, hp:100,armor:0, ammo:{bul:50,shl:0,cel:0},
  has:[true,false,false,false,false], keys:{B:false,Y:false,R:false},
  wep:0, pendingWep:-1, cool:0, fireHeld:false, wAnim:0, bob:0, vbob:0, recoil:0,
  grid:null, W:0, H:0, doors:null, ents:[], parts:[],
  kills:0,killsTotal:0, items:0,itemsTotal:0, secrets:0,secretsTotal:0,
  time:0, msg:'', msgT:0, flash:0, flashCol:0, hurtT:0, faceT:0, faceDir:'n',
  god:false, noclip:false, allmap:false, mapOn:false, started:false, locked:false,
  tally:null, totals:{kills:0,items:0,secrets:0,time:0},
  score:0, combo:0, comboT:0, maxCombo:0, pops:[], lastKillT:-9, tookDamage:false, snap:null,
  shake:0, hitstop:0, glitch:0, light:0, beam:0, fightT:0, boss:null,
  wave:0, waveState:'', waveT:0, spawnQ:[], spawnT:0, daily:null, seed:0, odResult:null,
  menu:0, touch:false
};
const rng=mulberry32(0xF00D);

/* Cell classification ---------------------------------------------------- */
const WALLTEX={'=':'pipes','%':'brick','!':'hazard','T':'terminal','N':'signA','G':'window','X':'exit'};
const DOORTEX={'+':'door','b':'doorB','y':'doorY','r':'doorR','o':'doorO'};
const DOORKEY={'b':'B','y':'Y','r':'R','o':'O'};

function arenaLevel(seed){
  return{name:G.mode==='daily'?'DAILY RUN':'OVERDRIVE',par:0,theme:'arena',sky:true,rain:G.mode==='daily',
    fog:[34,0,44],bpm:136,root:43,rows:nfArena(seed)};
}
function loadLevel(n,L){
  L=L||NF_LEVELS[n];
  G.level=n;G.L=L;G.W=L.rows[0].length;G.H=L.rows.length;
  G.grid=new Array(G.W*G.H);G.doors=new Map();
  G.ents=[];G.parts=[];G.pops=[];
  G.kills=G.items=G.secrets=0;G.killsTotal=G.itemsTotal=G.secretsTotal=0;
  G.time=0;G.msg='';G.msgT=0;G.keys={B:false,Y:false,R:false};
  G.combo=0;G.comboT=0;G.tookDamage=false;G.boss=null;G.beam=0;G.glitch=0;G.shake=0;
  const th=THEMES[L.theme]||THEMES.market;
  setFog(L.fog);
  const decoAt=(x,y)=>{
    const h=((x*73856093)^(y*19349663)^((n+7)*83492791))>>>0;
    return h%(L.theme==='market'||L.theme==='roof'?4:6)===0?th.deco[(h>>5)%th.deco.length]:null;
  };
  const open=(x,y)=>{const ch=(L.rows[y]||'')[x];return ch!==undefined&&!NF_WALLS.includes(ch)&&!DOORTEX[ch]&&ch!=='x';};
  for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){
    const ch=L.rows[y][x], i=y*G.W+x;
    const cell={solid:false,door:null,tex:null,floor:th.floor,secret:false,exit:false};
    if(ch==='#'){
      cell.solid=true;cell.tex=th.wall;
      if(open(x+1,y)||open(x-1,y)||open(x,y+1)||open(x,y-1)){const d=decoAt(x,y);if(d)cell.tex=d;}
    }else if(WALLTEX[ch]){
      cell.solid=true;cell.tex=WALLTEX[ch];if(ch==='X')cell.exit=true;
    }else if(DOORTEX[ch]||ch==='x'){
      cell.door={open:0,state:0,need:DOORKEY[ch]||null,secret:ch==='x',t:0};
      cell.tex=ch==='x'?th.wall:DOORTEX[ch];cell.solid=true;
      G.doors.set(i,cell.door);
    }else{
      if(ch===',')cell.floor='grate';
      if(ch===':')cell.floor='tiles';
      if(ch==='~'){cell.floor='runoff';cell.hurt=true;}
      if(ch==='*'){cell.secret=true;G.secretsTotal++;}
      if(ch==='@'){G.px=x+0.5;G.py=y+0.5;G.pa=0;}
      else if(ENEMY_BY_KEY[ch]){spawnEnemy(ENEMY_BY_KEY[ch],x+0.5,y+0.5,false);}
      else if(ITEM[ch]){
        G.ents.push({kind:'item',what:ch,x:x+0.5,y:y+0.5,bob:rng()*TAU,r:0.42});
        if('BYR'.indexOf(ch)<0)G.itemsTotal++;
      }
    }
    G.grid[i]=cell;
  }
  // face the most open direction at the start
  let best=0,bd=-1;
  for(let k=0;k<4;k++){const a=k*Math.PI/2,d=rayWall(G.px,G.py,Math.cos(a),Math.sin(a),40);if(d>bd){bd=d;best=a;}}
  G.pa=best;
  G.cool=0;G.wAnim=0;G.recoil=0;
  msg(G.mode==='campaign'?'LEVEL '+(n+1)+'  ·  '+L.name:L.name);
}
function spawnEnemy(type,x,y,alert){
  const t=ETYPE[type];
  const waveK=G.mode==='campaign'?1:1+G.wave*0.05;
  const e={kind:'enemy',type,x,y,hp:Math.round(t.hp*(0.8+G.skill*0.1)*waveK),hpMax:0,
    state:alert?'chase':'idle',t:0,anim:rng()*2,dead:0,cool:0.6+rng()*1.2,ang:rng()*TAU,pain:0,
    r:t.heavy?0.5:0.34,seen:!!alert,target:null,targetT:0,blinkT:3+rng()*4,burst:0,phase:0,summonT:8};
  e.hpMax=e.hp;
  G.ents.push(e);
  if(G.mode==='campaign')G.killsTotal++;
  if(t.boss)G.boss=e;
  return e;
}
function cellAt(x,y){
  if(x<0||y<0||x>=G.W||y>=G.H)return null;
  return G.grid[(y|0)*G.W+(x|0)];
}
function blocked(x,y){
  const c=cellAt(x,y);
  if(!c)return true;
  if(c.door)return c.door.open<0.55;
  return c.solid;
}
function msg(t){G.msg=t;G.msgT=3.2;}
function pop(text,val){G.pops.push({text,val:val||0,t:0});if(G.pops.length>4)G.pops.shift();}

/* ------------------------------------------------------------ world query */
function rayWall(x,y,dx,dy,maxD){
  let mx=x|0,my=y|0;
  const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9));
  let sx,sy,sdx,sdy;
  if(dx<0){sx=-1;sdx=(x-mx)*ddx;}else{sx=1;sdx=(mx+1-x)*ddx;}
  if(dy<0){sy=-1;sdy=(y-my)*ddy;}else{sy=1;sdy=(my+1-y)*ddy;}
  for(let i=0;i<200;i++){
    let d;
    if(sdx<sdy){d=sdx;sdx+=ddx;mx+=sx;}else{d=sdy;sdy+=ddy;my+=sy;}
    if(d>maxD)return maxD;
    const c=cellAt(mx,my);
    if(!c)return d;
    if(c.door){if(c.door.open<0.55)return d;}
    else if(c.solid)return d;
  }
  return maxD;
}
function losClear(x0,y0,x1,y1){
  const dx=x1-x0,dy=y1-y0,d=Math.hypot(dx,dy);
  if(d<0.001)return true;
  return rayWall(x0,y0,dx/d,dy/d,d)>=d-0.02;
}

/* ------------------------------------------------------------------ input */
const keys={};
let mouseDX=0;
const GAMEKEYS=new Set(['Space','Tab','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
  'KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyM','KeyR','KeyC','KeyP','ShiftLeft','ShiftRight',
  'ControlLeft','ControlRight','Digit1','Digit2','Digit3','Digit4','Digit5','Escape']);
addEventListener('keydown',e=>{
  if(G.started&&GAMEKEYS.has(e.code))e.preventDefault();
  if(e.repeat)return;
  keys[e.code]=true;
  handleKey(e);
});
addEventListener('keyup',e=>{
  if(G.started&&GAMEKEYS.has(e.code))e.preventDefault();
  keys[e.code]=false;
});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;G.fireHeld=false;});

let cheatBuf='';
const CHEATS={
  ironhide(){G.god=!G.god;msg('IRONHIDE '+(G.god?'ON':'OFF'));},
  fullkit(){G.has=[true,true,true,true,true];G.ammo={bul:250,shl:80,cel:400};
            G.keys={B:true,Y:true,R:true};G.armor=200;G.hp=Math.max(G.hp,100);msg('FULL KIT');},
  ghostwalk(){G.noclip=!G.noclip;msg('GHOSTWALK '+(G.noclip?'ON':'OFF'));},
  revealall(){G.allmap=!G.allmap;msg('CARTOGRAPHY '+(G.allmap?'ON':'OFF'));}
};
for(let i=1;i<=5;i++)CHEATS['warp'+i]=()=>{if(G.mode==='campaign')startLevel(i-1,false);};

/* ---- menus: one list model drives keys, mouse and touch alike ---- */
let MENU=[], menuRects=[];
function menuItems(){
  if(G.scene==='title'){
    const d=nfDaily(), odOpen=SV.reached>=1;
    const it=[];
    if(SV.snap)it.push({label:'CONTINUE',sub:'LEVEL '+(SV.snap.level+1)+' · '+NF_LEVELS[SV.snap.level].name,act:continueGame});
    it.push({label:'NEW GAME',sub:SV.beaten?'CAMPAIGN COMPLETE':'FIVE LEVELS, ONE BOSS',act:()=>{G.scene='skill';G.menu=G.skill;}});
    it.push({label:'OVERDRIVE',sub:odOpen?(SV.od?'BEST '+fmtNum(SV.od)+' · WAVE '+SV.odWave:'ENDLESS WAVES'):'FINISH LEVEL 1 TO UNLOCK',lock:!odOpen,act:()=>startArena('overdrive')});
    it.push({label:'DAILY RUN',sub:odOpen?d.label+' · '+d.twist.name+(SV.daily.key===d.key&&SV.daily.best?' · BEST '+fmtNum(SV.daily.best):''):'FINISH LEVEL 1 TO UNLOCK',lock:!odOpen,act:()=>startArena('daily')});
    it.push({label:'ARMORY',sub:'FINISH '+(FINISHES.find(f=>f.id===SV.finish)||FINISHES[0]).name+' · MEDALS '+medalCount()+'/20',act:()=>{G.scene='armory';G.menu=0;}});
    it.push({label:'SOUND',sub:'MUSIC '+Math.round(SV.mus*10)+' · EFFECTS '+Math.round(SV.sfx*10),act:()=>{G.scene='sound';G.menu=0;}});
    return it;
  }
  if(G.scene==='skill')return SKILLS.map((s,i)=>({label:s.n,sub:s.d,act:()=>{G.skill=i;SV.skill=i;save();startCampaign();}}));
  if(G.scene==='armory'){
    const n=medalCount();
    return FINISHES.map(f=>({label:f.name+(SV.finish===f.id?'  ✓':''),sub:n>=f.need?(SV.finish===f.id?'EQUIPPED':'EQUIP'):'NEEDS '+f.need+' MEDALS',lock:n<f.need,
      act:()=>{SV.finish=f.id;save();applyFinish(f.id);AUDIO.play('weapon');}})).concat([{label:'BACK',sub:'',act:()=>{G.scene='title';G.menu=0;}}]);
  }
  if(G.scene==='sound')return[
    {label:'MUSIC',sub:'◂ '+Math.round(SV.mus*10)+' ▸',adj:d=>{SV.mus=clamp(Math.round(SV.mus*10+d)/10,0,1);AUDIO.setVolumes(SV.mus,SV.sfx);save();}},
    {label:'EFFECTS',sub:'◂ '+Math.round(SV.sfx*10)+' ▸',adj:d=>{SV.sfx=clamp(Math.round(SV.sfx*10+d)/10,0,1);AUDIO.setVolumes(SV.mus,SV.sfx);save();AUDIO.play('pickup');}},
    {label:'BACK',sub:'',act:()=>{G.scene='title';G.menu=0;}}];
  if(G.scene==='paused')return[
    {label:'RESUME',sub:'',act:resume},
    {label:'RESTART',sub:G.mode==='campaign'?'FROM THE START OF THIS LEVEL':'A FRESH RUN',act:restart},
    {label:'QUIT TO TITLE',sub:G.mode==='campaign'?'PROGRESS IS SAVED AT EACH LEVEL':'',act:toTitle}];
  if(G.scene==='odresult')return[
    {label:'RETRY',sub:'',act:restart},
    {label:'SHARE RUN',sub:'COPIES YOUR SCORE LINE',act:shareRun},
    {label:'QUIT TO TITLE',sub:'',act:toTitle}];
  return[];
}
function menuMove(d){MENU=menuItems();if(!MENU.length)return;G.menu=(G.menu+d+MENU.length)%MENU.length;AUDIO.play('menu');}
function menuPick(i){
  MENU=menuItems();
  const it=MENU[i===undefined?G.menu:i];
  if(!it)return;
  if(it.lock){AUDIO.play('nope');return;}
  if(it.adj){it.adj(1);return;}
  AUDIO.play('switch');it.act();
}
function menuBack(){
  if(G.scene==='skill'||G.scene==='armory'||G.scene==='sound'){G.scene='title';G.menu=0;AUDIO.play('menu');}
  else if(G.scene==='paused')resume();
}
function handleKey(e){
  const c=e.code;
  if(c==='KeyM'){const m=AUDIO.toggleMute();msg(m?'SOUND OFF':'SOUND ON');return;}
  if(['title','skill','armory','sound','paused','odresult'].includes(G.scene)){
    if(c==='ArrowUp'||c==='KeyW')menuMove(-1);
    else if(c==='ArrowDown'||c==='KeyS')menuMove(1);
    else if(c==='Enter'||c==='Space')menuPick();
    else if(c==='Escape')menuBack();
    else if((c==='ArrowLeft'||c==='KeyA'||c==='ArrowRight'||c==='KeyD')&&G.scene==='sound'){
      MENU=menuItems();const it=MENU[G.menu];if(it&&it.adj)it.adj(c==='ArrowLeft'||c==='KeyA'?-1:1);
    }
    else if(c==='KeyR'&&G.scene==='odresult')restart();
    else if(c==='KeyC'&&G.scene==='odresult')shareRun();
    return;
  }
  if(G.scene==='tally'){if(c==='Enter'||c==='Space')nextLevel();return;}
  if(G.scene==='end'){if(c==='Enter'||c==='Space')toTitle();return;}
  if(G.scene==='dead'){if(c==='Enter'||c==='Space'||c==='KeyR')restart();else if(c==='Escape')toTitle();return;}
  if(G.scene!=='play')return;
  if(/^Key[A-Z]$|^Digit[0-9]$/.test(c)){
    cheatBuf=(cheatBuf+c.replace('Key','').replace('Digit','')).slice(-12).toLowerCase();
    for(const k in CHEATS){if(cheatBuf.endsWith(k)){CHEATS[k]();AUDIO.play('secret');cheatBuf='';return;}}
  }
  if(c==='Tab'){G.mapOn=!G.mapOn;return;}
  if(c==='KeyR'){restart();return;}
  if(c==='KeyP'||(c==='Escape'&&document.pointerLockElement!==cvs)){pause();return;}
  if(c.startsWith('Digit')){
    const n=+c.slice(5)-1;
    if(n>=0&&n<NWEP){if(G.has[n])G.pendingWep=n;else{msg('YOU DO NOT HAVE THAT');AUDIO.play('nope');}}
    return;
  }
  if(c==='KeyQ'){cycleWeapon(1);return;}
  if(c==='KeyE'||c==='Space'){use();return;}
}
function cycleWeapon(dir){
  for(let i=1;i<=NWEP;i++){const n=(G.wep+dir*i+NWEP*2)%NWEP;if(G.has[n]){G.pendingWep=n;return;}}
}

/* ---- mouse ---- */
function toUI(clientX,clientY){
  const r=cvs.getBoundingClientRect();
  return[(clientX-r.left)/r.width*RW,(clientY-r.top)/r.height*RH];
}
function menuHit(ux,uy){for(const m of menuRects)if(ux>=m.x&&ux<=m.x+m.w&&uy>=m.y&&uy<=m.y+m.h)return m;return null;}
function uiClick(ux,uy){
  if(['title','skill','armory','sound','paused','odresult'].includes(G.scene)){
    const m=menuHit(ux,uy);
    if(!m)return;
    G.menu=m.i;MENU=menuItems();const it=MENU[m.i];
    if(it&&it.adj){it.adj(ux<m.x+m.w/2?-1:1);return;}
    menuPick(m.i);
    if(G.scene==='play'&&!G.touch)lockMouse();
    return;
  }
  if(G.scene==='tally'){nextLevel();return;}
  if(G.scene==='end'){toTitle();return;}
  if(G.scene==='dead'){restart();return;}
}
cvs.addEventListener('mousedown',e=>{
  if(G.touch||!G.started)return;
  const [ux,uy]=toUI(e.clientX,e.clientY);
  if(G.scene!=='play'){uiClick(ux,uy);return;}
  if(e.button===0)G.fireHeld=true;
});
cvs.addEventListener('mousemove',e=>{
  if(G.touch||G.scene==='play')return;
  const [ux,uy]=toUI(e.clientX,e.clientY);const m=menuHit(ux,uy);
  if(m&&m.i!==G.menu){G.menu=m.i;}
});
addEventListener('mouseup',e=>{if(e.button===0)G.fireHeld=false;});
cvs.addEventListener('contextmenu',e=>e.preventDefault());
cvs.addEventListener('wheel',e=>{if(G.scene==='play'){cycleWeapon(e.deltaY>0?1:-1);e.preventDefault();}},{passive:false});
addEventListener('mousemove',e=>{if(document.pointerLockElement===cvs)mouseDX+=e.movementX;});
cvs.addEventListener('click',()=>{if(!G.touch&&document.pointerLockElement!==cvs&&G.started&&G.scene==='play')lockMouse();});
function lockMouse(){
  if(G.touch)return;
  try{const p=cvs.requestPointerLock&&cvs.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}
}
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===cvs)G.locked=true;
  else{if(G.locked&&G.scene==='play')pause();G.locked=false;}
});

/* ---- touch: left thumb moves, right thumb looks, buttons on the right ---- */
const TOUCH={move:null,look:null,fire:null,mx:0,my:0};
const TBTN={fire:{x:RW-36,y:VIEW_H-38,r:21},use:{x:RW-84,y:VIEW_H-22,r:13},wpn:{x:RW-30,y:VIEW_H-86,r:13},pause:{x:RW-16,y:16,r:11}};
function inBtn(b,ux,uy){return Math.hypot(ux-b.x,uy-b.y)<=b.r+4;}
function onTouchStart(e){
  if(!G.touch){G.touch=true;document.body.classList.add('nf-touch');}
  if(!G.started)return;
  e.preventDefault();
  for(const t of e.changedTouches){
    const [ux,uy]=toUI(t.clientX,t.clientY);
    if(G.scene!=='play'){TOUCH.tap={id:t.identifier,ux,uy};continue;}
    if(inBtn(TBTN.pause,ux,uy)){pause();continue;}
    if(inBtn(TBTN.fire,ux,uy)){TOUCH.fire=t.identifier;G.fireHeld=true;continue;}
    if(inBtn(TBTN.use,ux,uy)){use();continue;}
    if(inBtn(TBTN.wpn,ux,uy)){cycleWeapon(1);continue;}
    if(ux<RW*0.45&&TOUCH.move===null){TOUCH.move={id:t.identifier,ox:ux,oy:uy,x:ux,y:uy};}
    else if(TOUCH.look===null){TOUCH.look={id:t.identifier,x:t.clientX};}
  }
}
function onTouchMove(e){
  if(!G.started)return;
  e.preventDefault();
  for(const t of e.changedTouches){
    if(TOUCH.move&&t.identifier===TOUCH.move.id){const [ux,uy]=toUI(t.clientX,t.clientY);TOUCH.move.x=ux;TOUCH.move.y=uy;}
    if(TOUCH.look&&t.identifier===TOUCH.look.id){
      const r=cvs.getBoundingClientRect();
      mouseDX+=(t.clientX-TOUCH.look.x)*(900/r.width);TOUCH.look.x=t.clientX;
    }
  }
}
function onTouchEnd(e){
  if(!G.started)return;
  e.preventDefault();
  for(const t of e.changedTouches){
    if(TOUCH.move&&t.identifier===TOUCH.move.id)TOUCH.move=null;
    if(TOUCH.look&&t.identifier===TOUCH.look.id)TOUCH.look=null;
    if(t.identifier===TOUCH.fire){TOUCH.fire=null;G.fireHeld=false;}
    if(TOUCH.tap&&TOUCH.tap.id===t.identifier){const [ux,uy]=toUI(t.clientX,t.clientY);
      if(Math.hypot(ux-TOUCH.tap.ux,uy-TOUCH.tap.uy)<12)uiClick(ux,uy);TOUCH.tap=null;}
  }
}
const screenEl=document.getElementById('screen');
screenEl.addEventListener('touchstart',onTouchStart,{passive:false});
screenEl.addEventListener('touchmove',onTouchMove,{passive:false});
screenEl.addEventListener('touchend',onTouchEnd,{passive:false});
screenEl.addEventListener('touchcancel',onTouchEnd,{passive:false});

/* ------------------------------------------------------- start / progress */
function snapshot(){return{level:G.level,skill:G.skill,hp:G.hp,armor:G.armor,ammo:Object.assign({},G.ammo),has:G.has.slice(),score:G.score};}
function applySnap(s){G.skill=s.skill;G.hp=s.hp;G.armor=s.armor;G.ammo=Object.assign({},s.ammo);G.has=s.has.slice();while(G.has.length<NWEP)G.has.push(false);G.score=s.score;
  G.wep=G.has.lastIndexOf(true);for(let i=NWEP-1;i>=0;i--)if(G.has[i]&&G.ammo[WEAPONS[i].ammo]>=WEAPONS[i].use){G.wep=i;break;}}
function levelMusic(){
  const L=G.L;AUDIO.music.start({bpm:L.bpm,root:L.root,seed:(G.mode==='campaign'?G.level*977+13:G.seed),intensity:G.mode==='campaign'?0:1});
}
function enterPlay(){
  G.scene='play';G.mapOn=false;G.pendingWep=-1;G.fireHeld=false;
  if(!G.touch)lockMouse();
}
function startCampaign(){
  G.mode='campaign';G.score=0;G.totals={kills:0,items:0,secrets:0,time:0};
  G.hp=100;G.armor=0;G.ammo={bul:Math.round(50*SKILLS[G.skill].ammo),shl:0,cel:0};
  G.has=[true,false,false,false,false];G.wep=0;
  startLevel(0,true);
}
function startLevel(n,fresh){
  loadLevel(n);
  G.snap=snapshot();
  if(G.mode==='campaign'){SV.snap=G.snap;save();}
  levelMusic();AUDIO.play('levelup');
  enterPlay();
}
function continueGame(){
  G.mode='campaign';const s=SV.snap;
  applySnap(s);G.totals={kills:0,items:0,secrets:0,time:0};
  loadLevel(s.level);G.snap=snapshot();
  levelMusic();AUDIO.play('levelup');enterPlay();
}
function restart(){
  if(G.mode==='campaign'){
    applySnap(G.snap);loadLevel(G.snap.level);levelMusic();enterPlay();msg('RESTARTED  ·  '+G.L.name);
  }else startArena(G.mode,true);
}
function pause(){if(G.scene!=='play')return;G.scene='paused';G.menu=0;G.fireHeld=false;
  if(document.pointerLockElement===cvs)document.exitPointerLock();}
function resume(){G.scene='play';if(!G.touch)lockMouse();}
function toTitle(){
  G.scene='title';G.menu=0;
  if(document.pointerLockElement===cvs)document.exitPointerLock();
  AUDIO.music.start({title:true,bpm:120,root:45,seed:5});
}
function finishLevel(){
  const L=G.L, n=G.level;
  const pct=(a,b)=>b?Math.round(a/b*100):100;
  const k=pct(G.kills,G.killsTotal),it=pct(G.items,G.itemsTotal),se=pct(G.secrets,G.secretsTotal);
  const medals=(G.tookDamage?0:1)|(se>=100?2:0)|(G.time<=L.par?4:0)|(k>=100?8:0);
  const before=SV.medals[n]||0, fresh=medals&~before;
  // finishing bonuses
  let bonus=0;
  if(G.time<=L.par)bonus+=Math.round((L.par-G.time)*20);
  if(k>=100)bonus+=1000;if(se>=100)bonus+=1000;if(!G.tookDamage)bonus+=2000;
  bonus=Math.round(bonus*SKILLS[G.skill].mult);
  G.score+=bonus;
  const levelScore=G.score-(G.snap?G.snap.score:0);
  G.tally={name:L.name,kills:k,items:it,secrets:se,time:G.time,par:L.par,last:n===NF_LEVELS.length-1,
    medals,fresh,bonus,levelScore,best:Math.max(SV.best[n]||0,levelScore),newBest:levelScore>(SV.best[n]||0)};
  SV.medals[n]=before|medals;SV.best[n]=G.tally.best;
  SV.reached=Math.max(SV.reached,n+1);
  G.totals.kills+=G.kills;G.totals.items+=G.items;G.totals.secrets+=G.secrets;G.totals.time+=G.time;
  if(G.tally.last){SV.beaten=true;SV.snap=null;}
  else{G.hp=Math.max(G.hp,1);G.level=n+1;SV.snap=snapshot();SV.snap.level=n+1;}
  save();
  G.scene='tally';
  AUDIO.play(fresh?'medal':'levelup');
  AUDIO.music.intensity(0);
  if(document.pointerLockElement===cvs)document.exitPointerLock();
}
function nextLevel(){
  if(G.tally&&G.tally.last){G.scene='end';return;}
  startLevel(G.level,false);
}
function playerDied(){
  G.scene='dead';AUDIO.play('dead');G.glitch=1;
  if(G.mode!=='campaign')endArena();
  if(document.pointerLockElement===cvs)document.exitPointerLock();
}

/* ---- Overdrive and the daily run ---- */
function startArena(mode,again){
  G.mode=mode;G.skill=2;G.score=0;G.maxCombo=0;G.wave=0;
  G.daily=mode==='daily'?nfDaily():null;
  G.seed=mode==='daily'?G.daily.seed:((Math.random()*1e9)|0);
  loadLevel(0,arenaLevel(G.seed));
  G.hp=100;G.armor=50;
  G.has=[true,false,false,false,false];
  const loadout=mode==='daily'?G.daily.weapons:[0,1];
  for(const w of loadout)G.has[w]=true;
  G.ammo={bul:120,shl:G.has[1]?30:0,cel:(G.has[3]||G.has[4])?120:0};
  G.wep=loadout[loadout.length-1];
  G.waveState='break';G.waveT=2.5;G.spawnQ=[];
  if(mode==='daily')msg('DAILY '+G.daily.label+'  ·  '+G.daily.twist.name+': '+G.daily.twist.d.toUpperCase());
  else msg('OVERDRIVE  ·  SURVIVE');
  levelMusic();AUDIO.play('levelup');enterPlay();
}
const twist=id=>G.daily&&G.daily.twist.id===id;
function buildWave(n){
  const q=[];let budget=3+n*2.2;
  const cost={drone:1,guard:1.5,hacker:2.5,mech:7};
  if(twist('heavy')&&n%3===0){q.push('mech');budget-=4;}
  if(n>=5&&n%5===0){q.push('mech');budget-=cost.mech;}
  if(twist('ghost')){q.push('hacker');budget-=cost.hacker;}
  const r=mulberry32(G.seed+n*131);
  while(budget>0){
    const roll=r();
    let t=roll<(twist('swarm')?0.62:0.42)?'drone':roll<0.8?'guard':n>=3?'hacker':'guard';
    if(n>=8&&r()<0.05)t='mech';
    q.push(t);budget-=cost[t];
  }
  return q;
}
function freeCellFar(minD){
  for(let i=0;i<200;i++){
    const x=1+((rng()*(G.W-2))|0),y=1+((rng()*(G.H-2))|0),c=cellAt(x,y);
    if(!c||c.solid||c.hurt)continue;
    if(Math.hypot(x+0.5-G.px,y+0.5-G.py)<minD)continue;
    if(G.ents.some(e=>!e.dead&&e.kind==='enemy'&&Math.hypot(e.x-x-0.5,e.y-y-0.5)<1))continue;
    return[x+0.5,y+0.5];
  }
  return[G.W/2,G.H/2];
}
function updateWaves(dt){
  if(G.waveState==='break'){
    G.waveT-=dt;
    if(G.waveT<=0){
      G.wave++;G.spawnQ=buildWave(G.wave);G.spawnT=0.3;G.waveState='fight';
      msg('WAVE '+G.wave);AUDIO.play('alert');
    }
    return;
  }
  if(G.spawnQ.length){
    G.spawnT-=dt;
    if(G.spawnT<=0){
      const t=G.spawnQ.shift(),[x,y]=freeCellFar(7);
      G.ents.push({kind:'warp',x,y,t:0,type:t});
      AUDIO.play('warp',0.5);
      G.spawnT=Math.max(0.25,0.8-G.wave*0.03);
    }
  }
  const alive=G.ents.some(e=>(e.kind==='enemy'&&!e.dead)||e.kind==='warp');
  if(!alive&&!G.spawnQ.length){
    const bonus=G.wave*500*(twist('scav')?2:1);
    G.score+=bonus;pop('WAVE '+G.wave+' CLEARED',bonus);
    AUDIO.play('medal');
    G.waveState='break';G.waveT=5;
    let n=3+Math.floor(G.wave/3);if(twist('scav'))n=Math.ceil(n/2);
    const pool=['h','h','H','v','c','C','s','e','e'];
    for(let i=0;i<n;i++){
      let w=pool[(rng()*pool.length)|0];
      if((w==='s')&&!G.has[1])w='c';if(w==='e'&&!(G.has[3]||G.has[4]))w='C';
      const [x,y]=freeCellFar(2);G.ents.push({kind:'item',what:w,x,y,bob:rng()*TAU,r:0.42,dropped:true});
    }
  }
}
function endArena(){
  const best=G.mode==='daily'?(SV.daily.key===G.daily.key?SV.daily.best:0):SV.od;
  const isBest=G.score>best;
  G.odResult={wave:G.wave,score:G.score,maxCombo:G.maxCombo,best:Math.max(best,G.score),isBest};
  if(G.mode==='daily'){
    if(SV.daily.key!==G.daily.key)SV.daily={key:G.daily.key,best:0,wave:0};
    if(isBest){SV.daily.best=G.score;SV.daily.wave=G.wave;}
  }else if(isBest){SV.od=G.score;SV.odWave=G.wave;}
  save();
  setTimeout(()=>{if(G.scene==='dead'&&G.mode!=='campaign'){G.scene='odresult';G.menu=0;}},1400);
}
function shareLine(){
  const r=G.odResult;if(!r)return'';
  return 'NEON FURNACE · '+(G.mode==='daily'?'DAILY '+G.daily.label:'OVERDRIVE')+' · Wave '+r.wave+' · '+fmtNum(r.score)+' · x'+r.maxCombo+' max';
}
function shareRun(){
  const t=shareLine();
  const done=()=>{G.copied=2.5;AUDIO.play('pickup');};
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,()=>fallbackCopy(t,done));
    else fallbackCopy(t,done);
  }catch(e){fallbackCopy(t,done);}
}
function fallbackCopy(t,done){
  try{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();done();}catch(e){}
}

/* ---------------------------------------------------------------- damage */
function hurtPlayer(dmg,fromAng){
  if(G.god||G.scene!=='play')return;
  let d=dmg*SKILLS[G.skill].dmg*(twist('glass')?2:1);
  if(G.armor>0){const absorbed=Math.min(G.armor,d/3);G.armor-=absorbed;d-=absorbed;}
  G.hp-=d;G.tookDamage=true;G.fightT=4;
  G.flash=Math.min(0.6,0.18+d/80);G.flashCol=0;
  G.glitch=Math.min(1,G.glitch+0.25+d/60);G.shake=Math.max(G.shake,1+d/12);
  G.hurtT=0.8;G.lastDmgDir=fromAng===undefined?G.pa:fromAng;
  AUDIO.play('pain',clamp(d/26,0.35,1));
  if(G.hp<=0){G.hp=0;playerDied();}
}
function sparks(x,y,n,col){
  for(let i=0;i<n;i++)G.parts.push({x,y,vx:(rng()-0.5)*3.4,vy:(rng()-0.5)*3.4,z:0.1+rng()*0.5,vz:0.6+rng()*1.4,
    life:0.3+rng()*0.45,t:0,col:col||(rng()<0.5?'#ffd27a':'#7ae6ff'),sz:1+rng()*1.6});
}

/* ------------------------------------------------------------------ fire */
function rayEnemies(a,maxD){
  const dx=Math.cos(a),dy=Math.sin(a),wallD=rayWall(G.px,G.py,dx,dy,maxD),hits=[];
  for(const e of G.ents){
    if(e.kind!=='enemy'||e.dead)continue;
    const ex=e.x-G.px,ey=e.y-G.py,t=ex*dx+ey*dy;
    if(t<=0.2||t>=wallD)continue;
    if(Math.abs(ex*dy-ey*dx)<ETYPE[e.type].w/64+0.18)hits.push({e,t});
  }
  hits.sort((p,q)=>p.t-q.t);
  return{hits,wallD,dx,dy};
}
function fire(){
  const w=WEAPONS[G.wep];
  if(G.ammo[w.ammo]<w.use){
    AUDIO.play('nope');msg('OUT OF AMMO');
    for(let i=NWEP-1;i>=0;i--)if(G.has[i]&&G.ammo[WEAPONS[i].ammo]>=WEAPONS[i].use){G.pendingWep=i;break;}
    G.cool=0.4;return;
  }
  G.ammo[w.ammo]-=w.use;
  G.cool=w.rate;G.wAnim=w.view==='shotgun'?0.62:w.view==='rail'?0.5:0.16;
  G.recoil=w.recoil;G.shake=Math.max(G.shake,w.shake);G.light=w.light;G.fightT=4;
  AUDIO.play(w.snd);AUDIO.duckFire();
  G.shotKills=0;
  let base=G.pa;
  if(w.assist){                                      // the smart pistol leans onto the nearest target
    let bestA=null,bd=w.assist;
    for(const e of G.ents){if(e.kind!=='enemy'||e.dead)continue;
      const a=Math.atan2(e.y-G.py,e.x-G.px),d=Math.abs(angDiff(a,G.pa));
      if(d<bd&&losClear(G.px,G.py,e.x,e.y)){bd=d;bestA=a;}}
    if(bestA!==null)base=bestA;
  }
  if(w.pierce){
    const R=rayEnemies(base,w.rng);
    for(const h of R.hits){damageEnemy(h.e,w.dmg[0]+rng()*(w.dmg[1]-w.dmg[0]),h.t,'player');sparks(h.e.x,h.e.y,10,'#d6b8ff');}
    G.beam=0.35;AUDIO.play('hitmetal',0.6);
    if(G.shotKills>=2){const b=500*(G.shotKills-1);G.score+=b;pop('RAIL PIERCE ×'+G.shotKills,b);}
  }else{
    for(let i=0;i<w.pellets;i++){
      const a=base+(rng()-0.5)*w.spread*2;
      const R=rayEnemies(a,w.rng);
      if(R.hits.length){
        const h=R.hits[0];
        damageEnemy(h.e,w.dmg[0]+rng()*(w.dmg[1]-w.dmg[0]),h.t,'player');
        sparks(G.px+R.dx*h.t,G.py+R.dy*h.t,3);
        if(i===0)AUDIO.play('hitmetal',0.4);
      }else{
        G.parts.push({x:G.px+R.dx*(R.wallD-0.05),y:G.py+R.dy*(R.wallD-0.05),vx:0,vy:0,z:0.5,vz:0,life:0.2,t:0,col:'#d8f6ff',sz:1.6,puff:true});
        if(i===0)AUDIO.play('hitwall',0.3);
      }
    }
  }
  if(G.shotKills>=2&&!w.pierce){const b=250*G.shotKills;G.score+=b;pop('MULTI KILL ×'+G.shotKills,b);}
  // the noise wakes anything nearby
  for(const e of G.ents)if(e.kind==='enemy'&&!e.dead&&e.state==='idle'&&Math.hypot(e.x-G.px,e.y-G.py)<13){e.state='chase';e.seen=true;}
}
function damageEnemy(e,dmg,dist,by){
  const t=ETYPE[e.type];
  if(twist('glass')&&by==='player')dmg*=2;
  e.hp-=dmg;e.seen=true;
  if(e.state==='idle')e.state='chase';
  if(by&&by!=='player'&&by!==e&&!by.dead&&by.type!==e.type&&!t.boss){e.target=by;e.targetT=6;}
  if(e.hp<=0){killEnemy(e,dist,by);return;}
  if(t.blink&&rng()<0.35)blink(e);
  else if(rng()<t.pain){e.state='pain';e.pain=0.24;AUDIO.play('enemypain',0.45);}
}
function killEnemy(e,dist,by){
  const t=ETYPE[e.type];
  e.dead=1;e.t=0;e.state='dead';
  G.kills++;
  if(t.boss){
    AUDIO.play('bossdie');G.shake=8;G.hitstop=0.45;G.flash=0.7;G.flashCol=1;
    for(const [,d] of G.doors)if(d.need==='O'){d.need=null;d.state=1;}
    msg('THE WARDEN IS OFFLINE  ·  THE CORE LOCK IS OPEN');
    G.boss=null;levelMusic();
    for(const o of G.ents)if(o.kind==='enemy'&&!o.dead&&o.type==='drone')killEnemy(o,5,'chain');
  }else{
    AUDIO.play(t.heavy?'bigdeath':'edeath',0.8);
    G.hitstop=Math.max(G.hitstop,t.heavy?0.11:0.045);
    G.shake=Math.max(G.shake,t.heavy?4:1.2);
  }
  sparks(e.x,e.y,t.heavy?36:16);
  // scoring: combo first, then the style bonuses
  const now=G.time;
  G.combo=G.comboT>0?Math.min(8,G.combo+1):1;G.comboT=3;
  G.maxCombo=Math.max(G.maxCombo,G.combo);
  const mult=(G.mode==='campaign'?SKILLS[G.skill].mult:1)*(twist('scav')?2:1);
  G.score+=Math.round(t.score*G.combo*mult);
  if(G.combo>1)AUDIO.play('combo',G.combo);
  if(by==='player'){
    G.shotKills=(G.shotKills||0)+1;
    if(G.hp<25){G.score+=300;pop('CLOSE CALL',300);}
    if(dist>14){G.score+=200;pop('LONG SHOT',200);}
    if(dist<1.8&&G.wep===1){G.score+=150;pop('POINT BLANK',150);}
  }else if(by&&by!=='chain'){G.score+=300;pop('FRIENDLY FIRE',300);}
  G.lastKillT=now;
  const dr=G.mode==='campaign'?SKILLS[G.skill].drop:0;
  if(dr>0&&rng()<dr){
    const what=rng()<0.5?'h':(e.type==='guard'?'c':e.type==='hacker'?'e':'s');
    G.ents.push({kind:'item',what,x:e.x,y:e.y,bob:rng()*TAU,r:0.42,dropped:true});
  }
}
function blink(e){
  for(let i=0;i<12;i++){
    const a=rng()*TAU,d=2+rng()*2.5,nx=e.x+Math.cos(a)*d,ny=e.y+Math.sin(a)*d;
    if(blocked(nx,ny)||blocked(nx+0.3,ny)||blocked(nx-0.3,ny)||blocked(nx,ny+0.3)||blocked(nx,ny-0.3))continue;
    const c=cellAt(nx,ny);if(c&&c.hurt)continue;
    G.ents.push({kind:'warp',x:e.x,y:e.y,t:0,fx:true});
    e.x=nx;e.y=ny;e.state='chase';e.cool=Math.min(e.cool,0.4);
    AUDIO.play('blink',clamp(3/Math.hypot(e.x-G.px,e.y-G.py),0.15,0.6));
    return;
  }
}
function use(){
  const dx=Math.cos(G.pa),dy=Math.sin(G.pa);
  for(let d=0.4;d<=1.45;d+=0.25){
    const c=cellAt((G.px+dx*d)|0,(G.py+dy*d)|0);
    if(!c)break;
    if(c.exit){AUDIO.play('switch');finishLevel();return;}
    if(c.door){
      const dr=c.door;
      if(dr.need==='O'){msg('THE CORE LOCK HOLDS WHILE THE WARDEN IS ONLINE');AUDIO.play('nope');return;}
      if(dr.need&&!G.keys[dr.need]){msg('YOU NEED THE '+({B:'BLUE',Y:'YELLOW',R:'RED'}[dr.need])+' KEYCARD');AUDIO.play('nope');return;}
      if(dr.state===0){dr.state=1;AUDIO.play('door',0.7);}
      return;
    }
    if(c.solid)break;
  }
  AUDIO.play('nope',0.4);
}

/* ------------------------------------------------------------ move + tick */
function tryMove(nx,ny){
  const r=0.22;
  if(G.noclip){G.px=nx;G.py=ny;return;}
  if(!blocked(nx+Math.sign(nx-G.px)*r,G.py)&&!blocked(nx,G.py-r)&&!blocked(nx,G.py+r))G.px=nx;
  if(!blocked(G.px,ny+Math.sign(ny-G.py)*r)&&!blocked(G.px-r,ny)&&!blocked(G.px+r,ny))G.py=ny;
}
function updatePlayer(dt){
  const run=keys['ShiftLeft']||keys['ShiftRight'];
  let fx=0,sx=0,spdK=run?1:0.62;
  if(keys['KeyW']||keys['ArrowUp'])fx+=1;
  if(keys['KeyS']||keys['ArrowDown'])fx-=1;
  if(keys['KeyA'])sx-=1;
  if(keys['KeyD'])sx+=1;
  if(keys['ArrowLeft'])G.pa-=2.6*dt;
  if(keys['ArrowRight'])G.pa+=2.6*dt;
  if(TOUCH.move){
    const vx=(TOUCH.move.x-TOUCH.move.ox)/26,vy=(TOUCH.move.y-TOUCH.move.oy)/26;
    const m=Math.min(1,Math.hypot(vx,vy));
    if(m>0.15){const k=m/Math.hypot(vx,vy);sx+=vx*k;fx-=vy*k;spdK=Math.max(spdK,m);}
  }
  if(mouseDX){G.pa+=mouseDX*0.0028;mouseDX=0;}
  G.pa=(G.pa+TAU)%TAU;
  if(fx||sx){
    const m=Math.hypot(fx,sx),k=Math.min(1,m)/m;fx*=k;sx*=k;
    const spd=5.4*spdK*dt;
    const ca=Math.cos(G.pa),sa=Math.sin(G.pa);
    tryMove(G.px+(ca*fx-sa*sx)*spd,G.py+(sa*fx+ca*sx)*spd);
    G.bob+=dt*(7+6*spdK);G.vbob=Math.sin(G.bob)*(1.2+1.4*spdK);
  }else G.vbob*=Math.pow(0.001,dt);

  const c=cellAt(G.px,G.py);
  if(c){
    if(c.hurt){
      G.nukeT=(G.nukeT||0)+dt;
      if(G.nukeT>0.85){G.nukeT=0;hurtPlayer(5);AUDIO.play('sizzle',0.6);}
    }else G.nukeT=0;
    if(c.secret&&!c.found){c.found=true;G.secrets++;msg('A SECRET IS REVEALED');AUDIO.play('secret');G.score+=1000;pop('SECRET',1000);}
  }
  if(G.pendingWep>=0&&G.wAnim<=0){G.wep=G.pendingWep;G.pendingWep=-1;AUDIO.play('weapon',0.4);}
  G.cool-=dt;G.wAnim-=dt;G.recoil*=Math.pow(0.02,dt);
  const w=WEAPONS[G.wep];
  const wantFire=G.fireHeld||keys['ControlLeft']||keys['ControlRight'];
  if(wantFire&&G.cool<=0&&(w.auto||!G.firedThisPress)){fire();G.firedThisPress=true;}
  if(!wantFire)G.firedThisPress=false;

  if(G.hurtT>0)G.hurtT-=dt;
  if(G.flash>0)G.flash-=dt*1.8;
  if(G.msgT>0)G.msgT-=dt;
  if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0;}
  if(G.fightT>0)G.fightT-=dt;
  G.faceT-=dt;
  if(G.faceT<=0){G.faceT=1.1+rng();G.faceDir=['n','l','r'][(rng()*3)|0];}
}
function updateDoors(dt){
  for(const [i,d] of G.doors){
    if(d.state===1){d.open=Math.min(1,d.open+dt*1.6);if(d.open>=1){d.state=2;d.t=0;}}
    else if(d.state===2){
      d.t+=dt;
      const occupied=(G.px|0)+(G.py|0)*G.W===i||G.ents.some(e=>e.kind==='enemy'&&!e.dead&&(e.x|0)+((e.y|0)*G.W)===i);
      if(d.t>4.5&&!occupied&&!d.need&&!d.secret){d.state=3;AUDIO.play('door',0.4);}
    }else if(d.state===3){d.open=Math.max(0,d.open-dt*1.1);if(d.open<=0)d.state=0;}
  }
}
function enemyMove(e,dx,dy,dt,k){
  const t=ETYPE[e.type];
  const sp=t.spd*SKILLS[G.skill].spd*(twist('rush')?1.3:1)*(G.mode==='campaign'?1:Math.min(1.35,1+G.wave*0.015))*(k||1)*dt;
  const nx=e.x+dx*sp,ny=e.y+dy*sp,r=e.r;
  let moved=false;
  if(!blocked(nx+Math.sign(dx)*r,e.y)&&!blocked(nx+Math.sign(dx)*r,e.y+r*0.7)&&!blocked(nx+Math.sign(dx)*r,e.y-r*0.7)){e.x=nx;moved=true;}
  if(!blocked(e.x,ny+Math.sign(dy)*r)&&!blocked(e.x+r*0.7,ny+Math.sign(dy)*r)&&!blocked(e.x-r*0.7,ny+Math.sign(dy)*r)){e.y=ny;moved=true;}
  return moved;
}
function shoot(e,kind,a,spd,dmg){
  G.ents.push({kind:'shot',shot:kind,x:e.x+Math.cos(a)*0.5,y:e.y+Math.sin(a)*0.5,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
    dmg,t:0,r:0.2,owner:e,fly:ETYPE[e.type].fly||0.12,splash:kind==='rocket'});
}
function updateEnemies(dt){
  for(const e of G.ents){
    if(e.kind!=='enemy')continue;
    const t=ETYPE[e.type];
    if(e.dead){e.t+=dt;continue;}
    e.anim+=dt;
    // who are we after: the player, or whoever just shot us
    if(e.target&&(e.target.dead||(e.targetT-=dt)<=0))e.target=null;
    const tx=e.target?e.target.x:G.px, ty=e.target?e.target.y:G.py;
    const dx=tx-e.x,dy=ty-e.y,dist=Math.hypot(dx,dy)||0.001;
    if(e.state==='pain'){e.pain-=dt;if(e.pain<=0)e.state='chase';continue;}
    if(e.state==='idle'){
      const pd=Math.hypot(G.px-e.x,G.py-e.y);
      if(pd<15&&losClear(e.x,e.y,G.px,G.py)){
        const toP=Math.atan2(G.py-e.y,G.px-e.x);
        if(Math.abs(angDiff(toP,e.ang))<Math.PI*t.sight||pd<3.5){
          e.state='chase';e.seen=true;AUDIO.play('alert',clamp(1.6/pd,0.08,0.4));
          if(t.boss){AUDIO.music.start({boss:true,bpm:140,root:40,seed:666,intensity:2});msg('THE WARDEN');}
        }
      }
      continue;
    }
    const canSee=losClear(e.x,e.y,tx,ty);
    if(e.state==='attack'){
      e.t-=dt;
      if(e.t<=0){
        e.state='chase';
        if(canSee)enemyAttack(e,t,dx,dy,dist);
        if(e.burst>0){e.burst--;e.state='attack';e.t=0.18;}
      }
      continue;
    }
    // chase
    e.ang=Math.atan2(dy,dx);
    e.cool-=dt;
    if(t.blink){e.blinkT-=dt;if(e.blinkT<=0){e.blinkT=4+rng()*4;if(dist<12)blink(e);}}
    if(t.boss){
      if(e.phase===0&&e.hp<e.hpMax*0.5){e.phase=1;msg('THE WARDEN IS ANGRY');G.shake=5;AUDIO.play('alert');}
      if(e.phase===1){e.summonT-=dt;if(e.summonT<=0){e.summonT=9;for(let k=0;k<2;k++){const [sx,sy]=freeCellFar(4);G.ents.push({kind:'warp',x:sx,y:sy,t:0,type:'drone',boss:true});}AUDIO.play('warp');}}
    }
    if(canSee&&dist<t.rng&&e.cool<=0){
      e.state='attack';e.t=t.kind==='hitscan'?0.4:t.kind==='bolt'?0.3:0.42;
      const base=t.kind==='hitscan'?1.15:t.kind==='bolt'?1.0:t.kind==='rocket'?2.2:t.boss?(e.phase?1.3:2.0):1.5;
      e.cool=base/SKILLS[G.skill].spd;
      if(t.kind==='rocket')e.burst=2;
      continue;
    }
    const want=t.kind==='hitscan'?3.5:t.kind==='bolt'?2.5:t.boss?6:2;
    if(dist>want||!canSee){
      let mx=dx/dist,my=dy/dist;
      if(!canSee){const j=(rng()-0.5)*0.9;mx=Math.cos(e.ang+j);my=Math.sin(e.ang+j);}
      if(t.fly){const s=Math.sin(e.anim*2.3+e.x)*0.7;mx+=-my*s;my+=mx*s;}       // drones weave
      if(!enemyMove(e,mx,my,dt))e.ang+=(rng()-0.5)*2;
    }else if(t.kind==='hitscan'||t.fly){
      const s=Math.sin(e.anim*1.7)>0?1:-1;enemyMove(e,-dy/dist*s,dx/dist*s,dt,0.6);   // strafe
    }
  }
  // spawns arriving through a glitch
  for(const w of G.ents){
    if(w.kind!=='warp')continue;
    w.t+=dt;
    if(w.t>0.55){w.gone=true;if(w.type){const e=spawnEnemy(w.type,w.x,w.y,true);if(w.boss)e.seen=true;}}
  }
  // projectiles
  for(const s of G.ents){
    if(s.kind!=='shot')continue;
    s.t+=dt;
    const nx=s.x+s.vx*dt,ny=s.y+s.vy*dt;
    if(blocked(nx,ny)){s.gone=true;shotBurst(s);continue;}
    s.x=nx;s.y=ny;
    if(Math.hypot(s.x-G.px,s.y-G.py)<0.42){hurtPlayer(s.dmg,Math.atan2(G.py-s.y,G.px-s.x));s.gone=true;shotBurst(s,true);continue;}
    for(const e of G.ents){                  // infighting: stray shots land on other machines
      if(e.kind!=='enemy'||e.dead||e===s.owner||e.type===s.owner.type)continue;
      if(Math.hypot(s.x-e.x,s.y-e.y)<e.r+0.15){damageEnemy(e,s.dmg*1.5,0,s.owner);s.gone=true;shotBurst(s,true);break;}
    }
    if(s.t>6)s.gone=true;
  }
  // pickups
  for(const it of G.ents){
    if(it.kind!=='item'||it.gone)continue;
    it.bob+=dt*3.2;
    if(Math.hypot(it.x-G.px,it.y-G.py)<0.55)tryPickup(it);
  }
  G.ents=G.ents.filter(e=>!e.gone);
  for(const p of G.parts){
    p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    p.vx*=Math.pow(0.08,dt);p.vy*=Math.pow(0.08,dt);
    if(p.vz!==undefined){p.z+=p.vz*dt;p.vz-=4*dt;if(p.z<0){p.z=0;p.vz*=-0.3;}}
  }
  G.parts=G.parts.filter(p=>p.t<p.life);
}
function enemyAttack(e,t,dx,dy,dist){
  const a=Math.atan2(dy,dx), atPlayer=!e.target;
  if(t.kind==='hitscan'){
    AUDIO.play('pistol',0.4);
    const acc=clamp(1.05-dist/22,0.28,0.88);
    // a guard's shot hits whatever is in the way first
    let victim=null,vd=dist;
    for(const o of G.ents){if(o.kind!=='enemy'||o.dead||o===e||o.type===e.type)continue;
      const ox=o.x-e.x,oy=o.y-e.y,tt=(ox*dx+oy*dy)/dist;if(tt<=0.2||tt>=vd)continue;
      if(Math.abs(ox*dy-oy*dx)/dist<o.r){victim=o;vd=tt;}}
    if(victim){if(rng()<0.6)damageEnemy(victim,t.dmg*2,0,e);}
    else if(rng()<acc){if(atPlayer)hurtPlayer(t.dmg,Math.atan2(-dy,-dx));else damageEnemy(e.target,t.dmg*2,0,e);}
  }else if(t.kind==='bolt'){shoot(e,'bolt',a,8.5,t.dmg);AUDIO.play('zap',0.35);}
  else if(t.kind==='lob'){shoot(e,'orb',a,5.6,t.dmg);AUDIO.play('arc',0.35);}
  else if(t.kind==='rocket'){shoot(e,'rocket',a+(rng()-0.5)*0.12,6.5,t.dmg);AUDIO.play('shotgun',0.3);}
  else if(t.boss){
    const n=e.phase?7:5, spread=e.phase?0.9:0.6, kind=e.phase?'bossR':'boss';
    for(let i=0;i<n;i++)shoot(e,kind,a-spread/2+spread*i/(n-1),e.phase?6.5:5.5,t.dmg);
    if(rng()<(e.phase?0.4:0.25))for(let i=0;i<12;i++)shoot(e,kind,i*TAU/12+e.anim,4.2,t.dmg*0.8);
    AUDIO.play('rail',0.5);G.shake=Math.max(G.shake,1.5);
  }
}
function shotBurst(s,hit){
  sparks(s.x,s.y,s.splash?14:5,s.shot==='orb'?'#ff7ad0':s.shot==='bolt'?'#7ae6ff':s.shot==='rocket'?'#ffcf7a':'#d6b8ff');
  AUDIO.play(s.splash?'explode':'zap',clamp(2/Math.hypot(s.x-G.px,s.y-G.py),0.1,0.5));
  if(s.splash){
    const d=Math.hypot(s.x-G.px,s.y-G.py);
    if(d<1.6&&!hit)hurtPlayer(s.dmg*(1-d/1.6),Math.atan2(G.py-s.y,G.px-s.x));
    for(const e of G.ents)if(e.kind==='enemy'&&!e.dead&&e!==s.owner&&e.type!==s.owner.type&&Math.hypot(s.x-e.x,s.y-e.y)<1.6)damageEnemy(e,s.dmg,0,s.owner);
    G.shake=Math.max(G.shake,clamp(4-d,0,3));
  }
}
function tryPickup(e){
  const sk=G.mode==='campaign'?SKILLS[G.skill]:SKILLS[2], w=e.what, I=ITEM[w];
  let took=false,wmsg=false;
  const addAmmo=(k,n)=>{if(G.ammo[k]>=AMMO_MAX[k])return false;G.ammo[k]=Math.min(AMMO_MAX[k],G.ammo[k]+Math.round(n*sk.ammo));return true;};
  const give=(i,k,n)=>{if(!G.has[i]){G.has[i]=true;G.pendingWep=i;wmsg=true;}addAmmo(k,n);took=true;};
  switch(w){
    case 'h': if(G.hp<100){G.hp=Math.min(100,G.hp+12);took=true;} break;
    case 'H': if(G.hp<100){G.hp=Math.min(100,G.hp+28);took=true;} break;
    case 'v': if(G.armor<200){G.armor=Math.min(200,G.armor+10);took=true;} break;
    case 'V': if(G.armor<100){G.armor=Math.max(G.armor,100);took=true;} break;
    case 'c': took=addAmmo('bul',12); break;
    case 'C': took=addAmmo('bul',48); break;
    case 's': took=addAmmo('shl',6);  break;
    case 'S': took=addAmmo('shl',20); break;
    case 'e': took=addAmmo('cel',40); break;
    case 'w': give(1,'shl',10); break;
    case 'W': give(2,'bul',40); break;
    case 'Q': give(3,'cel',60); break;
    case 'L': give(4,'cel',40); break;
    case 'B': case 'Y': case 'R': G.keys[w]=true;took=true; break;
  }
  if(!took)return;
  e.gone=true;
  if('BYR'.indexOf(w)>=0){AUDIO.play('key');G.flash=0.22;G.flashCol=2;}
  else if(wmsg){AUDIO.play('weapon');G.flash=0.18;G.flashCol=2;}
  else{AUDIO.play('pickup');G.flash=0.1;G.flashCol=2;}
  if(!e.dropped&&'BYR'.indexOf(w)<0){G.items++;G.score+=50;}
  msg('PICKED UP  '+I.name.toUpperCase());
}
// How hard the music should push: the number of machines after you, and
// whether you have been shooting or hit in the last few seconds.
function musicIntensity(){
  let chasing=0;
  for(const e of G.ents)if(e.kind==='enemy'&&!e.dead&&(e.state==='chase'||e.state==='attack')&&Math.hypot(e.x-G.px,e.y-G.py)<18)chasing++;
  const hot=G.fightT>0;
  let n=chasing>=4||(chasing>=2&&hot)?2:(chasing>=1||hot)?1:0;
  if(G.mode!=='campaign'&&G.waveState==='fight')n=Math.max(n,G.wave>=3?2:1);
  return n;
}
