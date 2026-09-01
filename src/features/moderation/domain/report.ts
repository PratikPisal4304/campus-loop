import type { EntityId } from "@/core/types/branded";

/**
 * The vocabulary of a report.
 *
 * `as const` arrays rather than TS enums (which ESLint bans): the array renders the
 * reason picker, the union keeps the switch statements exhaustive.
 */
export const REPORT_REASONS = [
  "scam",
  "harassment",
  "spam",
  "prohibited",
  "misleading",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/** Written as a student would pick them, not as a policy document would name them. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  scam: "Scam or fraud",
  harassment: "Harassment or abuse",
  spam: "Spam or repeated posting",
  prohibited: "Prohibited item",
  misleading: "Misleading or fake listing",
  other: "Something else",
};

export const REPORT_STATUSES = ["open", "reviewed", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/**
 * What an open report can become. `open` is missing on purpose — reopening is not a
 * thing the queue offers, so it cannot be posted as an outcome either.
 */
export const REPORT_OUTCOMES = ["reviewed", "dismissed"] as const;
export type ReportOutcome = (typeof REPORT_OUTCOMES)[number];

export const REPORT_TARGET_KINDS = ["listing", "user", "conversation"] as const;
export type ReportTargetKind = (typeof REPORT_TARGET_KINDS)[number];

/** The one thing a report is about. */
export interface ReportTarget {
  readonly kind: ReportTargetKind;
  readonly id: EntityId;
}

export interface Report {
  readonly id: EntityId;
  readonly reason: ReportReason;
  readonly details: string | null;
  readonly status: ReportStatus;
  readonly reporterId: EntityId;
  readonly target: ReportTarget;
  readonly createdAt: Date;
}

export const MAX_REPORT_DETAILS_LENGTH = 500;

export function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value);
}

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}

export function isReportOutcome(value: string): value is ReportOutcome {
  return (REPORT_OUTCOMES as readonly string[]).includes(value);
}

export function isReportTargetKind(value: string): value is ReportTargetKind {
  return (REPORT_TARGET_KINDS as readonly string[]).includes(value);
}

/**
 * The report's target in the shape the `reports` table stores it: three nullable columns,
 * exactly one of which is set.
 */
export interface ReportTargetColumns {
  readonly listingId?: EntityId | null;
  readonly reportedUserId?: EntityId | null;
  readonly conversationId?: EntityId | null;
}

/**
 * Collapse the three nullable columns into the single target they encode.
 *
 * Returns null when zero or more than one is set. The database has a CHECK constraint
 * saying the same thing, but a constraint violation surfaces as a 500 with a Postgres
 * error string — this turns the same rule into a `Result` the student can read, and lets
 * the use case be tested without a database.
 */
export function soleTarget(columns: ReportTargetColumns): ReportTarget | null {
  const candidates: readonly (readonly [ReportTargetKind, EntityId | null | undefined])[] = [
    ["listing", columns.listingId],
    ["user", columns.reportedUserId],
    ["conversation", columns.conversationId],
  ];

  const set = candidates.filter(([, id]) => Boolean(id));
  const only = set[0];
  if (set.length !== 1 || !only?.[1]) return null;
  return { kind: only[0], id: only[1] };
}

/** The inverse — a target back into the columns the repository writes. */
export function targetColumns(target: ReportTarget): Required<ReportTargetColumns> {
  return {
    listingId: target.kind === "listing" ? target.id : null,
    reportedUserId: target.kind === "user" ? target.id : null,
    conversationId: target.kind === "conversation" ? target.id : null,
  };
}

/**
 * You cannot report yourself.
 *
 * Only decidable here for a `user` target: whether a listing or a thread belongs to the
 * reporter is a fact this feature does not own, and guessing it would mean importing the
 * listings repository into the domain. The moderator sees the reporter and the target
 * side by side, so a self-report routed through a listing is visible in the queue.
 */
export function canReport(reporterId: EntityId, target: ReportTarget): boolean {
  return !(target.kind === "user" && target.id === reporterId);
}

/** Returns an error message to show, or null when the note is fine to file. */
export function validateReportDetails(details: string): string | null {
  if (details.trim().length > MAX_REPORT_DETAILS_LENGTH) {
    return `Keep it under ${MAX_REPORT_DETAILS_LENGTH} characters.`;
  }
  return null;
}

/** Empty notes are stored as null, so "left blank" and "cleared" are one state. */
export function normaliseDetails(details: string | null | undefined): string | null {
  return details?.trim() || null;
}
