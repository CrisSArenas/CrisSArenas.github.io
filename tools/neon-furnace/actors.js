/* ================================ ACTORS =================================
   Characters are built from boxes on a small skeleton, posed by code every
   frame. The player moves and fights; enemies take turns to attack, flash a
   warning before they hit, and can be countered, taken down unseen, stunned
   and knocked down.                                                         */
const XF=new Xf();
const STYLES={
  stock:{suit:[.13,.13,.18],trim:[1,.12,.2],visor:[1,.15,.22],plate:[.22,.22,.29]},
  chrome:{suit:[.42,.45,.52],trim:[.2,.95,1],visor:[.3,1,1],plate:[.7,.74,.82]},
  toxic:{suit:[.1,.18,.1],trim:[.6,1,.25],visor:[.6,1,.3],plate:[.16,.3,.16]},
  gold:{suit:[.18,.13,.05],trim:[1,.75,.2],visor:[1,.85,.4],plate:[.7,.52,.16]},
  glitch:{suit:[.1,.09,.14],trim:[1,.25,.7],visor:[.2,.95,1],plate:[.18,.15,.24]}
};
const POSE0=()=>({lean:0,twist:0,hip:0,head:0,aL:[0,0.12,0],aR:[0,0.12,0],lL:[0,0],lR:[0,0],wings:0,roll:0,spin:0});
function blendPose(cur,tgt,k){
  for(const key of ['lean','twist','hip','head','wings','roll','spin'])cur[key]+=(tgt[key]-cur[key])*k;
  for(const key of ['aL','aR','lL','lR'])for(let i=0;i<cur[key].length;i++)cur[key][i]+=(tgt[key][i]-cur[key][i])*k;
}
/* One skeleton for every humanoid. o: {x,y,z,yaw,pose,look,scale} */
function drawRig(Bt,o){
  const p=o.pose,L=o.look,s=o.scale||1,X=XF;
  X.reset().t(o.x,o.y,o.z).ry(o.yaw+p.spin);
  if(s!==1){const m=X.m;for(let i=0;i<12;i++)m[i]*=s;}
  if(p.roll){X.t(0,0.25,0).rx(p.roll).t(0,-0.25,0);}
  const hipY=0.95+p.hip;
  X.push().t(0,hipY,0).rx(p.lean).ry(p.twist);
  // torso and chest
  X.push().t(0,0.31,0);
  Bt.part(X.m,0.48,0.62,0.27,L.body,0);
  if(L.plate)Bt.part(X.m,0.4,0.3,0.29,L.plate,0);
  X.push().t(0,0.06,0.145);Bt.part(X.m,0.08,0.34,0.02,L.trim,1.6);X.pop();
  X.push().t(0,-0.27,0);Bt.part(X.m,0.5,0.08,0.29,L.trim,0.6*(L.belt||1));X.pop();
  if(L.coat){X.push().t(0,-0.52,-0.02);Bt.part(X.m,0.5,0.5,0.3,L.body,0);X.pop();}
  if(L.pack){X.push().t(0,0.05,-0.2);Bt.part(X.m,0.32,0.36,0.14,L.plate||L.body,0);X.push().t(0,0.12,-0.08);Bt.part(X.m,0.22,0.04,0.02,L.trim,2);X.pop();X.pop();}
  // head
  X.push().t(0,0.47,0).rx(p.head);
  Bt.part(X.m,0.26,0.28,0.27,L.head,0);
  if(L.hood){X.push().t(0,0.03,-0.02);Bt.part(X.m,0.32,0.34,0.32,L.body,0);X.pop();
    X.push().t(0,0,0.155);Bt.part(X.m,0.22,0.16,0.02,[0.01,0.01,0.02],0);X.pop();
    for(const sx of [-1,1]){X.push().t(sx*0.055,0.01,0.165);Bt.part(X.m,0.045,0.03,0.02,L.eye,3);X.pop();}}
  else{X.push().t(0,0.02,0.14);Bt.part(X.m,0.24,0.07,0.03,L.eye,2.4);X.pop();}
  if(L.crest){X.push().t(0,0.18,-0.02);Bt.part(X.m,0.06,0.12,0.26,L.crest,1.8);X.pop();}
  if(L.ears){for(const sx of [-1,1]){X.push().t(sx*0.1,0.18,-0.02).rz(-sx*0.25);Bt.part(X.m,0.05,0.1,0.06,L.head,0);X.pop();}}
  X.pop();
  // wings, folded flat against the back until they open
  if(L.wings&&p.wings>0.02){
    for(const sx of [-1,1]){
      X.push().t(sx*0.2,0.22,-0.16).rz(sx*(0.25+p.wings*1.25)).ry(sx*0.2*p.wings);
      X.push().t(sx*0.55*p.wings,-0.1,0);Bt.part(X.m,1.1*p.wings+0.05,0.04,0.55,L.trim,0.35);X.pop();
      for(let r=1;r<4;r++){X.push().t(sx*0.28*r*p.wings,-0.08,0);Bt.part(X.m,0.03,0.05,0.56,L.trim,1.6);X.pop();}
      X.push().t(sx*1.1*p.wings,-0.1,0.27);Bt.part(X.m,0.08,0.05,0.04,L.trim,2.5);X.pop();
      X.push().t(sx*0.55*p.wings,-0.1,-0.28);Bt.part(X.m,1.1*p.wings,0.03,0.03,L.trim,2);X.pop();
      X.pop();
    }
  }
  // arms
  for(const sx of [-1,1]){
    const a=sx<0?p.aL:p.aR;
    X.push().t(sx*0.31,0.27,0).rx(a[0]).rz(sx*a[1]);
    X.push().t(0,-0.15,0);Bt.part(X.m,0.14,0.32,0.14,L.arm||L.body,0);X.pop();
    if(L.plate){X.push().t(0,0.02,0);Bt.part(X.m,0.18,0.12,0.18,L.plate,0);X.pop();}
    X.t(0,-0.31,0).rx(a[2]);
    X.push().t(0,-0.14,0);Bt.part(X.m,0.13,0.3,0.13,L.arm||L.body,0);X.pop();
    X.push().t(0,-0.31,0);Bt.part(X.m,0.14,0.1,0.15,L.hand||L.body,0);
    if(L.gloves)Bt.part(X.m,0.15,0.03,0.16,L.trim,1.4);
    if(sx>0&&L.gun){X.push().t(0,-0.02,0.25);Bt.part(X.m,0.08,0.11,0.62,[.08,.08,.1],0);X.push().t(0,0.03,0.3);Bt.part(X.m,0.03,0.03,0.04,L.trim,3);X.pop();X.pop();}
    if(sx>0&&L.orb&&o.charge){X.push().t(0,-0.1,0.1);Bt.part(X.m,0.18,0.18,0.18,L.eye,3);X.pop();}
    X.pop();
    X.pop();
  }
  X.pop();
  // legs
  for(const sx of [-1,1]){
    const l=sx<0?p.lL:p.lR;
    X.push().t(sx*0.12,0,0).rx(l[0]);
    X.push().t(0,-0.23,0);Bt.part(X.m,0.18,0.46,0.18,L.leg||L.body,0);X.pop();
    X.t(0,-0.46,0).rx(l[1]);
    X.push().t(0,-0.22,0);Bt.part(X.m,0.16,0.44,0.16,L.leg||L.body,0);
    if(L.trimLegs)Bt.part(X.m,0.17,0.04,0.17,L.trim,1.2);
    X.pop();
    X.push().t(0,-0.46,0.06);Bt.part(X.m,0.17,0.09,0.3,L.boot||[.04,.04,.05],0);X.pop();
    X.pop();
  }
  X.pop();
}

/* ------------------------------------------------------------- poses */
function poseRun(p,ph,amt,lean){
  const s=Math.sin(ph),c=Math.cos(ph);
  p.lL[0]=s*0.9*amt;p.lR[0]=-s*0.9*amt;
  p.lL[1]=Math.max(0,-Math.sin(ph+1.1))*1.3*amt+0.05;p.lR[1]=Math.max(0,Math.sin(ph+1.1))*1.3*amt+0.05;
  p.aL[0]=-s*0.85*amt;p.aR[0]=s*0.85*amt;p.aL[2]=-0.5*amt-0.1;p.aR[2]=-0.5*amt-0.1;
  p.aL[1]=p.aR[1]=0.15;
  p.lean=lean*amt;p.hip=-Math.abs(c)*0.06*amt;
}
// A strike, shaped as wind-up then snap: k runs 0..1 over the move.
function poseStrike(p,move,k){
  const w=k<0.35?k/0.35:1, out=k<0.35?0:k<0.6?(k-0.35)/0.25:1-(k-0.6)/0.4*0.7;
  p.lean=0.25;p.hip=-0.1;p.lL[0]=-0.4;p.lL[1]=0.5;p.lR[0]=0.35;p.lR[1]=0.3;
  p.aL=[-1.2,0.3,-1.6];p.aR=[-1.2,0.3,-1.6];p.twist=0;
  if(move===0){p.aR=[lerp(-0.4,-1.65,out),0.1,lerp(-2,-0.05,out)];p.twist=lerp(0.3,-0.4,out);}
  else if(move===1){p.aL=[lerp(-0.4,-1.65,out),0.1,lerp(-2,-0.05,out)];p.twist=lerp(-0.3,0.45,out);}
  else if(move===2){p.aR=[-1.4,lerp(0.3,1.4,out),-1.4];p.twist=lerp(0.6,-0.9,out);}
  else if(move===3){p.lR=[lerp(0.4,-1.7,out),lerp(1.4,0.1,out)];p.lean=-0.25;p.aL=[-0.6,0.9,-0.8];p.aR=[-0.3,0.9,-0.8];p.twist=-0.3;}
  else if(move===4){p.hip=lerp(-0.3,0.05,out);p.aR=[lerp(-0.3,-2.9,out),0.1,lerp(-1.8,-0.3,out)];p.lean=lerp(0.4,-0.2,out);}
  else if(move===5){p.spin=out*TAU;p.lL=[0,0.1];p.lR=[-1.5,0.1];p.lean=-0.3;}
  p.wings=0;
  return w;
}

/* ------------------------------------------------------------- the player */
const P={x:0,y:0,z:0,vx:0,vy:0,vz:0,hw:0.34,h:1.8,yaw:0,onGround:false,ground:null,jumps:0,coyote:0,
  state:'move',st:0,gliding:false,hp:100,inv:0,move:0,queue:false,target:null,hitDone:false,lunge:0,
  wall:null,wallT:0,wallUsed:false,airT:0,grap:null,disc:null,cdDisc:0,cdEmp:0,cdSmoke:0,cdDash:0,
  pose:POSE0(),ph:0,checkpoint:null,safeT:0,deaths:0,downT:0,trail:[],slow:0,lastHitT:0};
const CAM={yaw:0,pitch:0.28,dist:6.2,pos:[0,0,0],target:[0,0,0],shake:0,fov:1.08,cur:6.2};
function camFwd(){return[Math.sin(CAM.yaw),Math.cos(CAM.yaw)];}
function inputDir(){
  const [fx,fz]=camFwd(), rx=-fz, rz=fx;      // right = (-cos, sin) for this yaw convention
  let x=fx*IN.mz+rx*IN.mx, z=fz*IN.mz+rz*IN.mx;
  const m=Math.hypot(x,z);
  return m>0.05?[x/Math.max(1,m),z/Math.max(1,m),Math.min(1,m)]:[0,0,0];
}
function resetPlayer(pos,face){
  Object.assign(P,{x:pos.x,y:pos.y,z:pos.z,vx:0,vy:0,vz:0,state:'move',st:0,gliding:false,jumps:0,inv:1,grap:null,disc:null,target:null,wall:null});
  P.yaw=face||0;CAM.yaw=P.yaw;P.checkpoint={x:pos.x,y:pos.y,z:pos.z,face:P.yaw};
}
function playerDamage(d,from){
  if(P.inv>0||P.state==='down'||G.god)return false;
  d*=twist('glass')?2:1;
  P.hp-=d;G.tookDamage=true;G.hurt=Math.min(1,G.hurt+0.35+d/40);G.glitch=Math.min(1,G.glitch+0.2);CAM.shake=Math.max(CAM.shake,0.25+d/40);
  breakCombo();
  AUDIO.play('pain',clamp(d/22,0.35,1));
  if(P.hp<=0){P.hp=0;P.state='down';P.st=0;AUDIO.play('dead');return true;}
  P.state='hurt';P.st=0;P.gliding=false;
  if(from){const dx=P.x-from.x,dz=P.z-from.z,l=Math.hypot(dx,dz)||1;P.vx=dx/l*6;P.vz=dz/l*6;}
  P.inv=0.45;
  return true;
}
function playerUpdate(dt){
  const M=NF_MOVE;
  P.inv-=dt;P.cdDisc-=dt;P.cdEmp-=dt;P.cdSmoke-=dt;P.cdDash-=dt;P.st+=dt;
  const [ix,iz,im]=inputDir();
  const tgtPose=POSE0();
  if(P.state==='down'){
    P.vx*=0.9;P.vz*=0.9;P.vy-=M.gravity*dt;
    tgtPose.roll=-1.45;tgtPose.hip=-0.6;
    if(P.st>2.2)respawn(true);
  }else if(P.state==='grapple'){
    const a=P.grap, dx=a.x-P.x, dy=a.y+0.2-P.y, dz=a.z-P.z, d=Math.hypot(dx,dy,dz);
    const sp=Math.min(34,10+P.st*60);
    if(d<1.2||P.st>2.5){
      // pop up over the edge and land on top
      const t=WORLD.boxes[a.box]||null;
      if(t){const cx=clamp(a.x,t.x0+0.6,t.x1-0.6),cz=clamp(a.z,t.z0+0.6,t.z1-0.6);P.x=lerp(a.x,cx,0.6);P.z=lerp(a.z,cz,0.6);P.y=t.y1+0.05;}
      P.vx=Math.sin(P.yaw)*3;P.vz=Math.cos(P.yaw)*3;P.vy=4;P.state='move';P.grap=null;P.jumps=1;AUDIO.play('land',0.6);
    }else{P.vx=dx/d*sp;P.vy=dy/d*sp;P.vz=dz/d*sp;P.yaw=Math.atan2(dx,dz);}
    tgtPose.aR=[-2.9,0.1,0];tgtPose.aL=[-0.4,0.6,-0.6];tgtPose.lL=[0.5,0.9];tgtPose.lR=[-0.3,0.6];tgtPose.lean=0.5;
  }else if(P.state==='dash'){
    if(P.st>0.2){P.state='move';P.vx*=0.4;P.vz*=0.4;}
    tgtPose.lean=0.7;tgtPose.aL=[0.8,0.3,0];tgtPose.aR=[0.8,0.3,0];tgtPose.lL=[-0.6,0.8];tgtPose.lR=[0.4,0.3];
    P.trail.push({x:P.x,y:P.y,z:P.z,yaw:P.yaw,t:0.25});
  }else if(P.state==='strike'||P.state==='counter'||P.state==='takedown'){
    // a counter cuts in at any time; dash, grapple and jump once the blow has landed
    if(IN.counterP&&P.state==='strike'){tryCounter();}
    else if((IN.dashP||IN.grappleP||IN.jumpP)&&(P.hitDone||P.state==='counter')&&P.state!=='takedown'){P.state='move';P.target=null;}
    if(P.state!=='move')strikeUpdate(dt,tgtPose);
  }
  if(P.state==='hurt'){
    P.vx*=Math.pow(0.02,dt);P.vz*=Math.pow(0.02,dt);
    tgtPose.lean=-0.5;tgtPose.aL=[-0.5,0.8,-1];tgtPose.aR=[-0.5,0.8,-1];
    if(P.st>0.32)P.state='move';
  }else if(P.state==='move'){
    // ---- free movement ----
    if(P.onGround){P.coyote=0.12;P.jumps=0;P.wallUsed=false;P.gliding=false;P.airT=0;}
    else{P.coyote-=dt;P.airT+=dt;}
    const want=P.gliding?0:M.run*im;
    const ctrl=P.onGround?14:3.5;
    if(!P.gliding){
      P.vx+=(ix*want-P.vx)*Math.min(1,ctrl*dt);
      P.vz+=(iz*want-P.vz)*Math.min(1,ctrl*dt);
      if(im>0.1){const ty=Math.atan2(ix,iz);P.yaw+=angDiff(ty,P.yaw)*Math.min(1,12*dt);}
    }
    if(IN.jumpP){
      if(P.wall&&P.wallT>0){                              // kick off the wall
        P.vx=P.wall.nx*7.5+Math.sin(P.yaw)*3;P.vz=P.wall.nz*7.5+Math.cos(P.yaw)*3;P.vy=9;P.wall=null;P.wallT=0;P.jumps=1;
        P.yaw=Math.atan2(P.vx,P.vz);AUDIO.play('jump',0.8);
      }else if(P.onGround||P.coyote>0){P.vy=M.jump;P.jumps=1;P.coyote=0;P.onGround=false;AUDIO.play('jump',0.7);}
      else if(P.jumps<2){P.vy=M.jump2;P.jumps=2;P.gliding=false;AUDIO.play('jump',0.9);
        for(let i=0;i<8;i++)spark(P.x,P.y,P.z,(rng()-.5)*4,-1-rng()*2,(rng()-.5)*4,STY().trim,0.3);}
    }
    // glide: hold jump while falling
    if(!P.onGround&&IN.jump&&P.vy<0&&(P.jumps>=1||P.airT>0.3)&&!P.wall){
      if(!P.gliding)AUDIO.play('glide');
      P.gliding=true;
    }
    if(P.gliding&&(!IN.jump||P.onGround))P.gliding=false;
    if(P.gliding){
      if(im>0.1){const ty=Math.atan2(ix,iz);P.yaw+=angDiff(ty,P.yaw)*Math.min(1,2.6*dt);}
      const sp=Math.hypot(P.vx,P.vz), tsp=lerp(sp,M.glideSpeed,Math.min(1,1.5*dt));
      P.vx=Math.sin(P.yaw)*tsp;P.vz=Math.cos(P.yaw)*tsp;
      P.vy=Math.max(P.vy-M.gravity*0.25*dt,-M.glideFall);
      for(const v of WORLD.vents)if(Math.hypot(P.x-v.x,P.z-v.z)<v.r+1.5&&P.y<v.y+v.lift+4)P.vy=Math.min(P.vy+46*dt,10);
    }else if(P.wall&&P.wallT>0){
      P.wallT-=dt;P.vy=Math.max(P.vy-6*dt,-1);
      if(P.wallT<=0||P.onGround)P.wall=null;
    }else P.vy-=M.gravity*dt;
    if(P.onGround){                                        // vents launch you even from a standstill
      for(const v of WORLD.vents)if(Math.hypot(P.x-v.x,P.z-v.z)<v.r&&Math.abs(P.y-v.y)<0.6&&IN.jumpP){P.vy=15;AUDIO.play('vent');}
    }
    // actions
    if(IN.dashP&&P.cdDash<=0){
      const [dx,dz]=im>0.1?[ix,iz]:[Math.sin(P.yaw),Math.cos(P.yaw)];
      P.state='dash';P.st=0;P.vx=dx*M.dash;P.vz=dz*M.dash;P.vy=Math.max(P.vy,0);P.yaw=Math.atan2(dx,dz);P.inv=0.3;P.cdDash=0.45;P.gliding=false;AUDIO.play('whoosh');
    }
    if(IN.grappleP)tryGrapple();
    if(IN.strikeP)beginStrike();
    if(IN.counterP)tryCounter();
    if(IN.discP)throwDisc();
    if(IN.empP)useEMP();
    if(IN.smokeP)useSmoke();
    // pose
    const sp=Math.hypot(P.vx,P.vz);
    if(P.gliding){tgtPose.lean=1.25;tgtPose.aL=[0,1.45,0];tgtPose.aR=[0,1.45,0];tgtPose.lL=[0.15,0.1];tgtPose.lR=[0.15,0.1];tgtPose.wings=1;tgtPose.head=-0.9;}
    else if(P.wall){P.ph+=dt*14;poseRun(tgtPose,P.ph,1,0.2);tgtPose.roll=0;}
    else if(!P.onGround){tgtPose.lL=[-0.7,1.1];tgtPose.lR=[-0.2,0.6];tgtPose.aL=[-1.2,0.5,-0.8];tgtPose.aR=[-0.6,0.6,-0.6];tgtPose.lean=0.15;
      if(P.jumps===2&&P.vy>0)tgtPose.spin=(P.vy/M.jump2)*-TAU*0.0;}
    else if(sp>0.6){P.ph+=dt*sp*1.45;poseRun(tgtPose,P.ph,Math.min(1,sp/M.run),0.22);}
    else{tgtPose.aL[1]=0.18;tgtPose.aR[1]=0.18;tgtPose.hip=Math.sin(G.clock*2)*0.012;tgtPose.aL[2]=-0.15;tgtPose.aR[2]=-0.15;}
  }
  // ---- physics ----
  const wasGround=P.onGround;
  P.onGround=false;P.ground=null;
  // the grapple line was clear when fired, so the flight itself ignores corners
  if(P.state==='grapple'){P.x+=P.vx*dt;P.y+=P.vy*dt;P.z+=P.vz*dt;blendPose(P.pose,tgtPose,Math.min(1,16*dt));return;}
  const hx=moveAxis(P,'x',P.vx*dt), hz=moveAxis(P,'z',P.vz*dt);
  const hy=moveAxis(P,'y',P.vy*dt);
  if(hy){if(P.vy<0){P.onGround=true;if(!wasGround&&P.vy<-12)CAM.shake=Math.max(CAM.shake,0.15);if(!wasGround)AUDIO.play('land',clamp(-P.vy/20,0.15,0.7));}P.vy=0;}
  else{const g=groundAt(P.x,P.z,P.y);if(g&&P.y-g.y1<0.08&&P.vy<=0){P.onGround=true;P.y=g.y1;P.ground=g;P.vy=0;}}
  // wall-run: moving fast in the air along a wall
  if(!P.onGround&&!P.gliding&&P.state==='move'&&!P.wallUsed&&(hx||hz)&&Math.hypot(P.vx,P.vz)>4.5&&P.vy<6&&hx!==P.ground&&hz!==P.ground){
    const b=hx||hz, nx=hx?(P.x<(b.x0+b.x1)/2?-1:1):0, nz=hz?(P.z<(b.z0+b.z1)/2?-1:1):0;
    if(b.y1-P.y>2.2){P.wall={nx,nz};P.wallT=0.95;P.wallUsed=true;P.vy=Math.max(P.vy,2.5);AUDIO.play('whoosh',0.5);}
  }
  // checkpoints and the fall into the chasm
  if(P.onGround&&P.ground&&P.ground.k==='deck'&&P.state==='move'){
    P.safeT+=dt;
    if(P.safeT>0.6){P.checkpoint={x:P.x,y:P.y,z:P.z,face:P.yaw};P.safeT=0;}
  }
  if(P.y<WORLD.fogY-35&&P.state!=='down'){
    G.tookDamage=true;award(-250,'FELL');respawn(false);
    if(!G.god){P.hp=Math.max(1,P.hp-15);}
  }
  blendPose(P.pose,tgtPose,P.state==='strike'||P.state==='counter'?1:Math.min(1,16*dt));
  for(const t of P.trail)t.t-=dt;P.trail=P.trail.filter(t=>t.t>0);
}
function respawn(dead){
  const c=P.checkpoint;
  P.x=c.x;P.y=c.y+0.1;P.z=c.z;P.vx=P.vy=P.vz=0;P.state='move';P.inv=1.5;P.gliding=false;P.grap=null;
  if(dead){P.hp=100;P.deaths++;award(-1000,'FLATLINED');G.glitch=1;}
  CAM.yaw=c.face;
}
function STY(){return STYLES[SV.finish]||STYLES.stock;}

/* ---- grapple ---- */
function grappleTarget(){
  const [fx,fz]=camFwd();let best=null,bs=1e9;
  for(const a of WORLD.anchors){
    const dx=a.x-P.x,dy=a.y-(P.y+1.4),dz=a.z-P.z,d=Math.hypot(dx,dy,dz);
    if(d>NF_MOVE.grappleRange||d<2.5||a.y<P.y-1)continue;
    const dot=(dx*fx+dz*fz)/Math.max(0.01,Math.hypot(dx,dz));
    if(dot<0.35)continue;
    const sc=d*(1.6-dot);
    if(sc<bs&&raycast(P.x,P.y+1.4,P.z,dx/d,dy/d,dz/d,d,true)>=d-0.8){bs=sc;best=a;}
  }
  return best;
}
function tryGrapple(){
  const a=grappleTarget();
  if(!a){AUDIO.play('nope',0.4);return;}
  P.state='grapple';P.st=0;P.grap=a;P.gliding=false;AUDIO.play('grapple');
}

/* ------------------------------------------------------------- combat
   One button strikes, one counters. A strike picks the enemy nearest the
   direction you are pushing and closes the gap for you, so a fight flows
   from one target to the next. Hits within a short window build a combo.   */
function pickTarget(maxD){
  const [ix,iz,im]=inputDir();
  const [fx,fz]=im>0.1?[ix,iz]:camFwd();
  let best=null,bs=1e9;
  for(const e of G.ents){
    if(e.state==='ko'||e.dead)continue;
    const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz),dy=e.y-P.y;
    if(d>maxD)continue;
    if(e.fly&&dy>2.6&&P.onGround)continue;            // drones: jump to reach them
    if(Math.abs(dy)>4)continue;
    const ang=Math.abs(angDiff(Math.atan2(dx,dz),Math.atan2(fx,fz)));
    const sc=d+ang*3.2+(e.state==='down'?2:0);
    if(sc<bs){bs=sc;best=e;}
  }
  return best;
}
function beginStrike(){
  if(P.state==='strike'&&P.st<0.18){P.queue=true;return;}
  const e=pickTarget(8.5);
  P.target=e;P.hitDone=false;P.st=0;P.lunge=0;
  if(e&&isTakedown(e)){P.state='takedown';P.move=4;return;}
  P.state='strike';
  P.move=e&&e.state==='down'?4:(G.chain%6===5?5:G.chain%5);
  G.chain++;
  AUDIO.play('whoosh',0.5);
}
function isTakedown(e){
  if(e.type==='warden'||e.type==='mech'||e.type==='drone')return false;
  if(!(e.state==='idle'||e.state==='blind'))return false;
  const behind=Math.abs(angDiff(Math.atan2(P.x-e.x,P.z-e.z),e.yaw))>1.9;
  return behind||P.y>e.y+1.2||e.state==='blind';
}
function strikeUpdate(dt,tp){
  const e=P.target, dur=P.state==='takedown'?0.6:P.state==='counter'?0.4:(P.move===5?0.42:0.3);
  // close the gap first
  if(e&&!e.dead){
    const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);
    P.yaw=Math.atan2(dx,dz);
    const reach=e.type==='mech'?2.1:e.type==='warden'?3:1.25;
    if(d>reach&&P.lunge<0.32){
      P.lunge+=dt;const sp=Math.min(26,d/0.12);
      P.vx=dx/d*sp;P.vz=dz/d*sp;
      if(e.fly&&P.y<e.y-1.5)P.vy=Math.max(P.vy,7);
      P.st=0;P.trail.push({x:P.x,y:P.y,z:P.z,yaw:P.yaw,t:0.18});
      tp.lean=0.6;tp.aR=[-1,0.3,-1.2];tp.aL=[-1,0.3,-1.2];
      return;
    }
    P.vx*=0.2;P.vz*=0.2;
  }else{P.vx*=Math.pow(0.01,dt);P.vz*=Math.pow(0.01,dt);}
  if(!P.onGround&&!(e&&e.fly))P.vy-=NF_MOVE.gravity*dt;else if(e&&e.fly)P.vy=Math.max(P.vy-NF_MOVE.gravity*dt*0.3,-2);
  const k=P.st/dur;
  if(P.state==='takedown'){tp.hip=-0.45;tp.lean=0.7;tp.aR=[-2.2,0.2,-0.6];tp.aL=[-1.2,0.6,-1.2];tp.lL=[-0.9,1.6];tp.lR=[0.3,1.8];}
  else if(P.state==='counter'){tp.twist=lerp(0.8,-0.6,ease(k*2));tp.aR=[-1.6,lerp(1.2,0.1,ease(k*2)),-0.4];tp.aL=[-1.3,0.5,-1.3];tp.lean=0.3;tp.lL=[-0.5,0.4];tp.lR=[0.4,0.3];}
  else poseStrike(tp,P.move,k);
  Object.assign(P.pose,tp);
  if(!P.hitDone&&k>=0.42){
    P.hitDone=true;
    if(e&&!e.dead){
      const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);
      if(d<(e.type==='mech'?3:e.type==='warden'?4:2.3)&&Math.abs(e.y-P.y)<3.2){
        if(P.state==='takedown')takedown(e);
        else if(e.state==='down'){award(250,'GROUND FINISH');hitEnemy(e,99,'strike');}
        else hitEnemy(e,P.move===4||P.move===5?2:1,'strike');
      }else AUDIO.play('whoosh',0.3);
    }
  }
  if(k>=1){
    if(P.queue){P.queue=false;beginStrike();return;}
    P.state='move';P.target=null;
  }
}
function tryCounter(){
  // the nearest enemy flashing a red warning, or a shot about to land
  let best=null,bd=4.6;
  for(const e of G.ents)if(e.state==='windup'&&e.counterable&&!e.dead){const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<bd){bd=d;best=e;}}
  let shot=null;
  for(const s of G.shots)if(!s.mine&&Math.hypot(s.x-P.x,s.y-P.y-1.1,s.z-P.z)<3.2){shot=s;break;}
  if(best){
    P.state='counter';P.st=0;P.target=best;P.hitDone=true;P.inv=0.5;
    best.state='stagger';best.st=0;best.token=false;G.tokens=Math.max(0,G.tokens-1);
    hitEnemy(best,2,'counter');G.slow=0.18;
    AUDIO.play('counter');
    // any other attackers in the window get countered too
    for(const e of G.ents)if(e!==best&&e.state==='windup'&&e.counterable&&!e.dead&&Math.hypot(e.x-P.x,e.z-P.z)<4.6){e.state='stagger';e.st=0;hitEnemy(e,1,'counter');}
  }else if(shot){
    // deflect it back the way it came
    shot.mine=true;shot.vx*=-1.4;shot.vy*=-1;shot.vz*=-1.4;shot.life=2;
    P.state='counter';P.st=0;P.target=null;P.hitDone=true;P.inv=0.4;
    AUDIO.play('counter');award(150,'DEFLECT');addCombo();
  }else{AUDIO.play('whoosh',0.3);P.state='counter';P.st=0.2;P.target=null;P.hitDone=true;}
}
function hitEnemy(e,dmg,how){
  if(e.dead)return;
  const T=ETYPES[e.type];
  if(e.type==='mech'&&e.state!=='stun')dmg*=0.5;
  if(e.type==='warden'&&!(e.grounded||e.state==='stun')&&how!=='disc'){AUDIO.play('hitmetal',0.6);spark(e.x,e.y+e.cy,e.z,0,2,0,[1,1,1],0.3,6);return;}
  if(twist('glass'))dmg*=2;
  e.hp-=dmg;e.aware=true;if(e.state==='idle')alertGroup(e);
  addCombo();
  G.hitFlash.push({x:e.x,y:e.y+1.2,z:e.z,t:0.12});
  const col=T.spark;
  for(let i=0;i<7;i++)spark(e.x,e.y+(e.cy||1.2),e.z,(rng()-.5)*6,rng()*4,(rng()-.5)*6,col,0.35);
  AUDIO.play(how==='disc'?'discHit':dmg>=2?'heavy':'punch',0.8);
  CAM.shake=Math.max(CAM.shake,dmg>=2?0.18:0.08);
  G.hitstop=Math.max(G.hitstop,dmg>=2?0.07:0.035);
  if(e.hp<=0){knockOut(e,how);return;}
  if(e.type==='warden'||(e.type==='mech'&&e.state!=='stun'))return;
  // knocked back; a heavy blow puts them on the floor
  const dx=e.x-P.x,dz=e.z-P.z,l=Math.hypot(dx,dz)||1;
  e.kx=dx/l*(dmg>=2?7:3.5);e.kz=dz/l*(dmg>=2?7:3.5);
  if(e.state==='windup'&&how==='strike'&&e.counterable){/* interrupted */}
  if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}
  e.state=(dmg>=2&&!e.fly)?'down':'stagger';e.st=0;
}
function knockOut(e,how){
  const T=ETYPES[e.type];
  e.state='ko';e.dead=true;e.st=0;
  if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}
  G.kos++;
  const mult=comboMult();
  award(T.score*mult*(twist('scav')?2:1),null);
  if(how==='takedown'){}
  else if(!P.onGround&&how==='strike')award(300,'AIR KO');
  else if(how==='disc')award(200,'DISC KO');
  else if(how==='counter')award(150,'COUNTER KO');
  else if(how==='emp')award(150,'SHORT CIRCUIT');
  else if(how==='friendly')award(300,'FRIENDLY FIRE');
  if(P.hp<25&&how!=='friendly')award(300,'CLOSE CALL');
  AUDIO.play(e.type==='warden'?'bossdie':T.heavy?'bigdeath':'ko',0.9);
  G.hitstop=Math.max(G.hitstop,e.type==='warden'?0.5:T.heavy?0.14:0.06);
  CAM.shake=Math.max(CAM.shake,e.type==='warden'?1:T.heavy?0.5:0.15);
  for(let i=0;i<(T.heavy?30:14);i++)spark(e.x,e.y+1,e.z,(rng()-.5)*8,rng()*6,(rng()-.5)*8,T.spark,0.6);
  if(e.fly){e.vy=0;}
  if(e.type==='warden')bossDown();
  // a stim sometimes, on the easier skills
  if(G.mode==='campaign'&&rng()<SKILLS[G.skill].drop)WORLD.items.push({t:'stim',x:e.x,y:groundY(e)+0.8,z:e.z,taken:false,bob:0,dropped:true});
  if(G.mode!=='campaign'&&rng()<0.12)WORLD.items.push({t:'stim',x:e.x,y:groundY(e)+0.8,z:e.z,taken:false,bob:0,dropped:true});
}
function groundY(e){const g=groundAt(e.x,e.z,e.y+0.5);return g?g.y1:e.y;}
function takedown(e){
  award(500,'SILENT TAKEDOWN');
  hitEnemy(e,99,'takedown');
  // anyone who saw it comes running
  for(const o of G.ents)if(o!==e&&!o.dead&&o.state==='idle'&&Math.hypot(o.x-e.x,o.z-e.z)<10&&losClear(o,e)&&Math.abs(angDiff(Math.atan2(e.x-o.x,e.z-o.z),o.yaw))<1.2)alertGroup(o);
}
function addCombo(){
  G.combo=G.comboT>0?G.combo+1:1;G.comboT=1.8;G.maxCombo=Math.max(G.maxCombo,G.combo);
  if(G.combo%5===0)AUDIO.play('combo',comboMult());
}
function comboMult(){return Math.min(8,1+Math.floor(G.combo/5));}
function breakCombo(){if(G.combo>=5)pop('COMBO BROKEN',0);G.combo=0;G.comboT=0;}

/* ---- gadgets ---- */
function throwDisc(){
  if(P.disc||P.cdDisc>0)return;
  let best=null,bs=1e9;const [fx,fz]=camFwd();
  for(const e of G.ents){if(e.dead)continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d>28)continue;
    const dot=(dx*fx+dz*fz)/(d||1);if(dot<0.55)continue;const sc=d*(1.6-dot)-(e.fly?6:0);if(sc<bs&&losClear(P,e)){bs=sc;best=e;}}
  const [dx,dz]=best?[best.x-P.x,best.z-P.z]:[fx,fz],l=Math.hypot(dx,dz)||1;
  P.disc={x:P.x,y:P.y+1.3,z:P.z,vx:dx/l*30,vy:0,vz:dz/l*30,target:best,back:false,t:0};
  P.yaw=Math.atan2(dx,dz);P.cdDisc=0.5;AUDIO.play('disc');
}
function discUpdate(dt){
  const D=P.disc;if(!D)return;D.t+=dt;
  if(!D.back){
    if(D.target&&!D.target.dead){const e=D.target,tx=e.x-D.x,ty=e.y+(e.cy||1.2)-D.y,tz=e.z-D.z,d=Math.hypot(tx,ty,tz);
      D.vx=tx/d*32;D.vy=ty/d*32;D.vz=tz/d*32;
      if(d<0.7+32*dt){hitEnemy(e,e.fly?2:1,'disc');if(!e.dead&&!e.fly&&e.type!=='mech'&&e.type!=='warden'){e.state='stagger';e.st=0;}D.back=true;}}
    if(D.t>0.9)D.back=true;
    const d=Math.hypot(D.vx,D.vy,D.vz)*dt;
    if(raycast(D.x,D.y,D.z,D.vx/32,D.vy/32,D.vz/32,d+0.2,true)<d+0.1)D.back=true;
  }else{
    const tx=P.x-D.x,ty=P.y+1.3-D.y,tz=P.z-D.z,d=Math.hypot(tx,ty,tz);
    D.vx=tx/d*36;D.vy=ty/d*36;D.vz=tz/d*36;
    if(d<1+36*dt){P.disc=null;return;}
  }
  D.x+=D.vx*dt;D.y+=D.vy*dt;D.z+=D.vz*dt;
}
function useEMP(){
  if(P.cdEmp>0){AUDIO.play('nope',0.3);return;}
  P.cdEmp=9;AUDIO.play('emp');G.rings.push({x:P.x,y:P.y+1,z:P.z,t:0,max:7,c:[.3,.9,1]});
  for(const e of G.ents){if(e.dead)continue;const d=Math.hypot(e.x-P.x,e.y-P.y,e.z-P.z);if(d>7)continue;
    if(e.type==='drone'){hitEnemy(e,99,'emp');continue;}
    e.state='stun';e.st=0;e.stunFor=e.type==='mech'||e.type==='warden'?3.5:1.6;e.aware=true;
    if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}
    if(e.type==='warden'){e.grounded=true;}
  }
  addCombo();
}
function useSmoke(){
  if(P.cdSmoke>0){AUDIO.play('nope',0.3);return;}
  P.cdSmoke=12;AUDIO.play('smoke');
  G.smoke.push({x:P.x,y:P.y,z:P.z,t:0});
  for(const e of G.ents){if(e.dead||e.type==='warden'||e.type==='mech')continue;
    if(Math.hypot(e.x-P.x,e.z-P.z)<6.5){e.state='blind';e.st=0;e.aware=false;if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}}}
}

/* ---------------------------------------------------------------- enemies */
const ETYPES={
  thug:  {hp:3, speed:4.4,score:100,spark:[1,.4,.7], counter:true, melee:true},
  guard: {hp:4, speed:3.6,score:150,spark:[1,.85,.4],counter:true, ranged:'bolt',range:12},
  hacker:{hp:3, speed:3.8,score:250,spark:[1,.3,.9], counter:true, ranged:'orb',range:11,blink:true},
  drone: {hp:2, speed:5,  score:100,spark:[.4,.9,1], counter:false,ranged:'zap',range:9,fly:true},
  mech:  {hp:14,speed:2.4,score:800,spark:[1,.7,.3], counter:false,heavy:true},
  warden:{hp:40,speed:3,  score:5000,spark:[.8,.5,1],counter:false,heavy:true,boss:true}
};
const GANG=[[1,.25,.7],[.2,.95,1],[.6,1,.3],[1,.6,.2]];
function makeEnemy(t,x,y,z,island,alert){
  const T=ETYPES[t];
  const hpK=G.mode==='campaign'?(0.8+G.skill*0.1):1+G.wave*0.06;
  const e={type:t,x,y,z,yaw:rng()*TAU,hp:Math.ceil(T.hp*hpK),hpMax:0,state:alert?'chase':'idle',st:0,cool:1+rng()*2,aware:!!alert,
    island,home:{x,z},hw:t==='mech'?0.75:0.35,h:t==='mech'?3.2:1.8,fly:!!T.fly,cy:t==='mech'?2:t==='warden'?0:1.2,
    kx:0,kz:0,vy:0,token:false,counterable:false,pose:POSE0(),ph:rng()*9,strafe:rng()<.5?1:-1,seed:(rng()*1e6)|0,
    look:null,phase:0,summonT:10,slamT:6,grounded:false,stunFor:0,charge:false,dead:false};
  e.hpMax=e.hp;
  if(t==='drone'){e.y=y+2.8;e.base=y;}
  if(t==='warden'){e.base=y;e.y=y+5;e.cy=0;}
  const g=GANG[e.seed%4];
  e.look=t==='thug'?{body:[.12,.1,.16],arm:[.1,.09,.14],leg:[.08,.08,.1],head:[.55,.42,.36],hand:[.5,.38,.32],trim:g,eye:g,crest:e.seed%3?g:null,belt:1.5,trimLegs:true}
    :t==='guard'?{body:[.2,.22,.28],plate:[.35,.38,.46],head:[.25,.27,.33],arm:[.2,.22,.28],leg:[.15,.16,.2],trim:[1,.25,.3],eye:[1,.2,.25],gun:true,pack:true,gloves:false}
    :t==='hacker'?{body:[.15,.06,.18],arm:[.13,.05,.16],leg:[.08,.04,.1],head:[.1,.05,.12],trim:[1,.25,.75],eye:[1,.3,.8],hood:true,coat:true,orb:true}
    :null;
  G.ents.push(e);
  if(G.mode==='campaign')G.enemyTotal++;
  if(t==='warden')G.boss=e;
  return e;
}
function alertGroup(e){
  for(const o of G.ents)if(!o.dead&&(o.island===e.island||Math.hypot(o.x-e.x,o.z-e.z)<14)&&(o.state==='idle')){o.state='chase';o.aware=true;o.st=0;
    if(o.type==='warden'){AUDIO.music.start({boss:true,bpm:140,root:40,seed:666,intensity:2});msg('THE WARDEN');}}
  AUDIO.play('alert',0.5);
}
function enemyUpdate(e,dt){
  const T=ETYPES[e.type];
  e.st+=dt;e.ph+=dt;
  if(e.dead){
    if(e.fly&&e.y>(e.base||0)){e.vy-=20*dt;e.y=Math.max(e.base||0,e.y+e.vy*dt);}
    return;
  }
  const dx=P.x-e.x,dz=P.z-e.z,dist=Math.hypot(dx,dz),toP=Math.atan2(dx,dz);
  // knockback slides them, but never off the edge
  if(e.kx||e.kz){mover(e,e.kx*dt,e.kz*dt);e.kx*=Math.pow(0.004,dt);e.kz*=Math.pow(0.004,dt);if(Math.abs(e.kx)+Math.abs(e.kz)<0.1)e.kx=e.kz=0;}
  if(e.type==='warden'){wardenUpdate(e,dt,dist,toP);return;}
  if(e.fly){e.y=lerp(e.y,(e.base||0)+2.8+Math.sin(e.ph*2)*0.3,Math.min(1,3*dt));}
  switch(e.state){
    case 'idle':{
      // a slow patrol around where they stand, until they see or hear you
      const a=e.ph*0.3+e.seed;e.yaw+=angDiff(a,e.yaw)*dt*0.5;
      mover(e,Math.sin(e.yaw)*0.8*dt,Math.cos(e.yaw)*0.8*dt,true);
      if(Math.hypot(e.x-e.home.x,e.z-e.home.z)>4)e.yaw=Math.atan2(e.home.x-e.x,e.home.z-e.z);
      if(dist<17&&Math.abs(P.y-e.y)<6&&(Math.abs(angDiff(toP,e.yaw))<1.1||dist<4.5)&&losClear(e,P))alertGroup(e);
      if(G.noise>0&&dist<14)alertGroup(e);
      break;
    }
    case 'blind':
      e.yaw+=dt*2;if(e.st>4){e.state='chase';e.aware=true;}break;
    case 'stun':
      if(e.st>e.stunFor){e.state='chase';if(e.type==='mech')e.cool=0.8;}break;
    case 'stagger':
      if(e.st>0.38)e.state='chase';break;
    case 'down':
      if(e.st>2.4){e.state='chase';e.cool=0.6+rng();}break;
    case 'windup':{
      e.yaw+=angDiff(toP,e.yaw)*Math.min(1,8*dt);
      const wind=e.wind||0.55;
      if(e.st>=wind){e.state='attack';e.st=0;e.counterable=false;enemyAttack(e,T,dist,toP);}
      break;
    }
    case 'attack':
      if(T.melee&&e.st<0.15)mover(e,Math.sin(e.yaw)*7*dt,Math.cos(e.yaw)*7*dt);
      if(e.st>0.35){e.state='chase';e.cool=(1.2+rng()*1.4)/SKILLS[G.mode==='campaign'?G.skill:2].spd;if(e.token){e.token=false;G.tokens=Math.max(0,G.tokens-1);}}
      break;
    default:{                                     // chase and circle
      e.cool-=dt;
      e.yaw+=angDiff(toP,e.yaw)*Math.min(1,6*dt);
      const sp=T.speed*(twist('rush')?1.3:1)*(G.mode==='campaign'?SKILLS[G.skill].spd:Math.min(1.35,1+G.wave*0.02));
      let want=T.melee||e.type==='mech'?2.9:T.ranged?(e.fly?5:9):3;
      if(Math.abs(P.y-e.y)>5&&!e.fly){want=0.5;}
      if(dist>want+0.6)mover(e,dx/dist*sp*dt,dz/dist*sp*dt);
      else if(dist<want-1.5&&T.ranged)mover(e,-dx/dist*sp*0.7*dt,-dz/dist*sp*0.7*dt);
      else{const s=e.strafe*sp*0.45;mover(e,-dz/dist*s*dt,dx/dist*s*dt);if(rng()<dt*0.4)e.strafe*=-1;}
      if(e.cool<=0&&Math.abs(P.y-e.y)<(e.fly?6:3)&&P.state!=='down'){
        const close=dist<3.4;
        if(T.melee||(close&&!e.fly&&e.type!=='mech')){
          if(close&&(e.token||G.tokens<(G.skill>=3?3:2))){if(!e.token){e.token=true;G.tokens++;}e.state='windup';e.st=0;e.wind=0.55;e.counterable=true;e.melee=true;AUDIO.play('tell',0.5);}
        }else if(e.type==='mech'){
          if(dist<4.2){e.state='windup';e.st=0;e.wind=0.9;e.counterable=false;e.melee=true;e.stomp=true;AUDIO.play('tell2',0.7);}
          else if(dist<18&&losClear(e,P)){e.state='windup';e.st=0;e.wind=0.8;e.counterable=false;e.melee=false;e.stomp=false;}
        }else if(T.ranged&&dist<T.range+4&&losClear(e,P)){
          e.state='windup';e.st=0;e.wind=e.fly?0.5:0.75;e.counterable=false;e.melee=false;e.charge=true;
        }
      }
      if(T.blink&&e.st>3&&rng()<dt*0.25&&dist<12)blink(e);
    }
  }
  // stay on the ground
  if(!e.fly&&e.state!=='ko'){const g=groundAt(e.x,e.z,e.y+0.6);if(g)e.y=g.y1;}
  // pose
  const tp=POSE0();
  if(e.type==='drone'||e.type==='mech'){blendPose(e.pose,tp,1);return;}
  if(e.state==='down'){tp.roll=-1.5;tp.hip=-0.62;tp.aL=[0.3,1.2,0];tp.aR=[0.2,1.3,0];}
  else if(e.state==='stagger'){tp.lean=-0.5;tp.aL=[-0.6,0.9,-1];tp.aR=[-0.6,0.9,-1];}
  else if(e.state==='stun'){tp.lean=Math.sin(e.st*20)*0.15;tp.head=0.4;tp.aL=[0.1,0.3,0];tp.aR=[0.1,0.3,0];}
  else if(e.state==='blind'){tp.aL=[-2.2,0.4,-1.9];tp.aR=[-2.2,0.4,-1.9];tp.head=0.5;tp.lean=0.2;}
  else if(e.state==='windup'){
    if(e.melee){tp.twist=0.5;tp.aR=[0.6,0.5,-1.6];tp.aL=[-1,0.3,-1.6];tp.lean=-0.15;tp.lL=[-0.3,0.3];}
    else{tp.aR=[-1.5,0.05,0];tp.aL=[-1.4,0.4,-0.4];tp.twist=0.2;}
  }else if(e.state==='attack'&&e.melee){const k=Math.min(1,e.st/0.15);tp.aR=[-1.6*k,0.1,-0.1];tp.twist=-0.5*k;tp.lean=0.3;tp.lL=[-0.5,0.3];}
  else{const moving=e.state==='idle'?0.3:0.8;e.ph+=dt*4;poseRun(tp,e.ph*1.6,moving,0.1);if(ETYPES[e.type].ranged&&e.state!=='idle'){tp.aR=[-1.3,0.1,0];}}
  blendPose(e.pose,tp,Math.min(1,14*dt));
  e.charge=e.state==='windup'&&!e.melee;
}
function mover(e,dx,dz,careful){
  const ox=e.x,oz=e.z;
  e.stepOK=true;
  moveAxis(e,'x',dx);moveAxis(e,'z',dz);
  if(e.fly)return;
  // never walk off an edge
  const g=groundAt(e.x,e.z,e.y+0.6);
  if(!g||e.y-g.y1>1.2){e.x=ox;e.z=oz;if(careful)e.yaw+=Math.PI*0.5;}
}
function blink(e){
  for(let i=0;i<12;i++){
    const a=rng()*TAU,d=3+rng()*4,nx=P.x+Math.sin(a)*d,nz=P.z+Math.cos(a)*d;
    const g=groundAt(nx,nz,e.y+1);if(!g||Math.abs(g.y1-e.y)>1)continue;
    G.warps.push({x:e.x,y:e.y,z:e.z,t:0});
    e.x=nx;e.z=nz;e.y=g.y1;e.st=0;e.state='chase';e.cool=Math.min(e.cool,0.6);
    G.warps.push({x:e.x,y:e.y,z:e.z,t:0});AUDIO.play('blink',0.5);return;
  }
}
function enemyAttack(e,T,dist,toP){
  if(e.melee){
    if(e.stomp){
      G.rings.push({x:e.x,y:e.y+0.2,z:e.z,t:0,max:3.6,c:[1,.6,.2]});AUDIO.play('explode',0.7);CAM.shake=Math.max(CAM.shake,0.35);
      if(dist<3.6&&P.y-e.y<1.5)playerDamage(22*SKILLS[G.mode==='campaign'?G.skill:2].dmg,e);
      e.stomp=false;return;
    }
    if(dist<2&&Math.abs(P.y-e.y)<1.6)playerDamage(8*SKILLS[G.mode==='campaign'?G.skill:2].dmg,e);
    else AUDIO.play('whoosh',0.3);
    return;
  }
  const sx=e.x+Math.sin(e.yaw)*0.6,sy=e.y+(e.fly?0:1.35),sz=e.z+Math.cos(e.yaw)*0.6;
  const aim=(spd,spread)=>{const tx=P.x+P.vx*0.15,ty=P.y+1.1,tz=P.z+P.vz*0.15,dx=tx-sx,dy=ty-sy,dz=tz-sz,d=Math.hypot(dx,dy,dz)||1;
    const a=(rng()-.5)*spread;const c=Math.cos(a),s=Math.sin(a);return[(dx*c-dz*s)/d*spd,dy/d*spd,(dx*s+dz*c)/d*spd];};
  const k=SKILLS[G.mode==='campaign'?G.skill:2].dmg;
  if(e.type==='mech'){for(let i=0;i<3;i++){const v=aim(15,0.35);G.shots.push({x:sx,y:sy+0.6,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:12*k,owner:e,kind:'rocket',life:3,c:[1,.6,.2]});}AUDIO.play('shotgun',0.5);return;}
  if(T.ranged==='bolt'){const v=aim(24,0.05);G.shots.push({x:sx,y:sy,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:10*k,owner:e,kind:'bolt',life:2,c:[1,.3,.35]});AUDIO.play('pistol',0.5);}
  else if(T.ranged==='orb'){const v=aim(11,0.1);G.shots.push({x:sx,y:sy,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:12*k,owner:e,kind:'orb',life:3,home:true,c:[1,.3,.85]});AUDIO.play('arc',0.4);}
  else if(T.ranged==='zap'){const v=aim(20,0.08);G.shots.push({x:sx,y:sy,z:sz,vx:v[0],vy:v[1],vz:v[2],dmg:6*k,owner:e,kind:'zap',life:2,c:[.3,.9,1]});AUDIO.play('zap',0.4);}
}
/* The Warden: hovers out of reach and fires, slams down where it can be hit,
   and gets faster and calls for help as it breaks.                         */
function wardenUpdate(e,dt,dist,toP){
  e.yaw+=angDiff(toP,e.yaw)*Math.min(1,2*dt);
  const ph=e.hp>e.hpMax*0.66?0:e.hp>e.hpMax*0.33?1:2;
  if(ph>e.phase){e.phase=ph;msg(ph===1?'THE WARDEN CALLS FOR HELP':'THE WARDEN IS BREAKING');CAM.shake=0.6;AUDIO.play('alert');G.glitch=0.8;}
  if(e.state==='idle')return;
  const hoverY=e.base+5+Math.sin(e.ph*1.3)*0.6;
  if(e.state==='stun'){e.grounded=true;e.y=lerp(e.y,e.base+0.6,Math.min(1,6*dt));if(e.st>e.stunFor){e.state='chase';e.grounded=false;}return;}
  if(e.state==='slam'){
    if(e.st<0.9){e.y=lerp(e.y,hoverY+2,Math.min(1,4*dt));}
    else if(!e.slammed){e.y=lerp(e.y,e.base+0.6,Math.min(1,18*dt));if(e.y<e.base+0.9){e.slammed=true;e.grounded=true;
      G.rings.push({x:e.x,y:e.base+0.2,z:e.z,t:0,max:6,c:[.8,.4,1]});AUDIO.play('explode');CAM.shake=0.8;
      if(dist<6&&P.y-e.base<1.5)playerDamage(20*SKILLS[G.skill].dmg,e);}}
    else if(e.st>4.2){e.state='chase';e.grounded=false;e.slammed=false;e.st=0;}
    return;
  }
  e.grounded=false;
  e.y=lerp(e.y,hoverY,Math.min(1,3*dt));
  // drift to keep a middle distance
  const want=8;if(dist>want+2)mover(e,Math.sin(toP)*3*dt,Math.cos(toP)*3*dt);else if(dist<want-2)mover(e,-Math.sin(toP)*3*dt,-Math.cos(toP)*3*dt);
  e.cool-=dt;e.slamT-=dt;e.summonT-=dt;
  if(e.slamT<=0){e.state='slam';e.st=0;e.slamT=ph===2?6:8;AUDIO.play('tell2');return;}
  if(e.cool<=0){
    const n=ph===2?9:7,spread=ph===2?1.2:0.9,sp=ph===2?15:12,k=SKILLS[G.skill].dmg;
    for(let i=0;i<n;i++){const a=toP-spread/2+spread*i/(n-1);G.shots.push({x:e.x,y:e.y,z:e.z,vx:Math.sin(a)*sp,vy:(P.y+1-e.y)/Math.max(4,dist)*sp,vz:Math.cos(a)*sp,dmg:10*k,owner:e,kind:'boss',life:3,c:ph?[1,.25,.3]:[.75,.45,1]});}
    if(ph>=1&&rng()<0.35)for(let i=0;i<14;i++){const a=i*TAU/14+e.ph;G.shots.push({x:e.x,y:P.y+1,z:e.z,vx:Math.sin(a)*9,vy:0,vz:Math.cos(a)*9,dmg:8*k,owner:e,kind:'boss',life:4,c:[1,.25,.3]});}
    e.cool=ph===2?1.5:2.3;AUDIO.play('rail',0.5);
  }
  if(ph>=1&&e.summonT<=0){
    e.summonT=ph===2?9:12;
    for(let i=0;i<(ph===2?3:2);i++){const a=rng()*TAU,x=e.x+Math.sin(a)*7,z=e.z+Math.cos(a)*7;const g=groundAt(x,z,e.base+1);if(g)G.warps.push({x,y:g.y1,z,t:0,spawn:i%2?'drone':'thug'});}
    AUDIO.play('warp');
  }
}
function bossDown(){
  G.boss=null;msg('THE WARDEN IS OFFLINE  ·  THE UPLINK IS OPEN');G.slow=1.2;
  for(const o of G.ents)if(!o.dead&&o.type==='drone')knockOut(o,'emp');
  levelMusic();
}

/* ------------------------------------------------- shots, sparks, effects */
function shotsUpdate(dt){
  for(const s of G.shots){
    s.life-=dt;
    if(s.home&&!s.mine){const tx=P.x-s.x,ty=P.y+1.1-s.y,tz=P.z-s.z,d=Math.hypot(tx,ty,tz)||1,sp=Math.hypot(s.vx,s.vy,s.vz);
      s.vx+=(tx/d*sp-s.vx)*dt*1.2;s.vy+=(ty/d*sp-s.vy)*dt*1.2;s.vz+=(tz/d*sp-s.vz)*dt*1.2;}
    const sp=Math.hypot(s.vx,s.vy,s.vz)||1, step=sp*dt;
    if(raycast(s.x,s.y,s.z,s.vx/sp,s.vy/sp,s.vz/sp,step,true)<step){s.life=0;burst(s);continue;}
    s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;
    if(!s.mine){
      if(Math.hypot(s.x-P.x,s.y-(P.y+1),s.z-P.z)<0.75){if(playerDamage(s.dmg,s.owner)||P.inv>0){}s.life=0;burst(s);continue;}
      for(const e of G.ents){if(e.dead||e===s.owner||e.type===s.owner.type||e.type==='warden')continue;
        if(Math.hypot(s.x-e.x,s.y-(e.y+(e.cy||1.1)),s.z-e.z)<0.8){hitEnemy(e,1,'friendly');s.life=0;burst(s);break;}}
    }else{
      for(const e of G.ents){if(e.dead)continue;
        if(Math.hypot(s.x-e.x,s.y-(e.y+(e.cy||1.1)),s.z-e.z)<(e.type==='warden'?2:0.9)){hitEnemy(e,2,'disc');s.life=0;burst(s);break;}}
    }
  }
  G.shots=G.shots.filter(s=>s.life>0);
}
function burst(s){
  for(let i=0;i<(s.kind==='rocket'?14:6);i++)spark(s.x,s.y,s.z,(rng()-.5)*5,rng()*3,(rng()-.5)*5,s.c,0.3);
  if(s.kind==='rocket'){
    AUDIO.play('explode',clamp(3/Math.hypot(s.x-P.x,s.z-P.z),0.2,0.6));
    const d=Math.hypot(s.x-P.x,s.y-P.y-1,s.z-P.z);if(d<2.2&&!s.mine)playerDamage(s.dmg*(1-d/2.2),s);
  }
}
function spark(x,y,z,vx,vy,vz,c,life,n){G.sparks.push({x,y,z,vx,vy,vz,c,t:0,life:life||0.4,s:n?0.12:0.07});if(G.sparks.length>500)G.sparks.shift();}
function effectsUpdate(dt){
  for(const p of G.sparks){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=12*dt;}
  G.sparks=G.sparks.filter(p=>p.t<p.life);
  for(const r of G.rings)r.t+=dt;G.rings=G.rings.filter(r=>r.t<0.5);
  for(const s of G.smoke)s.t+=dt;G.smoke=G.smoke.filter(s=>s.t<5);
  for(const w of G.warps){w.t+=dt;if(w.spawn&&w.t>0.5&&!w.done){w.done=true;makeEnemy(w.spawn,w.x,w.y,w.z,'arena',true);}}
  G.warps=G.warps.filter(w=>w.t<0.6);
  for(const h of G.hitFlash)h.t-=dt;G.hitFlash=G.hitFlash.filter(h=>h.t>0);
}

/* ------------------------------------------------- drawing the actors */
const DRONE_COL=[.12,.13,.18];
function drawActors(time){
  const D=R.dyn,Gl=R.glass;
  // the player, with afterimages when dashing
  const L=STY(), look={body:L.suit,plate:L.plate,head:L.suit,trim:L.trim,eye:L.visor,hand:L.suit,wings:true,gloves:true,trimLegs:true,ears:false,crest:null,belt:1};
  if(SV.finish==='glitch')look.trim=Math.sin(time*6)>0?[1,.25,.7]:[.2,.95,1];
  if(P.state!=='down'||true)drawRig(D,{x:P.x,y:P.y,z:P.z,yaw:P.yaw,pose:P.pose,look});
  for(const t of P.trail)drawGhost(Gl,t,L.trim,t.t*1.6);
  shadow(P.x,P.y,P.z,0.7);
  for(const e of G.ents){
    if(e.dead&&e.st>9)continue;
    const fade=e.dead?Math.max(0,1-(e.st-7)/2):1;
    if(e.type==='drone')drawDrone(D,e,time);
    else if(e.type==='mech')drawMech(D,e,time);
    else if(e.type==='warden')drawWarden(D,e,time);
    else{
      const pose=e.state==='ko'?koPose(e):e.pose;
      drawRig(D,{x:e.x,y:e.y+(e.state==='ko'?-0.02:0),z:e.z,yaw:e.yaw,pose,look:e.look,charge:e.charge});
    }
    if(fade>0)shadow(e.x,e.fly||e.type==='warden'?(e.base||e.y):e.y,e.z,e.type==='mech'?1.6:e.type==='warden'?2.6:0.65);
    // a guard's laser sight while it lines up a shot
    if(e.state==='windup'&&!e.melee&&e.type==='guard')beam(Gl,e.x+Math.sin(e.yaw)*0.6,e.y+1.35,e.z+Math.cos(e.yaw)*0.6,P.x,P.y+1.1,P.z,[1,.15,.2],0.5,0.03);
  }
  if(P.grap)beam(Gl,P.x,P.y+1.6,P.z,P.grap.x,P.grap.y,P.grap.z,[.3,.95,1],0.9,0.03);
  if(P.disc){const d=P.disc;XF.reset().t(d.x,d.y,d.z).ry(time*30);D.part(XF.m,0.42,0.06,0.42,L.trim,3,0);}
  for(const s of G.shots)D.aabb(s.x-.14,s.y-.14,s.z-.14,s.x+.14,s.y+.14,s.z+.14,s.c,3,0);
  for(const p of G.sparks){const k=1-p.t/p.life;D.aabb(p.x-p.s*k,p.y-p.s*k,p.z-p.s*k,p.x+p.s*k,p.y+p.s*k,p.z+p.s*k,p.c,3,0);}
  for(const r of G.rings){const rad=r.max*ease(r.t/0.5),a=1-r.t/0.5;
    for(let i=0;i<24;i++){const an=i/24*TAU;Gl.aabb(r.x+Math.cos(an)*rad-.25,r.y,r.z+Math.sin(an)*rad-.25,r.x+Math.cos(an)*rad+.25,r.y+.15,r.z+Math.sin(an)*rad+.25,r.c,2,0,0,a);}}
  for(const s of G.smoke){const a=Math.min(1,(5-s.t)/1.5)*0.35;
    for(let i=0;i<10;i++){const an=i*2.4,rr=1.5+(i%3)*1.6+s.t*0.3,h=0.6+(i%4)*0.5;Gl.aabb(s.x+Math.cos(an)*rr-1,s.y,s.z+Math.sin(an)*rr-1,s.x+Math.cos(an)*rr+1,s.y+h+1,s.z+Math.sin(an)*rr+1,[.35,.33,.42],0.1,0,0,a);}}
  for(const w of G.warps){const k=w.t/0.6;for(let i=0;i<8;i++){const yy=w.y+rng()*2.2;Gl.aabb(w.x-.6+rng()*.6,yy,w.z-.05,w.x+rng()*.6,yy+.08+rng()*.2,w.z+.05,i%2?[1,.25,.7]:[.2,.95,1],2.5,0,0,1-k);}}
  // pickups: keys, data shards and stims, spinning and bobbing
  for(const it of WORLD.items){if(it.taken)continue;it.bob+=0.016;
    const y=it.y+Math.sin(it.bob*3)*0.15;XF.reset().t(it.x,y,it.z).ry(time*2);
    if(it.t==='key'){D.part(XF.m,0.5,0.32,0.05,KEYCOL[it.key],2.2,10);}
    else if(it.t==='shard'){XF.rx(0.6).rz(0.6);D.part(XF.m,0.35,0.35,0.35,[.6,1,.4],2.4,10);}
    else{D.part(XF.m,0.22,0.5,0.22,[.95,.95,1],0.4,0);XF.t(0,0,0.12);D.part(XF.m,0.12,0.36,0.02,[1,.25,.5],2.5,0);}
  }
  // the uplink: a column of light, red until you hold every key
  const ex=WORLD.W.exit;
  if(ex){const ready=uplinkReady(),c=ready?[.3,1,.6]:[1,.2,.3];
    Gl.aabb(ex.x-.9,ex.y,ex.z-.9,ex.x+.9,ex.y+40,ex.z+.9,c,2,0,0,ready?0.35:0.18);
    D.aabb(ex.x-.5,ex.y+.25,ex.z-.5,ex.x+.5,ex.y+.6,ex.z+.5,c,3,0);}
}
function koPose(e){const p=POSE0();p.roll=-1.52;p.hip=-0.66;p.aL=[0.2,1.3,0];p.aR=[0.4,1.1,0];p.lL=[0.1,0.3];p.lR=[-0.2,0.2];return p;}
function drawGhost(Gl,t,c,a){XF.reset().t(t.x,t.y+0.95,t.z).ry(t.yaw);Gl.part(XF.m,0.5,1.8,0.3,c,1.5,0,a*0.5);}
function shadow(x,y,z,r){const g=groundAt(x,z,y+0.3);if(!g)return;const h=Math.max(0,y-g.y1),k=clamp(1-h/8,0.15,1);
  R.glass.aabb(x-r,g.y1+0.02,z-r,x+r,g.y1+0.04,z+r,[0,0,0],0,0,0,0.5*k);}
function beam(Gl,x0,y0,z0,x1,y1,z1,c,a,w){
  const dx=x1-x0,dy=y1-y0,dz=z1-z0,l=Math.hypot(dx,dy,dz)||1;
  XF.reset().t((x0+x1)/2,(y0+y1)/2,(z0+z1)/2).ry(Math.atan2(dx,dz)).rx(-Math.asin(dy/l));
  Gl.part(XF.m,w,w,l,c,3,0,a);
}
function drawDrone(D,e,time){
  const s=e.state==='stun'||e.dead;
  XF.reset().t(e.x,e.y,e.z).ry(e.yaw);
  if(e.dead){XF.rx(e.st*3).rz(e.st*2);}
  D.part(XF.m,0.7,0.32,0.7,DRONE_COL,0);
  XF.push().t(0,0.2,0);D.part(XF.m,0.4,0.12,0.4,[.2,.22,.3],0);XF.pop();
  XF.push().t(0,0,0.36);D.part(XF.m,0.24,0.16,0.06,e.state==='windup'?[1,1,1]:[.3,.9,1],s?0.3:3);XF.pop();
  for(const [ax,az] of [[1,1],[-1,1],[1,-1],[-1,-1]]){XF.push().t(ax*0.55,0.12,az*0.55);D.part(XF.m,0.12,0.06,0.12,[.25,.25,.32],0);
    XF.ry(time*40);D.part(XF.m,0.62,0.02,0.06,[.5,.5,.6],0);XF.pop();}
  XF.push().t(0,-0.22,0);D.part(XF.m,0.08,0.08,0.08,[1,.2,.3],s?0:3);XF.pop();
}
function drawMech(D,e,time){
  const k=e.dead?Math.min(1,e.st*2):0, crouch=e.state==='windup'&&e.stomp?-0.3:e.state==='stun'?-0.4:0;
  const step=e.state==='chase'?Math.sin(e.ph*5):0;
  XF.reset().t(e.x,e.y,e.z).ry(e.yaw);
  if(k){XF.rx(-k*1.3);}
  const C=[.24,.25,.32],C2=[.34,.36,.46];
  for(const sx of [-1,1]){XF.push().t(sx*0.55,0,step*sx*0.25);D.part(XF.m,0.5,0.25,0.9,[.12,.12,.16],0);
    XF.t(0,0.9+crouch*0.5,0);D.part(XF.m,0.42,1.5,0.5,C,0);XF.t(0,0.2,0.27);D.part(XF.m,0.3,0.06,0.02,[1,.7,.3],2);XF.pop();}
  XF.push().t(0,2.1+crouch,0);D.part(XF.m,1.7,1.1,1.3,C2,0);
  XF.push().t(0,0.15,0.66);D.part(XF.m,0.8,0.32,0.04,e.state==='stun'?[.3,.9,1]:[1,.7,.3],e.state==='stun'?2:3);XF.pop();
  for(const sx of [-1,1]){XF.push().t(sx*1.05,0.1,0.2);D.part(XF.m,0.45,0.45,1.2,C,0);XF.t(0,0,0.65);D.part(XF.m,0.25,0.25,0.12,e.state==='windup'&&!e.stomp?[1,1,1]:[1,.5,.2],2.5);XF.pop();}
  XF.pop();
}
function drawWarden(D,e,time){
  const c=e.phase===2?[1,.25,.3]:e.phase===1?[1,.4,.8]:[.75,.45,1];
  XF.reset().t(e.x,e.y,e.z).ry(time*0.6);
  D.part(XF.m,1.6,1.6,1.6,[.08,.07,.12],0);
  XF.push().ry(Math.PI/4).rx(Math.PI/4);D.part(XF.m,1.5,1.5,1.5,[.12,.1,.18],0);XF.pop();
  XF.push().t(0,0,0);D.part(XF.m,0.7,0.7,0.7,c,e.state==='slam'||e.grounded?4:2.5);XF.pop();
  for(let ring=0;ring<2;ring++){
    for(let i=0;i<10;i++){const a=i/10*TAU+time*(ring?-1.2:0.8);XF.push().ry(a).rz(ring?0.6:-0.4).t(2.4+ring*0.6,0,0);D.part(XF.m,0.35,0.15,0.6,i%3?[.15,.13,.2]:c,i%3?0:2.5);XF.pop();}
  }
  for(let i=0;i<6;i++){const a=i/6*TAU;XF.push().ry(a).t(0,-1.2,1);XF.rx(0.5);D.part(XF.m,0.12,1.8,0.12,[.1,.1,.14],0);XF.pop();}
}
