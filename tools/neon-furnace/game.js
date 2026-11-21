/* ================================= GAME ================================== */
const SKILLS=[
 {n:'TOURIST',  d:'gentle hits, generous stims',     dmg:0.5, spd:0.85,drop:0.45,mult:0.5},
 {n:'STREET',   d:'a fair fight',                    dmg:0.75,spd:0.95,drop:0.3, mult:0.75},
 {n:'OPERATOR', d:'the way it is meant to be played',dmg:1.0, spd:1.0, drop:0.15,mult:1},
 {n:'BLACK ICE',d:'they hit harder and act first',   dmg:1.4, spd:1.12,drop:0.05,mult:1.5},
 {n:'FLATLINE', d:'three attack at once',            dmg:1.9, spd:1.25,drop:0,   mult:2}
];
const FINISHES=[{id:'stock',name:'STOCK',need:0},{id:'chrome',name:'CHROME',need:4},{id:'toxic',name:'TOXIC',need:8},{id:'gold',name:'GOLD',need:12},{id:'glitch',name:'GLITCH',need:20},
  {id:'neon',name:'NEON',stars:6},{id:'shadow',name:'SHADOW',stars:12},{id:'prism',name:'PRISM',stars:18}];
const UPGRADES=[
 {id:'special2',cat:'COMBAT',name:'QUICK SPECIAL',d:'Special takedowns charge every 6 hits, not 8.'},
 {id:'multi',cat:'COMBAT',name:'MULTI GROUND',d:'A ground finish takes down every fallen enemy nearby.'},
 {id:'beatdown',cat:'COMBAT',name:'HEAVY BEATDOWN',d:'Blows on a stunned or opened enemy hit twice as hard.'},
 {id:'knife',cat:'COMBAT',name:'KNIFE COUNTER',d:'Knife attacks turn red and can be countered.'},
 {id:'keeper',cat:'COMBAT',name:'COMBO KEEPER',d:'More time between hits before a combo drops.'},
 {id:'crit',cat:'COMBAT',name:'CRITICAL STRIKES',d:'Every fifth hit in a combo lands harder.'},
 {id:'edisc',cat:'GADGETS',name:'ELECTRIC DISC',d:'The disc stuns what it hits.'},
 {id:'ricochet',cat:'GADGETS',name:'RICOCHET DISC',d:'The disc bounces on to two more targets.'},
 {id:'triple',cat:'GADGETS',name:'TRIPLE DISC',d:'Throw three discs at three targets.',req:'ricochet'},
 {id:'empPlus',cat:'GADGETS',name:'WIDE EMP',d:'A bigger blast that recharges faster.'},
 {id:'smokePlus',cat:'GADGETS',name:'DENSE SMOKE',d:'Smoke lasts longer; takedowns in it score double.'},
 {id:'regen',cat:'GADGETS',name:'SECOND WIND',d:'Every knockout gives back a little health.'},
 {id:'armor1',cat:'BODY',name:'ARMOUR I',d:'Fifteen more health.'},
 {id:'armor2',cat:'BODY',name:'ARMOUR II',d:'Fifteen more health.',req:'armor1'},
 {id:'armor3',cat:'BODY',name:'ARMOUR III',d:'Fifteen more health.',req:'armor2'},
 {id:'glide',cat:'BODY',name:'GLIDE SPEED',d:'Glide a quarter faster.'},
 {id:'dive',cat:'BODY',name:'DIVE SHOCKWAVE',d:'Dive bombs hit wider and harder.'},
 {id:'boost',cat:'BODY',name:'GRAPPLE BOOST+',d:'Launch higher off the end of a grapple.'}
];
const xpFor=n=>250*n*(n+1);
const levelOf=x=>{let n=0;while(xpFor(n+1)<=x)n++;return n;};

/* ----------------------------------------------------------------- saves */
const SAVE_KEY='neonfurnace.v4';
const SV=Object.assign({reached:0,cont:null,medals:[0,0,0,0,0],best:[0,0,0,0,0],od:0,odWave:0,daily:{key:0,best:0,wave:0},
  finish:'stock',mus:0.7,sfx:0.8,skill:2,beaten:false,sens:5,quality:'auto',xp:0,up:[],logs:[false,false,false,false,false],
  stars:{},chBest:{},tables:{od:[],daily:{key:0,list:[]},weekly:{key:0,list:[]},chal:{}},tags:[0,0,0,0,0],seenIntro:[false,false,false,false,false]},(function(){
  try{return JSON.parse(localStorage.getItem(SAVE_KEY))||{};}catch(e){return{};}})());
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(SV));}catch(e){}}
try{localStorage.setItem('nf-found','1');}catch(e){}       // reaching the game counts as finding it
const medalCount=()=>SV.medals.reduce((a,m)=>a+((m&1)+((m>>1)&1)+((m>>2)&1)+((m>>3)&1)),0);
const starCount=()=>Object.values(SV.stars).reduce((a,b)=>a+b,0);
const level=()=>levelOf(SV.xp);
const points=()=>level()-SV.up.length;

/* ----------------------------------------------------------------- state */
const G={scene:'boot',mode:'campaign',skill:SV.skill,level:0,D:null,time:0,clock:0,
  ents:[],civs:[],shots:[],sparks:[],fx:[],smoke:[],warps:[],hitFlash:[],bubbles:[],strikes:[],radioQ:[],tokens:0,
  score:0,combo:0,comboT:0,maxCombo:0,chain:0,recent:[],special:0,pops:[],kos:0,kosPlaced:0,enemyTotal:0,keys:{},shards:0,shardTotal:0,tags:0,tagTotal:0,
  tookDamage:false,hitstop:0,slow:0,hurt:0,glitch:0,noise:0,flash:0,msg:'',msgT:0,cine:null,cut:null,map:false,
  wave:0,waveState:'',waveT:0,spawnQ:[],spawnT:0,daily:null,weekly:null,chal:null,spotted:0,ringsGot:0,seed:0,result:null,copied:0,
  totals:{kos:0,shards:0,time:0},tally:null,menu:0,started:false,locked:false,touch:false,god:false,initials:null,xpGain:0};
const twist=id=>!!(G.daily&&G.daily.twist.id===id);
function msg(t){G.msg=t;G.msgT=3.2;}
function pop(text,val){G.pops.push({text,val,t:0});if(G.pops.length>4)G.pops.shift();}
function award(v,label){
  if(v>0&&G.mode==='campaign')v*=SKILLS[G.skill].mult;
  v=Math.round(v);G.score=Math.max(0,G.score+v);
  if(v>0){const x=Math.round(v/3);SV.xp+=x;G.xpGain+=x;}
  if(label)pop(label,v);
}

/* ------------------------------------------------------------------ input */
const IN={mx:0,mz:0,jump:false,jumpP:false,strikeP:false,counterP:false,dashP:false,grappleP:false,discP:false,empP:false,smokeP:false,specialP:false};
const keys={};
let lookDX=0,lookDY=0,lockedAt=0;
const GAMEKEYS=new Set(['Space','Tab','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyF','KeyC','KeyJ','KeyK','KeyV','KeyM','KeyR','KeyP','ShiftLeft','ShiftRight','Escape']);
addEventListener('keydown',e=>{if(G.started&&GAMEKEYS.has(e.code))e.preventDefault();if(e.repeat)return;keys[e.code]=true;handleKey(e);});
addEventListener('keyup',e=>{if(G.started&&GAMEKEYS.has(e.code))e.preventDefault();keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
let cheatBuf='';
const CHEATS={ironhide(){G.god=!G.god;msg('IRONHIDE '+(G.god?'ON':'OFF'));},
  allkeys(){for(const g of WORLD.gates){G.keys[g.key]=true;g.opening=true;}for(const m of WORLD.movers)if(m.key)G.keys[m.key]=true;msg('ALL KEYS');}};
for(let i=1;i<=5;i++)CHEATS['warp'+i]=()=>{if(G.mode==='campaign')startDistrict(i-1);};
function handleKey(e){
  const c=e.code;
  if(c==='KeyM'){const m=AUDIO.toggleMute();msg(m?'SOUND OFF':'SOUND ON');return;}
  if(G.scene==='cut'){if(c==='Enter'||c==='Space'||c==='Escape')endCut();return;}
  if(G.scene==='initials'){initialsKey(c);return;}
  if(MENU_SCENES.has(G.scene)){
    if(c==='ArrowUp'||c==='KeyW')menuMove(-1);
    else if(c==='ArrowDown'||c==='KeyS')menuMove(1);
    else if(c==='Enter'||c==='Space')menuPick();
    else if(c==='Escape')menuBack();
    else if(c==='ArrowLeft'||c==='KeyA'||c==='ArrowRight'||c==='KeyD'){const it=menuItems()[G.menu];if(it&&it.adj)it.adj(c==='ArrowLeft'||c==='KeyA'?-1:1);}
    else if(c==='KeyR'&&G.scene==='result')restart();
    else if(c==='KeyC'&&G.scene==='result')shareRun();
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
  if(c==='KeyV')IN.specialP=true;
  if(c==='KeyQ')IN.discP=true;
  if(c==='KeyF')IN.empP=true;
  if(c==='KeyC')IN.smokeP=true;
  if(c==='Tab')G.map=!G.map;
  if(c==='KeyR')restart();
  if(c==='KeyP'||(c==='Escape'&&document.pointerLockElement!==cvs))pause();
}
function readKeys(){
  if(TOUCH.move){const vx=(TOUCH.move.x-TOUCH.move.ox)/34,vy=(TOUCH.move.y-TOUCH.move.oy)/34,m=Math.hypot(vx,vy);
    if(m>0.15){const k=Math.min(1,m)/m;IN.mx=vx*k;IN.mz=-vy*k;}else IN.mx=IN.mz=0;}
  else{IN.mz=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);IN.mx=(keys.KeyD?1:0)-(keys.KeyA?1:0);}
  IN.jump=!!(keys.Space||TOUCH.jumpHeld);
  if(keys.ArrowLeft)lookDX-=14;if(keys.ArrowRight)lookDX+=14;
}
function clearEdges(){for(const k in IN)if(k.endsWith('P'))IN[k]=false;}

/* ---- mouse ---- */
function toUI(cx,cy){const r=hud.getBoundingClientRect();return[(cx-r.left)/r.width*UW,(cy-r.top)/r.height*UH];}
let menuRects=[];
function menuHit(ux,uy){for(const m of menuRects)if(ux>=m.x&&ux<=m.x+m.w&&uy>=m.y&&uy<=m.y+m.h)return m;return null;}
function uiClick(ux,uy){
  if(G.scene==='cut'){endCut();return;}
  if(G.scene==='initials'){initialsClick(ux,uy);return;}
  if(MENU_SCENES.has(G.scene)){const m=menuHit(ux,uy);if(!m)return;G.menu=m.i;const it=menuItems()[m.i];
    if(it&&it.adj){it.adj(ux<m.x+m.w/2?-1:1);return;}menuPick(m.i);return;}
  if(G.scene==='tally')nextDistrict();else if(G.scene==='end')toTitle();
}
const screenEl=document.getElementById('screen');
screenEl.addEventListener('mousedown',e=>{
  if(G.touch||!G.started)return;
  const [ux,uy]=toUI(e.clientX,e.clientY);
  if(G.scene!=='play'){uiClick(ux,uy);return;}
  if(document.pointerLockElement!==cvs){lockMouse();return;}
  if(e.button===0)IN.strikeP=true;if(e.button===2)IN.counterP=true;if(e.button===1)IN.specialP=true;
});
screenEl.addEventListener('mousemove',e=>{if(G.touch||G.scene==='play')return;const [ux,uy]=toUI(e.clientX,e.clientY);const m=menuHit(ux,uy);if(m)G.menu=m.i;});
screenEl.addEventListener('contextmenu',e=>e.preventDefault());
screenEl.addEventListener('wheel',e=>{if(MENU_SCENES.has(G.scene)){menuMove(e.deltaY>0?1:-1);e.preventDefault();}},{passive:false});
// Browsers can report one huge jump at the moment the pointer is captured; skip it.
addEventListener('mousemove',e=>{if(document.pointerLockElement===cvs&&performance.now()-lockedAt>120&&Math.abs(e.movementX)<250&&Math.abs(e.movementY)<250){lookDX+=e.movementX;lookDY+=e.movementY;}});
// Releasing the mouse on purpose (a scene, a menu, the end of a run) must not read as the player pressing Esc,
// so the unlock event that follows a moment later is ignored.
let releasedAt=-1e9;
function releaseMouse(){if(document.pointerLockElement===cvs){releasedAt=performance.now();document.exitPointerLock();}}
function lockMouse(){if(G.touch)return;try{const p=cvs.requestPointerLock&&cvs.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===cvs){G.locked=true;lockedAt=performance.now();}
  else{if(G.locked&&G.scene==='play'&&performance.now()-releasedAt>1500)pause();G.locked=false;}
});

/* ---- touch ---- */
const TOUCH={move:null,look:null,jumpHeld:false,jumpId:null,tap:null};
const TBTN={
  strike:{x:UW-50,y:UH-56,r:25,l:'STRIKE'},counter:{x:UW-108,y:UH-32,r:18,l:'COUNTER'},jump:{x:UW-38,y:UH-118,r:18,l:'JUMP'},
  dash:{x:UW-98,y:UH-88,r:14,l:'DASH'},grapple:{x:UW-148,y:UH-56,r:14,l:'GRAPPLE'},special:{x:UW-150,y:UH-98,r:13,l:'SPECIAL'},
  disc:{x:UW-104,y:UH-130,r:11,l:'DISC'},emp:{x:UW-70,y:UH-152,r:11,l:'EMP'},smoke:{x:UW-30,y:UH-158,r:11,l:'SMOKE'},
  map:{x:UW-46,y:18,r:11,l:'MAP'},pause:{x:UW-18,y:18,r:11,l:'II'}};
function inBtn(b,ux,uy){return Math.hypot(ux-b.x,uy-b.y)<=b.r+5;}
screenEl.addEventListener('touchstart',e=>{
  if(!G.touch){G.touch=true;document.body.classList.add('nf-touch');}
  if(!G.started)return;e.preventDefault();
  for(const t of e.changedTouches){
    const [ux,uy]=toUI(t.clientX,t.clientY);
    if(G.scene!=='play'){TOUCH.tap={id:t.identifier,ux,uy};continue;}
    let used=false;
    for(const k in TBTN)if(inBtn(TBTN[k],ux,uy)){used=true;
      if(k==='pause')pause();else if(k==='map')G.map=!G.map;else if(k==='jump'){IN.jumpP=true;TOUCH.jumpHeld=true;TOUCH.jumpId=t.identifier;}else IN[k+'P']=true;break;}
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
const MENU_SCENES=new Set(['title','skill','armory','sound','paused','result','challenges','upgrades','log','scores']);
function menuItems(){
  const S=G.scene,open=SV.reached>=1;
  if(S==='title'){
    const d=nfDaily(),w=nfWeekly(),it=[];
    if(SV.cont)it.push({label:'CONTINUE',sub:'DISTRICT '+(SV.cont.level+1)+' · '+NF_DISTRICTS[SV.cont.level].name,act:continueGame});
    it.push({label:'NEW GAME',sub:SV.beaten?'CAMPAIGN COMPLETE':'FIVE DISTRICTS, FIVE BOSSES',act:()=>{G.scene='skill';G.menu=G.skill;}});
    it.push({label:'CHALLENGES',sub:open?'STARS '+starCount()+'/18':'FINISH DISTRICT 1 TO UNLOCK',lock:!open,act:()=>{G.scene='challenges';G.menu=0;}});
    it.push({label:'OVERDRIVE',sub:open?(SV.od?'BEST '+fmtNum(SV.od)+' · WAVE '+SV.odWave:'ENDLESS WAVES ON A ROOFTOP'):'FINISH DISTRICT 1 TO UNLOCK',lock:!open,act:()=>startArena('overdrive')});
    it.push({label:'DAILY RUN',sub:open?d.label+' · '+d.twist.name:'FINISH DISTRICT 1 TO UNLOCK',lock:!open,act:()=>startArena('daily')});
    it.push({label:'WEEKLY GAUNTLET',sub:open?w.label+' · TEN WAVES, TWO BOSSES':'FINISH DISTRICT 1 TO UNLOCK',lock:!open,act:()=>startArena('weekly')});
    it.push({label:'UPGRADES',sub:'LEVEL '+level()+' · '+points()+' POINT'+(points()===1?'':'S')+' TO SPEND',act:()=>{G.scene='upgrades';G.menu=0;}});
    it.push({label:'ARMORY',sub:'SUIT '+(FINISHES.find(f=>f.id===SV.finish)||FINISHES[0]).name,act:()=>{G.scene='armory';G.menu=0;}});
    it.push({label:'STORY LOG',sub:SV.logs.filter(Boolean).length+' OF 5 RADIOS FOUND',act:()=>{G.scene='log';G.menu=0;}});
    it.push({label:'HIGH SCORES',sub:'',act:()=>{G.scene='scores';G.menu=0;}});
    it.push({label:'SETTINGS',sub:'QUALITY '+SV.quality.toUpperCase()+' · MUSIC '+Math.round(SV.mus*10),act:()=>{G.scene='sound';G.menu=0;}});
    return it;
  }
  const back={label:'BACK',sub:'',act:()=>{G.scene='title';G.menu=0;}};
  if(S==='skill')return SKILLS.map((s,i)=>({label:s.n,sub:s.d,act:()=>{G.skill=i;SV.skill=i;save();startCampaign();}}));
  if(S==='challenges')return NF_CHALLENGES.map(C=>{const lock=SV.reached<C.unlock,st=SV.stars[C.id]||0;
    return{label:C.name,sub:lock?'FINISH DISTRICT '+C.unlock+' TO UNLOCK':'★'.repeat(st)+'☆'.repeat(3-st)+' · '+C.type.toUpperCase(),lock,act:()=>startChallenge(C)};}).concat([back]);
  if(S==='upgrades')return UPGRADES.map(u=>{const own=SV.up.includes(u.id),lock=u.req&&!SV.up.includes(u.req);
    return{label:u.name+(own?'  ✓':''),sub:own?'OWNED':lock?'NEEDS '+UPGRADES.find(x=>x.id===u.req).name:points()>0?'UNLOCK · 1 POINT':'NO POINTS',lock:own||lock||points()<1,up:u,
      act:()=>{SV.up.push(u.id);save();AUDIO.play('medal');}};}).concat([back]);
  if(S==='armory'){const m=medalCount(),s=starCount();
    return FINISHES.map(f=>{const ok=f.stars?s>=f.stars:m>=f.need;return{label:f.name+(SV.finish===f.id?'  ✓':''),sub:ok?(SV.finish===f.id?'EQUIPPED':'EQUIP'):f.stars?'NEEDS '+f.stars+' STARS':'NEEDS '+f.need+' MEDALS',lock:!ok,
      act:()=>{SV.finish=f.id;save();AUDIO.play('weapon');}};}).concat([back]);}
  if(S==='log')return LOGS.map((L,i)=>({label:SV.logs[i]?L.t:'? ? ?',sub:SV.logs[i]?'READ':'FIND THE RADIO IN DISTRICT '+(i+1),lock:!SV.logs[i],log:i,act:()=>{G.logOpen=i;}})).concat([back]);
  if(S==='scores')return[back];
  if(S==='sound')return[
    {label:'QUALITY',sub:'◂ '+SV.quality.toUpperCase()+' ▸',adj:d=>{const o=['auto','low','medium','high'];SV.quality=o[(o.indexOf(SV.quality)+d+4)%4];applyQuality();save();}},
    {label:'MUSIC',sub:'◂ '+Math.round(SV.mus*10)+' ▸',adj:d=>{SV.mus=clamp(Math.round(SV.mus*10+d)/10,0,1);AUDIO.setVolumes(SV.mus,SV.sfx);save();}},
    {label:'EFFECTS',sub:'◂ '+Math.round(SV.sfx*10)+' ▸',adj:d=>{SV.sfx=clamp(Math.round(SV.sfx*10+d)/10,0,1);AUDIO.setVolumes(SV.mus,SV.sfx);save();AUDIO.play('pickup');}},
    {label:'LOOK SPEED',sub:'◂ '+SV.sens+' ▸',adj:d=>{SV.sens=clamp(SV.sens+d,1,10);save();}},back];
  if(S==='paused')return[
    {label:'RESUME',sub:'',act:resume},
    {label:'RESTART',sub:G.mode==='campaign'?'FROM THE START OF THIS DISTRICT':'A FRESH RUN',act:restart},
    {label:'QUIT TO TITLE',sub:G.mode==='campaign'?'PROGRESS IS SAVED AT EACH DISTRICT':'',act:toTitle}];
  if(S==='result')return[{label:'RETRY',sub:'',act:restart},{label:'SHARE RUN',sub:'COPIES YOUR SCORE LINE',act:shareRun},{label:'QUIT TO TITLE',sub:'',act:toTitle}];
  return[];
}
function menuMove(d){const M=menuItems();if(!M.length)return;G.menu=(G.menu+d+M.length)%M.length;G.logOpen=null;AUDIO.play('menu');}
function menuPick(i){const it=menuItems()[i===undefined?G.menu:i];if(!it)return;if(it.lock){AUDIO.play('nope');return;}if(it.adj){it.adj(1);return;}AUDIO.play('switch');it.act();}
function menuBack(){if(['skill','armory','sound','challenges','upgrades','log','scores'].includes(G.scene)){G.scene='title';G.menu=0;G.logOpen=null;AUDIO.play('menu');}else if(G.scene==='paused')resume();}
function applyQuality(){
  const auto=SV.quality==='auto';
  Q=QUALITY[auto?(G.touch?'low':'high'):SV.quality];
  const base=/[?&]lowres/.test(location.search)?0.45:clamp(+(location.search.match(/[?&]scale=([\d.]+)/)||[0,1])[1],0.3,1);
  renderScale=Math.min(base,Q.scale);
}

/* ------------------------------------------------------------ the modes */
function clearRun(){
  G.ents=[];G.civs=[];G.shots=[];G.sparks=[];G.fx=[];G.smoke=[];G.warps=[];G.hitFlash=[];G.bubbles=[];G.strikes=[];G.pops=[];G.radioQ=[];
  G.tokens=0;G.combo=0;G.comboT=0;G.chain=0;G.recent=[];G.special=0;G.kos=0;G.kosPlaced=0;G.enemyTotal=0;G.keys={};G.shards=0;G.tags=0;G.ringsGot=0;
  G.tookDamage=false;G.time=0;G.hurt=0;G.glitch=0;G.slow=0;G.hitstop=0;G.cine=null;G.map=false;G.spotted=0;G.xpGain=0;P.deaths=0;P.disc=null;P.trail=[];
}
function loadDistrict(n,W,theme,rain){
  clearRun();
  G.level=n;G.W=W;
  buildWorld(W,theme,rain);
  G.shardTotal=W.items.filter(i=>i.t==='shard').length;G.tagTotal=W.items.filter(i=>i.t==='tag').length;
  for(const e of W.enemies)makeEnemy(e.t,e.x,e.y,e.z,e.island,false);
  for(const b of W.bosses)makeBoss(b.t,b.x,b.y,b.z,b.island);
  for(const c of W.civs)makeCiv(c.x,c.y,c.z,c.island);
  resetPlayer(W.start,W.start.face||0);P.hp=P.hpMax;
  CAM.cur=CAM.dist;CAM.roll=0;
}
function levelMusic(){
  const D=G.mode==='campaign'?NF_DISTRICTS[G.level]:{bpm:136,root:43};
  AUDIO.music.start({bpm:D.bpm,root:D.root,seed:G.mode==='campaign'?G.level*977+13:G.seed,intensity:G.mode==='campaign'?0:1});
}
function startCampaign(){G.mode='campaign';G.daily=null;G.weekly=null;G.chal=null;G.score=0;G.maxCombo=0;G.totals={kos:0,shards:0,time:0};startDistrict(0);}
function startDistrict(n){
  const D=NF_DISTRICTS[n];G.mode='campaign';G.D=D;
  loadDistrict(n,nfBuild(D),D.theme,D.rain);
  G.startScore=G.score;SV.cont={level:n,skill:G.skill,score:G.score};save();
  levelMusic();AUDIO.play('levelup');
  G.scene='play';introScene();
}
function continueGame(){G.daily=null;G.weekly=null;G.chal=null;G.skill=SV.cont.skill;G.score=SV.cont.score||0;G.maxCombo=0;G.totals={kos:0,shards:0,time:0};startDistrict(SV.cont.level);}
function enterPlay(){G.scene='play';if(!G.touch)lockMouse();}
function restart(){if(G.mode==='campaign'){G.score=G.startScore||0;startDistrict(G.level);}else if(G.mode==='challenge')startChallenge(G.chal);else startArena(G.mode);}
function pause(){if(G.scene!=='play')return;G.scene='paused';G.menu=0;releaseMouse();}
function resume(){G.scene='play';if(!G.touch)lockMouse();}
function toTitle(){
  releaseMouse();
  G.mode='campaign';G.daily=null;G.weekly=null;G.chal=null;
  const D=NF_DISTRICTS[0];G.D=D;loadDistrict(0,nfBuild(D),D.theme,D.rain);
  for(const e of G.ents)if(e.boss)e.hidden=true;
  G.scene='title';G.menu=0;AUDIO.music.start({title:true,bpm:120,root:45,seed:5});
}
function districtKeys(){const k=new Set(WORLD.gates.map(g=>g.key));for(const m of WORLD.movers)if(m.key)k.add(m.key);return[...k];}
function bossAlive(){return G.ents.some(e=>e.boss&&!e.dead);}
function uplinkReady(){return districtKeys().every(k=>G.keys[k])&&!bossAlive();}
function finishDistrict(){
  const D=G.D,n=G.level,pct=(a,b)=>b?Math.round(a/b*100):100;
  const ko=pct(G.kosPlaced,G.enemyTotal),secrets=pct(G.shards+G.tags,G.shardTotal+G.tagTotal);
  const medals=(G.tookDamage?0:1)|(secrets>=100?2:0)|(G.time<=D.par?4:0)|(ko>=100?8:0);
  const before=SV.medals[n]||0,fresh=medals&~before;
  let bonus=0;if(G.time<=D.par)bonus+=Math.round((D.par-G.time)*20);if(ko>=100)bonus+=1500;if(secrets>=100)bonus+=1500;if(!G.tookDamage)bonus+=3000;
  award(bonus,null);
  const ls=G.score-(G.startScore||0);
  G.tally={name:D.name,ko,secrets,time:G.time,par:D.par,deaths:P.deaths,medals,fresh,bonus:Math.round(bonus*SKILLS[G.skill].mult),levelScore:ls,newBest:ls>(SV.best[n]||0),last:n===NF_DISTRICTS.length-1,xp:G.xpGain};
  SV.medals[n]=before|medals;SV.best[n]=Math.max(SV.best[n]||0,ls);SV.reached=Math.max(SV.reached,n+1);
  G.totals.kos+=G.kos;G.totals.shards+=G.shards;G.totals.time+=G.time;
  if(G.tally.last){SV.beaten=true;SV.cont=null;}else SV.cont={level:n+1,skill:G.skill,score:G.score};
  save();
  AUDIO.play(fresh?'medal':'levelup');AUDIO.music.intensity(0);
  releaseMouse();
  if(G.tally.last)endScene();else G.scene='tally';
}
function nextDistrict(){if(G.tally&&G.tally.last){G.scene='end';return;}startDistrict(G.level+1);}

/* ---- challenges ---- */
function startChallenge(C){
  G.mode='challenge';G.chal=C;G.daily=null;G.weekly=null;G.skill=2;G.score=0;G.maxCombo=0;G.wave=0;G.seed=C.seed;
  const W=nfChallenge(C);loadDistrict(0,W,C.theme,C.kind==='roof'||C.kind==='market');
  if(C.type==='combat'){G.waveState='break';G.waveT=2;G.spawnQ=[];}
  if(C.type==='glide'){G.ringsGot=0;for(const e of G.ents)e.hidden=true;}
  msg(C.name+'  ·  '+({combat:'CLEAR THREE WAVES',stealth:'TAKE THEM ALL DOWN UNSEEN',glide:'FLY THROUGH THE RINGS TO THE FAR ROOF'})[C.type]);
  levelMusic();AUDIO.play('levelup');enterPlay();
}
function challengeTick(dt){
  const C=G.chal;
  if(C.type==='combat'){
    if(G.waveState==='break'){G.waveT-=dt;if(G.waveT<=0){if(G.wave>=C.waves.length){challengeEnd();return;}G.wave++;spawnWave(C.waves[G.wave-1]);G.waveState='fight';msg('WAVE '+G.wave+' OF '+C.waves.length);}return;}
    spawnTick(dt);
    if(!G.ents.some(e=>!e.dead)&&!G.spawnQ.length&&!G.warps.some(w=>w.spawn&&!w.done)){award(G.wave*800,'WAVE CLEARED');G.waveState='break';G.waveT=2.5;}
  }else if(C.type==='stealth'){
    if(!G.ents.some(e=>!e.dead&&!e.hidden)){if(!G.spotted)award(3000,'NEVER SEEN');challengeEnd();}
  }else if(C.type==='glide'){
    const ex=WORLD.W.exit;if(ex&&Math.hypot(P.x-ex.x,P.z-ex.z)<6&&Math.abs(P.y-ex.y)<2&&P.onGround)challengeEnd();
  }
}
function challengeEnd(){
  const C=G.chal;let value,stars;
  if(C.type==='glide'){value=G.time+(WORLD.rings.length-G.ringsGot)*4;stars=C.stars.filter(t=>value<=t).length;}
  else{value=G.score;stars=C.stars.filter(t=>value>=t).length;}
  const prev=SV.stars[C.id]||0;SV.stars[C.id]=Math.max(prev,stars);
  const best=SV.chBest[C.id];const isBest=best===undefined||(C.type==='glide'?value<best:value>best);
  if(isBest)SV.chBest[C.id]=value;
  SV.xp+=stars*400;save();
  G.result={kind:'challenge',name:C.name,type:C.type,value,stars,newStars:stars>prev,isBest,best:SV.chBest[C.id],maxCombo:G.maxCombo};
  releaseMouse();
  AUDIO.play(stars?'medal':'levelup');
  qualify('chal:'+C.id,C.type==='glide'?-Math.round(value*10):value);
}

/* ---- Overdrive, the daily run and the weekly gauntlet ---- */
function startArena(mode){
  G.mode=mode;G.chal=null;G.skill=2;G.score=0;G.maxCombo=0;G.wave=0;
  G.daily=mode==='daily'?nfDaily():null;G.weekly=mode==='weekly'?nfWeekly():null;
  G.seed=mode==='daily'?G.daily.seed:mode==='weekly'?G.weekly.seed:((Math.random()*1e9)|0);
  const kinds=['market','vault','roof','core','spire'],kind=kinds[G.seed%5];
  const W=nfArena(G.seed,kind);W.exit=null;
  loadDistrict(0,W,mode==='weekly'?'core':'arena',mode==='daily');
  G.waveState='break';G.waveT=3;G.spawnQ=[];
  msg(mode==='daily'?'DAILY '+G.daily.label+'  ·  '+G.daily.twist.name+': '+G.daily.twist.d.toUpperCase():mode==='weekly'?'WEEKLY GAUNTLET '+G.weekly.label+'  ·  TEN WAVES':'OVERDRIVE  ·  SURVIVE');
  levelMusic();AUDIO.play('levelup');enterPlay();
}
function spawnWave(spec){
  if(spec.startsWith('BOSS:')){const I=WORLD.W.islands.a;makeBoss(spec.slice(5),I.x,I.y,I.z-6,'a');for(const e of G.ents)if(e.boss&&!e.dead){e.state='chase';e.aware=true;e.introduced=true;}AUDIO.music.start({boss:true,bpm:140,root:40,seed:spec.length*31,intensity:2});return;}
  G.spawnQ=spec.split('').map(c=>NF_ENEMY[c]).filter(Boolean);G.spawnT=0.3;
}
function buildWave(n){
  let budget=3+n*2.2;const q=[],cost={thug:1,drone:1.2,guard:1.5,knife:1.4,baton:1.8,shield:2,hacker:2.5,ninja:2.6,brute:4,mech:7};
  if(twist('heavy')&&n%3===0){q.push('mech');budget-=4;}
  if(n>=5&&n%5===0){q.push('mech');budget-=cost.mech;}
  if(twist('ghost')){q.push('hacker');budget-=cost.hacker;}
  const r=mulberry32(G.seed+n*131),pool=['thug','thug','thug','drone','guard','knife'].concat(n>=2?['baton','shield']:[],n>=3?['hacker','ninja']:[],n>=4?['brute']:[]);
  while(budget>0){let t=pool[(r()*pool.length)|0];if(twist('swarm')&&r()<0.3)t='drone';q.push(t);budget-=cost[t];}
  return q;
}
function spawnTick(dt){
  if(!G.spawnQ.length)return;G.spawnT-=dt;if(G.spawnT>0)return;
  const t=G.spawnQ.shift(),b=WORLD.bounds;
  for(let k=0;k<30;k++){const x=lerp(b.x0+3,b.x1-3,rng()),z=lerp(b.z0+3,b.z1-3,rng());
    if(Math.hypot(x-P.x,z-P.z)<8)continue;const g=groundAt(x,z,b.maxY+1);if(!g||g.k!=='deck')continue;
    G.warps.push({x,y:g.y1,z,t:0,spawn:t,island:'a'});AUDIO.play('warp',0.4);break;}
  G.spawnT=Math.max(0.3,0.9-G.wave*0.03);
}
function arenaTick(dt){
  if(G.waveState==='break'){G.waveT-=dt;if(G.waveT<=0){
    if(G.mode==='weekly'&&G.wave>=10){arenaOver(true);return;}
    G.wave++;if(G.mode==='weekly')spawnWave(G.weekly.waves[G.wave-1]);else{G.spawnQ=buildWave(G.wave);G.spawnT=0.3;}
    G.waveState='fight';msg('WAVE '+G.wave+(G.mode==='weekly'?' OF 10':''));AUDIO.play('alert');}return;}
  spawnTick(dt);
  if(!G.ents.some(e=>!e.dead)&&!G.spawnQ.length&&!G.warps.some(w=>w.spawn&&!w.done)){
    const bonus=G.wave*500*(twist('scav')?2:1);G.score+=bonus;SV.xp+=Math.round(bonus/3);pop('WAVE '+G.wave+' CLEARED',bonus);AUDIO.play('medal');
    G.waveState='break';G.waveT=5;levelMusic();
    let n=2+Math.floor(G.wave/3);if(twist('scav'))n=Math.ceil(n/2);
    for(let i=0;i<n;i++){const b=WORLD.bounds,x=lerp(b.x0+6,b.x1-6,rng()),z=lerp(b.z0+6,b.z1-6,rng()),g=groundAt(x,z,b.maxY+1);if(g)WORLD.items.push({t:'stim',x,y:g.y1+0.8,z,taken:false,bob:0,dropped:true});}
    G.ents=G.ents.filter(e=>!e.dead||e.st<9);
  }
}
function arenaOver(won){
  const key=G.mode==='daily'?'daily':G.mode==='weekly'?'weekly':'od';
  if(won)award(10000,'GAUNTLET CLEARED');
  let best=0;
  if(key==='od'){best=SV.od;if(G.score>SV.od){SV.od=G.score;SV.odWave=G.wave;}}
  else if(key==='daily'){if(SV.daily.key!==G.daily.key)SV.daily={key:G.daily.key,best:0,wave:0};best=SV.daily.best;if(G.score>best){SV.daily.best=G.score;SV.daily.wave=G.wave;}}
  save();
  G.result={kind:'arena',name:key==='od'?'OVERDRIVE':key==='daily'?'DAILY '+G.daily.label:'WEEKLY '+G.weekly.label,wave:G.wave,value:G.score,maxCombo:G.maxCombo,isBest:G.score>best,best:Math.max(best,G.score),won};
  releaseMouse();
  qualify(key,G.score);
}
/* ---- high-score tables, with three initials ---- */
function tableFor(key){
  const T=SV.tables;
  if(key==='od')return T.od;
  if(key==='daily'){if(T.daily.key!==G.daily.key)T.daily={key:G.daily.key,list:[]};return T.daily.list;}
  if(key==='weekly'){if(T.weekly.key!==G.weekly.key)T.weekly={key:G.weekly.key,list:[]};return T.weekly.list;}
  const id=key.slice(5);return T.chal[id]||(T.chal[id]=[]);
}
function qualify(key,value){
  const L=tableFor(key);
  if(L.length<10||value>L[L.length-1].v){G.initials={key,value,letters:(SV.lastInitials||'KES').split(''),i:0};G.scene='initials';}
  else{G.scene='result';G.menu=0;}
}
const ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function initialsKey(c){
  const I=G.initials;
  if(c==='ArrowUp'||c==='KeyW')I.letters[I.i]=ALPHA[(ALPHA.indexOf(I.letters[I.i])+1)%ALPHA.length];
  else if(c==='ArrowDown'||c==='KeyS')I.letters[I.i]=ALPHA[(ALPHA.indexOf(I.letters[I.i])+ALPHA.length-1)%ALPHA.length];
  else if(c==='ArrowLeft'||c==='KeyA')I.i=Math.max(0,I.i-1);
  else if(c==='ArrowRight'||c==='KeyD')I.i=Math.min(2,I.i+1);
  else if(/^Key[A-Z]$|^Digit\d$/.test(c)){I.letters[I.i]=c.slice(-1);I.i=Math.min(2,I.i+1);}
  else if(c==='Enter')initialsDone();
  AUDIO.play('menu');
}
function initialsClick(ux,uy){
  const I=G.initials;
  for(let i=0;i<3;i++){const x=UW/2-40+i*40;if(Math.abs(ux-x)<16){if(uy<UH/2-6)initialsKey('ArrowUp');else if(uy>UH/2+24)initialsKey('ArrowDown');I.i=i;return;}}
  if(uy>UH/2+40)initialsDone();
}
function initialsDone(){
  const I=G.initials,L=tableFor(I.key),n=I.letters.join('');
  L.push({n,v:I.value,w:G.wave||0});L.sort((a,b)=>b.v-a.v);L.length=Math.min(L.length,10);
  SV.lastInitials=n;save();G.initials=null;G.scene='result';G.menu=0;
}
function shareLine(){const r=G.result;if(!r)return'';
  if(r.kind==='challenge')return 'NEON FURNACE · '+r.name+' · '+'★'.repeat(r.stars)+'☆'.repeat(3-r.stars)+' · '+(r.type==='glide'?r.value.toFixed(1)+'s':fmtNum(r.value));
  return 'NEON FURNACE · '+r.name+' · Wave '+r.wave+' · '+fmtNum(r.value)+' · '+r.maxCombo+' hit combo';}
function shareRun(){
  const t=shareLine(),done=()=>{G.copied=2.5;AUDIO.play('pickup');};
  const fb=()=>{try{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();done();}catch(e){}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();}catch(e){fb();}
}

/* ------------------------------------------------------------ the tick */
function pickups(){
  for(const it of WORLD.items){
    if(it.taken)continue;
    if(Math.hypot(it.x-P.x,it.z-P.z)<1.4&&Math.abs(it.y-(P.y+0.9))<1.9){
      if(it.t==='stim'){if(P.hp>=P.hpMax)continue;P.hp=Math.min(P.hpMax,P.hp+30);AUDIO.play('pickup');pop('STIM +30',0);}
      else if(it.t==='key'){G.keys[it.key]=true;AUDIO.play('key');msg(({B:'BLUE',Y:'YELLOW',R:'RED'})[it.key]+' KEYCARD');
        for(const g of WORLD.gates)if(g.key===it.key){g.opening=true;AUDIO.play('door');}storyEvent('key');}
      else if(it.t==='shard'){G.shards++;award(1000,'DATA SHARD');AUDIO.play('shard');}
      else if(it.t==='tag'){G.tags++;award(800,'TAG '+G.tags+'/'+G.tagTotal);AUDIO.play('shard');}
      else if(it.t==='radio'){if(G.mode==='campaign'){SV.logs[G.level]=true;save();radio('mira','A gang radio. I\'ve copied what was on it to your log.');}award(1000,'RADIO FOUND');AUDIO.play('radio');}
      it.taken=true;
    }
  }
  const ex=WORLD.W.exit;
  if(ex&&G.mode==='campaign'&&Math.hypot(P.x-ex.x,P.z-ex.z)<1.8&&Math.abs(P.y-ex.y)<2){
    if(uplinkReady())finishDistrict();
    else if(G.msgT<1){const need=districtKeys().filter(k=>!G.keys[k]).map(k=>({B:'BLUE',Y:'YELLOW',R:'RED'})[k]);
      msg(bossAlive()?'THE UPLINK IS LOCKED WHILE '+bossInfo(G.ents.find(e=>e.boss&&!e.dead)).name+' STANDS':'THE UPLINK NEEDS THE '+need.join(' AND ')+' KEYCARD'+(need.length>1?'S':''));AUDIO.play('nope');}
  }
}
function objective(){
  if(G.mode==='challenge'){if(G.chal.type==='glide'){const rg=WORLD.rings.find(r=>!r.got);const t=rg||WORLD.W.exit;return t?{label:rg?'NEXT RING':'LAND ON THE FAR ROOF',x:t.x,y:t.y,z:t.z,c:[.3,.9,1]}:null;}return null;}
  if(G.mode!=='campaign')return null;
  const b=G.ents.find(e=>e.boss&&!e.dead&&e.aware);
  if(b)return{label:'TAKE DOWN '+bossInfo(b).name,x:b.x,y:b.y,z:b.z,c:bossInfo(b).color};
  const need=districtKeys().filter(k=>!G.keys[k]);
  if(need.length){let best=null,bd=1e9;for(const it of WORLD.items)if(it.t==='key'&&!it.taken&&need.includes(it.key)){const d=Math.hypot(it.x-P.x,it.z-P.z);if(d<bd){bd=d;best=it;}}
    if(best)return{label:'FIND THE '+({B:'BLUE',Y:'YELLOW',R:'RED'})[best.key]+' KEYCARD',x:best.x,y:best.y,z:best.z,c:KEYCOL[best.key]};}
  const bb=G.ents.find(e=>e.boss&&!e.dead);
  if(bb)return{label:'FIND '+bossInfo(bb).name,x:bb.x,y:bb.y,z:bb.z,c:bossInfo(bb).color};
  const ex=WORLD.W.exit;return ex?{label:'REACH THE UPLINK',x:ex.x,y:ex.y,z:ex.z}:null;
}
function musicIntensity(){
  let n=0;for(const e of G.ents)if(!e.dead&&e.aware&&e.state!=='idle'&&Math.hypot(e.x-P.x,e.z-P.z)<25)n++;
  let lv=n>=3||G.combo>=10?2:n>=1?1:0;
  if(G.mode!=='campaign'&&G.mode!=='challenge'&&G.waveState==='fight')lv=Math.max(lv,G.wave>=3?2:1);
  return lv;
}
function cameraUpdate(dt){
  const k=0.0021*(SV.sens/5);
  CAM.yaw-=lookDX*k;CAM.pitch=clamp(CAM.pitch+lookDY*k,-0.55,1.1);lookDX=lookDY=0;
  if(G.touch&&!TOUCH.look&&Math.hypot(P.vx,P.vz)>3&&P.state==='move')CAM.yaw+=angDiff(P.yaw,CAM.yaw)*Math.min(1,0.9*dt);
  if(!P.gliding)CAM.roll=lerp(CAM.roll,0,Math.min(1,4*dt));
  CAM.dip=Math.max(0,CAM.dip-dt*1.6);
  // a slow, close look at the last knockout of a fight
  if(G.cine){G.cine.t-=dt;const c=G.cine,f=[Math.sin(CAM.yaw),Math.cos(CAM.yaw)],sx=-f[1]*c.side,sz=f[0]*c.side;
    CAM.pos=[c.x+sx*3.6-f[0]*1.5,c.y+1.5,c.z+sz*3.6-f[1]*1.5];CAM.target=[c.x,c.y+0.9,c.z];CAM.fov=0.85;if(c.t<=0)G.cine=null;return;}
  // pull back to frame a crowd
  let cx=0,cz=0,n=0,spread=0;for(const e of G.ents)if(!e.dead&&e.aware&&!e.civ){const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<13){cx+=e.x;cz+=e.z;n++;spread=Math.max(spread,d);}}
  const boss=G.ents.find(e=>e.boss&&e.aware&&!e.dead);
  const want=P.gliding?8.2:boss?9:CAM.dist+(n>1?Math.min(3.5,spread*0.28):0);
  const cp=Math.cos(CAM.pitch),fx=Math.sin(CAM.yaw)*cp,fy=-Math.sin(CAM.pitch),fz=Math.cos(CAM.yaw)*cp;
  const rx=-Math.cos(CAM.yaw),rz=Math.sin(CAM.yaw);
  let tx=P.x+rx*0.55,ty=P.y+1.6-CAM.dip,tz=P.z+rz*0.55;
  if(n>1){tx=lerp(tx,cx/n,0.2);tz=lerp(tz,cz/n,0.2);}
  const hit=raycast(tx,ty,tz,-fx,-fy,-fz,want+0.4,true);
  const d=Math.max(1.2,Math.min(want,hit-0.35));
  CAM.cur=d<CAM.cur?d:lerp(CAM.cur,d,Math.min(1,3*dt));
  const sh=CAM.shake;CAM.shake=Math.max(0,CAM.shake-dt*1.6);
  const jx=(rng()-.5)*sh*0.5,jy=(rng()-.5)*sh*0.5;
  CAM.pos=[tx-fx*CAM.cur+jx,ty-fy*CAM.cur+jy,tz-fz*CAM.cur];
  CAM.target=[tx+fx*2,ty+fy*2+jy*0.5,tz+fz*2];
  CAM.fov=lerp(CAM.fov,(P.state==='dash'||P.gliding||P.diving?1.2:1.06),Math.min(1,4*dt));
}
let titleT=0;
function titleCamera(dt){
  titleT+=dt;const s=WORLD.W.start,a=titleT*0.06;
  CAM.pos=[s.x+Math.sin(a)*26,s.y+11+Math.sin(titleT*0.2)*2,s.z+Math.cos(a)*26];CAM.target=[s.x,s.y+4,s.z-8];CAM.fov=1.05;CAM.roll=0;
}
function playTick(dt){
  let gdt=dt;
  if(G.hitstop>0){G.hitstop-=dt;gdt*=0.08;}
  if(G.slow>0){G.slow-=dt;gdt*=0.35;}
  G.time+=gdt;G.clock+=gdt;G.noise=Math.max(0,G.noise-dt);
  if(IN.strikeP)G.noise=0.4;
  worldUpdate(gdt);
  playerUpdate(gdt);discUpdate(gdt);
  for(const e of G.ents)enemyUpdate(e,gdt);
  G.ents=G.ents.filter(e=>!e.gone);
  for(const c of G.civs)civUpdate(c,gdt);
  shotsUpdate(gdt);effectsUpdate(gdt);strikesUpdate(gdt);radioUpdate(dt);pickups();
  // patrol searchlights give you away if you stand in them unseen
  for(const p of WORLD.patrols)if(p.spot&&Math.hypot(P.x-p.spot[0],P.z-p.spot[2])<3&&Math.abs(P.y-p.base)<2){const e=G.ents.find(o=>!o.dead&&o.island===p.island&&o.state==='idle');if(e){alertGroup(e);msg('SPOTLIGHT');}}
  if(G.comboT>0){G.comboT-=gdt;if(G.comboT<=0)G.combo=0;}
  if(G.mode==='challenge')challengeTick(gdt);
  else if(G.mode!=='campaign'){arenaTick(gdt);if(P.state==='down'&&P.st>1.2&&G.scene==='play')arenaOver(false);}
  if(G.mode==='challenge'&&P.state==='down'&&P.st>1.2&&G.scene==='play'&&G.chal.type!=='glide')challengeEnd();
  AUDIO.music.intensity(musicIntensity());
  cameraUpdate(dt);
}

let last=performance.now(),fpsAcc=0,fpsN=0,fpsShown=60,lowT=0;
const fpsOut=document.getElementById('fpsOut');
function frame(now){
  let dt=(now-last)/1000;last=now;if(dt>0.1)dt=0.1;
  resizeCanvas();
  fpsAcc+=dt;fpsN++;
  if(fpsAcc>0.5){fpsShown=Math.round(fpsN/fpsAcc);fpsOut.textContent=fpsShown+' fps · '+Q.name;fpsAcc=0;fpsN=0;
    // on AUTO, step the quality down rather than stutter
    if(G.scene==='play'&&SV.quality==='auto'&&fpsShown<40){lowT++;if(lowT>4){lowT=0;if(Q===QUALITY.high)Q=QUALITY.medium;else if(Q===QUALITY.medium)Q=QUALITY.low;else renderScale=Math.max(0.5,renderScale-0.1);renderScale=Math.min(renderScale,Q.scale);}}else lowT=0;}
  if(G.copied>0)G.copied-=dt;
  readKeys();
  if(G.scene==='play')playTick(dt);
  else if(G.scene==='cut'){cutUpdate(dt);G.clock+=dt;worldUpdate(dt);for(const c of G.civs)civUpdate(c,dt);radioUpdate(dt);}
  else if(['title','skill','armory','sound','boot','challenges','upgrades','log','scores'].includes(G.scene)){
    G.clock+=dt;worldUpdate(dt);for(const e of G.ents)if(e.state==='idle'&&!e.boss)enemyUpdate(e,dt);for(const c of G.civs)civUpdate(c,dt);if(WORLD.W)titleCamera(dt);}
  // weather: in the rain, now and then lightning lights the whole sky, and the thunder follows
  if(WORLD.rain&&G.scene!=='boot'&&rng()<dt/22){G.flash=Math.max(G.flash,0.55+rng()*0.3);const v=0.25+rng()*0.2;setTimeout(()=>AUDIO.play('thunder',v),300+rng()*900);}
  G.hurt=Math.max(0,G.hurt-dt*1.6);G.glitch=Math.max(0,G.glitch-dt*1.4);G.flash=Math.max(0,G.flash-dt*3);if(G.msgT>0)G.msgT-=dt;
  for(const p of G.pops)p.t+=dt;G.pops=G.pops.filter(p=>p.t<2.2);
  if(GL_OK&&WORLD.W){
    R.dyn.clear();R.glass.clear();R.add.clear();
    sceneryFrame(G.clock,dt);
    drawActors(G.clock);
    const extra=[];
    for(const h of G.hitFlash)extra.push({x:h.x,y:h.y,z:h.z,r:7,c:[1,.85,.6],i:3});
    for(const s of G.shots)extra.push({x:s.x,y:s.y,z:s.z,r:5,c:s.c,i:2});
    const L=pickLights(CAM.target[0],CAM.target[1],CAM.target[2],extra);
    const hs=WORLD.halos.slice();for(const s of G.shots)hs.push(s.x,s.y,s.z,s.c[0],s.c[1],s.c[2],4);for(const h of G.hitFlash)hs.push(h.x,h.y,h.z,1,.85,.6,6);
    glRender(CAM,WORLD.T,L,{rain:WORLD.rain,hurt:G.hurt,glitch:G.glitch,slow:G.slow>0?1:0,blur:P.state==='dash'||P.diving?0.8:0,bars:G.scene==='cut'?1:0,flash:G.flash,halos:hs},G.clock,[P.x,P.y,P.z]);
  }
  drawHUD(dt);
  clearEdges();
  requestAnimationFrame(frame);
}
