/* ================================= BOSSES =================================
   One for each district. Each has a tell for every attack, a way to open it
   up, and phases as it breaks. Red tells can be countered; amber ones must
   be dodged or jumped.                                                      */
const BOSSES={
  chain: {name:'CHAIN',title:'GANG LEADER OF THE UNDERCITY',hp:14,portrait:'pChain',color:[1,.3,.3]},
  twin:  {name:'ECHO & NULL',title:'THE VAULT\'S HACKER TWINS',hp:8,portrait:'pTwins',color:[.3,.95,1]},
  hammer:{name:'HAMMERHEAD',title:'CORPORATE GUNSHIP',hp:18,portrait:'pHammer',color:[1,.6,.2]},
  atlas: {name:'ATLAS',title:'HEAVY SECURITY FRAME',hp:20,portrait:'pAtlas',color:[1,.7,.3]},
  warden:{name:'THE WARDEN',title:'THE AI THAT TOOK THE TOWER',hp:30,portrait:'pWarden',color:[.75,.45,1]}
};
function makeBoss(kind,x,y,z,island){
  const B=BOSSES[kind==='twins'?'twin':kind],out=[];
  const mk=(t,ox,oz,extra)=>{
    const e=Object.assign({boss:true,type:t,x:x+ox,y,z:z+oz,base:y,yaw:Math.PI,hp:0,hpMax:0,state:'idle',st:0,ph:0,cool:2,phase:0,aware:false,island,
      hw:t==='atlas'?1.1:t==='chain'?0.6:0.4,h:2.6,pose:POSE0(),seed:(rng()*1e6)|0,dead:false,cy:1.6,introduced:false,summon:[0.66,0.33]},extra||{});
    e.hp=e.hpMax=Math.ceil(B.hp*(G.mode==='campaign'?(0.8+G.skill*0.1):1));
    if(LOOKS[t])e.look=LOOKS[t](e);
    G.ents.push(e);out.push(e);return e;
  };
  if(kind==='twins'){const a=mk('twin',-4,0,{twin:true,solid:true}),b=mk('twin',4,0,{twin:false,solid:false});a.partner=b;b.partner=a;a.look=LOOKS.twin(a);b.look=LOOKS.twin(b);}
  else if(kind==='hammer')mk('hammer',0,0,{y:y+11,fly:true,cy:0,ang:0});
  else if(kind==='warden')mk('warden',0,0,{y:y+5,fly:true,cy:0,slamT:7,summonT:10,boltT:6});
  else mk(kind,0,0,{});
  return out;
}
function bossInfo(e){return BOSSES[e.type];}
function bossWake(e){
  if(e.introduced)return;
  for(const o of G.ents)if(o.boss&&(o===e||o.partner===e))o.introduced=true;
  e.aware=true;if(e.partner){e.partner.aware=true;e.partner.state='chase';}
  bossIntro(e);
  AUDIO.music.start({boss:true,bpm:140,root:40,seed:e.type.length*91,intensity:2});
}
function bossVulnerable(e){
  if(e.type==='twin')return e.solid&&e.state!=='blink';
  if(e.type==='hammer')return e.state==='stun';
  if(e.type==='warden')return e.grounded||e.state==='stun';
  return e.state==='stun'||e.state==='open';
}
// Called before damage lands: return false to ignore the hit.
function bossHit(e,dmg,how){
  if(how==='deflect'&&(e.type==='hammer'||e.type==='warden'))return true;
  if(how==='disc'&&e.type==='hammer')return true;
  if(!bossVulnerable(e)){AUDIO.play('hitmetal',0.6);spark(e.x,e.y+(e.cy||1.5),e.z,0,2,0,[1,1,1],0.3,6);
    if(G.msgT<0.5)msg(e.type==='twin'?'HIT THE ONE THAT IS SOLID':e.type==='hammer'?'THROW ITS MISSILES BACK, OR DISC ITS ENGINES':e.type==='warden'?'BRING IT DOWN: EMP, OR WAIT FOR THE SLAM':'COUNTER OR STUN IT FIRST, THEN BEAT IT DOWN');return false;}
  return true;
}
function bossStun(e,t){
  if(e.type==='twin'){e.state='stun';e.st=0;e.stunFor=t*0.6;return;}
  if(e.type==='hammer'&&Math.hypot(e.x-P.x,e.z-P.z)>12)return;
  e.state='stun';e.st=0;e.stunFor=t;e.grounded=e.type==='warden';AUDIO.play('emp');
}
function bossOpened(e){e.stunFor=2.4;}
function bossDefeated(e){
  if(e.partner&&!e.partner.dead){const p=e.partner;p.solid=true;p.enraged=true;msg(BOSSES.twin.name.split(' & ')[p.twin?0:1]+' IS ALONE AND FURIOUS');radio('warden','One of my children is gone. The other will be quicker.');return;}
  G.slow=1.4;G.cine={t:1.6,x:e.x,y:e.y,z:e.z,side:1};
  for(const o of G.ents)if(!o.dead&&!o.boss&&o.type==='drone')knockOut(o,'emp');
  msg(bossInfo(e).name+' IS DOWN  ·  THE UPLINK IS OPEN');
  award(5000*(G.mode==='campaign'?1:0.5),bossInfo(e).name+' DEFEATED');
  storyEvent('bossDown',e);
  levelMusic();
}
function bossSummon(e,list){
  for(const t of list){for(let k=0;k<12;k++){const a=rng()*TAU,d=6+rng()*4,x=e.x+Math.sin(a)*d,z=e.z+Math.cos(a)*d,g=groundAt(x,z,e.base+2);
    if(g&&Math.abs(g.y1-e.base)<1){G.warps.push({x,y:g.y1,z,t:0,spawn:t,island:e.island});break;}}}
  AUDIO.play('warp');
}
function bossUpdate(e,dt){
  e.st+=dt;e.ph+=dt;
  if(e.dead){if(e.type==='hammer'){e.vy=(e.vy||0)-12*dt;e.y+=e.vy*dt;e.ang+=dt*2;if(e.y<WORLD.fogY-20)e.gone=true;}else if(e.rag)ragUpdate(e,dt);return;}
  const dx=P.x-e.x,dz=P.z-e.z,dist=Math.hypot(dx,dz)||0.01,toP=Math.atan2(dx,dz);
  if(e.state==='idle'){
    if(dist<22&&Math.abs(P.y-e.base)<8)alertGroup(e);
    if(e.look)poseIdle(e.pose,e.ph,'taunt');return;
  }
  if(!e.introduced)bossWake(e);
  // summons as it breaks
  const frac=e.hp/e.hpMax;
  if(e.summon.length&&frac<e.summon[0]){e.summon.shift();e.phase++;
    const adds={chain:['thug','thug','knife'],twin:['drone','drone'],hammer:['thug','thug','guard'],atlas:['shield','thug','baton'],warden:['drone','ninja','thug']}[e.type];
    bossSummon(e,adds);CAM.shake=0.5;storyEvent('bossPhase',e);}
  ({chain:chainAI,twin:twinAI,hammer:hammerAI,atlas:atlasAI,warden:wardenAI})[e.type](e,dt,dist,toP,dx,dz);
}
function tell(e,kind,t,counter){e.state='windup';e.st=0;e.atk=kind;e.wind=t;e.counterable=!!counter;AUDIO.play(counter?'tell':'tell2',0.8);}
const SK=()=>G.mode==='campaign'?SKILLS[G.skill].dmg:1;

/* CHAIN: sweeps you jump, slams you counter, charges you dodge into a wall. */
function chainAI(e,dt,dist,toP,dx,dz){
  const tp=POSE0();
  switch(e.state){
    case 'stun':case 'open':Object.assign(tp,{lean:-0.4,head:0.6,aL:[0.3,1,0],aR:[0.3,1,0],hip:-0.2});if(e.st>(e.stunFor||2.4))e.state='chase';break;
    case 'windup':
      e.yaw+=angDiff(toP,e.yaw)*Math.min(1,(e.atk==='charge'?2:6)*dt);
      if(e.atk==='sweep'){e.swing=(e.swing||0)+dt*14;Object.assign(tp,{aR:[-1.6,1.4,-0.2],twist:Math.sin(e.st*14)*0.5});}
      else if(e.atk==='slam')Object.assign(tp,{aR:[-3,0.2,-0.6],aL:[-3,0.2,-0.6],lean:-0.3});
      else Object.assign(tp,{lean:0.6,hip:-0.2,aL:[0.6,0.4,0],aR:[0.6,0.4,0]});
      if(e.st>=e.wind){e.state='attack';e.st=0;e.counterable=false;
        if(e.atk==='sweep'){fxRing(e.x,e.y+0.3,e.z,4.8,[1,.6,.2]);AUDIO.play('whoosh');if(dist<4.8&&P.onGround)playerDamage(16*SK(),e);}
        else if(e.atk==='slam'){fxRing(e.x+Math.sin(e.yaw)*1.5,e.y+0.2,e.z+Math.cos(e.yaw)*1.5,2.6,[1,.3,.3]);AUDIO.play('explode',0.8);CAM.shake=0.5;if(dist<2.8)playerDamage(18*SK(),e);}
        else{e.cvx=Math.sin(e.yaw)*13;e.cvz=Math.cos(e.yaw)*13;}}
      break;
    case 'attack':
      if(e.atk==='charge'){
        const ox=e.x,oz=e.z;moveAxis(e,'x',e.cvx*dt);moveAxis(e,'z',e.cvz*dt);
        poseRun(tp,e.ph*14,1,0.5);
        if(Math.hypot(P.x-e.x,P.z-e.z)<1.6&&P.inv<=0){playerDamage(20*SK(),e);e.state='chase';e.cool=1.5;}
        else if(Math.hypot(e.x-ox-e.cvx*dt,e.z-oz-e.cvz*dt)>0.05||e.st>1.3){
          if(e.st<1.3){e.state='stun';e.st=0;e.stunFor=2.6;CAM.shake=0.7;AUDIO.play('bigdeath',0.7);msg('CHAIN IS DAZED · BEAT IT DOWN');}else{e.state='chase';e.cool=1;}}
        const g=groundAt(e.x,e.z,e.y+0.6);if(!g){e.x=ox;e.z=oz;e.state='stun';e.st=0;e.stunFor=2.6;}
      }else if(e.st>0.5){e.state='chase';e.cool=0.8+rng()*0.8;}
      break;
    default:{
      e.cool-=dt;e.yaw+=angDiff(toP,e.yaw)*Math.min(1,4*dt);
      if(dist>3)mover(e,dx/dist*3.6*dt,dz/dist*3.6*dt);
      e.walkPh=(e.walkPh||0)+dt*5;poseRun(tp,e.walkPh,dist>3?0.8:0.2,0.1);
      if(e.cool<=0){const r=rng();
        if(dist<3.5&&r<0.5)tell(e,'slam',0.7,true);else if(dist<4.5)tell(e,'sweep',0.9,false);else tell(e,'charge',0.8,false);e.cool=2;}
    }
  }
  const g=groundAt(e.x,e.z,e.y+0.6);if(g)e.y=g.y1;
  blendPose(e.pose,tp,Math.min(1,12*dt));
}
/* ECHO & NULL: only one is solid at a time, and they trade places. */
function twinAI(e,dt,dist,toP,dx,dz){
  const tp=POSE0();
  if(e.twin&&!e.enraged&&e.partner&&!e.partner.dead){e.swapT=(e.swapT||0)+dt;if(e.swapT>5){e.swapT=0;e.solid=!e.solid;e.partner.solid=!e.solid;
    for(const o of [e,e.partner]){G.warps.push({x:o.x,y:o.y,z:o.z,t:0});}const tx=e.x,tz=e.z;e.x=e.partner.x;e.z=e.partner.z;e.partner.x=tx;e.partner.z=tz;AUDIO.play('blink');}}
  e.alpha=e.solid?1:0.35;
  switch(e.state){
    case 'stun':case 'open':Object.assign(tp,{lean:-0.3,head:0.5});if(e.st>(e.stunFor||2))e.state='chase';break;
    case 'windup':
      e.yaw+=angDiff(toP,e.yaw)*Math.min(1,8*dt);
      Object.assign(tp,e.atk==='slash'?{twist:0.5,aR:[0.6,0.5,-1.6],aL:[-1,0.3,-1.6]}:{aR:[-1.5,0.05,0],aL:[-1.5,0.05,0]});
      if(e.st>=e.wind){e.state='chase';e.counterable=false;e.cool=(e.enraged?0.9:1.8)+rng();
        if(e.atk==='slash'){if(dist<2.4)playerDamage(12*SK(),e);}
        else{const n=e.enraged?5:3;for(let i=0;i<n;i++){const a=toP+(i-(n-1)/2)*0.25;G.shots.push({x:e.x,y:e.y+1.4,z:e.z,vx:Math.sin(a)*10,vy:(P.y+1-e.y-1.4)/Math.max(3,dist)*10,vz:Math.cos(a)*10,dmg:10*SK(),owner:e,kind:'orb',life:3,home:true,c:e.look.glow});}AUDIO.play('arc',0.6);}}
      break;
    default:{
      e.cool-=dt;e.yaw+=angDiff(toP,e.yaw)*Math.min(1,6*dt);
      const want=e.solid?3:8;if(dist>want+1)mover(e,dx/dist*4.2*dt,dz/dist*4.2*dt);else if(dist<want-1)mover(e,-dx/dist*3*dt,-dz/dist*3*dt);
      e.walkPh=(e.walkPh||0)+dt*5;poseRun(tp,e.walkPh,0.6,0.1);
      if(e.cool<=0){if(dist<3&&e.solid)tell(e,'slash',0.5,true);else tell(e,'orbs',0.6,false);}
      if(rng()<dt*0.15)blink(e);
    }
  }
  const g=groundAt(e.x,e.z,e.y+0.6);if(g)e.y=g.y1;
  blendPose(e.pose,tp,Math.min(1,12*dt));
}
/* HAMMERHEAD: circles the roof, strafes in lines, fires missiles you can send back. */
function hammerAI(e,dt,dist,toP){
  const I=WORLD.W.islands[e.island],cx=I.x,cz=I.z;
  if(e.state==='stun'){e.y=lerp(e.y,e.base+3.5,Math.min(1,3*dt));if(e.st>e.stunFor){e.state='chase';}return;}
  e.ang+=dt*(e.phase?0.45:0.32);
  const rad=Math.min(I.w,I.d)*0.42,tx=cx+Math.cos(e.ang)*rad,tz=cz+Math.sin(e.ang)*rad;
  e.x=lerp(e.x,tx,Math.min(1,2*dt));e.z=lerp(e.z,tz,Math.min(1,2*dt));e.y=lerp(e.y,e.base+11+Math.sin(e.ph)*0.8,Math.min(1,2*dt));
  e.yaw=Math.atan2(P.x-e.x,P.z-e.z);
  if(e.state==='strafe'){
    e.lineT-=dt;
    if(e.lineT<=0&&!e.fired){e.fired=true;AUDIO.play('shotgun',0.8);CAM.shake=0.4;
      for(let i=0;i<14;i++){const k=i/13,x=lerp(e.l0[0],e.l1[0],k),z=lerp(e.l0[1],e.l1[1],k);spark(x,e.base+0.2,z,(rng()-.5)*3,3,(rng()-.5)*3,[1,.7,.3],0.4);}
      const vx=e.l1[0]-e.l0[0],vz=e.l1[1]-e.l0[1],L2=vx*vx+vz*vz,t=clamp(((P.x-e.l0[0])*vx+(P.z-e.l0[1])*vz)/L2,0,1);
      if(Math.hypot(e.l0[0]+vx*t-P.x,e.l0[1]+vz*t-P.z)<1.8&&P.y-e.base<2)playerDamage(18*SK(),e);}
    if(e.lineT<-0.4){e.state='chase';e.cool=1.5;}
    return;
  }
  e.cool-=dt;
  if(e.cool<=0){
    if(rng()<0.5){                                    // a strafing run: the line glows amber first
      const a=rng()*TAU;e.l0=[P.x-Math.cos(a)*9,P.z-Math.sin(a)*9];e.l1=[P.x+Math.cos(a)*9,P.z+Math.sin(a)*9];e.lineT=1.2;e.fired=false;e.state='strafe';AUDIO.play('tell2');
    }else{
      for(let i=0;i<(e.phase?4:3);i++){const a=toP+(i-1)*0.3;
        G.shots.push({x:e.x,y:e.y-0.5,z:e.z,vx:Math.sin(a)*7,vy:-2,vz:Math.cos(a)*7,dmg:14*SK(),owner:e,kind:'missile',life:5,home:true,c:[1,.4,.3]});}
      AUDIO.play('rail',0.6);e.cool=2.8;
    }
    if(e.state!=='strafe')e.cool=2.4;
  }
}
/* ATLAS: stomps, rockets, and a charge that ends in a wall if you step aside. */
function atlasAI(e,dt,dist,toP,dx,dz){
  switch(e.state){
    case 'stun':case 'open':if(e.st>(e.stunFor||3)){e.state='chase';e.cool=1;}break;
    case 'windup':
      e.yaw+=angDiff(toP,e.yaw)*Math.min(1,(e.atk==='charge'?1.5:5)*dt);e.stomp=e.atk==='stomp';
      if(e.st>=e.wind){e.state='attack';e.st=0;
        if(e.atk==='stomp'){fxRing(e.x,e.y+0.3,e.z,5.2,[1,.6,.2]);AUDIO.play('explode');CAM.shake=0.7;if(dist<5.2&&P.y-e.y<1.5)playerDamage(22*SK(),e);}
        else if(e.atk==='rockets'){for(let i=0;i<5;i++){const a=toP+(i-2)*0.18;G.shots.push({x:e.x+Math.sin(a)*2,y:e.y+3.4,z:e.z+Math.cos(a)*2,vx:Math.sin(a)*14,vy:(P.y+1-e.y-3.4)/Math.max(3,dist)*14,vz:Math.cos(a)*14,dmg:12*SK(),owner:e,kind:'rocket',life:3,c:[1,.6,.2]});}AUDIO.play('shotgun');}
        else{e.cvx=Math.sin(e.yaw)*11;e.cvz=Math.cos(e.yaw)*11;}}
      break;
    case 'attack':
      if(e.atk==='charge'){const ox=e.x,oz=e.z;moveAxis(e,'x',e.cvx*dt);moveAxis(e,'z',e.cvz*dt);e.ph+=dt*3;
        if(Math.hypot(P.x-e.x,P.z-e.z)<2.2&&P.inv<=0){playerDamage(24*SK(),e);e.state='chase';e.cool=1.5;}
        else if(Math.hypot(e.x-ox-e.cvx*dt,e.z-oz-e.cvz*dt)>0.05||!groundAt(e.x,e.z,e.y+0.6)||e.st>1.5){
          if(!groundAt(e.x,e.z,e.y+0.6)){e.x=ox;e.z=oz;}
          if(e.st<1.5){e.state='stun';e.st=0;e.stunFor=3;CAM.shake=0.8;AUDIO.play('bigdeath');msg('ATLAS IS STUCK · HIT IT NOW');}else{e.state='chase';e.cool=1;}}}
      else if(e.st>0.6){e.state='chase';e.cool=1.4+rng();}
      break;
    default:
      e.cool-=dt;e.yaw+=angDiff(toP,e.yaw)*Math.min(1,2.5*dt);
      if(dist>5)mover(e,dx/dist*2.6*dt,dz/dist*2.6*dt);e.ph+=dt;
      if(e.cool<=0){const r=rng();if(dist<5)tell(e,'stomp',0.9,false);else if(r<0.5)tell(e,'rockets',0.8,false);else tell(e,'charge',0.9,false);}
  }
  const g=groundAt(e.x,e.z,e.y+0.6);if(g)e.y=g.y1;
}
/* THE WARDEN: hovers out of reach and fires, slams down where it can be hit,
   calls for help, and at the end calls lightning down on you. */
function wardenAI(e,dt,dist,toP){
  e.yaw+=angDiff(toP,e.yaw)*Math.min(1,2*dt);
  const ph=e.hp>e.hpMax*0.66?0:e.hp>e.hpMax*0.33?1:2;
  if(ph>e.wph){e.wph=ph;msg(ph===1?'THE WARDEN CALLS FOR HELP':'THE WARDEN IS BREAKING');CAM.shake=0.6;AUDIO.play('alert');G.glitch=0.8;}
  e.wph=e.wph||0;
  const hoverY=e.base+5+Math.sin(e.ph*1.3)*0.6;
  if(e.state==='stun'){e.grounded=true;e.y=lerp(e.y,e.base+0.8,Math.min(1,6*dt));if(e.st>e.stunFor){e.state='chase';e.grounded=false;}return;}
  if(e.state==='slam'){
    if(e.st<0.9)e.y=lerp(e.y,hoverY+2,Math.min(1,4*dt));
    else if(!e.slammed){e.y=lerp(e.y,e.base+0.8,Math.min(1,18*dt));if(e.y<e.base+1.1){e.slammed=true;e.grounded=true;
      fxRing(e.x,e.base+0.2,e.z,6,[.8,.4,1]);AUDIO.play('explode');CAM.shake=0.8;if(dist<6&&P.y-e.base<1.5)playerDamage(20*SK(),e);}}
    else if(e.st>4.4){e.state='chase';e.grounded=false;e.slammed=false;e.st=0;}
    return;
  }
  e.grounded=false;e.y=lerp(e.y,hoverY,Math.min(1,3*dt));
  const want=8;if(dist>want+2)mover(e,Math.sin(toP)*3*dt,Math.cos(toP)*3*dt);else if(dist<want-2)mover(e,-Math.sin(toP)*3*dt,-Math.cos(toP)*3*dt);
  e.cool-=dt;e.slamT-=dt;e.boltT-=dt;
  if(e.slamT<=0){e.state='slam';e.st=0;e.slamT=ph===2?6:8;AUDIO.play('tell2');return;}
  if(ph===2&&e.boltT<=0){e.boltT=3.5;G.strikes.push({x:P.x,z:P.z,y:P.y,t:0});AUDIO.play('tell2',0.6);}
  if(e.cool<=0){
    const n=ph===2?9:7,spread=ph===2?1.2:0.9,sp=ph===2?15:12,k=SK();
    for(let i=0;i<n;i++){const a=toP-spread/2+spread*i/(n-1);G.shots.push({x:e.x,y:e.y,z:e.z,vx:Math.sin(a)*sp,vy:(P.y+1-e.y)/Math.max(4,dist)*sp,vz:Math.cos(a)*sp,dmg:10*k,owner:e,kind:'boss',life:3,c:ph?[1,.25,.3]:[.75,.45,1]});}
    if(ph>=1&&rng()<0.35)for(let i=0;i<14;i++){const a=i*TAU/14+e.ph;G.shots.push({x:e.x,y:P.y+1,z:e.z,vx:Math.sin(a)*9,vy:0,vz:Math.cos(a)*9,dmg:8*k,owner:e,kind:'boss',life:4,c:[1,.25,.3]});}
    e.cool=ph===2?1.5:2.3;AUDIO.play('rail',0.5);
  }
}
// Lightning: an amber ring marks the spot, then the sky answers.
function strikesUpdate(dt){
  for(const s of G.strikes){s.t+=dt;
    if(s.t>1.1&&!s.done){s.done=true;G.flash=1;AUDIO.play('explode');CAM.shake=0.6;fxRing(s.x,s.y+0.2,s.z,2.5,[.8,.85,1]);
      if(Math.hypot(P.x-s.x,P.z-s.z)<2.5)playerDamage(18*SK(),{x:s.x,z:s.z});}}
  G.strikes=G.strikes.filter(s=>s.t<1.6);
}
function drawBoss(D,e,time){
  if(e.gone)return;
  if(e.type==='chain'||e.type==='twin'){
    drawHuman(e.type==='twin'&&!e.solid?R.glass:D,{x:e.x,y:e.y,z:e.z,yaw:e.yaw,pose:e.pose,look:e.look,ph:e.ph,swing:e.swing,alpha:e.type==='twin'&&!e.solid?0.35:1});
    if(e.atk==='sweep'&&e.state==='windup')for(let i=0;i<8;i++){const a=e.swing+i*0.25;D.aabb(e.x+Math.sin(a)*(1+i*0.45)-.1,e.y+1.3,e.z+Math.cos(a)*(1+i*0.45)-.1,e.x+Math.sin(a)*(1+i*0.45)+.1,e.y+1.5,e.z+Math.cos(a)*(1+i*0.45)+.1,[.75,.75,.8],0.3,0);}
    shadow(e.x,e.y,e.z,1);return;
  }
  if(e.type==='atlas'){drawMech(D,e,time,1.7,[.85,.6,.3]);shadow(e.x,e.y,e.z,2.6);return;}
  if(e.type==='hammer'){
    XF.reset().t(e.x,e.y,e.z).ry(e.yaw+(e.dead?e.ang:0));if(e.dead)XF.rz(e.ang);
    D.part('torso',XF.m,3.4,1.6,6,[.6,.62,.7],0,12,1,TILE.hull,[1,.5,.2]);
    XF.push().t(0,0.3,2.6);D.part('wedge',XF.m,2.2,0.9,1.6,[.3,.32,.4],0,12,1,TILE.hull,[1,.3,.3]);XF.pop();
    XF.push().t(0,0.1,3.2);D.part('box',XF.m,1.6,0.25,0.1,[1,.3,.3],3,0);XF.pop();
    for(const sx of [-1,1]){XF.push().t(sx*2.6,0,-0.5);D.part('cyl12',XF.m,1.4,0.7,1.4,[.4,.42,.5],0,12,1,TILE.vent);
      XF.ry(time*30);D.part('box',XF.m,2.6,0.05,0.2,[.7,.7,.8],0,0);XF.pop();
      XF.push().t(sx*2.6,-0.5,-0.5);D.part('cyl',XF.m,0.6,0.3,0.6,[1,.6,.2],e.state==='stun'?0.4:3,0);XF.pop();}
    if(e.state==='strafe'&&!e.fired)for(let i=0;i<14;i++){const k=i/13,x=lerp(e.l0[0],e.l1[0],k),z=lerp(e.l0[1],e.l1[1],k);R.add.aabb(x-.5,e.base+0.04,z-.5,x+.5,e.base+0.07,z+.5,[1,.6,.2],2,0,0,0.5+0.4*Math.sin(time*20),-1,null,'cyl12');}
    beam(R.add,e.x,e.y-0.8,e.z,e.x+(P.x-e.x)*0.2,e.base,e.z+(P.z-e.z)*0.2,[1,.95,.8],0.12,1.2);
    return;
  }
  // the Warden
  const c=e.wph===2?[1,.25,.3]:e.wph===1?[1,.4,.8]:[.75,.45,1];
  XF.reset().t(e.x,e.y,e.z).ry(time*0.6);
  D.part('round',XF.m,1.8,1.8,1.8,[.3,.28,.4],0,12,1,TILE.mech);
  XF.push().ry(Math.PI/4).rx(Math.PI/4);D.part('box',XF.m,1.5,1.5,1.5,[.25,.22,.32],0,12,1,TILE.hull,c);XF.pop();
  D.part('round',XF.m,0.8,0.8,0.8,c,e.state==='slam'||e.grounded?4:2.5,12,1,TILE.core,c);
  for(let ring=0;ring<2;ring++)for(let i=0;i<10;i++){const a=i/10*TAU+time*(ring?-1.2:0.8);XF.push().ry(a).rz(ring?0.6:-0.4).t(2.4+ring*0.6,0,0);D.part('box',XF.m,0.35,0.15,0.6,i%3?[.3,.28,.4]:c,i%3?0:2.5,12,1,i%3?TILE.metal:-1);XF.pop();}
  for(let i=0;i<6;i++){const a=i/6*TAU;XF.push().ry(a).t(0,-1.2,1).rx(0.5);D.part('cyl',XF.m,0.12,1.8,0.12,[.2,.2,.25],0,0);XF.pop();}
  for(const s of G.strikes){const k=s.t/1.1;if(!s.done)R.add.aabb(s.x-2.5,s.y+0.05,s.z-2.5,s.x+2.5,s.y+0.08,s.z+2.5,[1,.75,.3],2,0,0,0.3+k*0.5,-1,null,'cyl12');
    else R.add.aabb(s.x-.3,s.y,s.z-.3,s.x+.3,s.y+60,s.z+.3,[.85,.9,1],4,0,0,1-(s.t-1.1)/0.5);}
}
