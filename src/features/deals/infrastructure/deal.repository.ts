import "server-only";
import { prisma } from "@/shared/db/connection";
import { fail, ok } from "@/core/domain/result";
import { queueDealUpdate } from "./notifications";
import { validateDealRequest, validateDealResponse, type DealRepository } from "../domain/deal";

export const dealRepository: DealRepository = {
  async request(actorId, input) {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: input.conversationId },
        include: { participants: true },
      });
      if (!conversation) return fail("NOT_FOUND", "That conversation no longer exists.");
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${conversation.listingId} FOR UPDATE`;
      const listing = await tx.listing.findUnique({
        where: { id: conversation.listingId },
        include: { seller: { select: { suspendedAt: true } } },
      });
      const buyer = conversation.participants.find((p) => p.userId !== actorId);
      if (!listing || !buyer || !conversation.participants.some((p) => p.userId === actorId))
        return fail("FORBIDDEN", "Choose a conversation for your own listing.");
      const buyerUser = await tx.user.findUnique({
        where: { id: buyer.userId },
        select: { suspendedAt: true },
      });
      const valid = validateDealRequest({
        actorId,
        sellerId: listing.sellerId,
        buyerId: buyer.userId,
        mode: listing.mode,
        pricePaise: input.pricePaise,
        status: listing.status,
        unavailable: Boolean(
          listing.hiddenAt || listing.seller.suspendedAt || !buyerUser || buyerUser.suspendedAt,
        ),
      });
      if (!valid.ok) return valid;
      if (await tx.deal.findFirst({ where: { listingId: listing.id, status: "pending" } }))
        return fail("CONFLICT", "A buyer is already being asked to confirm this item.");
      const deal = await tx.deal.create({
        data: {
          listingId: listing.id,
          conversationId: conversation.id,
          sellerId: actorId,
          buyerId: buyer.userId,
          title: listing.title,
          mode: listing.mode,
          pricePaise: input.pricePaise,
          rentUnit: listing.rentUnit,
        },
      });
      await tx.listing.update({ where: { id: listing.id }, data: { status: "reserved" } });
      await queueDealUpdate(tx, deal);
      return ok(deal.id);
    });
  },
  async respond(actorId, id, action) {
    return prisma.$transaction(async (tx) => {
      const initial = await tx.deal.findUnique({ where: { id } });
      if (!initial) return fail("NOT_FOUND", "That handoff no longer exists.");
      // Every writer locks listing before deal, including removal and moderation.
      if (initial.listingId)
        await tx.$queryRaw`SELECT id FROM listings WHERE id = ${initial.listingId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM deals WHERE id = ${id} FOR UPDATE`;
      const deal = await tx.deal.findUnique({
        where: { id },
        include: {
          listing: true,
          buyer: { select: { suspendedAt: true } },
          seller: { select: { suspendedAt: true } },
        },
      });
      if (!deal) return fail("NOT_FOUND", "That handoff no longer exists.");
      const valid = validateDealResponse(deal, actorId, action);
      if (!valid.ok) return valid;
      if (
        action === "confirm" &&
        (!deal.listing ||
          deal.listing.hiddenAt ||
          deal.listing.status !== "reserved" ||
          !deal.buyer ||
          !deal.seller ||
          deal.buyer.suspendedAt ||
          deal.seller.suspendedAt)
      )
        return fail(
          "UNAVAILABLE",
          "This handoff is no longer available. You can cancel the request.",
        );
      const status = action === "confirm" ? "completed" : "cancelled";
      await tx.deal.update({
        where: { id },
        data: { status, completedAt: action === "confirm" ? new Date() : null },
      });
      if (deal.listingId)
        await tx.listing.update({
          where: { id: deal.listingId },
          data: { status: action === "confirm" ? "sold" : "active" },
        });
      await queueDealUpdate(tx, deal, status);
      return ok(id);
    });
  },
  async list(userId, side, page) {
    const where = side === "buying" ? { buyerId: userId } : { sellerId: userId };
    const [rows, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * 20,
        take: 20,
        include: { buyer: { select: { name: true } }, seller: { select: { name: true } } },
      }),
      prisma.deal.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        conversationId: r.conversationId,
        title: r.title,
        mode: r.mode,
        pricePaise: r.pricePaise,
        rentUnit: r.rentUnit,
        status: r.status,
        buyerId: r.buyerId,
        sellerId: r.sellerId,
        buyerName: r.buyer?.name ?? "Deleted student",
        sellerName: r.seller?.name ?? "Deleted student",
        createdAt: r.createdAt,
      })),
      total,
    };
  },
};

export async function conversationDealContext(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId } } },
    include: {
      listing: {
        select: {
          sellerId: true,
          pricePaise: true,
          mode: true,
          rentUnit: true,
          status: true,
          hiddenAt: true,
        },
      },
    },
  });
  if (!conversation) return null;
  const pending = await prisma.deal.findFirst({
    where: { listingId: conversation.listingId, status: "pending" },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      pricePaise: true,
      mode: true,
      rentUnit: true,
    },
  });
  return {
    listing: conversation.listing,
    pending:
      pending && (pending.buyerId === userId || pending.sellerId === userId) ? pending : null,
    hasPending: Boolean(pending),
  };
}
