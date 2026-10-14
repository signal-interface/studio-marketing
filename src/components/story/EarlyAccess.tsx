"use client";

// ─────────────────────────────────────────────────────────────
// Early access — the end of the story returns to the universe.
//
// The page falls from the white canvas back into deep space, where
// the visitor is invited to continue. The form posts to the existing
// /api/waitlist contract unchanged (same fields, same honeypot).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { ACCESS } from "@/content/experience";
import { ROLES } from "@/content/landing";
import { mulberry32 } from "@/lib/creation/sample";

function drawStars(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const rnd = mulberry32(0x5f3759);
  const count = Math.round((w * h) / 900);
  for (let i = 0; i < count; i++) {
    // Clustered: some stars gather near a faint diagonal band.
    let x = rnd() * w;
    let y = rnd() * h;
    if (rnd() < 0.45) {
      const t = rnd();
      x = t * w + (rnd() - 0.5) * w * 0.18;
      y = h * (0.25 + 0.5 * t) + (rnd() - 0.5) * h * 0.2;
    }
    const m = Math.pow(rnd(), 9); // steep magnitude law: mostly faint
    const r = 0.35 + m * 1.3;
    const a = 0.12 + m * 0.88;
    const warm = rnd();
    g.fillStyle = warm < 0.15 ? `rgba(200,215,255,${a})` : warm > 0.85 ? `rgba(255,228,196,${a})` : `rgba(255,255,255,${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    if (m > 0.35) {
      const grd = g.createRadialGradient(x, y, 0, x, y, r * 7);
      grd.addColorStop(0, `rgba(255,255,255,${m * 0.18})`);
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
    }
  }
}

export default function EarlyAccess() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", website: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    let drawn = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !drawn) {
          drawn = true;
          drawStars(c);
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(c);
    let t: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => drawn && drawStars(c), 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      io.disconnect();
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) return; // honeypot
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company || undefined,
          role: form.role || undefined,
        }),
      });
      if (res.ok) setDone(true);
      else if (res.status === 429) setError(ACCESS.errors.rate);
      else {
        const code = res.status === 400 ? ((await res.json().catch(() => ({}))) as { error?: string }).error : undefined;
        setError(
          code === "invalid_email"
            ? ACCESS.errors.email
            : code === "invalid_name" || code === "name_required"
              ? ACCESS.errors.name
              : code === "invalid_company"
                ? ACCESS.errors.company
                : ACCESS.errors.generic
        );
      }
    } catch {
      setError(ACCESS.errors.network);
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <section id="waitlist" className="access" aria-labelledby="access-heading">
      <span id="early-access" className="anchor" aria-hidden="true" />
      <canvas ref={canvasRef} className="access-stars" aria-hidden="true" />
      <div className="access-inner">
        <p className="access-lead">{ACCESS.lead}</p>
        <h2 id="access-heading" className="access-heading">
          {ACCESS.heading}
        </h2>
        <p className="access-body">{ACCESS.body}</p>

        {done ? (
          <div ref={successRef} className="access-success" tabIndex={-1} role="status">
            <p className="access-success-title">{ACCESS.successTitle}</p>
            <p>{ACCESS.successBody}</p>
          </div>
        ) : (
          <form className="access-form" onSubmit={submit} noValidate={false}>
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={set("website")}
              className="access-hp"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <div className="access-grid">
              <label className="access-field">
                <span>Name</span>
                <input name="name" type="text" required autoComplete="name" maxLength={100} value={form.name} onChange={set("name")} />
              </label>
              <label className="access-field">
                <span>Email</span>
                <input name="email" type="email" required autoComplete="email" maxLength={254} value={form.email} onChange={set("email")} />
              </label>
              <label className="access-field">
                <span>
                  Company <em>optional</em>
                </span>
                <input name="company" type="text" autoComplete="organization" maxLength={120} value={form.company} onChange={set("company")} />
              </label>
              <label className="access-field">
                <span>
                  Role <em>optional</em>
                </span>
                <select name="role" value={form.role} onChange={set("role")}>
                  <option value="">Select</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && (
              <p className="access-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="access-submit" disabled={submitting}>
              {submitting ? ACCESS.submitting : ACCESS.submit}
            </button>
            <p className="access-privacy">
              {ACCESS.privacy} <a href="/privacy">Privacy</a>
            </p>
          </form>
        )}
        <noscript>
          <p className="access-privacy">{ACCESS.noscript}</p>
        </noscript>
      </div>
    </section>
  );
}
