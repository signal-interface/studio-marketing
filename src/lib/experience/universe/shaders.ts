// ─────────────────────────────────────────────────────────────
// GLSL ES 3.00 sources for the entrance universe.
// Marketing-site-local; not Studio architecture.
//
// Three programs:
//   SKY  — baked once per resize into an offscreen texture. Deep field:
//          power-law stellar magnitudes, clustered density, galactic band,
//          dust extinction, extremely restrained nebular colour.
//   NEAR — instanced quads: a sparse 3D star volume in front of the
//          camera. Real perspective parallax; shutter-time streaks.
//   COMP — per-frame composite: lensed sky + radial zoom blur,
//          white-hole light, filmic exposure, flash, grain.
// ─────────────────────────────────────────────────────────────

const COMMON = /* glsl */ `
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec2 hash22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
vec4 hash42(vec2 p){vec4 p4=fract(vec4(p.xyxy)*vec4(.1031,.1030,.0973,.1099));p4+=dot(p4,p4.wzxy+33.33);return fract((p4.xxyz+p4.yzzw)*p4.zywx);}
float vnoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=hash12(i),b=hash12(i+vec2(1,0)),c=hash12(i+vec2(0,1)),d=hash12(i+vec2(1,1));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
`;

export const FULLSCREEN_VS = /* glsl */ `#version 300 es
layout(location=0) in vec2 aPos;
void main(){gl_Position=vec4(aPos,0.,1.);}
`;

// ── SKY ─────────────────────────────────────────────────────
// Output is encoded e = sqrt(c/(1+c)) so faint stars survive RGBA8.
export const SKY_FS = (octaves: number) => /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;       // texture size in pixels
uniform float uSeed;
out vec4 outColor;
${COMMON}
float fbm(vec2 p){
  float v=0.,a=.5;mat2 m=rot(.61);
  for(int i=0;i<${octaves};i++){v+=a*vnoise(p);p=m*p*2.03+17.1;a*=.5;}
  return v;
}
vec3 starColor(float h){
  // Rough main-sequence population weighting: most stars white→yellow,
  // few hot blue-white, some cool orange. Never saturated.
  vec3 hot=vec3(.78,.86,1.), white=vec3(1.,.985,.96), yel=vec3(1.,.91,.78), org=vec3(1.,.8,.62);
  return h<.12?mix(hot,white,h/.12):h<.6?mix(white,yel,(h-.12)/.48):mix(yel,org,(h-.6)/.4);
}
// One star per cell, drawn with a pixel-scale PSF.
// cellPx: cell size in px. prob: occupancy. k: magnitude exponent (higher = fainter population).
vec3 starCell(vec2 q,vec2 id,float cellPx,float px,float prob,float k,float amp,float halo){
  vec4 h=hash42(id+uSeed);
  if(h.x>prob) return vec3(0.);
  vec2 sp=(id+.2+.6*h.yz)*cellPx*px;
  float d=length(q-sp)/px;                  // distance in pixels
  float lum=pow(h.w,k);
  float sig=.46+.55*sqrt(lum);               // brighter stars bloom slightly wider
  float I=amp*lum*exp(-d*d/(2.*sig*sig));
  I+=halo*amp*lum*exp(-d/(3.+5.*lum))*.012; // faint atmospheric halo, bright stars only
  return I*starColor(fract(h.w*91.7+h.y*13.3));
}
vec3 starLayer(vec2 q,float cellPx,float px,float prob,float k,float amp,float halo,bool nb){
  vec2 g=q/(cellPx*px);vec2 id=floor(g);
  if(!nb) return starCell(q,id,cellPx,px,prob,k,amp,halo);
  vec3 c=vec3(0.);
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++)c+=starCell(q,id+vec2(i,j),cellPx,px,prob,k,amp,halo);
  return c;
}
void main(){
  float px=1./uRes.y;
  vec2 q=(gl_FragCoord.xy-.5*uRes)*px;       // height-normalised sky coords

  // Galactic band: tilted, warped, clumpy — not a centred glow.
  vec2 qr=rot(-.42)*(q-vec2(.18,-.06));
  float warp=.09*fbm(qr*1.3+uSeed)-.045;
  float b=qr.y+warp;
  float band=exp(-b*b/(2.*.17*.17));
  float core=exp(-b*b/(2.*.055*.055));
  float along=.55+.45*fbm(vec2(qr.x*.8,qr.y*2.)+3.+uSeed);
  float clouds=fbm(qr*3.4+7.+uSeed);

  // Dust: ridged lanes hugging the band's spine + scattered dark nebulae.
  float ridge=1.-abs(fbm(qr*vec2(1.5,5.2)+11.+uSeed)*2.-1.);
  float lanes=smoothstep(.62,.92,ridge)*exp(-(b+.015)*(b+.015)/(2.*.07*.07));
  float darkNeb=smoothstep(.56,.78,fbm(q*2.1+19.+uSeed))*(.35+.65*band);
  float extinction=clamp(.88*lanes+.7*darkNeb,0.,.94);
  float clear=1.-extinction;

  // Stellar density: band + cloud structure + rare open clusters + voids.
  float density=mix(.3,1.,band*along)*(.45+1.1*clouds*clouds);
  float cluster=smoothstep(.83,.97,vnoise(q*7.+71.+uSeed));
  density=clamp(density*clear+cluster*.9,0.,1.6);

  vec3 c=vec3(0.);
  // Unresolved starlight — the milky glow is *made of* stars.
  vec3 glowCol=mix(vec3(.6,.64,.74),vec3(.96,.86,.72),core);
  c+=glowCol*band*along*(.3+.7*clouds*clouds)*.011*clear;
  c+=glowCol*core*along*.007*clear;

  // Stellar populations, faint → bright. Magnitudes follow steep power
  // laws so the overwhelming majority of stars are barely visible.
  c+=starLayer(q,2.6,px,.5*density,16.,.55,0.,false);
  c+=starLayer(q,5.5,px,.42*density,10.,.9,0.,false);
  c+=starLayer(q,13.,px,.34*density+.12*cluster,8.,1.3,.4,false);
  c+=starLayer(q,38.,px,.26*(.45+.55*density),7.,2.6,1.,true);
  c+=starLayer(q,150.,px,.2,4.5,5.5,1.,true)*mix(1.,clear,.6);

  // Extremely restrained emission / reflection nebulosity.
  float ha=smoothstep(.62,.95,fbm(q*1.05+31.+uSeed))*band;
  float refl=smoothstep(.68,.97,fbm(q*1.7+47.+uSeed));
  c+=vec3(.95,.38,.36)*ha*.005;
  c+=vec3(.42,.52,.78)*refl*.003;

  c=max(c,0.);
  outColor=vec4(sqrt(c/(1.+c)),1.);
}
`;

// ── NEAR STAR VOLUME ────────────────────────────────────────
// Per instance: star world (x,y), depth phase, luminance/color seed.
export const NEAR_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;  // quad corner in [-1,1]^2
layout(location=1) in vec4 aStar;    // x, y, zPhase, seed
mat2 rot2(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
uniform vec2 uRes;
uniform float uCamZ;     // camera travel (world units, wraps)
uniform float uVel;      // world units per shutter interval
uniform vec2 uCamOff;    // lateral camera offset (pointer parallax)
uniform float uRoll;
uniform float uFocal;
uniform float uDepth;    // volume depth
out vec2 vLocal;
out float vLen;
out float vW;
out float vLum;
out float vSeed;
void main(){
  float dz=mod(aStar.z-uCamZ,uDepth)+.04;
  float dzPrev=dz+uVel;
  vec2 w=aStar.xy-uCamOff;
  vec2 head=rot2(uRoll)*(w/dz)*uFocal;
  vec2 tail=rot2(uRoll)*(w/dzPrev)*uFocal;
  // Pixel units
  vec2 H=head*uRes.y, Tl=tail*uRes.y;
  vec2 dir=H-Tl; float len=length(dir);
  vec2 ax=len>1e-3?dir/len:vec2(1.,0.);
  vec2 ay=vec2(-ax.y,ax.x);
  float lum=pow(fract(aStar.w*7.13),5.)*.9+.05;
  float fade=smoothstep(uDepth,uDepth*.62,dz)*smoothstep(.04,.2,dz);
  float bright=lum*fade*min(.9,.2/dz)*(1.+3.2*min(uVel,.5));
  float wpx=.8+.55*sqrt(bright);
  vec2 mid=(H+Tl)*.5;
  vec2 pos=mid+ax*aCorner.x*(len*.5+wpx*2.5)+ay*aCorner.y*wpx*2.5;
  vLocal=vec2(aCorner.x*(len*.5+wpx*2.5),aCorner.y*wpx*2.5);
  vLen=len*.5; vW=wpx; vLum=bright; vSeed=aStar.w;
  gl_Position=vec4(pos/(uRes*.5),0.,1.);
}
`;

export const NEAR_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vLocal; in float vLen; in float vW; in float vLum; in float vSeed;
out vec4 outColor;
void main(){
  // Capsule distance: streak core + soft falloff; energy spread over length
  float x=max(abs(vLocal.x)-vLen,0.);
  float d=length(vec2(x,vLocal.y));
  float spread=vW/(vW+vLen*.35);
  float I=vLum*exp(-d*d/(2.*.45*vW*vW))*spread;
  vec3 col=mix(vec3(.84,.9,1.),vec3(1.,.93,.82),fract(vSeed*53.1));
  outColor=vec4(col*I,1.);
}
`;

// ── COMPOSITE ───────────────────────────────────────────────
export const COMP_FS = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform sampler2D uSky;
uniform sampler2D uNear;
uniform vec2 uSkyExt;     // sky texture half-extent in height-normalised units
uniform float uTime;      // seconds
uniform vec2 uHole;       // aperture position (height-normalised, centre origin)
uniform float uAppear;
uniform float uAperture;  // apparent scale from approach
uniform float uU;         // pull progress
uniform float uVel;       // travel velocity (streak)
uniform float uExposure;
uniform float uWhite;
uniform float uUniverse;
uniform float uRoll;
uniform vec2 uCamOff;
out vec4 outColor;
${COMMON}
vec3 skyAt(vec2 q){
  vec3 e=texture(uSky,q/(2.*uSkyExt)+.5).rgb;
  vec3 y=e*e;
  return y/max(1.-y,1e-3);
}
void main(){
  float px=1./uRes.y;
  vec2 p0=(gl_FragCoord.xy-.5*uRes)*px;
  vec2 p=rot(uRoll)*p0;
  vec2 rel=p-uHole;
  float r=max(length(rel),1e-5);
  vec2 dir=rel/r;
  float ang=atan(rel.y,rel.x);

  // ── Gravitational lensing (thin point lens + mild shear) ──
  // Einstein radius grows with approach. Shear breaks the ring into
  // partial arcs so it never reads as a drawn circle.
  float thE=(.012+.05*uAppear)*pow(uAperture,.55);
  float shear=1.+.22*cos(2.*(ang-.55))+.09*cos(ang+1.25);
  float thA=thE*shear;
  vec2 beta=rel-dir*(thA*thA)/r;
  float x=thA/r;
  float mu=min(1./max(abs(1.-x*x*x*x),.34),2.6);

  // Far sky is at infinity: travel does not translate it, but the
  // approach FOV tightens and it streams radially (zoom blur) — the
  // universe falling away behind the camera.
  float zoom=1.+.9*uU*uU;
  vec2 qBase=(uHole+beta)/zoom+uCamOff*.08;
  vec3 sky=vec3(0.);
  float streak=clamp(uVel*.04,0.,.42);
  if(streak>.001){
    // Jittered taps: continuous streaks, no discrete ghost copies.
    float j=hash12(gl_FragCoord.xy+fract(uTime*7.)*91.);
    for(int i=0;i<12;i++){
      float k=(float(i)+j)/12.;
      sky+=skyAt(qBase*(1.-streak*k));
    }
    sky/=12.;
  } else {
    sky=skyAt(qBase);
  }
  sky*=mix(1.,mu,.7);
  // Space inside the photon region is swallowed by aperture light.
  sky*=smoothstep(thE*.55,thE*1.05,r);
  // Sky dims as the camera commits to the traversal.
  sky*=1.-.55*smoothstep(.55,1.,uU);

  vec3 near=texture(uNear,gl_FragCoord.xy/uRes).rgb;

  // ── White hole light ──
  // Core growth is capped: the aperture must never simply scale up to
  // cover the frame. White arrives as overexposure while the camera is
  // inside the light, not as a disc filling the screen.
  float R=(.0045+.004*uAppear)*min(uAperture,11.);
  float Rb=(.0045+.004*uAppear)*pow(uAperture,.62);
  float breathe=1.+.03*sin(uTime*1.7);
  // Energy stretching: anisotropic falloff that rotates slowly and
  // elongates as the pull strengthens.
  vec2 st=rot(.45+uTime*.04+uU*.9)*rel;
  st.x*=mix(1.,.68,smoothstep(0.,.85,uU));
  float rs=length(st);
  float beam=1.+.38*cos(ang-2.25+.5*uU);   // asymmetric brightness
  float coreL=exp(-pow(rs/(R*breathe),1.25)*1.4);
  float bloom=.4*exp(-rs/(Rb*2.))+.07*exp(-rs/(Rb*6.5))+.005*exp(-rs/(Rb*22.));
  // Partial photon arcs near the Einstein radius, noise-gated in angle.
  float ringW=thA*.028+px*.9;
  float ring=exp(-pow((r-thA*1.01)/ringW,2.));
  float arcGate=smoothstep(.5,.9,vnoise(vec2(ang*1.35+7.,uTime*.12)))*(.45+.55*max(cos(ang-2.25),0.));
  vec3 hole=vec3(1.)*coreL*3.2+vec3(.95,.97,1.)*bloom*beam*2.2+vec3(1.,.97,.92)*ring*arcGate*.32*(1.-smoothstep(.15,.6,uU));
  hole*=uAppear;

  vec3 c=(sky+near)*uUniverse+hole;
  c*=uExposure;
  // Toe: crush the noise floor so space reads black, not grey.
  c=c*c/(c+.018);

  // Filmic shoulder
  vec3 m=1.-exp(-c);
  // Vignette (lifts away during flash)
  float v=1.-.32*pow(length(p0*vec2(.85,1.08)),2.2);
  m*=mix(v,1.,uWhite);
  m=pow(m,vec3(1./2.2));
  // Flash to canvas white — display-space #fbfbfa, identical to the DOM
  // canvas beneath, so the handoff has no visible seam.
  m=mix(m,vec3(.9843,.9843,.9804),uWhite);
  // Grain / dither
  float g=hash12(gl_FragCoord.xy+fract(uTime*37.)*113.)-.5;
  m+=g*(.014*(1.-uWhite));
  outColor=vec4(m,1.);
}
`;
