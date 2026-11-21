/* ================================= WORLD =================================
   Turns a built district into what you see and what you touch: textured,
   themed towers and props, the distant city, traffic, a sky train, patrol
   drones with searchlights, birds, holograms, cranes and the elevator, laser
   fences, conveyors and the reactor, with a spatial hash of collision boxes
   for the physics and raycasts for the camera, the grapple and sight.     */
const THEMES={
  market:{zen:[.02,.015,.06],hor:[.32,.08,.22],glow:[1,.36,.32],fogHi:[.19,.06,.17],fogLo:[.07,.02,.1],sky:[.25,.2,.42],ground:[.3,.1,.16],
          moon:[.5,.55,.8],win:[[1,.7,.35],[1,.25,.68],[.25,.9,1]],winDensity:.38,tower:[.42,.38,.46],deck:[.5,.48,.56],metal:[.3,.3,.36],fogD:.0062,wet:1,
          walls:['concrete','brick'],deckTile:'asphalt'},
  vault: {zen:[.01,.03,.07],hor:[.06,.2,.32],glow:[.25,.85,1],fogHi:[.04,.13,.2],fogLo:[.01,.05,.1],sky:[.18,.3,.45],ground:[.05,.2,.25],
          moon:[.5,.7,.9],win:[[.35,.9,1],[.25,.95,.95],[1,1,1]],winDensity:.42,tower:[.36,.42,.52],deck:[.42,.48,.58],metal:[.28,.32,.4],fogD:.0058,wet:.3,
          walls:['metal','glassWall'],deckTile:'floor'},
  roof:  {zen:[.03,.01,.07],hor:[.28,.06,.34],glow:[.85,.35,1],fogHi:[.15,.05,.22],fogLo:[.05,.01,.1],sky:[.3,.2,.5],ground:[.25,.08,.3],
          moon:[.6,.5,.9],win:[[1,.4,.85],[.7,.4,1],[1,.75,.4]],winDensity:.36,tower:[.44,.38,.48],deck:[.5,.46,.56],metal:[.32,.3,.38],fogD:.0055,wet:1,
          walls:['brick','concrete'],deckTile:'tar'},
  core:  {zen:[.04,.01,.02],hor:[.36,.08,.05],glow:[1,.35,.1],fogHi:[.22,.06,.04],fogLo:[.09,.02,.02],sky:[.35,.18,.2],ground:[.35,.1,.05],
          moon:[.8,.5,.4],win:[[1,.55,.2],[1,.22,.25],[1,.85,.5]],winDensity:.34,tower:[.46,.36,.34],deck:[.5,.44,.42],metal:[.36,.28,.26],fogD:.0064,wet:.4,
          walls:['rust','metal'],deckTile:'grate'},
  spire: {zen:[.02,.02,.08],hor:[.16,.1,.38],glow:[.6,.45,1],fogHi:[.1,.07,.24],fogLo:[.03,.02,.1],sky:[.3,.3,.55],ground:[.15,.1,.3],
          moon:[.7,.7,1],win:[[.75,.6,1],[1,.95,1],[.35,.85,1]],winDensity:.4,tower:[.4,.4,.52],deck:[.46,.46,.58],metal:[.3,.3,.4],fogD:.005,wet:.5,
          walls:['glassWall','metal'],deckTile:'floor'},
  arena: {zen:[.02,.01,.06],hor:[.3,.06,.3],glow:[1,.3,.7],fogHi:[.16,.05,.18],fogLo:[.05,.01,.09],sky:[.28,.2,.45],ground:[.28,.08,.25],
          moon:[.6,.55,.9],win:[[1,.3,.75],[.25,.95,1],[1,.75,.35]],winDensity:.42,tower:[.42,.38,.48],deck:[.5,.48,.56],metal:[.3,.3,.36],fogD:.0055,wet:.8,
          walls:['concrete','metal'],deckTile:'asphalt'}
};
const SIGN_COLS=[[1,.25,.7],[.2,.95,1],[1,.7,.25],[.7,.4,1],[.6,1,.3],[1,.3,.3]];
const WORLD={W:null,T:null,boxes:[],hash:new Map(),lights:[],halos:null,holos:[],lanes:[],cars:[],gates:[],anchors:[],items:[],vents:[],
  movers:[],lasers:[],rings:[],patrols:[],birds:[],train:null,bounds:null,fogY:0,time:0};
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
  for(const m of WORLD.movers){const b=m.box;if(b.x1>x0&&b.x0<x1&&b.z1>z0&&b.z0<z1)out.push(b);}
  return out;
}
const SOLID_KINDS=new Set(['deck','tower','server','bridge','crate','rail','frame','gate','ledge','pad','prop']);
const pick=(arr,s)=>arr[s%arr.length];

function buildWorld(W,themeId,rain){
  const T=Object.assign({},THEMES[themeId]||THEMES.market);
  WORLD.W=W;WORLD.T=T;WORLD.rain=rain?1:0;WORLD.kind=W.kind;
  WORLD.boxes=W.boxes.map(b=>Object.assign({},b));
  WORLD.hash=new Map();WORLD.lights=[];WORLD.holos=[];
  WORLD.items=W.items.map(i=>Object.assign({taken:false,bob:rng()*TAU},i));
  WORLD.anchors=W.anchors.map(a=>Object.assign({},a));WORLD.vents=W.vents;
  WORLD.gates=W.gates.map(g=>Object.assign({open:0,opening:false},g));
  WORLD.lasers=W.lasers.map(l=>Object.assign({on:false},l));
  WORLD.rings=W.rings.map(r=>Object.assign({got:false},r));
  let minY=1e9,maxY=-1e9,bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;
  WORLD.boxes.forEach((b,i)=>{
    if(SOLID_KINDS.has(b.k)&&!b.nc)hashBox(i);
    if(b.k==='deck'){minY=Math.min(minY,b.y1);maxY=Math.max(maxY,b.y1);bx0=Math.min(bx0,b.x0);bx1=Math.max(bx1,b.x1);bz0=Math.min(bz0,b.z0);bz1=Math.max(bz1,b.z1);}
  });
  WORLD.bounds={x0:bx0,x1:bx1,z0:bz0,z1:bz1,cx:(bx0+bx1)/2,cz:(bz0+bz1)/2,minY,maxY};
  WORLD.fogY=minY-6;T.fogY=WORLD.fogY;T.wet=T.wet*(rain?1:0.6);
  T.moonDir=(()=>{const v=[-.4,.8,.45],l=Math.hypot(...v);return v.map(x=>x/l);})();
  WORLD.movers=W.movers.map(m=>({...m,box:{x0:0,y0:0,z0:0,x1:0,y1:0,z1:0,k:'deck',mover:true,dx:0,dy:0,dz:0},pos:m.p0.slice(),t:0,active:!m.key}));
  for(const m of WORLD.movers)placeMover(m,0);
  // ---- the static layers ----
  const B=R.world;B.clear();R.far.clear();
  const r=mulberry32(W.boxes.length*31+7);
  const tile=n=>TILE[n];
  const accent=T.win[1];
  for(const b of WORLD.boxes){
    const s=b.s%997;
    switch(b.k){
      case 'deck': B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.deck,0,3,s,1,tile(T.deckTile));break;
      case 'under':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.metal,0,0,s,1,tile('metal'));break;
      case 'pillar':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.tower,0,1,s,1,tile(pick(T.walls,s)));break;
      case 'tower':case 'server':
        if(b.k==='server'){B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,[.6,.65,.75],0,0,s,1,tile('server'),[.3,.95,1]);
          for(const f of [0,1])B.aabb(f?b.x1:b.x0-0.12,b.y0+1,(b.z0+b.z1)/2-0.4,f?b.x1+0.12:b.x0,b.y1-1,(b.z0+b.z1)/2+0.4,[.3,.95,1],1.5,13,s);}
        else B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.tower,0,1,s,1,tile(pick(T.walls,s)));
        B.aabb(b.x0,b.y1,b.z0,b.x1,b.y1+0.12,b.z0+0.15,accent,1.1,0,s);
        B.aabb(b.x0,b.y1,b.z1-0.15,b.x1,b.y1+0.12,b.z1,accent,1.1,0,s);
        dressRoof(B,b,T,r);dressWalls(B,b,T,r,W.kind);
        break;
      case 'bridge':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.deck,0,4,s,1,tile('grate'));break;
      case 'rail':
        B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1-0.08,b.z1,T.metal,0,0,s,1,tile('metal'));
        B.aabb(b.x0,b.y1-0.08,b.z0,b.x1,b.y1,b.z1,accent,1.4,0,s);break;
      case 'crate':{const c=[[.9,.55,.4],[.5,.65,.9],[.85,.8,.5],[.7,.55,.85]][s%4];
        B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,c,0,12,s,1,tile(s%2?'wood':'metal'));
        B.aabb(b.x0-0.01,b.y0+(b.y1-b.y0)*0.45,b.z0-0.01,b.x1+0.01,b.y0+(b.y1-b.y0)*0.52,b.z1+0.01,T.win[s%3],1.2,0,s);break;}
      case 'prop':dressProp(B,b,T,r);break;
      case 'frame':{const kc=KEYCOL[gateKeyNear(b)]||accent;
        B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.metal,0,0,s,1,tile('hazard'));
        B.aabb(b.x0-0.02,b.y1-0.25,b.z0-0.02,b.x1+0.02,b.y1-0.1,b.z1+0.02,kc,1.8,0,s);
        WORLD.lights.push({x:(b.x0+b.x1)/2,y:b.y1-1,z:(b.z0+b.z1)/2,r:12,c:kc,i:1.4});break;}
      case 'ledge':case 'pad':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.deck,0,3,s,1,tile('grate'));break;
      case 'sign':{const c=SIGN_COLS[s%6];B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,[.5,.5,.5],0,2,s,1,tile('sign'+(s%6)),c);
        WORLD.lights.push({x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2,z:(b.z0+b.z1)/2,r:16,c,i:1.6});break;}
      case 'vent':B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,[.3,.9,1],1.2,7,s,1,tile('vent'));
        WORLD.lights.push({x:(b.x0+b.x1)/2,y:b.y1+1,z:(b.z0+b.z1)/2,r:10,c:[.3,.9,1],i:1.5});break;
    }
  }
  // street lamps at the corners of every deck
  for(const b of WORLD.boxes)if(b.k==='deck'){
    for(const [lx,lz] of [[b.x0+2,b.z0+2],[b.x1-2,b.z0+2],[b.x0+2,b.z1-2],[b.x1-2,b.z1-2]]){
      B.aabb(lx-.08,b.y1,lz-.08,lx+.08,b.y1+4.2,lz+.08,T.metal,0,0,0);
      B.aabb(lx-.35,b.y1+4.2,lz-.12,lx+.35,b.y1+4.32,lz+.12,T.win[0],2.2,0,0);
      WORLD.lights.push({x:lx,y:b.y1+4,z:lz,r:15,c:T.win[0],i:1.3});
    }
  }
  // conveyors: a moving belt across the floor that carries you
  WORLD.belts=[];
  for(const id of (W.conveyors||[])){const I=W.islands[id];if(!I)continue;
    const z=I.z+I.d*0.28,x0=I.x0+3,x1=I.x1-3;B.aabb(x0,I.y+0.005,z-1.2,x1,I.y+0.06,z+1.2,[.7,.7,.75],0,16,0,1,tile('grate'));
    B.aabb(x0,I.y+0.06,z-1.25,x1,I.y+0.09,z-1.15,[1,.7,.2],1.5,0,0);B.aabb(x0,I.y+0.06,z+1.15,x1,I.y+0.09,z+1.25,[1,.7,.2],1.5,0,0);
    WORLD.belts.push({x0,x1,z0:z-1.2,z1:z+1.2,y:I.y,v:3.5});}
  for(const a of WORLD.anchors){B.aabb(a.x-.22,a.y-.3,a.z-.22,a.x+.22,a.y+.05,a.z+.22,[.25,.95,1],2,6,(a.x*13)|0);
    WORLD.lights.push({x:a.x,y:a.y+.4,z:a.z,r:6,c:[.25,.95,1],i:1.2});}
  if(W.exit){const e=W.exit;B.aabb(e.x-1.4,e.y,e.z-1.4,e.x+1.4,e.y+0.25,e.z+1.4,T.metal,0,0,0,1,tile('hazard'));}
  // the reactor of the Core: a column of light
  if(W.reactor){const c=W.reactor;B.aabb(c.x-1.2,c.y,c.z-1.2,c.x+1.2,c.y+30,c.z+1.2,[1,.5,.2],2.4,13,7,1,-1,null,'cyl12');
    B.aabb(c.x-2.6,c.y,c.z-2.6,c.x+2.6,c.y+1.2,c.z+2.6,T.metal,0,12,0,1,tile('hazard'),null,'cyl12');
    WORLD.lights.push({x:c.x,y:c.y+6,z:c.z,r:26,c:[1,.5,.2],i:2.4});}
  buildFarCity(R.far,T,r);
  B.upload();R.far.upload();
  // halos round every light worth one
  const hs=[];for(const L of WORLD.lights)if(L.r>=10)hs.push(L.x,L.y,L.z,L.c[0],L.c[1],L.c[2],L.r*1.6);
  WORLD.halos=hs;
  // holograms
  for(const b of WORLD.boxes)if(b.k==='tower'&&b.y1-b.y0>20&&r()<0.5){
    const side=r()<.5;WORLD.holos.push({x:side?b.x1+1.5:(b.x0+b.x1)/2,y:b.y1-6-r()*8,z:side?(b.z0+b.z1)/2:b.z1+1.5,w:side?.2:4+r()*4,h:3+r()*4,d:side?4+r()*4:.2,c:SIGN_COLS[(r()*6)|0],ph:r()*10,tile:TILE['poster'+((r()*6)|0)]});
  }
  // traffic, the sky train, patrol drones and birds
  WORLD.lanes=[];WORLD.cars=[];
  const span=Math.max(bx1-bx0,bz1-bz0)+260;
  for(let i=0;i<12;i++){
    const alongX=i%2===0,y=minY+(i<4?-4+r()*6:6+r()*(maxY-minY+50)),off=(alongX?WORLD.bounds.cz:WORLD.bounds.cx)+(r()-0.5)*(span*0.8);
    const lane={alongX,y,off,dir:r()<.5?1:-1,sp:22+r()*26,span};WORLD.lanes.push(lane);
    const n=4+((r()*5)|0);for(let k=0;k<n;k++)WORLD.cars.push({lane,t:r()*span,c:SIGN_COLS[(r()*6)|0]});
  }
  WORLD.train={y:maxY+22,off:WORLD.bounds.cz+(bz1-bz0)*0.15,t:0,len:6,sp:34,span:span+200};
  WORLD.patrols=[];
  for(const id in W.islands){const I=W.islands[id];if(r()<0.6&&WORLD.patrols.length<3)WORLD.patrols.push({island:id,cx:I.x,cz:I.z,y:I.y+20,rad:Math.min(I.w,I.d)*0.32,ph:r()*TAU,base:I.y,spot:null});}
  WORLD.birds=[];
  for(const b of WORLD.boxes)if(b.k==='rail'&&r()<0.04)for(let k=0;k<3;k++)WORLD.birds.push({x:(b.x0+b.x1)/2+(r()-.5),y:b.y1,z:(b.z0+b.z1)/2+(r()-.5),vx:0,vy:0,vz:0,fly:false,home:null,t:0});
  for(const bd of WORLD.birds)bd.home=[bd.x,bd.y,bd.z];
}
function gateKeyNear(b){
  let best=null,bd=1e9;
  for(const g of WORLD.W.gates){const gb=WORLD.W.boxes[g.box];const d=Math.hypot((gb.x0+gb.x1)/2-(b.x0+b.x1)/2,(gb.z0+gb.z1)/2-(b.z0+b.z1)/2);if(d<bd){bd=d;best=g.key;}}
  return bd<10?best:null;
}
// rooftop clutter: cooling units, aerials with a red light, water tanks
function dressRoof(B,b,T,r){
  const n=1+((r()*3)|0);
  for(let i=0;i<n;i++){
    const w=0.8+r()*1.6,d=0.8+r()*1.6,x=lerp(b.x0+w,b.x1-w,r()),z=lerp(b.z0+d,b.z1-d,r()),h=0.6+r()*1.2;
    if(x<b.x0+0.3||z<b.z0+0.3)continue;
    B.aabb(x-w/2,b.y1,z-d/2,x+w/2,b.y1+h,z+d/2,T.metal,0,12,0,1,TILE.vent);
  }
  if(r()<0.55){const ax=lerp(b.x0+1,b.x1-1,r()),az=lerp(b.z0+1,b.z1-1,r()),h=3+r()*5;
    B.aabb(ax-.07,b.y1,az-.07,ax+.07,b.y1+h,az+.07,T.metal,0,0,0);B.aabb(ax-.12,b.y1+h,az-.12,ax+.12,b.y1+h+.25,az+.12,[1,.2,.25],2,2,(r()*99)|0);}
  if(WORLD.W.kind==='roof'&&r()<0.5){const x=lerp(b.x0+2,b.x1-2,r()),z=lerp(b.z0+2,b.z1-2,r());
    for(const [lx,lz] of [[-1,-1],[1,-1],[-1,1],[1,1]])B.aabb(x+lx*0.9-.06,b.y1,z+lz*0.9-.06,x+lx*0.9+.06,b.y1+2,z+lz*0.9+.06,T.metal,0,0,0);
    B.aabb(x-1.2,b.y1+2,z-1.2,x+1.2,b.y1+4.2,z+1.2,[.8,.7,.6],0,12,0,1,TILE.wood,null,'cyl12');
    B.aabb(x-1.2,b.y1+4.2,z-1.2,x+1.2,b.y1+4.9,z+1.2,[.5,.45,.4],0,12,0,1,TILE.wood,null,'cone');}
}
// walls: signs in an invented alphabet, posters, fire escapes, pipes, data streams
function dressWalls(B,b,T,r,kind){
  const h=b.y1-b.y0;
  const faces=[[b.x0,0],[b.x1,0],[b.z0,1],[b.z1,1]];
  const nS=(r()*3)|0;
  for(let i=0;i<nS;i++){
    const [at,ax]=faces[(r()*4)|0],vert=r()<.5,sw=vert?1.1:3+r()*2.5,sh=vert?4+r()*4:1.4,y0=b.y0+3+r()*Math.max(1,h-sh-4);
    const c=SIGN_COLS[(r()*6)|0],o=at===b.x0||at===b.z0?-0.2:0.2,t='sign'+(vert?6+((r()*6)|0):(r()*6)|0);
    if(ax===0){const z=lerp(b.z0+sw/2+.3,b.z1-sw/2-.3,r());B.aabb(at+o-.08,y0,z-sw/2,at+o+.08,y0+sh,z+sw/2,[.5,.5,.5],0,2,(r()*99)|0,1,TILE[t],c);WORLD.lights.push({x:at+o,y:y0+sh/2,z,r:14,c,i:1.5});}
    else{const x=lerp(b.x0+sw/2+.3,b.x1-sw/2-.3,r());B.aabb(x-sw/2,y0,at+o-.08,x+sw/2,y0+sh,at+o+.08,[.5,.5,.5],0,2,(r()*99)|0,1,TILE[t],c);WORLD.lights.push({x,y:y0+sh/2,z:at+o,r:14,c,i:1.5});}
  }
  if(r()<0.5){const [at,ax]=faces[(r()*4)|0],o=at===b.x0||at===b.z0?-0.06:0.06,y0=b.y0+0.4;
    if(ax===0){const z=lerp(b.z0+1.5,b.z1-1.5,r());B.aabb(at+o-.03,y0,z-1,at+o+.03,y0+2.2,z+1,[.9,.9,.9],0,12,0,1,TILE['poster'+((r()*6)|0)]);}
    else{const x=lerp(b.x0+1.5,b.x1-1.5,r());B.aabb(x-1,y0,at+o-.03,x+1,y0+2.2,at+o+.03,[.9,.9,.9],0,12,0,1,TILE['poster'+((r()*6)|0)]);}}
  if((kind==='market'||kind==='roof')&&r()<0.4&&h>10){                   // a fire escape zigzag
    const [at,ax]=faces[(r()*4)|0],o=at===b.x0||at===b.z0?-1:1,c=ax===0?(b.z0+b.z1)/2:(b.x0+b.x1)/2;
    for(let y=b.y0+4;y<b.y1-2;y+=3.2){if(ax===0)B.aabb(at+o*0.1,y,c-1.6,at+o*1.1,y+0.1,c+1.6,T.metal,0,0,0);else B.aabb(c-1.6,y,at+o*0.1,c+1.6,y+0.1,at+o*1.1,T.metal,0,0,0);}
  }
  if(kind==='core'&&r()<0.6){const [at,ax]=faces[(r()*4)|0],o=at===b.x0||at===b.z0?-0.35:0.35,c=ax===0?lerp(b.z0+1,b.z1-1,r()):lerp(b.x0+1,b.x1-1,r());
    if(ax===0)B.aabb(at+o-.25,b.y0,c-.25,at+o+.25,b.y1,c+.25,T.metal,0,12,0,1,TILE.pipe,null,'cyl');else B.aabb(c-.25,b.y0,at+o-.25,c+.25,b.y1,at+o+.25,T.metal,0,12,0,1,TILE.pipe,null,'cyl');}
}
// props you can stand on, dressed for each district
function dressProp(B,b,T,r){
  const s=b.s%997,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
  switch(b.theme){
    case 'market':{                                       // a stall: counter, goods, an awning on poles
      B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,[.8,.7,.6],0,12,s,1,TILE.wood);
      const c=SIGN_COLS[s%6];
      for(let i=0;i<5;i++)B.aabb(b.x0+0.3+i*0.5,b.y1,cz-0.3,b.x0+0.6+i*0.5,b.y1+0.25+((s+i)%3)*0.1,cz+0.1,SIGN_COLS[(s+i)%6].map(v=>v*0.7),0.2,0,0);
      for(const px of [b.x0+0.1,b.x1-0.1])for(const pz of [b.z0+0.1,b.z1-0.1])B.aabb(px-.05,b.y0,pz-.05,px+.05,b.y1+1.6,pz+.05,T.metal,0,0,0);
      XF.reset().t(cx,b.y1+1.75,cz).rx(-0.25);R.world.part('box',XF.m,b.x1-b.x0+0.5,0.08,b.z1-b.z0+0.6,c.map(v=>v*0.8+0.2),0.15,12,1,TILE.awning);
      B.aabb(cx-0.5,b.y1+1.85,b.z1+0.25,cx+0.5,b.y1+2.25,b.z1+0.3,[.5,.5,.5],0,2,s,1,TILE['sign'+(s%6)],c);
      WORLD.lights.push({x:cx,y:b.y1+1.2,z:cz,r:6,c:[1,.75,.45],i:1.4});
      break;}
    case 'roof':                                          // a cooling unit with a fan
      B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.metal,0,12,s,1,TILE.vent);
      B.aabb(cx-1,b.y1,cz-1,cx+1,b.y1+0.15,cz+1,[.3,.3,.35],0,12,0,1,TILE.grate,null,'cyl12');break;
    case 'vault':                                         // a server rack, lights blinking
      B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,[.7,.75,.85],0,12,s,1,TILE.server,[.3,.95,1]);break;
    case 'core':                                          // a tank with a hazard band
      B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.metal,0,12,s,1,TILE.pipe,null,'cyl12');
      B.aabb(b.x0-0.02,b.y1-0.5,b.z0-0.02,b.x1+0.02,b.y1-0.25,b.z1+0.02,[1,1,1],0,12,0,1,TILE.hazard,null,'cyl12');break;
    default:                                              // a glass planter with a lit edge
      B.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,[.7,.75,.9],0,12,s,1,TILE.glassWall);
      B.aabb(b.x0,b.y1,b.z0,b.x1,b.y1+0.05,b.z1,T.win[1],1.4,0,0);
  }
}
function buildFarCity(B,T,r){
  const cx=WORLD.bounds.cx,cz=WORLD.bounds.cz,base=WORLD.bounds.minY;
  for(let i=0;i<900;i++){
    const a=r()*TAU,d=150+Math.pow(r(),0.7)*520,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;
    const w=8+r()*22,dd=8+r()*22,h=base+(r()<.08?140+r()*160:20+r()*110)*(0.6+d/700);
    if(Math.abs(x-cx)<(WORLD.bounds.x1-WORLD.bounds.x0)/2+40&&Math.abs(z-cz)<(WORLD.bounds.z1-WORLD.bounds.z0)/2+40)continue;
    B.aabb(x-w/2,base-220,z-dd/2,x+w/2,h,z+dd/2,T.tower.map(v=>v*0.3),0,8,(r()*997)|0);
    if(r()<.25)B.aabb(x-w/2-.3,h-6-r()*20,z-.4,x+w/2+.3,h-4-r()*20,z+.4,SIGN_COLS[(r()*6)|0],1.4,2,(r()*997)|0);
  }
}

/* ---- movers: cranes and the elevator ---- */
function placeMover(m,dt){
  const b=m.box,ox=m.pos[0],oy=m.pos[1],oz=m.pos[2];
  if(m.active||m.type==='crane'&&!m.key){
    m.t+=dt;
    const P=m.period,travel=P/2-m.wait,ph=m.t%P;
    let k;if(ph<m.wait)k=0;else if(ph<m.wait+travel)k=ease((ph-m.wait)/travel);else if(ph<P/2+m.wait)k=1;else k=1-ease((ph-P/2-m.wait)/travel);
    m.k=k;
  }else m.k=0;
  for(let i=0;i<3;i++)m.pos[i]=lerp(m.p0[i],m.p1[i],m.k||0);
  b.x0=m.pos[0]-m.hw;b.x1=m.pos[0]+m.hw;b.z0=m.pos[2]-m.hd;b.z1=m.pos[2]+m.hd;b.y1=m.pos[1];b.y0=m.pos[1]-0.6;
  b.dx=m.pos[0]-ox;b.dy=m.pos[1]-oy;b.dz=m.pos[2]-oz;
}
function windAt(x,y,z){
  if(!WORLD.W.wind||y<WORLD.bounds.maxY-12)return[0,0];
  const t=WORLD.time;return[Math.sin(t*0.45)*4.5,Math.cos(t*0.3)*1.5];
}
function beltAt(x,y,z){for(const b of WORLD.belts)if(x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1&&Math.abs(y-b.y)<0.3)return b.v;return 0;}

/* ---- per frame: everything that moves in the scenery ---- */
function worldUpdate(dt){
  WORLD.time+=dt;
  for(const m of WORLD.movers){if(m.key)m.active=!!G.keys[m.key];placeMover(m,dt);}
  for(const L of WORLD.lasers){L.on=((WORLD.time+L.phase)%3.2)<1.7;}
  for(const g of WORLD.gates){if(g.opening&&g.open<1)g.open=Math.min(1,g.open+dt*0.8);if(g.open>=1)WORLD.boxes[g.box].off=true;}
  const tr=WORLD.train;tr.t=(tr.t+tr.sp*dt)%tr.span;
  for(const p of WORLD.patrols){p.ph+=dt*0.35;const tx=p.cx+Math.cos(p.ph)*p.rad,tz=p.cz+Math.sin(p.ph*1.3)*p.rad;p.spot=[tx,p.base,tz];}
  for(const bd of WORLD.birds){
    if(!bd.fly&&Math.hypot(bd.x-P.x,bd.z-P.z)<6){bd.fly=true;bd.vx=(bd.x-P.x)*1.5+(rng()-.5)*3;bd.vz=(bd.z-P.z)*1.5+(rng()-.5)*3;bd.vy=5+rng()*3;bd.t=0;}
    if(bd.fly){bd.t+=dt;bd.x+=bd.vx*dt;bd.y+=bd.vy*dt;bd.z+=bd.vz*dt;bd.vy+=1.5*dt;if(bd.t>12){bd.fly=false;[bd.x,bd.y,bd.z]=bd.home;}}
  }
}
function sceneryFrame(time,dt){
  const D=R.dyn,Gl=R.glass,A=R.add,T=WORLD.T;
  for(const car of WORLD.cars){
    const L=car.lane;car.t=(car.t+L.sp*dt)%L.span;
    const p=L.dir*(car.t-L.span/2),x=L.alongX?WORLD.bounds.cx+p:L.off,z=L.alongX?L.off:WORLD.bounds.cz+p;
    const hx=L.alongX?1.9:.85,hz=L.alongX?.85:1.9,fx=L.alongX?L.dir:0,fz=L.alongX?0:L.dir;
    D.aabb(x-hx,L.y-.45,z-hz,x+hx,L.y+.45,z+hz,[.3,.3,.38],0,12,0,1,TILE.hull,[.3,.9,1]);
    D.aabb(x-hx*.6,L.y+.45,z-hz*.6,x+hx*.6,L.y+.8,z+hz*.6,[.2,.22,.3],0,0,0);
    D.aabb(x+fx*hx-.15,L.y-.15,z+fz*hz-.15,x+fx*hx+.15,L.y+.15,z+fz*hz+.15,[1,.95,.85],3,0);
    D.aabb(x-fx*hx-.12,L.y-.12,z-fz*hz-.12,x-fx*hx+.12,L.y+.12,z-fz*hz+.12,[1,.1,.2],3,0);
    D.aabb(x-hx,L.y-.5,z-hz,x+hx,L.y-.45,z+hz,car.c,1.5,0);
  }
  const tr=WORLD.train;
  for(let i=0;i<tr.len;i++){const x=WORLD.bounds.cx-tr.span/2+tr.t-i*13;
    D.aabb(x-6,tr.y-1.4,tr.off-1.6,x+6,tr.y+1.4,tr.off+1.6,[.6,.62,.7],0,12,0,1,TILE.hull,[1,.6,.3]);
    D.aabb(x-5.5,tr.y-0.1,tr.off-1.62,x+5.5,tr.y+0.7,tr.off+1.62,[1,.85,.55],1.6,0,0);}
  D.aabb(WORLD.bounds.cx-tr.span/2-10,tr.y+1.6,tr.off-0.3,WORLD.bounds.cx+tr.span/2,tr.y+2,tr.off+0.3,T.metal,0,0,0);
  for(const h of WORLD.holos){
    const a=0.24+0.08*Math.sin(time*2+h.ph)+(Math.sin(time*31+h.ph)>.97?-.15:0);
    Gl.aabb(h.x-h.w/2,h.y,h.z-h.d/2,h.x+h.w/2,h.y+h.h,h.z+h.d/2,h.c,1.2,15,(h.ph*99)|0,Math.max(0.05,a),h.tile,h.c);
  }
  for(const g of WORLD.gates){const b=WORLD.boxes[g.box],drop=(b.y1-b.y0)*g.open;
    if(g.open<1)D.aabb(b.x0,b.y0-drop,b.z0,b.x1,b.y1-drop,b.z1,KEYCOL[g.key],1.1,5,7,1,TILE.field,KEYCOL[g.key]);}
  for(const m of WORLD.movers){const b=m.box,c=m.key&&!m.active?[1,.25,.3]:[.3,.95,.5];
    D.aabb(b.x0,b.y0,b.z0,b.x1,b.y1,b.z1,T.metal,0,12,0,1,TILE.plate);
    D.aabb(b.x0,b.y1,b.z0,b.x1,b.y1+0.06,b.z0+0.2,[1,1,1],0,12,0,1,TILE.hazard);D.aabb(b.x0,b.y1,b.z1-0.2,b.x1,b.y1+0.06,b.z1,[1,1,1],0,12,0,1,TILE.hazard);
    D.aabb(m.pos[0]-.2,b.y1,m.pos[2]-.2,m.pos[0]+.2,b.y1+1.1,m.pos[2]+.2,T.metal,0,0,0);D.aabb(m.pos[0]-.25,b.y1+1.1,m.pos[2]-.25,m.pos[0]+.25,b.y1+1.3,m.pos[2]+.25,c,2.5,0,0);
    if(m.type==='crane')A.aabb(m.pos[0]-.03,b.y1,m.pos[2]-.03,m.pos[0]+.03,b.y1+30,m.pos[2]+.03,[.6,.6,.7],1,0,0,0.5);
    else for(const [cx,cz] of [[b.x0,b.z0],[b.x1,b.z0],[b.x0,b.z1],[b.x1,b.z1]])D.aabb(cx-.08,m.p0[1],cz-.08,cx+.08,m.p1[1]+3,cz+.08,T.metal,0,0,0);
  }
  for(const L of WORLD.lasers){
    const c=L.on?[1,.15,.25]:[.4,.1,.15],a=L.on?0.9:0.15;
    for(const hy of [0.45,1.05,1.65]){
      if(L.axis==='x')A.aabb(L.at-.03,L.y+hy-.03,L.c-2.2,L.at+.03,L.y+hy+.03,L.c+2.2,c,3,14,0,a);
      else A.aabb(L.c-2.2,L.y+hy-.03,L.at-.03,L.c+2.2,L.y+hy+.03,L.at+.03,c,3,14,0,a);
    }
    for(const s of [-1,1]){const px=L.axis==='x'?L.at:L.c+s*2.25,pz=L.axis==='x'?L.c+s*2.25:L.at;D.aabb(px-.12,L.y,pz-.12,px+.12,L.y+2,pz+.12,T.metal,0,0,0);}
  }
  for(const rg of WORLD.rings){
    const c=rg.got?[.3,1,.5]:[.3,.9,1];
    for(let i=0;i<14;i++){const a=i/14*TAU;Gl.aabb(rg.x-.18,rg.y+Math.sin(a)*2.2-.18,rg.z+Math.cos(a)*2.2-.18,rg.x+.18,rg.y+Math.sin(a)*2.2+.18,rg.z+Math.cos(a)*2.2+.18,c,2.5,0,0,rg.got?0.35:0.9);}
  }
  if(WORLD.W.reactor){const c=WORLD.W.reactor;
    for(let k=0;k<3;k++){const y=c.y+6+k*5,rad=5+k*1.4;for(let i=0;i<14;i++){const a=i/14*TAU+time*(k%2?-0.6:0.8);
      XF.reset().t(c.x+Math.cos(a)*rad,y,c.z+Math.sin(a)*rad).ry(-a);D.part('box',XF.m,0.5,0.35,1.6,i%2?[1,.55,.2]:T.metal,i%2?2:0,12,1,i%2?-1:TILE.metal);}}}
  for(const p of WORLD.patrols){
    if(!p.spot)continue;const dx=p.cx+Math.cos(p.ph*0.7)*4,dz=p.cz+Math.sin(p.ph*0.7)*4;
    XF.reset().t(dx,p.y,dz);D.part('box',XF.m,1.1,0.35,1.1,[.3,.3,.38],0,12,1,TILE.drone,[1,.3,.3]);
    const sx=p.spot[0],sz=p.spot[2],h=p.y-p.base,l=Math.hypot(sx-dx,h,sz-dz);
    XF.reset().t((dx+sx)/2,(p.y+p.base)/2,(dz+sz)/2).ry(Math.atan2(dx-sx,dz-sz)).rx(Math.acos(clamp(h/l,-1,1)));
    A.part('cone',XF.m,7,l,7,[1,.95,.8],0.4,0,0.07);
    Gl.aabb(sx-3.2,p.base+0.03,sz-3.2,sx+3.2,p.base+0.05,sz+3.2,[1,.9,.75],0.5,0,0,0.1,-1,null,'cyl12');
  }
  for(const bd of WORLD.birds){const f=bd.fly?Math.sin(time*30)*0.15:0;
    D.aabb(bd.x-.12,bd.y,bd.z-.08,bd.x+.12,bd.y+.12,bd.z+.08,[.08,.08,.1],0,0,0);
    if(bd.fly){D.aabb(bd.x-.35,bd.y+.08+f,bd.z-.04,bd.x-.1,bd.y+.1+f,bd.z+.04,[.08,.08,.1],0,0,0);D.aabb(bd.x+.1,bd.y+.08+f,bd.z-.04,bd.x+.35,bd.y+.1+f,bd.z+.04,[.08,.08,.1],0,0,0);}}
}

/* ---- physics against the boxes ---- */
const QB=[];
function moveAxis(e,axis,d){
  if(!d)return null;
  e[axis]+=d;
  const hw=e.hw;
  query(e.x-hw,e.z-hw,e.x+hw,e.z+hw,QB);
  let hit=null;
  for(const b of QB){
    if(e.x+hw<=b.x0||e.x-hw>=b.x1||e.z+hw<=b.z0||e.z-hw>=b.z1||e.y+e.h<=b.y0||e.y>=b.y1)continue;
    if(axis==='y'){if(d<0){e.y=b.y1;e.ground=b;}else e.y=b.y0-e.h;hit=b;}
    else{
      if(b.y1-e.y<=0.55&&e.stepOK!==false&&!stepBlocked(e,b.y1)){e.y=b.y1+0.001;continue;}
      if(axis==='x')e.x=d>0?b.x0-hw-0.001:b.x1+hw+0.001;else e.z=d>0?b.z0-hw-0.001:b.z1+hw+0.001;
      hit=b;
    }
  }
  return hit;
}
function stepBlocked(e,y){for(const b of QB)if(!(e.x+e.hw<=b.x0||e.x-e.hw>=b.x1||e.z+e.hw<=b.z0||e.z-e.hw>=b.z1)&&b.y1>y+0.01&&b.y0<y+e.h)return true;return false;}
function groundAt(x,z,y){
  query(x-.05,z-.05,x+.05,z+.05,QB);let best=null;
  for(const b of QB)if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1&&b.y1<=y+0.6&&(!best||b.y1>best.y1))best=b;
  return best;
}
const RQ=[];
function raycast(ox,oy,oz,dx,dy,dz,maxD,skipLow){
  const ex=ox+dx*maxD,ez=oz+dz*maxD;
  query(Math.min(ox,ex)-.1,Math.min(oz,ez)-.1,Math.max(ox,ex)+.1,Math.max(oz,ez)+.1,RQ);
  let best=maxD;
  for(const b of RQ){
    if(skipLow&&(b.k==='rail'||b.k==='crate'||b.k==='prop'))continue;
    let t0=0,t1=best,miss=false;
    for(const [o,d,lo,hi] of [[ox,dx,b.x0,b.x1],[oy,dy,b.y0,b.y1],[oz,dz,b.z0,b.z1]]){
      if(Math.abs(d)<1e-9){if(o<lo||o>hi){miss=true;break;}continue;}
      let a=(lo-o)/d,c=(hi-o)/d;if(a>c){const t=a;a=c;c=t;}
      if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1){miss=true;break;}
    }
    if(!miss&&t0<best&&t0>=0)best=t0;
  }
  return best;
}
function losClear(a,b){
  const dx=b.x-a.x,dy=(b.y+1.4)-(a.y+1.4),dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1;
  return raycast(a.x,a.y+1.4,a.z,dx/d,dy/d,dz/d,d,true)>=d-0.3;
}
function pickLights(cx,cy,cz,extra){
  const all=WORLD.lights.concat(extra);
  for(const L of all)L._d=(L.x-cx)**2+(L.y-cy)**2*.5+(L.z-cz)**2-(L.i>2?400:0);
  all.sort((a,b)=>a._d-b._d);
  return all.slice(0,24);
}
