/* ================================ ACTORS =================================
   KESTREL moves and fights; the city's gangs, guards and machines take turns
   to attack, flash a warning first, and each kind needs its own answer.    */
const STYLES={
  stock:{suit:[.42,.42,.5],trim:[1,.15,.25],visor:[1,.2,.25],plate:[.55,.55,.62]},
  chrome:{suit:[.85,.88,.95],trim:[.2,.95,1],visor:[.3,1,1],plate:[1,1,1]},
  toxic:{suit:[.35,.55,.35],trim:[.6,1,.25],visor:[.6,1,.3],plate:[.45,.7,.45]},
  gold:{suit:[.8,.62,.3],trim:[1,.8,.3],visor:[1,.85,.4],plate:[1,.85,.45]},
  glitch:{suit:[.3,.28,.38],trim:[1,.25,.7],visor:[.2,.95,1],plate:[.45,.4,.55]},
  neon:{suit:[.35,.3,.45],trim:[.75,.4,1],visor:[.9,.5,1],plate:[.5,.45,.6]},
  shadow:{suit:[.18,.18,.22],trim:[.9,.9,1],visor:[1,1,1],plate:[.25,.25,.3]},
  prism:{suit:[.6,.6,.7],trim:[1,.5,.2],visor:[.3,1,.6],plate:[.8,.8,.9]}
};
const has=id=>SV.up.includes(id);
const P={x:0,y:0,z:0,vx:0,vy:0,vz:0,hw:0.34,h:1.8,yaw:0,onGround:false,ground:null,jumps:0,coyote:0,
  state:'move',st:0,dur:0,gliding:false,hp:100,hpMax:100,inv:0,move:null,queue:false,target:null,hitDone:false,lunge:0,
  wall:null,wallT:0,wallUsed:false,airT:0,grap:null,disc:null,cdDisc:0,cdEmp:0,cdSmoke:0,cdDash:0,
  pose:POSE0(),ph:0,checkpoint:null,safeT:0,deaths:0,trail:[],scarf:{},ledge:null,diving:false,cdir:'front'};
const CAM={yaw:0,pitch:0.28,dist:6.4,pos:[0,0,0],target:[0,0,0],shake:0,fov:1.08,cur:6.4,roll:0,dip:0};
function camFwd(){return[Math.sin(CAM.yaw),Math.cos(CAM.yaw)];}
function inputDir(){
  const [fx,fz]=camFwd(),rx=-fz,rz=fx;
  let x=fx*IN.mz+rx*IN.mx,z=fz*IN.mz+rz*IN.mx;const m=Math.hypot(x,z);
  return m>0.05?[x/Math.max(1,m),z/Math.max(1,m),Math.min(1,m)]:[0,0,0];
}
function STY(){return STYLES[SV.finish]||STYLES.stock;}
function resetPlayer(pos,face){
  Object.assign(P,{x:pos.x,y:pos.y,z:pos.z,vx:0,vy:0,vz:0,state:'move',st:0,gliding:false,jumps:0,inv:1,grap:null,disc:null,target:null,wall:null,ledge:null,diving:false,scarf:{},rag:null});
  P.hpMax=100+15*['armor1','armor2','armor3'].filter(has).length;
  P.yaw=face||0;CAM.yaw=P.yaw;P.checkpoint={x:pos.x,y:pos.y,z:pos.z,face:P.yaw};
}
function playerDamage(d,from,kind){
  if(P.inv>0||P.state==='down'||G.god||G.scene!=='play')return false;
  d*=twist('glass')?2:1;
  P.hp-=d;G.tookDamage=true;G.hurt=Math.min(1,G.hurt+0.35+d/40);G.glitch=Math.min(1,G.glitch+0.2);CAM.shake=Math.max(CAM.shake,0.25+d/40);
  breakCombo();AUDIO.play(kind==='shock'?'zap':'pain',clamp(d/22,0.35,1));
  if(P.hp<=0){P.hp=0;set('down');P.gliding=false;AUDIO.play('dead');ragStart(P,from?P.x-from.x:0,from?P.z-from.z:1,4,4);return true;}
  set('hurt');P.gliding=false;P.diving=false;
  if(from){const dx=P.x-from.x,dz=P.z-from.z,l=Math.hypot(dx,dz)||1;P.vx=dx/l*6;P.vz=dz/l*6;}
  P.inv=0.45;
  return true;
}
function set(state,dur){P.state=state;P.st=0;P.dur=dur||0;}

/* ------------------------------------------------------------- the player */
function playerUpdate(dt){
  const M=NF_MOVE;
  P.inv-=dt;P.cdDisc-=dt;P.cdEmp-=dt;P.cdSmoke-=dt;P.cdDash-=dt;P.st+=dt;
  if(P.ground&&P.ground.mover){P.x+=P.ground.dx;P.y+=P.ground.dy;P.z+=P.ground.dz;}
  const belt=P.onGround?beltAt(P.x,P.y,P.z):0;if(belt)P.x+=belt*dt;
  const [ix,iz,im]=inputDir();
  let tp=POSE0();
  const S=P.state;
  if(S==='down'){
    ragUpdate(P,dt);tp=null;
    if(P.st>2.3){P.rag=null;respawn(true);}
  }else if(S==='grapple'){
    const a=P.grap,dx=a.x-P.x,dy=a.y+0.2-P.y,dz=a.z-P.z,d=Math.hypot(dx,dy,dz),sp=Math.min(36,10+P.st*60);
    if(IN.jumpP&&d<6)P.boostReady=true;
    if(d<1.2||P.st>2.5){
      const t=WORLD.boxes[a.box]||null;
      if(t){const cx=clamp(a.x,t.x0+0.6,t.x1-0.6),cz=clamp(a.z,t.z0+0.6,t.z1-0.6);P.x=lerp(a.x,cx,0.6);P.z=lerp(a.z,cz,0.6);P.y=t.y1+0.05;}
      P.vx=Math.sin(P.yaw)*3;P.vz=Math.cos(P.yaw)*3;P.vy=4;set('move');P.grap=null;P.jumps=1;AUDIO.play('land',0.6);
      if(P.boostReady||IN.jump){const k=has('boost')?1.35:1;P.vy=13*k;P.vx=Math.sin(P.yaw)*9*k;P.vz=Math.cos(P.yaw)*9*k;P.jumps=1;AUDIO.play('vent');}
      P.boostReady=false;
    }else{P.vx=dx/d*sp;P.vy=dy/d*sp;P.vz=dz/d*sp;P.yaw=Math.atan2(dx,dz);}
    Object.assign(tp,{aR:[-2.9,0.1,0],aL:[-0.4,0.6,-0.6],lL:[0.5,0.9],lR:[-0.3,0.6],lean:0.5});
  }else if(S==='dash'){
    if(P.st>0.2){set('move');P.vx*=0.4;P.vz*=0.4;}
    if(P.onGround&&P.slide)Object.assign(tp,{lean:-0.85,hip:-0.45,lL:[-1.3,0.2],lR:[-0.6,1.4],aL:[-0.6,0.8,-0.4],aR:[0.4,0.6,0]});
    else Object.assign(tp,{lean:0.7,aL:[0.8,0.3,0],aR:[0.8,0.3,0],lL:[-0.6,0.8],lR:[0.4,0.3]});
    P.trail.push({x:P.x,y:P.y,z:P.z,yaw:P.yaw,t:0.25});
  }else if(S==='vault'||S==='climb'||S==='roll'){
    const k=clamp(P.st/P.dur,0,1);tp=samplePose(MOVES[S],k,POSE0());
    if(S==='vault'){P.y=P.vaultY+Math.sin(Math.PI*k)*1.1;P.x+=P.vx*dt;P.z+=P.vz*dt;}
    if(S==='climb'){const L=P.ledge;P.y=lerp(L.y0,L.top+0.02,ease(clamp(k*1.4,0,1)));if(k>0.6){P.x=lerp(L.x0,L.x1,ease((k-0.6)/0.4));P.z=lerp(L.z0,L.z1,ease((k-0.6)/0.4));}}
    if(S==='roll'){P.vx*=Math.pow(0.4,dt);P.vz*=Math.pow(0.4,dt);}
    if(k>=1){set('move');P.vy=0;if(S==='climb')P.onGround=true;}
    if(S!=='roll'){blendPose(P.pose,tp,1);tp=null;}
  }else if(S==='strike'||S==='counter'||S==='takedown'||S==='special'||S==='finisher'){
    if(IN.counterP&&S==='strike'){tryCounter();}
    else if((IN.dashP||IN.grappleP||IN.jumpP)&&(P.hitDone||S==='counter')&&S!=='takedown'&&S!=='special'){set('move');P.target=null;}
    if(P.state!=='move'){strikeUpdate(dt,tp);tp=null;}
  }
  if(P.state==='hurt'){
    P.vx*=Math.pow(0.02,dt);P.vz*=Math.pow(0.02,dt);
    tp=POSE0();Object.assign(tp,{lean:-0.5,aL:[-0.5,0.8,-1],aR:[-0.5,0.8,-1]});
    if(P.st>0.32)set('move');
  }else if(P.state==='move'){
    tp=POSE0();
    if(P.onGround){P.coyote=0.12;P.jumps=0;P.wallUsed=false;P.gliding=false;P.airT=0;}
    else{P.coyote-=dt;P.airT+=dt;}
    const want=P.gliding||P.diving?0:M.run*im,ctrl=P.onGround?14:3.5;
    if(!P.gliding&&!P.diving){
      P.vx+=(ix*want-P.vx)*Math.min(1,ctrl*dt);P.vz+=(iz*want-P.vz)*Math.min(1,ctrl*dt);
      if(im>0.1){const ty=Math.atan2(ix,iz);P.yaw+=angDiff(ty,P.yaw)*Math.min(1,12*dt);}
    }
    if(IN.jumpP){
      const sh=nearShield();
      if(P.onGround&&sh)vaultOver(sh);
      else if(P.onGround&&im>0.3&&tryVault()){}
      else if(P.wall&&P.wallT>0){P.vx=P.wall.nx*7.5+Math.sin(P.yaw)*3;P.vz=P.wall.nz*7.5+Math.cos(P.yaw)*3;P.vy=9;P.wall=null;P.wallT=0;P.jumps=1;P.yaw=Math.atan2(P.vx,P.vz);AUDIO.play('jump',0.8);}
      else if(P.onGround||P.coyote>0){P.vy=M.jump;P.jumps=1;P.coyote=0;P.onGround=false;AUDIO.play('jump',0.7);}
      else if(P.jumps<2){P.vy=M.jump2;P.jumps=2;P.gliding=false;AUDIO.play('jump',0.9);
        for(let i=0;i<8;i++)spark(P.x,P.y,P.z,(rng()-.5)*4,-1-rng()*2,(rng()-.5)*4,STY().trim,0.3);}
    }
    if(P.state==='move'){
      if(!P.onGround&&IN.jump&&P.vy<0&&(P.jumps>=1||P.airT>0.3)&&!P.wall&&!P.diving){if(!P.gliding)AUDIO.play('glide');P.gliding=true;}
      if(P.gliding&&(!IN.jump||P.onGround))P.gliding=false;
      const wind=windAt(P.x,P.y,P.z);
      if(P.diving){
        P.vy=Math.max(P.vy-60*dt,-30);P.vx*=Math.pow(0.6,dt);P.vz*=Math.pow(0.6,dt);
        Object.assign(tp,{lean:1.7,aL:[0.4,0.3,0],aR:[0.4,0.3,0],lL:[0.3,0.1],lR:[0.3,0.1],head:-1.2,wings:0.25});
      }else if(P.gliding){
        if(im>0.1){const ty=Math.atan2(ix,iz);P.yaw+=angDiff(ty,P.yaw)*Math.min(1,2.6*dt);}
        const sp=Math.hypot(P.vx,P.vz),tsp=lerp(sp,M.glideSpeed*(has('glide')?1.25:1),Math.min(1,1.5*dt));
        P.vx=Math.sin(P.yaw)*tsp+wind[0]*0.6;P.vz=Math.cos(P.yaw)*tsp+wind[1]*0.6;
        P.vy=Math.max(P.vy-M.gravity*0.25*dt,-M.glideFall);
        for(const v of WORLD.vents)if(Math.hypot(P.x-v.x,P.z-v.z)<v.r+1.5&&P.y<v.y+v.lift+4)P.vy=Math.min(P.vy+46*dt,10);
        if(IN.strikeP){P.diving=true;P.gliding=false;AUDIO.play('whoosh');IN.strikeP=false;}
        Object.assign(tp,{lean:1.25,aL:[0,1.45,0],aR:[0,1.45,0],lL:[0.15,0.1],lR:[0.15,0.1],wings:1,head:-0.9});
      }else if(P.wall&&P.wallT>0){
        P.wallT-=dt;P.vy=Math.max(P.vy-6*dt,-1);
        P.ph+=dt*14;poseRun(tp,P.ph,1,0.2);tp.tilt=(P.wall.nx||P.wall.nz)*0.35;
        if(P.wallT<=0||P.onGround)P.wall=null;
      }else{P.vy-=M.gravity*dt;if(!P.onGround){P.vx+=wind[0]*dt*0.4;P.vz+=wind[1]*dt*0.4;}}
      if(P.onGround)for(const v of WORLD.vents)if(Math.hypot(P.x-v.x,P.z-v.z)<v.r&&Math.abs(P.y-v.y)<0.6&&IN.jumpP){P.vy=15;AUDIO.play('vent');}
      if(IN.dashP&&P.cdDash<=0){
        const [dx,dz]=im>0.1?[ix,iz]:[Math.sin(P.yaw),Math.cos(P.yaw)];
        P.slide=P.onGround&&Math.hypot(P.vx,P.vz)>5;
        set('dash');P.vx=dx*M.dash;P.vz=dz*M.dash;P.vy=Math.max(P.vy,0);P.yaw=Math.atan2(dx,dz);P.inv=0.3;P.cdDash=0.45;P.gliding=false;AUDIO.play('whoosh');
      }
      if(IN.grappleP)tryGrapple();
      if(IN.strikeP&&!P.diving)beginStrike();
      if(IN.counterP)tryCounter();
      if(IN.specialP)trySpecial();
      if(IN.discP)throwDisc();
      if(IN.empP)useEMP();
      if(IN.smokeP)useSmoke();
      if(P.state==='move'&&!P.gliding&&!P.diving&&!P.wall){
        const sp=Math.hypot(P.vx,P.vz);
        if(!P.onGround){Object.assign(tp,{lL:[-0.7,1.1],lR:[-0.2,0.6],aL:[-1.2,0.5,-0.8],aR:[-0.6,0.6,-0.6],lean:0.15});if(P.jumps===2&&P.vy>2)tp.roll=(1-P.vy/M.jump2)*TAU*0.999;}
        else if(sp>0.6){P.ph+=dt*sp/2.2*Math.PI;poseRun(tp,P.ph,Math.min(1,sp/M.run),0.22);}
        else poseIdle(tp,G.clock,G.ents.some(e=>!e.dead&&e.aware&&Math.hypot(e.x-P.x,e.z-P.z)<9)?'guard':'idle');
      }
    }
  }
  if(tp){
    let near=null,nd=10;for(const e of G.ents)if(!e.dead&&e.aware){const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<nd){nd=d;near=e;}}
    if(near)tp.headY=clamp(angDiff(Math.atan2(near.x-P.x,near.z-P.z),P.yaw),-1,1);
    blendPose(P.pose,tp,Math.min(1,16*dt));
  }
  // ---- physics ----
  if(P.state==='grapple'){P.x+=P.vx*dt;P.y+=P.vy*dt;P.z+=P.vz*dt;scarfFrame(dt);return;}
  if(P.state==='down'||P.state==='vault'||P.state==='climb'||P.state==='strike'||P.state==='counter'||P.state==='takedown'||P.state==='special'||P.state==='finisher'){afterMove(dt);return;}
  const wasGround=P.onGround,fallV=P.vy;
  P.onGround=false;P.ground=null;
  const hx=moveAxis(P,'x',P.vx*dt),hz=moveAxis(P,'z',P.vz*dt),hy=moveAxis(P,'y',P.vy*dt);
  if(hy){if(P.vy<0){P.onGround=true;
      if(!wasGround){
        if(P.diving)diveImpact();
        else if(fallV<-15&&Math.hypot(P.vx,P.vz)>2&&P.state==='move'){set('roll',0.5);AUDIO.play('land',0.6);}
        else{AUDIO.play('land',clamp(-fallV/20,0.15,0.7));if(fallV<-10)CAM.dip=0.35;}
      }}P.vy=0;}
  else{const g=groundAt(P.x,P.z,P.y);if(g&&P.y-g.y1<0.08&&P.vy<=0){P.onGround=true;P.y=g.y1;P.ground=g;P.vy=0;if(P.diving)diveImpact();}}
  // grab a ledge, or run along a wall
  if(!P.onGround&&P.state==='move'&&!P.gliding&&!P.diving&&(hx||hz)){
    const b=hx||hz,top=b.y1;
    if(b.k!=='rail'&&!b.mover&&top-P.y>1.0&&top-P.y<2.7){
      const nx=hx?(P.x<(b.x0+b.x1)/2?1:-1):0,nz=hz?(P.z<(b.z0+b.z1)/2?1:-1):0;
      P.ledge={y0:P.y,top,x0:P.x,z0:P.z,x1:P.x+nx*0.75,z1:P.z+nz*0.75};P.yaw=Math.atan2(nx,nz);P.vx=P.vy=P.vz=0;set('climb',0.55);AUDIO.play('grapple',0.4);
    }else if(!P.wallUsed&&Math.hypot(P.vx,P.vz)>4.5&&P.vy<6&&b.y1-P.y>2.2){
      const nx=hx?(P.x<(b.x0+b.x1)/2?-1:1):0,nz=hz?(P.z<(b.z0+b.z1)/2?-1:1):0;
      P.wall={nx,nz};P.wallT=0.95;P.wallUsed=true;P.vy=Math.max(P.vy,2.5);AUDIO.play('whoosh',0.5);
    }
  }
  afterMove(dt);
}
function afterMove(dt){
  if(P.onGround&&P.ground&&P.ground.k==='deck'&&!P.ground.mover&&P.state==='move'){P.safeT+=dt;if(P.safeT>0.6){P.checkpoint={x:P.x,y:P.y,z:P.z,face:P.yaw};P.safeT=0;}}
  if(P.y<WORLD.fogY-35&&P.state!=='down'){G.tookDamage=true;award(-250,'FELL');respawn(false);if(!G.god)P.hp=Math.max(1,P.hp-15);}
  for(const L of WORLD.lasers){if(!L.on||P.inv>0)continue;
    const a=L.axis==='x'?P.x:P.z,c=L.axis==='x'?P.z:P.x;
    if(Math.abs(a-L.at)<0.45&&Math.abs(c-L.c)<2.3&&P.y<L.y+1.9&&P.y>L.y-0.5){
      const back=(L.axis==='x'?P.vx:P.vz)>0?-1:1;playerDamage(14,L.axis==='x'?{x:L.at-back,z:P.z}:{x:P.x,z:L.at-back},'shock');}}
  for(const rg of WORLD.rings)if(!rg.got&&Math.hypot(P.x-rg.x,P.y+1-rg.y,P.z-rg.z)<2.7){rg.got=true;AUDIO.play('combo',2);G.ringsGot=(G.ringsGot||0)+1;
    if(G.mode==='campaign'){award(150,'RING '+G.ringsGot+'/'+WORLD.rings.length);if(G.ringsGot===WORLD.rings.length)award(2000,'SKYLINE RUN');}}
  scarfFrame(dt);
  for(const t of P.trail)t.t-=dt;P.trail=P.trail.filter(t=>t.t>0);
}
function scarfFrame(dt){
  const c=Math.cos(P.yaw),s=Math.sin(P.yaw),w=windAt(P.x,P.y,P.z),y=P.y+1.62+P.pose.hip;
  scarfUpdate(P.scarf,P.x-s*0.18,y,P.z-c*0.18,Math.min(dt,0.033),[-P.vx*0.6+w[0],-P.vz*0.6+w[1]]);
}
function respawn(dead){
  const c=P.checkpoint;
  P.x=c.x;P.y=c.y+0.1;P.z=c.z;P.vx=P.vy=P.vz=0;set('move');P.inv=1.5;P.gliding=false;P.diving=false;P.grap=null;P.pose=POSE0();P.scarf={};P.rag=null;
  if(dead){P.hp=P.hpMax;P.deaths++;award(-1000,'FLATLINED');G.glitch=1;}
  CAM.yaw=c.face;
}
function nearShield(){
  for(const e of G.ents)if(!e.dead&&e.type==='shield'&&e.state!=='stun'&&Math.hypot(e.x-P.x,e.z-P.z)<2.8&&Math.abs(angDiff(Math.atan2(P.x-e.x,P.z-e.z),e.yaw))<1.3)return e;
  return null;
}
function vaultOver(e){
  const dx=e.x-P.x,dz=e.z-P.z,l=Math.hypot(dx,dz)||1;
  P.vaultY=P.y;P.vx=dx/l*(l+1.6)/0.45;P.vz=dz/l*(l+1.6)/0.45;P.yaw=Math.atan2(dx,dz);set('vault',0.45);P.inv=0.5;
  e.state='open';e.st=0;AUDIO.play('whoosh');award(100,'VAULT');addCombo();
}
function tryVault(){
  const f=[Math.sin(P.yaw),Math.cos(P.yaw)];
  query(P.x+f[0]*1.1-.3,P.z+f[1]*1.1-.3,P.x+f[0]*1.1+.3,P.z+f[1]*1.1+.3,QB);
  for(const b of QB){if(!(b.k==='crate'||b.k==='prop'))continue;const h=b.y1-P.y;if(h<0.5||h>1.5)continue;
    const span=Math.max(b.x1-b.x0,b.z1-b.z0);if(span>3.4)continue;
    P.vaultY=P.y+h-0.4;P.vx=f[0]*(span+2)/0.45;P.vz=f[1]*(span+2)/0.45;set('vault',0.45);AUDIO.play('whoosh',0.6);return true;}
  return false;
}
function diveImpact(){
  P.diving=false;const Rr=has('dive')?5:3.5;
  fxRing(P.x,P.y+0.2,P.z,Rr,[1,.3,.4]);AUDIO.play('explode',0.7);CAM.shake=Math.max(CAM.shake,0.5);
  let n=0;for(const e of G.ents){if(e.dead||e.civ||e.boss||e.type==='drone')continue;if(Math.hypot(e.x-P.x,e.z-P.z)<Rr&&Math.abs(e.y-P.y)<2){
    hitEnemy(e,has('dive')?2:1,'dive');if(!e.dead&&e.type!=='brute'&&e.type!=='mech'){e.state='down';e.st=0;ragStart(e,e.x-P.x,e.z-P.z,5,3);}n++;}}
  if(n)award(200*n,'DIVE BOMB');
}

/* ---- grapple ---- */
function grappleTarget(){
  const [fx,fz]=camFwd();let best=null,bs=1e9;
  for(const a of WORLD.anchors){
    const dx=a.x-P.x,dy=a.y-(P.y+1.4),dz=a.z-P.z,d=Math.hypot(dx,dy,dz);
    if(d>NF_MOVE.grappleRange||d<2.5||a.y<P.y-1)continue;
    const dot=(dx*fx+dz*fz)/Math.max(0.01,Math.hypot(dx,dz));if(dot<0.35)continue;
    const sc=d*(1.6-dot);
    if(sc<bs&&raycast(P.x,P.y+1.4,P.z,dx/d,dy/d,dz/d,d,true)>=d-0.8){bs=sc;best=a;}
  }
  return best;
}
function tryGrapple(){const a=grappleTarget();if(!a){AUDIO.play('nope',0.4);return;}set('grapple');P.grap=a;P.gliding=false;P.boostReady=false;AUDIO.play('grapple');}

/* ------------------------------------------------------------- combat */
const ETYPES={
  thug:  {hp:3,speed:4.4,score:100,spark:[1,.4,.7],counter:true,melee:true},
  knife: {hp:3,speed:4.8,score:150,spark:[1,.8,.3],counter:false,melee:true,knife:true},
  shield:{hp:4,speed:3.6,score:200,spark:[.4,.8,1],counter:true,melee:true,block:true},
  brute: {hp:8,speed:3.2,score:400,spark:[1,.4,.3],counter:true,melee:true,armored:true,heavy:true},
  baton: {hp:3,speed:4.2,score:200,spark:[.7,.4,1],counter:true,melee:true,shock:true},
  ninja: {hp:4,speed:6,score:300,spark:[1,.3,.4],counter:true,melee:true,dodge:true,chain:true},
  guard: {hp:4,speed:3.6,score:150,spark:[1,.85,.4],counter:true,ranged:'bolt',range:12},
  sniper:{hp:2,speed:2,score:250,spark:[1,.3,.3],counter:false,ranged:'snipe',range:60,still:true},
  hacker:{hp:3,speed:3.8,score:250,spark:[1,.3,.9],counter:true,ranged:'orb',range:11,blink:true},
  drone: {hp:2,speed:5,score:100,spark:[.4,.9,1],counter:false,ranged:'zap',range:9,fly:true},
  mech:  {hp:14,speed:2.4,score:800,spark:[1,.7,.3],counter:false,heavy:true}
};
const TAUNTS=['IT\'S THE KESTREL!','TAKE THE BIRD DOWN!','ALL AT ONCE!','THIS IS OUR STREET!','BREAK ITS WINGS!','CALL IT IN!','YOU\'RE FINISHED!'];
function pickTarget(maxD){
  const [ix,iz,im]=inputDir(),[fx,fz]=im>0.1?[ix,iz]:camFwd();
  let best=null,bs=1e9;
  for(const e of G.ents){
    if(e.dead||e.hidden)continue;
    const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz),dy=e.y-P.y;
    if(d>maxD)continue;
    if(e.fly&&dy>2.6&&P.onGround)continue;
    if(Math.abs(dy)>(e.boss?7:4))continue;
    const ang=Math.abs(angDiff(Math.atan2(dx,dz),Math.atan2(fx,fz)));
    const sc=d+ang*3.2+(e.state==='down'?1.5:0);
    if(sc<bs){bs=sc;best=e;}
  }
  return best;
}
const FLOW=[0,1,2,6,3,5,4,1,0,7,2,8];
function beginStrike(){
  if((P.state==='strike'||P.state==='finisher')&&!P.hitDone){P.queue=true;return;}
  const e=pickTarget(9);
  P.target=e;P.hitDone=false;P.lunge=0;P.queue=false;
  if(e&&isTakedown(e)){set('takedown',0.65);P.move=null;return;}
  let mv;
  const d=e?Math.hypot(e.x-P.x,e.z-P.z):0,behind=e&&Math.abs(angDiff(Math.atan2(e.x-P.x,e.z-P.z),P.yaw))>2.3;
  if(e&&e.state==='down')mv=STRIKES[11];
  else if(e&&(e.state==='stun'||e.state==='open'))mv=Object.assign({},STRIKES[G.chain%2],{dur:0.17,beat:true});
  else if(!P.onGround||(e&&d>4.5))mv=STRIKES[9];
  else if(behind&&d<2.5)mv=STRIKES[10];
  else{mv=STRIKES[FLOW[G.chain%FLOW.length]];if(G.chain%7===6&&rng()<0.6)mv=STRIKES[8];}
  G.chain++;P.move=mv;set('strike',mv.dur);
  G.recent.push(mv.n);if(G.recent.length>8)G.recent.shift();
  AUDIO.play('whoosh',0.5);
}
function isTakedown(e){
  if(e.boss||e.type==='mech'||e.type==='drone'||e.type==='brute')return false;
  if(!(e.state==='idle'||e.state==='blind'||e.state==='investigate'))return false;
  const behind=Math.abs(angDiff(Math.atan2(P.x-e.x,P.z-e.z),e.yaw))>1.9;
  return behind||P.y>e.y+1.2||e.state==='blind';
}
function strikeUpdate(dt,tp){
  const e=P.target,S=P.state;
  const dur=S==='takedown'?0.65:S==='counter'?0.42:S==='special'?0.7:S==='finisher'?0.55:P.dur;
  if(e&&!e.dead){
    const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);
    if(S!=='counter'||P.cdir==='front')P.yaw=Math.atan2(dx,dz);
    const reach=(e.type==='mech'||e.type==='brute'?2.1:e.boss?3.2:1.2)+(P.move&&P.move.reach>1.3?0.4:0);
    if(d>reach&&P.lunge>=0&&P.lunge<0.34&&S!=='counter'){     // close the gap first; once in reach the move never stalls again
      P.lunge+=dt;const sp=Math.min(26,d/0.12,Math.max(0,d-reach+0.15)/Math.max(dt,1e-3));P.vx=dx/d*sp;P.vz=dz/d*sp;   // never overshoot, even at a low frame rate
      if(e.fly&&P.y<e.y-1.5)P.vy=Math.max(P.vy,7);
      P.st=0;P.trail.push({x:P.x,y:P.y,z:P.z,yaw:P.yaw,t:0.18});
      Object.assign(tp,{lean:0.6,aR:[-1,0.3,-1.2],aL:[-1,0.3,-1.2],lL:[-0.6,0.5],lR:[0.5,0.3]});blendPose(P.pose,tp,0.5);
      physicsLite(dt);return;
    }
    P.vx*=0.2;P.vz*=0.2;P.lunge=-1;
  }else{P.vx*=Math.pow(0.01,dt);P.vz*=Math.pow(0.01,dt);}
  if(!P.onGround&&!(e&&e.fly))P.vy-=NF_MOVE.gravity*dt;else if(e&&e.fly)P.vy=Math.max(P.vy-NF_MOVE.gravity*dt*0.3,-2);
  const k=clamp(P.st/dur,0,1);
  const keys=S==='takedown'?MOVES.takedown:S==='counter'?COUNTERS[P.cdir]:S==='special'?MOVES.special:S==='finisher'?MOVES[P.fin]:P.move.keys;
  const pose=samplePose(keys,k,POSE0());
  blendPose(P.pose,pose,1);
  const hitAt=S==='takedown'?0.5:S==='counter'?0.45:S==='special'?0.62:S==='finisher'?0.5:P.move.hit;
  if(!P.hitDone&&k>=hitAt){
    P.hitDone=true;
    if(e&&!e.dead){
      const d=Math.hypot(e.x-P.x,e.z-P.z),reach=(e.type==='mech'||e.type==='brute'?3:e.boss?4.4:2.4);
      if(d<reach&&Math.abs(e.y-P.y)<3.6){
        if(S==='takedown')takedown(e);
        else if(S==='special'){award(400,'SPECIAL TAKEDOWN');hitEnemy(e,99,'special');}
        else if(S==='finisher')finishEnv(e);
        else if(e.state==='down'){award(250,'GROUND FINISH');hitEnemy(e,99,'strike');
          if(has('multi'))for(const o of G.ents)if(o!==e&&!o.dead&&o.state==='down'&&Math.hypot(o.x-e.x,o.z-e.z)<3.5){hitEnemy(o,99,'strike');award(250,'MULTI GROUND');}}
        else strikeHit(e);
      }else AUDIO.play('whoosh',0.3);
    }
  }
  physicsLite(dt);
  if(k>=1){if(P.queue){P.queue=false;set('move');beginStrike();return;}set('move');P.target=null;}
}
function physicsLite(dt){
  P.onGround=false;P.ground=null;
  moveAxis(P,'x',P.vx*dt);moveAxis(P,'z',P.vz*dt);
  if(moveAxis(P,'y',P.vy*dt)&&P.vy<0){P.onGround=true;P.vy=0;}
  else{const g=groundAt(P.x,P.z,P.y);if(g&&P.y-g.y1<0.08&&P.vy<=0){P.onGround=true;P.y=g.y1;P.ground=g;P.vy=0;}}
}
// What a landed strike does depends on who it hits and from where.
function strikeHit(e){
  const T=ETYPES[e.type]||{},front=Math.abs(angDiff(Math.atan2(P.x-e.x,P.z-e.z),e.yaw))<1.2,aerial=!P.onGround;
  const opened=e.state==='stun'||e.state==='open'||e.state==='blind';
  if(T.block&&front&&!opened&&!aerial){blocked(e,'BLOCKED · JUMP TO VAULT OVER');return;}
  if(T.shock&&front&&!opened&&!aerial){spark(P.x,P.y+1.2,P.z,0,1,0,[.7,.4,1],0.3,6);playerDamage(7,e,'shock');pop('SHOCKED · HIT IT FROM BEHIND',0);return;}
  if(T.armored&&!opened){blocked(e,'ARMOURED · COUNTER IT FIRST');return;}
  if(T.dodge&&G.combo<5&&rng()<0.45&&e.state!=='stagger'){e.kx=(e.x-P.x)*3;e.kz=(e.z-P.z)*3;e.state='stagger';e.st=0.2;AUDIO.play('whoosh',0.5);pop('DODGED',0);return;}
  let dmg=P.move.dmg;
  if(P.move.beat)dmg=has('beatdown')?2:1;
  if(has('crit')&&G.combo>0&&(G.combo+1)%5===0){dmg+=1;pop('CRITICAL',0);}
  if(e.hp-dmg<=0&&!e.boss&&e.type!=='drone'&&e.type!=='mech'){
    const dx=e.x-P.x,dz=e.z-P.z,l=Math.hypot(dx,dz)||1,d=raycast(e.x,e.y+0.6,e.z,dx/l,0,dz/l,2.4,false);
    if(d<2.4){query(e.x+dx/l*d-.2,e.z+dz/l*d-.2,e.x+dx/l*d+.2,e.z+dz/l*d+.2,QB);const b=QB.find(b=>b.y1>e.y+0.3&&b.y0<e.y+1.2);
      if(b){P.fin=b.k==='rail'?'throw':'slam';set('finisher',0.55);P.target=e;P.hitDone=false;e.state='stagger';e.st=0;return;}}
  }
  hitEnemy(e,dmg,aerial?'air':'strike');
}
function blocked(e,why){
  AUDIO.play('hitmetal',0.8);spark(e.x,e.y+1.2,e.z,0,2,0,[.8,.9,1],0.3,8);pop(why,0);
  const dx=P.x-e.x,dz=P.z-e.z,l=Math.hypot(dx,dz)||1;P.vx=dx/l*7;P.vz=dz/l*7;set('hurt');P.st=0.12;breakCombo();
}
function finishEnv(e){
  const dx=e.x-P.x,dz=e.z-P.z;
  if(P.fin==='throw'){hitEnemy(e,99,'over');award(400,'OVER THE EDGE');ragStart(e,dx,dz,9,7);}
  else{hitEnemy(e,99,'slam');award(300,'WALL SLAM');ragStart(e,dx,dz,12,2);CAM.shake=Math.max(CAM.shake,0.4);}
}
function tryCounter(){
  let best=null,bd=4.8;
  for(const e of G.ents)if(e.state==='windup'&&!e.dead&&(e.counterable||(e.knifeAtk&&has('knife')))){const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<bd){bd=d;best=e;}}
  let shot=null;for(const s of G.shots)if(!s.mine&&Math.hypot(s.x-P.x,s.y-P.y-1.1,s.z-P.z)<3.4){shot=s;break;}
  if(best){
    const rel=Math.abs(angDiff(Math.atan2(best.x-P.x,best.z-P.z),P.yaw));
    P.cdir=rel<0.9?'front':rel<2.2?'side':'back';
    set('counter');P.target=best;P.hitDone=true;P.inv=0.5;
    if(P.cdir==='front')P.yaw=Math.atan2(best.x-P.x,best.z-P.z);
    if(best.token){best.token=false;G.tokens=Math.max(0,G.tokens-1);}
    if(best.type==='brute'||best.boss){best.state='open';best.st=0;pop('OPEN · BEAT IT DOWN',0);addCombo();if(best.boss)bossOpened(best);}
    else{best.state='stagger';best.st=0;hitEnemy(best,2,'counter');}
    G.slow=0.2;AUDIO.play('counter');award(100,null);
    for(const e of G.ents)if(e!==best&&e.state==='windup'&&e.counterable&&!e.dead&&Math.hypot(e.x-P.x,e.z-P.z)<4.8){e.state='stagger';e.st=0;hitEnemy(e,1,'counter');award(150,'MULTI COUNTER');}
  }else if(shot){
    shot.mine=true;shot.vx*=-1.4;shot.vy*=-1;shot.vz*=-1.4;shot.life=2;
    set('counter');P.cdir='front';P.target=null;P.hitDone=true;P.inv=0.4;AUDIO.play('counter');award(150,'DEFLECT');addCombo();
  }else{AUDIO.play('whoosh',0.3);set('counter');P.cdir='front';P.st=0.2;P.target=null;P.hitDone=true;}
}
function trySpecial(){
  if(G.special<1){AUDIO.play('nope',0.4);pop('BUILD AN 8 HIT COMBO FOR A SPECIAL',0);return;}
  const e=pickTarget(7);if(!e||e.boss){AUDIO.play('nope',0.4);return;}
  G.special-=1;set('special');P.target=e;P.hitDone=false;P.lunge=0;G.slow=0.5;AUDIO.play('counter');
}
function hitEnemy(e,dmg,how){
  if(e.dead)return;
  if(e.boss){if(bossHit(e,dmg,how)===false)return;}
  if(e.type==='mech'&&e.state!=='stun'&&how!=='emp'&&how!=='special')dmg*=0.5;
  if(twist('glass'))dmg*=2;
  e.hp-=dmg;e.aware=true;if(e.state==='idle'||e.state==='investigate')alertGroup(e);
  addCombo();
  G.hitFlash.push({x:e.x,y:e.y+1.2,z:e.z,t:0.12});
  const col=(ETYPES[e.type]||{spark:[1,.6,.8]}).spark;
  for(let i=0;i<8;i++)spark(e.x,e.y+(e.cy||1.2),e.z,(rng()-.5)*6,rng()*4,(rng()-.5)*6,col,0.35);
  AUDIO.play(how==='disc'?'discHit':dmg>=2?'heavy':'punch',0.8);
  CAM.shake=Math.max(CAM.shake,dmg>=2?0.18:0.08);G.hitstop=Math.max(G.hitstop,dmg>=2?0.07:0.035);
  if(e.hp<=0){knockOut(e,how);return;}
  if(e.boss||e.type==='mech'&&e.state!=='stun')return;
  if(e.state==='open'){e.st=Math.min(e.st,0.6);return;}
  const dx=e.x-P.x,dz=e.z-P.z,l=Math.hypot(dx,dz)||1;
  e.hitDir=Math.atan2(-dx,-dz)-e.yaw;
  e.kx=dx/l*(dmg>=2?7:3.5);e.kz=dz/l*(dmg>=2?7:3.5);
  if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}
  if(dmg>=2&&!e.fly&&e.type!=='brute'){e.state='down';e.st=0;ragStart(e,dx,dz,6,3);}
  else{e.state='stagger';e.st=0;}
}
function knockOut(e,how){
  const T=ETYPES[e.type]||{score:5000,heavy:true,spark:[1,.5,.8]};
  e.state='ko';e.dead=true;e.st=0;
  if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}
  G.kos++;if(!e.spawned)G.kosPlaced++;
  award(T.score*comboMult()*(twist('scav')?2:1),null);
  const labels={air:'AIR KO',disc:'DISC KO',counter:'COUNTER KO',emp:'SHORT CIRCUIT',friendly:'FRIENDLY FIRE',dive:'DIVE BOMB KO',deflect:'RETURN TO SENDER'};
  if(labels[how])award(how==='friendly'?300:200,labels[how]);
  if(P.hp<25&&how!=='friendly')award(300,'CLOSE CALL');
  if(new Set(G.recent).size>=6){award(200,'VARIETY');G.recent.length=0;}
  AUDIO.play(e.boss?'bossdie':T.heavy?'bigdeath':'ko',0.9);
  G.hitstop=Math.max(G.hitstop,e.boss?0.5:T.heavy?0.14:0.06);
  CAM.shake=Math.max(CAM.shake,e.boss?1:T.heavy?0.5:0.15);
  for(let i=0;i<(T.heavy?30:14);i++)spark(e.x,e.y+1,e.z,(rng()-.5)*8,rng()*6,(rng()-.5)*8,T.spark,0.6);
  if(!e.rag&&!e.fly&&!e.boss&&e.type!=='mech'){const dx=e.x-P.x,dz=e.z-P.z;ragStart(e,dx,dz,how==='strike'||how==='air'?5:3,3);}
  if(e.boss)bossDefeated(e);
  if(!e.boss&&G.mode!=='challenge'&&!G.ents.some(o=>!o.dead&&o.aware&&Math.hypot(o.x-e.x,o.z-e.z)<18)){G.cine={t:1.1,x:e.x,y:e.y,z:e.z,side:rng()<.5?1:-1};G.slow=1.1;}
  if(G.mode==='campaign'&&rng()<SKILLS[G.skill].drop)WORLD.items.push({t:'stim',x:e.x,y:groundY(e)+0.8,z:e.z,taken:false,bob:0,dropped:true});
  if(G.mode!=='campaign'&&rng()<0.1)WORLD.items.push({t:'stim',x:e.x,y:groundY(e)+0.8,z:e.z,taken:false,bob:0,dropped:true});
}
function groundY(e){const g=groundAt(e.x,e.z,e.y+0.5);return g?g.y1:e.y;}
function takedown(e){
  const stealth=G.mode==='challenge'&&G.chal&&G.chal.type==='stealth';
  award(500*(stealth?2:1)*(has('smokePlus')&&e.state==='blind'?2:1),'SILENT TAKEDOWN');
  hitEnemy(e,99,'takedown');
  for(const o of G.ents)if(o!==e&&!o.dead&&o.state==='idle'&&Math.hypot(o.x-e.x,o.z-e.z)<10&&losClear(o,e)&&Math.abs(angDiff(Math.atan2(e.x-o.x,e.z-o.z),o.yaw))<1.2){o.state='investigate';o.st=0;o.lookAt={x:e.x,z:e.z};}
}
function addCombo(){
  G.combo=G.comboT>0?G.combo+1:1;G.comboT=has('keeper')?2.5:1.8;G.maxCombo=Math.max(G.maxCombo,G.combo);
  if(G.combo%(has('special2')?6:8)===0){G.special=Math.min(2,G.special+1);pop('SPECIAL READY',0);AUDIO.play('medal');}
  if(G.combo%5===0)AUDIO.play('combo',comboMult());
  if(G.combo===10||G.combo===25||G.combo===50)AUDIO.stinger(G.combo);
}
function comboMult(){return Math.min(8,1+Math.floor(G.combo/5));}
function breakCombo(){if(G.combo>=5)pop('COMBO BROKEN',0);G.combo=0;G.comboT=0;}

/* ---- gadgets ---- */
function throwDisc(){
  if(P.disc||P.cdDisc>0)return;
  const [fx,fz]=camFwd(),cands=[];
  for(const e of G.ents){if(e.dead||e.hidden)continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d>32)continue;
    const dot=(dx*fx+dz*fz)/(d||1);if(dot<0.5)continue;if(losClear(P,e))cands.push({e,sc:d*(1.6-dot)-(e.fly||e.type==='sniper'?6:0)});}
  cands.sort((a,b)=>a.sc-b.sc);
  const targets=cands.slice(0,has('triple')?3:1).map(c=>c.e);
  P.disc=(targets.length?targets:[null]).map(t=>{const [dx,dz]=t?[t.x-P.x,t.z-P.z]:[fx,fz],l=Math.hypot(dx,dz)||1;
    return{x:P.x,y:P.y+1.3,z:P.z,vx:dx/l*30,vy:0,vz:dz/l*30,target:t,back:false,t:0,hits:has('ricochet')?3:1};});
  P.yaw=Math.atan2(P.disc[0].vx,P.disc[0].vz);P.cdDisc=0.5;AUDIO.play('disc');
}
function discUpdate(dt){
  if(!P.disc)return;
  for(const D of P.disc){
    if(D.done)continue;D.t+=dt;
    if(!D.back){
      if(D.target&&!D.target.dead){const e=D.target,tx=e.x-D.x,ty=e.y+(e.cy||1.2)-D.y,tz=e.z-D.z,d=Math.hypot(tx,ty,tz);
        D.vx=tx/d*32;D.vy=ty/d*32;D.vz=tz/d*32;
        if(d<0.7+32*dt){
          hitEnemy(e,e.fly||e.type==='sniper'?2:1,'disc');
          if(!e.dead&&!e.boss&&e.type!=='mech'){if(has('edisc')){e.state='stun';e.st=0;e.stunFor=1.6;}else{e.state='stagger';e.st=0;}}
          D.hits--;
          if(D.hits>0){const nx=G.ents.find(o=>o!==e&&!o.dead&&Math.hypot(o.x-e.x,o.z-e.z)<10);if(nx){D.target=nx;continue;}}
          D.back=true;}}
      if(D.t>0.9)D.back=true;
      const sp=Math.hypot(D.vx,D.vy,D.vz)||1,d=sp*dt;
      if(raycast(D.x,D.y,D.z,D.vx/sp,D.vy/sp,D.vz/sp,d+0.2,true)<d+0.1)D.back=true;
    }else{const tx=P.x-D.x,ty=P.y+1.3-D.y,tz=P.z-D.z,d=Math.hypot(tx,ty,tz)||1;D.vx=tx/d*36;D.vy=ty/d*36;D.vz=tz/d*36;if(d<1+36*dt){D.done=true;continue;}}
    D.x+=D.vx*dt;D.y+=D.vy*dt;D.z+=D.vz*dt;
  }
  if(P.disc.every(D=>D.done))P.disc=null;
}
function useEMP(){
  if(P.cdEmp>0){AUDIO.play('nope',0.3);return;}
  const Rr=has('empPlus')?10:7;P.cdEmp=has('empPlus')?6:9;AUDIO.play('emp');fxRing(P.x,P.y+1,P.z,Rr,[.3,.9,1]);
  for(const e of G.ents){if(e.dead)continue;if(Math.hypot(e.x-P.x,e.y-P.y,e.z-P.z)>Rr)continue;
    if(e.type==='drone'){hitEnemy(e,99,'emp');continue;}
    if(e.boss){bossStun(e,3.5);continue;}
    e.state='stun';e.st=0;e.stunFor=e.type==='mech'||e.type==='brute'?3.5:1.6;e.aware=true;
    if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}}
  addCombo();
}
function useSmoke(){
  if(P.cdSmoke>0){AUDIO.play('nope',0.3);return;}
  P.cdSmoke=12;AUDIO.play('smoke');G.smoke.push({x:P.x,y:P.y,z:P.z,t:0,dur:has('smokePlus')?7:5});
  for(const e of G.ents){if(e.dead||e.boss||e.type==='mech')continue;
    if(Math.hypot(e.x-P.x,e.z-P.z)<6.5){e.state='blind';e.st=0;e.blindFor=has('smokePlus')?6:4;e.aware=false;if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}}}
}

/* ---------------------------------------------------------------- enemies */
function makeEnemy(t,x,y,z,island,alert){
  const T=ETYPES[t];
  const hpK=G.mode==='campaign'?(0.8+G.skill*0.1):1+G.wave*0.06;
  const e={type:t,x,y,z,yaw:rng()*TAU,hp:Math.ceil(T.hp*hpK),hpMax:0,state:alert?'chase':'idle',st:0,cool:1+rng()*2,aware:!!alert,
    island,home:{x,z},hw:t==='mech'?0.75:t==='brute'?0.5:0.35,h:t==='mech'?3.2:1.8,fly:!!T.fly,cy:t==='mech'?2:1.2,
    kx:0,kz:0,token:false,counterable:false,pose:POSE0(),ph:rng()*9,strafe:rng()<.5?1:-1,seed:(rng()*1e6)|0,
    stunFor:0,dead:false,rag:null,chainLeft:0,idle:['patrol','talk','smoke','patrol'][(rng()*4)|0],spawned:!!alert};
  e.hpMax=e.hp;
  if(t==='drone'){e.y=y+2.8;e.base=y;}
  if(LOOKS[t])e.look=LOOKS[t](e);
  G.ents.push(e);
  if(G.mode==='campaign'&&!alert)G.enemyTotal++;
  return e;
}
function makeCiv(x,y,z,island){
  const c={civ:true,type:'civ',x,y,z,yaw:rng()*TAU,island,home:{x,z},hw:0.3,h:1.75,pose:POSE0(),ph:rng()*9,seed:(rng()*1e6)|0,state:'stroll',st:rng()*5,dead:false,target:null};
  c.look=LOOKS.civ(c);G.civs.push(c);return c;
}
function alertGroup(e){
  let woke=false;
  for(const o of G.ents)if(!o.dead&&(o.island===e.island||Math.hypot(o.x-e.x,o.z-e.z)<14)&&(o.state==='idle'||o.state==='investigate')){
    o.state='chase';o.aware=true;o.st=0;woke=true;if(o.boss)bossWake(o);}
  if(woke){AUDIO.play('alert',0.5);if(rng()<0.6)bubble(e,['HEY!','OVER THERE!','THE KESTREL!'][(rng()*3)|0]);
    if(G.mode==='challenge'&&G.chal&&G.chal.type==='stealth'){G.spotted++;pop('SPOTTED',0);}}
}
function bubble(e,text){G.bubbles.push({e,text,t:2});if(G.bubbles.length>3)G.bubbles.shift();}
function enemyUpdate(e,dt){
  if(e.boss){bossUpdate(e,dt);return;}
  const T=ETYPES[e.type];
  e.st+=dt;e.ph+=dt;
  if(e.ground&&e.ground.mover){e.x+=e.ground.dx;e.y+=e.ground.dy;e.z+=e.ground.dz;}
  if(e.dead||e.state==='down'){
    if(e.rag)ragUpdate(e,dt);
    if(e.fly&&e.dead&&e.y>(e.base||0)){e.vy=(e.vy||0)-20*dt;e.y=Math.max(e.base||0,e.y+e.vy*dt);}
    if(e.state==='down'&&e.st>2.4){e.state='chase';e.cool=0.6+rng();e.rag=null;e.pose.roll=0;}
    return;
  }
  const dx=P.x-e.x,dz=P.z-e.z,dist=Math.hypot(dx,dz)||0.01,toP=Math.atan2(dx,dz);
  if(e.kx||e.kz){mover(e,e.kx*dt,e.kz*dt);e.kx*=Math.pow(0.004,dt);e.kz*=Math.pow(0.004,dt);if(Math.abs(e.kx)+Math.abs(e.kz)<0.1)e.kx=e.kz=0;}
  if(e.fly)e.y=lerp(e.y,(e.base||0)+2.8+Math.sin(e.ph*2)*0.3,Math.min(1,3*dt));
  const tp=POSE0();
  switch(e.state){
    case 'idle':{
      if(e.idle==='patrol'||T.fly){const a=e.ph*0.3+e.seed;e.yaw+=angDiff(a,e.yaw)*dt*0.5;mover(e,Math.sin(e.yaw)*0.9*dt,Math.cos(e.yaw)*0.9*dt,true);
        if(Math.hypot(e.x-e.home.x,e.z-e.home.z)>4)e.yaw=Math.atan2(e.home.x-e.x,e.home.z-e.z);e.walkPh=(e.walkPh||0)+dt*2.5;poseRun(tp,e.walkPh,0.35,0.05);}
      else poseIdle(tp,e.ph,e.idle);
      const sight=T.ranged==='snipe'?40:17;
      if(dist<sight&&Math.abs(P.y-e.y)<(T.ranged==='snipe'?30:6)&&(Math.abs(angDiff(toP,e.yaw))<1.1||dist<4.5)&&losClear(e,P)&&P.state!=='down')alertGroup(e);
      if(G.noise>0&&dist<14)alertGroup(e);
      break;}
    case 'investigate':{const L=e.lookAt||{x:P.x,z:P.z},lx=L.x-e.x,lz=L.z-e.z,ld=Math.hypot(lx,lz);
      if(ld>1.5){e.yaw=Math.atan2(lx,lz);mover(e,lx/ld*2*dt,lz/ld*2*dt);e.walkPh=(e.walkPh||0)+dt*4;poseRun(tp,e.walkPh,0.5,0.1);}
      if(e.st>3||(dist<9&&losClear(e,P)&&Math.abs(angDiff(toP,e.yaw))<1))alertGroup(e);break;}
    case 'blind':e.yaw+=dt*2;poseIdle(tp,e.ph,'cower');tp.hip=0;tp.lL=[0,.05];tp.lR=[0,.05];if(e.st>(e.blindFor||4)){e.state='chase';e.aware=true;}break;
    case 'stun':tp.lean=Math.sin(e.st*20)*0.15;tp.head=0.4;if(e.st>e.stunFor){e.state='chase';if(e.type==='mech')e.cool=0.8;}break;
    case 'open':tp.lean=-0.4;tp.head=0.5;tp.aL=[0.2,0.9,0];tp.aR=[0.2,0.9,0];if(e.st>2.2)e.state='chase';break;
    case 'stagger':{const hd=e.hitDir||0;tp.lean=-0.5*Math.cos(hd);tp.side=0.4*Math.sin(hd);tp.aL=[-0.6,0.9,-1];tp.aR=[-0.6,0.9,-1];if(e.st>0.38)e.state='chase';break;}
    case 'windup':{
      e.yaw+=angDiff(toP,e.yaw)*Math.min(1,8*dt);
      if(e.melee){Object.assign(tp,{twist:0.5,aR:[0.6,0.5,-1.6],aL:[-1,0.3,-1.6],lean:-0.15,lL:[-0.3,0.3]});if(e.type==='brute')Object.assign(tp,{aR:[-2.8,0.3,-0.5],aL:[-2.8,0.3,-0.5],lean:-0.3});}
      else Object.assign(tp,{aR:[-1.5,0.05,0],aL:[-1.4,0.4,-0.4],twist:0.2});
      if(e.st>=(e.wind||0.55)){e.state='attack';e.st=0;e.counterable=false;enemyAttack(e,T,dist,toP);}
      break;}
    case 'attack':
      if(e.melee){const k=Math.min(1,e.st/0.15);Object.assign(tp,{aR:[-1.6*k,0.1,-0.1],twist:-0.5*k,lean:0.3,lL:[-0.5,0.3]});if(e.st<0.15)mover(e,Math.sin(e.yaw)*7*dt,Math.cos(e.yaw)*7*dt);}
      if(e.st>0.35){
        if(e.chainLeft>0){e.chainLeft--;e.state='windup';e.st=0;e.wind=0.4;e.counterable=true;AUDIO.play('tell',0.5);}
        else{e.state='chase';e.cool=(1.2+rng()*1.4)/(G.mode==='campaign'?SKILLS[G.skill].spd:1);if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}}}
      break;
    default:{
      e.cool-=dt;e.yaw+=angDiff(toP,e.yaw)*Math.min(1,6*dt);
      const sp=T.speed*(twist('rush')?1.3:1)*(G.mode==='campaign'?SKILLS[G.skill].spd:Math.min(1.35,1+G.wave*0.02));
      let want=T.melee||e.type==='mech'?2.9:T.ranged?(e.fly?5:9):3;
      if(Math.abs(P.y-e.y)>5&&!e.fly&&!T.still)want=0.5;
      if(T.still){tp.aR=[-1.3,0.1,0,0];}
      else if(dist>want+0.6){mover(e,dx/dist*sp*dt,dz/dist*sp*dt);e.walkPh=(e.walkPh||0)+dt*sp/2.2*Math.PI;poseRun(tp,e.walkPh,0.85,0.12);}
      else if(dist<want-1.5&&T.ranged){mover(e,-dx/dist*sp*0.7*dt,-dz/dist*sp*0.7*dt);e.walkPh=(e.walkPh||0)+dt*5;poseRun(tp,e.walkPh,0.5,-0.05);}
      else{const s=e.strafe*sp*0.45;mover(e,-dz/dist*s*dt,dx/dist*s*dt);if(rng()<dt*0.4)e.strafe*=-1;e.walkPh=(e.walkPh||0)+dt*4;poseRun(tp,e.walkPh,0.4,0);
        if(T.melee){tp.aL=GUARD.aL.slice();tp.aR=GUARD.aR.slice();}
        if(rng()<dt*0.05&&!e.fly)bubble(e,TAUNTS[(rng()*TAUNTS.length)|0]);}
      if(T.ranged&&T.ranged!=='zap')tp.aR=[-1.3,0.1,0,0];
      if(e.cool<=0&&Math.abs(P.y-e.y)<(e.fly?6:T.ranged==='snipe'?40:3)&&P.state!=='down'){
        const close=dist<3.4;
        if(T.melee||(close&&!e.fly&&e.type!=='mech'&&!T.still)){
          if(close&&(e.token||G.tokens<(G.skill>=4?3:2))){if(!e.token){e.token=true;G.tokens++;}
            e.state='windup';e.st=0;e.melee=true;e.wind=T.armored?0.75:0.55;e.counterable=!T.knife;e.knifeAtk=!!T.knife;
            if(T.chain)e.chainLeft=2;
            AUDIO.play(e.counterable||has('knife')?'tell':'tell2',0.5);}
        }else if(e.type==='mech'){
          if(dist<4.2){e.state='windup';e.st=0;e.wind=0.9;e.counterable=false;e.melee=true;e.stomp=true;AUDIO.play('tell2',0.7);}
          else if(dist<18&&losClear(e,P)){e.state='windup';e.st=0;e.wind=0.8;e.counterable=false;e.melee=false;e.stomp=false;}
        }else if(T.ranged&&dist<T.range+4&&losClear(e,P)){
          e.state='windup';e.st=0;e.wind=T.ranged==='snipe'?1.4:e.fly?0.5:0.75;e.counterable=false;e.melee=false;
        }
      }
      if(T.blink&&e.st>3&&rng()<dt*0.25&&dist<12)blink(e);
    }
  }
  if(!e.fly&&!T.still){const g=groundAt(e.x,e.z,e.y+0.6);if(g){e.y=g.y1;e.ground=g;}}
  if(e.state!=='idle')tp.headY=clamp(angDiff(toP,e.yaw),-0.8,0.8);
  blendPose(e.pose,tp,Math.min(1,14*dt));
  e.charge=e.state==='windup'&&!e.melee;
}
function mover(e,dx,dz,careful){
  const ox=e.x,oz=e.z;e.stepOK=true;
  moveAxis(e,'x',dx);moveAxis(e,'z',dz);
  if(e.fly)return;
  const g=groundAt(e.x,e.z,e.y+0.6);
  if(!g||e.y-g.y1>1.2){e.x=ox;e.z=oz;if(careful)e.yaw+=Math.PI*0.5;}
}
function blink(e){
  for(let i=0;i<12;i++){
    const a=rng()*TAU,d=3+rng()*4,nx=P.x+Math.sin(a)*d,nz=P.z+Math.cos(a)*d,g=groundAt(nx,nz,e.y+1);
    if(!g||Math.abs(g.y1-e.y)>1)continue;
    G.warps.push({x:e.x,y:e.y,z:e.z,t:0});e.x=nx;e.z=nz;e.y=g.y1;e.st=0;e.state='chase';e.cool=Math.min(e.cool,0.6);
    G.warps.push({x:e.x,y:e.y,z:e.z,t:0});AUDIO.play('blink',0.5);return;
  }
}
function enemyAttack(e,T,dist,toP){
  const k=G.mode==='campaign'?SKILLS[G.skill].dmg:1;
  if(e.melee){
    if(e.stomp){fxRing(e.x,e.y+0.2,e.z,3.6,[1,.6,.2]);AUDIO.play('explode',0.7);CAM.shake=Math.max(CAM.shake,0.35);
      if(dist<3.6&&P.y-e.y<1.5)playerDamage(22*k,e);e.stomp=false;return;}
    if(dist<(e.type==='brute'?2.6:2)&&Math.abs(P.y-e.y)<1.6)playerDamage((e.type==='brute'?16:e.type==='knife'?12:8)*k,e,e.type==='baton'?'shock':null);
    else AUDIO.play('whoosh',0.3);
    return;
  }
  const sx=e.x+Math.sin(e.yaw)*0.6,sy=e.y+(e.fly?0:1.35),sz=e.z+Math.cos(e.yaw)*0.6;
  const aim=(spd,spread)=>{const tx=P.x+P.vx*0.15,ty=P.y+1.1,tz=P.z+P.vz*0.15,dx=tx-sx,dy=ty-sy,dz=tz-sz,d=Math.hypot(dx,dy,dz)||1;
    const a=(rng()-.5)*spread,c=Math.cos(a),s=Math.sin(a);return[(dx*c-dz*s)/d*spd,dy/d*spd,(dx*s+dz*c)/d*spd];};
  if(e.type==='mech'){for(let i=0;i<3;i++){const v=aim(15,0.35);G.shots.push({x:sx,y:sy+0.6,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:12*k,owner:e,kind:'rocket',life:3,c:[1,.6,.2]});}AUDIO.play('shotgun',0.5);return;}
  const S=T.ranged;
  if(S==='bolt'){const v=aim(24,0.05);G.shots.push({x:sx,y:sy,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:10*k,owner:e,kind:'bolt',life:2,c:[1,.3,.35]});AUDIO.play('pistol',0.5);}
  else if(S==='snipe'){const v=aim(70,0.01);G.shots.push({x:sx,y:sy,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:22*k,owner:e,kind:'snipe',life:2,c:[1,.2,.2]});AUDIO.play('rail',0.6);}
  else if(S==='orb'){const v=aim(11,0.1);G.shots.push({x:sx,y:sy,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:12*k,owner:e,kind:'orb',life:3,home:true,c:[1,.3,.85]});AUDIO.play('arc',0.4);}
  else if(S==='zap'){const v=aim(20,0.08);G.shots.push({x:sx,y:sy,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:6*k,owner:e,kind:'zap',life:2,c:[.3,.9,1]});AUDIO.play('zap',0.4);}
}
/* Passers-by: they stroll, and run for cover the moment a fight starts near them. */
function civUpdate(c,dt){
  c.st+=dt;c.ph+=dt;
  const fight=G.ents.some(e=>!e.dead&&e.aware&&Math.hypot(e.x-c.x,e.z-c.z)<14);
  const tp=POSE0();
  if(fight&&c.state!=='cower'&&c.state!=='flee'){c.state='flee';c.st=0;const I=WORLD.W.islands[c.island];
    c.target={x:c.x<I.x?I.x0+2:I.x1-2,z:c.z<I.z?I.z0+2:I.z1-2};}
  if(c.state==='flee'){const dx=c.target.x-c.x,dz=c.target.z-c.z,d=Math.hypot(dx,dz);
    if(d<1||c.st>5){c.state='cower';c.st=0;}else{c.yaw=Math.atan2(dx,dz);mover(c,dx/d*5.5*dt,dz/d*5.5*dt);c.walkPh=(c.walkPh||0)+dt*8;poseRun(tp,c.walkPh,1,0.3);tp.aL=[-2.4,0.6,-2,0];}}
  else if(c.state==='cower'){poseIdle(tp,c.ph,'cower');if(!fight&&c.st>4){c.state='stroll';c.st=0;}}
  else{if(c.st>6){c.st=0;c.target={x:c.home.x+(rng()-.5)*10,z:c.home.z+(rng()-.5)*8};}
    const t=c.target;if(t){const dx=t.x-c.x,dz=t.z-c.z,d=Math.hypot(dx,dz);if(d>0.6){c.yaw=Math.atan2(dx,dz);mover(c,dx/d*1.4*dt,dz/d*1.4*dt,true);c.walkPh=(c.walkPh||0)+dt*4;poseRun(tp,c.walkPh,0.4,0);}
      else poseIdle(tp,c.ph,c.seed%3?'talk':'idle');}else poseIdle(tp,c.ph,'idle');}
  const g=groundAt(c.x,c.z,c.y+0.6);if(g)c.y=g.y1;
  blendPose(c.pose,tp,Math.min(1,10*dt));
}

/* ------------------------------------------------- shots, sparks, effects */
function shotsUpdate(dt){
  for(const s of G.shots){
    s.life-=dt;
    if(s.home&&!s.mine){const tx=P.x-s.x,ty=P.y+1.1-s.y,tz=P.z-s.z,d=Math.hypot(tx,ty,tz)||1,sp=Math.hypot(s.vx,s.vy,s.vz);
      s.vx+=(tx/d*sp-s.vx)*dt*1.2;s.vy+=(ty/d*sp-s.vy)*dt*1.2;s.vz+=(tz/d*sp-s.vz)*dt*1.2;}
    const sp=Math.hypot(s.vx,s.vy,s.vz)||1,step=sp*dt;
    if(raycast(s.x,s.y,s.z,s.vx/sp,s.vy/sp,s.vz/sp,step,true)<step){s.life=0;burst(s);continue;}
    const px=s.x,py=s.y,pz=s.z;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;
    const segD=(ax,ay,az)=>{const vx=s.x-px,vy=s.y-py,vz=s.z-pz,l2=vx*vx+vy*vy+vz*vz||1,t=clamp(((ax-px)*vx+(ay-py)*vy+(az-pz)*vz)/l2,0,1);return Math.hypot(px+vx*t-ax,py+vy*t-ay,pz+vz*t-az);};
    if(!s.mine){
      if(segD(P.x,P.y+1,P.z)<0.75){playerDamage(s.dmg,s.owner);s.life=0;burst(s);continue;}
      for(const e of G.ents){if(e.dead||e===s.owner||e.type===s.owner.type||e.boss)continue;
        if(segD(e.x,e.y+(e.cy||1.1),e.z)<0.8){hitEnemy(e,1,'friendly');s.life=0;burst(s);break;}}
    }else{
      for(const e of G.ents){if(e.dead)continue;
        if(segD(e.x,e.y+(e.cy||1.1),e.z)<(e.boss?2.6:0.9)){hitEnemy(e,e.boss?3:2,'deflect');s.life=0;burst(s);break;}}
    }
  }
  G.shots=G.shots.filter(s=>s.life>0);
}
function burst(s){
  for(let i=0;i<(s.kind==='rocket'||s.kind==='missile'?14:6);i++)spark(s.x,s.y,s.z,(rng()-.5)*5,rng()*3,(rng()-.5)*5,s.c,0.3);
  if(s.kind==='rocket'||s.kind==='missile'){AUDIO.play('explode',clamp(3/Math.hypot(s.x-P.x,s.z-P.z),0.2,0.6));
    const d=Math.hypot(s.x-P.x,s.y-P.y-1,s.z-P.z);if(d<2.4&&!s.mine)playerDamage(s.dmg*(1-d/2.4),s);}
}
function spark(x,y,z,vx,vy,vz,c,life,n){G.sparks.push({x,y,z,vx,vy,vz,c,t:0,life:life||0.4,s:n?0.12:0.07});if(G.sparks.length>600)G.sparks.shift();}
function fxRing(x,y,z,max,c){G.fx.push({x,y,z,t:0,max,c});}
function effectsUpdate(dt){
  for(const p of G.sparks){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(!p.steam)p.vy-=12*dt;}
  G.sparks=G.sparks.filter(p=>p.t<p.life);
  for(const r of G.fx)r.t+=dt;G.fx=G.fx.filter(r=>r.t<0.5);
  for(const s of G.smoke)s.t+=dt;G.smoke=G.smoke.filter(s=>s.t<s.dur);
  for(const w of G.warps){w.t+=dt;if(w.spawn&&w.t>0.5&&!w.done){w.done=true;const e=makeEnemy(w.spawn,w.x,w.y,w.z,w.island||'a',true);e.spawned=true;}}
  G.warps=G.warps.filter(w=>w.t<0.6);
  for(const h of G.hitFlash)h.t-=dt;G.hitFlash=G.hitFlash.filter(h=>h.t>0);
  for(const b of G.bubbles)b.t-=dt;G.bubbles=G.bubbles.filter(b=>b.t>0&&!b.e.dead);
  if(WORLD.rain&&Q.halos)for(let i=0;i<3;i++){const a=rng()*TAU,d=rng()*10,x=P.x+Math.cos(a)*d,z=P.z+Math.sin(a)*d,g=groundAt(x,z,P.y+3);if(g&&G.sparks.length<260)G.sparks.push({x,y:g.y1+0.02,z,vx:(rng()-.5)*.6,vy:1.2+rng(),vz:(rng()-.5)*.6,c:[.6,.75,1],t:0,life:0.16,s:0.03,drop:true});}
  for(const v of WORLD.vents)if(rng()<dt*8)G.sparks.push({x:v.x+(rng()-.5)*2,y:v.y+0.5,z:v.z+(rng()-.5)*2,vx:0,vy:4+rng()*3,vz:0,c:[.5,.55,.6],t:0,life:1.2,s:0.25,steam:true});
}

/* ------------------------------------------------- drawing the actors */
function drawActors(time){
  const D=R.dyn,Gl=R.glass,A=R.add;
  const sty=STY(),look=LOOKS.hero(sty);
  if(SV.finish==='glitch'||SV.finish==='prism'){const k=(time*2)%3;look.glow=SV.finish==='glitch'?(k<1?[1,.25,.7]:[.2,.95,1]):[[1,.5,.2],[.3,1,.6],[.6,.4,1]][k|0];look.scarf=look.glow;}
  drawHuman(D,{x:P.x,y:P.y,z:P.z,yaw:P.yaw,pose:P.pose,look,scarf:P.scarf,ph:P.ph});
  for(const t of P.trail){XF.reset().t(t.x,t.y+0.95,t.z).ry(t.yaw);Gl.part('box',XF.m,0.5,1.8,0.3,sty.trim,1.5,0,t.t*0.8);}
  shadow(P.x,P.y,P.z,0.7);
  for(const e of G.ents){
    if(e.hidden||e.gone)continue;
    if(e.dead&&e.st>9)continue;
    if(e.boss){drawBoss(D,e,time);continue;}
    if(e.type==='drone')drawDrone(D,e,time);
    else if(e.type==='mech')drawMech(D,e,time);
    else drawHuman(D,{x:e.x,y:e.y,z:e.z,yaw:e.yaw,pose:e.pose,look:e.look,charge:e.charge,ph:e.ph});
    shadow(e.x,e.fly?(e.base||e.y):e.y,e.z,e.type==='mech'?1.6:e.type==='brute'?0.9:0.65);
    if(e.state==='windup'&&!e.melee&&(e.type==='guard'||e.type==='sniper'))beam(A,e.x+Math.sin(e.yaw)*0.6,e.y+1.35,e.z+Math.cos(e.yaw)*0.6,P.x,P.y+1.1,P.z,[1,.15,.2],0.6,e.type==='sniper'?0.05:0.03);
  }
  for(const c of G.civs){drawHuman(D,{x:c.x,y:c.y,z:c.z,yaw:c.yaw,pose:c.pose,look:c.look,ph:c.ph});shadow(c.x,c.y,c.z,0.6);}
  if(P.grap)beam(A,P.x,P.y+1.6,P.z,P.grap.x,P.grap.y,P.grap.z,[.3,.95,1],0.9,0.035);
  if(P.disc)for(const d of P.disc){if(d.done)continue;XF.reset().t(d.x,d.y,d.z).ry(time*30);D.part('cyl12',XF.m,0.45,0.06,0.45,sty.trim,3,0);}
  for(const s of G.shots){if(s.kind==='snipe'||s.kind==='bolt')beam(A,s.x,s.y,s.z,s.x-s.vx*0.03,s.y-s.vy*0.03,s.z-s.vz*0.03,s.c,1,0.08);else D.aabb(s.x-.14,s.y-.14,s.z-.14,s.x+.14,s.y+.14,s.z+.14,s.c,3,0);}
  for(const p of G.sparks){const k=1-p.t/p.life;if(p.steam){Gl.aabb(p.x-p.s,p.y-p.s,p.z-p.s,p.x+p.s,p.y+p.s,p.z+p.s,p.c,0.1,0,0,0.25*k);continue;}
    if(p.drop){Gl.aabb(p.x-.012,p.y,p.z-.012,p.x+.012,p.y+.08,p.z+.012,p.c,0.7,0,0,0.4*k);continue;}   // a rain splash: a fine glint, not a block
    D.aabb(p.x-p.s*k,p.y-p.s*k,p.z-p.s*k,p.x+p.s*k,p.y+p.s*k,p.z+p.s*k,p.c,3,0);}
  for(const r of G.fx){const rad=r.max*ease(r.t/0.5),a=1-r.t/0.5;
    for(let i=0;i<24;i++){const an=i/24*TAU;A.aabb(r.x+Math.cos(an)*rad-.25,r.y,r.z+Math.sin(an)*rad-.25,r.x+Math.cos(an)*rad+.25,r.y+.15,r.z+Math.sin(an)*rad+.25,r.c,2,0,0,a);}}
  for(const s of G.smoke){const a=Math.min(1,(s.dur-s.t)/1.5)*0.35;
    for(let i=0;i<10;i++){const an=i*2.4,rr=1.5+(i%3)*1.6+s.t*0.3,h=0.6+(i%4)*0.5;Gl.aabb(s.x+Math.cos(an)*rr-1,s.y,s.z+Math.sin(an)*rr-1,s.x+Math.cos(an)*rr+1,s.y+h+1,s.z+Math.sin(an)*rr+1,[.35,.33,.42],0.1,0,0,a,-1,null,'round');}}
  for(const w of G.warps){const k=w.t/0.6;for(let i=0;i<8;i++){const yy=w.y+rng()*2.2;A.aabb(w.x-.6+rng()*.6,yy,w.z-.05,w.x+rng()*.6,yy+.08+rng()*.2,w.z+.05,i%2?[1,.25,.7]:[.2,.95,1],2.5,0,0,1-k);}}
  for(const it of WORLD.items){if(it.taken)continue;it.bob+=0.016;
    const y=it.y+Math.sin(it.bob*3)*0.15;XF.reset().t(it.x,y,it.z).ry(time*2);
    if(it.t==='key')D.part('box',XF.m,0.5,0.32,0.05,KEYCOL[it.key],2.2,10);
    else if(it.t==='shard'){XF.rx(0.6).rz(0.6);D.part('box',XF.m,0.35,0.35,0.35,[.6,1,.4],2.4,10);}
    else if(it.t==='tag'){const ti=TILE['tag'+((Math.abs(it.x*3+it.z)|0)%3)];XF.reset().t(it.x,it.y+0.3,it.z).ry(time*0.8);D.part('plane',XF.m,1.3,1.3,1,[.9,.9,.9],0,10,1,ti,[1,1,1]);
      A.aabb(it.x-.7,it.y-0.75,it.z-.7,it.x+.7,it.y-0.73,it.z+.7,[.6,1,.4],1,0,0,0.3+0.2*Math.sin(time*4),-1,null,'cyl12');}
    else if(it.t==='radio'){D.part('box',XF.m,0.42,0.3,0.18,[.5,.5,.55],0,12,1,TILE.screen,[.6,1,.4]);XF.t(0.13,0.3,0);D.part('box',XF.m,0.03,0.35,0.03,[.6,1,.4],2.5,0);}
    else{D.part('box',XF.m,0.22,0.5,0.22,[.95,.95,1],0.4,0);XF.t(0,0,0.12);D.part('box',XF.m,0.12,0.36,0.02,[1,.25,.5],2.5,0);}
  }
  const ex=WORLD.W.exit;
  if(ex&&G.mode==='campaign'){const ready=uplinkReady(),c=ready?[.3,1,.6]:[1,.2,.3];
    A.aabb(ex.x-.9,ex.y,ex.z-.9,ex.x+.9,ex.y+40,ex.z+.9,c,2,0,0,ready?0.35:0.15,-1,null,'cyl12');D.aabb(ex.x-.5,ex.y+.25,ex.z-.5,ex.x+.5,ex.y+.6,ex.z+.5,c,3,0);}
}
function shadow(x,y,z,r){const g=groundAt(x,z,y+0.3);if(!g)return;const h=Math.max(0,y-g.y1),k=clamp(1-h/8,0.15,1);
  R.glass.aabb(x-r,g.y1+0.02,z-r,x+r,g.y1+0.04,z+r,[0,0,0],0,0,0,(Q.shadow?0.25:0.5)*k,-1,null,'cyl12');}
function beam(L,x0,y0,z0,x1,y1,z1,c,a,w){
  const dx=x1-x0,dy=y1-y0,dz=z1-z0,l=Math.hypot(dx,dy,dz)||1;
  XF.reset().t((x0+x1)/2,(y0+y1)/2,(z0+z1)/2).ry(Math.atan2(dx,dz)).rx(-Math.asin(clamp(dy/l,-1,1)));
  L.part('box',XF.m,w,w,l,c,3,0,a);
}
function drawDrone(D,e,time){
  const s=e.state==='stun'||e.dead;
  XF.reset().t(e.x,e.y,e.z).ry(e.yaw);if(e.dead)XF.rx(e.st*3).rz(e.st*2);
  D.part('round',XF.m,0.7,0.34,0.7,[.5,.52,.6],0,12,1,TILE.drone,[.3,.9,1]);
  XF.push().t(0,0,0.34);D.part('box',XF.m,0.24,0.16,0.06,e.state==='windup'?[1,1,1]:[.3,.9,1],s?0.3:3,0);XF.pop();
  for(const [ax,az] of [[1,1],[-1,1],[1,-1],[-1,-1]]){XF.push().t(ax*0.5,0.1,az*0.5);D.part('cyl',XF.m,0.14,0.08,0.14,[.3,.3,.36],0,0);
    XF.ry(time*40);D.part('box',XF.m,0.62,0.02,0.06,[.6,.6,.7],0,0);XF.pop();}
}
function drawMech(D,e,time,scale,col){
  const k=e.dead?Math.min(1,e.st*2):0,crouch=e.state==='windup'&&e.stomp?-0.3:e.state==='stun'||e.state==='open'?-0.4:0,step=e.state==='chase'?Math.sin(e.ph*5):0;
  XF.reset().t(e.x,e.y,e.z).ry(e.yaw);if(scale){const m=XF.m;for(let i=0;i<12;i++)m[i]*=scale;}if(k)XF.rx(-k*1.3);
  const C=col||[.7,.72,.8];
  for(const sx of [-1,1]){XF.push().t(sx*0.55,0,step*sx*0.25);D.part('wedge',XF.m,0.55,0.3,1,[.3,.3,.35],0,12,1,TILE.mech);
    XF.t(0,0.9+crouch*0.5,0);D.part('limb',XF.m,0.5,-1.5,0.55,C,0,12,1,TILE.mech);XF.t(0,0.2,0.28);D.part('box',XF.m,0.3,0.06,0.02,[1,.7,.3],2,0);XF.pop();}
  XF.push().t(0,2.1+crouch,0);D.part('torso',XF.m,1.7,1.1,1.3,C,0,12,1,TILE.mech);
  XF.push().t(0,0.15,0.66);D.part('box',XF.m,0.8,0.32,0.04,e.state==='stun'||e.state==='open'?[.3,.9,1]:[1,.7,.3],e.state==='stun'?2:3,0);XF.pop();
  for(const sx of [-1,1]){XF.push().t(sx*1.05,0.1,0.2);D.part('box',XF.m,0.45,0.45,1.2,C,0,12,1,TILE.mech);XF.t(0,0,0.65);D.part('cyl',XF.m,0.25,0.12,0.25,e.state==='windup'&&!e.stomp?[1,1,1]:[1,.5,.2],2.5,0);XF.pop();}
  XF.pop();
}
