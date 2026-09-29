"use client";

// ─────────────────────────────────────────────────────────────
// Possibility — the visitor's idea, drawn in every form it could take.
//
// Continues the creation canvas: same surface, same artboards. On wide
// screens the section pins and the board travels sideways as you scroll
// (a camera move across one canvas); on narrow screens and with reduced
// motion it is a simple vertical sequence.
//
// Plates are painted lazily (separate chunk, Canvas2D) only when the
// section approaches the viewport. The intent stays in page memory.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { POSSIBILITY } from "@/content/experience";
import { interpret } from "@/lib/creation/interpret";
import { CREATED_EVENT } from "@/lib/creation/events";
import type { PlateHandle, PlateKind } from "@/lib/creation/plates";

const DEFAULT_INTENT = "Saturn";

const FAMILY_TO_PLATE: Record<string, PlateKind> = {
  brand: "design",
  image: "image",
  abstract: "image",
  motion: "motion",
  spatial: "spatial",
  interface: "interface",
};

export default function Possibility() {
  const [intent, setIntent] = useState(DEFAULT_INTENT);
  const [own, setOwn] = useState(false);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hosts = useRef<Record<string, HTMLDivElement | null>>({});
  const [near, setNear] = useState(false);

  // The creation canvas announces completed creations (in-page event only).
  useEffect(() => {
    const on = (e: Event) => {
      const detail = (e as CustomEvent<{ intent: string }>).detail;
      if (detail?.intent) {
        setIntent(detail.intent);
        setOwn(true);
      }
    };
    window.addEventListener(CREATED_EVENT, on);
    return () => window.removeEventListener(CREATED_EVENT, on);
  }, []);

  // Paint only once the section is close.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    let raf = 0;
    let visible = false;
    const handles: PlateHandle[] = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cs = getComputedStyle(document.body);
    const fonts = {
      sans: cs.fontFamily,
      mono: getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "ui-monospace, monospace",
      serif: 'Georgia, "Times New Roman", serif',
    };

    (async () => {
      const { paintPlate } = await import("@/lib/creation/plates");
      await document.fonts?.ready;
      const desc: Record<string, string> = {};
      // One plate per frame keeps the main thread responsive.
      for (const p of POSSIBILITY.plates) {
        if (cancelled) return;
        await new Promise((r) => requestAnimationFrame(r));
        const root = hosts.current[p.kind];
        if (!root) continue;
        const h = paintPlate(
          {
            root,
            ground: root.querySelector(".plate-ground")!,
            underlay: root.querySelector(".plate-underlay")!,
            canvas: root.querySelector("canvas")!,
          },
          intent,
          p.kind,
          fonts
        );
        root.dataset.painted = "true";
        desc[p.kind] = h.description;
        handles.push(h);
      }
      if (cancelled) return;
      setDescriptions(desc);
      if (reduced) return;
      let last = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(100, now - last);
        last = now;
        if (visible) for (const h of handles) if (h.animated) h.tick(dt);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting && document.visibilityState === "visible";
    });
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [near, intent]);

  // Wide screens: pin the section and travel the board sideways on scroll.
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    let travel = 0;
    let raf = 0;
    const measure = () => {
      if (!mq.matches) {
        section.style.removeProperty("--travel");
        section.dataset.travel = "false";
        track.style.transform = "";
        return;
      }
      section.dataset.travel = "true";
      travel = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.setProperty("--travel", `${travel}px`);
      update();
    };
    const update = () => {
      raf = 0;
      if (!mq.matches) return;
      const r = section.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      track.style.transform = `translate3d(${-p * travel}px,0,0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  const yours = own ? FAMILY_TO_PLATE[interpret(intent).family] : undefined;

  return (
    <section id="possibility" ref={sectionRef} className="possibility" aria-labelledby="possibility-heading">
      {/* Preserved anchor from the earlier site. */}
      <span id="use-cases" className="anchor" aria-hidden="true" />
      <div className="possibility-pin">
        <div ref={trackRef} className="possibility-track">
          <div className="possibility-intro">
            <p className="eyebrow">{POSSIBILITY.eyebrow}</p>
            <h2 id="possibility-heading" className="story-heading">
              {POSSIBILITY.heading}
            </h2>
            <p className="story-body">{POSSIBILITY.body}</p>
            <p className="possibility-showing">
              <span>{POSSIBILITY.showing}</span>
              <span className="possibility-intent">“{intent}”</span>
              {!own && (
                <a href="#canvas" className="possibility-try">
                  {POSSIBILITY.tryOwn} ↑
                </a>
              )}
            </p>
          </div>

          <div className="possibility-thread" aria-hidden="true" />

          {POSSIBILITY.plates.map((p) => (
            <figure key={p.kind} className="plate" data-kind={p.kind}>
              <div
                className="plate-art"
                ref={(el) => {
                  hosts.current[p.kind] = el;
                }}
                role="img"
                aria-label={descriptions[p.kind] ?? `${p.title}: ${p.line}`}
              >
                <div className="plate-ground" />
                <div className="plate-underlay" />
                <canvas aria-hidden="true" />
                {yours === p.kind && <span className="plate-yours">{POSSIBILITY.yours}</span>}
              </div>
              <figcaption>
                <span className="plate-n">{p.n}</span>
                <span className="plate-title">{p.title}</span>
                <span className="plate-line">{p.line}</span>
              </figcaption>
            </figure>
          ))}

          <p className="possibility-note">{POSSIBILITY.note}</p>
        </div>
      </div>
    </section>
  );
}
