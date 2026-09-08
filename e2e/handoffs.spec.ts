import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.E2E_DATABASE_URL;
const enabled = Boolean(
  databaseUrl && ["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname),
);
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl ?? "postgresql://campus:campus@localhost:5432/campus_loop",
  }),
});
const stamp = `browser-${Date.now()}`;
const password = "CampusBrowser123";
const seller = {
  id: randomBytes(12).toString("hex"),
  email: `seller.${stamp}@example.test`,
  name: "Browser Seller",
};
const buyer = {
  id: randomBytes(12).toString("hex"),
  email: `buyer.${stamp}@example.test`,
  name: "Browser Buyer",
};
const admin = {
  id: randomBytes(12).toString("hex"),
  email: `admin.${stamp}@example.test`,
  name: "Browser Admin",
};
const slug = `${stamp}-calculator`;

async function login(page: Page, email: string, secret = password) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(secret);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("confirmed handoffs and administration", () => {
  test.skip(!enabled, "Set E2E_DATABASE_URL to the isolated local test database.");
  test.beforeAll(async () => {
    if (!enabled) return;
    for (const account of [seller, buyer, admin])
      await db.user.create({
        data: {
          ...account,
          passwordHash: await bcrypt.hash(password, 4),
          role: account === admin ? "admin" : "student",
        },
      });
    await db.listing.create({
      data: {
        slug,
        title: `${stamp} calculator`,
        description: "A calculator for the browser handoff test",
        category: "calculators",
        condition: "good",
        mode: "sell",
        pricePaise: 12000,
        pickupArea: "Library steps",
        swatch: "green",
        sellerId: seller.id,
      },
    });
  });
  test.afterAll(async () => {
    if (enabled) {
      await db.deal.deleteMany({ where: { title: { startsWith: stamp } } });
      await db.adminAudit.deleteMany({ where: { actorId: admin.id } });
      await db.user.deleteMany({ where: { id: { in: [seller.id, buyer.id, admin.id] } } });
    }
    await db.$disconnect();
  });

  test("both students confirm and see durable buying/selling histories", async ({
    browser,
    page,
  }) => {
    test.setTimeout(60000);
    await login(page, buyer.email);
    await page.goto(`/listings/${slug}`);
    await page.getByRole("button", { name: /message seller/i }).click();
    await expect(page).toHaveURL(/\/messages\//);
    const conversationUrl = page.url();
    const sellerContext = await browser.newContext();
    const sellerPage = await sellerContext.newPage();
    await login(sellerPage, seller.email);
    await sellerPage.goto(conversationUrl);
    await sellerPage.getByText("Ready for the handoff?", { exact: true }).click();
    await sellerPage.getByLabel(/agreed price/i).fill("110");
    await sellerPage.getByRole("button", { name: "Request buyer confirmation" }).click();
    await expect(
      sellerPage.getByText("Waiting for the buyer to confirm receipt.", { exact: false }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Agreed: ₹110/)).toBeVisible();
    await page.getByRole("button", { name: "I received the item" }).click();
    await expect(page.getByRole("button", { name: "Cancel request" })).toHaveCount(0);
    await page.goto("/loop?tab=buying");
    await expect(page.getByRole("heading", { name: `${stamp} calculator` })).toBeVisible();
    await expect(page.getByText("completed", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("completed", { exact: true })).toBeVisible();
    await sellerPage.goto("/loop?tab=selling");
    await expect(sellerPage.getByText("completed", { exact: true })).toBeVisible();
    await sellerContext.close();
  });

  test("admin suspension revokes existing sessions and exports are protected", async ({
    browser,
    page,
  }) => {
    test.setTimeout(60000);
    await login(page, buyer.email);
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, admin.email);
    await adminPage.goto(`/admin/users?q=${encodeURIComponent(buyer.email)}`);
    await adminPage.getByText("Manage record", { exact: true }).click();
    await adminPage.getByLabel("Reason for this change").fill("Browser suspension test");
    await adminPage.getByRole("button", { name: "Apply change" }).click();
    await expect(adminPage.getByRole("cell", { name: "Suspended", exact: true })).toBeVisible();
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
    await adminPage.getByLabel("Reason for this change").fill("Restore after browser test");
    await adminPage.getByRole("button", { name: "Apply change" }).click();
    await expect(adminPage.getByRole("cell", { name: "Active", exact: true })).toBeVisible();
    const csv = await adminPage.request.get(
      `/api/admin/export?section=users&q=${encodeURIComponent(buyer.email)}`,
    );
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const text = await csv.text();
    expect(text).toContain(buyer.email);
    expect(text).not.toContain("passwordHash");
    expect((await page.request.get("/api/admin/export?section=users")).status()).toBe(404);
    await adminContext.close();
  });

  test("password recovery invalidates the old session and rejects a reused link", async ({
    browser,
    page,
  }) => {
    test.setTimeout(60000);
    await login(page, buyer.email);
    const raw = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        userId: buyer.id,
        tokenHash: createHash("sha256").update(raw).digest("hex"),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const recoveryContext = await browser.newContext();
    const recovery = await recoveryContext.newPage();
    const url = `/reset-password#token=${raw}`;
    await recovery.goto(url);
    await recovery.getByLabel("New password", { exact: true }).fill("RecoveredCampus123");
    await recovery.getByLabel("Confirm password", { exact: true }).fill("RecoveredCampus123");
    await recovery.getByRole("button", { name: "Change password" }).click();
    await expect(recovery.getByRole("status")).toContainText("Password changed");
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
    await recovery.getByLabel("New password", { exact: true }).fill("AnotherCampus123");
    await recovery.getByLabel("Confirm password", { exact: true }).fill("AnotherCampus123");
    await recovery.getByRole("button", { name: "Change password" }).click();
    await expect(
      recovery.getByRole("alert").filter({ hasText: "invalid or has expired" }),
    ).toBeVisible();
    await login(recovery, buyer.email, "RecoveredCampus123");
    await recoveryContext.close();
  });
});

test("noticeboard fits mobile, tablet and desktop widths", async ({ page }) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("searchbox", { name: "Search listings" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `/tmp/campus-loop-${width}.png` });
  }
});
