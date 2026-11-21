/* ------------------------------------------------------------------ audio
   Every sound, and all of the music, is synthesised live with Web Audio.
   No files. Nothing plays until the player clicks, because browsers need a
   gesture before an AudioContext may start.                               */
const AUDIO=(function(){
  let ac=null,master,sfxBus,musBus,musVol,duck,fireDuck,echo,echoIn,noiseBuf;
  let muted=false,vMus=0.7,vSfx=0.8;
  const midi=n=>440*Math.pow(2,(n-69)/12);

  function init(){
    if(ac)return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    ac=new AC();
    const comp=ac.createDynamicsCompressor();
    comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=0.004;comp.release.value=0.2;
    master=ac.createGain();master.gain.value=muted?0:1;
    master.connect(comp);comp.connect(ac.destination);
    sfxBus=ac.createGain();sfxBus.gain.value=0.55*vSfx;sfxBus.connect(master);
    // music: voices -> musBus -> sidechain duck -> fire duck -> volume -> master
    musBus=ac.createGain();duck=ac.createGain();fireDuck=ac.createGain();musVol=ac.createGain();
    musVol.gain.value=0.42*vMus;
    musBus.connect(duck);duck.connect(fireDuck);fireDuck.connect(musVol);musVol.connect(master);
    // a dotted-eighth echo for pads and arps
    echoIn=ac.createGain();echoIn.gain.value=0.32;
    echo=ac.createDelay(1.5);
    const fb=ac.createGain();fb.gain.value=0.34;
    const ef=ac.createBiquadFilter();ef.type='lowpass';ef.frequency.value=2600;
    echoIn.connect(echo);echo.connect(ef);ef.connect(fb);fb.connect(echo);ef.connect(musBus);
    noiseBuf=ac.createBuffer(1,ac.sampleRate*1.2,ac.sampleRate);
    const d=noiseBuf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend();else ac.resume();});
  }
  function env(node,t0,a,d,peak,dest){
    const g=ac.createGain();
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak),t0+a);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+a+d);
    node.connect(g);g.connect(dest||sfxBus);
    return g;
  }
  function tone(type,f0,f1,a,d,peak,t0,dest){
    const o=ac.createOscillator();o.type=type;
    o.frequency.setValueAtTime(f0,t0);
    if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t0+a+d);
    env(o,t0,a,d,peak,dest);o.start(t0);o.stop(t0+a+d+0.02);
  }
  function noise(d,peak,t0,lp,hp,dest,bp){
    const s=ac.createBufferSource();s.buffer=noiseBuf;
    s.playbackRate.value=0.8+Math.random()*0.4;
    let n=s;
    if(lp){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(lp,t0);n.connect(f);n=f;}
    if(hp){const f=ac.createBiquadFilter();f.type='highpass';f.frequency.setValueAtTime(hp,t0);n.connect(f);n=f;}
    if(bp){const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(bp,t0);f.Q.value=1.2;n.connect(f);n=f;}
    env(n,t0,0.003,d,peak,dest);s.start(t0,Math.random()*0.5);s.stop(t0+d+0.05);
  }

  /* ---- sound effects ---- */
  function play(name,vol){
    if(!ac)return;
    const t=ac.currentTime,v=vol===undefined?1:vol;
    switch(name){
      case 'pistol':  noise(0.06,0.28*v,t,4200,700); tone('square',880,180,0.003,0.07,0.12*v,t); tone('sine',1760,440,0.002,0.05,0.06*v,t); break;
      case 'shotgun': noise(0.24,0.55*v,t,2400,160); tone('sawtooth',170,40,0.006,0.26,0.26*v,t); break;
      case 'rifle':   noise(0.05,0.2*v,t,5000,900); tone('square',640,220,0.002,0.05,0.10*v,t); tone('sine',1280,300,0.002,0.04,0.06*v,t); break;
      case 'arc':     tone('sawtooth',980,200,0.01,0.22,0.18*v,t); tone('sine',1960,400,0.01,0.2,0.09*v,t); break;
      case 'rail':    tone('sawtooth',220,2200,0.02,0.1,0.18*v,t); tone('sine',90,30,0.01,0.6,0.32*v,t+0.05); noise(0.5,0.34*v,t+0.05,3000,200); break;
      case 'railcharge': tone('sine',300,1200,0.05,0.5,0.05*v,t); break;
      case 'explode': noise(0.5,0.6*v,t,900,40); tone('sine',110,28,0.01,0.5,0.3*v,t); break;
      case 'hitwall': noise(0.04,0.12*v,t,6000,1800); break;
      case 'hitmetal':noise(0.06,0.24*v,t,5200,900); tone('square',1400,700,0.002,0.05,0.07*v,t); break;
      case 'pain':    tone('sawtooth',300,120,0.01,0.22,0.24*v,t); noise(0.14,0.16*v,t,1200,200); break;
      case 'enemypain':tone('square',420,160,0.01,0.12,0.13*v,t); break;
      case 'alert':   tone('square',660,990,0.005,0.08,0.10*v,t); tone('square',990,660,0.08,0.08,0.08*v,t+0.08); break;
      case 'zap':     tone('sawtooth',1200,300,0.004,0.1,0.10*v,t); break;
      case 'edeath':  tone('sawtooth',420,50,0.02,0.45,0.2*v,t); noise(0.35,0.26*v,t,3000,300); break;
      case 'bigdeath':tone('sawtooth',200,30,0.03,0.9,0.3*v,t); noise(0.9,0.44*v,t,1600,60); break;
      case 'bossdie': tone('sawtooth',160,24,0.05,1.8,0.36*v,t); noise(1.6,0.46*v,t,900,40); tone('sine',60,20,0.05,1.8,0.4*v,t); break;
      case 'warp':    tone('sine',120,1600,0.01,0.3,0.10*v,t); noise(0.3,0.12*v,t,8000,2000); break;
      case 'blink':   tone('square',1800,200,0.003,0.16,0.09*v,t); break;
      case 'door':    tone('square',90,150,0.12,0.45,0.08*v,t); noise(0.5,0.08*v,t,700,80); break;
      case 'switch':  tone('square',300,760,0.01,0.12,0.14*v,t); tone('square',760,1200,0.12,0.12,0.09*v,t+0.11); break;
      case 'pickup':  tone('square',760,1320,0.006,0.09,0.12*v,t); break;
      case 'weapon':  tone('square',300,900,0.01,0.14,0.15*v,t); tone('square',900,1500,0.14,0.12,0.09*v,t+0.13); break;
      case 'key':     tone('triangle',760,1500,0.01,0.2,0.16*v,t); tone('triangle',1140,2250,0.01,0.2,0.08*v,t+0.1); break;
      case 'nope':    tone('square',150,90,0.01,0.12,0.12*v,t); break;
      case 'sizzle':  noise(0.16,0.12*v,t,8000,2400); tone('sawtooth',2400,900,0.003,0.1,0.04*v,t); break;
      case 'dead':    tone('sawtooth',260,40,0.05,1.1,0.3*v,t); noise(0.8,0.2*v,t,700,60); break;
      case 'secret':  tone('triangle',520,1040,0.01,0.12,0.14*v,t); tone('triangle',780,1560,0.13,0.16,0.12*v,t+0.12); break;
      case 'combo':   {const f=330*Math.pow(2,clamp(v,1,8)/6);tone('square',f,f*1.5,0.004,0.08,0.07,t);} break;
      case 'medal':   [659,784,988,1319].forEach((f,i)=>tone('triangle',f,f,0.01,0.22,0.12,t+i*0.09)); break;
      case 'levelup': [523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,0.01,0.26,0.13*v,t+i*0.12)); break;
      case 'menu':    tone('square',900,900,0.003,0.04,0.06*v,t); break;
      case 'punch':   noise(0.06,0.4*v,t,2200,120); tone('sine',140,60,0.002,0.08,0.3*v,t); break;
      case 'heavy':   noise(0.12,0.55*v,t,1600,80); tone('sine',110,40,0.002,0.16,0.42*v,t); tone('square',220,80,0.002,0.06,0.08*v,t); break;
      case 'ko':      noise(0.18,0.45*v,t,1800,90); tone('sine',90,30,0.004,0.3,0.36*v,t); break;
      case 'whoosh':  noise(0.14,0.16*v,t,null,null,null,1600); break;
      case 'counter': tone('square',1320,1980,0.003,0.06,0.1*v,t); noise(0.08,0.4*v,t,3000,200); tone('sine',150,50,0.002,0.12,0.35*v,t+0.02); break;
      case 'tell':    tone('triangle',1760,1760,0.002,0.06,0.07*v,t); break;
      case 'tell2':   tone('sawtooth',220,440,0.02,0.3,0.12*v,t); break;
      case 'jump':    noise(0.08,0.1*v,t,null,1200); tone('sine',300,520,0.004,0.08,0.06*v,t); break;
      case 'land':    noise(0.08,0.22*v,t,900,60); break;
      case 'glide':   noise(0.5,0.08*v,t,null,null,null,700); break;
      case 'grapple': tone('sawtooth',200,1400,0.005,0.18,0.08*v,t); noise(0.2,0.12*v,t,6000,1500); break;
      case 'disc':    tone('sine',900,1500,0.004,0.12,0.08*v,t); noise(0.1,0.1*v,t,null,null,null,2500); break;
      case 'discHit': noise(0.05,0.3*v,t,6000,900); tone('square',1700,900,0.002,0.05,0.07*v,t); break;
      case 'emp':     tone('sine',80,900,0.01,0.35,0.3*v,t); noise(0.4,0.25*v,t,9000,1200); break;
      case 'smoke':   noise(0.8,0.3*v,t,1400,100); break;
      case 'vent':    noise(0.6,0.2*v,t,null,null,null,500); tone('sine',200,600,0.05,0.5,0.08*v,t); break;
      case 'radio':   noise(0.12,0.1*v,t,3200,900); tone('square',1200,1200,0.002,0.03,0.05*v,t+0.02); tone('square',1600,1600,0.002,0.03,0.04*v,t+0.07); break;
      case 'stinger': [0,4,7,12].forEach((k,i)=>tone('sawtooth',440*Math.pow(2,k/12),440*Math.pow(2,k/12),0.005,0.14,0.08,t+i*0.05)); noise(0.3,0.2*v,t,8000,2000); break;
      case 'thunder': noise(2.2,0.5*v,t,500,30); tone('sine',55,30,0.05,1.6,0.25*v,t); break;
      case 'shard':   [880,1320,1760].forEach((f,i)=>tone('triangle',f,f,0.01,0.18,0.1,t+i*0.07)); break;
    }
  }

  /* ---- the music: a 16-step techno sequencer with lookahead ----
     Patterns are generated per level from a seed, in a minor key. Layers
     come in and out with how much fighting is going on, and only ever change
     on a bar line so it never sounds like a jump cut.                     */
  const M={on:false,bpm:128,root:45,step:0,nextT:0,level:0,target:0,boss:false,title:false,
    bass:[],arp:[],prog:[0,8,10,5],timer:null,lastBass:null};
  const SCALE=[0,3,5,7,10,12,15];
  function genPatterns(seed,boss){
    const r=mulberry32(seed);
    M.bass=[];
    for(let i=0;i<16;i++){
      // offbeat-heavy acid line: rests on most downbeats so the kick can breathe
      const play=boss?(i%4!==0||r()<.2):((i%4===2)||(i%4!==0&&r()<.45));
      M.bass.push(play?{n:r()<.6?0:SCALE[(r()*5)|0]+(r()<.2?12:0),acc:r()<.3,slide:r()<.18}:null);
    }
    M.arp=[];for(let i=0;i<16;i++)M.arp.push([0,7,12,15,19,12,7,3][(i+((r()*3)|0))%8]);
    M.prog=boss?[0,1,0,10]:[[0,8,10,5],[0,5,8,10],[0,10,8,7]][(r()*3)|0];
  }
  function kick(t,v){
    const o=ac.createOscillator();o.type='sine';
    o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(42,t+0.13);
    env(o,t,0.002,0.36,0.95*v,musBus);o.start(t);o.stop(t+0.4);
    noise(0.012,0.25*v,t,9000,1500,musBus);
    // sidechain: everything else ducks under the kick
    duck.gain.cancelScheduledValues(t);duck.gain.setValueAtTime(0.5,t);duck.gain.linearRampToValueAtTime(1,t+0.22);
  }
  function hat(t,v,open){noise(open?0.14:0.03,(open?0.11:0.08)*v,t,null,7200,musBus);}
  function clap(t,v){for(let i=0;i<3;i++)noise(0.012,0.16*v,t+i*0.011,null,null,musBus,1300);noise(0.14,0.13*v,t+0.033,null,null,musBus,1300);}
  function bassNote(t,n,len,acc,slide,cut){
    const f=midi(M.root+n);
    const o=ac.createOscillator();o.type='sawtooth';
    if(slide&&M.lastBass){o.frequency.setValueAtTime(M.lastBass,t);o.frequency.exponentialRampToValueAtTime(f,t+0.06);}
    else o.frequency.setValueAtTime(f,t);
    M.lastBass=f;
    const fl=ac.createBiquadFilter();fl.type='lowpass';fl.Q.value=acc?16:11;
    fl.frequency.setValueAtTime(cut*(acc?4.2:2.4),t);fl.frequency.exponentialRampToValueAtTime(cut,t+0.16);
    o.connect(fl);env(fl,t,0.004,len,acc?0.30:0.22,musBus);o.start(t);o.stop(t+len+0.05);
    const s=ac.createOscillator();s.type='sine';s.frequency.setValueAtTime(f/2,t);   // sub
    env(s,t,0.004,len*0.9,0.16,musBus);s.start(t);s.stop(t+len+0.05);
  }
  function pad(t,deg,dur,v){
    const ch=[0,3,7,12].map(x=>M.root+12+deg+x);
    const fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=900;fl.Q.value=2;
    const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.045*v,t+dur*0.3);g.gain.linearRampToValueAtTime(0.0001,t+dur);
    fl.connect(g);g.connect(musBus);g.connect(echoIn);
    for(const n of ch)for(const det of [-7,7]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=midi(n);o.detune.value=det;o.connect(fl);o.start(t);o.stop(t+dur+0.05);}
  }
  function arp(t,n,v){
    const o=ac.createOscillator();o.type='square';o.frequency.value=midi(M.root+24+n);
    const fl=ac.createBiquadFilter();fl.type='bandpass';fl.frequency.value=2200;fl.Q.value=3;
    o.connect(fl);const g=env(fl,t,0.003,0.11,0.07*v,musBus);g.connect(echoIn);o.start(t);o.stop(t+0.15);
  }
  function riser(t,dur){
    const s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;
    const f=ac.createBiquadFilter();f.type='bandpass';f.Q.value=4;
    f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(7000,t+dur);
    const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.09,t+dur);g.gain.linearRampToValueAtTime(0.0001,t+dur+0.02);
    s.connect(f);f.connect(g);g.connect(musBus);s.start(t);s.stop(t+dur+0.05);
  }
  function step(i,t){
    const s=i%16, bar=(i/16|0)%4, L=M.level, sixteenth=60/M.bpm/4;
    if(s===0){                                  // layers change on the bar line only
      if(M.target!==M.level)M.level=M.target;
      pad(t,M.prog[bar],sixteenth*16,M.level>=2?0.6:1);
    }
    if(M.title){
      if(s%4===0)kick(t,0.5);
      if(s%4===2)hat(t,0.7,false);
      return;
    }
    if(s%4===0||(M.boss&&s===14))kick(t,1);
    if(s%4===2)hat(t,1,L>=1);
    if(L>=2&&s%2===1)hat(t,0.55,false);
    if(L>=1&&(s===4||s===12))clap(t,1);
    const b=M.bass[s];
    if(b)bassNote(t,b.n,sixteenth*(b.slide?1.6:0.9),b.acc,b.slide,L===0?260:L===1?520:900);
    if(L>=2||M.boss)arp(t,M.arp[s],M.boss?0.8:1);
    // a short build into the next phrase when the fighting picks up
    if(bar===3&&s===8&&M.target>M.level)riser(t,sixteenth*8);
  }
  function scheduler(){
    if(!ac||!M.on)return;
    while(M.nextT<ac.currentTime+0.12){
      step(M.step,M.nextT);
      M.nextT+=60/M.bpm/4;
      M.step=(M.step+1)%64;
    }
  }
  const music={
    start(def){
      if(!ac)return;
      M.title=!!def.title;M.boss=!!def.boss;
      M.bpm=def.bpm||128;M.root=def.root||45;
      genPatterns(def.seed||1,M.boss);
      M.level=M.target=def.intensity||0;
      if(!M.on){M.on=true;M.step=0;M.nextT=ac.currentTime+0.06;M.timer=setInterval(scheduler,25);}
    },
    stop(){M.on=false;if(M.timer)clearInterval(M.timer);M.timer=null;},
    intensity(n){M.target=clamp(n|0,0,2);},
    get level(){return M.level;},
    get on(){return M.on;}
  };
  return{
    init,play,music,stinger(n){play('stinger',1);},
    get ready(){return !!ac;},
    get muted(){return muted;},
    toggleMute(){muted=!muted;if(master)master.gain.value=muted?0:1;return muted;},
    setVolumes(m,s){vMus=m;vSfx=s;if(ac){musVol.gain.value=0.42*m;sfxBus.gain.value=0.55*s;}},
    duckFire(){if(!ac)return;const t=ac.currentTime;fireDuck.gain.cancelScheduledValues(t);fireDuck.gain.setValueAtTime(0.78,t);fireDuck.gain.linearRampToValueAtTime(1,t+0.16);}
  };
})();
