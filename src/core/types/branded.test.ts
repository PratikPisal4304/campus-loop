import { describe, expect, it } from "vitest";
import { isEmail, isEntityId, isSlug, toEmail, toSlug } from "./branded";

describe("branded types", () => {
  it("normalises email case and surrounding space", () => {
    expect(toEmail("  Alex.Rivera@Example.COM ")).toBe("alex.rivera@example.com");
  });

  it("recognises well-formed emails and rejects the near misses", () => {
    expect(isEmail("student@campus.edu")).toBe(true);
    expect(isEmail("no-at-sign.example.com")).toBe(false);
    expect(isEmail("trailing@dot.")).toBe(false);
    expect(isEmail("spaces in@example.com")).toBe(false);
  });

  it("accepts a 24-character hex ObjectId and nothing else", () => {
    expect(isEntityId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isEntityId("507f1f77bcf86cd79943901")).toBe(false);
    expect(isEntityId("not-an-object-id-at-all!")).toBe(false);
  });

  describe("toSlug", () => {
    it("handles the listing titles this marketplace actually sees", () => {
      expect(toSlug("TI-84 Plus CE calculator")).toBe("ti-84-plus-ce-calculator");
      expect(toSlug("Books & Textbooks")).toBe("books-textbooks");
      expect(toSlug("  Engineering Mathematics 3  ")).toBe("engineering-mathematics-3");
    });

    it("strips accents rather than dropping the letter", () => {
      expect(toSlug("Café Résumé")).toBe("cafe-resume");
    });

    it("is idempotent, so re-slugging a slug is safe", () => {
      const once = toSlug("Arduino Uno R3 — starter kit");
      expect(toSlug(once)).toBe(once);
    });

    it("produces something isSlug() accepts, with no leading or trailing dash", () => {
      const slug = toSlug("!!! Lab coat (size M) !!!");
      expect(isSlug(slug)).toBe(true);
    });
  });
});
