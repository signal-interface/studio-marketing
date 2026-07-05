import Link from "next/link";
import { SITE } from "@/lib/constants";

// TODO: migrate to @faraday/marketing-ui when the shared package exists

export default function Footer() {
  return (
    <footer className="px-8 pt-14 pb-8 bg-canvas text-slate-light">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-12 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-canvas-light flex items-center justify-center text-accent font-bold text-base">
                S
              </div>
              <span className="font-semibold text-[15px] text-slate-light">
                {SITE.name}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-light max-w-[320px] mt-3">
              Creative intelligence for teams who design, brand, and build.
              Early access.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-slate-light uppercase tracking-[0.08em] mb-4">
              Product
            </h4>
            <div className="flex flex-col gap-1">
              <Link
                href="/#how-it-works"
                className="text-sm text-slate-light no-underline hover:text-white transition-colors py-1"
              >
                How It Works
              </Link>
              <Link
                href="/#use-cases"
                className="text-sm text-slate-light no-underline hover:text-white transition-colors py-1"
              >
                Use Cases
              </Link>
              <Link
                href="/#waitlist"
                className="text-sm text-slate-light no-underline hover:text-white transition-colors py-1"
              >
                Join the Waitlist
              </Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-slate-light uppercase tracking-[0.08em] mb-4">
              Company
            </h4>
            <div className="flex flex-col gap-1">
              <a
                href="https://faradaycapitalsystems.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-light no-underline hover:text-white transition-colors py-1"
              >
                Faraday Capital Systems
              </a>
              <Link
                href="/privacy"
                className="text-sm text-slate-light no-underline hover:text-white transition-colors py-1"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-slate-light no-underline hover:text-white transition-colors py-1"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-[13px] text-slate-light">
            &copy; 2026 Faraday Capital Systems. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
