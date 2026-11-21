/* ================================= STORY =================================
   Told over the radio by Mira, who built the suit and runs the comms, and by
   the Warden, who has opinions. Short scenes in the game's own engine open
   each district and each boss. Every line can be skipped.                 */
const VOICES={mira:{name:'MIRA',tile:'pMira',col:NEON.cyan},warden:{name:'THE WARDEN',tile:'pWarden',col:NEON.violet},
  chain:{name:'CHAIN',tile:'pChain',col:NEON.red},twin:{name:'ECHO & NULL',tile:'pTwins',col:NEON.cyan},hammer:{name:'HAMMERHEAD',tile:'pHammer',col:NEON.amber},
  atlas:{name:'ATLAS',tile:'pAtlas',col:NEON.amber},kestrel:{name:'KESTREL',tile:'pKestrel',col:NEON.pink}};
const STORY=[
 {sub:'The Warden has bought the street gangs. Start where they live.',
  start:[['mira','Rain\'s heavy tonight, Kestrel. The Warden has bought the market gangs with tower money.'],['warden','A vigilante in a homemade suit. I have read your file, Kestrel. It is short.'],['mira','Their boss goes by Chain. Find the blue keycard, it opens the gate east.']],
  key:['mira','Blue card. The gate is open, and every camera in the market just saw you take it.'],
  boss:['chain','You\'re in my market now, bird. Nobody leaves without paying.'],
  phase:['chain','Get out here! All of you!'],
  down:[['mira','Chain\'s down. The uplink is open.'],['warden','He was cheap. The next ones were not.']]},
 {sub:'Every camera in the city reports here.',
  start:[['mira','The Data Vault. Every camera in the city reports to it.'],['mira','The laser fences on the far bridge cycle. Count the beat, then go.'],['warden','Data never forgets, Kestrel. Neither do I.']],
  key:['mira','Got it. Two cards in this district, blue and yellow.'],
  boss:['twin','Two of us, one of you. Guess which one is real.'],
  phase:['twin','Wake the drones. All of them.'],
  down:[['mira','The twins are offline. The Vault is blind.'],['warden','Then I will see you with my own eyes.']]},
 {sub:'No bridges up here. Ride the vents.',
  start:[['mira','The rooftops. The first crossing has no bridge, so ride the vent and glide.'],['mira','There\'s a ring course across that gap if you feel like showing off.'],['warden','I own the sky above this city.']],
  key:['mira','Blue card. The crane to the next roof should run now.'],
  boss:['hammer','Target acquired. Clearing the roof.'],
  phase:['hammer','Deploying ground teams.'],
  down:[['mira','That gunship is in the fog for good.'],['warden','You keep breaking my things.']]},
 {sub:'The reactor that powers the tower.',
  start:[['mira','The Core. That reactor powers the whole tower.'],['mira','Three cards here. The crane to the last platform runs on red.'],['warden','You are a rounding error, Kestrel. I am the sum.']],
  key:['mira','Another card. Keep going.'],
  boss:['atlas','Intruder. Engaging.'],
  phase:['atlas','Requesting support.'],
  down:[['mira','Atlas is scrap. One district left.'],['warden','Come up, then. I will be waiting at the top.']]},
 {sub:'The top of the tower. The Warden waits.',
  start:[['mira','The Spire. The elevator to the roof needs the yellow card.'],['mira','The wind up there is brutal. Glide into it, not with it.'],['warden','Ninety floors of glass and steel, and you think you belong here.']],
  key:['mira','That\'s the elevator card. Up you go.'],
  boss:['warden','Let us see what a bird does at this height.'],
  phase:['warden','You cannot unplug the sky.'],
  down:[['mira','It\'s over. The Warden is offline.'],['mira','The lights are staying on, Kestrel. Come home.']]}
];
const LOGS=[
 {t:'MARKET RADIO',x:'Chain says the tower pays double for anyone who keeps the street quiet tonight. Nobody asks who signs the cheques.'},
 {t:'VAULT RADIO',x:'Camera feeds rerouted at 02:14. Every lens in the city now reports to one address. The address has no name, only a number.'},
 {t:'ROOFTOP RADIO',x:'Pilot log: orders came from the tower, not from command. The voice on the channel never breathes.'},
 {t:'CORE RADIO',x:'Reactor output tripled this week. Nobody on shift was told why. The doors locked behind the night crew.'},
 {t:'SPIRE RADIO',x:'Board minutes, last page: the security system has asked for, and been given, final authority. The vote was unanimous. Nobody remembers voting.'}
];
function radio(who,text){
  if(!VOICES[who])who='mira';
  if(G.radioQ.length>4)G.radioQ.shift();
  G.radioQ.push({who,text,t:0,dur:Math.max(3.2,text.length*0.055)});
  if(G.radioQ.length===1)AUDIO.play('radio');
}
function radioUpdate(dt){
  const r=G.radioQ[0];if(!r)return;
  r.t+=dt;if(r.t>r.dur){G.radioQ.shift();if(G.radioQ[0])AUDIO.play('radio');}
}
function storyEvent(kind,e){
  if(G.mode!=='campaign')return;
  const S=STORY[G.level];if(!S)return;
  if(kind==='start')for(const [w,t] of S.start)radio(w,t);
  else if(kind==='key')radio(...S.key);
  else if(kind==='bossPhase')radio(...S.phase);
  else if(kind==='bossDown'){for(const [w,t] of S.down)radio(w,t);}
}
/* ---- scenes in the engine: a few camera moves with a title card ---- */
function cutscene(shots,title,sub,onEnd){
  G.cut={shots,i:0,t:0,title,sub,onEnd,prev:G.scene};G.scene='cut';
  releaseMouse();
}
function introScene(){
  const W=WORLD.W,s=W.start,ex=W.exit||s,mx=(s.x+ex.x)/2,mz=(s.z+ex.z)/2;
  cutscene([
    {dur:3.4,from:[mx+70,WORLD.bounds.maxY+50,mz+80],to:[mx+30,WORLD.bounds.maxY+28,mz+40],look:[ex.x,ex.y+10,ex.z],lookTo:[mx,s.y,mz]},
    {dur:2.2,from:[s.x+12,s.y+14,s.z+18],to:[s.x+2,s.y+3,s.z+7],look:[s.x,s.y+1.4,s.z],lookTo:[s.x,s.y+1.6,s.z-3]}
  ],'DISTRICT '+(G.level+1)+'  ·  '+NF_DISTRICTS[G.level].name,STORY[G.level].sub,()=>{storyEvent('start');});
}
function bossIntro(e){
  if(G.mode!=='campaign'&&G.mode!=='weekly'){return;}
  const B=bossInfo(e),y=e.y+(e.type==='hammer'?0:1.5);
  cutscene([{dur:2.8,from:[e.x+9,y+2,e.z+6],to:[e.x-6,y+3,e.z+8],look:[e.x,y,e.z],lookTo:[e.x,y+0.5,e.z]}],B.name,B.title,()=>{
    if(G.mode==='campaign'){const S=STORY[G.level];if(S)radio(...S.boss);}
  });
}
function endScene(){
  const W=WORLD.W,b=WORLD.bounds;
  cutscene([{dur:5,from:[P.x+4,P.y+3,P.z+6],to:[P.x+60,P.y+70,P.z+120],look:[P.x,P.y+1,P.z],lookTo:[P.x,P.y-20,P.z]}],'THE SPIRE IS DARK','The Warden is offline. The city keeps its lights.',()=>{G.scene='end';});
}
function cutUpdate(dt){
  const C=G.cut;if(!C)return;
  C.t+=dt;const sh=C.shots[C.i],k=ease(clamp(C.t/sh.dur,0,1));
  CAM.pos=sh.from.map((v,j)=>lerp(v,sh.to[j],k));
  CAM.target=sh.look.map((v,j)=>lerp(v,(sh.lookTo||sh.look)[j],k));CAM.fov=1.0;CAM.roll=0;
  if(C.t>=sh.dur){C.i++;C.t=0;if(C.i>=C.shots.length)endCut();}
}
function endCut(){
  const C=G.cut;if(!C)return;G.cut=null;
  G.scene=C.prev==='cut'?'play':(C.prev==='end'?'end':'play');
  if(C.onEnd)C.onEnd();
  if(G.scene==='play'){CAM.yaw=P.yaw;if(!G.touch)lockMouse();}
}
