import { fail, ok, type Result } from "@/core/domain/result";
import type { EntityId } from "@/core/types/branded";
import {
  REPORT_REASON_LABELS,
  canReport,
  normaliseDetails,
  soleTarget,
  validateReportDetails,
  type Report,
  type ReportOutcome,
  type ReportReason,
  type ReportTargetColumns,
} from "../domain/report";
import type { ReportRepository, ReportedItem } from "../domain/ports";

export interface ModerationDeps {
  readonly reports: ReportRepository;
}

/** How many open reports the queue renders at once. */
const QUEUE_LIMIT = 100;

export interface ReportView {
  readonly id: string;
  readonly reason: ReportReason;
  readonly reasonLabel: string;
  readonly details: string | null;
  readonly status: string;
  readonly createdAt: Date;
}

function toReportView(report: Report): ReportView {
  return {
    id: report.id,
    reason: report.reason,
    reasonLabel: REPORT_REASON_LABELS[report.reason],
    details: report.details,
    status: report.status,
    createdAt: report.createdAt,
  };
}

export interface FileReportInput extends ReportTargetColumns {
  readonly reporterId: EntityId;
  readonly reason: ReportReason;
  readonly details?: string | null;
}

/**
 * File a report against a listing, a student, or a conversation.
 *
 * Idempotent: a student who taps "Report" twice, or reports the same seller from two
 * different listings pages, gets the report they already filed back rather than a second
 * row in the queue. Moderation is a person reading a list — duplicates cost attention,
 * which is the scarce thing here.
 */
export async function fileReport(
  deps: ModerationDeps,
  input: FileReportInput,
): Promise<Result<ReportView>> {
  const target = soleTarget(input);
  if (!target) {
    // Not a Result the student can act on so much as a malformed submission, but still a
    // Result: the alternative is a Postgres CHECK violation surfacing as a 500.
    return fail("INVALID_TARGET", "We couldn't tell what you're reporting.");
  }

  if (!canReport(input.reporterId, target)) {
    return fail("CANNOT_REPORT_SELF", "You can't report your own account.");
  }

  const details = normaliseDetails(input.details);
  const detailsError = details ? validateReportDetails(details) : null;
  if (detailsError) {
    return fail("INVALID_DETAILS", detailsError, { details: detailsError });
  }

  const existing = await deps.reports.findOpenByReporterAndTarget(input.reporterId, target);
  if (existing) return ok(toReportView(existing));

  const created = await deps.reports.create({
    reporterId: input.reporterId,
    reason: input.reason,
    details,
    target,
  });
  return ok(toReportView(created));
}

/** One row of the moderation queue, already resolved to the words a moderator reads. */
export interface ReportQueueItemView extends ReportView {
  readonly targetKind: string;
  readonly targetLabel: string;
  readonly targetHref: string | null;
  readonly reporterName: string;
}

function toQueueItemView(item: ReportedItem): ReportQueueItemView {
  return {
    ...toReportView(item.report),
    targetKind: item.report.target.kind,
    targetLabel: item.context.targetLabel,
    targetHref: item.context.targetHref,
    reporterName: item.context.reporterName,
  };
}

/**
 * The open queue, oldest first.
 *
 * Authorization is deliberately not checked here: "is this person an admin" is a session
 * question, answered by `requireRole` at the route and action boundary, the same way
 * every other guard in this app works.
 */
export async function listOpenReports(
  deps: ModerationDeps,
): Promise<readonly ReportQueueItemView[]> {
  const items = await deps.reports.listByStatus("open", QUEUE_LIMIT);
  return items.map(toQueueItemView);
}

export async function countOpenReports(deps: ModerationDeps): Promise<number> {
  return deps.reports.countByStatus("open");
}

/**
 * Close a report as acted-on or as nothing-to-do.
 *
 * There is no "reopen": `ReportOutcome` excludes `open`, so a reopen cannot be posted
 * even by hand-crafting the form.
 */
export async function resolveReport(
  deps: ModerationDeps,
  reportId: EntityId,
  outcome: ReportOutcome,
): Promise<Result<ReportView>> {
  const updated = await deps.reports.setStatus(reportId, outcome);
  if (!updated) return fail("NOT_FOUND", "That report no longer exists.");
  return ok(toReportView(updated));
}
