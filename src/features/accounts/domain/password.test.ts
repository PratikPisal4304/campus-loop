import { describe, expect, it } from "vitest";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validatePassword } from "./password";

describe("validatePassword", () => {
  it("accepts a password with a letter, a digit and enough length", () => {
    expect(validatePassword("campus2026")).toBeNull();
  });

  it("rejects an empty password", () => {
    expect(validatePassword("")).toBe("Password is required.");
  });

  it("rejects anything shorter than the minimum", () => {
    expect(validatePassword("camp26")).toContain(String(PASSWORD_MIN_LENGTH));
    expect(validatePassword("a".repeat(PASSWORD_MIN_LENGTH - 1) + "1")).toBeNull();
  });

  it("rejects a password longer than the storage limit", () => {
    expect(validatePassword(`${"a1".repeat(PASSWORD_MAX_LENGTH)}`)).toBe(
      "That password is too long.",
    );
  });

  it("requires both a letter and a digit", () => {
    expect(validatePassword("allletters")).toBe("Include at least one letter and one number.");
    expect(validatePassword("12345678")).toBe("Include at least one letter and one number.");
  });
});
