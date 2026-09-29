import Link from "next/link";
import { FOOTER } from "@/content/experience";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p className="site-footer-brand">{FOOTER.brand}</p>
          <p className="site-footer-line">
            {FOOTER.line} · {FOOTER.status}
          </p>
        </div>
        <nav aria-label="Footer" className="site-footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="https://faradaycapitalsystems.com" rel="noopener noreferrer">
            Faraday Capital Systems
          </a>
        </nav>
        <p className="site-footer-copy">© 2026 Faraday Capital Systems</p>
      </div>
    </footer>
  );
}
