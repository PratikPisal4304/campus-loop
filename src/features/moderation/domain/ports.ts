import type { EntityId } from "@/core/types/branded";
import type { Report, ReportOutcome, ReportReason, ReportStatus, ReportTarget } from "./report";

export interface CreateReportInput {
  readonly reporterId: EntityId;
  readonly reason: ReportReason;
  readonly details: string | null;
  readonly target: ReportTarget;
}

/**
 * The words a moderator needs to act without opening three tabs: who complained, what
 * they complained about, and where to go look.
 */
export interface ReportContext {
  readonly reporterName: string;
  /** The listing title, the student's name, or the listing a thread is about. */
  readonly targetLabel: string;
  /** An internal href when the target has a page a moderator can open; null otherwise. */
  readonly targetHref: string | null;
}

export interface ReportedItem {
  readonly report: Report;
  readonly context: ReportContext;
}

export interface ReportRepository {
  create(input: CreateReportInput): Promise<Report>;
  /**
   * An existing *open* report from this student about this target.
   *
   * Filing is idempotent — tapping "Report" twice must not add a second row to the queue
   * — and only open reports count, so a target that misbehaves again after being reviewed
   * can be reported afresh.
   */
  findOpenByReporterAndTarget(
    reporterId: EntityId,
    target: ReportTarget,
  ): Promise<Report | null>;
  /** The moderation queue, oldest first: the longest-waiting complaint is the urgent one. */
  listByStatus(status: ReportStatus, limit: number): Promise<readonly ReportedItem[]>;
  /** Null when the report is already gone. */
  setStatus(id: EntityId, status: ReportOutcome): Promise<Report | null>;
  countByStatus(status: ReportStatus): Promise<number>;
}
