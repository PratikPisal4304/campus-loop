import { expect, test, type Page } from "@playwright/test";

/**
 * Regressions for the Phase 0 security fixes. Each of these passed silently before the
 * fix, which is why they are here rather than left to the unit tests.
 */
const SEEDED = { email: "srushti24extc@student.mes.ac.in", password: "qwerty@12" };

async function logIn(page: Page, email = SEEDED.email) {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/password/i).first().fill(SEEDED.password);
  await page.getByRole("button", { name: /log in/i }).click();
}

test("logging in returns you to the page you were bounced from", async ({ page }) => {
  // Auth.js bounces with `?callbackUrl=<absolute url>`; the login page used to read only
  // `?next=`, so every protected-route bounce silently landed on Discover instead.
  await page.goto("/saved");
  await expect(page).toHaveURL(/\/login/);

  await logIn(page);
  await expect(page).toHaveURL(/\/saved$/, { timeout: 20_000 });
});

test("an off-site redirect target is refused", async ({ page }) => {
  // Browsers normalise the backslash, so `/\evil.example` used to escape the
  // "starts with one slash" check and became a protocol-relative off-site redirect.
  await page.goto(`/login?next=${encodeURIComponent("/\\evil.example")}`);
  await logIn(page, "shraddha24ecs@student.mes.ac.in");

  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/, { timeout: 20_000 });
});

test("the message-seller form carries no recipient for a client to forge", async ({ page }) => {
  // The seller used to travel in a hidden input, so anyone could POST an arbitrary user id
  // and open a thread with any student. The use case now reads it from the listing.
  await page.goto("/login");
  await logIn(page);
  await expect(page).toHaveURL("/", { timeout: 20_000 });

  await page.goto("/listings/arduino-uno-r3-starter-kit");
  await expect(page.getByRole("button", { name: /message seller/i })).toBeVisible();
  await expect(page.locator('input[name="sellerId"]')).toHaveCount(0);
});
