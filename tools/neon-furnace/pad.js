/* =============================== CONTROLLERS ===============================
   Any controller the browser reports with the standard layout: Xbox,
   PlayStation, Switch Pro, 8BitDo and most others. Buttons are read by
   position, and every on-screen prompt follows whatever you touched last:
   keyboard and mouse, the touch screen, or the controller.               */
const PAD={idx:-1,family:'xbox',prev:[],rep:{},lookT:9,lastRumble:0};
const KB_NAMES={jump:'SPACE',dash:'SHIFT',strike:'J',counter:'K',special:'V',grapple:'E',emp:'F',disc:'Q',smoke:'C',map:'TAB',pause:'P',confirm:'ENTER',back:'ESC'};
const PAD_NAMES={
  xbox:{jump:'A',dash:'B',strike:'X',counter:'Y',special:'LB',grapple:'RB',emp:'LT',disc:'RT',smoke:'D-PAD ↓',map:'VIEW',pause:'MENU',confirm:'A',back:'B'},
  ps:  {jump:'✕',dash:'○',strike:'□',counter:'△',special:'L1',grapple:'R1',emp:'L2',disc:'R2',smoke:'D-PAD ↓',map:'SHARE',pause:'OPTIONS',confirm:'✕',back:'○'},
  nin: {jump:'B',dash:'A',strike:'Y',counter:'X',special:'L',grapple:'R',emp:'ZL',disc:'ZR',smoke:'D-PAD ↓',map:'−',pause:'+',confirm:'B',back:'A'}};
const DEADZONE=0.2;
const usingPad=()=>G.input==='pad';
const touchUI=()=>G.touch&&G.input!=='pad';
const btn=a=>(usingPad()?PAD_NAMES[PAD.family]:KB_NAMES)[a];
function padFamily(id){
  id=(id||'').toLowerCase();
  if(/xbox|045e|xinput/.test(id))return 'xbox';
  if(/054c|playstation|dualshock|dualsense|wireless controller/.test(id))return 'ps';   // Sony pads often call themselves just "Wireless Controller"
  if(/057e|nintendo|pro controller|joy-con/.test(id))return 'nin';
  return 'xbox';
}
function getPad(){
  let list=[];try{list=navigator.getGamepads?[...navigator.getGamepads()]:[];}catch(e){}
  const p=list[PAD.idx];if(p&&p.connected!==false)return p;
  for(const g of list)if(g&&g.connected!==false){PAD.idx=g.index;PAD.family=padFamily(g.id);return g;}
  return null;
}
function toast(text){G.toast={text,t:2.8};}
addEventListener('gamepadconnected',e=>{
  const g=e.gamepad;PAD.idx=g.index;PAD.family=padFamily(g.id);toast('CONTROLLER CONNECTED');
  const h=document.getElementById('padHint');if(h&&!G.started){h.hidden=false;const b=h.querySelector('b');if(b)b.textContent=PAD_NAMES[PAD.family].confirm;}
});
addEventListener('gamepaddisconnected',e=>{
  if(e.gamepad.index!==PAD.idx)return;
  PAD.idx=-1;toast('CONTROLLER DISCONNECTED');
  if(G.input==='pad'){G.input=G.touch?'touch':'kb';if(G.scene==='play')pause();}
});
// the prompts switch back the moment the keyboard, the mouse or a finger is used
addEventListener('keydown',()=>{G.input='kb';AUDIO.wake();},true);
addEventListener('mousedown',()=>{G.input='kb';AUDIO.wake();},true);
addEventListener('mousemove',e=>{if(Math.abs(e.movementX)+Math.abs(e.movementY)>3)G.input='kb';},true);
addEventListener('touchstart',()=>{G.input='touch';AUDIO.wake();},{capture:true,passive:true});

/* Vibration on hits, counters, knockouts and damage, where the browser and pad allow it. */
function rumble(strong,weak,ms){
  if(!SV.vib||G.input!=='pad')return;
  const now=performance.now();if(now-PAD.lastRumble<45&&strong<0.5)return;PAD.lastRumble=now;
  const g=getPad(),a=g&&g.vibrationActuator;
  try{
    if(a&&a.playEffect){const r=a.playEffect('dual-rumble',{startDelay:0,duration:ms,strongMagnitude:strong,weakMagnitude:weak});if(r&&r.catch)r.catch(()=>{});}
    else if(g&&g.hapticActuators&&g.hapticActuators[0])g.hapticActuators[0].pulse(Math.max(strong,weak),ms);
  }catch(e){}
}

function padPoll(dt){
  const gp=getPad();if(!gp)return;
  const now=[];for(let i=0;i<17;i++){const b=gp.buttons[i];now[i]=!!b&&(b.pressed||b.value>0.5);}
  const down=i=>now[i]&&!PAD.prev[i];
  const stick=(x,y)=>{x=x||0;y=y||0;const m=Math.hypot(x,y);if(m<DEADZONE)return[0,0];const k=Math.min(1,(m-DEADZONE)/(1-DEADZONE))/m;return[x*k,y*k];};
  const ax=gp.axes||[],[lx,ly]=stick(ax[0],ax[1]),[rx,ry]=stick(ax[2],ax[3]);
  const active=now.some(Boolean)||lx||ly||rx||ry;
  if(active&&G.input!=='pad'){G.input='pad';PAD.family=padFamily(gp.id);}
  if(G.input!=='pad'){PAD.prev=now;return;}       // a pad sitting idle takes nothing over
  if(!G.started){if(down(0)||down(9)){begin();setTimeout(()=>{if(AUDIO.suspended)toast('CLICK OR PRESS A KEY ONCE TO TURN THE SOUND ON');},900);}PAD.prev=now;return;}
  if(G.scene==='play'){
    if(lx||ly){IN.mx=lx;IN.mz=-ly;}
    IN.jump=IN.jump||now[0];
    if(down(0))IN.jumpP=true;   if(down(1))IN.dashP=true;   if(down(2))IN.strikeP=true;  if(down(3))IN.counterP=true;
    if(down(4))IN.specialP=true;if(down(5))IN.grappleP=true;if(down(6))IN.empP=true;     if(down(7))IN.discP=true;
    if(down(13))IN.smokeP=true; if(down(8))G.map=!G.map;    if(down(9))pause();
    // the right stick turns the camera, with a curve so small movements stay precise
    if(rx||ry){const s=SV.padSens/5;CAM.yaw-=rx*Math.abs(rx)*2.9*s*dt;CAM.pitch=clamp(CAM.pitch+ry*Math.abs(ry)*1.9*s*dt*(SV.invertY?-1:1),-0.55,1.1);PAD.lookT=0;}
    else PAD.lookT+=dt;
  }else{
    // menus and screens: the d-pad or left stick steps (held, it repeats), A chooses, B goes back
    const dirs={ArrowUp:now[12]||ly<-0.6,ArrowDown:now[13]||ly>0.6,ArrowLeft:now[14]||lx<-0.6,ArrowRight:now[15]||lx>0.6};
    for(const k in dirs){
      if(!dirs[k]){delete PAD.rep[k];continue;}
      if(PAD.rep[k]===undefined){PAD.rep[k]=0.38;handleKey({code:k});}
      else if((PAD.rep[k]-=dt)<=0){PAD.rep[k]=0.11;handleKey({code:k});}
    }
    if(down(0))handleKey({code:'Enter'});
    if(down(1))handleKey({code:'Escape'});
    if(down(9))handleKey({code:G.scene==='paused'?'Escape':'Enter'});
  }
  PAD.prev=now;
}
