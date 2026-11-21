/* ================================== ART ==================================
   Every texture in the game is painted here by code into one 1024x1024
   atlas when the page loads: walls, signs in an invented alphabet, posters,
   graffiti, suits, faces, armour and the portraits on the radio. Alpha
   carries a flag: under a quarter is cut out, under three quarters glows,
   the rest is ordinary surface. Then the low-polygon shapes are built:
   tapered limbs, bevelled heads, wedges, cylinders, cones and planes.      */
const ATN=16, TS=64, ATS=ATN*TS;
const atlasCanvas=document.createElement('canvas');atlasCanvas.width=atlasCanvas.height=ATS;
const ac=atlasCanvas.getContext('2d',{willReadFrequently:true});
const TILE={};let tileN=0;
const GLOW=new Set();                         // tiles whose bright, saturated texels glow
function tile(name,draw,glow){
  const i=tileN++,x=(i%ATN)*TS,y=((i/ATN)|0)*TS;
  ac.save();ac.translate(x,y);ac.beginPath();ac.rect(0,0,TS,TS);ac.clip();draw(ac);ac.restore();
  TILE[name]=i;if(glow)GLOW.add(i);return i;
}
const R8=s=>mulberry32(s*7919+13);
function speck(c,n,a,seed,col){const r=R8(seed);n=Math.round(n*0.3);a*=0.7;for(let i=0;i<n;i++){c.fillStyle='rgba('+(col||'255,255,255')+','+(a*r()).toFixed(3)+')';c.fillRect(r()*TS|0,r()*TS|0,1+(r()*2|0),1);}}
const F=(c,col,x,y,w,h)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
// every tile keeps its top-left 8x8 as plain fill: meshes map their back faces there
const plain=(c,col)=>{F(c,col,0,0,TS,TS);};

/* ---- the invented alphabet: signs readable as writing, saying nothing ---- */
function glyph(c,x,y,s,seed){
  const r=R8(seed);c.lineWidth=Math.max(1,s*0.16);c.lineCap='square';c.beginPath();
  const n=2+(r()*3|0);
  for(let i=0;i<n;i++){const a=[r()*s,r()*s],b=[r()*s,r()*s];
    if(r()<.5){a[0]=Math.round(a[0]/(s/2))*(s/2);b[0]=a[0];}else{a[1]=Math.round(a[1]/(s/2))*(s/2);b[1]=a[1];}
    c.moveTo(x+a[0],y+a[1]);c.lineTo(x+b[0],y+b[1]);}
  c.stroke();
}
function signTile(name,bg,fg,frame,seed,vert){
  return tile(name,c=>{
    plain(c,'#0b0a12');F(c,bg,4,4,56,56);
    c.strokeStyle=frame;c.lineWidth=2;c.strokeRect(6,6,52,52);
    c.strokeStyle=fg;
    if(vert)for(let i=0;i<4;i++)glyph(c,22,10+i*12,10,seed+i);
    else{for(let i=0;i<3;i++)glyph(c,10+i*16,18,12,seed+i);for(let i=0;i<4;i++)glyph(c,10+i*12,38,8,seed+9+i);}
  },true);
}

function buildAtlas(){
  // ----- world surfaces -----
  tile('concrete',c=>{plain(c,'#666370');const r=R8(1);for(let i=0;i<10;i++){const v=98+r()*14|0;F(c,'rgba('+v+','+(v-3)+','+(v+8)+',.35)',r()*TS,r()*TS,8+r()*20,6+r()*14);}
    F(c,'#55525e',0,31,TS,1);F(c,'#55525e',31,0,1,TS);F(c,'#77748080',0,32,TS,1);speck(c,400,.25,2,'20,20,30');});
  tile('brick',c=>{plain(c,'#5a3a40');const r=R8(3);for(let y=0;y<TS;y+=8){const o=(y/8)&1?8:0;for(let x=-8;x<TS;x+=16){const v=.75+r()*.45;
    F(c,'rgb('+(118*v|0)+','+(64*v|0)+','+(70*v|0)+')',x+o+1,y+1,14,6);}}speck(c,300,.3,4,'0,0,0');});
  tile('metal',c=>{plain(c,'#6a7080');F(c,'#56596a',2,2,28,28);F(c,'#5e6274',34,2,28,28);F(c,'#5a5e70',2,34,28,28);F(c,'#626678',34,34,28,28);
    c.fillStyle='#8a90a4';for(const [x,y] of [[4,4],[26,4],[4,26],[26,26],[36,36],[58,58],[36,58],[58,36]])c.fillRect(x,y,2,2);speck(c,300,.2,5,'0,0,0');});
  tile('plate',c=>{plain(c,'#7a7e8a');c.fillStyle='#8e93a0';for(let y=0;y<TS;y+=8)for(let x=(y/8&1)*4;x<TS;x+=8){c.fillRect(x,y,4,2);}speck(c,200,.3,6,'0,0,0');});
  tile('rust',c=>{plain(c,'#6a4a3c');const r=R8(7);for(let i=0;i<70;i++){F(c,'rgba('+(140+r()*60|0)+','+(70+r()*30|0)+',30,'+(.2+r()*.4).toFixed(2)+')',r()*TS,r()*TS,2+r()*10,2+r()*6);}F(c,'#3e2a22',0,0,TS,2);F(c,'#3e2a22',0,32,TS,2);});
  tile('hazard',c=>{plain(c,'#1c1a20');c.fillStyle='#e0a820';for(let i=-TS;i<TS*2;i+=16){c.beginPath();c.moveTo(i,0);c.lineTo(i+8,0);c.lineTo(i+8-TS,TS);c.lineTo(i-TS,TS);c.fill();}speck(c,200,.3,8,'0,0,0');});
  tile('grate',c=>{plain(c,'#3a3a44');for(let y=0;y<TS;y+=8)F(c,'#5c5c6a',0,y,TS,4);for(let x=0;x<TS;x+=16)F(c,'#4a4a56',x,0,3,TS);});
  tile('floor',c=>{plain(c,'#4e4c5a');for(let y=0;y<4;y++)for(let x=0;x<4;x++)F(c,(x+y)&1?'#5a5868':'#535162',x*16+1,y*16+1,14,14);speck(c,300,.2,9,'0,0,0');});
  tile('asphalt',c=>{plain(c,'#393743');const r=R8(10);for(let i=0;i<40;i++){const v=52+r()*12|0;F(c,'rgba('+v+','+v+','+(v+8)+',.6)',r()*TS,r()*TS,2+r()*5,1+r()*3);}
    F(c,'#2e2c36',0,0,TS,1);F(c,'#2e2c36',0,0,1,TS);});
  tile('tar',c=>{plain(c,'#34323c');speck(c,600,.25,11,'90,90,110');F(c,'#2a2830',0,20,TS,1);F(c,'#2a2830',0,44,TS,1);});
  tile('glassWall',c=>{plain(c,'#2a3048');F(c,'#3a4468',0,0,TS,2);F(c,'#3a4468',0,0,2,TS);F(c,'#3a4468',31,0,2,TS);
    c.fillStyle='rgba(180,200,255,.12)';c.beginPath();c.moveTo(0,0);c.lineTo(24,0);c.lineTo(0,36);c.fill();});
  tile('wood',c=>{plain(c,'#6a4a32');for(let x=0;x<TS;x+=8){F(c,x%16?'#7a563a':'#64462e',x,0,7,TS);}F(c,'#3a2a1c',0,14,TS,3);F(c,'#3a2a1c',0,46,TS,3);});
  tile('shutter',c=>{plain(c,'#6a6e7a');for(let y=0;y<TS;y+=4)F(c,y%8?'#5a5e6a':'#7a7e8a',0,y,TS,3);F(c,'#3a3c44',0,58,TS,6);});
  tile('server',c=>{plain(c,'#1a1e2a');for(let y=2;y<TS;y+=10){F(c,'#262c3c',3,y,58,8);const r=R8(y);for(let i=0;i<6;i++)F(c,r()<.5?'#2ef2ff':'#9dff3c',6+i*8,y+3,2,2);F(c,'#3a4258',44,y+2,14,4);}},true);
  tile('pipe',c=>{plain(c,'#5a5e6c');for(let i=0;i<4;i++){const g=c.createLinearGradient(i*16,0,i*16+14,0);g.addColorStop(0,'#3a3e48');g.addColorStop(.5,'#9aa0b0');g.addColorStop(1,'#3a3e48');c.fillStyle=g;c.fillRect(i*16+1,0,14,TS);F(c,'#2a2c34',i*16+1,20+i*9,14,3);}});
  tile('vent',c=>{plain(c,'#5a5e6a');F(c,'#2a2c34',6,6,52,52);for(let y=10;y<56;y+=6)F(c,'#6a6e7c',8,y,48,3);});
  tile('screen',c=>{plain(c,'#141820');F(c,'#030608',5,5,54,40);const r=R8(12);for(let i=0;i<8;i++)F(c,i===3?'#ff3fb4':'#2ef2ff',8,8+i*4,6+(r()*40|0),2);F(c,'#2a2e38',5,49,54,10);},true);
  tile('stream',c=>{plain(c,'#04101a');const r=R8(13);for(let x=2;x<TS;x+=6)for(let y=r()*20|0;y<TS;y+=10+(r()*14|0))F(c,r()<.7?'#2ef2ff':'#ffffff',x,y,2,4+(r()*5|0));},true);
  tile('awning',c=>{plain(c,'#ffffff');for(let x=0;x<TS;x+=16)F(c,'#c8c8c8',x,0,8,TS);F(c,'#8a8a8a',0,TS-6,TS,6);});
  tile('cloth',c=>{plain(c,'#c8c8c8');speck(c,500,.25,14,'0,0,0');for(let y=0;y<TS;y+=6)F(c,'#b8b8b8',0,y,TS,1);});
  tile('water',c=>{plain(c,'#0a2030');speck(c,300,.4,15,'60,200,255');F(c,'#2ef2ff',0,0,TS,1);},true);
  tile('field',c=>{plain(c,'#ffffff');for(let y=0;y<TS;y+=4)F(c,y%8?'rgba(255,255,255,.45)':'#ffffff',0,y,TS,2);},true);
  // signs and posters
  const SB=[['#160818','#ff3fb4','#2ef2ff'],['#061418','#2ef2ff','#ffb12e'],['#180c04','#ffb12e','#ff3fb4'],['#100620','#b46bff','#ff3fb4'],['#0a1606','#9dff3c','#2ef2ff'],['#180608','#ff3b4e','#ffb12e']];
  for(let i=0;i<12;i++){const s=SB[i%6];signTile('sign'+i,s[0],s[1],s[2],100+i*17,i>=6);}
  for(let i=0;i<6;i++)tile('poster'+i,c=>{const r=R8(200+i);const hue=r()*360|0;
    plain(c,'hsl('+hue+',40%,30%)');const g=c.createLinearGradient(0,0,0,TS);g.addColorStop(0,'hsl('+hue+',70%,55%)');g.addColorStop(1,'hsl('+((hue+80)%360)+',70%,25%)');
    c.fillStyle=g;c.fillRect(6,4,52,56);c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.arc(32,28,12+r()*6,0,TAU);c.fill();
    c.strokeStyle='#ffffff';glyph(c,12,46,10,300+i);glyph(c,28,46,10,310+i);glyph(c,44,46,8,320+i);});
  for(let i=0;i<3;i++)tile('tag'+i,c=>{plain(c,'#2a2830');const r=R8(400+i),col=['#ff3fb4','#9dff3c','#2ef2ff'][i];c.strokeStyle=col;c.lineWidth=5;c.lineCap='round';
    c.beginPath();c.moveTo(8,40);for(let k=0;k<6;k++)c.quadraticCurveTo(10+k*9,10+r()*40,14+k*9,24+r()*24);c.stroke();
    c.lineWidth=2;c.strokeStyle='#ffffff';c.beginPath();c.moveTo(10,50);c.lineTo(54,46);c.stroke();},true);
  // ----- characters -----
  tile('suit',c=>{plain(c,'#9a9aa8');F(c,'#8a8a98',0,0,TS,TS);for(let y=8;y<TS;y+=14)F(c,'#6e6e7c',0,y,TS,2);F(c,'#6e6e7c',31,0,2,TS);
    F(c,'#ffffff',14,0,2,TS);F(c,'#ffffff',48,0,2,TS);speck(c,200,.15,20,'0,0,0');},true);
  tile('suitPlain',c=>{plain(c,'#9a9aa8');speck(c,300,.15,21,'0,0,0');F(c,'#7a7a88',0,30,TS,2);});
  tile('emblem',c=>{plain(c,'#8a8a98');F(c,'#7a7a88',0,0,TS,TS);c.fillStyle='#ffffff';
    // a stylised kestrel wing chevron, the hero's own mark
    c.beginPath();c.moveTo(32,14);c.lineTo(58,30);c.lineTo(46,30);c.lineTo(32,22);c.lineTo(18,30);c.lineTo(6,30);c.closePath();c.fill();
    c.beginPath();c.moveTo(32,30);c.lineTo(44,40);c.lineTo(32,50);c.lineTo(20,40);c.closePath();c.fill();},true);
  tile('heroMask',c=>{plain(c,'#2a2a34');F(c,'#2a2a34',0,0,TS,TS);F(c,'#3a3a48',8,6,48,20);
    c.fillStyle='#ffffff';c.beginPath();c.moveTo(8,26);c.lineTo(28,22);c.lineTo(32,26);c.lineTo(36,22);c.lineTo(56,26);c.lineTo(54,32);c.lineTo(36,30);c.lineTo(32,33);c.lineTo(28,30);c.lineTo(10,32);c.fill();
    F(c,'#b89a88',18,40,28,20);F(c,'#8a6a5a',22,50,20,2);F(c,'#3a3a48',8,36,8,24);F(c,'#3a3a48',48,36,8,24);},true);
  tile('wing',c=>{plain(c,'#3a3a48');F(c,'#3a3a48',0,0,TS,TS);for(let x=4;x<TS;x+=15)F(c,'#ffffff',x,0,2,TS);c.fillStyle='rgba(255,255,255,.35)';c.fillRect(0,0,TS,TS);F(c,'#ffffff',0,TS-3,TS,3);},true);
  tile('jacket',c=>{plain(c,'#a0a0a0');F(c,'#909090',0,0,TS,TS);F(c,'#606060',30,0,4,TS);for(let y=6;y<TS;y+=8)F(c,'#d0d0d0',31,y,2,3);
    const r=R8(30);for(let i=0;i<14;i++)F(c,'#e8e8e8',4+r()*56,4+r()*56,2,2);F(c,'#707070',0,52,TS,4);});
  tile('jeans',c=>{plain(c,'#6a7aa0');F(c,'#5a6a90',0,0,TS,TS);speck(c,400,.25,31,'255,255,255');F(c,'#4a5a80',31,0,2,TS);const r=R8(32);for(let i=0;i<5;i++)F(c,'#9aaad0',r()*50,r()*60,8+r()*6,2);});
  for(let i=0;i<3;i++)tile('gangFace'+i,c=>{plain(c,'#b08a74');F(c,'#b08a74',0,0,TS,TS);const col=['#ff3fb4','#2ef2ff','#9dff3c'][i];
    c.fillStyle=col;if(i===0){c.fillRect(10,18,18,6);c.fillRect(36,18,18,6);c.fillRect(30,30,4,22);}
    else if(i===1){c.beginPath();c.moveTo(6,14);c.lineTo(58,40);c.lineTo(58,46);c.lineTo(6,20);c.fill();}
    else{for(let k=0;k<4;k++)c.fillRect(8+k*13,14,6,36);}
    F(c,'#ffffff',16,26,8,4);F(c,'#ffffff',40,26,8,4);F(c,'#3a1a1a',22,48,20,4);},true);
  tile('skinFace',c=>{plain(c,'#c8a088');F(c,'#c8a088',0,0,TS,TS);F(c,'#3a2a24',0,0,TS,12);F(c,'#2a2024',16,26,8,5);F(c,'#2a2024',40,26,8,5);F(c,'#a87a68',30,32,4,10);F(c,'#8a4a44',22,48,20,3);});
  tile('skinFace2',c=>{plain(c,'#8a6450');F(c,'#8a6450',0,0,TS,TS);F(c,'#1a1418',0,0,TS,16);F(c,'#1a1418',16,26,8,5);F(c,'#1a1418',40,26,8,5);F(c,'#6a3a34',22,48,20,3);});
  tile('armor',c=>{plain(c,'#9aa0b0');F(c,'#8a90a0',2,2,60,28);F(c,'#8a90a0',2,34,60,28);F(c,'#c0c6d4',2,2,60,2);F(c,'#c0c6d4',2,34,60,2);
    c.fillStyle='#3a3e4a';c.font='bold 14px monospace';c.fillText('07',36,56);F(c,'#ffffff',4,24,14,3);},true);
  tile('helmet',c=>{plain(c,'#8a90a0');F(c,'#8a90a0',0,0,TS,TS);F(c,'#202430',4,18,56,18);F(c,'#ffffff',8,24,48,6);F(c,'#6a7080',0,48,TS,16);},true);
  tile('coat',c=>{plain(c,'#7a6a80');F(c,'#6a5a70',0,0,TS,TS);F(c,'#ffffff',4,0,2,TS);F(c,'#ffffff',58,0,2,TS);
    c.strokeStyle='#ffffff';c.lineWidth=1;c.beginPath();c.moveTo(6,10);c.lineTo(20,10);c.lineTo(20,30);c.lineTo(10,30);c.moveTo(58,40);c.lineTo(44,40);c.lineTo(44,56);c.stroke();},true);
  tile('hood',c=>{plain(c,'#4a3a50');F(c,'#4a3a50',0,0,TS,TS);F(c,'#08060c',10,12,44,44);F(c,'#ffffff',18,30,8,4);F(c,'#ffffff',38,30,8,4);},true);
  tile('wrap',c=>{plain(c,'#3a3a44');F(c,'#3a3a44',0,0,TS,TS);for(let y=0;y<TS;y+=6)F(c,'#2a2a34',0,y,TS,2);F(c,'#ffffff',8,24,48,4);},true);
  tile('brute',c=>{plain(c,'#8a6a5a');F(c,'#8a6a5a',0,0,TS,TS);F(c,'#5a3a30',6,10,52,14);F(c,'#ffffff',12,14,40,4);F(c,'#3a2a24',14,40,36,12);for(let i=0;i<6;i++)F(c,'#d8d8d8',16+i*6,42,3,8);},true);
  tile('vest',c=>{plain(c,'#5a5a3a');F(c,'#4a4a30',0,0,TS,TS);for(let x=4;x<TS;x+=12)F(c,'#6a6a48',x,6,8,20);F(c,'#ffffff',2,30,TS-4,2);},true);
  for(let i=0;i<4;i++)tile('shirt'+i,c=>{const r=R8(500+i);const h=r()*360|0;plain(c,'hsl('+h+',30%,55%)');F(c,'hsl('+h+',30%,50%)',0,0,TS,TS);
    if(i%2)for(let y=0;y<TS;y+=10)F(c,'hsl('+((h+40)%360)+',40%,62%)',0,y,TS,4);else{c.fillStyle='hsl('+((h+120)%360)+',50%,60%)';c.beginPath();c.arc(32,24,10,0,TAU);c.fill();}});
  tile('mech',c=>{plain(c,'#8a8e9a');F(c,'#7a7e8a',2,2,60,60);F(c,'#e0a820',2,50,60,10);c.fillStyle='#1c1a20';for(let i=0;i<8;i++)c.fillRect(2+i*8,50,4,10);F(c,'#5a5e6a',30,2,4,46);c.fillStyle='#3a3e4a';c.font='bold 12px monospace';c.fillText('AT-5',6,20);});
  tile('drone',c=>{plain(c,'#5a5e6e');F(c,'#4a4e5e',0,0,TS,TS);F(c,'#ffffff',26,26,12,12);F(c,'#6a6e80',0,30,TS,4);},true);
  tile('hull',c=>{plain(c,'#4a4e5a');F(c,'#3a3e4a',0,0,TS,TS);for(let x=0;x<TS;x+=16)F(c,'#5a5e6a',x,0,1,TS);F(c,'#ffffff',0,40,TS,3);F(c,'#e0a820',0,56,TS,4);},true);
  tile('core',c=>{plain(c,'#2a2438');const g=c.createRadialGradient(32,32,2,32,32,30);g.addColorStop(0,'#ffffff');g.addColorStop(.4,'#d8b0ff');g.addColorStop(1,'#2a2438');c.fillStyle=g;c.fillRect(0,0,TS,TS);},true);
  // ----- radio portraits -----
  const portrait=(name,bg,draw)=>tile(name,c=>{plain(c,bg);const g=c.createLinearGradient(0,0,0,TS);g.addColorStop(0,bg);g.addColorStop(1,'#05040a');c.fillStyle=g;c.fillRect(0,0,TS,TS);draw(c);
    for(let y=0;y<TS;y+=3){c.fillStyle='rgba(0,0,0,.18)';c.fillRect(0,y,TS,1);}});
  portrait('pMira','#123040',c=>{F(c,'#c89a80',20,16,24,28);F(c,'#1a1a2a',16,8,32,14);F(c,'#1a1a2a',14,14,8,30);F(c,'#2ef2ff',22,26,8,3);F(c,'#2a2030',26,26,4,3);F(c,'#2a2030',36,26,6,3);F(c,'#8a4a50',28,36,10,2);F(c,'#2a3a5a',12,46,40,18);F(c,'#2ef2ff',44,18,3,10);});
  portrait('pWarden','#241038',c=>{c.fillStyle='#d8b0ff';c.beginPath();for(let i=0;i<8;i++){const a=i*TAU/8+TAU/16;c.lineTo(32+Math.cos(a)*22,32+Math.sin(a)*22);}c.fill();F(c,'#140a20',22,22,20,20);F(c,'#ffffff',28,28,8,8);});
  portrait('pChain','#301008',c=>{F(c,'#9a6a5a',16,14,32,30);F(c,'#ff3b4e',14,6,36,8);F(c,'#ffffff',22,24,6,3);F(c,'#ffffff',36,24,6,3);F(c,'#3a1a14',22,36,20,6);for(let i=0;i<5;i++)F(c,'#c8c8c8',10+i*10,50,6,6);});
  portrait('pTwins','#0a2028',c=>{F(c,'#4a3a50',6,12,24,40);F(c,'#4a3a50',34,12,24,40);F(c,'#2ef2ff',12,26,4,3);F(c,'#2ef2ff',20,26,4,3);F(c,'#ff3fb4',40,26,4,3);F(c,'#ff3fb4',48,26,4,3);});
  portrait('pHammer','#202430',c=>{F(c,'#4a4e5a',8,24,48,16);F(c,'#3a3e4a',4,30,10,6);F(c,'#3a3e4a',50,30,10,6);F(c,'#ff3b4e',28,28,8,6);F(c,'#e0a820',8,38,48,3);});
  portrait('pAtlas','#2a1a0a',c=>{F(c,'#8a8e9a',14,14,36,30);F(c,'#ffb12e',20,22,24,6);F(c,'#5a5e6a',8,44,48,14);F(c,'#e0a820',8,54,48,4);});
  portrait('pKestrel','#1a1020',c=>{F(c,'#2a2a34',16,10,32,36);F(c,'#ff3b4e',18,24,28,4);F(c,'#b89a88',22,34,20,10);F(c,'#2a2a34',10,46,44,18);F(c,'#ff3b4e',30,50,4,10);});

  // emissive and cut-out flags into alpha
  const d=ac.getImageData(0,0,ATS,ATS),u=d.data;
  for(let i=0;i<u.length;i+=4){
    const px=(i/4)%ATS,py=((i/4)/ATS)|0,t=((py/TS)|0)*ATN+((px/TS)|0);
    const r=u[i],g=u[i+1],b=u[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    if(u[i+3]<60){u[i+3]=0;continue;}
    const em=GLOW.has(t)&&((mx>=205&&mx-mn>=110)||mn>=236);
    u[i+3]=em?150:255;
  }
  ac.putImageData(d,0,0);
  return d;
}

/* ---------------------------------------------------------------- meshes
   Vertex format: position xyz, then uv. Faces facing +z are "front": on the
   *F variants only they get the whole tile, the rest use the tile's plain
   corner, so a face or an emblem shows once.                               */
const MESH={};
function meshFrom(name,build){const v=[];build((p,uv)=>v.push(p[0],p[1],p[2],uv[0],uv[1]));MESH[name]={data:new Float32Array(v),n:v.length/5};}
const CORNER=[[.02,.02],[.1,.02],[.1,.1],[.02,.1]];
function quad(push,a,b,c,d,full){
  const uv=full?[[0,1],[1,1],[1,0],[0,0]]:CORNER;
  for(const i of [0,1,2,0,2,3])push([a,b,c,d][i],uv[i]);
}
// a box tapered toward the top: tw, td are the top's width and depth as fractions; oz shifts the top forward
function taper(name,tw,td,oz,frontOnly){
  meshFrom(name,push=>{
    const B=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]];
    const T=[[-.5*tw,.5,-.5*td+oz],[.5*tw,.5,-.5*td+oz],[.5*tw,.5,.5*td+oz],[-.5*tw,.5,.5*td+oz]];
    quad(push,B[3],B[2],T[2],T[3],true);                 // front (+z)
    quad(push,B[1],B[0],T[0],T[1],!frontOnly);           // back
    quad(push,B[0],B[3],T[3],T[0],!frontOnly);           // left
    quad(push,B[2],B[1],T[1],T[2],!frontOnly);           // right
    quad(push,T[3],T[2],T[1],T[0],!frontOnly);           // top
    quad(push,B[0],B[1],B[2],B[3],!frontOnly);           // bottom
  });
}
// an octagonal prism with a tapered top: heads, helmets and hands. With frontOnly,
// the face toward +z carries the whole tile (a face, a visor) and the rest are plain.
function octo(name,topK,frontOnly){
  meshFrom(name,push=>{
    const P=[];for(let i=0;i<8;i++){const a=Math.PI/2+(i-0.5)*TAU/8;P.push([Math.cos(a)*.5/Math.cos(TAU/16),Math.sin(a)*.5/Math.cos(TAU/16)]);}
    for(let i=0;i<8;i++){
      const a=P[i],b=P[(i+1)%8];
      const front=i===7||i===0?false:false;
      const isFront=Math.abs((a[1]+b[1])/2-0.5)<0.01;     // the edge lying on z=+0.5
      const bl=[b[0],-.5,b[1]],br=[a[0],-.5,a[1]],tr=[a[0]*topK,.5,a[1]*topK],tl=[b[0]*topK,.5,b[1]*topK];
      quad(push,bl,br,tr,tl,isFront||!frontOnly);
    }
    for(let i=0;i<8;i++){const a=P[i],b=P[(i+1)%8];
      push([0,.5,0],CORNER[0]);push([b[0]*topK,.5,b[1]*topK],CORNER[0]);push([a[0]*topK,.5,a[1]*topK],CORNER[0]);
      push([0,-.5,0],CORNER[0]);push([a[0],-.5,a[1]],CORNER[0]);push([b[0],-.5,b[1]],CORNER[0]);}
  });
}
function cylinder(name,n,top){
  meshFrom(name,push=>{
    for(let i=0;i<n;i++){
      const a0=i/n*TAU,a1=(i+1)/n*TAU,c0=Math.cos(a0)*.5,s0=Math.sin(a0)*.5,c1=Math.cos(a1)*.5,s1=Math.sin(a1)*.5;
      const t=top===undefined?1:top;
      const u0=i/n,u1=(i+1)/n;
      push([c0,-.5,s0],[u0,1]);push([c1,-.5,s1],[u1,1]);push([c1*t,.5,s1*t],[u1,0]);
      push([c0,-.5,s0],[u0,1]);push([c1*t,.5,s1*t],[u1,0]);push([c0*t,.5,s0*t],[u0,0]);
      if(t>0){push([0,.5,0],CORNER[0]);push([c0*t,.5,s0*t],CORNER[0]);push([c1*t,.5,s1*t],CORNER[0]);}
      push([0,-.5,0],CORNER[0]);push([c1,-.5,s1],CORNER[0]);push([c0,-.5,s0],CORNER[0]);
    }
  });
}
function buildMeshes(){
  taper('box',1,1,0,false);
  taper('boxF',1,1,0,true);
  taper('limb',0.78,0.78,0,false);                       // thicker at the top of a thigh or upper arm, after flipping
  taper('torso',1.18,1.0,0.02,false);                    // shoulders wider than the waist
  taper('torsoF',1.18,1.0,0.02,true);
  taper('wedge',1,0.05,-0.47,false);                     // a sloped plate: boots, pauldrons, visors
  taper('spike',0.05,0.05,0,false);
  octo('head',0.86,true);
  octo('round',0.8,false);
  cylinder('cyl',8);cylinder('cyl12',12);cylinder('cone',10,0);
  meshFrom('plane',push=>{quad(push,[-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],true);quad(push,[.5,-.5,0],[-.5,-.5,0],[-.5,.5,0],[.5,.5,0],true);});
}
