/** Integration tests use only a local database and an in-memory email transport. */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/shared/db/connection";
import { env } from "../src/shared/env";
import { requestDeal, respondToDeal, listDeals } from "../src/features/deals";
import { manageRecord, adminRecords } from "../src/features/administration";
import { startConversation, sendMessage, openConversation } from "../src/features/messaging";
import {
  requestPasswordReset,
  resetPassword,
} from "../src/features/accounts/infrastructure/recovery";
import { deleteAccount as removeAccount } from "../src/features/accounts/application/security";
import { PrismaUserRepository } from "../src/features/accounts/infrastructure/user.repository";
import { BcryptPasswordHasher } from "../src/features/accounts/infrastructure/bcrypt-hasher";
const deleteAccount = (id: ReturnType<typeof toEntityId>, password: string) =>
  removeAccount(
    { users: new PrismaUserRepository(), hasher: new BcryptPasswordHasher() },
    id,
    password,
  );
import {
  getListingBySlug,
  listMyListings,
  deleteListing,
  reopenListing,
  closeListing,
} from "../src/features/listings";
import { toEntityId, toSlug } from "../src/core/types/branded";
import { dispatchEmails } from "../src/shared/email/outbox";

assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(env.DATABASE_URL).hostname),
  "Integration tests require local Postgres.",
);
const stamp = `integration-${Date.now()}`;
const password = "CampusTest123";
const ids: string[] = [];
const originalFetch = globalThis.fetch;
const originalMode = env.EMAIL_DELIVERY;
const originalKey = env.RESEND_API_KEY;
const sent: { text: string; key: string }[] = [];
let failDelivery = false;
globalThis.fetch = async (_url, init) => {
  assert.equal(String(_url), "https://api.resend.com/emails");
  if (failDelivery) return new Response("unavailable", { status: 503 });
  const body = JSON.parse(String(init?.body)) as { text: string };
  const key = new Headers(init?.headers).get("Idempotency-Key") ?? "";
  sent.push({ text: body.text, key });
  return Response.json({ id: `mock-${key}` });
};
env.EMAIL_DELIVERY = "resend";
env.RESEND_API_KEY = "test-key";

async function user(name: string, role = "student") {
  const row = await prisma.user.create({
    data: {
      name,
      email: `${name}.${stamp}@example.test`,
      passwordHash: await bcrypt.hash(password, 4),
      role,
    },
  });
  ids.push(row.id);
  return row;
}

async function main() {
  try {
    const seller = await user("seller"),
      buyer = await user("buyer"),
      other = await user("other"),
      admin = await user("admin", "admin");
    async function fixture(mode = "sell") {
      const listing = await prisma.listing.create({
        data: {
          title: `${stamp} ${mode}`,
          slug: `${stamp}-${mode}-${randomBytes(4).toString("hex")}`,
          description: "An integration test item",
          category: "books",
          condition: "good",
          mode,
          pricePaise: ["free", "exchange"].includes(mode) ? 0 : 12000,
          rentUnit: mode === "rent" ? "day" : null,
          pickupArea: "Library",
          swatch: "green",
          sellerId: seller.id,
        },
      });
      const conversation = await startConversation({
        listingId: toEntityId(listing.id),
        buyerId: toEntityId(buyer.id),
      });
      assert.ok(conversation.ok);
      return { listing, conversationId: conversation.value.id };
    }

    for (const mode of ["sell", "rent", "free", "exchange"]) {
      const { listing, conversationId } = await fixture(mode);
      const request = await requestDeal(seller.id, {
        conversationId,
        pricePaise: listing.pricePaise,
      });
      assert.ok(request.ok);
      assert.equal(
        (await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
        "reserved",
      );
      assert.equal((await respondToDeal(other.id, request.value, "confirm")).ok, false);
      assert.equal((await respondToDeal(seller.id, request.value, "confirm")).ok, false);
      assert.ok((await respondToDeal(buyer.id, request.value, "confirm")).ok);
      assert.equal((await respondToDeal(buyer.id, request.value, "confirm")).ok, false);
      assert.equal(
        (await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
        "sold",
      );
    }
    assert.equal(
      (await listDeals(buyer.id, "buying")).items.filter((d) => d.status === "completed")
        .length,
      4,
    );
    assert.equal((await listDeals(seller.id, "selling")).total, 4);

    const concurrent = await fixture();
    const otherThread = await startConversation({
      listingId: toEntityId(concurrent.listing.id),
      buyerId: toEntityId(other.id),
    });
    assert.ok(otherThread.ok);
    const competing = await Promise.all([
      requestDeal(seller.id, { conversationId: concurrent.conversationId, pricePaise: 12000 }),
      requestDeal(seller.id, { conversationId: otherThread.value.id, pricePaise: 12000 }),
    ]);
    assert.equal(
      competing.filter((r) => r.ok).length,
      1,
      "Only one buyer can receive a pending request",
    );
    const winner = competing.find((r) => r.ok);
    assert.ok(winner?.ok);
    assert.ok((await respondToDeal(seller.id, winner.value, "cancel")).ok);
    assert.equal(
      (await prisma.listing.findUniqueOrThrow({ where: { id: concurrent.listing.id } })).status,
      "active",
    );

    const hidden = await fixture();
    const hiddenRequest = await requestDeal(seller.id, {
      conversationId: hidden.conversationId,
      pricePaise: 12000,
    });
    assert.ok(hiddenRequest.ok);
    assert.equal(
      (
        await manageRecord(buyer.id, {
          action: "hide-listing",
          targetId: hidden.listing.id,
          reason: "not authorized",
        })
      ).ok,
      false,
    );
    assert.ok(
      (
        await manageRecord(admin.id, {
          action: "hide-listing",
          targetId: hidden.listing.id,
          reason: "Test moderation",
        })
      ).ok,
    );
    assert.equal(
      (await prisma.deal.findUniqueOrThrow({ where: { id: hiddenRequest.value } })).status,
      "cancelled",
    );
    assert.equal(
      (
        await requestDeal(seller.id, {
          conversationId: hidden.conversationId,
          pricePaise: 12000,
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await startConversation({
          listingId: toEntityId(hidden.listing.id),
          buyerId: toEntityId(other.id),
        })
      ).ok,
      false,
    );

    assert.equal(
      await getListingBySlug(toSlug(hidden.listing.slug), toEntityId(buyer.id)),
      null,
    );
    assert.ok(await getListingBySlug(toSlug(hidden.listing.slug), toEntityId(seller.id)));
    assert.ok(
      (await listMyListings(toEntityId(seller.id))).some(
        (l) => l.id === hidden.listing.id && l.hidden,
      ),
    );
    const removable = await fixture();
    const removableDeal = await requestDeal(seller.id, {
      conversationId: removable.conversationId,
      pricePaise: 12000,
    });
    assert.ok(removableDeal.ok);
    assert.ok(
      (await deleteListing(toEntityId(seller.id), toEntityId(removable.listing.id))).ok,
    );
    const removedDeal = await prisma.deal.findUniqueOrThrow({
      where: { id: removableDeal.value },
    });
    assert.equal(removedDeal.status, "cancelled");
    assert.equal(removedDeal.listingId, null);
    const closable = await fixture();
    const closeDeal = await requestDeal(seller.id, {
      conversationId: closable.conversationId,
      pricePaise: 12000,
    });
    assert.ok(closeDeal.ok);
    assert.ok((await closeListing(toEntityId(seller.id), toEntityId(closable.listing.id))).ok);
    assert.equal(
      (await prisma.deal.findUniqueOrThrow({ where: { id: closeDeal.value } })).status,
      "cancelled",
    );
    assert.ok((await reopenListing(toEntityId(seller.id), toEntityId(closable.listing.id))).ok);
    const messages = await fixture();
    const send = () =>
      sendMessage({
        conversationId: toEntityId(messages.conversationId),
        senderId: toEntityId(seller.id),
        body: "Private message that must not appear in an email",
      });
    assert.ok((await send()).ok);
    assert.ok((await send()).ok);
    assert.equal(
      await prisma.emailJob.count({ where: { userId: buyer.id, kind: "message" } }),
      1,
    );
    await openConversation({
      conversationId: toEntityId(messages.conversationId),
      userId: toEntityId(buyer.id),
    });
    assert.ok((await send()).ok);
    assert.equal(
      await prisma.emailJob.count({ where: { userId: buyer.id, kind: "message" } }),
      2,
    );
    await prisma.user.update({ where: { id: buyer.id }, data: { messageEmails: false } });
    await openConversation({
      conversationId: toEntityId(messages.conversationId),
      userId: toEntityId(buyer.id),
    });
    assert.ok((await send()).ok);
    assert.equal(
      await prisma.emailJob.count({ where: { userId: buyer.id, kind: "message" } }),
      2,
    );

    for (let i = 0; i < 8; i++) await dispatchEmails();
    assert.equal(
      sent.some((m) => m.text.includes("Private message")),
      false,
    );
    const failure = await prisma.emailJob.create({
      data: {
        userId: seller.id,
        eventKey: `${stamp}/failure`,
        kind: "deal",
        subject: "Test delivery",
        body: "Test",
        path: "/loop",
      },
    });
    failDelivery = true;
    await dispatchEmails();
    assert.equal(
      (await prisma.emailJob.findUniqueOrThrow({ where: { id: failure.id } })).status,
      "failed",
    );
    failDelivery = false;
    assert.ok(
      (
        await manageRecord(admin.id, {
          action: "retry-email",
          targetId: failure.id,
          reason: "Provider recovered",
        })
      ).ok,
    );
    await dispatchEmails();
    assert.equal(
      (await prisma.emailJob.findUniqueOrThrow({ where: { id: failure.id } })).status,
      "accepted",
    );
    assert.equal(
      (
        await manageRecord(admin.id, {
          action: "retry-email",
          targetId: failure.id,
          reason: "Duplicate attempt",
        })
      ).ok,
      false,
    );

    const resetStart = sent.length;
    assert.ok((await requestPasswordReset(buyer.email, stamp)).ok);
    const resetMail = sent.slice(resetStart).find((m) => m.key.startsWith("reset/"));
    const token = resetMail?.text.match(/token=([a-f0-9]{64})/)?.[1];
    assert.ok(token);
    const resets = await Promise.all([
      resetPassword(token, "NewCampus123", stamp),
      resetPassword(token, "OtherCampus123", stamp),
    ]);
    assert.equal(
      resets.filter((r) => r.ok).length,
      1,
      "A reset link may be consumed only once",
    );
    assert.equal(
      (await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } })).sessionVersion,
      1,
    );
    const expired = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: buyer.id,
        tokenHash: createHash("sha256").update(expired).digest("hex"),
        expiresAt: new Date(Date.now() - 1),
      },
    });
    assert.equal((await resetPassword(expired, "CampusNew123", stamp)).ok, false);
    assert.equal((await resetPassword(token, "CampusNew123", stamp)).ok, false);
    const length = sent.length;
    assert.ok((await requestPasswordReset(`missing.${stamp}@example.test`, stamp)).ok);
    assert.equal(sent.length, length);

    const before = await prisma.user.findUniqueOrThrow({ where: { id: seller.id } });
    assert.ok(
      (
        await manageRecord(admin.id, {
          action: "suspend-user",
          targetId: seller.id,
          reason: "Test suspension",
        })
      ).ok,
    );
    const after = await prisma.user.findUniqueOrThrow({ where: { id: seller.id } });
    assert.ok(after.suspendedAt);
    assert.equal(after.sessionVersion, before.sessionVersion + 1);
    assert.ok(
      (
        await manageRecord(admin.id, {
          action: "restore-user",
          targetId: seller.id,
          reason: "Test restore",
        })
      ).ok,
    );
    assert.equal(
      (
        await manageRecord(admin.id, {
          action: "suspend-user",
          targetId: admin.id,
          reason: "Self suspend",
        })
      ).ok,
      false,
    );
    const exported = await adminRecords("users", buyer.email);
    assert.equal(exported.total, 1);
    assert.equal(JSON.stringify(exported).includes("passwordHash"), false);

    assert.ok((await deleteAccount(toEntityId(seller.id), password)).ok);
    const history = await listDeals(buyer.id, "buying");
    assert.equal(history.items.filter((d) => d.status === "completed").length, 4);
    assert.ok(history.items.every((d) => d.sellerName === "Deleted student"));
    process.stdout.write(
      "Passed: all handoff modes, concurrency, authorization, moderation, exports, email suppression/retry, password resets, session versions, and anonymized history.\n",
    );
  } finally {
    globalThis.fetch = originalFetch;
    env.EMAIL_DELIVERY = originalMode;
    env.RESEND_API_KEY = originalKey;
    await prisma.deal.deleteMany({ where: { title: { startsWith: stamp } } });
    await prisma.adminAudit.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
