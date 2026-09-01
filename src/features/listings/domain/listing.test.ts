import { describe, expect, it } from "vitest";
import {
  MODES,
  normalisePrice,
  priceRuleFor,
  swatchForKey,
  validatePrice,
  type Mode,
} from "./listing";

const price = (
  mode: Mode,
  pricePaise: number | null,
  rentUnit: "day" | "week" | "month" | null = null,
) => validatePrice({ mode, pricePaise, rentUnit });

describe("priceRuleFor", () => {
  it("requires a price only for the modes that involve money", () => {
    expect(priceRuleFor("sell")).toBe("required");
    expect(priceRuleFor("rent")).toBe("required");
    expect(priceRuleFor("free")).toBe("forbidden");
    expect(priceRuleFor("exchange")).toBe("forbidden");
  });

  it("has an answer for every mode the UI can produce", () => {
    for (const mode of MODES) {
      expect(["required", "forbidden"]).toContain(priceRuleFor(mode));
    }
  });
});

describe("validatePrice", () => {
  it("rejects the free-item-with-a-price the prototype happily published", () => {
    const violations = price("free", 50_000);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.field).toBe("price");
    expect(violations[0]?.message).toContain("free item can't have a price");
  });

  it("rejects a sale with no price", () => {
    expect(price("sell", null)[0]?.field).toBe("price");
    expect(price("sell", 0)[0]?.field).toBe("price");
  });

  it("rejects an exchange with a price, and says what to do instead", () => {
    expect(price("exchange", 100)[0]?.message).toContain("what you want in return");
  });

  it("requires a rental period for rentals and forbids it elsewhere", () => {
    expect(price("rent", 20_000, null).some((v) => v.field === "rentUnit")).toBe(true);
    expect(price("rent", 20_000, "week")).toEqual([]);
    expect(price("sell", 20_000, "week").some((v) => v.field === "rentUnit")).toBe(true);
  });

  it("accepts the shapes that should pass", () => {
    expect(price("sell", 50_000)).toEqual([]);
    expect(price("free", null)).toEqual([]);
    expect(price("free", 0)).toEqual([]);
    expect(price("exchange", null)).toEqual([]);
  });
});

describe("normalisePrice", () => {
  it("zeroes the price on modes that forbid one, so bad data cannot reach the database", () => {
    expect(normalisePrice({ mode: "free", pricePaise: 50_000, rentUnit: "week" })).toEqual({
      pricePaise: 0,
      rentUnit: null,
    });
  });

  it("drops the rental period from a sale", () => {
    expect(normalisePrice({ mode: "sell", pricePaise: 50_000, rentUnit: "week" })).toEqual({
      pricePaise: 50_000,
      rentUnit: null,
    });
  });

  it("keeps both for a rental", () => {
    expect(normalisePrice({ mode: "rent", pricePaise: 20_000, rentUnit: "week" })).toEqual({
      pricePaise: 20_000,
      rentUnit: "week",
    });
  });
});

describe("swatchForKey", () => {
  it("is stable, so a listing does not change colour between renders", () => {
    expect(swatchForKey("ti-84-plus-ce")).toBe(swatchForKey("ti-84-plus-ce"));
  });

  it("spreads titles across more than one colour", () => {
    const seen = new Set(
      ["arduino-uno", "lab-coat", "casio-991", "drafting-set", "resnick-halliday"].map(
        swatchForKey,
      ),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
