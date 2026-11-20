/* ================================= WORLD =================================
   Turns a built district into what you see (one static batch of boxes, a
   distant city, traffic and holograms) and what you touch (a spatial hash of
   collision boxes, with raycasts for the camera, the grapple and sight).   */
const THEMES={
  market:{zen:[.02,.015,.06],hor:[.32,.08,.22],glow:[1,.36,.32],fogHi:[.19,.06,.17],fogLo:[.07,.02,.1],sky:[.25,.2,.42],ground:[.3,.1,.16],
          moon:[.5,.55,.8],win:[[1,.7,.35],[1,.25,.68],[.25,.9,1]],winDensity:.38,tower:[.11,.1,.15],deck:[.15,.14,.19],metal:[.2,.2,.26],fogD:.0062},
  vault: {zen:[.01,.03,.07],hor:[.06,.2,.32],glow:[.25,.85,1],fogHi:[.04,.13,.2],fogLo:[.01,.05,.1],sky:[.18,.3,.45],ground:[.05,.2,.25],
          moon:[.5,.7,.9],win:[[.35,.9,1],[.25,.95,.95],[1,1,1]],winDensity:.42,tower:[.08,.11,.16],deck:[.11,.14,.2],metal:[.18,.22,.3],fogD:.0058},
  roof:  {zen:[.03,.01,.07],hor:[.28,.06,.34],glow:[.85,.35,1],fogHi:[.15,.05,.22],fogLo:[.05,.01,.1],sky:[.3,.2,.5],ground:[.25,.08,.3],
          moon:[.6,.5,.9],win:[[1,.4,.85],[.7,.4,1],[1,.75,.4]],winDensity:.36,tower:[.11,.09,.16],deck:[.15,.13,.2],metal:[.22,.2,.28],fogD:.0055},
  core:  {zen:[.04,.01,.02],hor:[.36,.08,.05],glow:[1,.35,.1],fogHi:[.22,.06,.04],fogLo:[.09,.02,.02],sky:[.35,.18,.2],ground:[.35,.1,.05],
          moon:[.8,.5,.4],win:[[1,.55,.2],[1,.22,.25],[1,.85,.5]],winDensity:.34,tower:[.13,.09,.09],deck:[.17,.13,.13],metal:[.25,.18,.18],fogD:.0064},
  spire: {zen:[.02,.02,.08],hor:[.16,.1,.38],glow:[.6,.45,1],fogHi:[.1,.07,.24],fogLo:[.03,.02,.1],sky:[.3,.3,.55],ground:[.15,.1,.3],
          moon:[.7,.7,1],win:[[.75,.6,1],[1,.95,1],[.35,.85,1]],winDensity:.4,tower:[.1,.1,.17],deck:[.14,.14,.21],metal:[.22,.22,.32],fogD:.005},
  arena: {zen:[.02,.01,.06],hor:[.3,.06,.3],glow:[1,.3,.7],fogHi:[.16,.05,.18],fogLo:[.05,.01,.09],sky:[.28,.2,.45],ground:[.28,.08,.25],
          moon:[.6,.55,.9],win:[[1,.3,.75],[.25,.95,1],[1,.75,.35]],winDensity:.42,tower:[.1,.09,.15],deck:[.14,.13,.19],metal:[.2,.2,.27],fogD:.0055}
};
const SIGN_COLS=[[1,.25,.7],[.2,.95,1],[1,.7,.25],[.7,.4,1],[.6,1,.3],[1,.3,.3]];

const WORLD={W:null,T:null,boxes:[],solid:[],hash:new Map(),lights:[],holos:[],lanes:[],cars:[],gates:[],anchors:[],items:[],vents:[],bounds:null,fogY:0};
const CELL=8;
function hkey(cx,cz){return cx*73856093^cz*19349663;}
function hashBox(i){
  const b=WORLD.boxes[i];
  for(let cx=Math.floor(b.x0/CELL);cx<=Math.floor(b.x1/CELL);cx++)for(let cz=Math.floor(b.z0/CELL);cz<=Math.floor(b.z1/CELL);cz++){
    const k=hkey(cx,cz);let a=WORLD.hash.get(k);if(!a){a=[];WORLD.hash.set(k,a);}a.push(i);}
}
const qSeen=new Uint32Array(1<<16);let qStamp=1;
function query(x0,z0,x1,z1,out){
  out.length=0;qStamp++;
  for(let cx=Math.floor(x0/CELL);cx<=Math.floor(x1/CELL);cx++)for(let cz=Math.floor(z0/CELL);cz<=Math.floor(z1/CELL);cz++){
    const a=WORLD.hash.get(hkey(cx,cz));if(!a)continue;
    for(const i of a){if(qSeen[i&65535]===qStamp)continue;qSeen[i&65535]=qStamp;const b=WORLD.boxes[i];if(!b.off)out.push(b);}
  }
  return out;
}
const SOLID_KINDS=new Set(['deck','tower','bridge','crate','rail','frame','gate','ledge','pad']);

function buildWorld(W,themeId,rain){
  const T=Object.assign({},THEMES[themeId]||THEMES.market);
  WORLD.W=W;WORLD.T=T;WORLD.rain=rain?1:0;
  WORLD.boxes=W.boxes.map(b=>Object.assign({},b));
  WORLD.hash=new Map();WORLD.lights=[];WORLD.holos=[];WORLD.items=W.items.map(i=>Object.assign({taken:false,bob:rng()*TAU},i));
  WORLD.anchors=W.anchors.map(a=>Object.assign({},a));WORLD.vents=W.vents;
  WORLD.gates=W.gates.map(g=>Object.assign({open:0,opening:false},g));
  let minY=1e9,maxY=-1e9,bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;
  WORLD.boxes.forEach((b,i)=>{
    if(SOLID_KINDS.has(b.k)&&!b.nc)hashBox(i);
    if(b.k==='deck'){minY=Math.min(minY,b.y1);maxY=Math.max(maxY,b.y1);bx0=Math.min(bx0,b.x0);bx1=Math.max(bx1,b.x1);bz0=Math.min(bz0,b.z0);bz1=Math.max(bz1,b.z1);}
  });
  WORLD.bounds={x0:bx0,x1:bx1,z0:bz0,z1:bz1,cx:(bx0+bx1)/2,cz:(bz0+bz1)/2,minY,maxY};
  WORLD.fogY=minY-6;T.fogY=WORLD.fogY;T.moonDir=(()=>{const v=[-.4,.8,.45],l=Math.hypot(...v);return v.map(x=>x/l);})();
  // ---- the static batch ----
  const B=R.world;B.clear();
  const r=mulberry32(W.boxes.length*31+7);
  const dark=(c,k)=>c.map(x=>x*k);
  for(const b of WORLD.boxes){
    const s=b.s%997;
    switch(b.k){
      case 'deck': B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.deck,0,3,s);break;
      case 'under':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,dark(T.deck,.6),0,0,s);break;
      case 'pillar':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.tower,0,1,s);break;
      case 'tower':
        B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.tower,0,1,s);
        // a roof rim that catches the light, and clutter on top
        B.aabb(b.x0,b.y1,b.z0,b.x1,b.y1+0.12,b.z0+0.15,T.win[1],1.1,0,s);
        B.aabb(b.x0,b.y1,b.z1-0.15,b.x1,b.y1+0.12,b.z1,T.win[1],1.1,0,s);
        if(r()<0.6){const ax=lerp(b.x0+1,b.x1-1,r()),az=lerp(b.z0+1,b.z1-1,r());B.aabb(ax-.08,b.y1,az-.08,ax+.08,b.y1+3+r()*5,az+.08,T.metal,0,0,s);
          B.aabb(ax-.12,b.y1+3.2,az-.12,ax+.12,b.y1+3.45,az+.12,[1,.2,.25],2,2,s);}
        addSigns(b,T,r);
        break;
      case 'bridge':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.deck,0,4,s);break;
      case 'rail':
        B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1-0.08,b.z1,T.metal,0,0,s);
        B.aabb(b.x0,b.y1-0.08,b.z0,b.x1,b.y1,b.z1,T.win[1],1.4,0,s);break;
      case 'crate':{const c=[[.35,.12,.1],[.1,.2,.32],[.25,.25,.08],[.18,.1,.28]][s%4];
        B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,c,0,0,s);
        B.aabb(b.x0-0.01,b.y0+(b.y1-b.y0)*0.45,b.z0-0.01,b.x1+0.01,b.y0+(b.y1-b.y0)*0.52,b.z1+0.01,T.win[s%3],1.2,0,s);break;}
      case 'frame':{const kc=KEYCOL[gateKeyNear(b)]||T.win[1];
        B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.metal,0,0,s);
        B.aabb(b.x0-0.02,b.y1-0.25,b.z0-0.02,b.x1+0.02,b.y1-0.1,b.z1+0.02,kc,1.8,0,s);
        WORLD.lights.push({x:(b.x0+b.x1)/2,y:b.y1-1,z:(b.z0+b.z1)/2,r:12,c:kc,i:1.4});break;}
      case 'ledge':case 'pad':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.deck,0,3,s);break;
      case 'sign':{const c=SIGN_COLS[s%6];B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,c,1.5,2,s);
        WORLD.lights.push({x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2,z:(b.z0+b.z1)/2,r:16,c,i:1.6});break;}
      case 'vent':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,[.3,.9,1],1.2,7,s);
        WORLD.lights.push({x:(b.x0+b.x1)/2,y:b.y1+1,z:(b.z0+b.z1)/2,r:10,c:[.3,.9,1],i:1.5});break;
    }
  }
  // street lamps around each deck, so the floor you fight on is always lit
  for(const b of WORLD.boxes)if(b.k==='deck'){
    for(const [lx,lz] of [[b.x0+2,b.z0+2],[b.x1-2,b.z0+2],[b.x0+2,b.z1-2],[b.x1-2,b.z1-2]]){
      B.aabb(lx-.08,b.y1,lz-.08,lx+.08,b.y1+4.2,lz+.08,T.metal,0,0,0);
      B.aabb(lx-.35,b.y1+4.2,lz-.12,lx+.35,b.y1+4.32,lz+.12,T.win[0],2.2,0,0);
      WORLD.lights.push({x:lx,y:b.y1+4,z:lz,r:15,c:T.win[0],i:1.3});
    }
  }
  // grapple points: a small cyan block with a light, easy to spot
  for(const a of WORLD.anchors){B.aabb(a.x-.22,a.y-.3,a.z-.22,a.x+.22,a.y+.05,a.z+.22,[.25,.95,1],2,6,(a.x*13)|0);
    WORLD.lights.push({x:a.x,y:a.y+.4,z:a.z,r:6,c:[.25,.95,1],i:1.2});}
  // the exit uplink
  if(W.exit){const e=W.exit;B.aabb(e.x-1.4,e.y,e.z-1.4,e.x+1.4,e.y+0.25,e.z+1.4,T.metal,0,0,0);}
  buildFarCity(B,T,r);
  B.upload();
  // holograms: big translucent ads that drift above the towers
  for(const b of WORLD.boxes)if(b.k==='tower'&&b.y1-b.y0>20&&r()<0.5){
    const side=r()<.5;WORLD.holos.push({x:side?b.x1+1.5:(b.x0+b.x1)/2,y:b.y1-6-r()*8,z:side?(b.z0+b.z1)/2:b.z1+1.5,w:side?.2:4+r()*4,h:3+r()*4,d:side?4+r()*4:.2,c:SIGN_COLS[(r()*6)|0],ph:r()*10});
  }
  // traffic lanes in the sky between and above the islands
  WORLD.lanes=[];WORLD.cars=[];
  const span=Math.max(bx1-bx0,bz1-bz0)+260;
  for(let i=0;i<12;i++){
    const alongX=i%2===0, y=minY+6+r()*(maxY-minY+60), off=(alongX?WORLD.bounds.cz:WORLD.bounds.cx)+(r()-0.5)*(span*0.8);
    const dir=r()<.5?1:-1, sp=22+r()*26;
    const lane={alongX,y,off,dir,sp,span};WORLD.lanes.push(lane);
    const n=4+((r()*5)|0);
    for(let k=0;k<n;k++)WORLD.cars.push({lane,t:r()*span,c:SIGN_COLS[(r()*6)|0]});
  }
}
function gateKeyNear(b){
  let best=null,bd=1e9;
  for(const g of WORLD.W.gates){const gb=WORLD.W.boxes[g.box];const d=Math.hypot((gb.x0+gb.x1)/2-(b.x0+b.x1)/2,(gb.z0+gb.z1)/2-(b.z0+b.z1)/2);if(d<bd){bd=d;best=g.key;}}
  return bd<10?best:null;
}
function addSigns(b,T,r){
  const n=(r()*3)|0;
  for(let i=0;i<n;i++){
    const face=(r()*4)|0, h=b.y1-b.y0, vert=r()<.55;
    const sw=vert?.9:3+r()*3, sh=vert?4+r()*5:1.1+r()*.6, y0=b.y0+3+r()*Math.max(1,h-sh-4);
    const c=SIGN_COLS[(r()*6)|0], o=.18;
    let x0,x1,z0,z1;
    if(face<2){const x=face?b.x1+o:b.x0-o;const z=lerp(b.z0+sw/2+.3,b.z1-sw/2-.3,r());x0=x-.08;x1=x+.08;z0=z-sw/2;z1=z+sw/2;}
    else{const z=face>2?b.z1+o:b.z0-o;const x=lerp(b.x0+sw/2+.3,b.x1-sw/2-.3,r());z0=z-.08;z1=z+.08;x0=x-sw/2;x1=x+sw/2;}
    R.world.aabb(x0,y0,z0,x1,y0+sh,z1,c,1.6,2,(r()*999)|0);
    WORLD.lights.push({x:(x0+x1)/2,y:y0+sh/2,z:(z0+z1)/2,r:14,c,i:1.5});
  }
}
// The city past the districts: real towers, fogged, so the skyline is never
// painted on a wall and can't be mistaken for a door.
function buildFarCity(B,T,r){
  const cx=WORLD.bounds.cx,cz=WORLD.bounds.cz,base=WORLD.bounds.minY;
  for(let i=0;i<900;i++){
    const a=r()*TAU, d=150+Math.pow(r(),0.7)*520;
    const x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;
    const w=8+r()*22,dd=8+r()*22,h=base+(r()<.08?140+r()*160:20+r()*110)*(0.6+d/700);
    if(Math.abs(x-cx)<(WORLD.bounds.x1-WORLD.bounds.x0)/2+40&&Math.abs(z-cz)<(WORLD.bounds.z1-WORLD.bounds.z0)/2+40)continue;
    B.aabb(x-w/2,base-220,z-dd/2,x+w/2,h,z+dd/2,T.tower,0,8,(r()*997)|0);
    if(r()<.25)B.aabb(x-w/2-.3,h-6-r()*20,z-.4,x+w/2+.3,h-4-r()*20,z+.4,SIGN_COLS[(r()*6)|0],1.4,2,(r()*997)|0);
  }
}

/* ---- per-frame dynamic scenery: traffic and holograms ---- */
function sceneryFrame(time,dt){
  const D=R.dyn,G=R.glass;
  for(const car of WORLD.cars){
    const L=car.lane;car.t=(car.t+L.sp*dt)%L.span;
    const p=L.dir*(car.t-L.span/2), x=L.alongX?WORLD.bounds.cx+p:L.off, z=L.alongX?L.off:WORLD.bounds.cz+p;
    const hx=L.alongX?1.9:.85, hz=L.alongX?.85:1.9, fx=L.alongX?L.dir:0, fz=L.alongX?0:L.dir;
    D.aabb(x-hx,L.y-.45,z-hz,x+hx,L.y+.45,z+hz,[.09,.09,.13],0,9);
    D.aabb(x-hx*.6,L.y+.45,z-hz*.6,x+hx*.6,L.y+.8,z+hz*.6,[.12,.12,.18],0,9);
    D.aabb(x+fx*hx-.15,L.y-.15,z+fz*hz-.15,x+fx*hx+.15,L.y+.15,z+fz*hz+.15,[1,.95,.85],3,0);
    D.aabb(x-fx*hx-.12,L.y-.12,z-fz*hz-.12,x-fx*hx+.12,L.y+.12,z-fz*hz+.12,[1,.1,.2],3,0);
    D.aabb(x-hx,L.y-.5,z-hz,x+hx,L.y-.45,z+hz,car.c,1.5,0);           // underglow
  }
  for(const h of WORLD.holos){
    const a=0.22+0.08*Math.sin(time*2+h.ph)+(Math.sin(time*31+h.ph)>.97?-.15:0);
    G.aabb(h.x-h.w/2,h.y,h.z-h.d/2,h.x+h.w/2,h.y+h.h,h.z+h.d/2,h.c,1.4,2,(h.ph*99)|0,Math.max(0.05,a));
  }
  for(const g of WORLD.gates){
    const b=WORLD.boxes[g.box];
    if(g.opening&&g.open<1){g.open=Math.min(1,g.open+dt*0.8);}
    if(g.open>=1)b.off=true;
    const drop=(b.y1-b.y0)*g.open;
    if(g.open<1)D.aabb(b.x0,b.y0-drop,b.z0,b.x1,b.y1-drop,b.z1,KEYCOL[g.key],1.1,5,7);
  }
}

/* ---- physics against the static boxes ---- */
const QB=[];
// Move an actor (feet at y, half-width hw, height h) by d on one axis; returns the box hit, if any.
function moveAxis(e,axis,d){
  if(!d)return null;
  e[axis]+=d;
  const hw=e.hw;
  query(e.x-hw,e.z-hw,e.x+hw,e.z+hw,QB);
  let hit=null;
  for(const b of QB){
    if(e.x+hw<=b.x0||e.x-hw>=b.x1||e.z+hw<=b.z0||e.z-hw>=b.z1||e.y+e.h<=b.y0||e.y>=b.y1)continue;
    if(axis==='y'){
      if(d<0){e.y=b.y1;e.ground=b;}else{e.y=b.y0-e.h;}
      hit=b;
    }else{
      // a low edge is a step, not a wall
      if(b.y1-e.y<=0.55&&e.stepOK!==false&&!stepBlocked(e,b.y1)){e.y=b.y1+0.001;continue;}
      if(axis==='x')e.x=d>0?b.x0-hw-0.001:b.x1+hw+0.001;else e.z=d>0?b.z0-hw-0.001:b.z1+hw+0.001;
      hit=b;
    }
  }
  return hit;
}
function stepBlocked(e,y){
  for(const b of QB)if(!(e.x+e.hw<=b.x0||e.x-e.hw>=b.x1||e.z+e.hw<=b.z0||e.z-e.hw>=b.z1)&&b.y1>y+0.01&&b.y0<y+e.h)return true;
  return false;
}
// The highest surface under a point, at or below a height.
function groundAt(x,z,y){
  query(x-.05,z-.05,x+.05,z+.05,QB);let best=null;
  for(const b of QB)if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1&&b.y1<=y+0.6&&(!best||b.y1>best.y1))best=b;
  return best;
}
// Ray against boxes: distance to the first hit, or maxD.
const RQ=[];
function raycast(ox,oy,oz,dx,dy,dz,maxD,skipLow){
  const ex=ox+dx*maxD,ez=oz+dz*maxD;
  query(Math.min(ox,ex)-.1,Math.min(oz,ez)-.1,Math.max(ox,ex)+.1,Math.max(oz,ez)+.1,RQ);
  let best=maxD;
  for(const b of RQ){
    if(skipLow&&b.k==='rail')continue;
    let t0=0,t1=best;
    for(const [o,d,lo,hi] of [[ox,dx,b.x0,b.x1],[oy,dy,b.y0,b.y1],[oz,dz,b.z0,b.z1]]){
      if(Math.abs(d)<1e-9){if(o<lo||o>hi){t0=2;t1=1;break;}continue;}
      let a=(lo-o)/d,c=(hi-o)/d;if(a>c){const t=a;a=c;c=t;}
      if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)break;
    }
    if(t0<=t1&&t0<best&&t0>=0)best=t0;
  }
  return best;
}
function losClear(a,b){
  const dx=b.x-a.x,dy=(b.y+1.4)-(a.y+1.4),dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1;
  return raycast(a.x,a.y+1.4,a.z,dx/d,dy/d,dz/d,d,true)>=d-0.3;
}
// The lights that matter this frame: the nearest to the camera's target.
function pickLights(cx,cy,cz,extra){
  const all=WORLD.lights.concat(extra);
  for(const L of all)L._d=(L.x-cx)**2+(L.y-cy)**2*.5+(L.z-cz)**2-(L.i>2?400:0);
  all.sort((a,b)=>a._d-b._d);
  return all.slice(0,24);
}
