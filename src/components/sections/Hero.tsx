import { ArrowRight } from "lucide-react";
import { HERO } from "@/content/landing";

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-8 bg-white">
      <div className="max-w-[1200px] mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-bg text-accent text-xs font-semibold tracking-[0.04em] uppercase mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          {HERO.badge}
        </div>

        <h1 className="text-[clamp(2.5rem,5.5vw,4rem)] font-bold tracking-[-0.03em] text-text leading-[1.1] mb-6 max-w-[800px] mx-auto whitespace-pre-line">
          {HERO.heading}
        </h1>

        <p className="text-[clamp(1rem,2vw,1.25rem)] text-text-secondary leading-[1.7] max-w-[600px] mx-auto mb-10">
          {HERO.subheading}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg text-[15px] font-semibold bg-canvas text-white hover:bg-canvas-light hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            {HERO.primaryCta}
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-[15px] font-semibold text-text border border-border hover:border-slate-mid hover:bg-ice transition-all"
          >
            {HERO.secondaryCta}
          </a>
        </div>
      </div>
    </section>
  );
}
