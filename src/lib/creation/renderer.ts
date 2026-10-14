// ─────────────────────────────────────────────────────────────
// Creation particle renderer — raw WebGL2, no dependencies.
//
// One program, three target sets per particle (source glyph →
// structure → form). Every stage is a pure function of two progress
// uniforms, so the visitor watches one continuous scene state evolve:
// no cuts, no pre-rendered substitution.
// Marketing-site-local; not Studio architecture.
// ─────────────────────────────────────────────────────────────

import type { Build } from "./families/types.ts";

const VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec3 aSrc;
layout(location=1) in vec3 aStruct;
layout(location=2) in vec3 aForm;
layout(location=3) in vec3 aNormal;
layout(location=4) in vec4 aColor;   // rgb, kind
layout(location=5) in vec4 aSeed;    // rand, delayA, delayB, size
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uDpr;
uniform float uA;
uniform float uB;
uniform float uVisible;
uniform mat3 uRot;
uniform float uSpin;
uniform float uPersp;
uniform float uEmissive;
uniform float uGain;
uniform float uFormSize;
uniform float uOcc;
uniform float uFade;
uniform float uSwirl;
uniform vec3 uInk;
uniform vec3 uInkLight;
uniform float uWipe;      // ground laid down to this y (px, artboard space)
uniform float uDarkGround;
out vec4 vCol;

void main(){
  float kind=aColor.a;
  bool star=kind>2.5&&kind<3.5;
  bool cyl=kind>3.5;
  float a=smoothstep(0.,1.,clamp(uA*1.55-aSeed.y*.55,0.,1.));
  float b=smoothstep(0.,1.,clamp(uB*1.5-aSeed.z*.5,0.,1.));

  vec3 f=aForm;
  if(cyl){float th=aForm.x+uSpin;f=vec3(sin(th)*aForm.z,aForm.y,cos(th)*aForm.z);}
  vec3 s=uRot*aStruct;
  if(!star) f=uRot*f;

  // Curved flight paths: particles travel, they do not teleport.
  vec3 swA=vec3(sin(aSeed.x*31.+1.),cos(aSeed.x*17.),sin(aSeed.x*7.))*(4.*a*(1.-a))*26.;
  vec3 swB=vec3(cos(aSeed.x*23.),sin(aSeed.x*29.+2.),cos(aSeed.x*11.))*(4.*b*(1.-b))*uSwirl;
  vec3 p=mix(aSrc,s,a)+swA;
  p=mix(p,f,b)+swB;

  float sc=uPersp/max(uPersp-p.z,1.);
  vec2 px=uCenter+p.xy*sc;
  vec2 clip=px/uRes*2.-1.;
  gl_Position=vec4(clip.x,-clip.y,0.,1.);

  // ── Material & light arrive with the form ──
  vec3 L=normalize(vec3(-.55,-.45,.7));
  float lit=1.;
  float vis=uVisible*uFade;
  if(kind>.5&&kind<1.5){
    vec3 n=normalize(uRot*aNormal);
    lit=.05+.95*max(dot(n,L),0.)+pow(max(reflect(-L,n).z,0.),28.)*.4;
    vis*=mix(1.,smoothstep(-.08,.22,n.z),b);           // back faces fall away
  } else if(kind>1.5&&kind<2.5){
    vec3 n=normalize(uRot*aNormal);
    lit=.3+.7*abs(dot(n,L));
    float d=length(f-L*dot(f,L));
    if(dot(f,L)<0.&&d<uOcc) lit*=.12;                  // planet shadow on rings
    if(f.z<0.&&length(f.xy)<uOcc*.985) vis*=1.-b;      // rings pass behind planet
  } else if(cyl){
    // Facing-weighted: foreshortened edges pile up particles, so dim them.
    float facing=clamp(f.z/aForm.z,0.,1.);
    lit=pow(facing,1.4);
    vis*=smoothstep(-.02,.12,facing);
  }
  vec3 formCol=star?aColor.rgb:aColor.rgb*lit;
  // Ink flips light where the dark ground has already been laid down.
  float onGround=uDarkGround*smoothstep(uWipe+6.,uWipe-6.,p.y);
  vec3 col=mix(mix(uInk,uInkLight,onGround),formCol,b);

  float over=1.-b*uEmissive;
  float al=.85*over*vis;
  float g=star?.9:uGain;
  vCol=vec4(col*(al+(1.-over)*g*vis),al);

  float size=mix(mix(1.5,1.15,a),uFormSize*(.7+.6*aSeed.w),b);
  if(star) size=mix(1.1,.8+aColor.r*.9,b);
  gl_PointSize=size*uDpr;
}
`;

const FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vCol;
out vec4 outColor;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  float m=smoothstep(1.,.35,d);
  outColor=vCol*m;
}
`;

export interface CreationUniforms {
  a: number;
  b: number;
  visible: number;
  fade: number;
  rotX: number;
  rotY: number;
  spin: number;
  /** Ground wipe position (px, artboard space, y down). */
  wipe: number;
  darkGround: boolean;
}

export interface CreationRenderer {
  load(src: Float32Array, build: Build): void;
  render(u: CreationUniforms): void;
  resize(): void;
  dispose(): void;
  readonly n: number;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "compile");
  return s;
}

export function createCreationRenderer(
  canvas: HTMLCanvasElement,
  n: number,
  opts: { dprCap: number; center: () => { x: number; y: number }; onLost?: () => void }
): CreationRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    const v = compile(gl, gl.VERTEX_SHADER, VS);
    const f = compile(gl, gl.FRAGMENT_SHADER, FS);
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  } catch (err) {
    console.warn("[creation] WebGL program unavailable", err);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }

  const U = (name: string) => gl.getUniformLocation(prog, name);
  const loc = {
    res: U("uRes"), center: U("uCenter"), dpr: U("uDpr"), a: U("uA"), b: U("uB"),
    visible: U("uVisible"), rot: U("uRot"), spin: U("uSpin"), persp: U("uPersp"),
    emissive: U("uEmissive"), gain: U("uGain"), formSize: U("uFormSize"), occ: U("uOcc"),
    fade: U("uFade"), ink: U("uInk"), swirl: U("uSwirl"),
    inkLight: U("uInkLight"), wipe: U("uWipe"), dark: U("uDarkGround"),
  };

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const sizes = [3, 3, 3, 3, 4, 4];
  const bufs = sizes.map((sz, i) => {
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, n * sz * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, sz, gl.FLOAT, false, 0, 0);
    return buf;
  });
  gl.bindVertexArray(null);

  let build: Build | null = null;
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, opts.dprCap);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  };
  resize();

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    opts.onLost?.();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  function load(src: Float32Array, b: Build) {
    build = b;
    // Per-particle seeds: dissipation order follows the glyphs left→right.
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = src[i * 3]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    const span = Math.max(1, maxX - minX);
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      seeds[i * 4] = r;
      seeds[i * 4 + 1] = ((src[i * 3]! - minX) / span) * 0.85 + Math.random() * 0.15;
      seeds[i * 4 + 2] = b.order ? b.order[i]! : Math.random();
      seeds[i * 4 + 3] = Math.random();
    }
    const arrays = [src, b.struct, b.form, b.normal, b.color, seeds];
    arrays.forEach((arr, i) => {
      gl!.bindBuffer(gl!.ARRAY_BUFFER, bufs[i]!);
      gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, arr);
    });
  }

  function render(u: CreationUniforms) {
    if (lost || !build) return;
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.useProgram(prog);
    const c = opts.center();
    gl!.uniform2f(loc.res, W, H);
    gl!.uniform2f(loc.center, c.x, c.y);
    gl!.uniform1f(loc.dpr, dpr);
    gl!.uniform1f(loc.a, u.a);
    gl!.uniform1f(loc.b, u.b);
    gl!.uniform1f(loc.visible, u.visible);
    gl!.uniform1f(loc.fade, u.fade);
    const cx = Math.cos(u.rotX), sx = Math.sin(u.rotX), cy = Math.cos(u.rotY), sy = Math.sin(u.rotY);
    // Rx * Ry, column-major
    gl!.uniformMatrix3fv(loc.rot, false, [cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy]);
    gl!.uniform1f(loc.spin, u.spin);
    gl!.uniform1f(loc.persp, Math.max(W, H) * 1.6);
    gl!.uniform1f(loc.emissive, build.emissive);
    gl!.uniform1f(loc.gain, build.gain);
    gl!.uniform1f(loc.formSize, build.pointSize);
    gl!.uniform1f(loc.occ, build.occlusion);
    gl!.uniform1f(loc.swirl, build.swirl);
    gl!.uniform3f(loc.ink, 0.07, 0.07, 0.078);
    gl!.uniform3f(loc.inkLight, 0.84, 0.84, 0.87);
    gl!.uniform1f(loc.wipe, u.wipe);
    gl!.uniform1f(loc.dark, u.darkGround ? 1 : 0);
    gl!.bindVertexArray(vao);
    gl!.drawArrays(gl!.POINTS, 0, n);
    gl!.bindVertexArray(null);
  }

  function dispose() {
    canvas.removeEventListener("webglcontextlost", onLost);
    if (!lost) {
      bufs.forEach((b) => gl!.deleteBuffer(b));
      gl!.deleteVertexArray(vao);
      gl!.deleteProgram(prog);
    }
    gl!.getExtension("WEBGL_lose_context")?.loseContext();
  }

  return { load, render, resize, dispose, n };
}
