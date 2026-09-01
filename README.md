# Campus Loop

A student marketplace: buy what you need, rent what you need temporarily, sell what you no
longer use, and exchange or give away useful things with students around campus.

Next.js 16 (App Router) · TypeScript · Postgres/Prisma · Auth.js v5 · Tailwind CSS v4.

**Live:** https://campus-loop-pratikpisal4304s-projects.vercel.app

Deployed on Vercel with a Neon Postgres database.

---

## Getting started

Requires **Node 22+** and **Docker** (for the local database).

```bash
npm install
cp .env.example .env.local          # then set AUTH_SECRET (see below)
npm run db:up                       # Postgres in Docker
npm run db:deploy                   # apply migrations
npm run db:seed                     # 8 students, 32 listings, a conversation
npm run dev                         # http://localhost:3000
```

Generate the auth secret with:

```bash
openssl rand -base64 32
```

Sign in with any seeded account — `alex@campus.edu`, `priya@campus.edu`, `sam@campus.edu`,
`mei@campus.edu`, `diego@campus.edu`, `fatima@campus.edu`, `tom@campus.edu`,
`anika@campus.edu` — using the password in `SEED_PASSWORD` (default `campus1234`).

Photo uploads are optional. Without Cloudinary credentials the upload box explains itself
and listings fall back to their colour tile; everything else works.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run db:up` / `db:down` | Start/stop local Postgres (data survives `down`) |
| `npm run db:seed` | Seed demo data — idempotent, safe to re-run |
| `npm run db:migrate` | Create and apply a migration after editing the schema |
| `npm run db:deploy` | Apply committed migrations — what production runs |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run verify` | typecheck + lint + architecture tests + unit tests |
| `npm run test` | Vitest unit tests |
| `npm run test:arch` | dependency-cruiser architecture boundaries |
| `npm run e2e` | Playwright end-to-end suite |
| `npm run format` | Prettier |
| `npm run db:cleanup-e2e` | Delete throwaway accounts/listings the e2e suite creates |

Run `npm run verify` before every commit.

## Architecture

Organised by **business capability**, not technical role. Inside each feature the four
clean-architecture layers repeat, and dependencies only ever point inward.

```
src/
  core/         Result, AppError, Money (integer paise), branded types — pure TypeScript
  shared/       db, media, env, logger, UI utilities — infrastructure, no business rules
  features/
    accounts/     auth, profile, trust score
    listings/     CRUD, search, filters, saved items
    messaging/    conversations and messages
      domain/           entities, policies, port interfaces  (pure)
      application/      use cases — return Result
      infrastructure/   prisma repositories, mappers, adapters
      index.ts          the feature's public API and composition root
  app/          routing only — thin controllers
  components/   ui/ primitives + brand/ design system
```

`app → features → shared → core`. Cross-feature imports go through the feature's barrel.

Those boundaries are **executable, not advisory**: `npm run test:arch` (dependency-cruiser)
and ESLint's `no-restricted-imports` both fail the build on a violation. Importing
`@/features/listings/domain/listing` from a page is a CI failure, not a code-review comment.

Three ideas carry most of the weight:

- **`Result<T, E>` for expected failures.** A closed listing or a non-participant reading a
  thread is a business outcome, not an exception. Use cases return a discriminated union
  the compiler forces callers to handle; exceptions are reserved for dropped connections
  and misconfiguration.
- **Ports and adapters.** `domain/` declares interfaces; `infrastructure/` implements them
  with Prisma and returns domain entities, never rows. The feature's `index.ts` is the
  composition root that binds the two, so nothing outside a feature ever sees a repository.
  This paid for itself: migrating from MongoDB to Postgres touched only `infrastructure/`
  and the seed script — every domain and application file compiled unchanged.
- **Money as integer paise.** Float rupees lose fractions; a `Money` value object holds
  whole minor units and only becomes a string at the presentation edge.

## Authorization

Three layers, deliberately:

1. `src/proxy.ts` (Next 16's renamed middleware) gates navigation on the edge with no
   database round-trip.
2. Protected pages call `requireUser()`.
3. **Every mutating server action calls the guard itself** — the proxy does not run for a
   direct server-action invocation, so this is the layer that actually protects writes.

Ownership is checked in the use case, not the route: only a seller can edit or delete their
listing, and only a participant can read or post to a conversation.

## What changed from the prototype

The original static site is preserved in `legacy/`. It looked complete and was mostly
scaffolding — worth knowing, because several decisions here are direct responses to it:

- Every `onclick` in `legacy/index.html` called a function that was never written, so the
  listings grid was permanently empty and clicking anything threw a `ReferenceError`.
- "Auth" was one record in `localStorage` holding a **plaintext password**, so exactly one
  account could exist per browser. Now: bcrypt hashes in Postgres behind Auth.js, with
  sign-in failures that don't reveal whether an email is registered.
- The sell/rent/exchange/free toggle was decorative — nothing read it — so a "Free" item
  could be published with a price attached. That rule now lives in the domain
  (`priceRuleFor`, `validatePrice`) and is enforced in the form, the server action and the
  seed script alike.
- The four-bar password strength meter was drawn but never wired; the bars were always
  empty. It now runs on a real scorer.
- The messaging UI, profile page and listing cards existed only as CSS. They are built.
- Filters were client-side functions that never existed; filter state now lives in the URL,
  so a filtered view is shareable and survives a reload.

The visual identity is deliberately kept: the cream/paper palette, DM Sans + Space Mono, the
tight negative tracking on display type, and the eight colour swatches that stand in for
missing photos.

## Testing

- **Vitest** covers the layers that hold rules: `Money`, branded types, the listing
  mode/price policy, trust-score derivation, the messaging participant policy, and the
  validation schemas.
- **Playwright** covers the happy path against a real seeded database: sign up → publish →
  search → save → message a seller, plus auth gating and URL-driven filters.
- **dependency-cruiser** covers the architecture itself.

CI runs all of it on Node 22 against a Postgres service container.
