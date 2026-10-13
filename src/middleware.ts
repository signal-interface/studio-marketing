import { NextResponse, type NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────
// Content-Security-Policy with a per-request nonce.
//
// Scripts: only nonce-bearing scripts run ('strict-dynamic' lets them
// load the app's own chunks). No 'unsafe-inline' for scripts. Next.js
// applies the nonce to its framework scripts; the layout applies it to
// the entrance preflight.
//
// Styles: 'unsafe-inline' is retained deliberately — React style
// attributes (artboard sizing, plate swatches) require it, and style
// injection cannot execute script under this script-src. Documented
// trade-off; revisit if the site ever renders untrusted markup.
// ─────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "media-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: API routes, static assets and metadata images need no document CSP.
      source: "/((?!api|_next/static|_next/image|favicon.svg|robots.txt|sitemap.xml|opengraph-image|apple-icon|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
