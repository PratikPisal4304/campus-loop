import { describe, expect, it } from "vitest";
import { validateDealRequest, validateDealResponse } from "./deal";
const request = {
  actorId: "seller",
  sellerId: "seller",
  buyerId: "buyer",
  mode: "sell",
  pricePaise: 15000,
  status: "active",
  unavailable: false,
};
describe("handoff policies", () => {
  it("requires the seller, a different buyer, and an available listing", () => {
    expect(validateDealRequest(request).ok).toBe(true);
    for (const change of [
      { actorId: "stranger" },
      { buyerId: "seller" },
      { unavailable: true },
      { status: "sold" },
    ])
      expect(validateDealRequest({ ...request, ...change }).ok).toBe(false);
  });
  it("enforces integer prices and free/exchange rules", () => {
    for (const pricePaise of [-1, 0, 1.1, Number.NaN, 2_000_000_001])
      expect(validateDealRequest({ ...request, pricePaise }).ok).toBe(false);
    for (const mode of ["free", "exchange"]) {
      expect(validateDealRequest({ ...request, mode }).ok).toBe(false);
      expect(validateDealRequest({ ...request, mode, pricePaise: 0 }).ok).toBe(true);
    }
  });
  it("only lets the selected buyer confirm a pending deal", () => {
    const deal = { buyerId: "buyer", sellerId: "seller", status: "pending" };
    expect(validateDealResponse(deal, "buyer", "confirm").ok).toBe(true);
    expect(validateDealResponse(deal, "seller", "confirm").ok).toBe(false);
    expect(validateDealResponse(deal, "stranger", "cancel").ok).toBe(false);
    expect(validateDealResponse(deal, "seller", "cancel").ok).toBe(true);
    expect(validateDealResponse({ ...deal, status: "completed" }, "buyer", "confirm").ok).toBe(
      false,
    );
  });
});
