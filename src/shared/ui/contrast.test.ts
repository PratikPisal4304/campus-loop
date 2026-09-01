import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  contrastRatioHex,
  parseHex,
  relativeLuminance,
  roundRatio,
} from "./contrast";

describe("parseHex", () => {
  it("reads six-digit hex", () => {
    expect(parseHex("#f36b38")).toEqual({ r: 0xf3, g: 0x6b, b: 0x38 });
  });

  it("expands three-digit shorthand", () => {
    expect(parseHex("#abc")).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
  });

  it("accepts a missing hash and surrounding space", () => {
    expect(parseHex("  FFFFFF ")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("rejects anything that is not a hex colour", () => {
    expect(parseHex("#gggggg")).toBeNull();
    expect(parseHex("#ff")).toBeNull();
    expect(parseHex("rgb(0,0,0)")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("anchors at the WCAG endpoints", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 10);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 10);
  });

  it("uses the linear segment below the 0.03928 knee", () => {
    // 10/255 = 0.0392… sits just under the knee, so it must divide by 12.92 rather
    // than take the power curve — the two branches differ by ~30% right here.
    expect(relativeLuminance({ r: 10, g: 10, b: 10 })).toBeCloseTo(10 / 255 / 12.92, 10);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatioHex("#000000", "#ffffff")).toBeCloseTo(21, 6);
  });

  it("returns 1 for a colour against itself", () => {
    expect(contrastRatioHex("#4d8f82", "#4d8f82")).toBeCloseTo(1, 10);
  });

  it("is symmetric — order of foreground and background does not matter", () => {
    const a = { r: 0x17, g: 0x17, b: 0x17 };
    const b = { r: 0xd9, g: 0xc9, b: 0xaa };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it("matches known published ratios", () => {
    // Spot values from the WebAIM contrast checker, to catch a transposed coefficient.
    expect(roundRatio(contrastRatioHex("#777777", "#ffffff"))).toBe(4.47);
    expect(roundRatio(contrastRatioHex("#ffffff", "#a83a0c"))).toBe(6.41);
  });

  it("throws on a malformed hex rather than returning a plausible number", () => {
    expect(() => contrastRatioHex("nope", "#ffffff")).toThrow(/Invalid hex/);
  });
});

describe("roundRatio", () => {
  it("truncates instead of rounding up, so a borderline pair never reads as passing", () => {
    expect(roundRatio(4.4999)).toBe(4.49);
    expect(roundRatio(4.5)).toBe(4.5);
  });
});
