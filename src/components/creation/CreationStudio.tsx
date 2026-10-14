"use client";

// ─────────────────────────────────────────────────────────────
// Public creation demonstration.
//
// INTENT → INTERPRETATION → STRUCTURE → MATERIALIZATION → ASSET,
// driven by one clock. Everything happens in the visitor's browser:
// deterministic interpretation, live-drawn compositions, GPU particles.
// No network, no model, no storage, nothing placed in the URL.
//
// Truth boundary: this is a demonstration of the Studio idea. It is
// labelled as such and never claims Studio produced the result.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { interpret, MAX_INTENT } from "@/lib/creation/interpret";
import { FAMILY_LABEL, type ExperienceSpec, type Family } from "@/lib/creation/spec";
import { C, C_REDUCED, STAGES, creationAt, type Stage } from "@/lib/creation/timeline";
import { mulberry32 } from "@/lib/creation/sample";
import { detectTier } from "@/lib/experience/universe/renderer";
import { BRIDGE, CREATION, DRAW, EXPAND } from "@/content/experience";
import type { SketchResult } from "./SketchPad";
import type { SourceArtifact } from "./Expansion";
import { renderStrokes } from "@/lib/creation/strokes";

// Interaction-only UI is code-split and loaded on intent (hover/focus,
// creation complete). Rendered directly once loaded — not via Suspense,
// whose reveal throttle would delay the visual response by ~300ms.
type SketchPadT = typeof import("./SketchPad").default;
type ExpansionT = typeof import("./Expansion").default;
let sketchPadMod: Promise<SketchPadT> | null = null;
let expansionMod: Promise<ExpansionT> | null = null;
const loadSketchPad = () => (sketchPadMod ??= import("./SketchPad").then((m) => m.default));
const loadExpansion = () => (expansionMod ??= import("./Expansion").then((m) => m.default));
import type { PlateKind } from "@/lib/creation/plates";
import { CREATED_EVENT } from "@/lib/creation/events";
import type { Build } from "@/lib/creation/families/types";
import type { CreationUniforms } from "@/lib/creation/renderer";

type Engine = typeof import("@/lib/creation/engine");
type Phase = "idle" | "creating";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function artboardSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 760) {
    const w = Math.min(vw - 32, 560);
    return { w, h: Math.round(Math.min(w * 1.02, vh * 0.52)) };
  }
  const w = Math.round(Math.min(800, vw * (vw >= 1180 ? 0.56 : 0.8)));
  return { w, h: Math.round(Math.min(w * 0.62, vh * 0.6)) };
}

function intentFontSize(text: string, w: number) {
  return Math.round(Math.max(22, Math.min(64, (w * 0.86) / Math.max(4, text.length * 0.52))));
}

const FAMILY_TO_PLATE: Record<Family, PlateKind> = {
  brand: "design",
  image: "image",
  abstract: "image",
  motion: "motion",
  spatial: "spatial",
  interface: "interface",
};

/** Fit a sketch's ink (cropped to its strokes) into the artboard. */
function fitSketch(sk: SketchResult, aw: number, ah: number) {
  const pts = sk.strokes.flat();
  const x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x));
  const y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));
  const pad = 12;
  const bw = Math.max(1, x1 - x0) + pad * 2, bh = Math.max(1, y1 - y0) + pad * 2;
  const scale = Math.min((aw * 0.72) / bw, (ah * 0.66) / bh, 2.2);
  return {
    strokes: sk.strokes.map((s) => s.map((p) => ({ x: p.x - x0 + pad, y: p.y - y0 + pad }))),
    w: bw * scale,
    h: bh * scale,
    scale,
  };
}

export default function CreationStudio({ children, cta }: { children: ReactNode; cta: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [value, setValue] = useState("");
  const [spec, setSpec] = useState<ExperienceSpec | null>(null);
  const [stage, setStage] = useState<Stage>("Intent");
  const [rows, setRows] = useState(0);
  const [done, setDone] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [announce, setAnnounce] = useState("");
  const [description, setDescription] = useState("");
  const [hint, setHint] = useState<string | undefined>();
  const [mode, setMode] = useState<"type" | "draw">("type");
  const [sketch, setSketch] = useState<SketchResult | null>(null);
  const [expanded, setExpanded] = useState<SourceArtifact | null | false>(false);
  const [SketchPad, setSketchPad] = useState<SketchPadT | null>(null);
  const [Expansion, setExpansion] = useState<ExpansionT | null>(null);
  const prefetchSketch = () => {
    void loadSketchPad().then((C) => setSketchPad(() => C));
  };
  const openDraw = async () => {
    const C = await loadSketchPad();
    setSketchPad(() => C);
    setMode("draw");
  };
  const sketchStageRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<(() => SourceArtifact | null) | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  // Separate surface for the CPU fallback: a canvas that held a WebGL
  // context (even a failed or lost one) cannot provide a 2D context.
  const cpuRef = useRef<HTMLCanvasElement>(null);
  const hiResHost = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const underlayRef = useRef<HTMLDivElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const runRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => setMounted(true), []);

  // Dev-only evidence hook: ?create=<words>&create-t=<ms>. Compiled out of
  // production builds, so public intent is never read from or put in a URL.
  const scrubRef = useRef<number | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const q = new URLSearchParams(window.location.search);
    const words = q.get("create");
    const ts = q.get("create-t");
    if (ts !== null) scrubRef.current = Number(ts);
    if (words) start(words);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    runRef.current?.stop();
    runRef.current = null;
    setPhase("idle");
    setSpec(null);
    setDone(false);
    setRows(0);
    setStage("Intent");
    setAnnounce("");
    setValue("");
    setSketch(null);
    setExpanded(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const start = useCallback((raw: string) => {
    const s = interpret(raw);
    if (!s.intent) return;
    runRef.current?.stop();
    setSpec(s);
    setSize(artboardSize());
    setRows(0);
    setDone(false);
    setStage("Intent");
    setSketch(null);
    setExpanded(false);
    setPhase("creating");
    setAnnounce(`Creating: ${s.intent}`);
  }, []);

  // DRAW → INTERPRET → STRUCTURE → MATERIALIZE: the strokes themselves
  // become the particle source; their geometry chooses the form.
  const startDrawing = useCallback(async (r: SketchResult) => {
    const { readSketch } = await import("@/lib/creation/sketch");
    const reading = readSketch(r.strokes);
    const base = interpret(reading.descriptor, reading.family);
    const s = { ...base, source: "drawing" as const, reading: reading.features, recognised: [] };
    runRef.current?.stop();
    setSketch(r);
    setSpec(s);
    setSize(artboardSize());
    setRows(0);
    setDone(false);
    setStage("Intent");
    setExpanded(false);
    setPhase("creating");
    setAnnounce(`Creating from your drawing: ${reading.label.toLowerCase()}`);
  }, []);

  // ── Run a creation once the stage DOM exists ──
  useEffect(() => {
    if (phase !== "creating" || !spec) return;
    let cancelled = false;
    let raf = 0;
    let engine: Engine | null = null;
    let renderer: ReturnType<Engine["createCreationRenderer"]> = null;
    let build: Build | null = null;
    let hiRes: HTMLCanvasElement | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drag = { x: 0, y: 0, active: false, lx: 0, ly: 0, moved: 0 };
    let idleSpin = 0;
    let visible = true;
    let lastStage: Stage = "Intent";
    let lastRows = 0;
    let finished = false;
    let darkGround = false;
    let lastU: CreationUniforms | null = null;

    const art = artRef.current!;
    const particles = particlesRef.current!;
    const cpuCanvas = cpuRef.current!;
    const intentEl = intentRef.current!;
    const frameEl = frameRef.current!;
    const groundEl = groundRef.current!;
    const host = hiResHost.current;
    const underlayEl = underlayRef.current!;

    const setupAndRun = async () => {
      // User Timing marks: visible in DevTools and used for profiling.
      performance.mark("creation:setup:start");
      engine = await import("@/lib/creation/engine");
      await document.fonts?.ready;
      performance.mark("creation:build:start");
      if (cancelled) return;
      const tier = detectTier();
      const n = tier === "high" ? 36000 : 14000;
      const cs = getComputedStyle(document.body);
      const rootCs = getComputedStyle(document.documentElement);
      const fonts = {
        sans: cs.fontFamily,
        mono: rootCs.getPropertyValue("--font-mono").trim() || "ui-monospace, monospace",
        serif: 'Georgia, "Times New Roman", serif',
      };
      const { w, h } = size;
      build = engine.buildFor({ spec, w, h, dpr: Math.min(window.devicePixelRatio || 1, 2), n, fonts, rnd: mulberry32(spec.seed) });
      performance.measure("creation:build", "creation:build:start");
      if (cancelled) return;
      setDescription(build.description);
      setHint(build.hint);
      groundEl.style.background = build.ground;
      if (build.underlay) {
        underlayEl.style.background = build.underlay.background;
        underlayEl.style.width = underlayEl.style.height = `${build.underlay.radius * 2}px`;
      }
      const g = build.ground.replace("#", "");
      const lum = (parseInt(g.slice(0, 2), 16) * 0.3 + parseInt(g.slice(2, 4), 16) * 0.59 + parseInt(g.slice(4, 6), 16) * 0.11) / 255;
      darkGround = lum < 0.4;

      if (build.hiRes) {
        hiRes = build.hiRes;
        hiRes.className = "artboard-hires";
        hiRes.setAttribute("aria-hidden", "true");
        host?.replaceChildren(hiRes);
      }

      // Source particles: the visitor's own words — or strokes — exactly where they sit.
      const ir = intentEl.getBoundingClientRect();
      const ar = art.getBoundingClientRect();
      const ics = getComputedStyle(intentEl);
      const sketchCanvas = sketchStageRef.current;
      const src = spec.source === "drawing" && sketchCanvas
        ? engine.sampleAt(
            sketchCanvas,
            {
              x: ir.left + ir.width / 2 - (ar.left + ar.width / 2),
              y: ir.top + ir.height / 2 - (ar.top + ar.height / 2),
              w: sketchCanvas.clientWidth,
              h: sketchCanvas.clientHeight,
            },
            n,
            mulberry32(spec.seed ^ 0xabc)
          )
        : engine.sampleGlyphs(
        spec.intent,
        `${ics.fontWeight} ${ics.fontSize} ${ics.fontFamily}`,
        {
          x: ir.left + ir.width / 2 - (ar.left + ar.width / 2),
          y: ir.top + ir.height / 2 - (ar.top + ar.height / 2),
          w: Math.ceil(ir.width) + 8,
          h: Math.ceil(ir.height) + 8,
        },
        ics.letterSpacing === "normal" ? "0px" : ics.letterSpacing,
        n,
        mulberry32(spec.seed ^ 0xabc)
      );

      performance.measure("creation:setup", "creation:setup:start");
      renderer = engine.createCreationRenderer(particles, n, {
        dprCap: tier === "high" ? 2 : 1.5,
        center: () => ({ x: particles.clientWidth / 2, y: particles.clientHeight / 2 }),
        onLost: () => {
          renderer = null;
          particles.style.visibility = "hidden";
        },
      });
      // A failed or lost WebGL surface can composite as an opaque block:
      // never show it unless the renderer is live.
      particles.style.visibility = renderer ? "visible" : "hidden";
      renderer?.load(src, build);
      run();
    };

    const run = () => {
      let t = 0;
      let last = performance.now();
      const end = reduced ? C_REDUCED.end : C.end;
      const loop = (now: number) => {
        // Real time even on slow devices (coarser frames, not slow motion);
        // only gaps over 250ms — a hidden tab — are clamped.
        const dt = Math.min(now - last, 250);
        last = now;
        t = scrubRef.current ?? t + dt;
        const b = build!;

        // Stage + interpretation rows (React state only on change)
        let st: Stage;
        let rowCount: number;
        if (reduced) {
          const idx = Math.min(4, Math.floor(t / C_REDUCED.step));
          st = STAGES[idx]!;
          rowCount = idx >= 1 ? 5 : 0;
        } else {
          st = creationAt(t).stage;
          rowCount = Math.max(0, Math.min(5, Math.floor((t - C.interpretation) / C.rowStep) + 1));
        }
        if (st !== lastStage) {
          lastStage = st;
          setStage(st);
        }
        if (rowCount !== lastRows) {
          lastRows = rowCount;
          setRows(rowCount);
        }

        const f = reduced
          ? { a: 1, b: 1, frame: 1, ground: clamp01((t - C_REDUCED.step * 2) / 300), resolve: t >= C_REDUCED.step * 4 ? 1 : 0 }
          : creationAt(t);

        intentEl.style.opacity = reduced ? String(1 - clamp01((t - C_REDUCED.step * 2) / 200)) : t < C.structure ? "1" : "0";
        const interp = !reduced && t >= C.interpretation && t < C.structure;
        intentEl.dataset.reading = interp ? "true" : "false";
        frameEl.style.opacity = String(f.frame * (1 - f.ground));
        // The ground is laid down top→bottom in step with the
        // materialization sweep (no half-opacity grey mid-state).
        const wipeFrac = f.ground;
        groundEl.style.opacity = wipeFrac > 0 ? "1" : "0";
        groundEl.style.clipPath = `inset(0 0 ${((1 - wipeFrac) * 100).toFixed(2)}% 0 round 14px)`;
        const wipeY = -size.h / 2 + wipeFrac * size.h;
        underlayEl.style.opacity = String(b.underlay ? Math.pow(Math.max(0, (f.b - 0.5) / 0.5), 1.5) * 0.96 : 0);
        if (hiRes) hiRes.style.opacity = String(f.resolve);

        const asset = t >= (reduced ? C_REDUCED.step * 4 : C.asset);
        if (asset && !drag.active && b.interaction === "rotate") idleSpin += dt * 0.00012;
        const spin = b.spin ? (performance.now() / 1000) * b.spin + drag.x * 2 : 0;

        if (renderer) {
          const fadeAfter = C.resolveIn + C.resolveDur;
          const fade = b.hiRes ? (reduced ? 0 : 1 - clamp01((t - fadeAfter) / 300)) : 1;
          const showParticles = reduced ? !b.hiRes : t >= C.structure;
          lastU = {
            a: f.a,
            b: f.b,
            visible: showParticles ? 1 : 0,
            fade,
            rotX: b.tilt[0] + drag.y,
            rotY: b.tilt[1] + (b.spin ? 0 : drag.x + idleSpin),
            spin,
            wipe: wipeY,
            darkGround,
          };
          renderer.render(lastU);
        } else if (engine && asset && !b.hiRes && !finished) {
          engine.drawFormCpu(cpuCanvas, b, b.tilt[0], b.tilt[1]);
        }

        if (t >= end && !finished) {
          finished = true;
          setDone(true);
          setAnnounce(`${FAMILY_LABEL[spec.family]} ready. ${b.description}.`);
          window.dispatchEvent(new CustomEvent(CREATED_EVENT, { detail: { intent: spec.intent } }));
        }
        // 2D assets are static once resolved: stop spending frames.
        const keepAlive = b.interaction === "rotate" && renderer && visible;
        if (!finished || keepAlive) raf = requestAnimationFrame(loop);
        else raf = 0;
      };
      raf = requestAnimationFrame((now) => {
        last = now;
        loop(now);
      });
      restart = () => {
        if (!raf && !cancelled) {
          last = performance.now();
          raf = requestAnimationFrame(loop);
        }
      };
    };
    let restart = () => {};

    // Interaction: drag / arrow keys rotate (or scrub the loop).
    const onDown = (e: PointerEvent) => {
      if (!build || build.interaction !== "rotate" || !finished) return;
      drag.active = true;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      art.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.active) return;
      drag.x += (e.clientX - drag.lx) * 0.008;
      drag.y = Math.max(-0.9, Math.min(0.9, drag.y + (e.clientY - drag.ly) * 0.006));
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      if (!renderer && engine && build) engine.drawFormCpu(cpuCanvas, build, build.tilt[0] + drag.y, build.tilt[1] + drag.x);
    };
    const onUp = () => {
      drag.active = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!build || build.interaction !== "rotate" || !finished) return;
      const step = 0.12;
      if (e.key === "ArrowLeft") drag.x -= step;
      else if (e.key === "ArrowRight") drag.x += step;
      else if (e.key === "ArrowUp") drag.y = Math.max(-0.9, drag.y - step);
      else if (e.key === "ArrowDown") drag.y = Math.min(0.9, drag.y + step);
      else return;
      e.preventDefault();
      if (!renderer && engine) engine.drawFormCpu(cpuCanvas, build, build.tilt[0] + drag.y, build.tilt[1] + drag.x);
    };
    art.addEventListener("pointerdown", onDown);
    art.addEventListener("pointermove", onMove);
    art.addEventListener("pointerup", onUp);
    art.addEventListener("pointercancel", onUp);
    art.addEventListener("keydown", onKey);

    // Pause live assets when off-screen or hidden.
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting && document.visibilityState === "visible";
      if (visible) restart();
    });
    io.observe(art);
    const onVis = () => {
      visible = document.visibilityState === "visible";
      if (visible) restart();
    };
    document.addEventListener("visibilitychange", onVis);

    // A resized viewport re-composes the artboard at its new size.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const next = artboardSize();
        if (Math.abs(next.w - size.w) > 40) setSize(next);
      }, 250);
    };
    window.addEventListener("resize", onResize);

    // Snapshot of the resolved artifact for "See where it can go".
    snapshotRef.current = () => {
      if (!build) return null;
      const r = art.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const c = document.createElement("canvas");
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const g = c.getContext("2d");
      if (!g) return null;
      g.scale(dpr, dpr);
      g.fillStyle = build.ground;
      g.fillRect(0, 0, r.width, r.height);
      if (build.underlay) {
        const R = build.underlay.radius;
        const [t0, t1] = [spec.palette.tones[0] ?? "#cccccc", spec.palette.tones[1] ?? "#888888"];
        const grd = g.createRadialGradient(r.width / 2 - R * 0.34, r.height / 2 - R * 0.4, 0, r.width / 2, r.height / 2, R);
        grd.addColorStop(0, t0);
        grd.addColorStop(0.6, t1);
        grd.addColorStop(1, "#080706");
        g.fillStyle = grd;
        g.beginPath();
        g.arc(r.width / 2, r.height / 2, R, 0, Math.PI * 2);
        g.fill();
      }
      if (hiRes) g.drawImage(hiRes, 0, 0, r.width, r.height);
      else if (renderer && lastU) {
        // Draw in the same task as the render so the WebGL buffer is readable.
        renderer.render(lastU);
        const k = particles.width / particles.clientWidth;
        g.drawImage(particles, 48 * k, 48 * k, r.width * k, r.height * k, 0, 0, r.width, r.height);
      } else g.drawImage(cpuCanvas, 0, 0, r.width, r.height);
      return { canvas: c, rect: r };
    };

    runRef.current = { stop: () => (cancelled = true) };
    setupAndRun();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      art.removeEventListener("pointerdown", onDown);
      art.removeEventListener("pointermove", onMove);
      art.removeEventListener("pointerup", onUp);
      art.removeEventListener("pointercancel", onUp);
      art.removeEventListener("keydown", onKey);
      renderer?.dispose();
      snapshotRef.current = null;
      host?.replaceChildren();
    };
  }, [phase, spec, size]);

  useEffect(() => {
    if (!done) return;
    againRef.current?.focus({ preventScroll: true });
    // Warm "See where it can go" while the visitor looks at their creation,
    // so the click gets an immediate visual response.
    void loadExpansion().then((C) => setExpansion(() => C));
    void import("@/lib/creation/plates");
  }, [done]);

  // Draw the visitor's sketch onto the stage before it becomes material.
  useLayoutEffect(() => {
    const c = sketchStageRef.current;
    if (phase !== "creating" || !sketch || !c || !size.w) return;
    const f = fitSketch(sketch, size.w, size.h);
    c.style.width = `${f.w}px`;
    c.style.height = `${f.h}px`;
    renderStrokes(c, f.strokes, sketch.pressures, { width: f.w, height: f.h, scale: f.scale });
  }, [phase, sketch, size]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(value);
  };

  const expand = async () => {
    // Intentional only: never auto-triggered.
    performance.mark("expand:click");
    const snap = snapshotRef.current?.() ?? null;
    performance.measure("expand:snapshot", "expand:click");
    if (!Expansion) {
      const C = await loadExpansion();
      setExpansion(() => C);
    }
    setExpanded(snap);
    setAnnounce(`${EXPAND.heading}: Design, Image, Motion, Spatial, Interface, and Video — in development.`);
  };
  const collapse = () => {
    setExpanded(false);
    requestAnimationFrame(() => artRef.current?.focus({ preventScroll: false }));
  };

  const recognised = new Set(spec?.recognised ?? []);
  const stageIndex = STAGES.indexOf(stage);
  const intentSize = spec ? intentFontSize(spec.intent, size.w) : 40;

  return (
    <div className="studio" data-phase={phase}>
      <div className="studio-idle" aria-hidden={phase === "creating"} inert={phase === "creating"}>
        {children}
        {mounted && (
          <form className="studio-form" onSubmit={submit} role="search" aria-label={CREATION.formLabel}>
            {mode === "draw" && SketchPad ? (
              <SketchPad
                onCreate={startDrawing}
                onCancel={() => {
                  setMode("type");
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              />
            ) : (
            <div className="studio-field">
              <button
                type="button"
                className="studio-draw"
                aria-label={DRAW.toggle}
                title={DRAW.toggle}
                onPointerEnter={prefetchSketch}
                onFocus={prefetchSketch}
                onClick={openDraw}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3.5 16.5l1.2-4.1L13.6 3.5a1.4 1.4 0 012 0l.9.9a1.4 1.4 0 010 2l-8.9 8.9-4.1 1.2z M12.2 4.9l2.9 2.9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </button>
              <label htmlFor="studio-intent" className="sr-only">
                {CREATION.formLabel}
              </label>
              <input
                ref={inputRef}
                id="studio-intent"
                name="intent"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={MAX_INTENT}
                placeholder={CREATION.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <button type="submit" className="studio-go" aria-label="Create" disabled={!value.trim()}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
            )}
            <ul className="studio-chips" aria-label="Examples">
              {CREATION.examples.map((ex) => (
                <li key={ex}>
                  <button type="button" onClick={() => start(ex)}>
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </form>
        )}
        {cta}
      </div>

      {phase === "creating" && spec && (
        <section className="studio-stage" aria-label={CREATION.stageLabel}>
          <ol className="studio-rail">
            {STAGES.map((s, i) => (
              <li key={s} data-state={i < stageIndex ? "done" : i === stageIndex ? "active" : "pending"}>
                <span className="rail-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="rail-label">{s}</span>
              </li>
            ))}
          </ol>

          {expanded !== false && Expansion && (
            <Expansion intent={spec.intent} yours={FAMILY_TO_PLATE[spec.family]} source={expanded} />
          )}
          <div className="studio-work" hidden={expanded !== false}>
            <div
              ref={artRef}
              className="studio-artboard"
              data-family={spec.family}
              data-interactive={done && hint ? "true" : "false"}
              style={{ width: size.w, height: size.h }}
              role="img"
              aria-label={done ? description : `Creating ${FAMILY_LABEL[spec.family].toLowerCase()} from “${spec.intent}”`}
              tabIndex={done && hint ? 0 : -1}
            >
              <div ref={frameRef} className="artboard-frame" />
              <div ref={groundRef} className="artboard-ground" />
              <div ref={underlayRef} className="artboard-underlay" />
              <div ref={hiResHost} className="artboard-hires-host" />
              {spec.source === "drawing" ? (
                <div ref={intentRef} className="intent-line intent-sketch-wrap" data-reading="false" aria-hidden="true">
                  <canvas ref={sketchStageRef} className="intent-sketch" />
                </div>
              ) : (
              <div
                ref={intentRef}
                className="intent-line"
                style={{ fontSize: intentSize }}
                data-reading="false"
                aria-hidden="true"
              >
                {spec.intent.split(" ").map((word, i) => {
                  const key = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
                  return (
                    <span key={i} data-recognised={recognised.has(key) ? "true" : "false"}>
                      {word}
                      {i < spec.intent.split(" ").length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </div>
              )}
              <canvas ref={particlesRef} className="artboard-particles" aria-hidden="true" />
              <canvas ref={cpuRef} className="artboard-cpu" aria-hidden="true" />
              {done && hint && <span className="artboard-hint">{hint}</span>}
            </div>

            <aside className="studio-panel" aria-label={CREATION.panelTitle}>
              <p className="panel-title">
                {CREATION.panelTitle}
                <span>{CREATION.panelNote}</span>
              </p>
              <dl>
                {(
                  [
                    ["Family", FAMILY_LABEL[spec.family]],
                    ["Subject", spec.name !== spec.subject ? `${spec.subject} · “${spec.name}”` : spec.subject],
                    spec.source === "drawing"
                      ? [DRAW.readingRow, (spec.reading ?? []).join(" · ")]
                      : ["Qualities", spec.qualities.length ? spec.qualities.join(", ") : "none stated"],
                    ["Composition", spec.composition],
                    ["Palette", ""],
                  ] as const
                ).map(([k, v], i) => (
                  <div key={k} className="panel-row" data-shown={i < rows ? "true" : "false"}>
                    <dt>{k}</dt>
                    <dd>
                      {k === "Palette" ? (
                        <span className="panel-swatches">
                          {[spec.palette.ground, spec.palette.ink, ...spec.palette.tones].slice(0, 6).map((c, j) => (
                            <i key={j} style={{ background: c }} title={c} />
                          ))}
                        </span>
                      ) : (
                        v
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>

          <div className="studio-foot" data-shown={done ? "true" : "false"}>
            <p className="studio-meta">
              {FAMILY_LABEL[spec.family]} · {CREATION.truth}
            </p>
            <div className="studio-actions">
              <button ref={againRef} type="button" className="studio-again" onClick={reset}>
                {CREATION.again}
              </button>
              <a href="#waitlist" className="canvas-cta">
                {CREATION.cta}
              </a>
            </div>
            {expanded === false ? (
              <button type="button" className="studio-bridge" onClick={expand}>
                <span className="studio-bridge-line">{BRIDGE.line}</span>
                <span className="studio-bridge-action">
                  {EXPAND.action} <span aria-hidden="true">→</span>
                </span>
              </button>
            ) : (
              <div className="studio-expanded-actions">
                <button type="button" className="studio-again" onClick={collapse}>
                  {EXPAND.back}
                </button>
                <a href="#possibility" className="studio-bridge studio-bridge-continue">
                  <span className="studio-bridge-action">
                    {EXPAND.continue} <span aria-hidden="true">↓</span>
                  </span>
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
