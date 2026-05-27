# Studio Marketing

Marketing site for **Studio — Creative Intelligence**, a Faraday Capital Systems product.

Next.js 15 · TypeScript (strict + noUncheckedIndexedAccess) · Tailwind 4 · App Router

## Status

- **Marketing site**: early-access waitlist landing page (this repo).
- **Studio product app**: the 5-component canvas shell currently lives inside `faraday-platform` at `apps/web/.../studio/`. It is pending extraction to the `faraday-studio` org (Phase 3C) and will be federated into the platform shell via Module Federation after ProductMountAPI exists.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run build      # production build
```

## Environment Variables

| Variable             | Purpose                                 |
| -------------------- | --------------------------------------- |
| `RESEND_API_KEY`     | Resend API key for transactional email  |
| `WAITLIST_NOTIFY_TO` | Internal recipient for new submissions  |
| `WAITLIST_FROM`      | Verified sender (studio.faradaycapitalsystems.com) |

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

## Waitlist API

`POST /api/waitlist` — honeypot spam filter + in-memory IP rate limiter (5 requests/hour per IP) + Resend dual-email (internal notification + auto-response to submitter).

**Note:** The rate limiter is in-memory / per-process. On serverless (Vercel), each cold start resets the map, so this is soft protection only. Upgrade to a shared store (Upstash / Redis) if real traffic arrives.

## Content

All placeholder copy lives in `src/content/landing.ts`. Every string is marked `// PLACEHOLDER — replace in content port`. Components are clean layout shells that import from this module, so the content swap is a module replacement, not a refactor.

## Deployment

Deployed to Vercel at `studio.faradaycapitalsystems.com`. See vercel.json for redirect config.
