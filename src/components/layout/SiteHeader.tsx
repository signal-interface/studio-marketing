import Link from "next/link";
import { CANVAS } from "@/content/experience";

/** Header for secondary pages — the same chrome as the creation canvas. */
export default function SiteHeader() {
  return (
    <header className="canvas-nav site-header">
      <Link href="/" className="canvas-brand">
        {CANVAS.brand}
      </Link>
      <nav aria-label="Primary">
        <Link href="/#waitlist" className="canvas-navlink">
          {CANVAS.navCta}
        </Link>
      </nav>
    </header>
  );
}
