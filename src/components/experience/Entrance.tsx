"use client";

// ─────────────────────────────────────────────────────────────
// Entrance orchestrator.
//
// One clock drives everything: the WebGL frame and the DOM word
// animations are both functions of the same elapsed time. WAAPI
// animations are created paused and scrubbed via currentTime, so
// words, pull, flash and handoff can never drift apart — even when
// frames drop or the tab is backgrounded (dt is clamped).
//
// Modes:
//   gl      — full spatial entrance (WebGL2)
//   lite    — WebGL unavailable/failed: words + direct white flash
//   reduced — prefers-reduced-motion: static composition, opacity only
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  frameAt,
  smoothstep,
  clamp01,
  T,
  REDUCED,
  REDUCED_END,
  type EntranceFrame,
} from "@/lib/experience/timeline";
import {
  createUniverse,
  type Tier,
  type UniverseRenderer,
} from "@/lib/experience/universe/renderer";

const WORDS = ["Imagine", "Type", "Draw"] as const;

/** Whole-word reveals. Each resolves into the shared line from its side. */
const REVEAL: Keyframe[][] = [
  [
    { opacity: 0, filter: "blur(10px)", transform: "translate3d(-14px,-6px,0)" },
    { opacity: 0.35, offset: 0.25 },
    { opacity: 1, filter: "blur(0px)", transform: "translate3d(0,0,0)" },
  ],
  [
    { opacity: 0, filter: "blur(8px)", transform: "translate3d(0,10px,0)" },
    { opacity: 0.35, offset: 0.25 },
    { opacity: 1, filter: "blur(0px)", transform: "translate3d(0,0,0)" },
  ],
  [
    { opacity: 0, filter: "blur(10px)", transform: "translate3d(14px,-6px,0)" },
    { opacity: 0.35, offset: 0.25 },
    { opacity: 1, filter: "blur(0px)", transform: "translate3d(0,0,0)" },
  ],
];
const REVEAL_EASE = "cubic-bezier(.2,.72,.18,1)";
const PULL_EASE = "cubic-bezier(.6,0,.86,.3)"; // gravitational: slow, then falling

/** Aperture resting position in CSS px (matches renderer holeX/holeY at u=0). */
function holeScreen() {
  const h = window.innerHeight;
  return { x: window.innerWidth / 2 + 0.018 * h, y: h / 2 + 0.035 * h };
}

/** Lite mode: flash as soon as the words have been drawn in. */
const LITE_FLASH = T.pull + 480;
const LITE_FLASH_DUR = 220;
const LITE_END = LITE_FLASH + LITE_FLASH_DUR + T.whiteHold + T.handoffDur;

export default function Entrance() {
  const [active, setActive] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const outerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const innerRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const html = document.documentElement;
    const requested = html.getAttribute("data-entrance");
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const flash = flashRef.current;
    const content = document.getElementById("site-content");

    const release = () => {
      html.removeAttribute("data-entrance");
      html.removeAttribute("data-entrance-live");
      content?.removeAttribute("inert");
    };

    // Not requested, or JS arrived so late the CSS failsafe has already
    // revealed the canvas — never yank the visitor back into black.
    if (!requested || !root || !canvas || !flash || performance.now() > 5500) {
      release();
      setActive(false);
      return;
    }

    html.setAttribute("data-entrance-live", "");
    content?.setAttribute("inert", "");

    const dev = process.env.NODE_ENV !== "production";
    const params = new URLSearchParams(window.location.search);
    const scrubParam = dev ? params.get("entrance-t") : null;
    const scrub = scrubParam !== null ? Number(scrubParam) : null;
    const forcedTier = dev ? (params.get("entrance-tier") as Tier | null) : null;
    const forceLite = dev && params.has("entrance-lite");

    const reduced = requested === "reduced";
    let finished = false;
    let raf = 0;
    let elapsed = 0;
    let last = performance.now();
    const pointer = { x: 0, y: 0 };

    let renderer: UniverseRenderer | null = null;
    if (!forceLite) {
      try {
        renderer = createUniverse(canvas, {
          tier: forcedTier ?? undefined,
          onLost: () => finish(true),
        });
      } catch (err) {
        console.warn("[entrance] renderer failed, using fallback", err);
        renderer = null;
      }
    }
    const mode = reduced ? "reduced" : renderer ? "gl" : "lite";
    root.dataset.mode = mode;
    if (renderer) root.dataset.tier = renderer.tier;

    const outers = outerRefs.current.filter(Boolean) as HTMLSpanElement[];
    const inners = innerRefs.current.filter(Boolean) as HTMLSpanElement[];

    // ── Word animations (paused; scrubbed by the shared clock) ──
    const anims: Animation[] = [];
    if (reduced) {
      for (const el of inners) {
        anims.push(
          el.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: REDUCED.wordsDur,
            delay: REDUCED.wordsIn,
            fill: "both",
            easing: "linear",
          })
        );
      }
    } else {
      const starts = [T.imagine, T.type, T.draw];
      inners.forEach((el, i) => {
        anims.push(
          el.animate(REVEAL[i]!, {
            duration: T.wordDur,
            delay: starts[i],
            fill: "both",
            easing: REVEAL_EASE,
          })
        );
      });
    }
    anims.forEach((a) => a.pause());

    // Pull animations are built just before the pull, once the words have
    // settled, so their vectors aim at the real aperture position.
    let pullBuilt = false;
    const buildPull = () => {
      pullBuilt = true;
      const hole = holeScreen();
      outers.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const dx = hole.x - (r.left + r.width / 2);
        const dy = hole.y - (r.top + r.height / 2);
        const a = el.animate(
          [
            { transform: "translate3d(0,0,0) scale(1)", opacity: 1, filter: "blur(0px)" },
            {
              transform: `translate3d(${dx * 0.35}px,${dy * 0.35}px,0) scale(.82)`,
              opacity: 0.85,
              filter: "blur(.6px)",
              offset: 0.45,
            },
            {
              transform: `translate3d(${dx}px,${dy}px,0) scale(.06)`,
              opacity: 0,
              filter: "blur(4px)",
            },
          ],
          {
            duration: T.wordsPulledDur,
            // Outer words reach the aperture a beat after the centre one.
            delay: T.pull + T.wordsPulledDelay + (i === 1 ? 0 : 60),
            fill: "both",
            easing: PULL_EASE,
          }
        );
        a.pause();
        anims.push(a);
      });
    };

    const finish = (fast: boolean) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      const done = () => {
        renderer?.dispose();
        renderer = null;
        const hadFocus = root.contains(document.activeElement);
        release();
        html.setAttribute("data-arrived", "");
        setActive(false);
        if (hadFocus) {
          document.getElementById("canvas-heading")?.focus({ preventScroll: true });
        }
      };
      if (fast) {
        root.animate([{ opacity: Number(root.style.opacity || 1) }, { opacity: 0 }], {
          duration: 200,
          easing: "ease-out",
          fill: "forwards",
        }).onfinish = done;
      } else {
        done();
      }
    };

    const apply = (t: number) => {
      for (const a of anims) a.currentTime = t;

      if (mode === "reduced") {
        if (renderer && t === 0) {
          // One static, fully composed frame — no motion at all.
          const still: EntranceFrame = { ...frameAt(T.pull - 1), t: 0 };
          renderer.render(still, pointer);
        }
        const fade = clamp01((t - (REDUCED_END - REDUCED.crossfade)) / REDUCED.crossfade);
        root.style.opacity = String(1 - fade);
        return t >= REDUCED_END;
      }

      if (!pullBuilt && t >= T.pull - 120) buildPull();

      if (mode === "gl") {
        const f = frameAt(t);
        renderer!.render(f, pointer);
        root.style.opacity = String(1 - f.handoff);
        return f.done;
      }

      // lite
      const w = smoothstep(LITE_FLASH, LITE_FLASH + LITE_FLASH_DUR, t);
      flash.style.opacity = String(w);
      const handoff = clamp01((t - LITE_FLASH - LITE_FLASH_DUR - T.whiteHold) / T.handoffDur);
      root.style.opacity = String(1 - handoff);
      return t >= LITE_END;
    };

    const loop = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      elapsed = scrub ?? elapsed + dt;
      const done = apply(elapsed);
      if (done && scrub === null) {
        finish(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame((now) => {
      last = now;
      loop(now);
    });

    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
    };
    const onSkip = () => finish(true);
    const skip = skipRef.current;
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    skip?.addEventListener("click", onSkip);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("keydown", onKey);
      skip?.removeEventListener("click", onSkip);
      anims.forEach((a) => a.cancel());
      renderer?.dispose();
      if (!finished) release();
    };
  }, []);

  if (!active) return null;

  return (
    <div ref={rootRef} className="entrance">
      <canvas ref={canvasRef} className="entrance-canvas" aria-hidden="true" />
      <div className="entrance-words" aria-hidden="true">
        {WORDS.map((w, i) => (
          <span
            key={w}
            className="entrance-word"
            ref={(el) => {
              outerRefs.current[i] = el;
            }}
          >
            <span
              ref={(el) => {
                innerRefs.current[i] = el;
              }}
            >
              {w}
            </span>
          </span>
        ))}
      </div>
      <div ref={flashRef} className="entrance-flash" aria-hidden="true" />
      <button ref={skipRef} type="button" className="entrance-skip">
        Skip intro
      </button>
    </div>
  );
}
