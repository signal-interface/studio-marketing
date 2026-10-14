// Content-Security-Policy builder (pure, tested). Used by src/middleware.ts.
//
// `upgrade-insecure-requests` is only emitted for documents served over
// HTTPS. On a plain-HTTP origin (e.g. a LAN/Tailscale review server) the
// directive makes the browser rewrite every /_next/static asset to
// https://, which the HTTP server cannot answer — the page then renders as
// unstyled, unhydrated SSR HTML. (Loopback is exempt in Chrome, which is
// why localhost testing does not show it.)

export function buildCsp(nonce: string, opts: { dev: boolean; https: boolean }): string {
  const { dev, https } = opts;
  return [
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
    ...(!dev && https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** Whether the original request reached us over HTTPS (directly or via a proxy). */
export function isHttps(protocol: string, forwardedProto: string | null): boolean {
  const fwd = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  return fwd ? fwd === "https" : protocol === "https:";
}
