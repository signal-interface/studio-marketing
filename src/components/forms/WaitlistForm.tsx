"use client";

import { useState } from "react";
import { ArrowRight, Check, Sparkles, Shield, Zap } from "lucide-react";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { WAITLIST, ROLES } from "@/content/landing";

const VALUE_ICONS = [Sparkles, Shield, Zap] as const;

export default function WaitlistForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    website: "", // honeypot
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.website) return; // honeypot

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company || undefined,
          role: formData.role || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else if (res.status === 429) {
        setError("Too many requests. Please try again later.");
      } else {
        setError(
          "Something went wrong. Please try again or email us directly."
        );
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="waitlist" className="py-28 px-8 bg-ice">
      <div className="max-w-[1100px] mx-auto">
        {submitted ? (
          <RevealOnScroll>
            <div className="max-w-[640px] mx-auto px-8 py-10 bg-white rounded-2xl border-2 border-green text-center shadow-md">
              <div className="w-[52px] h-[52px] rounded-full bg-green-bg flex items-center justify-center mx-auto mb-4">
                <Check
                  size={24}
                  strokeWidth={3}
                  className="text-green"
                  aria-hidden="true"
                />
              </div>
              <div className="text-xl font-bold text-text mb-1.5">
                {WAITLIST.successTitle}
              </div>
              <div className="text-[15px] text-text-secondary">
                {WAITLIST.successDescription}
              </div>
            </div>
          </RevealOnScroll>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: Value props */}
            <RevealOnScroll>
              <span className="inline-block text-xs font-semibold text-slate-light uppercase tracking-[0.08em] mb-3">
                {WAITLIST.sectionLabel}
              </span>
              <h2 className="text-[clamp(2rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-text mb-4">
                {WAITLIST.heading}
              </h2>
              <p className="text-[17px] text-text-secondary leading-[1.7] mb-8 max-w-[440px]">
                {WAITLIST.description}
              </p>

              <div className="flex flex-col gap-4">
                {WAITLIST.valueProps.map((vp, i) => {
                  const Icon = VALUE_ICONS[i]!;
                  return (
                    <div key={vp.title} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent-bg flex items-center justify-center shrink-0">
                        <Icon
                          size={18}
                          strokeWidth={1.5}
                          className="text-accent"
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text">
                          {vp.title}
                        </div>
                        <div className="text-[13px] text-text-secondary">
                          {vp.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RevealOnScroll>

            {/* Right: Form card */}
            <RevealOnScroll delay="reveal-d1">
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl p-8 sm:p-9 shadow-lg border border-border"
              >
                <h3 className="text-xl font-bold text-text mb-6">
                  {WAITLIST.formTitle}
                </h3>

                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="absolute -left-[9999px] opacity-0 h-0"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-[13px] font-semibold text-text mb-1.5"
                    >
                      Full Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Jane Smith"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-border rounded-lg text-[15px] font-sans outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white placeholder:text-text-tertiary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[13px] font-semibold text-text mb-1.5"
                    >
                      Work Email *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="jane@company.com"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-border rounded-lg text-[15px] font-sans outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white placeholder:text-text-tertiary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="company"
                      className="block text-[13px] font-semibold text-text mb-1.5"
                    >
                      Company
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      placeholder="Acme Corp"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-border rounded-lg text-[15px] font-sans outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white placeholder:text-text-tertiary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="role"
                      className="block text-[13px] font-semibold text-text mb-1.5"
                    >
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      className={`w-full px-4 py-3 border border-border rounded-lg text-[15px] font-sans outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white ${
                        formData.role ? "text-text" : "text-text-tertiary"
                      }`}
                    >
                      <option value="">Select role</option>
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-[15px] font-semibold bg-canvas text-white hover:bg-canvas-light hover:-translate-y-px hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {submitting ? "Submitting..." : WAITLIST.submitLabel}
                  {!submitting && (
                    <ArrowRight
                      size={15}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  )}
                </button>

                <div className="text-center mt-3.5 text-[13px] text-text-tertiary">
                  {WAITLIST.footnote}
                </div>
              </form>
            </RevealOnScroll>
          </div>
        )}
      </div>
    </section>
  );
}
