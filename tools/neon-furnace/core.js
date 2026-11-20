'use strict';
/* ==========================================================================
   NEON FURNACE - an original third-person brawler in a neon voxel city.
   Written from scratch: the WebGL2 renderer, the physics, the characters,
   the combat and the music are all code in this one page. There are no
   image, model or audio files, and no engine or library.
   ========================================================================== */

/* ------------------------------------------------------------- utilities */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
function angDiff(a,b){let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;}
const fmtTime=t=>{t=t|0;return (t/60|0)+':'+String(t%60).padStart(2,'0');};
const fmtNum=n=>Math.round(n).toLocaleString('en-US');
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);
const rng=mulberry32(0xC0FFEE);

const NEON={pink:'#ff3fb4',cyan:'#2ef2ff',amber:'#ffb12e',violet:'#b46bff',lime:'#9dff3c',red:'#ff3b4e',white:'#f2f6ff'};
const hex3=h=>{const n=parseInt(h.slice(1),16);return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];};
const KEYCOL={B:[0.25,0.55,1],Y:[1,0.72,0.15],R:[1,0.22,0.3]};

/* ------------------------------------------------------- 4x4 matrices
   Column-major Float32Arrays, as WebGL wants them. Only what the game
   needs: a camera, and boxes moved, turned and stretched.                 */
const M4={
  ident(o){o=o||new Float32Array(16);o.fill(0);o[0]=o[5]=o[10]=o[15]=1;return o;},
  copy(o,a){o.set(a);return o;},
  mul(o,a,b){
    const r=new Float32Array(16);
    for(let c=0;c<4;c++)for(let rr=0;rr<4;rr++)
      r[c*4+rr]=a[rr]*b[c*4]+a[4+rr]*b[c*4+1]+a[8+rr]*b[c*4+2]+a[12+rr]*b[c*4+3];
    o.set(r);return o;
  },
  persp(o,fov,asp,n,f){o.fill(0);const t=1/Math.tan(fov/2);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;},
  look(o,e,c,u){
    let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2];let l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
    let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
    const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
    o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0;o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;
    o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);o[15]=1;return o;
  },
  invert(o,m){
    const a=m,inv=new Float32Array(16);
    inv[0]=a[5]*a[10]*a[15]-a[5]*a[11]*a[14]-a[9]*a[6]*a[15]+a[9]*a[7]*a[14]+a[13]*a[6]*a[11]-a[13]*a[7]*a[10];
    inv[4]=-a[4]*a[10]*a[15]+a[4]*a[11]*a[14]+a[8]*a[6]*a[15]-a[8]*a[7]*a[14]-a[12]*a[6]*a[11]+a[12]*a[7]*a[10];
    inv[8]=a[4]*a[9]*a[15]-a[4]*a[11]*a[13]-a[8]*a[5]*a[15]+a[8]*a[7]*a[13]+a[12]*a[5]*a[11]-a[12]*a[7]*a[9];
    inv[12]=-a[4]*a[9]*a[14]+a[4]*a[10]*a[13]+a[8]*a[5]*a[14]-a[8]*a[6]*a[13]-a[12]*a[5]*a[10]+a[12]*a[6]*a[9];
    inv[1]=-a[1]*a[10]*a[15]+a[1]*a[11]*a[14]+a[9]*a[2]*a[15]-a[9]*a[3]*a[14]-a[13]*a[2]*a[11]+a[13]*a[3]*a[10];
    inv[5]=a[0]*a[10]*a[15]-a[0]*a[11]*a[14]-a[8]*a[2]*a[15]+a[8]*a[3]*a[14]+a[12]*a[2]*a[11]-a[12]*a[3]*a[10];
    inv[9]=-a[0]*a[9]*a[15]+a[0]*a[11]*a[13]+a[8]*a[1]*a[15]-a[8]*a[3]*a[13]-a[12]*a[1]*a[11]+a[12]*a[3]*a[9];
    inv[13]=a[0]*a[9]*a[14]-a[0]*a[10]*a[13]-a[8]*a[1]*a[14]+a[8]*a[2]*a[13]+a[12]*a[1]*a[10]-a[12]*a[2]*a[9];
    inv[2]=a[1]*a[6]*a[15]-a[1]*a[7]*a[14]-a[5]*a[2]*a[15]+a[5]*a[3]*a[14]+a[13]*a[2]*a[7]-a[13]*a[3]*a[6];
    inv[6]=-a[0]*a[6]*a[15]+a[0]*a[7]*a[14]+a[4]*a[2]*a[15]-a[4]*a[3]*a[14]-a[12]*a[2]*a[7]+a[12]*a[3]*a[6];
    inv[10]=a[0]*a[5]*a[15]-a[0]*a[7]*a[13]-a[4]*a[1]*a[15]+a[4]*a[3]*a[13]+a[12]*a[1]*a[7]-a[12]*a[3]*a[5];
    inv[14]=-a[0]*a[5]*a[14]+a[0]*a[6]*a[13]+a[4]*a[1]*a[14]-a[4]*a[2]*a[13]-a[12]*a[1]*a[6]+a[12]*a[2]*a[5];
    inv[3]=-a[1]*a[6]*a[11]+a[1]*a[7]*a[10]+a[5]*a[2]*a[11]-a[5]*a[3]*a[10]-a[9]*a[2]*a[7]+a[9]*a[3]*a[6];
    inv[7]=a[0]*a[6]*a[11]-a[0]*a[7]*a[10]-a[4]*a[2]*a[11]+a[4]*a[3]*a[10]+a[8]*a[2]*a[7]-a[8]*a[3]*a[6];
    inv[11]=-a[0]*a[5]*a[11]+a[0]*a[7]*a[9]+a[4]*a[1]*a[11]-a[4]*a[3]*a[9]-a[8]*a[1]*a[7]+a[8]*a[3]*a[5];
    inv[15]=a[0]*a[5]*a[10]-a[0]*a[6]*a[9]-a[4]*a[1]*a[10]+a[4]*a[2]*a[9]+a[8]*a[1]*a[6]-a[8]*a[2]*a[5];
    let det=a[0]*inv[0]+a[1]*inv[4]+a[2]*inv[8]+a[3]*inv[12];det=det?1/det:0;
    for(let i=0;i<16;i++)o[i]=inv[i]*det;return o;
  }
};
/* A tiny transform stack for the character rigs: each call multiplies onto
   the current matrix, the way an animation skeleton walks down its bones.  */
class Xf{
  constructor(){this.m=M4.ident();this.st=[];}
  reset(){M4.ident(this.m);this.st.length=0;return this;}
  push(){this.st.push(new Float32Array(this.m));return this;}
  pop(){this.m.set(this.st.pop());return this;}
  t(x,y,z){const m=this.m;m[12]+=m[0]*x+m[4]*y+m[8]*z;m[13]+=m[1]*x+m[5]*y+m[9]*z;m[14]+=m[2]*x+m[6]*y+m[10]*z;return this;}
  ry(a){if(!a)return this;const c=Math.cos(a),s=Math.sin(a),m=this.m;
    for(let i=0;i<3;i++){const x=m[i],z=m[8+i];m[i]=x*c-z*s;m[8+i]=x*s+z*c;}return this;}
  rx(a){if(!a)return this;const c=Math.cos(a),s=Math.sin(a),m=this.m;
    for(let i=0;i<3;i++){const y=m[4+i],z=m[8+i];m[4+i]=y*c+z*s;m[8+i]=-y*s+z*c;}return this;}
  rz(a){if(!a)return this;const c=Math.cos(a),s=Math.sin(a),m=this.m;
    for(let i=0;i<3;i++){const x=m[i],y=m[4+i];m[i]=x*c+y*s;m[4+i]=-x*s+y*c;}return this;}
}

/* ---------------------------------------------------------- the screen
   One WebGL canvas for the world, one 2D canvas on top for the HUD and the
   menus. The HUD works in a fixed 480x270 space scaled to the screen.     */
const cvs=document.getElementById('game');
const hud=document.getElementById('hud');
const hx=hud.getContext('2d');
const UW=480, UH=270;
// lowres and scale=: for automated tests and screenshots on machines without a GPU
let US=1, renderScale=/[?&]lowres/.test(location.search)?0.45:clamp(+(location.search.match(/[?&]scale=([\d.]+)/)||[0,1])[1],0.3,1);
function resizeCanvas(){
  const r=cvs.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const w=Math.max(320,Math.round((r.width||960)*dpr*renderScale)), h=Math.max(180,Math.round((r.height||540)*dpr*renderScale));
  if(cvs.width!==w||cvs.height!==h){cvs.width=w;cvs.height=h;}
  const hw=Math.round((r.width||960)*dpr), hh=Math.round((r.height||540)*dpr);
  if(hud.width!==hw||hud.height!==hh){hud.width=hw;hud.height=hh;}
  US=hud.width/UW;
}
addEventListener('resize',resizeCanvas);
document.addEventListener('fullscreenchange',resizeCanvas);
