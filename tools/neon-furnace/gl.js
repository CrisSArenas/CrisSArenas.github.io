/* ================================ RENDERER ================================
   Hand-written WebGL2. Everything in the world is a box drawn with
   instancing: one unit cube, and per box a matrix, a colour and a few flags.
   Faces are lit flat (the normal comes from screen-space derivatives), tower
   windows are painted in the shader from world position, and the frame goes
   through a bloom pass so neon bleeds into the fog.                       */
const gl=cvs.getContext('webgl2',{antialias:false,alpha:false,depth:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
const GL_OK=!!gl;
const STRIDE=24;                       // floats per instance: mat4 + colour + extra

const BOX_VS=`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aM0; layout(location=2) in vec4 aM1; layout(location=3) in vec4 aM2; layout(location=4) in vec4 aM3;
layout(location=5) in vec4 aCol; layout(location=6) in vec4 aX;
uniform mat4 uVP;
out vec3 vW; out vec3 vL; out vec4 vCol; out vec4 vX; out vec3 vS;
void main(){
  mat4 M=mat4(aM0,aM1,aM2,aM3);
  vec4 w=M*vec4(aPos,1.0);
  vW=w.xyz; vL=aPos; vCol=aCol; vX=aX;
  vS=vec3(length(aM0.xyz),length(aM1.xyz),length(aM2.xyz));
  gl_Position=uVP*w;
}`;
const BOX_FS=`#version 300 es
precision highp float;
in vec3 vW; in vec3 vL; in vec4 vCol; in vec4 vX; in vec3 vS;
uniform vec3 uCam; uniform float uTime;
uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uMoonDir; uniform vec3 uMoon;
uniform vec3 uFogHi; uniform vec3 uFogLo; uniform float uFogD; uniform float uFogY;
uniform vec4 uLP[24]; uniform vec4 uLC[24]; uniform int uNL;
uniform vec3 uWin0; uniform vec3 uWin1; uniform vec3 uWin2; uniform float uWinDensity;
out vec4 frag;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec3 N=normalize(cross(dFdx(vW),dFdy(vW)));
  vec3 V=uCam-vW; float dist=length(V);
  if(dot(N,V)<0.0)N=-N;
  vec3 alb=vCol.rgb; float em=vCol.a; int kind=int(vX.x+0.5); float seed=vX.y;
  vec3 emc=alb*em;
  bool side=abs(N.y)<0.5;
  if(kind==1||kind==8){                                   // towers: windows from world position
    if(side){
      float u=abs(N.x)>0.5?vW.z:vW.x;
      vec2 cell=floor(vec2(u/1.7,vW.y/2.6)); vec2 f=fract(vec2(u/1.7,vW.y/2.6));
      float face=abs(N.x)>0.5?(N.x>0.0?1.0:2.0):(N.z>0.0?3.0:4.0);
      float h=h21(cell+vec2(seed*0.013,face*7.1));
      float win=step(0.16,f.x)*step(f.x,0.84)*step(0.22,f.y)*step(f.y,0.72);
      float floorLit=step(0.25,h21(vec2(cell.y,seed+face)));
      float lit=step(1.0-uWinDensity,h)*floorLit;
      float pick=h21(cell*1.7+seed);
      vec3 wc=pick<0.55?uWin0:pick<0.82?uWin1:uWin2;
      alb=mix(alb,vec3(0.03,0.035,0.06),win);
      emc+=wc*win*lit*(0.75+0.5*h21(cell+3.0));
      // a band of light every few floors, like signage and ledges
      float band=step(0.93,fract(vW.y/18.0+seed*0.1));
      emc+=mix(uWin1,uWin2,step(0.5,h21(vec2(seed))))*band*0.9;
    }else{alb*=0.8;}
  }
  if(kind==3){                                            // decks: tile seams and a lit edge
    if(!side){
      vec2 g=fract(vW.xz/2.0); float seam=1.0-step(0.04,g.x)*step(0.04,g.y);
      alb*=1.0-seam*0.35;
      vec2 e=0.5-abs(vL.xz); float edge=1.0-step(0.6/vS.x,e.x)*step(0.6/vS.z,e.y);
      emc+=uWin1*edge*1.4;
      float puddle=smoothstep(0.55,0.75,h21(floor(vW.xz/3.0)));
      alb=mix(alb,alb*0.6+vec3(0.02,0.02,0.05),puddle);
    }else{float strip=step(0.47,abs(vL.y));emc+=uWin1*strip*0.6;}
  }
  if(kind==4&&!side){vec2 e=0.5-abs(vL.xz);float edge=1.0-step(0.25/vS.x,e.x)*step(0.25/vS.z,e.y);emc+=uWin0*edge*1.2;}
  if(kind==2)emc*=0.75+0.25*step(0.06,fract(sin(seed+floor(uTime*12.0))*43758.5));          // flicker
  if(kind==5){                                            // security gates: moving scan lines
    float s=step(0.5,fract(vW.y*2.0-uTime*1.5));emc=alb*(0.9+0.6*s);
  }
  if(kind==6||kind==10)emc=alb*(1.2+0.6*sin(uTime*5.0+seed));                                 // anchors, pickups
  if(kind==7)emc=alb*(0.8+0.5*sin(uTime*6.0+vW.y));
  // light: sky and ground bounce, the moon, then the nearest neon
  vec3 lig=mix(uGround,uSky,N.y*0.5+0.5)*0.8+uMoon*max(dot(N,uMoonDir),0.0)*0.6;
  if(kind==9)lig+=vec3(0.35,0.3,0.45)*pow(1.0-max(dot(N,normalize(V)),0.0),2.0)*1.4;   // rim light on characters
  if(kind!=8){
    for(int i=0;i<24;i++){
      if(i>=uNL)break;
      vec3 d=uLP[i].xyz-vW; float l=length(d); float r=uLP[i].w;
      if(l<r){float a=1.0-l/r;a*=a;lig+=uLC[i].rgb*uLC[i].a*a*(0.35+0.65*max(dot(N,d/l),0.0));}
    }
  }
  vec3 col=alb*lig+emc;
  // fog: distance, plus a thick layer down in the chasm
  float f=1.0-exp(-dist*uFogD);
  float low=smoothstep(uFogY,uFogY-70.0,vW.y);
  f=clamp(f+low*0.85,0.0,1.0);
  vec3 fc=mix(uFogHi,uFogLo,low);
  col=mix(col,fc,f*(1.0-clamp(em,0.0,1.0)*0.35));
  frag=vec4(col,vX.z);
}`;
const QUAD_VS=`#version 300 es
const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));
out vec2 vUV;
void main(){vec2 p=P[gl_VertexID];vUV=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}`;
const SKY_FS=`#version 300 es
precision highp float;
in vec2 vUV; uniform mat4 uInvVP; uniform vec3 uCam; uniform float uTime;
uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uFogLo; uniform vec3 uGlow;
out vec4 frag;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec4 p=uInvVP*vec4(vUV*2.0-1.0,1.0,1.0); vec3 d=normalize(p.xyz/p.w-uCam);
  float y=d.y;
  vec3 c=mix(uHor,uZen,smoothstep(0.0,0.55,y));
  c=mix(c,uFogLo,smoothstep(0.0,-0.25,y));
  c+=uGlow*exp(-abs(y)*9.0)*0.55;                         // the haze of the city on the horizon
  vec2 sp=vec2(atan(d.z,d.x)*80.0,y*120.0);
  float s=step(0.996,h21(floor(sp)))*smoothstep(0.15,0.5,y);
  c+=vec3(s)*0.7;
  float band=sin(atan(d.z,d.x)*3.0+uTime*0.05)*0.5+0.5;  // slow drifting cloud bands lit from below
  c+=uGlow*0.08*band*smoothstep(0.05,0.25,y)*smoothstep(0.6,0.25,y);
  frag=vec4(c,1.0);
}`;
const BRIGHT_FS=`#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uTex; out vec4 frag;
void main(){vec3 c=texture(uTex,vUV).rgb;float l=max(c.r,max(c.g,c.b));frag=vec4(c*smoothstep(0.55,1.0,l),1.0);}`;
const BLUR_FS=`#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uTex; uniform vec2 uDir; out vec4 frag;
void main(){
  vec3 c=texture(uTex,vUV).rgb*0.227;
  c+=(texture(uTex,vUV+uDir*1.385).rgb+texture(uTex,vUV-uDir*1.385).rgb)*0.316;
  c+=(texture(uTex,vUV+uDir*3.231).rgb+texture(uTex,vUV-uDir*3.231).rgb)*0.07;
  frag=vec4(c,1.0);
}`;
const COMP_FS=`#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uScene; uniform sampler2D uBloom; uniform float uTime;
uniform float uRain; uniform float uHurt; uniform float uGlitch; uniform float uSlow; uniform vec2 uRes;
out vec4 frag;
float h(float n){return fract(sin(n)*43758.5453);}
void main(){
  vec2 uv=vUV;
  if(uGlitch>0.01){float band=floor(uv.y*24.0+floor(uTime*20.0));float o=(h(band)-0.5)*uGlitch*0.06*step(0.6,h(band*1.3));uv.x+=o;}
  vec2 cc=uv-0.5; float ab=0.0015+uGlitch*0.006+uHurt*0.004;
  vec3 c=vec3(texture(uScene,uv+cc*ab).r,texture(uScene,uv).g,texture(uScene,uv-cc*ab).b);
  c+=texture(uBloom,uv).rgb*1.25;
  // rain: thin slanted streaks in three depths
  if(uRain>0.0){
    float r=0.0;
    for(int i=0;i<3;i++){
      float k=float(i);vec2 p=vec2(uv.x*uRes.x/uRes.y*(55.0+k*40.0)+uv.y*6.0,uv.y*(4.0+k*2.0)+uTime*(5.0+k*1.6));
      vec2 id=floor(p);vec2 f=fract(p);float rnd=h(id.x*13.1+k*7.0);
      float lane=step(0.86,rnd)*smoothstep(0.06,0.0,abs(f.x-0.5))*smoothstep(0.0,0.5,f.y)*smoothstep(1.0,0.6,f.y+fract(rnd*7.0)*0.5);
      r+=lane*(0.18-k*0.04);
    }
    c+=vec3(0.65,0.8,1.0)*r*uRain;
  }
  // grade: lift the shadows toward violet, a vignette, and the hurt pulse
  c=c/(1.0+c*0.12);
  c=mix(vec3(0.03,0.01,0.07),vec3(1.0),c);
  float v=smoothstep(0.95,0.25,length(cc*vec2(1.2,1.0)));
  c*=mix(0.55,1.0,v);
  c=mix(c,vec3(0.9,0.05,0.15),uHurt*0.35*(1.0-v*0.7));
  c=mix(c,vec3(dot(c,vec3(0.3,0.59,0.11)))*vec3(0.75,0.9,1.2),uSlow*0.45);
  c+=(h(uv.x*913.0+uv.y*277.0+uTime)-0.5)*0.025;
  frag=vec4(c,1.0);
}`;

const R={};
function compile(vs,fs){
  const mk=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i);const nm=a.name.replace(/\[0\]$/,'');u[nm]=gl.getUniformLocation(p,a.name);}
  return{p,u};
}
// A batch of boxes: a GPU buffer of instances, and a CPU array to fill.
class Batch{
  constructor(cap,dynamic){
    this.cap=cap;this.n=0;this.data=new Float32Array(cap*STRIDE);this.dyn=dynamic;
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,R.cube);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    this.buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
    gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
    for(let i=0;i<6;i++){gl.enableVertexAttribArray(1+i);gl.vertexAttribPointer(1+i,4,gl.FLOAT,false,STRIDE*4,i*16);gl.vertexAttribDivisor(1+i,1);}
    gl.bindVertexArray(null);
  }
  clear(){this.n=0;}
  grow(){const d=new Float32Array(this.cap*2*STRIDE);d.set(this.data);this.data=d;this.cap*=2;
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,this.dyn?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);}
  // an axis-aligned box from corners
  aabb(x0,y0,z0,x1,y1,z1,col,em,kind,seed,alpha){
    if(this.n>=this.cap)this.grow();
    const o=this.n++*STRIDE,d=this.data;
    d.fill(0,o,o+16);
    d[o]=x1-x0;d[o+5]=y1-y0;d[o+10]=z1-z0;d[o+12]=(x0+x1)/2;d[o+13]=(y0+y1)/2;d[o+14]=(z0+z1)/2;d[o+15]=1;
    d[o+16]=col[0];d[o+17]=col[1];d[o+18]=col[2];d[o+19]=em||0;
    d[o+20]=kind||0;d[o+21]=seed||0;d[o+22]=alpha===undefined?1:alpha;d[o+23]=0;
  }
  // a box placed by a transform (a character part): matrix * scale(w,h,d)
  part(m,w,h,dd,col,em,kind,alpha){
    if(this.n>=this.cap)this.grow();
    const o=this.n++*STRIDE,d=this.data;
    for(let i=0;i<4;i++){d[o+i]=m[i]*w;d[o+4+i]=m[4+i]*h;d[o+8+i]=m[8+i]*dd;d[o+12+i]=m[12+i];}
    d[o+16]=col[0];d[o+17]=col[1];d[o+18]=col[2];d[o+19]=em||0;
    d[o+20]=kind===undefined?9:kind;d[o+21]=0;d[o+22]=alpha===undefined?1:alpha;d[o+23]=0;
  }
  upload(){gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data,0,this.n*STRIDE);}
  draw(){if(!this.n)return;gl.bindVertexArray(this.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,36,this.n);}
}
function makeTarget(w,h,depth){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  let rb=null;
  if(depth){rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  return{t,f,rb,w,h};
}
function freeTarget(T){if(!T)return;gl.deleteTexture(T.t);gl.deleteFramebuffer(T.f);if(T.rb)gl.deleteRenderbuffer(T.rb);}

function glInit(){
  if(!GL_OK)return false;
  R.box=compile(BOX_VS,BOX_FS);R.sky=compile(QUAD_VS,SKY_FS);R.bright=compile(QUAD_VS,BRIGHT_FS);
  R.blur=compile(QUAD_VS,BLUR_FS);R.comp=compile(QUAD_VS,COMP_FS);
  const v=[];const F=[[0,1,2,0,2,3]];
  const C=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
  for(const q of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])for(const i of [0,1,2,0,2,3])v.push(...C[q[i]]);
  R.cube=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.cube);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
  R.empty=gl.createVertexArray();
  R.world=new Batch(4096,false);R.dyn=new Batch(2048,true);R.glass=new Batch(512,true);
  return true;
}
let RT=null;
function ensureTargets(){
  const w=cvs.width,h=cvs.height;
  if(RT&&RT.w===w&&RT.h===h)return;
  if(RT){freeTarget(RT.scene);freeTarget(RT.a);freeTarget(RT.b);}
  RT={w,h,scene:makeTarget(w,h,true),a:makeTarget(Math.max(1,w>>2),Math.max(1,h>>2)),b:makeTarget(Math.max(1,w>>2),Math.max(1,h>>2))};
}
const VP=new Float32Array(16),VIEW=new Float32Array(16),PROJ=new Float32Array(16),IVP=new Float32Array(16);
/* Draw one frame. cam: {pos,target}; T: the district's look; lights: [{x,y,z,r,c:[r,g,b],i}] */
function glRender(cam,T,lights,fx,time){
  ensureTargets();
  const w=cvs.width,h=cvs.height;
  M4.persp(PROJ,cam.fov||1.05,w/h,0.15,900);
  M4.look(VIEW,cam.pos,cam.target,[0,1,0]);
  M4.mul(VP,PROJ,VIEW);M4.invert(IVP,VP);
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.scene.f);gl.viewport(0,0,w,h);
  gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  // sky
  gl.disable(gl.DEPTH_TEST);gl.useProgram(R.sky.p);gl.bindVertexArray(R.empty);
  gl.uniformMatrix4fv(R.sky.u.uInvVP,false,IVP);gl.uniform3fv(R.sky.u.uCam,cam.pos);gl.uniform1f(R.sky.u.uTime,time);
  gl.uniform3fv(R.sky.u.uZen,T.zen);gl.uniform3fv(R.sky.u.uHor,T.hor);gl.uniform3fv(R.sky.u.uFogLo,T.fogLo);gl.uniform3fv(R.sky.u.uGlow,T.glow);
  gl.drawArrays(gl.TRIANGLES,0,3);
  // boxes
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  const P=R.box,u=P.u;gl.useProgram(P.p);
  gl.uniformMatrix4fv(u.uVP,false,VP);gl.uniform3fv(u.uCam,cam.pos);gl.uniform1f(u.uTime,time);
  gl.uniform3fv(u.uSky,T.sky);gl.uniform3fv(u.uGround,T.ground);gl.uniform3fv(u.uMoonDir,T.moonDir);gl.uniform3fv(u.uMoon,T.moon);
  gl.uniform3fv(u.uFogHi,T.fogHi);gl.uniform3fv(u.uFogLo,T.fogLo);gl.uniform1f(u.uFogD,T.fogD);gl.uniform1f(u.uFogY,T.fogY);
  gl.uniform3fv(u.uWin0,T.win[0]);gl.uniform3fv(u.uWin1,T.win[1]);gl.uniform3fv(u.uWin2,T.win[2]);gl.uniform1f(u.uWinDensity,T.winDensity);
  const LP=new Float32Array(96),LC=new Float32Array(96);
  const n=Math.min(24,lights.length);
  for(let i=0;i<n;i++){const L=lights[i];LP.set([L.x,L.y,L.z,L.r],i*4);LC.set([L.c[0],L.c[1],L.c[2],L.i],i*4);}
  gl.uniform4fv(u.uLP,LP);gl.uniform4fv(u.uLC,LC);gl.uniform1i(u.uNL,n);
  gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);
  gl.disable(gl.CULL_FACE);
  R.world.draw();
  R.dyn.upload();R.dyn.draw();
  // glass: holograms, shadows and beams, blended on top
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  R.glass.upload();R.glass.draw();
  gl.depthMask(true);gl.disable(gl.BLEND);
  // bloom
  gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(R.empty);
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.a.f);gl.viewport(0,0,RT.a.w,RT.a.h);
  gl.useProgram(R.bright.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,RT.scene.t);gl.uniform1i(R.bright.u.uTex,0);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.useProgram(R.blur.p);gl.uniform1i(R.blur.u.uTex,0);
  for(let i=0;i<2;i++){
    gl.bindFramebuffer(gl.FRAMEBUFFER,RT.b.f);gl.bindTexture(gl.TEXTURE_2D,RT.a.t);gl.uniform2f(R.blur.u.uDir,1/RT.a.w*(1+i),0);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,RT.a.f);gl.bindTexture(gl.TEXTURE_2D,RT.b.t);gl.uniform2f(R.blur.u.uDir,0,1/RT.a.h*(1+i));gl.drawArrays(gl.TRIANGLES,0,3);
  }
  // composite to the screen
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
  const C=R.comp;gl.useProgram(C.p);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,RT.scene.t);gl.uniform1i(C.u.uScene,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,RT.a.t);gl.uniform1i(C.u.uBloom,1);
  gl.uniform1f(C.u.uTime,time);gl.uniform1f(C.u.uRain,fx.rain);gl.uniform1f(C.u.uHurt,fx.hurt);gl.uniform1f(C.u.uGlitch,fx.glitch);
  gl.uniform1f(C.u.uSlow,fx.slow);gl.uniform2f(C.u.uRes,w,h);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.activeTexture(gl.TEXTURE0);
}
// Project a world point to HUD units, for markers over heads. null if behind.
function toScreen(x,y,z){
  const v=VP, cx=v[0]*x+v[4]*y+v[8]*z+v[12], cy=v[1]*x+v[5]*y+v[9]*z+v[13], cw=v[3]*x+v[7]*y+v[11]*z+v[15];
  if(cw<0.1)return null;
  return[(cx/cw*0.5+0.5)*UW,(1-(cy/cw*0.5+0.5))*UH,cw];
}
