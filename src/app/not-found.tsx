import Link from "next/link";

export default function NotFound() {
  return (
    <main className="legal not-found">
      <p className="eyebrow">404</p>
      <h1 className="legal-heading">Nothing has been made here yet.</h1>
      <Link href="/" className="canvas-cta">
        Back to Studio
      </Link>
    </main>
  );
}
