import { expect, test, type Page } from "@playwright/test";

/**
 * The happy path, end to end: sign up → publish → find → save → message a seller.
 *
 * Each run creates a fresh student so the suite can run repeatedly against the same
 * database without colliding on the unique email index.
 */
const stamp = Date.now();
const PASSWORD = "campus1234";
const ITEM_TITLE = `Casio FX-82MS calculator ${stamp}`;

let accountCounter = 0;

/**
 * Registers a brand-new student. Each call gets its own address: the email index is
 * unique, so two tests sharing one would make the second signup fail with EMAIL_TAKEN.
 */
async function signUp(page: Page) {
  accountCounter += 1;
  const email = `robin.${stamp}.${accountCounter}@campus.edu`;

  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Robin Fields");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/confirm/i).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /create account/i }).click();
  // Signup signs you straight in rather than bouncing back to the login form.
  await expect(page).toHaveURL("/", { timeout: 20_000 });
}

test.describe("Campus Loop", () => {
  test("a student can sign up, publish, find, save and message", async ({ page }) => {
    await signUp(page);

    await test.step("publishes a listing", async () => {
      await page.goto("/listings/new");
      await page.getByLabel("Item title").fill(ITEM_TITLE);
      await page
        .getByLabel("Description")
        .fill("Exam-approved scientific calculator, barely used, includes the slide cover.");
      await page.getByLabel("Price (₹)").fill("700");
      await page.getByLabel("Pickup area").fill("North Quad");
      await page.getByRole("button", { name: /publish listing/i }).click();

      await expect(page.getByRole("heading", { name: ITEM_TITLE })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText("₹700")).toBeVisible();
    });

    await test.step("finds it by search", async () => {
      await page.goto("/");
      await page.getByRole("searchbox", { name: /search listings/i }).fill(String(stamp));
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByRole("heading", { name: ITEM_TITLE })).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("sees it in My Loop with the stats updated", async () => {
      await page.goto("/loop");
      await expect(page.getByRole("heading", { name: ITEM_TITLE })).toBeVisible();
      // The prototype's stat tiles were hard-coded zeros; these are computed, and now
      // break down by status rather than showing a total beside two of its own parts.
      await expect(page.getByText(/live listings/)).toBeVisible();
      await expect(page.getByRole("link", { name: "Completed", exact: true })).toBeVisible();
    });

    await test.step("saves someone else's listing", async () => {
      await page.goto("/listings/arduino-uno-r3-starter-kit");
      await page.getByRole("button", { name: /^save$/i }).click();
      // The button is optimistic, so it flips to "Saved" before the write lands. It is
      // disabled for the duration of the transition, so waiting for it to be enabled
      // again is what proves the row is actually durable before we navigate away.
      const savedButton = page.getByRole("button", { name: /saved/i });
      await expect(savedButton).toBeVisible();
      await expect(savedButton).toBeEnabled();

      await page.goto("/saved");
      await expect(
        page.getByRole("heading", { name: "Arduino Uno R3 starter kit" }),
      ).toBeVisible();
    });

    await test.step("messages the seller", async () => {
      await page.goto("/listings/arduino-uno-r3-starter-kit");
      await page.getByRole("button", { name: /message seller/i }).click();
      // Ids are cuids, not ObjectIds — the shape changed with the move to Postgres.
      await expect(page).toHaveURL(/\/messages\/[a-z0-9]{8,}/, { timeout: 20_000 });

      await page.getByRole("textbox", { name: /message/i }).fill("Is this still available?");
      await page.getByRole("button", { name: /send/i }).click();
      await expect(page.getByText("Is this still available?")).toBeVisible({ timeout: 15_000 });
    });
  });

  test("a free listing cannot carry a price", async ({ page }) => {
    // The prototype's mode toggle was decorative — nothing read it — so a "Free" item
    // could be published with ₹500 attached. Here the mode drives the form: choosing
    // Free removes the price field and says why, so the invalid state is unreachable
    // through the UI. The server-side half of the rule is covered by the unit tests in
    // features/listings/domain/listing.test.ts.
    await signUp(page);
    await page.goto("/listings/new");

    await page.getByLabel("Item title").fill(`Chemistry notes ${stamp}`);
    await page
      .getByLabel("Description")
      .fill("Full year of handwritten organic chemistry notes.");
    await expect(page.getByLabel("Price (₹)")).toBeVisible();

    await page.getByRole("button", { name: "Free" }).click();
    await expect(page.getByLabel("Price (₹)")).toBeHidden();
    await expect(page.getByText(/Free listings have no price/i)).toBeVisible();

    await page.getByRole("button", { name: /publish listing/i }).click();

    // It publishes as genuinely free, not as ₹500 mislabelled as free.
    await expect(page.getByRole("heading", { name: `Chemistry notes ${stamp}` })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("₹500")).toHaveCount(0);
  });

  test("keeps filter state in the URL so it survives a reload", async ({ page }) => {
    await page.goto("/?mode=free&category=lab");
    const before = await page.locator("article").count();

    await page.reload();
    await expect(page.locator("article")).toHaveCount(before);
    expect(page.url()).toContain("mode=free");
  });

  test("sends signed-out students to log in for protected pages", async ({ page }) => {
    await page.goto("/loop");
    await expect(page).toHaveURL(/\/login/);
  });
});
