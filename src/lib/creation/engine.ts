// Lazy-loaded creation engine (code-split from the landing bundle).
import { buildSpatial } from "./families/spatial.ts";
import { buildFlat } from "./families/flat.ts";
import { buildMotion, sampleGlyphs } from "./families/motion.ts";
import { KIND, type Build, type BuildContext } from "./families/types.ts";
import { createCreationRenderer } from "./renderer.ts";
import { drawFormCpu } from "./cpu.ts";

export { createCreationRenderer, sampleGlyphs, KIND, drawFormCpu };
export type { Build, BuildContext };

export function buildFor(ctx: BuildContext): Build {
  switch (ctx.spec.family) {
    case "spatial":
      return buildSpatial(ctx);
    case "motion":
      return buildMotion(ctx);
    case "brand":
      return buildFlat(ctx, "brand");
    case "interface":
      return buildFlat(ctx, "interface");
    case "image":
      return buildFlat(ctx, "image");
    default:
      return buildFlat(ctx, "abstract");
  }
}
