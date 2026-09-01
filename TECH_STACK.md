# Campus Loop — Tech Stack

A student marketplace for buying, renting, selling and exchanging educational items on campus.

**Live:** https://campus-loop-pratikpisal4304s-projects.vercel.app
**Code:** https://github.com/PratikPisal4304/campus-loop

---

## In one line

A **Next.js** web app written in **TypeScript**, storing data in a **PostgreSQL** database
through **Prisma**, with login handled by **Auth.js**, styled with **Tailwind CSS**, and
hosted on **Vercel**.

---

## The main pieces

| Layer | What we use | What it does |
| --- | --- | --- |
| Language | **TypeScript 5** | JavaScript with types, so mistakes are caught while writing code instead of by users |
| Framework | **Next.js 16** (App Router) | Runs both the pages people see and the server code behind them, in one project |
| UI library | **React 19** | Builds the screens out of reusable components |
| Styling | **Tailwind CSS v4** | Styling written directly in the markup, driven by a set of design tokens |
| Database | **PostgreSQL** | Stores users, listings, messages, reviews and reports |
| Database access | **Prisma 7** | Lets us query the database in TypeScript instead of writing raw SQL, and manages schema changes |
| Login | **Auth.js v5** (NextAuth) | Sign-up, sign-in, and knowing who is logged in |
| Passwords | **bcrypt** | Stores passwords as irreversible hashes, never as text |
| Validation | **Zod 4** | Checks every form submission on the server before it touches the database |
| Image uploads | **Cloudinary** | Listing photos upload straight from the browser to Cloudinary |
| Notifications | **Sonner** | The small "saved / published" toast messages |
| Logging | **Pino** | Server logs, with passwords automatically redacted |

## Tools we develop with

| Tool | Why |
| --- | --- |
| **Vitest** | Unit tests — 204 of them, covering the rules (prices, ratings, permissions) |
| **Playwright** | Browser tests that click through the real app like a student would |
| **ESLint** + **Prettier** | Catches bad patterns and keeps formatting consistent |
| **dependency-cruiser** | Checks the code structure itself (explained below) |
| **Docker** | Runs PostgreSQL on your own machine while developing |
| **GitHub Actions** | Runs every test automatically on each push |

## Where it runs

| Service | Purpose |
| --- | --- |
| **Vercel** | Hosts the website |
| **Neon** | The PostgreSQL database in production |
| **Cloudinary** | Stores and serves listing photos |
| **GitHub** | Source code and automated testing |

Node.js 22+ is required to run the project.

---

## How the code is organised

The project is grouped by **what it does for the user**, not by file type. Instead of one
big `components/` and one big `pages/` folder, each capability owns its own folder:

```
src/
  core/         Basic building blocks used everywhere (money, IDs, error types)
  shared/       Shared plumbing (database connection, logging, settings)
  features/
    accounts/     Signing up, logging in, profiles
    listings/     Creating, browsing and searching items
    messaging/    Conversations between students
    reviews/      Ratings and the trust score
    moderation/   Reporting and the admin view
  app/          The actual pages and URLs
  components/   Buttons, inputs and other shared UI
```

Inside every feature the same four layers repeat:

| Layer | Contains | Example |
| --- | --- | --- |
| `domain` | The rules, as plain TypeScript | "A free listing cannot have a price" |
| `application` | The actions a user can take | "Create a listing", "Send a message" |
| `infrastructure` | Talking to the database and outside services | Prisma queries |
| `index.ts` | The feature's public entrance | Everything else must enter here |

**Why it matters:** the rules live in `domain`, which knows nothing about the database or
the website. That kept its value when we switched the whole project from MongoDB to
PostgreSQL — only the `infrastructure` folders changed, and all the tests still passed
without a single edit.

These boundaries aren't just a convention — `dependency-cruiser` and ESLint check them
automatically, so breaking the structure fails the build.

---

## Things worth knowing

- **Money is stored as whole paise, never decimals.** `0.1 + 0.2` doesn't equal `0.3` in
  computer arithmetic, so prices are kept as whole numbers (₹500 is stored as `50000`) and
  only turned into "₹500" when displayed.
- **Everything is checked twice.** Forms give instant feedback in the browser, but the
  server re-checks every field, because anything sent from a browser can be faked.
- **Colours are tested.** A script checks every text/background pair against the WCAG
  accessibility standard and fails the build if any becomes hard to read.

## What this project deliberately does *not* do

- **No payments.** Students arrange the exchange themselves and meet on campus.
- **No delivery or shipping.**
- **No email.** There's no password-reset email or notification email yet.

---

## Commands

```bash
npm install          # install everything
npm run db:up        # start the local database (needs Docker)
npm run db:deploy    # set up the database tables
npm run db:seed      # add demo students and listings
npm run dev          # start the site at localhost:3000

npm run verify       # run all the checks (types, lint, structure, colours, tests)
npm run e2e          # run the browser tests
```
