import "server-only";
import type { EntityId } from "@/core/types/branded";
import * as moderation from "./application/moderation";
import type { ReportOutcome } from "./domain/report";
import { PrismaReportRepository } from "./infrastructure/report.repository";

/**
 * Public API of the moderation feature.
 *
 * Also the composition root: it binds the Prisma adapter to the use cases, so callers
 * never see a repository. Nothing outside this folder may import a deeper path.
 *
 * Authorization is not enforced here. `listOpenReports` and `resolveReport` are
 * admin-only, and that is checked with `requireRole("admin")` at the route and action
 * boundary — the same single place every other guard in this app lives.
 */
const deps: moderation.ModerationDeps = {
  reports: new PrismaReportRepository(),
};

export const fileReport = (input: moderation.FileReportInput) =>
  moderation.fileReport(deps, input);

export const listOpenReports = () => moderation.listOpenReports(deps);

export const countOpenReports = () => moderation.countOpenReports(deps);

export const resolveReport = (reportId: EntityId, outcome: ReportOutcome) =>
  moderation.resolveReport(deps, reportId, outcome);

export type {
  FileReportInput,
  ReportQueueItemView,
  ReportView,
} from "./application/moderation";

export {
  MAX_REPORT_DETAILS_LENGTH,
  REPORT_OUTCOMES,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_TARGET_KINDS,
  isReportOutcome,
  isReportReason,
  isReportTargetKind,
  targetColumns,
  type ReportOutcome,
  type ReportReason,
  type ReportTarget,
  type ReportTargetKind,
} from "./domain/report";
