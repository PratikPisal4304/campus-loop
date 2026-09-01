import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-path";

const ORIGIN = "https://campus-loop.example";

describe("safeInternalPath", () => {
  it("keeps an ordinary internal path", () => {
    expect(safeInternalPath("/saved")).toBe("/saved");
    expect(safeInternalPath("/listings/ti-84?from=search")).toBe("/listings/ti-84?from=search");
  });

  it("rejects a protocol-relative URL", () => {
    expect(safeInternalPath("//evil.com")).toBe("/");
  });

  it("rejects the backslash variant browsers normalise to a protocol-relative URL", () => {
    // The bug this replaced: /^\/(?!\/)/ let this through.
    expect(safeInternalPath("/\\evil.com")).toBe("/");
    expect(safeInternalPath("/\\\\evil.com")).toBe("/");
  });

  it("rejects absolute URLs pointing off-site", () => {
    expect(safeInternalPath("https://evil.com/x", ORIGIN)).toBe("/");
    expect(safeInternalPath("javascript:alert(1)", ORIGIN)).toBe("/");
  });

  it("accepts our own absolute URL and keeps only the path", () => {
    // This is the shape Auth.js puts in `callbackUrl`.
    expect(safeInternalPath(`${ORIGIN}/messages?tab=1`, ORIGIN)).toBe("/messages?tab=1");
  });

  it("falls back on junk", () => {
    expect(safeInternalPath(undefined)).toBe("/");
    expect(safeInternalPath("")).toBe("/");
    expect(safeInternalPath("saved")).toBe("/");
  });
});
