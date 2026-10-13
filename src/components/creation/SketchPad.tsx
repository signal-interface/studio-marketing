"use client";

// ─────────────────────────────────────────────────────────────
// Sketch pad — the "Draw" in "Imagine. Type. Draw."
//
// A quiet drawing surface on the creation canvas: mouse, touch and
// stylus (Pointer Events, with pen pressure and coalesced samples).
// No toolbar, no editor: draw, clear, create. Strokes stay in memory
// and are handed to the same interpretation/materialization pipeline.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import type { Stroke } from "@/lib/creation/sketch";
import { renderStrokes } from "@/lib/creation/strokes";
import { DRAW } from "@/content/experience";

export interface SketchResult {
  strokes: Stroke[];
  pressures: number[][];
  width: number;
  height: number;
}

export default function SketchPad({
  onCreate,
  onCancel,
}: {
  onCreate: (r: SketchResult) => void;
  onCancel: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const pressures = useRef<number[][]>([]);
  const drawing = useRef<number | null>(null);
  const [count, setCount] = useState(0);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    renderStrokes(c, strokes.current, pressures.current, { width: c.clientWidth, height: c.clientHeight });
  }, []);

  // Move focus into the pad so assistive tech announces how drawing works.
  useEffect(() => {
    canvasRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    redraw();
    const ro = new ResizeObserver(redraw);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const point = (e: PointerEvent | React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pressureOf = (e: PointerEvent | React.PointerEvent) =>
    e.pointerType === "pen" ? Math.max(0.05, e.pressure || 0.5) : 0.5;

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    try {
      canvasRef.current!.setPointerCapture(e.pointerId);
    } catch {
      // Some pointer sources can't be captured; drawing still works without it.
    }
    drawing.current = e.pointerId;
    strokes.current.push([point(e)]);
    pressures.current.push([pressureOf(e)]);
    setCount(strokes.current.length);
    redraw();
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current !== e.pointerId) return;
    const s = strokes.current[strokes.current.length - 1]!;
    const p = pressures.current[pressures.current.length - 1]!;
    // Coalesced events give stylus-grade smoothness where supported.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      s.push(point(ev));
      p.push(pressureOf(ev));
    }
    redraw();
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current === e.pointerId) drawing.current = null;
  };

  const clear = () => {
    strokes.current = [];
    pressures.current = [];
    setCount(0);
    redraw();
  };

  const create = () => {
    const c = canvasRef.current!;
    if (!strokes.current.length) return;
    onCreate({
      strokes: strokes.current.map((s) => s.slice()),
      pressures: pressures.current.map((p) => p.slice()),
      width: c.clientWidth,
      height: c.clientHeight,
    });
  };

  return (
    <div ref={wrapRef} className="sketch">
      <div className="sketch-surface" data-empty={count === 0 ? "true" : "false"}>
        <canvas
          ref={canvasRef}
          className="sketch-canvas"
          role="img"
          tabIndex={0}
          aria-label={DRAW.surfaceLabel}
          aria-describedby="sketch-help"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        <p className="sketch-hint" aria-hidden="true">
          {DRAW.hint}
        </p>
      </div>
      <p id="sketch-help" className="sr-only">
        {DRAW.help}
      </p>
      <div className="sketch-actions">
        <button type="button" className="sketch-btn" onClick={onCancel}>
          {DRAW.type}
        </button>
        <button type="button" className="sketch-btn" onClick={clear} disabled={count === 0}>
          {DRAW.clear}
        </button>
        <button type="button" className="sketch-btn sketch-create" onClick={create} disabled={count === 0}>
          {DRAW.create} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
