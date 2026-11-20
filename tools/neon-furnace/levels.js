/* ------------------------------------------------------------ level data
   Every level is a grid of characters. Before anything ships it is run
   through checkLevel(): every row the same width, a solid border, one
   start, one exit, and a flood fill that collects keycards as it goes to
   prove each key is reachable before the door it opens, and that every
   enemy, item and secret can be reached (so 100% is always possible).

   Walls   #  themed wall   =  pipes   %  brick   !  hazard   T  terminal
           N  neon sign     G  window  X  exit switch
   Doors   +  door   b y r  keycard doors   x  secret door   o  core lock
   Floor   .  floor   ,  grate   :  tiles   ~  charged runoff (hurts)
           *  secret spot   @  start
   Enemies z  drone   g  guard   p  hacker   m  mech   d  the Warden
   Items   h H  health   v V  armour   c C  rounds   s S  shells   e  cells
           w scattergun   W pulse rifle   Q plasma arc   L rail cannon
           B Y R  keycards                                                */
const NF_LEVELS=[
{name:'UNDERCITY MARKET',par:120,theme:'market',sky:true,rain:true,fog:[46,6,40],bpm:128,root:45,rows:[
'########################################',
'#@.......#.........#####...............#',
'#........#....z....#...#....z.....z....#',
'#...z....+.........+.h.+...............#',
'#........#.........#...#......~~~~.....#',
'#...h....#.........#####.....~~~~~~....#',
'####+#####.........#........#~~~~~~~#..#',
'#........#.........#........#~~~~~~~#..#',
'#........#....s....#...g....#.~~~~~.#..#',
'#...w....+.........#........#..~~~..#..#',
'#....g...#.........#........#.......#..#',
'#........###########........#########..#',
'#........#.........#........#..........#',
'#...z....#...C..z..#........#....g.....#',
'#........+.........+........+..........#',
'#........#.........#........#....B.....#',
'##########.........#........#..........#',
'#..*.....x.........#...z....#..........#',
'#........#.........#........############',
'#...V....#####b#####........#..........#',
'#........#.........#........#...X......#',
'#........#....H....#........b..........#',
'#........#.........#........#.......g..#',
'########################################']},
{name:'DATA VAULT',par:190,theme:'vault',sky:false,rain:false,fog:[0,26,40],bpm:130,root:41,rows:[
'############################################',
'#@......#..........#.......................#',
'#.......#..........#...z.......z...........#',
'#...z...+..........+.......................#',
'#.......#....h.....#...~~~~~~~~~~~~~~~~....#',
'#.......#..........#...~~~~~~~~~~~~~~~~....#',
'####+####..........#...~~~~..........~~....#',
'#.......#..........#...~~~~..........~~....#',
'#.......#..........#...~~~~....V.....~~....#',
'#...s...#....z.....#...~~~~..........~~....#',
'#.......+..........#...~~~~~~~~~~~~~~~~....#',
'#.......#..........#...~~~~~~~~~~~~~~~~....#',
'#..*....x..........#..........g............#',
'#.......#..........#####+###################',
'#...W...#..........#......#................#',
'#.......#..........#..g...#....g.......g...#',
'#########....g.....#......#................#',
'#........#.........#......+................#',
'#........#....C....#......#......Y.........#',
'#...p....+.........#......#................#',
'#........#.........#......#................#',
'#........#.........#####y########+##########',
'#........#.........#..........#............#',
'##########.........#....H.....#...*........#',
'#..................#..........#............#',
'#....z.............y..........x............#',
'#..................#..........#...V........#',
'#.........z........#....B.....#............#',
'#..................#..........#............#',
'####################b#######################',
'#..........................................#',
'#.......p..........X..........p.....z......#',
'#..........................................#',
'############################################']},
{name:'NEON ROOFTOPS',par:150,theme:'roof',sky:true,rain:true,fog:[30,10,52],bpm:132,root:38,rows:[
'############################################',
'#@....#..........................#.........#',
'#.....#...z.........~~~~.........#...z.....#',
'#..h..+............~~~~~~........+.........#',
'#.....#....g.......~~~~~~....z...#....p....#',
'#.....#..............~~..........#.........#',
'##x####.........z................#.........#',
'#.....#..........................#....B....#',
'#.*...#....~~~...........g.......#.........#',
'#.....#...~~~~~..................#...z.....#',
'#...V.#....~~~.....Q.............#.........#',
'#.....#..................e.......#....h....#',
'#.....#.....s....................#.........#',
'############b###############################',
'#......#..........#........................#',
'#..g...+....g.....#.....z.........~~~~.....#',
'#......#..........y.................~~~~...#',
'#..e...#....Y.....#.......g..........~~....#',
'#......#..........#..............p.........#',
'#..C...#.....g....#.........H..............#',
'###############################X############']},
{name:'THE CORE',par:270,theme:'core',sky:false,rain:false,fog:[52,8,10],bpm:134,root:36,rows:[
'################################################',
'#@........#............#.......................#',
'#.........#.....z......#....z............z.....#',
'#...z.....+............+.......................#',
'#.........#.....h......#..~~~~~~~~~~~~~~~~~....#',
'#.........#............#..~~~~~~~~~~~~~~~~~....#',
'#####+#####............#..~~~............~~~...#',
'#.........#....g.......#..~~~...L.e......~~~...#',
'#...S.....#............#..~~~............~~~...#',
'#.........+............#..~~~~~~~~~~~~~~~~~....#',
'#.........#............#..~~~~~~~~~~~~~~~~~....#',
'#..*......x............#..........z............#',
'#.........#............####+####################',
'#...V.....#............#...........#...........#',
'###########.....z......#....g......#....g......#',
'#.........#............#...........#...........#',
'#.........#............+...........+...........#',
'#...p.....#............#...........#...........#',
'#.........#............#....Y......#....C......#',
'#.........+............#...........#...........#',
'#.........#............#####y###################',
'###########............#...........#...........#',
'#.........#............#...........x....*......#',
'#.........#............#....p......#...........#',
'#...g.....+............+...........#....V......#',
'#.........#............#...........#...........#',
'#.........#............#####+###################',
'###########............#...........#...........#',
'#.........#............#....R......#...........#',
'#.........#.......g....#.......................#',
'#....p....#............r.......................#',
'#.........#............#.................m.....#',
'#.........#............#.......................#',
'#.........+............#####+######............#',
'#.........#............#.........e.......X.....#',
'#..H......#............#.......................#',
'#.........#............#.....z.................#',
'################################################']},
{name:'THE SPIRE',par:300,theme:'spire',sky:false,rain:false,fog:[12,18,52],bpm:136,root:40,boss:true,rows:[
'################################################',
'#@............#................#...............#',
'#.............#....p......p....#...............#',
'#.....g.......#................#...............#',
'#.............b................#.......#.......#',
'#..h......g...#.......Y........#...............#',
'#.............#................#...............#',
'#.............#....e.....p.....#...#.......#...#',
'#######+###############y########.......d.......#',
'#.............#................#...............#',
'#....z...z....#.....m..........#...#.......#...#',
'#.............#................#...........#####',
'#......B......#.......R........r...........o..X#',
'#.............#................#...........#####',
'#....z...z....#.....g....g.....#...#.......#...#',
'#.............#................#...............#',
'#.....H.......#.......h........#...............#',
'#######+########################...#.......#...#',
'#.............#................#...............#',
'#..s......c...#.....e....e.....#.......#.......#',
'#.............x...*............#...............#',
'#.....V.......#....L...........#.......H.......#',
'################################################']}
];

const NF_WALLS='#=%!TNGX', NF_DOORS='+byrxo';
const NF_KEYDOOR={b:'B',y:'Y',r:'R'};
const NF_ENEMIES='zgpmd', NF_ITEMS='hHvVcCsSewWQLBYR';

/* Returns a list of problems; an empty list means the level ships. */
function nfCheckLevel(L){
  const P=[], rows=L.rows, H=rows.length, W=rows[0].length;
  rows.forEach((r,y)=>{if(r.length!==W)P.push('row '+y+' is '+r.length+' wide, expected '+W);});
  if(P.length)return P;
  const at=(x,y)=>rows[y][x];
  for(let x=0;x<W;x++){if(!NF_WALLS.includes(at(x,0))||!NF_WALLS.includes(at(x,H-1)))P.push('open border at column '+x);}
  for(let y=0;y<H;y++){if(!NF_WALLS.includes(at(0,y))||!NF_WALLS.includes(at(W-1,y)))P.push('open border at row '+y);}
  let start=null,exits=0;const keysPlaced=new Set(),doorsNeed=new Set();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const c=at(x,y);
    if(c==='@'){if(start)P.push('two starts');start=[x,y];}
    if(c==='X')exits++;
    if('BYR'.includes(c))keysPlaced.add(c);
    if(NF_KEYDOOR[c])doorsNeed.add(NF_KEYDOOR[c]);
    if(!NF_WALLS.includes(c)&&!NF_DOORS.includes(c)&&!'.,:~*@'.includes(c)&&!NF_ENEMIES.includes(c)&&!NF_ITEMS.includes(c))P.push('unknown character '+c+' at '+x+','+y);
  }
  if(!start)P.push('no start');
  if(exits!==1)P.push(exits+' exits, expected 1');
  for(const k of doorsNeed)if(!keysPlaced.has(k))P.push('door needs key '+k+' that is not placed');
  if(P.length)return P;
  // progressive flood fill: collect keys, reopen, repeat until nothing changes
  const have=new Set();let seen;
  for(let pass=0;pass<8;pass++){
    seen=new Uint8Array(W*H);
    const q=[start];seen[start[1]*W+start[0]]=1;
    while(q.length){
      const [x,y]=q.pop();
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H||seen[ny*W+nx])continue;
        const c=at(nx,ny);
        if(NF_WALLS.includes(c))continue;
        if(NF_KEYDOOR[c]&&!have.has(NF_KEYDOOR[c]))continue;
        seen[ny*W+nx]=1;q.push([nx,ny]);
      }
    }
    let grew=false;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(seen[y*W+x]&&'BYR'.includes(at(x,y))&&!have.has(at(x,y))){have.add(at(x,y));grew=true;}
    if(!grew)break;
  }
  let exitOK=false;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const c=at(x,y);
    if(c==='X')for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<W&&ny<H&&seen[ny*W+nx])exitOK=true;}
    else if(!NF_WALLS.includes(c)&&!seen[y*W+x]&&(NF_ENEMIES.includes(c)||NF_ITEMS.includes(c)||c==='*'))P.push('unreachable '+c+' at '+x+','+y);
  }
  if(!exitOK)P.push('exit not reachable');
  for(const k of keysPlaced)if(!have.has(k))P.push('key '+k+' not reachable');
  return P;
}

/* ------------------------------------------------- Overdrive arena maker
   One seeded room: pillars, cover walls and charged pools, with the start in
   the middle. A flood fill rejects any layout that seals a pocket off.    */
function nfRand(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function nfArena(seed){
  for(let attempt=0;attempt<40;attempt++){
    const r=nfRand(seed+attempt*7919), N=31, g=[];
    for(let y=0;y<N;y++){g.push([]);for(let x=0;x<N;x++)g[y].push(x===0||y===0||x===N-1||y===N-1?'#':'.');}
    const mid=N>>1, deco='#=%TN';
    const clear=(x,y)=>Math.abs(x-mid)<3&&Math.abs(y-mid)<3;
    // mirrored pillars so every side plays the same
    const nP=6+((r()*5)|0);
    for(let i=0;i<nP;i++){
      const x=2+((r()*(mid-3))|0), y=2+((r()*(mid-3))|0), w=1+((r()*3)|0), h=1+((r()*3)|0);
      const ch=deco[(r()*deco.length)|0];
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
        for(const [px,py] of [[xx,yy],[N-1-xx,yy],[xx,N-1-yy],[N-1-xx,N-1-yy]])if(!clear(px,py))g[py][px]=ch;
      }
    }
    const nPool=2+((r()*3)|0);
    for(let i=0;i<nPool;i++){
      const x=3+((r()*(N-8))|0), y=3+((r()*(N-8))|0), w=2+((r()*4)|0), h=2+((r()*3)|0);
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(g[yy][xx]==='.'&&!clear(xx,yy))g[yy][xx]='~';
    }
    g[mid][mid]='@';
    // connectivity
    const seen=new Uint8Array(N*N), q=[[mid,mid]];seen[mid*N+mid]=1;let n=1,floor=0;
    while(q.length){const [x,y]=q.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;
      if(seen[ny*N+nx]||'#=%TN'.includes(g[ny][nx]))continue;seen[ny*N+nx]=1;n++;q.push([nx,ny]);}}
    for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!'#=%TN'.includes(g[y][x]))floor++;
    if(n===floor)return g.map(row=>row.join(''));
  }
  // a plain room is always valid
  const N=31,rows=[];for(let y=0;y<N;y++)rows.push(y===0||y===N-1?'#'.repeat(N):'#'+'.'.repeat(N-2)+'#');
  rows[15]=rows[15].slice(0,15)+'@'+rows[15].slice(16);return rows;
}

/* The daily run: the same arena, loadout and twist for everyone on a given
   UTC day, so two people can compare a score fairly.                      */
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
  const pool=[1,2,3,4];
  const a=pool.splice((r()*pool.length)|0,1)[0], b=pool.splice((r()*pool.length)|0,1)[0];
  return{key, label:String(key).replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'),
    seed:(key*40503)>>>0, weapons:[0,a,b].sort(), twist:NF_TWISTS[(r()*NF_TWISTS.length)|0]};
}

if(typeof module!=='undefined')module.exports={NF_LEVELS,nfCheckLevel,nfArena,nfDaily,NF_TWISTS};
