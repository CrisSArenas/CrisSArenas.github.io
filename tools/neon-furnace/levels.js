/* ------------------------------------------------------------ the city
   Each district is a handful of islands of towers hanging over a fogged
   chasm, joined by bridges. A district is described in a few lines below and
   built into plain boxes by nfBuild(); the same boxes are what you see, what
   you collide with, and what nfCheck() walks to prove the district can be
   finished: every key reachable before its gate, every enemy, data shard and
   the exit reachable, using movement rules a little weaker than the real
   ones (jump, double jump, glide, grapple, updraft vents).                 */

// Movement constants shared by the game and the checker. The checker uses
// the conservative column, so anything it proves is comfortably possible.
const NF_MOVE={
  run:7.5, gravity:24, jump:9.2, jump2:8.0, glideFall:2.0, glideSpeed:11,
  grappleRange:30, dash:17,
  // checker limits
  climb:2.6, jumpGap:4.5, jumpUp:1.0, glideRatio:4, grappleReach:20, grappleRise:24, ventLift:16
};
const NF_WALK=new Set(['deck','tower','bridge','crate','ledge','pad','roof']);

/* Each island: [id, x, z, width, depth, deck height, options]
   options: e   enemies, one letter each: t thug, g guard, h hacker, d drone, m mech, W the Warden
            key {B|Y|R} placed on a rooftop reached by grapple
            shard  'peak' | 'float' | 'under'   a hidden data shard
            stim   health pickups   vent   updraft vents   exit   the beacon   start
   links: [from, to, gateKey]  a bridge, gated when a key is given        */
const NF_DISTRICTS=[
{name:'UNDERCITY MARKET',par:300,seed:11,theme:'market',bpm:128,root:45,rain:true,
 islands:[
  ['a',   0,   0, 44, 32, 0, {start:1,e:'ttt',stim:1}],
  ['b',   0, -60, 40, 36, 2, {e:'tttg',key:'B',shard:'peak'}],
  ['c',  64, -60, 40, 40, 4, {e:'tthgd',stim:1}],
  ['d',  64,  12, 40, 32, 1, {e:'ttttg',exit:1,shard:'under'}]],
 links:[['a','b'],['b','c','B'],['c','d']]},
{name:'DATA VAULT',par:360,seed:23,theme:'vault',bpm:130,root:41,rain:false,
 islands:[
  ['a',   0,   0, 36, 30, 18, {start:1,e:'tgg',stim:1}],
  ['b',  58,   0, 40, 36, 20, {e:'tthdd',key:'B',shard:'float'}],
  ['c',  58, -64, 44, 40, 24, {e:'tggh',key:'Y',stim:1}],
  ['e',   0, -64, 40, 36, 22, {e:'ttghd',shard:'peak'}],
  ['f',   0,-128, 44, 40, 26, {e:'tthhgg',exit:1,stim:1}]],
 links:[['a','b'],['b','c','B'],['c','e'],['e','f','Y']]},
{name:'NEON ROOFTOPS',par:330,seed:37,theme:'roof',bpm:132,root:38,rain:true,
 islands:[
  ['a',   0,   0, 34, 30, 40, {start:1,e:'tt',vent:1,stim:1}],
  ['b',  70,   0, 36, 34, 38, {e:'ttgd',vent:1,key:'B'}],
  ['c',  70, -66, 38, 36, 44, {e:'thdd',shard:'float',stim:1}],
  ['d', 140, -66, 40, 40, 42, {e:'ttthg',vent:1,shard:'peak'}],
  ['e', 140,   4, 40, 34, 40, {e:'tthgd',exit:1}]],
 links:[['b','c'],['c','d','B'],['d','e']],
 // the first crossing has no bridge: ride the vent and glide
 glides:[['a','b']]},
{name:'THE CORE',par:420,seed:53,theme:'core',bpm:134,root:36,rain:false,
 islands:[
  ['a',   0,   0, 36, 32, 10, {start:1,e:'ttg',stim:1}],
  ['b',  60,   0, 40, 36, 12, {e:'tthg',key:'B'}],
  ['c',  60, -64, 48, 44, 14, {e:'ttgm',key:'Y',stim:1,shard:'under'}],
  ['d',   0, -64, 40, 40, 16, {e:'tthhd',key:'R',shard:'peak'}],
  ['f', -62, -64, 44, 40, 18, {e:'ttggm',exit:1,stim:1}]],
 links:[['a','b'],['b','c','B'],['c','d','Y'],['d','f','R']]},
{name:'THE SPIRE',par:480,seed:71,theme:'spire',bpm:136,root:40,rain:false,boss:true,
 islands:[
  ['a',   0,   0, 36, 32, 50, {start:1,e:'tggd',stim:1}],
  ['b',  60,   0, 40, 36, 54, {e:'tthhg',key:'B',shard:'float'}],
  ['c',  60, -64, 40, 40, 58, {e:'ttgdm',key:'Y',stim:1}],
  ['d',   0, -64, 36, 36, 62, {e:'tthg',stim:2,shard:'peak'}],
  ['w',   0,-136, 56, 56, 66, {e:'W',exit:1,stim:2}]],
 links:[['a','b'],['b','c','B'],['c','d'],['d','w','Y']]}
];

function nfRand(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* Build a district into boxes, anchors, vents, items, enemies and gates. */
function nfBuild(D){
  const r=nfRand(D.seed*7919+1);
  const W={boxes:[],anchors:[],vents:[],items:[],enemies:[],gates:[],islands:{},start:null,exit:null,name:D.name};
  const box=(x0,y0,z0,x1,y1,z1,k,o)=>{const b=Object.assign({x0:Math.min(x0,x1),y0:Math.min(y0,y1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),y1:Math.max(y0,y1),z1:Math.max(z0,z1),k,s:(r()*1e6)|0},o||{});W.boxes.push(b);return b;};
  const isl={};
  for(const [id,x,z,w,d,y,o] of D.islands)isl[id]={id,x,z,w,d,y,o:o||{},x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,ports:[],used:[]};
  W.islands=isl;
  // where bridges meet each island: those edge spans stay open
  const linkSides=(A,B)=>{
    const dx=B.x-A.x,dz=B.z-A.z;
    if(Math.abs(dx)>=Math.abs(dz)){
      const zc=(Math.max(A.z0,B.z0)+Math.min(A.z1,B.z1))/2;
      return dx>0?{axis:'x',a:A.x1,b:B.x0,c:zc}:{axis:'x',a:A.x0,b:B.x1,c:zc};
    }
    const xc=(Math.max(A.x0,B.x0)+Math.min(A.x1,B.x1))/2;
    return dz>0?{axis:'z',a:A.z1,b:B.z0,c:xc}:{axis:'z',a:A.z0,b:B.z1,c:xc};
  };
  const links=(D.links||[]).map(([a,b,key])=>({A:isl[a],B:isl[b],key,s:linkSides(isl[a],isl[b])}));
  for(const L of links){L.A.ports.push({axis:L.s.axis,at:L.s.a,c:L.s.c});L.B.ports.push({axis:L.s.axis,at:L.s.b,c:L.s.c});}
  for(const [a,b] of (D.glides||[])){const s=linkSides(isl[a],isl[b]);isl[a].ports.push({axis:s.axis,at:s.a,c:s.c});isl[b].ports.push({axis:s.axis,at:s.b,c:s.c});}

  for(const id in isl){
    const I=isl[id], y=I.y, o=I.o;
    // the deck, its underside and the supports that vanish into the fog
    box(I.x0,y-2.5,I.z0,I.x1,y,I.z1,'deck');
    box(I.x0+2,y-9,I.z0+2,I.x1-2,y-2.5,I.z1-2,'under',{nc:1});
    for(const [px,pz] of [[I.x0+5,I.z0+5],[I.x1-5,I.z0+5],[I.x0+5,I.z1-5],[I.x1-5,I.z1-5]])box(px-1.6,y-140,pz-1.6,px+1.6,y-9,pz+1.6,'pillar',{nc:1});
    // railings along the edges, open where a bridge lands
    const gapAt=(axis,at,c)=>I.ports.some(p=>p.axis===axis&&Math.abs(p.at-at)<0.1&&Math.abs(p.c-c)<3.2);
    for(let t=I.x0;t<I.x1-0.01;t+=2){const c=t+1;
      if(!gapAt('z',I.z0,c))box(t,y,I.z0,t+2,y+1.1,I.z0+0.3,'rail');
      if(!gapAt('z',I.z1,c))box(t,y,I.z1-0.3,t+2,y+1.1,I.z1,'rail');}
    for(let t=I.z0;t<I.z1-0.01;t+=2){const c=t+1;
      if(!gapAt('x',I.x0,c))box(I.x0,y,t,I.x0+0.3,y+1.1,t+2,'rail');
      if(!gapAt('x',I.x1,c))box(I.x1-0.3,y,t,I.x1,y+1.1,t+2,'rail');}
    // towers stand in a ring around a clear fighting floor in the middle
    const clearW=Math.min(I.w-14,18), clearD=Math.min(I.d-14,14);
    const free=(x0,z0,x1,z1)=>{
      if(x1>I.x-clearW/2&&x0<I.x+clearW/2&&z1>I.z-clearD/2&&z0<I.z+clearD/2)return false;
      for(const p of I.ports){                           // keep bridge landings open
        const px=p.axis==='x'?p.at:p.c, pz=p.axis==='z'?p.at:p.c;
        if(x1>px-7&&x0<px+7&&z1>pz-7&&z0<pz+7)return false;}
      for(const u of I.used)if(x1>u[0]-1.5&&x0<u[2]+1.5&&z1>u[1]-1.5&&z0<u[3]+1.5)return false;
      return x0>I.x0+1&&z0>I.z0+1&&x1<I.x1-1&&z1<I.z1-1;
    };
    const towers=[];
    const placeTower=(minH,maxH,size)=>{
      for(let k=0;k<80;k++){
        const w=size||6+r()*5, d=size||6+r()*5;
        const cx=I.x0+1+w/2+r()*(I.w-2-w), cz=I.z0+1+d/2+r()*(I.d-2-d);
        if(!free(cx-w/2,cz-d/2,cx+w/2,cz+d/2))continue;
        const h=minH+r()*(maxH-minH);
        const t=box(cx-w/2,y,cz-d/2,cx+w/2,y+h,cz+d/2,'tower');
        I.used.push([t.x0,t.z0,t.x1,t.z1]);towers.push(t);return t;
      }
      return null;
    };
    const anchorOn=t=>{                                   // a grapple point on the edge facing the floor
      const cx=(t.x0+t.x1)/2,cz=(t.z0+t.z1)/2,dx=I.x-cx,dz=I.z-cz;
      const ax=Math.abs(dx)>Math.abs(dz)?(dx>0?t.x1:t.x0):cx, az=Math.abs(dx)>Math.abs(dz)?cz:(dz>0?t.z1:t.z0);
      const a={x:ax,y:t.y1+0.4,z:az,box:W.boxes.indexOf(t)};W.anchors.push(a);return a;
    };
    // a guaranteed climbable rooftop, used for keys and as a launch point
    const roof=placeTower(12,17,9);
    if(roof)anchorOn(roof);
    // crates for cover
    for(let i=0;i<6;i++){const s=1+r()*0.8;for(let k=0;k<20;k++){const cx=I.x0+3+r()*(I.w-6),cz=I.z0+3+r()*(I.d-6);
      if(Math.abs(cx-I.x)<4&&Math.abs(cz-I.z)<4)continue;
      if(!free(cx-s,cz-s,cx+s,cz+s)&&!(Math.abs(cx-I.x)<clearW/2&&Math.abs(cz-I.z)<clearD/2))continue;
      const c=box(cx-s/2,y,cz-s/2,cx+s/2,y+s,cz+s/2,'crate');I.used.push([c.x0,c.z0,c.x1,c.z1]);break;}}
    // items and secrets
    if(o.key&&roof)W.items.push({t:'key',key:o.key,x:(roof.x0+roof.x1)/2,y:roof.y1+1,z:(roof.z0+roof.z1)/2});
    else if(o.key)W.items.push({t:'key',key:o.key,x:I.x,y:y+1,z:I.z});
    for(let i=0;i<(o.stim||0);i++)W.items.push({t:'stim',x:I.x+(r()-0.5)*clearW,y:y+0.8,z:I.z+(r()-0.5)*clearD});
    if(o.shard==='peak'){
      // a needle tower, too tall to grapple from the floor: climb a roof first
      let done=false;
      for(let k=0;k<80&&!done;k++){
        const nx=I.x0+4+r()*(I.w-8), nz=I.z0+4+r()*(I.d-8);
        if(!free(nx-2,nz-2,nx+2,nz+2))continue;
        // it needs a roof within grapple reach: an existing one, or room for a new one
        const near=W.anchors.some(an=>{const t=W.boxes[an.box];return t.k==='tower'&&t.y1>y+8&&Math.hypot(an.x-nx,an.z-nz)<NF_MOVE.grappleReach-3;});
        let support=null;
        if(!near){
          I.used.push([nx-2,nz-2,nx+2,nz+2]);
          for(let j=0;j<40&&!support;j++){
            const a=r()*Math.PI*2,dd=7+r()*5,mx=nx+Math.cos(a)*dd,mz=nz+Math.sin(a)*dd;
            if(free(mx-3.5,mz-3.5,mx+3.5,mz+3.5))support=[mx,mz];
          }
          I.used.pop();
          if(!support)continue;
        }
        const n=box(nx-2,y,nz-2,nx+2,y+30,nz+2,'tower');I.used.push([n.x0,n.z0,n.x1,n.z1]);
        W.anchors.push({x:nx,y:n.y1+0.4,z:nz,box:W.boxes.indexOf(n)});
        W.items.push({t:'shard',x:nx,y:n.y1+1,z:nz});
        if(support){const [mx,mz]=support;const m=box(mx-3.5,y,mz-3.5,mx+3.5,y+14,mz+3.5,'tower');I.used.push([m.x0,m.z0,m.x1,m.z1]);anchorOn(m);}
        done=true;
      }
    }else if(o.shard==='float'){
      // a billboard platform hanging off the far edge, reached by gliding from a roof
      const side=I.ports.some(p=>p.axis==='x'&&p.at===I.x1)?-1:1;
      const px=side>0?I.x1+9:I.x0-9, pz=I.z+(r()-0.5)*8;
      box(px-2.5,y+8,pz-2.5,px+2.5,y+9,pz+2.5,'pad');
      box(px-2.5,y+9,pz-0.2,px+2.5,y+14,pz+0.2,'sign',{nc:1});
      W.items.push({t:'shard',x:px,y:y+10,z:pz});
      W.anchors.push({x:px,y:y+9.4,z:pz,box:W.boxes.length-2});
      if(!roof||roof.y1<y+12){const t=placeTower(14,16,8);if(t)anchorOn(t);}
    }else if(o.shard==='under'){
      // a maintenance ledge under the deck, reached by dropping off the side
      const side=I.ports.some(p=>p.axis==='z'&&p.at===I.z0)?1:-1;
      const lz=side>0?I.z1+1.5:I.z0-1.5;
      box(I.x-2,y-7,lz-1.5,I.x+2,y-6.4,lz+1.5,'ledge');
      W.items.push({t:'shard',x:I.x,y:y-5.6,z:lz});
      W.anchors.push({x:I.x,y:y+0.4,z:side>0?I.z1-0.2:I.z0+0.2,box:W.boxes.indexOf(W.boxes.find(b=>b.k==='deck'&&b.x0===I.x0&&b.z0===I.z0))});
    }
    // then the skyline of the island itself
    const nT=2+((r()*2)|0);
    for(let i=0;i<nT;i++){const t=placeTower(12,30);if(t&&r()<0.75)anchorOn(t);}
    if(o.vent){
      const vx=I.x+(I.ports.some(p=>p.axis==='x'&&p.at===I.x1)?I.w/2-6:-I.w/2+6)*0.6, vz=I.z;
      box(vx-1.5,y,vz-1.5,vx+1.5,y+0.4,vz+1.5,'vent',{nc:1});
      W.vents.push({x:vx,y:y,z:vz,r:3,lift:NF_MOVE.ventLift+6,box:W.boxes.findIndex(b=>b.k==='deck'&&b.x0===I.x0&&b.z0===I.z0)});
    }
    if(o.start)W.start={x:I.x,y:y+0.05,z:I.z1-5,face:Math.PI};
    if(o.exit){W.exit={x:I.x,y:y,z:I.z,island:id};}
    // enemies spread across the floor
    const es=(o.e||'').split('');
    es.forEach((ch,i)=>{
      const a=i/es.length*Math.PI*2+r()*0.6, rad=ch==='W'?0:3+r()*Math.min(clearW,clearD)*0.4;
      W.enemies.push({t:{t:'thug',g:'guard',h:'hacker',d:'drone',m:'mech',W:'warden'}[ch],x:I.x+Math.cos(a)*rad,y:y,z:I.z+Math.sin(a)*rad,island:id});
    });
  }
  // bridges, stepped so a height change is a walkable staircase, with gatehouses
  for(const L of links){
    const {A,B,key,s}=L, len=Math.abs(s.b-s.a), dir=Math.sign(s.b-s.a);
    const steps=Math.max(1,Math.ceil(Math.abs(B.y-A.y)/0.4)), n=Math.max(steps,6), seg=len/n;
    const gateIdx=key?Math.floor(n/2):-1;
    for(let i=0;i<n;i++){
      const t0=s.a+dir*seg*i, t1=s.a+dir*seg*(i+1), h=A.y+(B.y-A.y)*((i+0.5)/n);
      const b=s.axis==='x'?box(t0,h-0.6,s.c-2.2,t1,h,s.c+2.2,'bridge'):box(s.c-2.2,h-0.6,t0,s.c+2.2,h,t1,'bridge');
      if(i===gateIdx){
        b.gate=key;
        const mid=(t0+t1)/2;
        const P=(u0,u1,v0,v1,y0,y1,k,o)=>s.axis==='x'?box(u0,y0,v0,u1,y1,v1,k,o):box(v0,y0,u0,v1,y1,u1,k,o);
        P(mid-0.8,mid+0.8,s.c-6.5,s.c-2.2,h-0.6,h+9,'frame');P(mid-0.8,mid+0.8,s.c+2.2,s.c+6.5,h-0.6,h+9,'frame');
        P(mid-0.8,mid+0.8,s.c-2.2,s.c+2.2,h+6.2,h+9,'frame');
        const g=P(mid-0.25,mid+0.25,s.c-2.2,s.c+2.2,h,h+6.2,'gate',{key});
        W.gates.push({box:W.boxes.indexOf(g),key,floor:W.boxes.indexOf(b)});
      }
      // low rails along the bridge
      if(s.axis==='x'){box(t0,h,s.c-2.2,t1,h+1,s.c-1.95,'rail');box(t0,h,s.c+1.95,t1,h+1,s.c+2.2,'rail');}
      else{box(s.c-2.2,h,t0,s.c-1.95,h+1,t1,'rail');box(s.c+1.95,h,t0,s.c+2.2,h+1,t1,'rail');}
    }
  }
  return W;
}

/* --------------------------------------------- the finishability checker */
function nfCheck(W){
  const P=[];
  const nodes=[];W.boxes.forEach((b,i)=>{if(NF_WALK.has(b.k)&&!b.nc)nodes.push(i);});
  const B=W.boxes;
  const rectGap=(a,b)=>{const dx=Math.max(0,a.x0-b.x1,b.x0-a.x1),dz=Math.max(0,a.z0-b.z1,b.z0-a.z1);return Math.hypot(dx,dz);};
  const closest=(a,b)=>{                                // closest points of two rectangles, for gate blocking
    const cx=(lo0,hi0,lo1,hi1)=>{const lo=Math.max(lo0,lo1),hi=Math.min(hi0,hi1);return lo<=hi?[(lo+hi)/2,(lo+hi)/2]:hi0<lo1?[hi0,lo1]:[lo0,hi1];};
    const X=cx(a.x0,a.x1,b.x0,b.x1),Z=cx(a.z0,a.z1,b.z0,b.z1);return[X[0],Z[0],X[1],Z[1]];
  };
  const segHits=(s,g)=>{                                // does segment s cross rectangle g (expanded)
    const e=0.3,x0=g.x0-e,x1=g.x1+e,z0=g.z0-e,z1=g.z1+e;let t0=0,t1=1;const dx=s[2]-s[0],dz=s[3]-s[1];
    for(const [p,d,lo,hi] of [[s[0],dx,x0,x1],[s[1],dz,z0,z1]]){
      if(Math.abs(d)<1e-9){if(p<lo||p>hi)return false;continue;}
      let a=(lo-p)/d,b=(hi-p)/d;if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1)return false;}
    return true;
  };
  const vented=new Set(W.vents.map(v=>v.box));
  const start=nodes.find(i=>{const b=B[i];return W.start.x>=b.x0&&W.start.x<=b.x1&&W.start.z>=b.z0&&W.start.z<=b.z1&&Math.abs(b.y1-W.start.y)<0.3;});
  if(start===undefined)return['the start is not on a walkable surface'];
  const have=new Set();let seen=new Set();
  const M=NF_MOVE;
  for(let pass=0;pass<8;pass++){
    seen=new Set([start]);const q=[start];
    const locked=W.gates.filter(g=>!have.has(g.key)).map(g=>B[g.floor]);
    while(q.length){
      const ai=q.pop(),a=B[ai];
      const try_=bi=>{if(seen.has(bi))return;const b=B[bi];
        if(b.gate&&!have.has(b.gate))return;
        seen.add(bi);q.push(bi);};
      for(const bi of nodes){
        if(seen.has(bi))continue;
        const b=B[bi], gap=rectGap(a,b), dy=b.y1-a.y1;
        const lift=vented.has(ai)?M.ventLift:0;
        let ok=(gap<=0.6&&dy<=M.climb)||(gap<=M.jumpGap&&dy<=M.jumpUp)||(dy<0&&gap<=4+M.glideRatio*(-dy))||(lift&&dy<lift&&gap<=4+M.glideRatio*(lift-dy));
        if(ok&&gap>0.6){const c=closest(a,b);if(locked.some(g=>g!==b&&segHits(c,g)))ok=false;}
        if(ok)try_(bi);
      }
      for(const an of W.anchors){
        if(seen.has(an.box))continue;
        const dx=Math.max(0,a.x0-an.x,an.x-a.x1),dz=Math.max(0,a.z0-an.z,an.z-a.z1);
        if(Math.hypot(dx,dz)<=M.grappleReach&&an.y-a.y1<=M.grappleRise&&an.y-a.y1>=-4)try_(an.box);
      }
    }
    let grew=false;
    for(const it of W.items)if(it.t==='key'&&!have.has(it.key)&&onSeen(it))
      {have.add(it.key);grew=true;}
    if(!grew)break;
  }
  function onSeen(p){                                   // an item or enemy stands on a reached surface
    for(const i of seen){const b=B[i];if(p.x>=b.x0-0.2&&p.x<=b.x1+0.2&&p.z>=b.z0-0.2&&p.z<=b.z1+0.2&&Math.abs(p.y-b.y1)<1.6)return true;}
    return false;
  }
  for(const it of W.items)if(!onSeen(it))P.push('unreachable '+it.t+(it.key||'')+' at '+it.x.toFixed(1)+','+it.y.toFixed(1)+','+it.z.toFixed(1));
  for(const e of W.enemies)if(e.t!=='drone'&&!onSeen(e))P.push('unreachable '+e.t+' at '+e.x.toFixed(1)+','+e.z.toFixed(1));
  if(!W.exit||!onSeen({x:W.exit.x,y:W.exit.y,z:W.exit.z}))P.push('exit not reachable');
  for(const g of W.gates)if(!W.items.some(it=>it.t==='key'&&it.key===g.key))P.push('gate '+g.key+' has no key');
  return P;
}

/* ------------------------------------------------- Overdrive and the daily run */
function nfArena(seed){
  return nfBuild({name:'OVERDRIVE',seed:seed>>>0,islands:[['a',0,0,58,58,30,{start:1,stim:0}]],links:[]});
}
const NF_TWISTS=[
  {id:'swarm', name:'SWARM',      d:'twice the drones'},
  {id:'glass', name:'GLASS',      d:'everything hits twice as hard, you included'},
  {id:'ghost', name:'GHOSTS',     d:'hackers in every wave'},
  {id:'heavy', name:'HEAVY METAL',d:'a mech every third wave'},
  {id:'rush',  name:'RUSH HOUR',  d:'enemies move faster'},
  {id:'scav',  name:'SCAVENGER',  d:'half the pickups, double the score'}
];
function nfDaily(date){
  const d=date||new Date();
  const key=d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();
  const r=nfRand(key*2654435761>>>0);
  return{key,label:String(key).replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'),seed:(key*40503)>>>0,twist:NF_TWISTS[(r()*NF_TWISTS.length)|0]};
}

if(typeof module!=='undefined')module.exports={NF_DISTRICTS,NF_MOVE,nfBuild,nfCheck,nfArena,nfDaily,NF_TWISTS};
