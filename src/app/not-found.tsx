import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <h1 className="text-6xl font-bold text-text mb-4">404</h1>
      <p className="text-lg text-text-secondary mb-8">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[15px] font-semibold bg-canvas text-white hover:bg-canvas-light transition-all"
      >
        Back to Studio
      </Link>
    </div>
  );
}
