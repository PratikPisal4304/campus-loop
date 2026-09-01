/**
 * Client-safe half of the moderation feature.
 *
 * `index.ts` is `server-only` because it wires up the Prisma repository — importing it
 * from a `"use client"` component fails the build. This barrel re-exports only the pure
 * domain vocabulary the report form needs: the reason list, its labels, and the length
 * limit the textarea enforces before the server does.
 *
 * If you are on the server, import from `@/features/moderation` instead.
 */
export {
  MAX_REPORT_DETAILS_LENGTH,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_TARGET_KINDS,
  isReportReason,
  isReportTargetKind,
  type ReportReason,
  type ReportTargetKind,
} from "./domain/report";
