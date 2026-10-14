// ─────────────────────────────────────────────────────────────
// Creation canvas — the landing state after the entrance.
//
// Server-rendered and always present: it is the no-JS page, the
// reduced-motion destination, the skip destination and the surface
// the white flash dissolves onto. The entrance never replaces it;
// it only plays in front of it.
//
// The creation demonstration (Slice 2) mounts inside it on the client;
// heading, subline and CTA stay server-rendered.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import CreationStudio from "@/components/creation/CreationStudio";
import { CANVAS } from "@/content/experience";

export default function CreationCanvas() {
  return (
    <section id="canvas" className="creation-canvas" aria-labelledby="canvas-heading">
      <header className="canvas-nav">
        <Link href="/" className="canvas-brand">
          {CANVAS.brand}
        </Link>
        <nav aria-label="Primary">
          <a href="#waitlist" className="canvas-navlink">
            {CANVAS.navCta}
          </a>
        </nav>
      </header>

      <div className="canvas-center">
        <CreationStudio
          cta={
            <a href="#waitlist" className="canvas-cta">
              {CANVAS.cta}
            </a>
          }
        >
          <h1 id="canvas-heading" tabIndex={-1} className="canvas-heading">
            {CANVAS.heading}
          </h1>
          <p className="canvas-sub">{CANVAS.sub}</p>
        </CreationStudio>
      </div>

      <p className="canvas-foot">{CANVAS.footnote}</p>
    </section>
  );
}
