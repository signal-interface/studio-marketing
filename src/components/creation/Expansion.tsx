"use client";

// ─────────────────────────────────────────────────────────────
// "See where it can go" — the visitor's creation becomes the source
// of a multi-form expansion.
//
// On an intentional click/tap/keypress, the finished artifact is
// snapshotted. Six copies of it lift off from exactly where it sits,
// travel into an asymmetric constellation, and resolve mid-flight into
// their own forms (drawn live from the same intent). Reduced motion:
// the composed state appears without spatial movement.
// ─────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EXPAND, POSSIBILITY } from "@/content/experience";
import type { PlateHandle, PlateKind } from "@/lib/creation/plates";

export interface SourceArtifact {
  /** Snapshot of the resolved artifact (artboard-sized). */
  canvas: HTMLCanvasElement;
  /** Its on-screen rect at the moment of the click. */
  rect: DOMRect;
}

const SLOTS = ["center", "l1", "r1", "l2", "r2", "b"] as const;

export default function Expansion({
  intent,
  yours,
  source,
}: {
  intent: string;
  yours: PlateKind;
  source: SourceArtifact | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const plates = useRef<(HTMLElement | null)[]>([]);
  const hosts = useRef<(HTMLDivElement | null)[]>([]);
  const sources = useRef<(HTMLCanvasElement | null)[]>([]);
  const [labels, setLabels] = useState<string[]>([]);

  // Visitor's own form first (it takes the centre), then the rest in order.
  const order: PlateKind[] = [yours, ...POSSIBILITY.plates.map((p) => p.kind as PlateKind).filter((k) => k !== yours)];
  const meta = (k: PlateKind) => POSSIBILITY.plates.find((p) => p.kind === k)!;

  // Flight: FLIP from the source rect to each plate's resting rect.
  useLayoutEffect(() => {
    performance.mark("expand:layout:start");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anims: Animation[] = [];
    order.forEach((_, i) => {
      const el = plates.current[i];
      const art = hosts.current[i];
      const src = sources.current[i];
      if (!el || !art) return;
      if (src && source) {
        // Paint the visitor's artifact into the plate's source layer (cover fit).
        const r = art.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        src.width = Math.round(r.width * dpr);
        src.height = Math.round(r.height * dpr);
        const g = src.getContext("2d");
        if (g) {
          const sw = source.canvas.width, sh = source.canvas.height;
          const s = Math.max(src.width / sw, src.height / sh);
          g.drawImage(source.canvas, (src.width - sw * s) / 2, (src.height - sh * s) / 2, sw * s, sh * s);
        }
      }
      if (reduced || !source) {
        anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: i * 40, fill: "both" }));
        if (src) src.style.opacity = "0";
        return;
      }
      const r = art.getBoundingClientRect();
      const from = source.rect;
      const dx = from.left + from.width / 2 - (r.left + r.width / 2);
      const dy = from.top + from.height / 2 - (r.top + r.height / 2);
      const s = from.width / r.width;
      const duration = 1050 + i * 60;
      const delay = i * 55;
      anims.push(
        el.animate(
          [
            { transform: `translate3d(${dx}px,${dy}px,0) scale(${s})`, offset: 0 },
            { transform: `translate3d(${dx * 0.92}px,${dy * 0.92}px,0) scale(${s * 0.96})`, offset: 0.08 },
            { transform: "translate3d(0,0,0) scale(1)" },
          ],
          { duration, delay, easing: "cubic-bezier(.2,.75,.12,1)", fill: "both" }
        )
      );
      // Captions arrive only once a plate has landed (no text in flight).
      const cap = el.querySelector("figcaption");
      if (cap) {
        anims.push(
          cap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: delay + duration * 0.82, fill: "both" })
        );
      }
      // The artifact resolves into this plate's own form mid-flight.
      if (src) {
        anims.push(
          src.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], {
            duration: duration * 0.9,
            delay,
            easing: "ease-in-out",
            fill: "both",
          })
        );
      }
    });
    headingRef.current?.focus({ preventScroll: true });
    performance.measure("expand:layout", "expand:layout:start");
    try {
      performance.measure("expand:click-to-layout", "expand:click");
    } catch {}
    return () => anims.forEach((a) => a.cancel());
    // Run once per expansion.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Paint each form live (lazy chunk, Canvas2D), one per frame.
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const handles: PlateHandle[] = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      const { paintPlate } = await import("@/lib/creation/plates");
      await document.fonts?.ready;
      const cs = getComputedStyle(document.body);
      const fonts = {
        sans: cs.fontFamily,
        mono: getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "ui-monospace, monospace",
        serif: 'Georgia, "Times New Roman", serif',
      };
      const out: string[] = [];
      for (let i = 0; i < order.length; i++) {
        if (cancelled) return;
        await new Promise((r) => requestAnimationFrame(r));
        const root = hosts.current[i];
        if (!root) continue;
        const h = paintPlate(
          {
            root,
            ground: root.querySelector(".plate-ground")!,
            underlay: root.querySelector(".plate-underlay")!,
            canvas: root.querySelector("canvas.plate-form")!,
          },
          intent,
          order[i]!,
          fonts
        );
        root.dataset.painted = "true";
        out[i] = h.description;
        handles.push(h);
      }
      if (cancelled) return;
      setLabels(out);
      if (reduced) return;
      let last = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(100, now - last);
        last = now;
        for (const h of handles) if (h.animated) h.tick(dt);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [intent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="expand" aria-labelledby="expand-heading">
      <h3 id="expand-heading" ref={headingRef} tabIndex={-1} className="expand-heading">
        {EXPAND.heading}
      </h3>
      <div className="expand-field">
        {order.map((kind, i) => {
          const m = meta(kind);
          return (
            <figure
              key={kind}
              ref={(el) => {
                plates.current[i] = el;
              }}
              className="expand-plate"
              data-slot={SLOTS[i]}
              data-kind={kind}
            >
              <div
                className="plate-art"
                ref={(el) => {
                  hosts.current[i] = el;
                }}
                role="img"
                aria-label={labels[i] ?? `${m.title}: ${m.line}`}
              >
                <div className="plate-ground" />
                <div className="plate-underlay" />
                <canvas className="plate-form" aria-hidden="true" />
                <canvas
                  className="expand-source"
                  aria-hidden="true"
                  ref={(el) => {
                    sources.current[i] = el;
                  }}
                />
                {i === 0 && <span className="plate-yours">{POSSIBILITY.yours}</span>}
              </div>
              <figcaption>
                <span className="plate-n">{m.n}</span>
                <span className="plate-title">{m.title}</span>
                <span className="plate-line">{m.line}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
      <p className="expand-note">{EXPAND.note}</p>
    </section>
  );
}
