import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { Palette, Megaphone, FolderKanban } from "lucide-react";
import { USE_CASES } from "@/content/landing";

const CASE_ICONS = [Palette, Megaphone, FolderKanban] as const;

export default function UseCases() {
  return (
    <section id="use-cases" className="py-24 px-8 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-slate-light uppercase tracking-[0.08em] mb-3">
              {USE_CASES.sectionLabel}
            </span>
            <h2 className="text-[clamp(2rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-text">
              {USE_CASES.heading}
            </h2>
            <p className="text-[17px] text-text-secondary leading-[1.7] max-w-[560px] mx-auto mt-4">
              {USE_CASES.subheading}
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {USE_CASES.cases.map((c, i) => {
            const Icon = CASE_ICONS[i]!;
            return (
              <RevealOnScroll key={c.title}>
                <div className="rounded-xl border border-border p-8 h-full hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-accent-bg flex items-center justify-center mb-5">
                    <Icon
                      size={24}
                      strokeWidth={1.5}
                      className="text-accent"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-text mb-2">{c.title}</h3>
                  <p className="text-[15px] text-text-secondary leading-[1.6]">
                    {c.desc}
                  </p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
