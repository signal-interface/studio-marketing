// ─────────────────────────────────────────────────────────────
// Entrance universe renderer — raw WebGL2, no dependencies.
// Marketing-site-local; not Studio architecture.
//
// Why raw WebGL2 rather than Three.js / R3F: the entrance is two
// full-screen shader passes and one instanced quad batch. A scene
// graph adds ~150 KB for no capability we use here.
// ─────────────────────────────────────────────────────────────

import { COMP_FS, FULLSCREEN_VS, NEAR_FS, NEAR_VS, SKY_FS } from "./shaders";
import type { EntranceFrame } from "../timeline";
import { T } from "../timeline";

export type Tier = "high" | "low";

interface TierConfig {
  dprCap: number;
  scale: number;
  octaves: number;
  nearCount: number;
  overscan: number;
}

const TIERS: Record<Tier, TierConfig> = {
  high: { dprCap: 2, scale: 1, octaves: 6, nearCount: 1400, overscan: 1.3 },
  low: { dprCap: 1.5, scale: 0.8, octaves: 4, nearCount: 640, overscan: 1.25 },
};

export function detectTier(): Tier {
  if (typeof window === "undefined") return "low";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const small = Math.min(window.screen.width, window.screen.height) < 820;
  const cores = navigator.hardwareConcurrency ?? 4;
  return coarse || small || cores <= 4 ? "low" : "high";
}

export interface UniverseRenderer {
  readonly tier: Tier;
  render(f: EntranceFrame, pointer: { x: number; y: number }): void;
  dispose(): void;
}

const NEAR_DEPTH = 1.0;
const NEAR_FOCAL = 0.62;
const IDLE_DRIFT = 0.012; // world units / s
const PULL_TRAVEL = 5.5; // world units over the pull
const SHUTTER = 1 / 30; // s — streak length

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`shader compile: ${log}`);
  }
  return s;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`program link: ${gl.getProgramInfoLog(p)}`);
  }
  const loc = new Map<string, WebGLUniformLocation | null>();
  return {
    p,
    u(name: string) {
      if (!loc.has(name)) loc.set(name, gl.getUniformLocation(p, name));
      return loc.get(name)!;
    },
  };
}

type Program = ReturnType<typeof program>;

/** Deterministic PRNG so the composed sky is identical on every visit. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createUniverse(
  canvas: HTMLCanvasElement,
  opts: { tier?: Tier; onLost?: () => void } = {}
): UniverseRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const tier = opts.tier ?? detectTier();
  const cfg = { ...TIERS[tier] };
  const floatTargets = !!gl.getExtension("EXT_color_buffer_float");
  const targetFormat = floatTargets ? gl.RGBA16F : gl.RGBA8;
  const targetType = floatTargets ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

  let sky: Program, near: Program, comp: Program;
  try {
    sky = program(gl, FULLSCREEN_VS, SKY_FS(cfg.octaves));
    near = program(gl, NEAR_VS, NEAR_FS);
    comp = program(gl, FULLSCREEN_VS, COMP_FS);
  } catch (err) {
    console.warn("[entrance] WebGL program unavailable, using fallback", err);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }

  // Full-screen triangle
  const quadVao = gl.createVertexArray()!;
  const quadBuf = gl.createBuffer()!;
  gl.bindVertexArray(quadVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Near-star instances
  const rnd = mulberry32(0x5f3759df);
  const stars = new Float32Array(cfg.nearCount * 4);
  for (let i = 0; i < cfg.nearCount; i++) {
    // Slightly clustered: pairs/triples share a nearby anchor.
    const clustered = rnd() < 0.3 && i > 0;
    const ax = clustered ? stars[(i - 1) * 4]! : (rnd() * 2 - 1) * 1.7;
    const ay = clustered ? stars[(i - 1) * 4 + 1]! : (rnd() * 2 - 1) * 1.7;
    stars[i * 4] = ax + (clustered ? (rnd() - 0.5) * 0.12 : 0);
    stars[i * 4 + 1] = ay + (clustered ? (rnd() - 0.5) * 0.12 : 0);
    stars[i * 4 + 2] = rnd() * NEAR_DEPTH;
    stars[i * 4 + 3] = rnd();
  }
  const nearVao = gl.createVertexArray()!;
  gl.bindVertexArray(nearVao);
  const cornerBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const starBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
  gl.bufferData(gl.ARRAY_BUFFER, stars, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.bindVertexArray(null);

  function makeTarget(w: number, h: number, format: number, type: number) {
    const tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, format, w, h, 0, gl!.RGBA, type, null);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.MIRRORED_REPEAT);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.MIRRORED_REPEAT);
    const fb = gl!.createFramebuffer()!;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }
  type Target = ReturnType<typeof makeTarget>;
  let skyT: Target | null = null;
  let nearT: Target | null = null;
  let W = 0;
  let H = 0;

  function freeTarget(t: Target | null) {
    if (!t) return;
    gl!.deleteTexture(t.tex);
    gl!.deleteFramebuffer(t.fb);
  }

  function size() {
    // Never render below one device pixel per CSS pixel: upscaled
    // pixel-scale stars turn into soft blobs.
    const native = window.devicePixelRatio || 1;
    const dpr = Math.max(Math.min(native, 1), Math.min(native, cfg.dprCap) * cfg.scale);
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    return { cw, ch };
  }

  function bakeSky() {
    freeTarget(skyT);
    const sw = Math.round(W * cfg.overscan);
    const sh = Math.round(H * cfg.overscan);
    // Sky is baked 8-bit sqrt-encoded: keeps memory low and is filterable everywhere.
    skyT = makeTarget(sw, sh, gl!.RGBA8, gl!.UNSIGNED_BYTE);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, skyT.fb);
    gl!.viewport(0, 0, sw, sh);
    gl!.useProgram(sky.p);
    gl!.uniform2f(sky.u("uRes"), sw, sh);
    gl!.uniform1f(sky.u("uSeed"), 3.17);
    gl!.bindVertexArray(quadVao);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
  }

  function resizeTargets(rebake: boolean) {
    const { cw, ch } = size();
    if (cw === W && ch === H && skyT) return;
    W = cw;
    H = ch;
    canvas.width = W;
    canvas.height = H;
    freeTarget(nearT);
    nearT = makeTarget(W, H, targetFormat, targetType);
    if (rebake || !skyT) bakeSky();
  }

  resizeTargets(true);

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resizeTargets(true), 120);
  });
  ro.observe(canvas);

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    opts.onLost?.();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // Adaptive resolution: if sustained frame time is poor, drop render
  // scale once or twice rather than dropping frames through the swoosh.
  let frameSamples = 0;
  let frameAccum = 0;
  let lastNow = 0;
  function adapt(now: number) {
    if (lastNow) {
      frameAccum += now - lastNow;
      frameSamples++;
      if (frameSamples >= 24) {
        const avg = frameAccum / frameSamples;
        if (avg > 24 && cfg.scale > 0.55) {
          cfg.scale *= 0.75;
          resizeTargets(false);
        }
        frameSamples = 0;
        frameAccum = 0;
      }
    }
    lastNow = now;
  }

  const camOff = { x: 0, y: 0 };

  function render(f: EntranceFrame, pointer: { x: number; y: number }) {
    if (lost || !skyT || !nearT) return;
    adapt(performance.now());
    const ts = f.t / 1000;
    const pullSec = T.pullDur / 1000;

    // Pointer parallax eases in; fades out as the pull takes control.
    const follow = 1 - f.u;
    camOff.x += (pointer.x * 0.035 * follow - camOff.x) * 0.05;
    camOff.y += (pointer.y * 0.025 * follow - camOff.y) * 0.05;

    const camZ = IDLE_DRIFT * ts + PULL_TRAVEL * f.travel;
    const vel = (IDLE_DRIFT + (PULL_TRAVEL * f.velocity) / pullSec) * SHUTTER;
    // Hole starts slightly low and off-axis; camera steers onto it.
    const steer = f.u * f.u;
    const holeX = 0.018 * (1 - steer);
    const holeY = -0.035 * (1 - steer);

    // Near stars → float target, additive
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, nearT.fb);
    gl!.viewport(0, 0, W, H);
    gl!.clearColor(0, 0, 0, 1);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.ONE, gl!.ONE);
    gl!.useProgram(near.p);
    gl!.uniform2f(near.u("uRes"), W, H);
    gl!.uniform1f(near.u("uCamZ"), camZ);
    gl!.uniform1f(near.u("uVel"), vel);
    gl!.uniform2f(near.u("uCamOff"), camOff.x, camOff.y);
    gl!.uniform1f(near.u("uRoll"), f.roll);
    gl!.uniform1f(near.u("uFocal"), NEAR_FOCAL);
    gl!.uniform1f(near.u("uDepth"), NEAR_DEPTH);
    gl!.bindVertexArray(nearVao);
    gl!.drawArraysInstanced(gl!.TRIANGLE_STRIP, 0, 4, cfg.nearCount);
    gl!.disable(gl!.BLEND);

    // Composite → screen
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, W, H);
    gl!.useProgram(comp.p);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, skyT.tex);
    gl!.uniform1i(comp.u("uSky"), 0);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, nearT.tex);
    gl!.uniform1i(comp.u("uNear"), 1);
    const aspect = W / H;
    gl!.uniform2f(comp.u("uRes"), W, H);
    gl!.uniform2f(comp.u("uSkyExt"), 0.5 * cfg.overscan * aspect, 0.5 * cfg.overscan);
    gl!.uniform1f(comp.u("uTime"), ts);
    gl!.uniform2f(comp.u("uHole"), holeX, holeY);
    gl!.uniform1f(comp.u("uAppear"), f.appear);
    gl!.uniform1f(comp.u("uAperture"), f.aperture);
    gl!.uniform1f(comp.u("uU"), f.u);
    gl!.uniform1f(comp.u("uVel"), f.velocity);
    gl!.uniform1f(comp.u("uExposure"), f.exposure);
    gl!.uniform1f(comp.u("uWhite"), f.white);
    gl!.uniform1f(comp.u("uUniverse"), f.universe);
    gl!.uniform1f(comp.u("uRoll"), f.roll);
    gl!.uniform2f(comp.u("uCamOff"), camOff.x, camOff.y);
    gl!.bindVertexArray(quadVao);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    gl!.bindVertexArray(null);
  }

  function dispose() {
    ro.disconnect();
    clearTimeout(resizeTimer);
    canvas.removeEventListener("webglcontextlost", onLost);
    if (!lost) {
      freeTarget(skyT);
      freeTarget(nearT);
      gl!.deleteBuffer(quadBuf);
      gl!.deleteBuffer(cornerBuf);
      gl!.deleteBuffer(starBuf);
      gl!.deleteVertexArray(quadVao);
      gl!.deleteVertexArray(nearVao);
      gl!.deleteProgram(sky.p);
      gl!.deleteProgram(near.p);
      gl!.deleteProgram(comp.p);
    }
    gl!.getExtension("WEBGL_lose_context")?.loseContext();
  }

  return { tier, render, dispose };
}
