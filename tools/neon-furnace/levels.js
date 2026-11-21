/* ------------------------------------------------------------ the city
   Each district is a handful of islands of towers hanging over a fogged
   chasm, joined by bridges, cranes and an elevator. A district is described
   in a few lines below and built into plain boxes by nfBuild(); the same
   boxes are what you see, what you collide with, and what nfCheck() walks to
   prove the district can be finished: every key reachable before its gate,
   every enemy, shard, tag and radio reachable, using movement rules a little
   weaker than the real ones (jump, double jump, glide, grapple, updrafts).   */
const NF_MOVE={
  run:7.5, gravity:24, jump:9.2, jump2:8.0, glideFall:2.0, glideSpeed:11,
  grappleRange:30, dash:17,
  climb:2.6, jumpGap:4.5, jumpUp:1.0, glideRatio:4, grappleReach:20, grappleRise:24, ventLift:16
};
const NF_WALK=new Set(['deck','tower','bridge','crate','ledge','pad','prop','server']);
const NF_ENEMY={t:'thug',g:'guard',h:'hacker',d:'drone',m:'mech',s:'shield',k:'knife',b:'brute',z:'baton',n:'ninja',p:'sniper'};

/* Islands: [id, x, z, width, depth, deck height, options]
   e      enemies, one letter each (see NF_ENEMY)      boss   'chain' | 'twins' | 'hammer' | 'atlas' | 'warden'
   key    a keycard on a rooftop                       hide   secrets: 'shard@peak', 'tag@float', 'radio@roof2', 'tag@under' ...
   civ    passers-by                                   vent   updraft vents        stim   health      start, exit
   Links: [from, to, key] bridges. movers: cranes or an elevator in place of a bridge. lasers: fences on a bridge. */
const NF_DISTRICTS=[
{name:'UNDERCITY MARKET',par:330,seed:11,theme:'market',kind:'market',bpm:128,root:45,rain:true,
 islands:[
  ['a',   0,   0, 44, 32, 0, {start:1,e:'ttt',stim:1,civ:5,hide:['tag@roof']}],
  ['b',   0, -60, 40, 36, 2, {e:'tttkg',key:'B',civ:4,hide:['shard@peak','radio@roof2']}],
  ['c',  64, -60, 40, 40, 4, {e:'tsthd',stim:1,civ:3,hide:['tag@float','shard@under']}],
  ['d',  64,  12, 44, 36, 1, {e:'ttgk',exit:1,boss:'chain',stim:1,civ:2,hide:['tag@under']}]],
 links:[['a','b'],['b','c','B'],['c','d']]},
{name:'DATA VAULT',par:390,seed:23,theme:'vault',kind:'vault',bpm:130,root:41,rain:false,
 islands:[
  ['a',   0,   0, 36, 30, 18, {start:1,e:'tgg',stim:1,hide:['tag@roof']}],
  ['b',  58,   0, 40, 36, 20, {e:'tzhdd',key:'B',hide:['shard@float']}],
  ['c',  58, -64, 44, 40, 24, {e:'tgzsh',key:'Y',stim:1,hide:['radio@roof2']}],
  ['e',   0, -64, 40, 36, 22, {e:'tthdp',hide:['shard@peak','tag@under']}],
  ['f',   0,-128, 48, 44, 26, {e:'ttgh',exit:1,boss:'twins',stim:2,hide:['tag@float']}]],
 links:[['a','b'],['b','c','B'],['c','e'],['e','f','Y']],lasers:[['c','e']]},
{name:'NEON ROOFTOPS',par:360,seed:37,theme:'roof',kind:'roof',bpm:132,root:38,rain:true,
 islands:[
  ['a',   0,   0, 34, 30, 40, {start:1,e:'tt',vent:1,stim:1,hide:['tag@roof']}],
  ['b',  70,   0, 36, 34, 38, {e:'ttgdp',vent:1,key:'B',hide:['radio@roof2']}],
  ['c',  70, -66, 38, 36, 44, {e:'tndd',stim:1,hide:['shard@float','tag@under']}],
  ['d', 140, -66, 40, 40, 42, {e:'ttbhg',vent:1,hide:['shard@peak']}],
  ['e', 140,   4, 46, 40, 40, {e:'ttgd',exit:1,boss:'hammer',stim:2,hide:['tag@float']}]],
 links:[['c','d','B'],['d','e']],glides:[['a','b']],movers:[{a:'b',b:'c',type:'crane'}],rings:['a','b']},
{name:'THE CORE',par:450,seed:53,theme:'core',kind:'core',bpm:134,root:36,rain:false,
 islands:[
  ['a',   0,   0, 36, 32, 10, {start:1,e:'ttg',stim:1,hide:['tag@under']}],
  ['b',  60,   0, 40, 36, 12, {e:'tthzg',key:'B',hide:['shard@float']}],
  ['c',  60, -64, 52, 48, 14, {e:'tsbgm',key:'Y',stim:1,reactor:1,hide:['tag@roof2','shard@under']}],
  ['d',   0, -64, 40, 40, 16, {e:'tnnhd',key:'R',hide:['radio@roof2','tag@float']}],
  ['f', -66, -64, 48, 44, 18, {e:'ttgk',exit:1,boss:'atlas',stim:2}]],
 links:[['a','b'],['b','c','B'],['c','d','Y']],movers:[{a:'d',b:'f',type:'crane',key:'R'}],conveyors:['b','d']},
{name:'THE SPIRE',par:520,seed:71,theme:'spire',kind:'spire',bpm:136,root:40,rain:false,wind:true,
 islands:[
  ['a',   0,   0, 36, 32, 50, {start:1,e:'tggd',stim:1,hide:['tag@roof']}],
  ['b',  60,   0, 40, 36, 54, {e:'tnhsg',key:'B',hide:['shard@float']}],
  ['c',  60, -64, 40, 40, 58, {e:'tbzgdm',key:'Y',stim:1,hide:['radio@roof2','tag@under']}],
  ['d',   0, -64, 36, 36, 62, {e:'tnnkp',stim:2,hide:['shard@peak','tag@float']}],
  ['w',   0,-118, 56, 56, 96, {e:'',exit:1,boss:'warden',stim:2}]],
 links:[['a','b'],['b','c','B'],['c','d']],movers:[{a:'d',b:'w',type:'elevator',key:'Y'}]}
];

function nfRand(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function lerpN(a,b,t){return a+(b-a)*t;}

/* Build a district into boxes, anchors, vents, items, enemies, gates and movers. */
function nfBuild(D){
  const r=nfRand(D.seed*7919+1);
  const W={boxes:[],anchors:[],vents:[],items:[],enemies:[],gates:[],movers:[],lasers:[],rings:[],civs:[],bosses:[],islands:{},start:null,exit:null,name:D.name,kind:D.kind||'market',wind:!!D.wind,conveyors:D.conveyors||[]};
  const box=(x0,y0,z0,x1,y1,z1,k,o)=>{const b=Object.assign({x0:Math.min(x0,x1),y0:Math.min(y0,y1),z0:Math.min(z0,z1),x1:Math.max(x0,x1),y1:Math.max(y0,y1),z1:Math.max(z0,z1),k,s:(r()*1e6)|0},o||{});W.boxes.push(b);return b;};
  const isl={};
  for(const [id,x,z,w,d,y,o] of D.islands)isl[id]={id,x,z,w,d,y,o:o||{},x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,ports:[],used:[],deck:null};
  W.islands=isl;
  const linkSides=(A,B)=>{
    const dx=B.x-A.x,dz=B.z-A.z;
    if(Math.abs(dx)>=Math.abs(dz)){const zc=(Math.max(A.z0,B.z0)+Math.min(A.z1,B.z1))/2;return dx>0?{axis:'x',a:A.x1,b:B.x0,c:zc}:{axis:'x',a:A.x0,b:B.x1,c:zc};}
    const xc=(Math.max(A.x0,B.x0)+Math.min(A.x1,B.x1))/2;return dz>0?{axis:'z',a:A.z1,b:B.z0,c:xc}:{axis:'z',a:A.z0,b:B.z1,c:xc};
  };
  const links=(D.links||[]).map(([a,b,key])=>({A:isl[a],B:isl[b],key,s:linkSides(isl[a],isl[b])}));
  const port=(I,s,end)=>I.ports.push({axis:s.axis,at:end?s.b:s.a,c:s.c});
  for(const L of links){port(L.A,L.s,0);port(L.B,L.s,1);}
  for(const [a,b] of (D.glides||[])){const s=linkSides(isl[a],isl[b]);port(isl[a],s,0);port(isl[b],s,1);}
  for(const m of (D.movers||[])){if(m.type==='crane'){const s=linkSides(isl[m.a],isl[m.b]);port(isl[m.a],s,0);port(isl[m.b],s,1);}
    else{const A=isl[m.a];A.ports.push({axis:'z',at:A.z0,c:A.x});const B=isl[m.b];B.ports.push({axis:'z',at:B.z1,c:A.x});}}

  for(const id in isl){
    const I=isl[id], y=I.y, o=I.o;
    I.deck=box(I.x0,y-2.5,I.z0,I.x1,y,I.z1,'deck');
    box(I.x0+2,y-9,I.z0+2,I.x1-2,y-2.5,I.z1-2,'under',{nc:1});
    for(const [px,pz] of [[I.x0+5,I.z0+5],[I.x1-5,I.z0+5],[I.x0+5,I.z1-5],[I.x1-5,I.z1-5]])box(px-1.6,y-140,pz-1.6,px+1.6,y-9,pz+1.6,'pillar',{nc:1});
    const gapAt=(axis,at,c)=>I.ports.some(p=>p.axis===axis&&Math.abs(p.at-at)<0.1&&Math.abs(p.c-c)<3.2);
    for(let t=I.x0;t<I.x1-0.01;t+=2){const c=t+1;
      if(!gapAt('z',I.z0,c))box(t,y,I.z0,t+2,y+1.1,I.z0+0.3,'rail');
      if(!gapAt('z',I.z1,c))box(t,y,I.z1-0.3,t+2,y+1.1,I.z1,'rail');}
    for(let t=I.z0;t<I.z1-0.01;t+=2){const c=t+1;
      if(!gapAt('x',I.x0,c))box(I.x0,y,t,I.x0+0.3,y+1.1,t+2,'rail');
      if(!gapAt('x',I.x1,c))box(I.x1-0.3,y,t,I.x1,y+1.1,t+2,'rail');}
    const clearW=Math.min(I.w-14,o.boss?30:18), clearD=Math.min(I.d-14,o.boss?28:14);
    const free=(x0,z0,x1,z1)=>{
      if(x1>I.x-clearW/2&&x0<I.x+clearW/2&&z1>I.z-clearD/2&&z0<I.z+clearD/2)return false;
      for(const p of I.ports){const px=p.axis==='x'?p.at:p.c, pz=p.axis==='z'?p.at:p.c;if(x1>px-7&&x0<px+7&&z1>pz-7&&z0<pz+7)return false;}
      for(const u of I.used)if(x1>u[0]-1.5&&x0<u[2]+1.5&&z1>u[1]-1.5&&z0<u[3]+1.5)return false;
      return x0>I.x0+1&&z0>I.z0+1&&x1<I.x1-1&&z1<I.z1-1;
    };
    const placeTower=(minH,maxH,size,kind)=>{
      for(let k=0;k<80;k++){
        const w=size||6+r()*5, d=size||6+r()*5;
        const cx=I.x0+1+w/2+r()*(I.w-2-w), cz=I.z0+1+d/2+r()*(I.d-2-d);
        if(!free(cx-w/2,cz-d/2,cx+w/2,cz+d/2))continue;
        const t=box(cx-w/2,y,cz-d/2,cx+w/2,y+minH+r()*(maxH-minH),cz+d/2,kind||'tower');
        I.used.push([t.x0,t.z0,t.x1,t.z1]);return t;
      }
      return null;
    };
    const anchorOn=t=>{
      const cx=(t.x0+t.x1)/2,cz=(t.z0+t.z1)/2,dx=I.x-cx,dz=I.z-cz;
      const ax=Math.abs(dx)>Math.abs(dz)?(dx>0?t.x1:t.x0):cx, az=Math.abs(dx)>Math.abs(dz)?cz:(dz>0?t.z1:t.z0);
      const a={x:ax,y:t.y1+0.4,z:az,box:W.boxes.indexOf(t)};W.anchors.push(a);return a;
    };
    const roof=placeTower(12,17,9)||placeTower(12,16,6.5)||placeTower(11,14,5);if(roof)anchorOn(roof);
    let roof2=null;
    const put=(what,x,yy,z)=>W.items.push({t:what,x,y:yy,z,island:id});
    for(const h of (o.hide||[])){
      const [what,where]=h.split('@');
      if(where==='roof'&&roof)put(what,roof.x0+1.4,roof.y1+1,roof.z0+1.4);
      else if(where==='roof2'){if(!roof2){roof2=placeTower(13,18,7);if(roof2)anchorOn(roof2);}if(roof2)put(what,(roof2.x0+roof2.x1)/2,roof2.y1+1,(roof2.z0+roof2.z1)/2);}
      else if(where==='peak'){
        let done=false;
        for(let k=0;k<80&&!done;k++){
          const nx=I.x0+4+r()*(I.w-8), nz=I.z0+4+r()*(I.d-8);
          if(!free(nx-2,nz-2,nx+2,nz+2))continue;
          const near=W.anchors.some(an=>{const t=W.boxes[an.box];return t.k==='tower'&&t.y1>y+8&&Math.hypot(an.x-nx,an.z-nz)<NF_MOVE.grappleReach-3;});
          let support=null;
          if(!near){I.used.push([nx-2,nz-2,nx+2,nz+2]);
            for(let j=0;j<40&&!support;j++){const a=r()*Math.PI*2,dd=7+r()*5,mx=nx+Math.cos(a)*dd,mz=nz+Math.sin(a)*dd;if(free(mx-3.5,mz-3.5,mx+3.5,mz+3.5))support=[mx,mz];}
            I.used.pop();if(!support)continue;}
          const n=box(nx-2,y,nz-2,nx+2,y+30,nz+2,'tower');I.used.push([n.x0,n.z0,n.x1,n.z1]);
          W.anchors.push({x:nx,y:n.y1+0.4,z:nz,box:W.boxes.indexOf(n)});
          put(what,nx,n.y1+1,nz);
          if(support){const [mx,mz]=support;const m=box(mx-3.5,y,mz-3.5,mx+3.5,y+14,mz+3.5,'tower');I.used.push([m.x0,m.z0,m.x1,m.z1]);anchorOn(m);}
          done=true;
        }
      }else if(where==='float'){
        const side=I.ports.some(p=>p.axis==='x'&&p.at===I.x1)?-1:1;
        const px=side>0?I.x1+9:I.x0-9, pz=I.z+(r()-0.5)*8;
        const pad=box(px-2.5,y+8,pz-2.5,px+2.5,y+9,pz+2.5,'pad');
        box(px-2.5,y+9,pz-0.2,px+2.5,y+14,pz+0.2,'sign',{nc:1});
        put(what,px,y+10,pz+1.2);
        W.anchors.push({x:px,y:y+9.4,z:pz,box:W.boxes.indexOf(pad)});
        if(!roof||roof.y1<y+12){const t=placeTower(14,16,8);if(t)anchorOn(t);}
      }else if(where==='under'){
        const side=I.ports.some(p=>p.axis==='z'&&p.at===I.z0)?1:-1;
        const lz=side>0?I.z1+1.5:I.z0-1.5;
        box(I.x-2,y-7,lz-1.5,I.x+2,y-6.4,lz+1.5,'ledge');
        put(what,I.x,y-5.6,lz);
        W.anchors.push({x:I.x,y:y+0.4,z:side>0?I.z1-0.2:I.z0+0.2,box:W.boxes.indexOf(I.deck)});
      }
    }
    if(o.key&&roof)W.items.push({t:'key',key:o.key,x:(roof.x0+roof.x1)/2,y:roof.y1+1,z:(roof.z0+roof.z1)/2,island:id});
    else if(o.key)W.items.push({t:'key',key:o.key,x:I.x,y:y+1,z:I.z,island:id});
    const kind=D.kind||'market';
    const nT=2+((r()*2)|0);
    for(let i=0;i<nT;i++){const t=placeTower(12,30,null,kind==='vault'&&r()<0.5?'server':'tower');if(t&&r()<0.75&&t.k==='tower')anchorOn(t);}
    // themed props you can stand on: stalls, water tanks, cooling units, server racks
    const nP=kind==='market'?7:4;
    for(let i=0;i<nP;i++){
      const [pw,pd,ph]=kind==='market'?[3,2,1.2]:kind==='roof'?[3,3,2.4]:kind==='vault'?[1.6,3,2.2]:kind==='core'?[2.4,2.4,1.8]:[2,2,1.4];
      for(let k=0;k<30;k++){const cx=I.x0+3+r()*(I.w-6),cz=I.z0+3+r()*(I.d-6);
        if(Math.abs(cx-I.x)<clearW/2+1&&Math.abs(cz-I.z)<clearD/2+1)continue;
        if(o.start&&Math.abs(cx-I.x)<6&&cz>I.z1-14)continue;          // keep the opening shot clear
        if(!free(cx-pw/2,cz-pd/2,cx+pw/2,cz+pd/2))continue;
        const p=box(cx-pw/2,y,cz-pd/2,cx+pw/2,y+ph,cz+pd/2,'prop',{theme:kind});I.used.push([p.x0,p.z0,p.x1,p.z1]);break;}
    }
    for(let i=0;i<3;i++){const s=1+r()*0.8;for(let k=0;k<20;k++){const cx=I.x0+3+r()*(I.w-6),cz=I.z0+3+r()*(I.d-6);
      if(Math.abs(cx-I.x)<clearW/2&&Math.abs(cz-I.z)<clearD/2)continue;
      if(o.start&&Math.abs(cx-I.x)<6&&cz>I.z1-14)continue;
      if(!free(cx-s,cz-s,cx+s,cz+s))continue;
      const c=box(cx-s/2,y,cz-s/2,cx+s/2,y+s,cz+s/2,'crate');I.used.push([c.x0,c.z0,c.x1,c.z1]);break;}}
    for(let i=0;i<(o.stim||0);i++)W.items.push({t:'stim',x:I.x+(r()-0.5)*clearW,y:y+0.8,z:I.z+(r()-0.5)*clearD,island:id});
    if(o.vent){
      const vx=I.x+(I.ports.some(p=>p.axis==='x'&&p.at===I.x1)?I.w/2-6:-I.w/2+6)*0.6, vz=I.z;
      box(vx-1.5,y,vz-1.5,vx+1.5,y+0.4,vz+1.5,'vent',{nc:1});
      W.vents.push({x:vx,y,z:vz,r:3,lift:NF_MOVE.ventLift+6,box:W.boxes.indexOf(I.deck)});
    }
    if(o.reactor)W.reactor={x:I.x,y,z:I.z};
    if(o.start)W.start={x:I.x,y:y+0.05,z:I.z1-9,face:Math.PI};
    if(o.exit)W.exit={x:I.x,y,z:I.z0+6,island:id};
    if(o.boss)W.bosses.push({t:o.boss,x:I.x,y,z:I.z,island:id});
    for(let i=0;i<(o.civ||0);i++)W.civs.push({x:I.x+(r()-0.5)*(I.w-10),y,z:I.z+(r()-0.5)*(I.d-10),island:id});
    const es=(o.e||'').split('');
    es.forEach((ch,i)=>{
      const t=NF_ENEMY[ch];if(!t)return;
      if(t==='sniper'){const t2=roof2||roof;if(t2){W.enemies.push({t,x:t2.x1-1,y:t2.y1,z:t2.z1-1,island:id});return;}}
      const a=i/es.length*Math.PI*2+r()*0.6, rad=3+r()*Math.min(clearW,clearD)*0.4;
      W.enemies.push({t,x:I.x+Math.cos(a)*rad,y,z:I.z+Math.sin(a)*rad,island:id});
    });
  }
  // bridges: stepped, with gatehouses and laser fences
  const laserOn=new Set((D.lasers||[]).map(([a,b])=>a+b));
  for(const L of links){
    const {A,B,key,s}=L, len=Math.abs(s.b-s.a), dir=Math.sign(s.b-s.a);
    const steps=Math.max(1,Math.ceil(Math.abs(B.y-A.y)/0.4)), n=Math.max(steps,6), seg=len/n;
    const gateIdx=key?Math.floor(n/2):-1;
    for(let i=0;i<n;i++){
      const t0=s.a+dir*seg*i, t1=s.a+dir*seg*(i+1), h=A.y+(B.y-A.y)*((i+0.5)/n);
      const b=s.axis==='x'?box(t0,h-0.6,s.c-2.2,t1,h,s.c+2.2,'bridge'):box(s.c-2.2,h-0.6,t0,s.c+2.2,h,t1,'bridge');
      const P=(u0,u1,v0,v1,y0,y1,k,o)=>s.axis==='x'?box(u0,y0,v0,u1,y1,v1,k,o):box(v0,y0,u0,v1,y1,u1,k,o);
      if(i===gateIdx){
        b.gate=key;const mid=(t0+t1)/2;
        P(mid-0.8,mid+0.8,s.c-6.5,s.c-2.2,h-0.6,h+9,'frame');P(mid-0.8,mid+0.8,s.c+2.2,s.c+6.5,h-0.6,h+9,'frame');
        P(mid-0.8,mid+0.8,s.c-2.2,s.c+2.2,h+6.2,h+9,'frame');
        const g=P(mid-0.25,mid+0.25,s.c-2.2,s.c+2.2,h,h+6.2,'gate',{key});
        W.gates.push({box:W.boxes.indexOf(g),key,floor:W.boxes.indexOf(b)});
      }
      if(laserOn.has(A.id+B.id)&&i>0&&i<n-1&&i!==gateIdx&&i%2===1)W.lasers.push({axis:s.axis,at:(t0+t1)/2,c:s.c,y:h,phase:i*0.9});
      if(s.axis==='x'){box(t0,h,s.c-2.2,t1,h+1,s.c-1.95,'rail');box(t0,h,s.c+1.95,t1,h+1,s.c+2.2,'rail');}
      else{box(s.c-2.2,h,t0,s.c-1.95,h+1,t1,'rail');box(s.c+1.95,h,t0,s.c+2.2,h+1,t1,'rail');}
    }
  }
  // cranes shuttle a platform between two islands; the elevator lifts one up to the next
  for(const m of (D.movers||[])){
    const A=isl[m.a],B=isl[m.b];
    if(m.type==='crane'){const s=linkSides(A,B),k=s.b>s.a?2.6:-2.6;
      const p0=s.axis==='x'?[s.a+k,A.y,s.c]:[s.c,A.y,s.a+k], p1=s.axis==='x'?[s.b-k,B.y,s.c]:[s.c,B.y,s.b-k];
      W.movers.push({type:'crane',a:m.a,b:m.b,key:m.key||null,p0,p1,hw:2.5,hd:2.5,period:Math.hypot(p1[0]-p0[0],p1[2]-p0[2])/5+4,wait:2});
    }else{
      const ex=A.x,ez=A.z0-3,top=B.y;
      W.movers.push({type:'elevator',a:m.a,b:m.b,key:m.key||null,p0:[ex,A.y,ez],p1:[ex,top,ez],hw:2.6,hd:2.6,period:16,wait:2.5});
      box(ex-2.2,top-0.6,B.z1,ex+2.2,top,ez-2.6,'bridge');          // a walkway from the top of the shaft
      box(ex-2.2,A.y-0.6,ez+2.6,ex+2.2,A.y,A.z0,'bridge');           // and one onto it from below
    }
  }
  if(D.rings){const A=isl[D.rings[0]],B=isl[D.rings[1]];
    for(let i=1;i<=6;i++){const t=i/7;W.rings.push({x:lerpN(A.x,B.x,t),y:A.y+14-t*8+Math.sin(t*Math.PI)*8,z:lerpN(A.z,B.z,t)+Math.sin(t*6)*3});}}
  return W;
}

/* --------------------------------------------- the finishability checker */
function nfCheck(W){
  const P=[];
  const nodes=[];W.boxes.forEach((b,i)=>{if(NF_WALK.has(b.k)&&!b.nc)nodes.push(i);});
  const B=W.boxes;
  const rectGap=(a,b)=>{const dx=Math.max(0,a.x0-b.x1,b.x0-a.x1),dz=Math.max(0,a.z0-b.z1,b.z0-a.z1);return Math.hypot(dx,dz);};
  const closest=(a,b)=>{
    const cx=(lo0,hi0,lo1,hi1)=>{const lo=Math.max(lo0,lo1),hi=Math.min(hi0,hi1);return lo<=hi?[(lo+hi)/2,(lo+hi)/2]:hi0<lo1?[hi0,lo1]:[lo0,hi1];};
    const X=cx(a.x0,a.x1,b.x0,b.x1),Z=cx(a.z0,a.z1,b.z0,b.z1);return[X[0],Z[0],X[1],Z[1]];
  };
  const segHits=(s,g)=>{const e=0.3,x0=g.x0-e,x1=g.x1+e,z0=g.z0-e,z1=g.z1+e;let t0=0,t1=1;const dx=s[2]-s[0],dz=s[3]-s[1];
    for(const [p,d,lo,hi] of [[s[0],dx,x0,x1],[s[1],dz,z0,z1]]){if(Math.abs(d)<1e-9){if(p<lo||p>hi)return false;continue;}
      let a=(lo-p)/d,b=(hi-p)/d;if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1)return false;}return true;};
  const vented=new Set(W.vents.map(v=>v.box));
  const deckOf=id=>{const I=W.islands[id];return W.boxes.findIndex(b=>b.k==='deck'&&b.x0===I.x0&&b.z0===I.z0);};
  const start=nodes.find(i=>{const b=B[i];return W.start.x>=b.x0&&W.start.x<=b.x1&&W.start.z>=b.z0&&W.start.z<=b.z1&&Math.abs(b.y1-W.start.y)<0.3;});
  if(start===undefined)return['the start is not on a walkable surface'];
  const have=new Set();let seen=new Set();
  const M=NF_MOVE;
  for(let pass=0;pass<8;pass++){
    seen=new Set([start]);const q=[start];
    const locked=W.gates.filter(g=>!have.has(g.key)).map(g=>B[g.floor]);
    while(q.length){
      const ai=q.pop(),a=B[ai];
      const go=bi=>{if(bi<0||seen.has(bi))return;const b=B[bi];if(b.gate&&!have.has(b.gate))return;seen.add(bi);q.push(bi);};
      for(const bi of nodes){
        if(seen.has(bi))continue;
        const b=B[bi],gap=rectGap(a,b),dy=b.y1-a.y1,lift=vented.has(ai)?M.ventLift:0;
        let ok=(gap<=0.6&&dy<=M.climb)||(gap<=M.jumpGap&&dy<=M.jumpUp)||(dy<0&&gap<=4+M.glideRatio*(-dy))||(lift&&dy<lift&&gap<=4+M.glideRatio*(lift-dy));
        if(ok&&gap>0.6){const c=closest(a,b);if(locked.some(g=>g!==b&&segHits(c,g)))ok=false;}
        if(ok)go(bi);
      }
      for(const an of W.anchors){
        if(seen.has(an.box))continue;
        const dx=Math.max(0,a.x0-an.x,an.x-a.x1),dz=Math.max(0,a.z0-an.z,an.z-a.z1);
        if(Math.hypot(dx,dz)<=M.grappleReach&&an.y-a.y1<=M.grappleRise&&an.y-a.y1>=-4)go(an.box);
      }
      for(const m of W.movers){                         // a crane or the elevator joins its islands once its key is held
        if(m.key&&!have.has(m.key))continue;
        const da=deckOf(m.a),db=deckOf(m.b);
        if(ai===da)go(db);else if(ai===db)go(da);
      }
    }
    let grew=false;
    for(const it of W.items)if(it.t==='key'&&!have.has(it.key)&&onSeen(it)){have.add(it.key);grew=true;}
    if(!grew)break;
  }
  function onSeen(p){for(const i of seen){const b=B[i];if(p.x>=b.x0-0.2&&p.x<=b.x1+0.2&&p.z>=b.z0-0.2&&p.z<=b.z1+0.2&&Math.abs(p.y-b.y1)<1.6)return true;}return false;}
  for(const it of W.items)if(!onSeen(it))P.push('unreachable '+it.t+(it.key||'')+' at '+it.x.toFixed(1)+','+it.y.toFixed(1)+','+it.z.toFixed(1));
  for(const e of W.enemies)if(e.t!=='drone'&&!onSeen(e))P.push('unreachable '+e.t+' at '+e.x.toFixed(1)+','+e.z.toFixed(1));
  for(const b of W.bosses)if(!onSeen(b))P.push('unreachable boss '+b.t);
  if(W.exit&&!onSeen({x:W.exit.x,y:W.exit.y,z:W.exit.z}))P.push('exit not reachable');
  for(const g of W.gates)if(!W.items.some(it=>it.t==='key'&&it.key===g.key))P.push('gate '+g.key+' has no key');
  for(const m of W.movers)if(m.key&&!W.items.some(it=>it.t==='key'&&it.key===m.key))P.push('mover needs key '+m.key);
  return P;
}

/* ---------------------------------------------- challenges and the arenas */
const NF_CHALLENGES=[
  {id:'street',name:'STREET FIGHT',type:'combat',kind:'market',theme:'market',seed:101,waves:['tttt','ttkkg','tstbk'],stars:[6000,12000,18000],unlock:1},
  {id:'skyline',name:'SKYLINE',type:'glide',kind:'roof',theme:'roof',seed:102,stars:[48,38,30],unlock:1},
  {id:'silent',name:'SILENT RUNNER',type:'stealth',kind:'vault',theme:'vault',seed:103,e:'ggzzpnhg',stars:[4000,7000,9000],unlock:2},
  {id:'iron',name:'IRON FIST',type:'combat',kind:'core',theme:'core',seed:104,waves:['tsss','bztkg','bbsnnh'],stars:[8000,16000,24000],unlock:3},
  {id:'trace',name:'NO TRACE',type:'stealth',kind:'spire',theme:'spire',seed:105,e:'ggppnnzzh',stars:[4500,8000,10000],unlock:4},
  {id:'freefall',name:'FREEFALL',type:'glide',kind:'spire',theme:'spire',seed:106,stars:[40,32,26],unlock:4}
];
function nfChallenge(C){
  if(C.type==='glide'){
    const hi=C.id==='freefall';
    const W=nfBuild({name:C.name,seed:C.seed,kind:C.kind,islands:[
      ['a',0,0,30,26,hi?110:60,{start:1,vent:1}],['b',90,-20,30,26,hi?80:56,{vent:1}],['c',170,30,34,30,hi?40:50,{exit:1}]],links:[]});
    const I=W.islands;W.rings=[];
    for(const [A,B] of [[I.a,I.b],[I.b,I.c]])for(let i=1;i<=5;i++){const t=i/6;W.rings.push({x:lerpN(A.x,B.x,t),y:lerpN(A.y,B.y,t)+10+Math.sin(t*Math.PI)*6,z:lerpN(A.z,B.z,t)+Math.sin(t*5)*5});}
    return W;
  }
  const W=nfBuild({name:C.name,seed:C.seed,kind:C.kind,islands:[['a',0,0,56,52,30,{start:1,e:C.type==='stealth'?C.e:'',stim:C.type==='combat'?1:0,hide:C.type==='stealth'?['radio@roof2']:[]}]],links:[]});
  W.items=W.items.filter(i=>i.t!=='radio');
  return W;
}
function nfArena(seed,kind){
  return nfBuild({name:'OVERDRIVE',seed:seed>>>0,kind:kind||'market',islands:[['a',0,0,58,58,30,{start:1,stim:0}]],links:[]});
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
// The weekly gauntlet: ten set waves with two bosses, the same for everyone in an ISO week.
function nfWeekly(date){
  const s=date||new Date();
  const d=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth(),s.getUTCDate()));
  const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);
  const y=d.getUTCFullYear(),wk=Math.ceil(((d-Date.UTC(y,0,1))/864e5+1)/7);
  const key=y*100+wk, r=nfRand(key*977);
  const pool='tttgghdskzbnp';
  const waves=[];
  for(let i=1;i<=10;i++){
    if(i===5){waves.push('BOSS:chain');continue;}
    if(i===10){waves.push('BOSS:atlas');continue;}
    let w='';const n=3+Math.round(i*1.4);
    for(let k=0;k<n;k++)w+=pool[Math.min(pool.length-1,(r()*Math.min(pool.length,4+i*1.2))|0)];
    waves.push(w);
  }
  return{key,label:y+' W'+String(wk).padStart(2,'0'),seed:(key*31337)>>>0,waves};
}

if(typeof module!=='undefined')module.exports={NF_DISTRICTS,NF_MOVE,NF_ENEMY,NF_CHALLENGES,nfBuild,nfCheck,nfArena,nfDaily,nfWeekly,nfChallenge,NF_TWISTS};
