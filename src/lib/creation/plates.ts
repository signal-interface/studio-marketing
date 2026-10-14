// ─────────────────────────────────────────────────────────────
// Possibility plates — one intent drawn in many forms.
//
// Lazy chunk for the story layer. Uses the same live family drawing
// as the creation demo, rendered with Canvas2D (no WebGL, no stored
// imagery). Marketing-site-local; not Studio architecture.
// ─────────────────────────────────────────────────────────────

import { interpret } from "./interpret.ts";
import { mulberry32, makeCanvas } from "./sample.ts";
import { drawFlatAsset } from "./families/flat.ts";
import { buildSpatial } from "./families/spatial.ts";
import { buildMotion } from "./families/motion.ts";
import { drawFormCpu } from "./cpu.ts";
import type { Build, Fonts } from "./families/types.ts";

export type PlateKind = "design" | "image" | "motion" | "spatial" | "interface" | "video";

export interface PlateHost {
  root: HTMLElement;
  ground: HTMLElement;
  underlay: HTMLElement;
  canvas: HTMLCanvasElement;
}

export interface PlateHandle {
  /** Advance an animated plate one step (no-op for still plates). */
  tick(dtMs: number): void;
  readonly animated: boolean;
  description: string;
}

function ctx2d(canvas: HTMLCanvasElement, w: number, h: number, dpr: number) {
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}

function formPlate(host: PlateHost, build: Build, spin: number): PlateHandle {
  host.ground.style.background = build.ground;
  if (build.underlay) {
    host.underlay.style.background = build.underlay.background;
    host.underlay.style.width = host.underlay.style.height = `${build.underlay.radius * 2}px`;
    host.underlay.style.opacity = "0.96";
  } else host.underlay.style.opacity = "0";
  let angle = 0;
  let acc = 0;
  const draw = () => drawFormCpu(host.canvas, build, build.tilt[0], build.tilt[1] + angle);
  draw();
  return {
    animated: spin !== 0,
    description: build.description,
    tick(dt) {
      angle += (dt / 1000) * spin;
      acc += dt;
      // ~24 fps is plenty for a slow turn and keeps CPU cost low.
      if (acc >= 42) {
        acc = 0;
        draw();
      }
    },
  };
}

export function paintPlate(host: PlateHost, intent: string, kind: PlateKind, fonts: Fonts): PlateHandle {
  const w = Math.max(1, host.root.clientWidth);
  const h = Math.max(1, host.root.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rnd = mulberry32(0x51a7e);
  host.underlay.style.opacity = "0";

  if (kind === "spatial") {
    const spec = interpret(intent, "spatial");
    const build = buildSpatial({ spec, w, h, dpr, n: 9000, fonts, rnd });
    return formPlate(host, { ...build, gain: build.gain * 1.25 }, 0.22);
  }
  if (kind === "motion") {
    const spec = interpret(intent, "motion");
    const build = buildMotion({ spec, w, h, dpr, n: 7000, fonts, rnd });
    return formPlate(host, build, -0.9);
  }

  const family = kind === "design" ? "brand" : kind === "video" ? "image" : kind;
  let spec = interpret(intent, family);
  if (kind === "video") {
    // The storyboard should read at a glance: use a lit scene, and one that
    // differs from the image plate.
    const lit = ["sunset", "ocean", "mountains", "desert", "forest", "city"];
    const alt = lit.filter((v) => v !== spec.variant);
    spec = { ...spec, variant: alt[spec.seed % alt.length]! };
  }
  host.ground.style.background = "transparent";

  if (kind !== "video") {
    const g = ctx2d(host.canvas, w, h, dpr);
    drawFlatAsset(g, { spec, w, h, dpr, n: 0, fonts, rnd }, family as "brand" | "image" | "interface");
    const label: Record<string, string> = {
      design: `An identity for ${spec.name}: mark, wordmark, palette and type`,
      image: `An image study: ${spec.variant} with layered depth`,
      interface: `An interface study: ${spec.subject} ${spec.variant.replace("-", " ")}`,
    };
    return { animated: false, description: label[kind]!, tick() {} };
  }

  // Video (in development): a storyboard strip panning across a scene,
  // clearly labelled by the caption as not yet available.
  const sceneW = Math.round(w * 1.8);
  const sceneH = Math.round(h * 0.62);
  const scene = makeCanvas(sceneW, sceneH, dpr);
  drawFlatAsset(scene.ctx, { spec, w: sceneW, h: sceneH, dpr, n: 0, fonts, rnd }, "image");
  let t = 0;
  let acc = 0;
  const g = ctx2d(host.canvas, w, h, dpr);
  const draw = () => {
    g.fillStyle = "#0b0b0c";
    g.fillRect(0, 0, w, h);
    const frames = 3;
    const pad = Math.max(8, w * 0.02);
    const fw = (w - pad * (frames + 1)) / frames;
    const fh = Math.min(sceneH, fw * 0.62);
    const y = (h - fh) / 2;
    // sprockets
    g.fillStyle = "#1c1c1f";
    for (let x = pad / 2; x < w; x += 14) {
      g.fillRect(x, y - 16, 7, 6);
      g.fillRect(x, y + fh + 10, 7, 6);
    }
    for (let k = 0; k < frames; k++) {
      const fx = pad + k * (fw + pad);
      const pan = ((t / 9000 + k * 0.22) % 1) * (sceneW - fw * 1.1);
      g.drawImage(scene.canvas, (pan) * dpr, 0, fw * 1.1 * dpr, fh * dpr * 1.0, fx, y, fw, fh);
      g.fillStyle = "rgba(255,255,255,.55)";
      g.font = `9px ${fonts.mono}`;
      const secs = Math.floor(t / 1000) + k * 2;
      g.fillText(`00:00:${String(secs % 60).padStart(2, "0")}:${String((k * 7 + 3) % 24).padStart(2, "0")}`, fx, y + fh + 30);
    }
  };
  draw();
  return {
    animated: true,
    description: `A storyboard for a short film from “${spec.intent}” — video is in development`,
    tick(dt) {
      t += dt;
      acc += dt;
      if (acc >= 60) {
        acc = 0;
        draw();
      }
    },
  };
}
