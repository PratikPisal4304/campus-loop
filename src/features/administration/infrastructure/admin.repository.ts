import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db/connection";
import { cancelListingDeals } from "@/features/deals";
import { fail, ok } from "@/core/domain/result";
import type { AdminPage, AdminSection } from "../domain/admin";

const date = (value: Date) => value.toISOString().slice(0, 10);
const money = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
export async function adminOverview() {
  const [users, listings, pending, completed, reports, email, audit] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count({
      where: { status: "active", hiddenAt: null, seller: { suspendedAt: null } },
    }),
    prisma.deal.count({ where: { status: "pending" } }),
    prisma.deal.count({ where: { status: "completed" } }),
    prisma.report.count({ where: { status: "open" } }),
    prisma.emailJob.count({ where: { status: { in: ["failed", "queued", "sending"] } } }),
    prisma.adminAudit.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  return {
    counts: { users, listings, pending, completed, reports, email },
    audit: audit.map((r) => ({
      id: r.id,
      action: r.action,
      reason: r.reason,
      targetId: r.targetId,
      actorId: r.actorId,
      at: date(r.createdAt),
    })),
  };
}

export async function adminRecords(
  section: AdminSection,
  search = "",
  status = "",
  page = 1,
  limit = 25,
): Promise<AdminPage> {
  const q = search.trim().slice(0, 120);
  const take = Math.max(1, Math.min(250, limit));
  const paging = {
    skip: (Math.max(1, Math.floor(page) || 1) - 1) * take,
    take,
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
  };
  if (section === "users") {
    const where: Prisma.UserWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status === "suspended"
        ? { suspendedAt: { not: null } }
        : status === "active"
          ? { suspendedAt: null }
          : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        ...paging,
        select: {
          id: true,
          name: true,
          email: true,
          campusArea: true,
          role: true,
          suspendedAt: true,
          createdAt: true,
          _count: { select: { purchases: true, sales: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    return {
      columns: [
        "Student",
        "Email",
        "Campus area",
        "Role",
        "Status",
        "Buying / selling records",
        "Joined",
      ],
      total,
      records: rows.map((r) => ({
        id: r.id,
        cells: [
          r.name,
          r.email,
          r.campusArea ?? "—",
          r.role,
          r.suspendedAt ? "Suspended" : "Active",
          `${r._count.purchases} / ${r._count.sales}`,
          date(r.createdAt),
        ],
        actions:
          r.role === "admin"
            ? []
            : [
                {
                  value: r.suspendedAt ? "restore-user" : "suspend-user",
                  label: r.suspendedAt ? "Restore account" : "Suspend account",
                },
              ],
      })),
    };
  }
  if (section === "listings") {
    const where: Prisma.ListingWhereInput = {
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(status === "hidden" ? { hiddenAt: { not: null } } : status ? { status } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        ...paging,
        include: { seller: { select: { name: true } } },
      }),
      prisma.listing.count({ where }),
    ]);
    return {
      columns: ["Item", "Seller", "Mode", "Price", "Status", "Visibility", "Listed"],
      total,
      records: rows.map((r) => ({
        id: r.id,
        cells: [
          r.title,
          r.seller.name,
          r.mode,
          money(r.pricePaise),
          r.status,
          r.hiddenAt ? "Hidden" : "Visible",
          date(r.createdAt),
        ],
        actions: [
          {
            value: r.hiddenAt ? "restore-listing" : "hide-listing",
            label: r.hiddenAt ? "Restore listing" : "Hide listing",
          },
        ],
      })),
    };
  }
  if (section === "deals") {
    const where: Prisma.DealWhereInput = {
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { buyer: { name: { contains: q, mode: "insensitive" } } },
              { seller: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        ...paging,
        include: { buyer: { select: { name: true } }, seller: { select: { name: true } } },
      }),
      prisma.deal.count({ where }),
    ]);
    return {
      columns: [
        "Item",
        "Buyer",
        "Seller",
        "Mode",
        "Agreed price",
        "Status",
        "Requested",
        "Completed",
      ],
      total,
      records: rows.map((r) => ({
        id: r.id,
        cells: [
          r.title,
          r.buyer?.name ?? "Deleted student",
          r.seller?.name ?? "Deleted student",
          r.mode,
          money(r.pricePaise) + (r.rentUnit ? ` / ${r.rentUnit}` : ""),
          r.status,
          date(r.createdAt),
          r.completedAt ? date(r.completedAt) : "—",
        ],
        actions: [],
      })),
    };
  }
  if (section === "reports") {
    const where: Prisma.ReportWhereInput = {
      ...(q
        ? {
            OR: [
              { reason: { contains: q, mode: "insensitive" } },
              { details: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.report.findMany({
        where,
        ...paging,
        include: { reporter: { select: { name: true } } },
      }),
      prisma.report.count({ where }),
    ]);
    return {
      columns: ["Reason", "Details", "Reporter", "Target ID", "Status", "Filed"],
      total,
      records: rows.map((r) => ({
        id: r.id,
        cells: [
          r.reason,
          r.details ?? "—",
          r.reporter.name,
          r.listingId ?? r.reportedUserId ?? r.conversationId ?? "Removed",
          r.status,
          date(r.createdAt),
        ],
        actions:
          r.status === "open"
            ? [
                { value: "review-report", label: "Mark reviewed" },
                { value: "dismiss-report", label: "Dismiss" },
              ]
            : [],
      })),
    };
  }
  const where: Prisma.EmailJobWhereInput = {
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      ...paging,
      include: { user: { select: { email: true } } },
    }),
    prisma.emailJob.count({ where }),
  ]);
  return {
    columns: ["Subject", "Recipient", "Status", "Attempts", "Last error", "Created"],
    total,
    records: rows.map((r) => ({
      id: r.id,
      cells: [
        r.subject,
        r.user.email,
        r.status === "accepted" ? "Accepted by Resend" : r.status,
        String(r.attempts),
        r.lastError ?? "—",
        date(r.createdAt),
      ],
      actions:
        ["failed", "queued", "sending"].includes(r.status) &&
        r.createdAt.getTime() > Date.now() - 23 * 3600000 &&
        (r.status !== "sending" || r.updatedAt.getTime() < Date.now() - 120000)
          ? [{ value: "retry-email", label: "Retry email" }]
          : [],
    })),
  };
}

export async function adminMutation(
  actorId: string,
  action: string,
  targetId: string,
  reason: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: actorId },
        select: { role: true, suspendedAt: true },
      });
      if (!actor || actor.role !== "admin" || actor.suspendedAt)
        return fail("FORBIDDEN", "Administrator access is required.");
      if (["suspend-user", "restore-user"].includes(action)) {
        const target = await tx.user.findUnique({
          where: { id: targetId },
          select: { role: true },
        });
        if (!target || target.role === "admin" || targetId === actorId)
          return fail("FORBIDDEN", "This account cannot be suspended here.");
        await tx.user.update({
          where: { id: targetId },
          data: {
            suspendedAt: action === "suspend-user" ? new Date() : null,
            sessionVersion: { increment: 1 },
          },
        });
        if (action === "suspend-user") {
          const pending = await tx.deal.findMany({
            where: { status: "pending", OR: [{ buyerId: targetId }, { sellerId: targetId }] },
            select: { listingId: true },
            orderBy: { listingId: "asc" },
          });
          for (const { listingId } of pending)
            if (listingId) {
              await tx.$queryRaw`SELECT id FROM listings WHERE id = ${listingId} FOR UPDATE`;
              await cancelListingDeals(tx, listingId);
              await tx.listing.updateMany({
                where: { id: listingId, status: "reserved" },
                data: { status: "active" },
              });
            }
        }
      } else if (["hide-listing", "restore-listing"].includes(action)) {
        await tx.$queryRaw`SELECT id FROM listings WHERE id = ${targetId} FOR UPDATE`;
        const changed = await tx.listing.updateMany({
          where: { id: targetId },
          data: { hiddenAt: action === "hide-listing" ? new Date() : null },
        });
        if (!changed.count) return fail("NOT_FOUND", "Listing not found.");
        if (action === "hide-listing") {
          await cancelListingDeals(tx, targetId);
          await tx.listing.updateMany({
            where: { id: targetId, status: "reserved" },
            data: { status: "active" },
          });
        }
      } else if (["review-report", "dismiss-report"].includes(action)) {
        const changed = await tx.report.updateMany({
          where: { id: targetId, status: "open" },
          data: { status: action === "review-report" ? "reviewed" : "dismissed" },
        });
        if (!changed.count)
          return fail("CONFLICT", "This report is already resolved or was removed.");
      } else if (action === "retry-email") {
        const changed = await tx.emailJob.updateMany({
          where: {
            id: targetId,
            createdAt: { gt: new Date(Date.now() - 23 * 3600000) },
            OR: [
              { status: { in: ["failed", "queued"] } },
              { status: "sending", updatedAt: { lt: new Date(Date.now() - 120000) } },
            ],
          },
          data: { status: "queued" },
        });
        if (!changed.count)
          return fail(
            "CONFLICT",
            "This email was accepted, is being sent, or is too old to safely retry.",
          );
      } else return fail("INVALID_ACTION", "Choose a valid administrative action.");
      await tx.adminAudit.create({ data: { actorId, action, targetId, reason } });
      return ok(null);
    },
    { timeout: 15000 },
  );
}
