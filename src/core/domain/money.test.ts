import { describe, expect, it } from "vitest";
import { Money } from "./money";
import { InvariantViolationError } from "./errors";

describe("Money", () => {
  it("rejects fractional paise, because a half-paisa is not a thing", () => {
    expect(() => Money.fromPaise(10.5)).toThrow(InvariantViolationError);
  });

  it("survives the arithmetic that breaks floats", () => {
    // 0.1 + 0.2 !== 0.3 in float rupees. In paise it is just 10 + 20 === 30.
    const total = Money.fromRupees(0.1).add(Money.fromRupees(0.2));
    expect(total.equals(Money.fromRupees(0.3))).toBe(true);
    expect(total.paise).toBe(30);
  });

  it("rounds rupee input to the nearest paisa", () => {
    expect(Money.fromRupees(12.345).paise).toBe(1235);
    expect(Money.fromRupees(499.5).paise).toBe(49950);
  });

  it("sums an empty list to zero rather than throwing", () => {
    expect(Money.sum([]).isZero).toBe(true);
  });

  it("clamps negatives to zero without touching positives", () => {
    expect(Money.fromPaise(-500).clampToZero().isZero).toBe(true);
    expect(Money.fromPaise(500).clampToZero().paise).toBe(500);
  });

  it("drops the decimals on whole rupees and keeps them otherwise", () => {
    // Non-breaking space between symbol and digits, hence the loose assertions.
    expect(Money.fromRupees(500).format()).toContain("500");
    expect(Money.fromRupees(500).format()).not.toContain("500.00");
    expect(Money.fromRupees(499.5).format()).toContain("499.50");
  });
});
