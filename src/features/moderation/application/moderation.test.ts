import { describe, expect, it, vi } from "vitest";
import { toEntityId } from "@/core/types/branded";
import type { CreateReportInput, ReportRepository } from "../domain/ports";
import { MAX_REPORT_DETAILS_LENGTH, type Report, type ReportTarget } from "../domain/report";
import { fileReport, listOpenReports, resolveReport, type ModerationDeps } from "./moderation";

const reporter = toEntityId("clrep000000000000000000a");
const seller = toEntityId("clrep000000000000000000b");
const listing = toEntityId("cllis000000000000000000a");

function reportOf(overrides: Partial<Report> = {}): Report {
  return {
    id: toEntityId("clrpt000000000000000000a"),
    reason: "scam",
    details: null,
    status: "open",
    reporterId: reporter,
    target: { kind: "listing", id: listing },
    createdAt: new Date("2026-03-01T09:00:00Z"),
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ReportRepository> = {}): ModerationDeps {
  const reports: ReportRepository = {
    create: async (input: CreateReportInput) => reportOf({ ...input }),
    findOpenByReporterAndTarget: async () => null,
    listByStatus: async () => [],
    setStatus: async (_id, status) => reportOf({ status }),
    countByStatus: async () => 0,
    ...overrides,
  };
  return { reports };
}

describe("fileReport", () => {
  it("files a report against a listing", async () => {
    const result = await fileReport(makeDeps(), {
      reporterId: reporter,
      reason: "misleading",
      listingId: listing,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reason).toBe("misleading");
    expect(result.value.reasonLabel).toBe("Misleading or fake listing");
  });

  it("refuses a submission with no target rather than letting the CHECK 500", async () => {
    const create = vi.fn();
    const result = await fileReport(makeDeps({ create }), {
      reporterId: reporter,
      reason: "spam",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_TARGET");
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a submission naming two targets", async () => {
    const result = await fileReport(makeDeps(), {
      reporterId: reporter,
      reason: "spam",
      listingId: listing,
      reportedUserId: seller,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_TARGET");
  });

  it("refuses to let a student report themselves", async () => {
    const result = await fileReport(makeDeps(), {
      reporterId: reporter,
      reason: "harassment",
      reportedUserId: reporter,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CANNOT_REPORT_SELF");
  });

  it("rejects an over-long note with a field-level error", async () => {
    const result = await fileReport(makeDeps(), {
      reporterId: reporter,
      reason: "other",
      listingId: listing,
      details: "x".repeat(MAX_REPORT_DETAILS_LENGTH + 1),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_DETAILS");
    expect(result.error.details?.details).toBeDefined();
  });

  it("stores a blank note as null instead of an empty string", async () => {
    const create = vi.fn(async (input: CreateReportInput) => reportOf({ ...input }));
    await fileReport(makeDeps({ create }), {
      reporterId: reporter,
      reason: "spam",
      listingId: listing,
      details: "   ",
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ details: null }));
  });

  it("is idempotent — a second report on the same target returns the first", async () => {
    const existing = reportOf({ reason: "scam" });
    const create = vi.fn();
    const result = await fileReport(
      makeDeps({ findOpenByReporterAndTarget: async () => existing, create }),
      { reporterId: reporter, reason: "spam", listingId: listing },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.reason).toBe("scam");
    expect(create).not.toHaveBeenCalled();
  });

  it("looks for the duplicate by the resolved target, not the raw columns", async () => {
    const findOpenByReporterAndTarget = vi.fn(async () => null);
    await fileReport(makeDeps({ findOpenByReporterAndTarget }), {
      reporterId: reporter,
      reason: "harassment",
      reportedUserId: seller,
    });

    expect(findOpenByReporterAndTarget).toHaveBeenCalledWith(reporter, {
      kind: "user",
      id: seller,
    } satisfies ReportTarget);
  });
});

describe("listOpenReports", () => {
  it("flattens the report and its context into one row", async () => {
    const items = await listOpenReports(
      makeDeps({
        listByStatus: async () => [
          {
            report: reportOf({ details: "never delivered" }),
            context: {
              reporterName: "Alex Rivera",
              targetLabel: "Casio FX-991",
              targetHref: "/listings/casio-fx-991",
            },
          },
        ],
      }),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      reporterName: "Alex Rivera",
      targetKind: "listing",
      targetLabel: "Casio FX-991",
      targetHref: "/listings/casio-fx-991",
      details: "never delivered",
    });
  });

  it("asks only for open reports", async () => {
    const listByStatus = vi.fn(async () => []);
    await listOpenReports(makeDeps({ listByStatus }));
    expect(listByStatus).toHaveBeenCalledWith("open", expect.any(Number));
  });
});

describe("resolveReport", () => {
  it("returns the updated report", async () => {
    const result = await resolveReport(makeDeps(), reportOf().id, "dismissed");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("dismissed");
  });

  it("fails rather than throwing when the report is already gone", async () => {
    const result = await resolveReport(
      makeDeps({ setStatus: async () => null }),
      reportOf().id,
      "reviewed",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
  });
});
