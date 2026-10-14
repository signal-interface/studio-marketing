// Positioning — the one idea behind Studio, stated plainly.
import { POSITIONING } from "@/content/experience";

export default function Positioning() {
  return (
    <section id="how-it-works" className="positioning" aria-labelledby="positioning-heading">
      <p className="eyebrow">{POSITIONING.eyebrow}</p>
      <h2 id="positioning-heading" className="positioning-heading">
        <span>{POSITIONING.lead}</span>
        <span className="positioning-follow">{POSITIONING.follow}</span>
      </h2>
      <ol className="positioning-points">
        {POSITIONING.points.map((p, i) => (
          <li key={p.title}>
            <span className="positioning-n">{String(i + 1).padStart(2, "0")}</span>
            <p className="positioning-title">{p.title}</p>
            <p className="positioning-body">{p.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
