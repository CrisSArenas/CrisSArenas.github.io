/* =============================== ANIMATION ===============================
   People are shaped low-polygon parts on one skeleton, textured from the
   atlas. Poses are written as key poses and blended; strikes have a wind-up,
   an impact and a follow-through; feet are matched to the ground speed so
   they do not slide; heads turn toward a target; the hero's scarf is a small
   chain of points with gravity and drag; the fallen go down with simple
   physics. Angles: arms [forward(-), out, elbow(-), twist], legs [forward(-),
   knee(+), out]; lean forward(+); roll falls the whole body.               */
const XF=new Xf();
const POSE0=()=>({lean:0,twist:0,side:0,hip:0,head:0,headY:0,aL:[0,0.12,-0.1,0],aR:[0,0.12,-0.1,0],lL:[0,0.05,0],lR:[0,0.05,0],wings:0,roll:0,spin:0,tilt:0});
const POSE_KEYS=['lean','twist','side','hip','head','headY','wings','roll','spin','tilt'];
const LIMBS=['aL','aR','lL','lR'];
function blendPose(cur,tgt,k){
  for(const key of POSE_KEYS)cur[key]+=(tgt[key]-cur[key])*k;
  for(const key of LIMBS)for(let i=0;i<cur[key].length;i++)cur[key][i]+=((tgt[key][i]||0)-cur[key][i])*k;
}
function copyPose(p){return{...p,aL:p.aL.slice(),aR:p.aR.slice(),lL:p.lL.slice(),lR:p.lR.slice()};}
// Sample a key-pose list at k in 0..1. Each key is [time, partial pose]; missing values come from base.
function samplePose(keys,k,base){
  let i=0;while(i<keys.length-2&&keys[i+1][0]<=k)i++;
  const [t0,a]=keys[i],[t1,b]=keys[Math.min(i+1,keys.length-1)];
  const u=t1>t0?ease(clamp((k-t0)/(t1-t0),0,1)):1;
  const o=copyPose(base);
  for(const key of POSE_KEYS){const va=a[key]!==undefined?a[key]:base[key],vb=b[key]!==undefined?b[key]:base[key];o[key]=va+(vb-va)*u;}
  for(const key of LIMBS){const va=a[key]||base[key],vb=b[key]||base[key];for(let j=0;j<4;j++)if(va[j]!==undefined||vb[j]!==undefined)o[key][j]=(va[j]??base[key][j]??0)+((vb[j]??base[key][j]??0)-(va[j]??base[key][j]??0))*u;}
  return o;
}
const GUARD={aL:[-1.15,0.35,-1.8],aR:[-1.1,0.35,-1.85],lL:[-0.35,0.45],lR:[0.3,0.35],lean:0.15,hip:-0.08};
const G_=p=>Object.assign({},GUARD,p);
/* Twelve strikes. hit: when in the move the blow lands. reach: how close it needs to be. */
const STRIKES=[
 {n:'jab',      dur:.26,hit:.42,reach:1.3,dmg:1,keys:[[0,G_({twist:.25})],[.4,G_({aR:[-1.6,.05,-.05],twist:-.35,lean:.25})],[1,G_({})]]},
 {n:'cross',    dur:.27,hit:.42,reach:1.3,dmg:1,keys:[[0,G_({twist:-.25})],[.4,G_({aL:[-1.6,.05,-.05],twist:.5,lean:.3,lR:[.4,.3]})],[1,G_({})]]},
 {n:'hook',     dur:.3, hit:.45,reach:1.3,dmg:1,keys:[[0,G_({twist:.7,aR:[-1.2,1.1,-1.4]})],[.45,G_({twist:-.9,aR:[-1.45,.3,-1.2],lean:.2})],[1,G_({})]]},
 {n:'elbow',    dur:.28,hit:.45,reach:1.1,dmg:1,keys:[[0,G_({twist:.6})],[.45,G_({aR:[-1.4,1.3,-2.5],twist:-.9,lean:.25})],[1,G_({})]]},
 {n:'knee',     dur:.32,hit:.5, reach:1.1,dmg:1,keys:[[0,G_({})],[.5,G_({lR:[-1.7,1.9],aL:[-1.5,.2,-1.3],aR:[-1.5,.2,-1.3],lean:.35})],[1,G_({})]]},
 {n:'frontkick',dur:.32,hit:.5, reach:1.6,dmg:1,keys:[[0,G_({lR:[-.9,1.6]})],[.5,G_({lR:[-1.65,.08],lean:-.35,aL:[-.8,.6,-1],aR:[-.5,.7,-.8]})],[1,G_({})]]},
 {n:'roundhouse',dur:.36,hit:.52,reach:1.7,dmg:1,keys:[[0,G_({twist:.5})],[.52,G_({spin:-.9,lR:[-1.45,.12,1.0],side:-.35,lean:-.2})],[1,G_({spin:0})]]},
 {n:'uppercut', dur:.34,hit:.48,reach:1.2,dmg:2,keys:[[0,G_({hip:-.35,aR:[-.2,.1,-2.1],lean:.45})],[.48,G_({hip:.05,aR:[-2.95,.1,-.35],lean:-.25,twist:-.4})],[1,G_({})]]},
 {n:'spinheel', dur:.42,hit:.6, reach:1.8,dmg:2,keys:[[0,G_({spin:0})],[.6,G_({spin:-Math.PI*1.4,lR:[-1.5,.05,.4],lL:[0,.15],lean:-.3,aL:[-.4,1.2,-.2],aR:[-.4,1.2,-.2]})],[1,G_({spin:-TAU})]]},
 {n:'flyingkick',dur:.36,hit:.45,reach:2.0,dmg:2,keys:[[0,G_({lL:[.3,1.4],lR:[-.6,1.5]})],[.45,G_({lR:[-1.65,.05],lL:[.5,1.3],lean:-.45,aL:[-.4,1,-.5],aR:[-.2,1.1,-.3]})],[1,G_({})]]},
 {n:'backfist', dur:.3, hit:.45,reach:1.3,dmg:1,keys:[[0,G_({spin:0})],[.45,G_({spin:Math.PI*0.9,aR:[-1.5,1.4,-.3],twist:.3})],[1,G_({spin:Math.PI})]]},
 {n:'stomp',    dur:.4, hit:.55,reach:1.6,dmg:3,keys:[[0,G_({lR:[-2.2,.2],lean:-.2})],[.55,G_({lR:[-.2,.25],hip:-.25,lean:.35})],[1,G_({})]]}
];
const COUNTERS={
  front:[[0,G_({aL:[-1.6,.3,-.6],aR:[-1.6,.3,-.6],lean:.3})],[.45,G_({twist:1.2,aR:[-1,1.1,-.8],aL:[-1.7,.2,-.3],lean:.5,lR:[.5,.4]})],[1,G_({})]],
  side: [[0,G_({twist:.9})],[.45,G_({twist:-.4,aR:[-1.2,1.4,-2.4],side:.3})],[1,G_({})]],
  back: [[0,G_({lean:.3})],[.45,G_({lR:[.95,.1],lean:.75,aL:[-.4,.6,-.6],aR:[-.4,.6,-.6]})],[1,G_({})]]
};
const MOVES={
  takedown:[[0,{hip:-.2,lean:.4,aR:[-1.6,.3,-.8],aL:[-1.6,.3,-.8]}],[.5,{hip:-.5,lean:.8,aR:[-2.3,.2,-.5],aL:[-1.2,.6,-1.2],lL:[-.9,1.7],lR:[.3,1.9]}],[1,{hip:-.45,lean:.6}]],
  throw:[[0,{aL:[-1.6,.3,-.4],aR:[-1.6,.3,-.4],lean:.2}],[.5,{twist:1.6,aL:[-2.6,.5,-.2],aR:[-2.6,.5,-.2],lean:-.3}],[1,{twist:.4}]],
  slam:[[0,{aL:[-1.6,.2,-.5],aR:[-1.6,.2,-.5]}],[.5,{lean:.6,aL:[-1.2,.1,-.1],aR:[-1.2,.1,-.1],lL:[-.6,.5],lR:[.6,.3]}],[1,{lean:.3}]],
  special:[[0,G_({spin:0,hip:-.3})],[.35,G_({spin:-Math.PI,hip:.2,lR:[-1.6,.1,.6],lean:-.3})],[.7,G_({spin:-TAU,aR:[-2.9,.1,-.3],hip:-.1})],[1,G_({spin:-TAU})]],
  vault:[[0,{lean:.6,aL:[-1.4,.2,-.2],aR:[-1.4,.2,-.2]}],[.5,{lean:1.3,lL:[-1.2,1.6],lR:[-1.2,1.6],aL:[-.2,.3,0],aR:[-.2,.3,0],hip:.2}],[1,{lean:.2}]],
  roll:[[0,{hip:-.4,lean:.8,lL:[-1.4,2.2],lR:[-1.4,2.2],aL:[-1.6,.4,-1.6],aR:[-1.6,.4,-1.6]}],[.5,{roll:Math.PI,hip:-.55,lean:.8,lL:[-1.6,2.3],lR:[-1.6,2.3]}],[1,{roll:TAU,hip:-.2,lean:.2}]],
  climb:[[0,{aL:[-3,.2,0],aR:[-3,.2,0],lL:[.1,.2],lR:[.2,.3]}],[.5,{aL:[-1.4,.3,-.3],aR:[-1.4,.3,-.3],lL:[-1.3,1.8],hip:-.3,lean:.6}],[1,{lean:.2,hip:0}]]
};
// Runs with the stride matched to ground speed, so feet do not slide.
function poseRun(p,ph,amt,lean){
  const s=Math.sin(ph),c=Math.cos(ph);
  p.lL[0]=s*0.95*amt;p.lR[0]=-s*0.95*amt;
  p.lL[1]=Math.max(0,-Math.sin(ph+1.1))*1.35*amt+0.08;p.lR[1]=Math.max(0,Math.sin(ph+1.1))*1.35*amt+0.08;
  p.aL[0]=-s*0.85*amt;p.aR[0]=s*0.85*amt;p.aL[2]=-0.55*amt-0.15;p.aR[2]=-0.55*amt-0.15;
  p.aL[1]=p.aR[1]=0.15;p.lean=lean*amt;p.hip=-Math.abs(c)*0.07*amt;p.twist=s*0.12*amt;p.side=c*0.04*amt;
}
function poseIdle(p,t,kind){
  p.hip=Math.sin(t*2)*0.012;p.aL[1]=p.aR[1]=0.18;p.aL[2]=p.aR[2]=-0.18;
  if(kind==='talk'){p.aR=[-0.7+Math.sin(t*3)*0.3,0.4,-1.2+Math.sin(t*4)*0.4,0];p.aL=[-0.3,0.3,-0.6,0];p.head=Math.sin(t*1.5)*0.1;}
  else if(kind==='smoke'){p.aR=[-2.2,0.35,-2.6,0];p.head=0.15;}
  else if(kind==='cower'){p.hip=-0.5;p.lean=0.7;p.aL=[-2.6,0.6,-2.2,0];p.aR=[-2.6,0.6,-2.2,0];p.lL=[-1.2,1.9];p.lR=[-1.1,1.9];}
  else if(kind==='taunt'){p.aL=[-0.3,1.3,-0.4,0];p.aR=[-0.3,1.3,-0.4,0];p.lean=-0.15;}
  else if(kind==='guard'){Object.assign(p,copyPose(Object.assign(POSE0(),GUARD)));}
}

/* -------------------------------------------------------- looks */
const LOOKS={
  hero:s=>({tiles:{torso:TILE.suit,arms:TILE.suit,legs:TILE.suit,head:TILE.heroMask,pelvis:TILE.suitPlain},
    body:s.suit,limb:s.suit,skin:s.suit,glow:s.trim,eye:s.visor,emblem:true,pauldron:s.plate,boots:s.plate,wings:true,gloves:true,belt:true,build:1.06}),
  thug:e=>{const c=GANG[e.seed%4];return{tiles:{torso:TILE.jacket,arms:TILE.jacket,legs:TILE.jeans,head:TILE['gangFace'+(e.seed%3)]},
    body:[.45,.35,.5].map((v,i)=>v*0.6+c[i]*0.25),limb:[.5,.4,.55],skin:[1,1,1],glow:c,eye:c,mohawk:e.seed%2?c:null,chain:true,build:1}},
  knife:e=>({tiles:{torso:TILE.vest,arms:TILE.jacket,legs:TILE.jeans,head:TILE.gangFace1},body:[.7,.7,.5],limb:[.4,.4,.35],skin:[1,1,1],glow:[1,.7,.2],eye:[1,.7,.2],knife:true,bandana:[1,.7,.2],build:0.95}),
  shield:e=>({tiles:{torso:TILE.armor,arms:TILE.armor,legs:TILE.jeans,head:TILE.helmet},body:[.55,.6,.7],limb:[.5,.55,.65],skin:[.7,.75,.85],glow:[.3,.8,1],eye:[.3,.8,1],shield:true,pauldron:[.6,.65,.75],build:1.05}),
  brute:e=>({tiles:{torso:TILE.brute,arms:TILE.brute,legs:TILE.jeans,head:TILE.brute},body:[1,.85,.8],limb:[1,.85,.8],skin:[1,.85,.8],glow:[1,.3,.3],eye:[1,.3,.3],pauldron:[.4,.35,.38],build:1.35,scale:1.25}),
  baton:e=>({tiles:{torso:TILE.armor,arms:TILE.jacket,legs:TILE.jeans,head:TILE.helmet},body:[.6,.55,.8],limb:[.4,.35,.55],skin:[.75,.7,.9],glow:[.7,.4,1],eye:[.7,.4,1],baton:true,build:1}),
  ninja:e=>({tiles:{torso:TILE.wrap,arms:TILE.wrap,legs:TILE.wrap,head:TILE.wrap},body:[.5,.5,.6],limb:[.45,.45,.55],skin:[.5,.5,.6],glow:[1,.25,.4],eye:[1,.25,.4],sash:[1,.25,.4],build:0.92}),
  guard:e=>({tiles:{torso:TILE.armor,arms:TILE.armor,legs:TILE.armor,head:TILE.helmet},body:[.6,.65,.75],limb:[.45,.5,.6],skin:[.6,.65,.75],glow:[1,.3,.35],eye:[1,.3,.35],rifle:true,pauldron:[.7,.75,.85],build:1.02}),
  sniper:e=>({tiles:{torso:TILE.armor,arms:TILE.armor,legs:TILE.armor,head:TILE.helmet},body:[.4,.45,.4],limb:[.35,.4,.35],skin:[.4,.45,.4],glow:[1,.3,.3],eye:[1,.3,.3],rifle:true,long:true,build:1}),
  hacker:e=>({tiles:{torso:TILE.coat,arms:TILE.coat,legs:TILE.coat,head:TILE.hood},body:[.8,.6,.9],limb:[.7,.5,.8],skin:[.8,.6,.9],glow:[1,.3,.8],eye:[1,.3,.8],coat:true,hood:true,build:0.95}),
  civ:e=>({tiles:{torso:TILE['shirt'+(e.seed%4)],arms:TILE['shirt'+(e.seed%4)],legs:TILE.jeans,head:e.seed%2?TILE.skinFace:TILE.skinFace2},body:[1,1,1],limb:[1,1,1],skin:[1,1,1],glow:[.3,.3,.3],eye:[.3,.3,.3],build:0.95,umbrella:e.seed%3===0?SIGN_COLS[e.seed%6]:null}),
  chain:e=>({tiles:{torso:TILE.brute,arms:TILE.brute,legs:TILE.jeans,head:TILE.brute},body:[1,.8,.75],limb:[1,.8,.75],skin:[1,.8,.75],glow:[1,.25,.3],eye:[1,.25,.3],mohawk:[1,.25,.3],chain:true,bigChain:true,pauldron:[.35,.3,.32],build:1.4,scale:1.5}),
  twin:e=>({tiles:{torso:TILE.coat,arms:TILE.coat,legs:TILE.coat,head:TILE.hood},body:e.twin?[.5,.9,1]:[1,.5,.9],limb:[.6,.6,.7],skin:[.7,.7,.8],glow:e.twin?[.3,.95,1]:[1,.3,.8],eye:e.twin?[.3,.95,1]:[1,.3,.8],coat:true,hood:true,build:1,scale:1.15})
};
const GANG=[[1,.25,.7],[.2,.95,1],[.6,1,.3],[1,.6,.2]];

/* Draw a person. o: {x,y,z,yaw,pose,look,scale,charge,scarf,alpha} */
function drawHuman(Bt,o){
  const p=o.pose,L=o.look,s=(o.scale||1)*(L.scale||1),X=XF,bk=L.build||1;
  const tl=L.tiles,G=L.glow,AL=o.alpha===undefined?1:o.alpha;
  X.reset().t(o.x,o.y,o.z).ry(o.yaw+p.spin);
  if(s!==1){const m=X.m;for(let i=0;i<12;i++)m[i]*=s;}
  if(p.roll){X.t(0,0.5,0).rx(p.roll).t(0,-0.5,0);}
  if(p.tilt)X.rz(p.tilt);
  const hipY=0.95+p.hip;
  X.push().t(0,hipY,0).rx(p.lean).ry(p.twist).rz(p.side);
  Bt.part('box',X.m,0.36*bk,0.2,0.25,L.limb,0,9,AL,tl.pelvis!==undefined?tl.pelvis:tl.legs);
  // torso
  X.push().t(0,0.33,0);
  Bt.part('torso',X.m,0.44*bk,0.6,0.27,L.body,0,9,AL,tl.torso,G);
  if(L.emblem){X.push().t(0,0.06,0.142);Bt.part('boxF',X.m,0.3,0.24,0.02,L.body,0,9,AL,TILE.emblem,G);X.pop();}
  if(L.belt||L.chain){X.push().t(0,-0.28,0);Bt.part('box',X.m,0.46*bk,0.07,0.29,L.belt?L.body:[.6,.6,.65],L.belt?0:0.2,9,AL,-1);
    if(L.belt){X.t(0,0,0.15);Bt.part('box',X.m,0.1,0.06,0.02,G,2.4,9);}X.pop();}
  if(L.coat){const sw=Math.sin((o.ph||0)*1.3)*0.1;for(const sx of [-1,1]){X.push().t(sx*0.12,-0.3,-0.02).rx(0.12+sw*sx+Math.min(0.5,(o.speed||0)*0.06));X.push().t(0,-0.3,0);Bt.part('box',X.m,0.22,0.62,0.06,L.body,0,9,AL,tl.torso,G);X.pop();X.pop();}}
  if(L.sash){X.push().t(0.05,-0.27,-0.15).rx(0.3+Math.sin((o.ph||0)*2)*0.2);X.push().t(0,-0.25,0);Bt.part('box',X.m,0.08,0.5,0.02,L.sash,1.4,9);X.pop();X.pop();}
  if(L.bandana){X.push().t(0,0.5,-0.14).rx(0.6);X.push().t(0,-0.15,0);Bt.part('box',X.m,0.12,0.3,0.02,L.bandana,0.4,9);X.pop();X.pop();}
  // head
  X.push().t(0,0.48,0).ry(p.headY).rx(p.head);
  if(L.hood){Bt.part('round',X.m,0.36,0.36,0.36,L.body,0,9,AL,tl.torso,G);X.push().t(0,0,0.02);Bt.part('head',X.m,0.29,0.3,0.32,L.skin,0,9,AL,tl.head,G);X.pop();}
  else Bt.part('head',X.m,0.27,0.3,0.28,L.skin,0,9,AL,tl.head,G);
  if(L.mohawk)for(let i=0;i<4;i++){X.push().t(0,0.17,0.08-i*0.07).rx(-0.3-i*0.12);Bt.part('spike',X.m,0.06,0.18,0.08,L.mohawk,1.6,9);X.pop();}
  X.pop();
  // pauldrons
  if(L.pauldron)for(const sx of [-1,1]){X.push().t(sx*0.27*bk,0.28,0).rz(-sx*0.35);Bt.part('wedge',X.m,0.2,0.12,0.3,L.pauldron,0,9,AL,TILE.armor,G);X.pop();}
  // wings, folded against the back until they open
  if(L.wings&&p.wings>0.02){
    for(const sx of [-1,1]){
      X.push().t(sx*0.18,0.2,-0.17).rz(sx*(0.2+p.wings*1.25)).ry(sx*0.15*p.wings);
      X.push().t(sx*0.6*p.wings,-0.08,0).rz(sx*Math.PI/2);Bt.part('plane',X.m,0.6,1.2*p.wings+0.05,1,L.body,0,9,AL,TILE.wing,G);X.pop();
      X.pop();
    }
  }
  // arms
  for(const sx of [-1,1]){
    const a=sx<0?p.aL:p.aR;
    X.push().t(sx*0.29*bk,0.27,0).rx(a[0]).rz(sx*a[1]).ry(a[3]||0);
    X.push().t(0,-0.16,0);Bt.part('limb',X.m,0.15*bk,-0.33,0.15*bk,L.limb,0,9,AL,tl.arms,G);X.pop();
    X.t(0,-0.31,0).rx(a[2]);
    X.push().t(0,-0.14,0);Bt.part('limb',X.m,0.13*bk,-0.3,0.13*bk,L.limb,0,9,AL,tl.arms,G);X.pop();
    X.push().t(0,-0.31,0.01);Bt.part('round',X.m,0.13,0.12,0.14,L.gloves?L.body:L.skin,0,9,AL,L.gloves?TILE.suitPlain:-1);
    if(L.gloves){X.t(0,0.02,0.07);Bt.part('box',X.m,0.11,0.025,0.02,G,2.4,9);}X.pop();
    if(sx>0&&L.rifle){X.push().t(0,-0.3,0.26);Bt.part('box',X.m,0.08,0.12,L.long?0.95:0.6,[.15,.15,.18],0,9,AL,TILE.hull,G);X.push().t(0,0.04,L.long?0.5:0.32);Bt.part('box',X.m,0.03,0.03,0.04,G,3,9);X.pop();X.pop();}
    if(sx>0&&L.knife){X.push().t(0,-0.33,0.12);Bt.part('box',X.m,0.03,0.04,0.34,G,1.6,9);X.pop();}
    if(sx>0&&L.baton){X.push().t(0,-0.33,0.2);Bt.part('cyl',X.m,0.06,0.5,0.06,G,o.charge?3:1.4,9);X.pop();}
    if(sx<0&&L.shield){X.push().t(0.05,-0.25,0.2).rx(-a[0]-0.1);Bt.part('box',X.m,0.08,1.25,0.85,[.5,.55,.65],0.3,9,AL,TILE.field,G);X.pop();}
    if(sx>0&&L.bigChain){X.push().t(0,-0.33,0);for(let i=0;i<7;i++){X.t(0,-0.18,0).rx(Math.sin((o.ph||0)*6+i)*0.25+(o.swing||0));Bt.part('box',X.m,0.08,0.16,0.08,[.7,.7,.75],0.3,9);}X.pop();}
    if(sx>0&&L.umbrella){X.push().t(0,-0.3,0).rx(-a[0]);X.push().t(0,0.7,0);Bt.part('cyl',X.m,0.03,1.4,0.03,[.2,.2,.2],0,9);X.pop();X.push().t(0,1.4,0);Bt.part('cone',X.m,1.2,0.4,1.2,L.umbrella,0.5,9);X.pop();X.pop();}
    X.pop();
  }
  X.pop();
  // legs
  for(const sx of [-1,1]){
    const l=sx<0?p.lL:p.lR;
    X.push().t(sx*0.11*bk,0,0).rx(l[0]).rz(sx*(l[2]||0)*-1);
    X.push().t(0,-0.23,0);Bt.part('limb',X.m,0.19*bk,-0.47,0.19*bk,L.limb,0,9,AL,tl.legs,G);X.pop();
    X.t(0,-0.46,0).rx(l[1]);
    X.push().t(0,-0.22,0);Bt.part('limb',X.m,0.16*bk,-0.45,0.16*bk,L.limb,0,9,AL,tl.legs,G);X.pop();
    X.push().t(0,-0.45,0.05);Bt.part('wedge',X.m,0.18*bk,0.12,0.32,L.boots||[.12,.12,.14],0,9,AL,TILE.suitPlain);X.pop();
    X.pop();
  }
  X.pop();
  // the scarf: drawn from its chain of points, in world space
  if(o.scarf&&o.scarf.pts){const pts=o.scarf.pts;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];beamPart(Bt,a[0],a[1],a[2],b[0],b[1],b[2],L.scarf,0.6,0.16-i*0.012,0.03);}}
}
function beamPart(Bt,x0,y0,z0,x1,y1,z1,c,em,w,h){
  const dx=x1-x0,dy=y1-y0,dz=z1-z0,l=Math.hypot(dx,dy,dz)||1;
  XF.reset().t((x0+x1)/2,(y0+y1)/2,(z0+z1)/2).ry(Math.atan2(dx,dz)).rx(-Math.asin(clamp(dy/l,-1,1)));
  Bt.part('box',XF.m,w,h||w,l,c,em,0);
}
/* The scarf: six points hanging from the back of the neck, pulled by gravity,
   dragged by the air, and kept a fixed distance apart. */
function scarfUpdate(S,ax,ay,az,dt,wind){
  if(!S.pts){S.pts=[];S.prev=[];for(let i=0;i<7;i++){S.pts.push([ax,ay-i*0.2,az]);S.prev.push([ax,ay-i*0.2,az]);}}
  const P=S.pts,Q=S.prev;
  P[0]=[ax,ay,az];
  for(let i=1;i<P.length;i++){const p=P[i],q=Q[i];
    const vx=(p[0]-q[0])*0.9+(wind?wind[0]*dt*dt*4:0),vy=(p[1]-q[1])*0.9-9.8*dt*dt,vz=(p[2]-q[2])*0.9+(wind?wind[1]*dt*dt*4:0);
    Q[i]=p.slice();p[0]+=vx;p[1]+=vy;p[2]+=vz;}
  for(let it=0;it<3;it++)for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],d=Math.hypot(dx,dy,dz)||1,k=(d-0.19)/d;
    if(i>1){a[0]+=dx*k*0.5;a[1]+=dy*k*0.5;a[2]+=dz*k*0.5;b[0]-=dx*k*0.5;b[1]-=dy*k*0.5;b[2]-=dz*k*0.5;}else{b[0]-=dx*k;b[1]-=dy*k;b[2]-=dz*k;}}
}
/* Going down: the body becomes a simple rigid thing that tips, slides and bounces;
   the limbs flop toward a sprawled pose. */
function ragStart(e,dx,dz,force,up){
  const l=Math.hypot(dx,dz)||1;
  e.rag={vx:dx/l*force,vy:up||3,vz:dz/l*force,roll:0,rollV:-(3+force*0.4),done:false,
    flop:{aL:[0.4+rng()*0.6,0.8+rng()*0.8,-rng()*0.6],aR:[0.3+rng()*0.6,0.9+rng()*0.7,-rng()*0.6],lL:[-0.3+rng()*0.6,rng()*0.6],lR:[-0.3+rng()*0.6,rng()*0.6]}};
  e.yaw=Math.atan2(-dx,-dz);
}
function ragUpdate(e,dt){
  const g=e.rag;if(!g)return;
  if(!g.done){
    g.vy-=24*dt;
    e.x+=g.vx*dt;e.z+=g.vz*dt;e.y+=g.vy*dt;
    g.roll=Math.max(-1.55,g.roll+g.rollV*dt);
    const gr=groundAt(e.x,e.z,e.y+0.8);
    if(gr&&e.y<=gr.y1){e.y=gr.y1;if(g.vy<-3){g.vy*=-0.25;g.vx*=0.5;g.vz*=0.5;}else{g.vy=0;g.vx*=Math.pow(0.02,dt);g.vz*=Math.pow(0.02,dt);if(Math.abs(g.vx)+Math.abs(g.vz)<0.2&&g.roll<=-1.5)g.done=true;}}
    else if(!gr&&e.y<WORLD.fogY-30){e.gone=true;}
    // a wall stops the slide
    query(e.x-.3,e.z-.3,e.x+.3,e.z+.3,QB);for(const b of QB)if(e.x>b.x0-.3&&e.x<b.x1+.3&&e.z>b.z0-.3&&e.z<b.z1+.3&&b.y1>e.y+0.6&&b.y0<e.y+1.2&&b.k!=='deck'){e.x-=g.vx*dt*1.2;e.z-=g.vz*dt*1.2;if(Math.hypot(g.vx,g.vz)>6){e.wallHit=true;}g.vx*=-0.2;g.vz*=-0.2;}
  }
  const p=e.pose;p.roll=g.roll;p.hip=-0.62*clamp(-g.roll/1.55,0,1);
  blendPose(p,Object.assign(POSE0(),g.flop,{roll:g.roll,hip:p.hip}),Math.min(1,dt*6));
}
