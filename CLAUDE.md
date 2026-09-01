# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Campus Loop is a static, no-build front-end prototype for a student marketplace. There is no package.json, bundler, test runner, or server — the whole app is plain HTML/CSS/JS served as-is.

## Running the app

There is no build/lint/test tooling. To preview, open the HTML files directly in a browser or serve the directory statically, e.g.:

```
python3 -m http.server 8000
```

Then visit `index.html`, `login.html`, or `signup.html`.

## Architecture

- `index.html` — the dashboard/marketplace page (listings, search box, messaging UI, chat panels). Most of this markup (search, message-seller button, conversation/chat panels, loop delete button) is static scaffolding styled via inline `<style>` in `index.html` and `style.css`, but has **no JS behavior wired up yet** — only `displayUser()`/`logout()` from `script.js` run on this page.
- `login.html` / `signup.html` — standalone auth pages, each with their own stylesheet (`login.css` / `signup.css`) mirroring the ids/handlers expected by `script.js` (`loginForm`, `loginEmail`, `loginPassword`, `signupForm`, `signupName`, `signupEmail`, `signupPassword`, `signupConfirm`, and inline `onclick` handlers like `togglePassword()`, `forgotPassword(event)`, `googleLogin()`).
- `script.js` — all client-side logic, shared across pages via a plain `<script src="script.js">` tag (no modules/bundler). Each feature block guards itself with `if (formElementExists)` so the same file can be safely included on pages that don't have that form. Implements:
  - Signup: validates fields, writes a single user object to `localStorage["campusUser"]`.
  - Login: reads `campusUser` from localStorage, checks credentials, sets `loggedIn` / `currentUser` / `currentEmail` in localStorage on success.
  - Dashboard: `displayUser()` renders the logged-in user's name/initials into `.user-name` / `.user-avatar`.
  - `logout()` clears the login-related localStorage keys.
  - `togglePassword()`, `forgotPassword()`, `googleLogin()` are stubs (Google login and password reset are not implemented — they just alert).
- **Auth/data model**: there is no backend. All "auth" is a single user record in `localStorage` (`campusUser`), so only one signed-up account can exist in a given browser at a time — signing up again overwrites the previous account only if the email doesn't already match.
- `campus_loop_backup.db` — a SQLite backup file at the repo root; not currently read/written by any code in this repo (no server-side code exists here).

## Conventions to preserve when editing

- Keep new client logic in `script.js`, guarded with an existence check on the relevant form/element (matches the existing pattern for signup/login/dashboard blocks) so the file stays safe to include on every page.
- Follow the existing heavily-spaced formatting style in `script.js` (blank lines between statements, one statement per block) when editing that file, for consistency with the surrounding code.
