/* ================================= GAME ================================== */
const SKILLS=[
 {n:'TOURIST',  d:'gentle hits, generous stims',     dmg:0.5, spd:0.85,drop:0.45,mult:0.5},
 {n:'STREET',   d:'a fair fight',                    dmg:0.75,spd:0.95,drop:0.3, mult:0.75},
 {n:'OPERATOR', d:'the way it is meant to be played',dmg:1.0, spd:1.0, drop:0.15,mult:1},
 {n:'BLACK ICE',d:'they hit harder and act first',   dmg:1.4, spd:1.12,drop:0.05,mult:1.5},
 {n:'FLATLINE', d:'three attack at once',            dmg:1.9, spd:1.25,drop:0,   mult:2}
];
const FINISHES=[{id:'stock',name:'STOCK',need:0},{id:'chrome',name:'CHROME',need:4},{id:'toxic',name:'TOXIC',need:8},{id:'gold',name:'GOLD',need:12},{id:'glitch',name:'GLITCH',need:20}];

/* ----------------------------------------------------------------- saves */
const SAVE_KEY='neonfurnace.v2';
const SV=Object.assign({reached:0,cont:null,medals:[0,0,0,0,0],best:[0,0,0,0,0],od:0,odWave:0,
  daily:{key:0,best:0,wave:0},finish:'stock',mus:0.7,sfx:0.8,skill:2,beaten:false,sens:5},(function(){
  try{return JSON.parse(localStorage.getItem(SAVE_KEY))||{};}catch(e){return{};}})());
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(SV));}catch(e){}}
try{localStorage.setItem('nf-found','1');}catch(e){}       // reaching the game counts as finding it
const medalCount=()=>SV.medals.reduce((a,m)=>a+((m&1)+((m>>1)&1)+((m>>2)&1)+((m>>3)&1)),0);

/* ----------------------------------------------------------------- state */
const G={scene:'boot',mode:'campaign',skill:SV.skill,level:0,D:null,time:0,clock:0,
  ents:[],shots:[],sparks:[],rings:[],smoke:[],warps:[],hitFlash:[],tokens:0,
  score:0,combo:0,comboT:0,maxCombo:0,chain:0,pops:[],kos:0,enemyTotal:0,keys:{},shards:0,shardTotal:0,
  tookDamage:false,hitstop:0,slow:0,hurt:0,glitch:0,noise:0,boss:null,msg:'',msgT:0,
  wave:0,waveState:'',waveT:0,spawnQ:[],spawnT:0,daily:null,seed:0,odResult:null,copied:0,totals:{kos:0,shards:0,time:0},
  tally:null,menu:0,started:false,locked:false,touch:false,god:false};
const twist=id=>!!(G.daily&&G.daily.twist.id===id);
function msg(t){G.msg=t;G.msgT=3.2;}
function pop(text,val){G.pops.push({text,val,t:0});if(G.pops.length>4)G.pops.shift();}
function award(v,label){
  if(v>0&&G.mode==='campaign')v*=SKILLS[G.skill].mult;
  G.score=Math.max(0,G.score+Math.round(v));
  if(label)pop(label,Math.round(v));
}

/* ------------------------------------------------------------------ input */
const IN={mx:0,mz:0,jump:false,jumpP:false,strikeP:false,counterP:false,dashP:false,grappleP:false,discP:false,empP:false,smokeP:false};
const keys={};
let lookDX=0,lookDY=0;
const GAMEKEYS=new Set(['Space','Tab','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyF','KeyC','KeyJ','KeyK','KeyM','KeyR','KeyP','ShiftLeft','ShiftRight','Escape']);
addEventListener('keydown',e=>{
  if(G.started&&GAMEKEYS.has(e.code))e.preventDefault();
  if(e.repeat)return;
  keys[e.code]=true;handleKey(e);
});
addEventListener('keyup',e=>{if(G.started&&GAMEKEYS.has(e.code))e.preventDefault();keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
let cheatBuf='';
const CHEATS={ironhide(){G.god=!G.god;msg('IRONHIDE '+(G.god?'ON':'OFF'));},
  allkeys(){for(const g of WORLD.gates){G.keys[g.key]=true;g.opening=true;}msg('ALL KEYS');}};
for(let i=1;i<=5;i++)CHEATS['warp'+i]=()=>{if(G.mode==='campaign')startDistrict(i-1);};

function handleKey(e){
  const c=e.code;
  if(c==='KeyM'){const m=AUDIO.toggleMute();msg(m?'SOUND OFF':'SOUND ON');return;}
  if(MENU_SCENES.has(G.scene)){
    if(c==='ArrowUp'||c==='KeyW')menuMove(-1);
    else if(c==='ArrowDown'||c==='KeyS')menuMove(1);
    else if(c==='Enter'||c==='Space')menuPick();
    else if(c==='Escape')menuBack();
    else if((c==='ArrowLeft'||c==='KeyA'||c==='ArrowRight'||c==='KeyD')){const it=menuItems()[G.menu];if(it&&it.adj)it.adj(c==='ArrowLeft'||c==='KeyA'?-1:1);}
    else if(c==='KeyR'&&G.scene==='odresult')restart();
    else if(c==='KeyC'&&G.scene==='odresult')shareRun();
    return;
  }
  if(G.scene==='tally'){if(c==='Enter'||c==='Space')nextDistrict();return;}
  if(G.scene==='end'){if(c==='Enter'||c==='Space')toTitle();return;}
  if(G.scene!=='play')return;
  if(/^Key[A-Z]$|^Digit[0-9]$/.test(c)){cheatBuf=(cheatBuf+c.replace('Key','').replace('Digit','')).slice(-12).toLowerCase();
    for(const k in CHEATS)if(cheatBuf.endsWith(k)){CHEATS[k]();AUDIO.play('secret');cheatBuf='';return;}}
  if(c==='Space')IN.jumpP=true;
  if(c==='ShiftLeft'||c==='ShiftRight')IN.dashP=true;
  if(c==='KeyE')IN.grappleP=true;
  if(c==='KeyJ')IN.strikeP=true;
  if(c==='KeyK')IN.counterP=true;
  if(c==='KeyQ')IN.discP=true;
  if(c==='KeyF')IN.empP=true;
  if(c==='KeyC')IN.smokeP=true;
  if(c==='KeyR')restart();
  if(c==='KeyP'||(c==='Escape'&&document.pointerLockElement!==cvs))pause();
}
function readKeys(){
  if(TOUCH.move){
    const vx=(TOUCH.move.x-TOUCH.move.ox)/34,vy=(TOUCH.move.y-TOUCH.move.oy)/34,m=Math.hypot(vx,vy);
    if(m>0.15){const k=Math.min(1,m)/m;IN.mx=vx*k;IN.mz=-vy*k;}else{IN.mx=IN.mz=0;}
  }else{
    IN.mz=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
    IN.mx=(keys.KeyD?1:0)-(keys.KeyA?1:0);
  }
  IN.jump=!!(keys.Space||TOUCH.jumpHeld);
  if(keys.ArrowLeft)lookDX-=14;if(keys.ArrowRight)lookDX+=14;
}
function clearEdges(){for(const k in IN)if(k.endsWith('P'))IN[k]=false;}

/* ---- mouse ---- */
function toUI(cx,cy){const r=hud.getBoundingClientRect();return[(cx-r.left)/r.width*UW,(cy-r.top)/r.height*UH];}
let menuRects=[];
function menuHit(ux,uy){for(const m of menuRects)if(ux>=m.x&&ux<=m.x+m.w&&uy>=m.y&&uy<=m.y+m.h)return m;return null;}
function uiClick(ux,uy){
  if(MENU_SCENES.has(G.scene)){
    const m=menuHit(ux,uy);if(!m)return;G.menu=m.i;const it=menuItems()[m.i];
    if(it&&it.adj){it.adj(ux<m.x+m.w/2?-1:1);return;}
    menuPick(m.i);return;
  }
  if(G.scene==='tally')nextDistrict();
  else if(G.scene==='end')toTitle();
}
const screenEl=document.getElementById('screen');
screenEl.addEventListener('mousedown',e=>{
  if(G.touch||!G.started)return;
  const [ux,uy]=toUI(e.clientX,e.clientY);
  if(G.scene!=='play'){uiClick(ux,uy);return;}
  if(document.pointerLockElement!==cvs){lockMouse();return;}
  if(e.button===0)IN.strikeP=true;
  if(e.button===2)IN.counterP=true;
});
screenEl.addEventListener('mousemove',e=>{
  if(G.touch||G.scene==='play')return;
  const [ux,uy]=toUI(e.clientX,e.clientY);const m=menuHit(ux,uy);if(m)G.menu=m.i;
});
screenEl.addEventListener('contextmenu',e=>e.preventDefault());
// Browsers can report one huge jump at the moment the pointer is captured; skip it.
let lockedAt=0;
addEventListener('mousemove',e=>{if(document.pointerLockElement===cvs&&performance.now()-lockedAt>120&&Math.abs(e.movementX)<250&&Math.abs(e.movementY)<250){lookDX+=e.movementX;lookDY+=e.movementY;}});
function lockMouse(){if(G.touch)return;try{const p=cvs.requestPointerLock&&cvs.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===cvs){G.locked=true;lockedAt=performance.now();}
  else{if(G.locked&&G.scene==='play')pause();G.locked=false;}
});

/* ---- touch: left thumb moves, right thumb looks, buttons on the right ---- */
const TOUCH={move:null,look:null,jumpHeld:false,jumpId:null,tap:null};
const TBTN={
  strike:{x:UW-52,y:UH-58,r:26,l:'STRIKE'},counter:{x:UW-112,y:UH-36,r:19,l:'COUNTER'},jump:{x:UW-40,y:UH-122,r:19,l:'JUMP'},
  dash:{x:UW-100,y:UH-92,r:15,l:'DASH'},grapple:{x:UW-150,y:UH-60,r:15,l:'GRAPPLE'},
  disc:{x:UW-158,y:UH-108,r:12,l:'DISC'},emp:{x:UW-118,y:UH-136,r:12,l:'EMP'},smoke:{x:UW-76,y:UH-152,r:12,l:'SMOKE'},
  pause:{x:UW-18,y:18,r:12,l:'II'}};
function inBtn(b,ux,uy){return Math.hypot(ux-b.x,uy-b.y)<=b.r+5;}
screenEl.addEventListener('touchstart',e=>{
  if(!G.touch){G.touch=true;document.body.classList.add('nf-touch');}
  if(!G.started)return;
  e.preventDefault();
  for(const t of e.changedTouches){
    const [ux,uy]=toUI(t.clientX,t.clientY);
    if(G.scene!=='play'){TOUCH.tap={id:t.identifier,ux,uy};continue;}
    let used=false;
    for(const k in TBTN)if(inBtn(TBTN[k],ux,uy)){used=true;
      if(k==='pause')pause();else if(k==='jump'){IN.jumpP=true;TOUCH.jumpHeld=true;TOUCH.jumpId=t.identifier;}
      else IN[k+'P']=true;break;}
    if(used)continue;
    if(ux<UW*0.42&&!TOUCH.move)TOUCH.move={id:t.identifier,ox:ux,oy:uy,x:ux,y:uy};
    else if(!TOUCH.look)TOUCH.look={id:t.identifier,x:t.clientX,y:t.clientY};
  }
},{passive:false});
screenEl.addEventListener('touchmove',e=>{
  if(!G.started)return;e.preventDefault();
  for(const t of e.changedTouches){
    if(TOUCH.move&&t.identifier===TOUCH.move.id){const [ux,uy]=toUI(t.clientX,t.clientY);TOUCH.move.x=ux;TOUCH.move.y=uy;}
    if(TOUCH.look&&t.identifier===TOUCH.look.id){const r=hud.getBoundingClientRect(),k=1100/r.width;lookDX+=(t.clientX-TOUCH.look.x)*k;lookDY+=(t.clientY-TOUCH.look.y)*k;TOUCH.look.x=t.clientX;TOUCH.look.y=t.clientY;}
  }
},{passive:false});
function touchEnd(e){
  if(!G.started)return;e.preventDefault();
  for(const t of e.changedTouches){
    if(TOUCH.move&&t.identifier===TOUCH.move.id)TOUCH.move=null;
    if(TOUCH.look&&t.identifier===TOUCH.look.id)TOUCH.look=null;
    if(t.identifier===TOUCH.jumpId){TOUCH.jumpHeld=false;TOUCH.jumpId=null;}
    if(TOUCH.tap&&TOUCH.tap.id===t.identifier){const [ux,uy]=toUI(t.clientX,t.clientY);if(Math.hypot(ux-TOUCH.tap.ux,uy-TOUCH.tap.uy)<14)uiClick(ux,uy);TOUCH.tap=null;}
  }
}
screenEl.addEventListener('touchend',touchEnd,{passive:false});
screenEl.addEventListener('touchcancel',touchEnd,{passive:false});

/* ------------------------------------------------------------------ menus */
const MENU_SCENES=new Set(['title','skill','armory','sound','paused','odresult']);
function menuItems(){
  if(G.scene==='title'){
    const d=nfDaily(),open=SV.reached>=1,it=[];
    if(SV.cont)it.push({label:'CONTINUE',sub:'DISTRICT '+(SV.cont.level+1)+' · '+NF_DISTRICTS[SV.cont.level].name,act:continueGame});
    it.push({label:'NEW GAME',sub:SV.beaten?'CAMPAIGN COMPLETE':'FIVE DISTRICTS, ONE BOSS',act:()=>{G.scene='skill';G.menu=G.skill;}});
    it.push({label:'OVERDRIVE',sub:open?(SV.od?'BEST '+fmtNum(SV.od)+' · WAVE '+SV.odWave:'ENDLESS WAVES ON A ROOFTOP'):'FINISH DISTRICT 1 TO UNLOCK',lock:!open,act:()=>startArena('overdrive')});
    it.push({label:'DAILY RUN',sub:open?d.label+' · '+d.twist.name+(SV.daily.key===d.key&&SV.daily.best?' · BEST '+fmtNum(SV.daily.best):''):'FINISH DISTRICT 1 TO UNLOCK',lock:!open,act:()=>startArena('daily')});
    it.push({label:'ARMORY',sub:'SUIT '+(FINISHES.find(f=>f.id===SV.finish)||FINISHES[0]).name+' · MEDALS '+medalCount()+'/20',act:()=>{G.scene='armory';G.menu=0;}});
    it.push({label:'SETTINGS',sub:'MUSIC '+Math.round(SV.mus*10)+' · EFFECTS '+Math.round(SV.sfx*10)+' · LOOK '+SV.sens,act:()=>{G.scene='sound';G.menu=0;}});
    return it;
  }
  if(G.scene==='skill')return SKILLS.map((s,i)=>({label:s.n,sub:s.d,act:()=>{G.skill=i;SV.skill=i;save();startCampaign();}}));
  if(G.scene==='armory'){const n=medalCount();
    return FINISHES.map(f=>({label:f.name+(SV.finish===f.id?'  ✓':''),sub:n>=f.need?(SV.finish===f.id?'EQUIPPED':'EQUIP'):'NEEDS '+f.need+' MEDALS',lock:n<f.need,
      act:()=>{SV.finish=f.id;save();AUDIO.play('weapon');}})).concat([{label:'BACK',sub:'',act:()=>{G.scene='title';G.menu=0;}}]);}
  if(G.scene==='sound')return[
    {label:'MUSIC',sub:'◂ '+Math.round(SV.mus*10)+' ▸',adj:d=>{SV.mus=clamp(Math.round(SV.mus*10+d)/10,0,1);AUDIO.setVolumes(SV.mus,SV.sfx);save();}},
    {label:'EFFECTS',sub:'◂ '+Math.round(SV.sfx*10)+' ▸',adj:d=>{SV.sfx=clamp(Math.round(SV.sfx*10+d)/10,0,1);AUDIO.setVolumes(SV.mus,SV.sfx);save();AUDIO.play('pickup');}},
    {label:'LOOK SPEED',sub:'◂ '+SV.sens+' ▸',adj:d=>{SV.sens=clamp(SV.sens+d,1,10);save();}},
    {label:'BACK',sub:'',act:()=>{G.scene='title';G.menu=0;}}];
  if(G.scene==='paused')return[
    {label:'RESUME',sub:'',act:resume},
    {label:'RESTART',sub:G.mode==='campaign'?'FROM THE START OF THIS DISTRICT':'A FRESH RUN',act:restart},
    {label:'QUIT TO TITLE',sub:G.mode==='campaign'?'PROGRESS IS SAVED AT EACH DISTRICT':'',act:toTitle}];
  if(G.scene==='odresult')return[
    {label:'RETRY',sub:'',act:restart},{label:'SHARE RUN',sub:'COPIES YOUR SCORE LINE',act:shareRun},{label:'QUIT TO TITLE',sub:'',act:toTitle}];
  return[];
}
function menuMove(d){const M=menuItems();if(!M.length)return;G.menu=(G.menu+d+M.length)%M.length;AUDIO.play('menu');}
function menuPick(i){const it=menuItems()[i===undefined?G.menu:i];if(!it)return;if(it.lock){AUDIO.play('nope');return;}
  if(it.adj){it.adj(1);return;}AUDIO.play('switch');it.act();}
function menuBack(){if(['skill','armory','sound'].includes(G.scene)){G.scene='title';G.menu=0;AUDIO.play('menu');}else if(G.scene==='paused')resume();}

/* ------------------------------------------------------------ the modes */
function clearRun(){
  G.ents=[];G.shots=[];G.sparks=[];G.rings=[];G.smoke=[];G.warps=[];G.hitFlash=[];G.pops=[];G.tokens=0;
  G.combo=0;G.comboT=0;G.chain=0;G.kos=0;G.enemyTotal=0;G.keys={};G.shards=0;G.tookDamage=false;G.boss=null;
  G.time=0;G.hurt=0;G.glitch=0;G.slow=0;G.hitstop=0;P.deaths=0;P.disc=null;P.trail=[];
}
function loadDistrict(n,W,theme,rain){
  clearRun();
  G.level=n;G.W=W;
  buildWorld(W,theme,rain);
  G.shardTotal=W.items.filter(i=>i.t==='shard').length;
  for(const e of W.enemies)makeEnemy(e.t,e.x,e.y,e.z,e.island,false);
  resetPlayer(W.start,W.start.face||0);
  P.hp=100;
  CAM.cur=CAM.dist;
}
function levelMusic(){
  const D=G.mode==='campaign'?NF_DISTRICTS[G.level]:{bpm:136,root:43};
  AUDIO.music.start({bpm:D.bpm,root:D.root,seed:G.mode==='campaign'?G.level*977+13:G.seed,intensity:G.mode==='campaign'?0:1});
}
function startCampaign(){G.mode='campaign';G.daily=null;G.score=0;G.maxCombo=0;G.totals={kos:0,shards:0,time:0};startDistrict(0);}
function startDistrict(n){
  const D=NF_DISTRICTS[n];G.D=D;
  loadDistrict(n,nfBuild(D),D.theme,D.rain);
  G.startScore=G.score;
  SV.cont={level:n,skill:G.skill,score:G.score};save();
  levelMusic();AUDIO.play('levelup');
  msg('DISTRICT '+(n+1)+'  ·  '+D.name);
  enterPlay();
}
function continueGame(){G.mode='campaign';G.daily=null;G.skill=SV.cont.skill;G.score=SV.cont.score||0;G.maxCombo=0;G.totals={kos:0,shards:0,time:0};startDistrict(SV.cont.level);}
function enterPlay(){G.scene='play';if(!G.touch)lockMouse();}
function restart(){if(G.mode==='campaign'){G.score=G.startScore||0;startDistrict(G.level);}else startArena(G.mode);}
function pause(){if(G.scene!=='play')return;G.scene='paused';G.menu=0;if(document.pointerLockElement===cvs)document.exitPointerLock();}
function resume(){G.scene='play';if(!G.touch)lockMouse();}
function toTitle(){
  if(document.pointerLockElement===cvs)document.exitPointerLock();
  G.mode='campaign';G.daily=null;
  const D=NF_DISTRICTS[0];G.D=D;loadDistrict(0,nfBuild(D),D.theme,D.rain);
  G.scene='title';G.menu=0;
  AUDIO.music.start({title:true,bpm:120,root:45,seed:5});
}
function districtKeys(){return [...new Set(WORLD.gates.map(g=>g.key))];}
function uplinkReady(){return districtKeys().every(k=>G.keys[k])&&!(G.boss&&!G.boss.dead);}
function finishDistrict(){
  const D=G.D,n=G.level;
  const pct=(a,b)=>b?Math.round(a/b*100):100;
  const ko=pct(G.kos,G.enemyTotal),sh=G.shardTotal?pct(G.shards,G.shardTotal):100;
  const medals=(G.tookDamage?0:1)|(sh>=100?2:0)|(G.time<=D.par?4:0)|(ko>=100?8:0);
  const before=SV.medals[n]||0,fresh=medals&~before;
  let bonus=0;if(G.time<=D.par)bonus+=Math.round((D.par-G.time)*20);if(ko>=100)bonus+=1500;if(sh>=100)bonus+=1500;if(!G.tookDamage)bonus+=3000;
  bonus=Math.round(bonus*SKILLS[G.skill].mult);G.score+=bonus;
  const ls=G.score-(G.startScore||0);
  G.tally={name:D.name,ko,sh,time:G.time,par:D.par,deaths:P.deaths,medals,fresh,bonus,levelScore:ls,newBest:ls>(SV.best[n]||0),last:n===NF_DISTRICTS.length-1};
  SV.medals[n]=before|medals;SV.best[n]=Math.max(SV.best[n]||0,ls);SV.reached=Math.max(SV.reached,n+1);
  G.totals.kos+=G.kos;G.totals.shards+=G.shards;G.totals.time+=G.time;
  if(G.tally.last){SV.beaten=true;SV.cont=null;}else SV.cont={level:n+1,skill:G.skill,score:G.score};
  save();
  G.scene='tally';AUDIO.play(fresh?'medal':'levelup');AUDIO.music.intensity(0);
  if(document.pointerLockElement===cvs)document.exitPointerLock();
}
function nextDistrict(){if(G.tally&&G.tally.last){G.scene='end';return;}startDistrict(G.level+1);}

/* ---- Overdrive and the daily run ---- */
function startArena(mode){
  G.mode=mode;G.skill=2;G.score=0;G.maxCombo=0;G.wave=0;
  G.daily=mode==='daily'?nfDaily():null;
  G.seed=mode==='daily'?G.daily.seed:((Math.random()*1e9)|0);
  const W=nfArena(G.seed);W.exit=null;
  loadDistrict(0,W,'arena',mode==='daily');
  G.waveState='break';G.waveT=3;G.spawnQ=[];
  msg(mode==='daily'?'DAILY '+G.daily.label+'  ·  '+G.daily.twist.name+': '+G.daily.twist.d.toUpperCase():'OVERDRIVE  ·  SURVIVE');
  levelMusic();AUDIO.play('levelup');enterPlay();
}
function buildWave(n){
  const q=[],cost={thug:1,drone:1.2,guard:1.5,hacker:2.5,mech:7};let budget=3+n*2.2;
  if(twist('heavy')&&n%3===0){q.push('mech');budget-=4;}
  if(n>=5&&n%5===0){q.push('mech');budget-=cost.mech;}
  if(twist('ghost')){q.push('hacker');budget-=cost.hacker;}
  const r=mulberry32(G.seed+n*131);
  while(budget>0){const x=r();let t=x<0.45?'thug':x<(twist('swarm')?0.85:0.62)?'drone':x<0.82?'guard':n>=3?'hacker':'thug';q.push(t);budget-=cost[t];}
  return q;
}
function updateWaves(dt){
  if(G.waveState==='break'){G.waveT-=dt;if(G.waveT<=0){G.wave++;G.spawnQ=buildWave(G.wave);G.spawnT=0.3;G.waveState='fight';msg('WAVE '+G.wave);AUDIO.play('alert');}return;}
  if(G.spawnQ.length){G.spawnT-=dt;if(G.spawnT<=0){
    const t=G.spawnQ.shift();
    for(let k=0;k<30;k++){const b=WORLD.bounds,x=lerp(b.x0+3,b.x1-3,rng()),z=lerp(b.z0+3,b.z1-3,rng());
      if(Math.hypot(x-P.x,z-P.z)<8)continue;const g=groundAt(x,z,b.maxY+1);if(!g||g.k!=='deck')continue;
      G.warps.push({x,y:g.y1,z,t:0,spawn:t});AUDIO.play('warp',0.4);break;}
    G.spawnT=Math.max(0.3,0.9-G.wave*0.03);}}
  const alive=G.ents.some(e=>!e.dead)||G.warps.some(w=>w.spawn&&!w.done);
  if(!alive&&!G.spawnQ.length){
    const bonus=G.wave*500*(twist('scav')?2:1);G.score+=bonus;pop('WAVE '+G.wave+' CLEARED',bonus);AUDIO.play('medal');
    G.waveState='break';G.waveT=5;
    let n=2+Math.floor(G.wave/3);if(twist('scav'))n=Math.ceil(n/2);
    for(let i=0;i<n;i++){const b=WORLD.bounds,x=lerp(b.x0+6,b.x1-6,rng()),z=lerp(b.z0+6,b.z1-6,rng()),g=groundAt(x,z,b.maxY+1);if(g)WORLD.items.push({t:'stim',x,y:g.y1+0.8,z,taken:false,bob:0,dropped:true});}
    G.ents=G.ents.filter(e=>!e.dead||e.st<9);
  }
}
function arenaOver(){
  const best=G.mode==='daily'?(SV.daily.key===G.daily.key?SV.daily.best:0):SV.od,isBest=G.score>best;
  G.odResult={wave:G.wave,score:G.score,maxCombo:G.maxCombo,best:Math.max(best,G.score),isBest};
  if(G.mode==='daily'){if(SV.daily.key!==G.daily.key)SV.daily={key:G.daily.key,best:0,wave:0};if(isBest){SV.daily.best=G.score;SV.daily.wave=G.wave;}}
  else if(isBest){SV.od=G.score;SV.odWave=G.wave;}
  save();G.scene='odresult';G.menu=0;
  if(document.pointerLockElement===cvs)document.exitPointerLock();
}
function shareLine(){const r=G.odResult;if(!r)return'';
  return 'NEON FURNACE · '+(G.mode==='daily'?'DAILY '+G.daily.label:'OVERDRIVE')+' · Wave '+r.wave+' · '+fmtNum(r.score)+' · '+r.maxCombo+' hit combo';}
function shareRun(){
  const t=shareLine(),done=()=>{G.copied=2.5;AUDIO.play('pickup');};
  const fb=()=>{try{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();done();}catch(e){}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();}catch(e){fb();}
}

/* ------------------------------------------------------------ the tick */
function pickups(){
  for(const it of WORLD.items){
    if(it.taken)continue;
    if(Math.hypot(it.x-P.x,it.z-P.z)<1.3&&Math.abs(it.y-(P.y+0.9))<1.8){
      if(it.t==='stim'){if(P.hp>=100)continue;P.hp=Math.min(100,P.hp+30);AUDIO.play('pickup');pop('STIM +30',0);}
      else if(it.t==='key'){G.keys[it.key]=true;AUDIO.play('key');msg(({B:'BLUE',Y:'YELLOW',R:'RED'})[it.key]+' KEYCARD');
        for(const g of WORLD.gates)if(g.key===it.key){g.opening=true;AUDIO.play('door');}}
      else if(it.t==='shard'){G.shards++;award(1000,'DATA SHARD '+G.shards+'/'+G.shardTotal);AUDIO.play('shard');}
      it.taken=true;
    }
  }
  const ex=WORLD.W.exit;
  if(ex&&G.mode==='campaign'&&Math.hypot(P.x-ex.x,P.z-ex.z)<1.8&&Math.abs(P.y-ex.y)<2){
    if(uplinkReady())finishDistrict();
    else if(G.msgT<1){const need=districtKeys().filter(k=>!G.keys[k]).map(k=>({B:'BLUE',Y:'YELLOW',R:'RED'})[k]);
      msg(G.boss&&!G.boss.dead?'THE UPLINK IS LOCKED WHILE THE WARDEN IS ONLINE':'THE UPLINK NEEDS THE '+need.join(' AND ')+' KEYCARD'+(need.length>1?'S':''));AUDIO.play('nope');}
  }
}
function objective(){
  if(G.mode!=='campaign')return null;
  if(G.boss&&!G.boss.dead&&G.boss.aware)return{label:'TAKE DOWN THE WARDEN',x:G.boss.x,y:G.boss.y,z:G.boss.z};
  const need=districtKeys().filter(k=>!G.keys[k]);
  if(need.length){let best=null,bd=1e9;for(const it of WORLD.items)if(it.t==='key'&&!it.taken&&need.includes(it.key)){const d=Math.hypot(it.x-P.x,it.z-P.z);if(d<bd){bd=d;best=it;}}
    if(best)return{label:'FIND THE '+({B:'BLUE',Y:'YELLOW',R:'RED'})[best.key]+' KEYCARD',x:best.x,y:best.y,z:best.z,c:KEYCOL[best.key]};}
  const ex=WORLD.W.exit;return ex?{label:'REACH THE UPLINK',x:ex.x,y:ex.y,z:ex.z}:null;
}
function musicIntensity(){
  let n=0;for(const e of G.ents)if(!e.dead&&e.aware&&e.state!=='idle'&&Math.hypot(e.x-P.x,e.z-P.z)<25)n++;
  let lv=n>=3||G.combo>=10?2:n>=1?1:0;
  if(G.mode!=='campaign'&&G.waveState==='fight')lv=Math.max(lv,G.wave>=3?2:1);
  return lv;
}
function cameraUpdate(dt){
  const k=0.0021*(SV.sens/5);
  CAM.yaw-=lookDX*k;CAM.pitch=clamp(CAM.pitch+lookDY*k,-0.55,1.1);lookDX=lookDY=0;
  // on a phone, the camera drifts in behind you while you run
  if(G.touch&&!TOUCH.look&&Math.hypot(P.vx,P.vz)>3&&P.state==='move'){CAM.yaw+=angDiff(P.yaw,CAM.yaw)*Math.min(1,0.9*dt);}
  const want=P.gliding?8:G.boss&&G.boss.aware&&!G.boss.dead?8.5:CAM.dist;
  const cp=Math.cos(CAM.pitch),fx=Math.sin(CAM.yaw)*cp,fy=-Math.sin(CAM.pitch),fz=Math.cos(CAM.yaw)*cp;
  const rx=-Math.cos(CAM.yaw),rz=Math.sin(CAM.yaw);
  const tx=P.x+rx*0.55,ty=P.y+1.6,tz=P.z+rz*0.55;
  const hit=raycast(tx,ty,tz,-fx,-fy,-fz,want+0.4,true);
  const d=Math.max(1.2,Math.min(want,hit-0.35));
  CAM.cur=d<CAM.cur?d:lerp(CAM.cur,d,Math.min(1,3*dt));
  const sh=CAM.shake;CAM.shake=Math.max(0,CAM.shake-dt*1.6);
  const jx=(rng()-.5)*sh*0.5,jy=(rng()-.5)*sh*0.5;
  CAM.pos=[tx-fx*CAM.cur+jx,ty-fy*CAM.cur+jy,tz-fz*CAM.cur];
  CAM.target=[tx+fx*2,ty+fy*2+jy*0.5,tz+fz*2];
  CAM.fov=lerp(CAM.fov,(P.state==='dash'||P.gliding?1.2:1.06),Math.min(1,4*dt));
}
let titleT=0;
function titleCamera(dt){
  titleT+=dt;const s=WORLD.W.start;
  const a=titleT*0.06;
  CAM.pos=[s.x+Math.sin(a)*26,s.y+11+Math.sin(titleT*0.2)*2,s.z+Math.cos(a)*26];
  CAM.target=[s.x,s.y+4,s.z-8];CAM.fov=1.05;
}

let last=performance.now(),fpsAcc=0,fpsN=0,fpsShown=60,lowT=0;
const fpsOut=document.getElementById('fpsOut');
function frame(now){
  let dt=(now-last)/1000;last=now;if(dt>0.1)dt=0.1;
  resizeCanvas();
  fpsAcc+=dt;fpsN++;
  if(fpsAcc>0.5){fpsShown=Math.round(fpsN/fpsAcc);fpsOut.textContent=fpsShown+' fps';fpsAcc=0;fpsN=0;
    // drop the render resolution on slow devices, rather than stutter
    if(G.scene==='play'&&fpsShown<38&&renderScale>0.6){lowT++;if(lowT>4){renderScale=Math.max(0.6,renderScale-0.2);lowT=0;}}else lowT=0;}
  if(G.copied>0)G.copied-=dt;
  readKeys();
  if(G.scene==='play'){
    let gdt=dt;
    if(G.hitstop>0){G.hitstop-=dt;gdt*=0.08;}
    if(G.slow>0){G.slow-=dt;gdt*=0.35;}
    G.time+=gdt;G.clock+=gdt;G.noise=Math.max(0,G.noise-dt);
    if(IN.strikeP)G.noise=0.4;
    playerUpdate(gdt);discUpdate(gdt);
    for(const e of G.ents)enemyUpdate(e,gdt);
    shotsUpdate(gdt);effectsUpdate(gdt);pickups();
    if(G.comboT>0){G.comboT-=gdt;if(G.comboT<=0){G.combo=0;}}
    if(G.mode!=='campaign'){updateWaves(gdt);if(P.state==='down'&&P.st>1.2&&G.scene==='play')arenaOver();}
    AUDIO.music.intensity(musicIntensity());
    cameraUpdate(dt);
  }else if(G.scene==='title'||G.scene==='skill'||G.scene==='armory'||G.scene==='sound'||G.scene==='boot'){
    G.clock+=dt;for(const e of G.ents)if(e.state==='idle')enemyUpdate(e,dt);if(WORLD.W)titleCamera(dt);
  }
  G.hurt=Math.max(0,G.hurt-dt*1.6);G.glitch=Math.max(0,G.glitch-dt*1.4);if(G.msgT>0)G.msgT-=dt;
  for(const p of G.pops)p.t+=dt;G.pops=G.pops.filter(p=>p.t<2.2);
  // draw
  if(GL_OK&&WORLD.W){
    R.dyn.clear();R.glass.clear();
    sceneryFrame(G.clock,dt);
    drawActors(G.clock);
    const extra=[{x:P.x,y:P.y+1.7,z:P.z,r:5,c:STY().visor,i:1.3}];
    for(const h of G.hitFlash)extra.push({x:h.x,y:h.y,z:h.z,r:7,c:[1,.85,.6],i:3});
    for(const s of G.shots)extra.push({x:s.x,y:s.y,z:s.z,r:5,c:s.c,i:2});
    const L=pickLights(CAM.target[0],CAM.target[1],CAM.target[2],extra);
    glRender(CAM,WORLD.T,L,{rain:WORLD.rain,hurt:G.hurt,glitch:G.glitch,slow:G.slow>0?1:0},G.clock);
  }
  drawHUD(dt);
  clearEdges();
  requestAnimationFrame(frame);
}
