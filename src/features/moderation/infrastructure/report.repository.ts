import "server-only";
import type { Prisma } from "@prisma/client";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { prisma } from "@/shared/db/connection";
import type { CreateReportInput, ReportRepository, ReportedItem } from "../domain/ports";
import {
  isReportReason,
  isReportStatus,
  targetColumns,
  type Report,
  type ReportOutcome,
  type ReportStatus,
  type ReportTarget,
} from "../domain/report";

/**
 * Everything the queue needs to label a report, pulled in one query.
 *
 * Resolving these row by row would mean four extra round trips per report, and a queue is
 * read exactly when someone is in a hurry.
 */
const withContext = {
  reporter: { select: { name: true } },
  listing: { select: { title: true, slug: true } },
  reportedUser: { select: { id: true, name: true } },
  conversation: { select: { listing: { select: { title: true } } } },
} satisfies Prisma.ReportInclude;

type ReportRowWithContext = Prisma.ReportGetPayload<{ include: typeof withContext }>;

export class PrismaReportRepository implements ReportRepository {
  async create(input: CreateReportInput): Promise<Report> {
    const row = await prisma.report.create({
      data: {
        reporterId: input.reporterId,
        reason: input.reason,
        details: input.details,
        ...targetColumns(input.target),
      },
      include: withContext,
    });
    return toDomain(row);
  }

  async findOpenByReporterAndTarget(
    reporterId: EntityId,
    target: ReportTarget,
  ): Promise<Report | null> {
    const row = await prisma.report.findFirst({
      // The unset columns are matched as null explicitly, so a listing report cannot be
      // mistaken for a user report that happens to share an id.
      where: { reporterId, status: "open", ...targetColumns(target) },
      include: withContext,
    });
    return row ? toDomain(row) : null;
  }

  async listByStatus(status: ReportStatus, limit: number): Promise<readonly ReportedItem[]> {
    const rows = await prisma.report.findMany({
      where: { status },
      // Oldest first: the complaint that has been waiting longest is the urgent one.
      orderBy: { createdAt: "asc" },
      take: limit,
      include: withContext,
    });
    return rows.map(toItem);
  }

  async setStatus(id: EntityId, status: ReportOutcome): Promise<Report | null> {
    try {
      const row = await prisma.report.update({
        where: { id },
        data: { status },
        include: withContext,
      });
      return toDomain(row);
    } catch {
      // P2025 — another moderator already handled and removed it. The contract is
      // "null means gone", not an exception.
      return null;
    }
  }

  async countByStatus(status: ReportStatus): Promise<number> {
    return prisma.report.count({ where: { status } });
  }
}

function toDomain(row: ReportRowWithContext): Report {
  return {
    id: toEntityId(row.id),
    // Unknown strings are read as `other` rather than crashing the queue: a reason the
    // domain has since renamed must not make the whole page unrenderable.
    reason: isReportReason(row.reason) ? row.reason : "other",
    details: row.details,
    status: isReportStatus(row.status) ? row.status : "open",
    reporterId: toEntityId(row.reporterId),
    target: toTarget(row),
    createdAt: row.createdAt,
  };
}

/**
 * The three nullable columns back into the single target they encode.
 *
 * The CHECK constraint guarantees exactly one is set, but the types do not, so the
 * fallback points the moderator at the report itself rather than asserting non-null.
 */
function toTarget(row: ReportRowWithContext): ReportTarget {
  if (row.listingId) return { kind: "listing", id: toEntityId(row.listingId) };
  if (row.reportedUserId) return { kind: "user", id: toEntityId(row.reportedUserId) };
  if (row.conversationId) return { kind: "conversation", id: toEntityId(row.conversationId) };
  return { kind: "listing", id: toEntityId("") };
}

function toItem(row: ReportRowWithContext): ReportedItem {
  return {
    report: toDomain(row),
    context: {
      reporterName: row.reporter.name,
      targetLabel: labelFor(row),
      targetHref: hrefFor(row),
    },
  };
}

function labelFor(row: ReportRowWithContext): string {
  if (row.listing) return row.listing.title;
  if (row.reportedUser) return row.reportedUser.name;
  if (row.conversation) return `Thread about “${row.conversation.listing.title}”`;
  // The target was deleted after the report was filed — still worth showing, because a
  // pattern of reports against one student outlives any single listing.
  return "Deleted content";
}

function hrefFor(row: ReportRowWithContext): string | null {
  if (row.listing) return `/listings/${row.listing.slug}`;
  if (row.reportedUser) return `/profile/${row.reportedUser.id}`;
  // A conversation is private to its two participants; there is no moderator view of it,
  // and inventing one would be a bigger decision than this queue gets to make.
  return null;
}
