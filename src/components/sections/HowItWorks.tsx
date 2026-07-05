import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { Layers, LayoutGrid, Sparkles, PackageCheck } from "lucide-react";
import { HOW_IT_WORKS } from "@/content/landing";

const STEP_ICONS = [Layers, LayoutGrid, Sparkles, PackageCheck] as const;

const STEP_STYLES = [
  { color: "text-accent", bg: "bg-accent-bg" },
  { color: "text-amber", bg: "bg-amber-bg" },
  { color: "text-accent-dark", bg: "bg-accent-bg" },
  { color: "text-green", bg: "bg-green-bg" },
] as const;

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-8 bg-ice">
      <div className="max-w-[1200px] mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-slate-light uppercase tracking-[0.08em] mb-3">
              {HOW_IT_WORKS.sectionLabel}
            </span>
            <h2 className="text-[clamp(2rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-text">
              {HOW_IT_WORKS.heading}
            </h2>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.steps.map((s, i) => {
            const Icon = STEP_ICONS[i]!;
            const style = STEP_STYLES[i]!;
            return (
              <RevealOnScroll key={s.step} delay={i > 0 ? (`reveal-d${i}` as "reveal-d1" | "reveal-d2" | "reveal-d3") : ""}>
                <div className="bg-white rounded-xl p-6 border border-border h-full">
                  <div
                    className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center mb-4`}
                  >
                    <Icon size={20} strokeWidth={1.5} className={style.color} aria-hidden="true" />
                  </div>
                  <div className="text-xs font-semibold text-text-tertiary uppercase tracking-[0.08em] mb-1">
                    Step {i + 1}
                  </div>
                  <h3 className="text-lg font-bold text-text mb-2">{s.step}</h3>
                  <p className="text-[14px] text-text-secondary leading-[1.6]">
                    {s.desc}
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
