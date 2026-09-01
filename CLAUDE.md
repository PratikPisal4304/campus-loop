# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Campus Loop — a student marketplace where students buy, rent, sell, exchange and give away
educational items. Next.js 16 · MongoDB/Mongoose · Auth.js v5 · Tailwind v4.

`legacy/` holds the original static HTML/CSS/JS prototype this replaced. It is reference
material only — nothing imports it, and ESLint ignores it.

## Architecture: feature-based clean architecture

Top level is organised by **business capability**, not technical role. Inside each feature,
the four clean-architecture layers repeat and dependencies point inward.

```
src/core/         pure primitives (Result, AppError, Money, branded types) — no vendors, no framework
src/shared/       cross-cutting infra (db, media, env, logger, ui utils) — no business rules
src/features/<capability>/
    domain/           entities, value objects, policies, PORT interfaces. Pure TS.
    application/      use cases orchestrating domain + ports. Returns Result.
    infrastructure/   adapters: mongoose schemas/mappers/repositories, vendor SDKs.
    index.ts          the feature's PUBLIC API — the only path other code may import.
src/app/          Next.js routing only. Thin controllers.
src/components/   ui/ (primitives) and brand/ (Campus Loop design system)
```

Dependency direction: `app → features → shared → core`.

Features: **accounts** (auth, profile, trust score) · **listings** (CRUD, search, filters,
saved items) · **messaging** (conversations, messages).

**Enforced by `npm run test:arch` (dependency-cruiser) and ESLint `no-restricted-imports`.**
If a rule blocks you, the design is wrong — do not weaken the rule.

## Non-negotiables

- **Money is integer paise** (`core/domain/money.ts`). No float rupees anywhere. Format only
  in presentation, via `Money.format()`.
- **Expected failures return `Result`**, not exceptions. Throw only for the genuinely
  exceptional (dead connection, missing secret).
- **Repositories return domain entities**, never Mongoose documents. Mappers sit beside schemas.
- **Server actions are thin**: `requireUser()` → Zod-parse → call use case → map Result →
  `revalidatePath`. Every mutating action calls the guard itself — `src/proxy.ts` gates
  navigation but does **not** run for a direct server-action invocation.
- **Never trust the client.** Client-side validation in `shared/ui/validation.ts` is for
  feedback only; the server re-parses everything.
- No `any`, no `!` assertions, no TS `enum` (use `as const` + string-literal unions).
  `strict` + `noUncheckedIndexedAccess` are on.
- Cross-feature imports go through `@/features/<name>`, never a deep path.
- Zod v4 syntax: `z.email()`, not `z.string().email()`.

## Design system

Tokens in `src/app/globals.css` are lifted verbatim from the prototype's `style.css`
(cream/paper grounds, `#f36b38` orange, teal, DM Sans + Space Mono). Components reference
the **semantic** aliases (`--color-bg`, `--color-accent`, `bg-surface`, `text-fg-muted`),
never a raw hex.

The identity lives in two details, so preserve them: every eyebrow/badge/price is Space
Mono at 8–11px, uppercase, wide-tracked; every display heading is DM Sans with heavy
negative tracking. Listings with no photo fall back to one of eight colour swatches with an
offset circle outline — that is deliberate, not a missing image.

## Commands

```
npm run db:up          local MongoDB single-node replica set via Docker (needed first)
npm run dev            develop
npm run db:seed        8 students, 32 listings, saved items, one conversation
npm run db:indexes     sync indexes to the schemas — also required on every deploy
npm run verify         typecheck + lint + arch tests + unit tests — before every commit
npm run e2e            Playwright suite (needs a seeded database)
```

Demo accounts after seeding: `alex@campus.edu` … `anika@campus.edu`, password from
`SEED_PASSWORD` (default `campus1234`).

## Traps already hit — do not re-introduce

- **A unique index over an array field is multikey.** `{listingId, participantIds}` unique
  enforces one thread per listing per *person*, so the second buyer to message a seller
  fails with E11000. Conversations key on the derived scalar `pairKey` instead
  (`conversationKey()` in `messaging/domain/conversation.ts`).
- **`sparse: true` does not skip an explicit `null`.** Use `partialFilterExpression` with a
  `$type` check (see `saved-item.schema.ts`, `conversation.schema.ts`).
- **`formData.get()` returns `null` for a field the form did not render**, and Zod's
  `.optional()` rejects `null`. Funnel form reads through the `field()` helper in
  `_actions/listings.ts`, or a sale fails validation on the rental period it never showed.
- **A `"use server"` file may only export async functions.** Form-state constants live in
  `_actions/form-state.ts`.
- **`@/features/listings` is `server-only`.** A `"use client"` component importing it drags
  mongoose into the browser bundle and fails the build — import `@/features/listings/client`
  for the pure domain vocabulary.
- **The Auth.js `session` callback belongs in `auth.config.ts`** (the edge half), not
  `auth.ts`. The proxy builds its session from that config alone, and without it every
  ownership check downstream sees an undefined user id.
- **Scripts importing feature modules need `--conditions=react-server`**, or `server-only`
  throws under plain Node.
- **Next 16 renamed `middleware.ts` to `src/proxy.ts`**, and `params`/`searchParams` are async.
