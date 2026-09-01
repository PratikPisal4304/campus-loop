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

  it("accepts a cuid and rejects input that is clearly not an id", () => {
    // Prisma `@default(cuid())`. The check is deliberately permissive on length — cuid1
    // and cuid2 differ — and exists to reject obvious junk before it reaches the database,
    // not to re-implement the id format.
    expect(isEntityId("clx3k9d2h0000v8p1abcd1234")).toBe(true);
    expect(isEntityId("cm4h7q2xy0001s3n9")).toBe(true);
    expect(isEntityId("")).toBe(false);
    expect(isEntityId("short")).toBe(false);
    expect(isEntityId("not an id at all!")).toBe(false);
    expect(isEntityId("../../etc/passwd")).toBe(false);
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
