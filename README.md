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

Sign in with any seeded account:

| Account | Password |
| --- | --- |
| `alex@campus.edu`, `priya@campus.edu`, `sam@campus.edu`, `mei@campus.edu`, `diego@campus.edu`, `fatima@campus.edu`, `tom@campus.edu`, `anika@campus.edu` | `SEED_PASSWORD` (default `campus1234`) |
| `srushti24extc@student.mes.ac.in`, `shraddha24ecs@student.mes.ac.in` | `qwerty@12` |

The seed prints the full list with each account's password when it runs.

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

The updated visual identity uses cream/paper surfaces, forest green, DM Sans + Space Mono,
and explicit category illustrations for missing photos. See the upgrade guide below.

## Testing

- **Vitest** covers the layers that hold rules: `Money`, branded types, the listing
  mode/price policy, trust-score derivation, the messaging participant policy, and the
  validation schemas.
- **Playwright** covers the happy path against a real seeded database: sign up → publish →
  search → save → message a seller, plus auth gating and URL-driven filters.
- **dependency-cruiser** covers the architecture itself.

CI runs all of it on Node 22 against a Postgres service container.

## Campus noticeboard upgrade

The marketplace now uses a paper-and-forest-green noticeboard design, a compact desktop
header, mobile navigation, and category drawings explicitly labeled when a seller has not
uploaded a photo. Search and filters remain shareable URLs.

A student can both buy and sell. In a listing conversation, the seller opens **Ready for the
handoff?**, enters the agreed price, and requests buyer confirmation. This reserves the
listing. Only that buyer can confirm receipt; either participant can cancel a pending
request. Buying and Selling tabs in **My Loop** show the saved history. Rental completion
means handover; the seller reopens the listing after return. Payments remain offline.

Completed records survive listing deletion/reopening. Account deletion removes personal
account data and conversations, while the other participant retains an anonymized handoff
record. Existing sold listings are retained without guessing a buyer. New reviews require
an actual completed handoff; existing reviews remain.

### Administration

Register the administrator's account, then grant access explicitly:

```bash
npm run admin:grant -- existing-student@example.com
```

This uses `.env.local`'s database, so select the intended environment first. The student must
sign in again. `/admin` has Overview, Users, Listings, Deals, Reports, and Email sections.
Admins can search/filter/paginate records, export filtered user/listing/deal CSVs, suspend or
restore students, hide or restore listings, and resolve reports. Actions require a reason
and are recorded in the audit history. Admin accounts cannot be suspended from this UI.
Suspension and password recovery revoke previously issued sessions.

### Email and recovery

Configure these server-side variables locally and in the deployment environment:

```dotenv
RESEND_API_KEY=<your-key>
EMAIL_FROM="Campus Loop <campus-loop@hanind.in>"
EMAIL_DELIVERY=resend
NEXT_PUBLIC_SITE_URL=https://your-campus-loop-site.example
```

The sending domain must be verified in Resend. Keep keys in ignored environment files or
hosting secrets. `EMAIL_DELIVERY=disabled` prevents real delivery during development/tests;
the UI never reports provider acceptance for disabled delivery.

Message alerts are queued when a conversation changes from read to unread, once until it
is read again. Handoff requests, completions, and cancellations notify both participants.
Students can switch these notifications off in Settings. Email links lead back into the
app; conversation bodies are excluded. There is no signup email-verification requirement.

Notification jobs are saved in the same transaction as the triggering update. After the
request commits, a bounded worker submits jobs with stable Resend idempotency keys and up
to three attempts. The Email admin page shows queued, sending, accepted, failed, and skipped
states; accepted means provider submission, not confirmed inbox delivery. Failed or
interrupted jobs can be retried for 23 hours, within Resend's 24-hour deduplication window.
No separate scheduler is required; admin retries also trigger dispatch.

Password-reset emails are sent directly. Reset tokens are hashed in the database, expire
after 30 minutes, and can be consumed once. Requests are rate limited and do not disclose
whether an account exists. Raw tokens and email credentials are never logged. Reset failures
are logged by request ID, and the student can request another link.

### Migration and verification

Apply committed migrations before running the new app against an existing database:

```bash
npm run db:deploy
```

`prisma.config.ts` prefers `DATABASE_URL_UNPOOLED` for migrations; runtime traffic still
uses `DATABASE_URL`. On Neon, test the migration on an isolated development branch first.
For local Docker, both URLs should point to `postgresql://campus:campus@localhost:5432/campus_loop`.
The upgrade adds tables/columns without inventing historical deals or replacing accounts.

```bash
npm run verify
npm run test:integration
E2E_DATABASE_URL=postgresql://campus:campus@localhost:5432/campus_loop npm run e2e
npm run build
```

`test:integration` only connects to local Docker Postgres, mocks all email calls, and cleans
up the records it creates. It checks all four listing modes, concurrent buyers, cancellation,
moderation, email preferences/retries, reset expiry/reuse, and anonymized deletion history.
The additional Playwright tests use `E2E_DATABASE_URL` for isolated fixtures, exercise real
browser sessions, and check layouts at 360, 768, and 1440 pixels. CI runs these against local
Postgres with real email delivery disabled.

If another development server is already running, use `NEXT_DIST_DIR=.next-e2e`, a different
port, and matching `AUTH_URL`/`NEXT_PUBLIC_SITE_URL`/`E2E_BASE_URL` values for an isolated test
server. Never run these browser tests against the live marketplace.
