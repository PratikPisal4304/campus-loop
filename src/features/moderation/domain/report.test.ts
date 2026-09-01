import { describe, expect, it } from "vitest";
import { toEntityId } from "@/core/types/branded";
import {
  MAX_REPORT_DETAILS_LENGTH,
  REPORT_REASONS,
  canReport,
  isReportOutcome,
  isReportReason,
  isReportTargetKind,
  normaliseDetails,
  soleTarget,
  targetColumns,
  validateReportDetails,
  type ReportTarget,
} from "./report";

const reporter = toEntityId("clrep000000000000000000a");
const other = toEntityId("clrep000000000000000000b");
const listing = toEntityId("cllis000000000000000000a");
const thread = toEntityId("clcon000000000000000000a");

describe("soleTarget", () => {
  it("resolves each of the three columns to its kind", () => {
    expect(soleTarget({ listingId: listing })).toEqual({ kind: "listing", id: listing });
    expect(soleTarget({ reportedUserId: other })).toEqual({ kind: "user", id: other });
    expect(soleTarget({ conversationId: thread })).toEqual({
      kind: "conversation",
      id: thread,
    });
  });

  it("refuses a report with no target", () => {
    expect(soleTarget({})).toBeNull();
    expect(soleTarget({ listingId: null, reportedUserId: null })).toBeNull();
  });

  it("refuses more than one target, which the database CHECK would reject as a 500", () => {
    expect(soleTarget({ listingId: listing, reportedUserId: other })).toBeNull();
    expect(
      soleTarget({ listingId: listing, reportedUserId: other, conversationId: thread }),
    ).toBeNull();
  });

  it("round-trips through targetColumns", () => {
    for (const target of [
      { kind: "listing", id: listing },
      { kind: "user", id: other },
      { kind: "conversation", id: thread },
    ] satisfies ReportTarget[]) {
      expect(soleTarget(targetColumns(target))).toEqual(target);
    }
  });
});

describe("canReport", () => {
  it("refuses reporting yourself", () => {
    expect(canReport(reporter, { kind: "user", id: reporter })).toBe(false);
  });

  it("allows reporting another student", () => {
    expect(canReport(reporter, { kind: "user", id: other })).toBe(true);
  });

  it("does not block listing or conversation targets, whose owner it cannot know", () => {
    expect(canReport(reporter, { kind: "listing", id: reporter })).toBe(true);
    expect(canReport(reporter, { kind: "conversation", id: reporter })).toBe(true);
  });
});

describe("validateReportDetails", () => {
  it("accepts an empty note — the reason alone is enough to file", () => {
    expect(validateReportDetails("")).toBeNull();
    expect(validateReportDetails("   ")).toBeNull();
  });

  it("rejects a note past the limit, measured after trimming", () => {
    expect(validateReportDetails("x".repeat(MAX_REPORT_DETAILS_LENGTH))).toBeNull();
    expect(validateReportDetails(`  ${"x".repeat(MAX_REPORT_DETAILS_LENGTH)}  `)).toBeNull();
    expect(validateReportDetails("x".repeat(MAX_REPORT_DETAILS_LENGTH + 1))).toContain(
      String(MAX_REPORT_DETAILS_LENGTH),
    );
  });
});

describe("normaliseDetails", () => {
  it("collapses blank and missing notes to the same null", () => {
    expect(normaliseDetails(undefined)).toBeNull();
    expect(normaliseDetails(null)).toBeNull();
    expect(normaliseDetails("  ")).toBeNull();
  });

  it("trims a real note", () => {
    expect(normaliseDetails("  they never showed up  ")).toBe("they never showed up");
  });
});

describe("vocabulary guards", () => {
  it("accepts every declared reason and rejects anything else", () => {
    for (const reason of REPORT_REASONS) expect(isReportReason(reason)).toBe(true);
    expect(isReportReason("because-i-said-so")).toBe(false);
  });

  it("refuses to treat `open` as an outcome — the queue cannot reopen a report", () => {
    expect(isReportOutcome("reviewed")).toBe(true);
    expect(isReportOutcome("dismissed")).toBe(true);
    expect(isReportOutcome("open")).toBe(false);
  });

  it("guards target kinds", () => {
    expect(isReportTargetKind("listing")).toBe(true);
    expect(isReportTargetKind("message")).toBe(false);
  });
});
