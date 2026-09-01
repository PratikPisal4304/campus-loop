import { describe, expect, it } from "vitest";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  acceptsEnquiries,
  canTransitionTo,
  isListingStatus,
} from "./listing";

describe("status vocabulary", () => {
  it("gives every status a label, so no raw enum reaches the screen", () => {
    for (const status of LISTING_STATUSES) {
      expect(LISTING_STATUS_LABELS[status]).toBeTruthy();
      expect(LISTING_STATUS_LABELS[status]).not.toBe(status);
    }
  });

  it("recognises only the statuses it declares", () => {
    expect(isListingStatus("sold")).toBe(true);
    expect(isListingStatus("archived")).toBe(false);
  });
});

describe("canTransitionTo", () => {
  it("lets a live listing be reserved, sold or closed", () => {
    expect(canTransitionTo("active", "reserved")).toBe(true);
    expect(canTransitionTo("active", "sold")).toBe(true);
    expect(canTransitionTo("active", "closed")).toBe(true);
  });

  it("lets a reserved hold fall through back to live", () => {
    expect(canTransitionTo("reserved", "active")).toBe(true);
    expect(canTransitionTo("reserved", "sold")).toBe(true);
  });

  it("reopens an ended listing rather than making the student re-create it", () => {
    expect(canTransitionTo("sold", "active")).toBe(true);
    expect(canTransitionTo("closed", "active")).toBe(true);
  });

  it("refuses to move between two end states without reopening first", () => {
    expect(canTransitionTo("sold", "closed")).toBe(false);
    expect(canTransitionTo("closed", "sold")).toBe(false);
    expect(canTransitionTo("closed", "reserved")).toBe(false);
    expect(canTransitionTo("sold", "reserved")).toBe(false);
  });

  it("treats staying put as allowed, so a double-click is not an error", () => {
    for (const status of LISTING_STATUSES) {
      expect(canTransitionTo(status, status)).toBe(true);
    }
  });
});

describe("acceptsEnquiries", () => {
  it("keeps the queue open on a reserved item, since holds fall through", () => {
    expect(acceptsEnquiries("active")).toBe(true);
    expect(acceptsEnquiries("reserved")).toBe(true);
  });

  it("closes the door once the deal is over", () => {
    expect(acceptsEnquiries("sold")).toBe(false);
    expect(acceptsEnquiries("closed")).toBe(false);
  });
});
