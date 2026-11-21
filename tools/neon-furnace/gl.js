/* ================================ RENDERER ================================
   Hand-written WebGL2. The world is meshes drawn with instancing: per copy a
   matrix, a colour, a glow colour and a few flags. Textures come from one
   generated atlas, sampled with nearest filtering for crisp texels. Faces
   are lit flat. The moon casts real shadows near you, wet floors catch the
   neon, lights get halos in the fog, and the frame goes through bloom,
   edge smoothing and a colour grade.                                       */
const gl=cvs.getContext('webgl2',{antialias:false,alpha:false,depth:true,powerPreference:'high-performance'});
const GL_OK=!!gl;
const STRIDE=28;                       // mat4, colour+em, kind/seed/alpha/tile, glow rgb + spare
const QUALITY={
  low:   {name:'LOW',   shadow:0,   halos:false,fxaa:false,scale:0.7, lights:12},
  medium:{name:'MEDIUM',shadow:1024,halos:true, fxaa:true, scale:0.85,lights:20},
  high:  {name:'HIGH',  shadow:2048,halos:true, fxaa:true, scale:1,   lights:24}
};
let Q=QUALITY.high;

const BOX_VS=`#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aM0; layout(location=3) in vec4 aM1; layout(location=4) in vec4 aM2; layout(location=5) in vec4 aM3;
layout(location=6) in vec4 aCol; layout(location=7) in vec4 aX; layout(location=8) in vec4 aGlow;
uniform mat4 uVP;
out vec3 vW; out vec3 vL; out vec2 vUV; out vec4 vCol; out vec4 vX; out vec3 vS; out vec4 vGlow;
void main(){
  mat4 M=mat4(aM0,aM1,aM2,aM3);
  vec4 w=M*vec4(aPos,1.0);
  vW=w.xyz;vL=aPos;vUV=aUV;vCol=aCol;vX=aX;vGlow=aGlow;
  vS=vec3(length(aM0.xyz),length(aM1.xyz),length(aM2.xyz));
  gl_Position=uVP*w;
}`;
const DEPTH_FS=`#version 300 es
precision mediump float; in vec4 vX; out vec4 f; void main(){ if(vX.z<0.5)discard; f=vec4(1.0);}`;
const BOX_FS=`#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW; in vec3 vL; in vec2 vUV; in vec4 vCol; in vec4 vX; in vec3 vS; in vec4 vGlow;
uniform vec3 uCam; uniform float uTime; uniform sampler2D uAtlas; uniform sampler2DShadow uShadow; uniform mat4 uLVP; uniform float uShadowOn;
uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uMoonDir; uniform vec3 uMoon; uniform float uWet;
uniform vec3 uFogHi; uniform vec3 uFogLo; uniform float uFogD; uniform float uFogY;
uniform vec4 uLP[24]; uniform vec4 uLC[24]; uniform int uNL;
uniform vec3 uWin0; uniform vec3 uWin1; uniform vec3 uWin2; uniform float uWinDensity; uniform float uFlash;
out vec4 frag;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec4 atlas(float t,vec2 uv){uv=fract(uv);float tx=mod(t,16.0),ty=floor(t/16.0);return texture(uAtlas,(vec2(tx,ty)+clamp(uv,0.004,0.996))/16.0);}
void main(){
  vec3 N=normalize(cross(dFdx(vW),dFdy(vW)));
  vec3 V=uCam-vW; float dist=length(V); vec3 Vn=V/dist;
  if(dot(N,V)<0.0)N=-N;
  int kind=int(vX.x+0.5); float seed=vX.y, tl=vX.w;
  vec3 alb=vCol.rgb; float em=vCol.a; vec3 emc=alb*em;
  bool side=abs(N.y)<0.5;
  // texture: meshes use their uvs, world boxes are mapped from world position
  if(tl>=0.0){
    vec2 uv;
    if(kind==9||kind==12||kind==10||kind==2||kind==15)uv=vUV;
    else{float sc=kind==3||kind==4?0.5:0.4; uv=side?(abs(N.x)>0.5?vec2(vW.z,-vW.y):vec2(vW.x,-vW.y))*sc:vW.xz*sc;}
    if(kind==16)uv.y+=uTime*0.6;
    vec4 t=atlas(tl,uv);
    if(t.a<0.25)discard;
    if(t.a<0.75){emc+=t.rgb*vGlow.rgb*2.4;alb*=0.15;}
    else alb*=t.rgb;
  }
  if(kind==1||kind==8){                                   // towers: windows from world position
    if(side){
      float u=abs(N.x)>0.5?vW.z:vW.x;
      vec2 cell=floor(vec2(u/1.7,vW.y/2.6)); vec2 f=fract(vec2(u/1.7,vW.y/2.6));
      float face=abs(N.x)>0.5?(N.x>0.0?1.0:2.0):(N.z>0.0?3.0:4.0);
      float h=h21(cell+vec2(seed*0.013,face*7.1));
      float win=step(0.16,f.x)*step(f.x,0.84)*step(0.22,f.y)*step(f.y,0.72);
      float lit=step(1.0-uWinDensity,h)*step(0.25,h21(vec2(cell.y,seed+face)));
      float pick=h21(cell*1.7+seed);
      vec3 wc=pick<0.55?uWin0:pick<0.82?uWin1:uWin2;
      // blinds and a silhouette now and then
      float blind=step(0.7,h21(cell+9.0))*step(0.5,fract(f.y*6.0));
      float person=step(0.93,h21(cell+floor(uTime*0.2)))*step(0.4,f.x)*step(f.x,0.6)*step(f.y,0.62);
      alb=mix(alb,vec3(0.03,0.035,0.06),win);
      emc+=wc*win*lit*(0.75+0.5*h21(cell+3.0))*(1.0-blind*0.5)*(1.0-person*0.85);
      float band=step(0.93,fract(vW.y/18.0+seed*0.1));
      emc+=mix(uWin1,uWin2,step(0.5,h21(vec2(seed))))*band*0.9;
    }
  }
  if((kind==3||kind==4)&&!side){                          // decks and bridges: a lit edge
    vec2 e=0.5-abs(vL.xz); float edge=1.0-step(0.6/vS.x,e.x)*step(0.6/vS.z,e.y);
    emc+=uWin1*edge*1.3;
  }
  if(kind==2)emc*=0.75+0.25*step(0.06,fract(sin(seed+floor(uTime*12.0))*43758.5));
  if(kind==5){float s=step(0.5,fract(vW.y*2.0-uTime*1.5));emc=alb*(0.9+0.6*s);}
  if(kind==6||kind==10)emc=max(emc,alb*(1.2+0.6*sin(uTime*5.0+seed)));
  if(kind==7)emc=alb*(0.8+0.5*sin(uTime*6.0+vW.y));
  if(kind==13){float s=fract(vW.y*0.25-uTime*1.2+seed);emc=alb*(0.4+1.6*step(0.8,s));}
  if(kind==14)emc=alb*(1.6+0.4*sin(uTime*40.0+vW.x*3.0));
  // contact shading: low on walls and props, darker toward the ground
  if(side&&(kind==0||kind==1||kind==12)){float up=(vL.y+0.5)*vS.y;alb*=0.55+0.45*smoothstep(0.0,1.8,up);}
  // light
  float sh=1.0;
  if(uShadowOn>0.5&&kind!=8){
    vec4 lp=uLVP*vec4(vW+N*0.06,1.0); vec3 sc=lp.xyz/lp.w*0.5+0.5;
    if(sc.x>0.0&&sc.x<1.0&&sc.y>0.0&&sc.y<1.0&&sc.z<1.0){
      float s=0.0;vec2 px=vec2(1.0/float(textureSize(uShadow,0).x));
      s+=texture(uShadow,vec3(sc.xy+vec2(-px.x,-px.y)*0.8,sc.z-0.0015));
      s+=texture(uShadow,vec3(sc.xy+vec2(px.x,-px.y)*0.8,sc.z-0.0015));
      s+=texture(uShadow,vec3(sc.xy+vec2(-px.x,px.y)*0.8,sc.z-0.0015));
      s+=texture(uShadow,vec3(sc.xy+vec2(px.x,px.y)*0.8,sc.z-0.0015));
      sh=mix(0.32,1.0,s*0.25);
    }
  }
  vec3 lig=mix(uGround,uSky,N.y*0.5+0.5)*0.8*mix(0.75,1.0,sh)+uMoon*max(dot(N,uMoonDir),0.0)*0.65*sh;
  if(kind==9)lig+=vec3(0.35,0.3,0.45)*pow(1.0-max(dot(N,Vn),0.0),2.0)*1.4;
  vec3 spec=vec3(0.0);
  float wet=(kind==3||kind==4)&&!side?uWet:0.0;
  if(kind!=8){
    for(int i=0;i<24;i++){
      if(i>=uNL)break;
      vec3 d=uLP[i].xyz-vW; float l=length(d); float r=uLP[i].w;
      if(l<r){float a=1.0-l/r;a*=a;vec3 Ld=d/l;lig+=uLC[i].rgb*uLC[i].a*a*(0.35+0.65*max(dot(N,Ld),0.0));
        if(wet>0.0){vec3 H=normalize(Ld+Vn);spec+=uLC[i].rgb*uLC[i].a*pow(max(dot(N,H),0.0),90.0)*wet*3.0*sqrt(a);}}
    }
  }
  vec3 col=alb*lig+emc+spec+uFlash*vec3(0.5,0.55,0.8)*alb;
  if(wet>0.0){float fr=pow(1.0-max(Vn.y,0.0),4.0);col+=uFogHi*fr*wet*0.6;}
  float f=1.0-exp(-dist*uFogD);
  float low=smoothstep(uFogY,uFogY-70.0,vW.y);
  f=clamp(f+low*0.85,0.0,1.0);
  vec3 fc=mix(uFogHi,uFogLo,low);
  col=mix(col,fc,f*(1.0-clamp(em+length(emc)*0.2,0.0,1.0)*0.35));
  frag=vec4(col,vX.z);
}`;
const QUAD_VS=`#version 300 es
const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));
out vec2 vUV;
void main(){vec2 p=P[gl_VertexID];vUV=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}`;
const SKY_FS=`#version 300 es
precision highp float;
in vec2 vUV; uniform mat4 uInvVP; uniform vec3 uCam; uniform float uTime; uniform float uFlash;
uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uFogLo; uniform vec3 uGlow;
out vec4 frag;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec4 p=uInvVP*vec4(vUV*2.0-1.0,1.0,1.0); vec3 d=normalize(p.xyz/p.w-uCam);
  float y=d.y;
  vec3 c=mix(uHor,uZen,smoothstep(0.0,0.55,y));
  c=mix(c,uFogLo,smoothstep(0.0,-0.25,y));
  c+=uGlow*exp(-abs(y)*9.0)*0.55;
  vec2 sp=vec2(atan(d.z,d.x)*80.0,y*120.0);
  c+=vec3(step(0.996,h21(floor(sp)))*smoothstep(0.15,0.5,y))*0.7;
  float band=sin(atan(d.z,d.x)*3.0+uTime*0.05)*0.5+0.5;
  c+=uGlow*0.08*band*smoothstep(0.05,0.25,y)*smoothstep(0.6,0.25,y);
  c+=vec3(0.6,0.65,1.0)*uFlash*smoothstep(0.0,0.6,y);
  frag=vec4(c,1.0);
}`;
const HALO_VS=`#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec4 aC;
uniform mat4 uVP; uniform vec3 uCam; uniform float uH; uniform float uFogD;
out vec4 vC;
void main(){vec4 c=uVP*vec4(aP,1.0);gl_Position=c;float d=length(aP-uCam);
  gl_PointSize=clamp(aC.a*uH/max(d,1.0),2.0,uH*0.25);vC=vec4(aC.rgb*exp(-d*uFogD*0.9)*smoothstep(3.0,10.0,d),1.0);}`;
const HALO_FS=`#version 300 es
precision mediump float; in vec4 vC; out vec4 f;
void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;f=vec4(vC.rgb*pow(1.0-r,2.2)*0.32,1.0);}`;
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
uniform float uFxaa; uniform float uBlur; uniform float uBars; uniform float uFlash;
out vec4 frag;
float h(float n){return fract(sin(n)*43758.5453);}
vec3 scene(vec2 uv){
  if(uFxaa<0.5)return texture(uScene,uv).rgb;
  vec2 px=1.0/uRes;
  vec3 c=texture(uScene,uv).rgb,n=texture(uScene,uv+vec2(0,px.y)).rgb,s=texture(uScene,uv-vec2(0,px.y)).rgb,e=texture(uScene,uv+vec2(px.x,0)).rgb,w=texture(uScene,uv-vec2(px.x,0)).rgb;
  vec3 L=vec3(0.299,0.587,0.114);float lc=dot(c,L),ln=dot(n,L),ls=dot(s,L),le=dot(e,L),lw=dot(w,L);
  float mn=min(lc,min(min(ln,ls),min(le,lw))),mx=max(lc,max(max(ln,ls),max(le,lw)));
  if(mx-mn<max(0.05,mx*0.15))return c;
  vec2 dir=normalize(vec2((ls+ln)-(le+lw)+1e-4,(le+lw)-(ls+ln)+1e-4))*px;
  return (texture(uScene,uv+dir*0.5).rgb+texture(uScene,uv-dir*0.5).rgb+c*2.0)*0.25;
}
void main(){
  vec2 uv=vUV;
  if(uGlitch>0.01){float band=floor(uv.y*24.0+floor(uTime*20.0));uv.x+=(h(band)-0.5)*uGlitch*0.06*step(0.6,h(band*1.3));}
  vec2 cc=uv-0.5; float ab=0.0015+uGlitch*0.006+uHurt*0.004;
  vec3 c=vec3(texture(uScene,uv+cc*ab).r,0.0,texture(uScene,uv-cc*ab).b);c.g=scene(uv).g;
  vec3 base=scene(uv);c=vec3(mix(base.r,c.r,0.6),base.g,mix(base.b,c.b,0.6));
  if(uBlur>0.01){vec3 acc=c;for(int i=1;i<7;i++){acc+=texture(uScene,uv-cc*float(i)*0.012*uBlur).rgb;}c=acc/7.0;}
  c+=texture(uBloom,uv).rgb*1.25;
  if(uRain>0.0){
    float r=0.0;
    for(int i=0;i<3;i++){
      float k=float(i);vec2 p=vec2(uv.x*uRes.x/uRes.y*(55.0+k*40.0)+uv.y*6.0,uv.y*(4.0+k*2.0)+uTime*(5.0+k*1.6));
      vec2 id=floor(p);vec2 f=fract(p);float rnd=h(id.x*13.1+k*7.0);
      r+=step(0.86,rnd)*smoothstep(0.06,0.0,abs(f.x-0.5))*smoothstep(0.0,0.5,f.y)*smoothstep(1.0,0.6,f.y+fract(rnd*7.0)*0.5)*(0.18-k*0.04);
    }
    c+=vec3(0.65,0.8,1.0)*r*uRain;
  }
  c+=vec3(0.7,0.75,1.0)*uFlash*0.35;
  c=c/(1.0+c*0.12);
  c=mix(vec3(0.03,0.01,0.07),vec3(1.0),c);
  float v=smoothstep(0.95,0.25,length(cc*vec2(1.2,1.0)));
  c*=mix(0.55,1.0,v);
  c=mix(c,vec3(0.9,0.05,0.15),uHurt*0.35*(1.0-v*0.7));
  c=mix(c,vec3(dot(c,vec3(0.3,0.59,0.11)))*vec3(0.75,0.9,1.2),uSlow*0.45);
  c+=(h(uv.x*913.0+uv.y*277.0+uTime)-0.5)*0.025;
  if(uBars>0.0){float b=uBars*0.12;if(vUV.y<b||vUV.y>1.0-b)c=vec3(0.0);}
  frag=vec4(c,1.0);
}`;

const R={};
function compile(vs,fs){
  const mk=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i);u[a.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(p,a.name);}
  return{p,u};
}
const NOGLOW=[1,1,1];
// One mesh, many copies.
class Batch{
  constructor(mesh,cap,dynamic){
    this.mesh=mesh;this.cap=cap;this.n=0;this.data=new Float32Array(cap*STRIDE);this.dyn=dynamic;
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,R.vbo[mesh]);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12);
    this.buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
    gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
    for(let i=0;i<7;i++){gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,STRIDE*4,i*16);gl.vertexAttribDivisor(2+i,1);}
    gl.bindVertexArray(null);
  }
  grow(){const d=new Float32Array(this.cap*2*STRIDE);d.set(this.data);this.data=d;this.cap*=2;
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,this.dyn?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);}
  slot(){if(this.n>=this.cap)this.grow();return this.n++*STRIDE;}
  tail(o,col,em,kind,seed,alpha,tile,glow){const d=this.data;
    d[o+16]=col[0];d[o+17]=col[1];d[o+18]=col[2];d[o+19]=em||0;
    d[o+20]=kind||0;d[o+21]=seed||0;d[o+22]=alpha===undefined?1:alpha;d[o+23]=tile===undefined?-1:tile;
    const g=glow||NOGLOW;d[o+24]=g[0];d[o+25]=g[1];d[o+26]=g[2];d[o+27]=0;}
  upload(){gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data,0,this.n*STRIDE);}
  draw(){if(!this.n)return;gl.bindVertexArray(this.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,MESH[this.mesh].n,this.n);}
}
// A layer holds one batch per mesh it uses.
class Layer{
  constructor(dynamic){this.dyn=dynamic;this.b={};}
  get(mesh){return this.b[mesh]||(this.b[mesh]=new Batch(mesh,this.dyn?256:1024,this.dyn));}
  clear(){for(const k in this.b)this.b[k].n=0;}
  // an axis-aligned box from two corners
  aabb(x0,y0,z0,x1,y1,z1,col,em,kind,seed,alpha,tile,glow,mesh){
    const B=this.get(mesh||'box'),o=B.slot(),d=B.data;
    d.fill(0,o,o+16);
    d[o]=x1-x0;d[o+5]=y1-y0;d[o+10]=z1-z0;d[o+12]=(x0+x1)/2;d[o+13]=(y0+y1)/2;d[o+14]=(z0+z1)/2;d[o+15]=1;
    B.tail(o,col,em,kind,seed,alpha,tile,glow);
  }
  // a mesh placed by a transform: matrix * scale(w,h,d)
  part(mesh,m,w,h,dd,col,em,kind,alpha,tile,glow){
    const B=this.get(mesh),o=B.slot(),d=B.data;
    for(let i=0;i<4;i++){d[o+i]=m[i]*w;d[o+4+i]=m[4+i]*h;d[o+8+i]=m[8+i]*dd;d[o+12+i]=m[12+i];}
    B.tail(o,col,em,kind===undefined?9:kind,0,alpha,tile,glow);
  }
  upload(){for(const k in this.b)this.b[k].upload();}
  draw(){for(const k in this.b)this.b[k].draw();}
}
function makeTarget(w,h,depth,depthTex){
  const T={w,h,f:gl.createFramebuffer(),t:null,rb:null,d:null};
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.f);
  if(!depthTex){
    T.t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,T.t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,T.t,0);
  }
  if(depth){T.rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,T.rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,T.rb);}
  if(depthTex){
    T.d=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,T.d);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE],[gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL]])gl.texParameteri(gl.TEXTURE_2D,k,v);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,T.d,0);
    gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  return T;
}
function freeTarget(T){if(!T)return;if(T.t)gl.deleteTexture(T.t);if(T.d)gl.deleteTexture(T.d);gl.deleteFramebuffer(T.f);if(T.rb)gl.deleteRenderbuffer(T.rb);}

function glInit(){
  if(!GL_OK)return false;
  R.box=compile(BOX_VS,BOX_FS);R.depth=compile(BOX_VS,DEPTH_FS);R.sky=compile(QUAD_VS,SKY_FS);R.bright=compile(QUAD_VS,BRIGHT_FS);
  R.blur=compile(QUAD_VS,BLUR_FS);R.comp=compile(QUAD_VS,COMP_FS);R.halo=compile(HALO_VS,HALO_FS);
  buildMeshes();
  const img=buildAtlas();
  R.atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,R.atlas);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,ATS,ATS,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(img.data.buffer));
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  R.vbo={};for(const k in MESH){R.vbo[k]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.vbo[k]);gl.bufferData(gl.ARRAY_BUFFER,MESH[k].data,gl.STATIC_DRAW);}
  R.empty=gl.createVertexArray();
  // a 1x1 depth texture for the shadow sampler when shadows are off: a sampler2DShadow with nothing bound fails the draw
  R.noShadow=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,R.noShadow);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,1,1,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,new Uint32Array([0xffffffff]));
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE],[gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  R.world=new Layer(false);R.far=new Layer(false);R.dyn=new Layer(true);R.glass=new Layer(true);R.add=new Layer(true);
  R.haloBuf=gl.createBuffer();R.haloVao=gl.createVertexArray();gl.bindVertexArray(R.haloVao);gl.bindBuffer(gl.ARRAY_BUFFER,R.haloBuf);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,28,12);gl.bindVertexArray(null);
  R.haloData=new Float32Array(7*512);
  return true;
}
let RT=null,SHT=null;
function ensureTargets(){
  const w=cvs.width,h=cvs.height;
  if(!(RT&&RT.w===w&&RT.h===h)){
    if(RT){freeTarget(RT.scene);freeTarget(RT.a);freeTarget(RT.b);}
    RT={w,h,scene:makeTarget(w,h,true),a:makeTarget(Math.max(1,w>>2),Math.max(1,h>>2)),b:makeTarget(Math.max(1,w>>2),Math.max(1,h>>2))};
  }
  if(Q.shadow&&!(SHT&&SHT.w===Q.shadow)){freeTarget(SHT);SHT=makeTarget(Q.shadow,Q.shadow,false,true);}
}
const VP=new Float32Array(16),VIEW=new Float32Array(16),PROJ=new Float32Array(16),IVP=new Float32Array(16),LVP=new Float32Array(16);
const LV=new Float32Array(16),LP=new Float32Array(16);
function ortho(o,s,n,f){o.fill(0);o[0]=1/s;o[5]=1/s;o[10]=-2/(f-n);o[14]=-(f+n)/(f-n);o[15]=1;return o;}
/* Draw one frame. cam: {pos,target,fov,roll}; T: the district's look; lights; halos: [x,y,z,r,g,b,size]... */
function glRender(cam,T,lights,fx,time,focus){
  ensureTargets();
  const w=cvs.width,h=cvs.height;
  M4.persp(PROJ,cam.fov||1.05,w/h,0.15,1000);
  const up=cam.roll?[Math.sin(cam.roll),Math.cos(cam.roll),0]:[0,1,0];
  M4.look(VIEW,cam.pos,cam.target,up);
  M4.mul(VP,PROJ,VIEW);M4.invert(IVP,VP);
  // ---- shadows: an orthographic view from the moon, centred on the action ----
  const shadowOn=!!(Q.shadow&&SHT);
  if(shadowOn){
    const md=T.moonDir,c=focus;
    M4.look(LV,[c[0]+md[0]*60,c[1]+md[1]*60,c[2]+md[2]*60],c,[0,1,0]);ortho(LP,34,1,140);M4.mul(LVP,LP,LV);
    gl.bindFramebuffer(gl.FRAMEBUFFER,SHT.f);gl.viewport(0,0,SHT.w,SHT.w);gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);
    gl.useProgram(R.depth.p);gl.uniformMatrix4fv(R.depth.u.uVP,false,LVP);
    gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(2,4);
    R.world.draw();R.dyn.upload();R.dyn.draw();
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }else R.dyn.upload();
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.scene.f);gl.viewport(0,0,w,h);
  gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  // ---- sky ----
  gl.disable(gl.DEPTH_TEST);gl.useProgram(R.sky.p);gl.bindVertexArray(R.empty);
  gl.uniformMatrix4fv(R.sky.u.uInvVP,false,IVP);gl.uniform3fv(R.sky.u.uCam,cam.pos);gl.uniform1f(R.sky.u.uTime,time);gl.uniform1f(R.sky.u.uFlash,fx.flash||0);
  gl.uniform3fv(R.sky.u.uZen,T.zen);gl.uniform3fv(R.sky.u.uHor,T.hor);gl.uniform3fv(R.sky.u.uFogLo,T.fogLo);gl.uniform3fv(R.sky.u.uGlow,T.glow);
  gl.drawArrays(gl.TRIANGLES,0,3);
  // ---- the world ----
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  const P=R.box,u=P.u;gl.useProgram(P.p);
  gl.uniformMatrix4fv(u.uVP,false,VP);gl.uniform3fv(u.uCam,cam.pos);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uFlash,fx.flash||0);
  gl.uniform3fv(u.uSky,T.sky);gl.uniform3fv(u.uGround,T.ground);gl.uniform3fv(u.uMoonDir,T.moonDir);gl.uniform3fv(u.uMoon,T.moon);gl.uniform1f(u.uWet,T.wet||0);
  gl.uniform3fv(u.uFogHi,T.fogHi);gl.uniform3fv(u.uFogLo,T.fogLo);gl.uniform1f(u.uFogD,T.fogD);gl.uniform1f(u.uFogY,T.fogY);
  gl.uniform3fv(u.uWin0,T.win[0]);gl.uniform3fv(u.uWin1,T.win[1]);gl.uniform3fv(u.uWin2,T.win[2]);gl.uniform1f(u.uWinDensity,T.winDensity);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,R.atlas);gl.uniform1i(u.uAtlas,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,shadowOn?SHT.d:R.noShadow);gl.uniform1i(u.uShadow,1);
  gl.uniform1f(u.uShadowOn,shadowOn?1:0);gl.uniformMatrix4fv(u.uLVP,false,LVP);
  const LPs=new Float32Array(96),LCs=new Float32Array(96),n=Math.min(Q.lights,lights.length);
  for(let i=0;i<n;i++){const L=lights[i];LPs[i*4]=L.x;LPs[i*4+1]=L.y;LPs[i*4+2]=L.z;LPs[i*4+3]=L.r;LCs[i*4]=L.c[0];LCs[i*4+1]=L.c[1];LCs[i*4+2]=L.c[2];LCs[i*4+3]=L.i;}
  gl.uniform4fv(u.uLP,LPs);gl.uniform4fv(u.uLC,LCs);gl.uniform1i(u.uNL,n);
  gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
  R.world.draw();R.far.draw();R.dyn.draw();
  // glass, then light: alpha-blended holograms and shadows, then additive beams and halos
  gl.enable(gl.BLEND);gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);R.glass.upload();R.glass.draw();
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE);R.add.upload();R.add.draw();
  if(Q.halos&&fx.halos&&fx.halos.length){
    gl.useProgram(R.halo.p);gl.uniformMatrix4fv(R.halo.u.uVP,false,VP);gl.uniform3fv(R.halo.u.uCam,cam.pos);gl.uniform1f(R.halo.u.uH,h);gl.uniform1f(R.halo.u.uFogD,T.fogD);
    const hs=fx.halos,cnt=Math.min(512,hs.length/7);gl.bindVertexArray(R.haloVao);gl.bindBuffer(gl.ARRAY_BUFFER,R.haloBuf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(hs.buffer||hs,0,cnt*7),gl.DYNAMIC_DRAW);
    gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.POINTS,0,cnt);
  }
  gl.depthMask(true);gl.disable(gl.BLEND);
  // ---- bloom ----
  gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(R.empty);
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.a.f);gl.viewport(0,0,RT.a.w,RT.a.h);
  gl.useProgram(R.bright.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,RT.scene.t);gl.uniform1i(R.bright.u.uTex,0);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.useProgram(R.blur.p);gl.uniform1i(R.blur.u.uTex,0);
  for(let i=0;i<2;i++){
    gl.bindFramebuffer(gl.FRAMEBUFFER,RT.b.f);gl.bindTexture(gl.TEXTURE_2D,RT.a.t);gl.uniform2f(R.blur.u.uDir,1/RT.a.w*(1+i),0);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,RT.a.f);gl.bindTexture(gl.TEXTURE_2D,RT.b.t);gl.uniform2f(R.blur.u.uDir,0,1/RT.a.h*(1+i));gl.drawArrays(gl.TRIANGLES,0,3);
  }
  // ---- to the screen ----
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
  const C=R.comp;gl.useProgram(C.p);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,RT.scene.t);gl.uniform1i(C.u.uScene,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,RT.a.t);gl.uniform1i(C.u.uBloom,1);
  gl.uniform1f(C.u.uTime,time);gl.uniform1f(C.u.uRain,fx.rain);gl.uniform1f(C.u.uHurt,fx.hurt);gl.uniform1f(C.u.uGlitch,fx.glitch);
  gl.uniform1f(C.u.uSlow,fx.slow);gl.uniform2f(C.u.uRes,w,h);gl.uniform1f(C.u.uFxaa,Q.fxaa?1:0);gl.uniform1f(C.u.uBlur,fx.blur||0);
  gl.uniform1f(C.u.uBars,fx.bars||0);gl.uniform1f(C.u.uFlash,fx.flash||0);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.activeTexture(gl.TEXTURE0);
}
function toScreen(x,y,z){
  const v=VP,cx=v[0]*x+v[4]*y+v[8]*z+v[12],cy=v[1]*x+v[5]*y+v[9]*z+v[13],cw=v[3]*x+v[7]*y+v[11]*z+v[15];
  if(cw<0.1)return null;
  return[(cx/cw*0.5+0.5)*UW,(1-(cy/cw*0.5+0.5))*UH,cw];
}
