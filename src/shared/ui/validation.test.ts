import { describe, expect, it } from "vitest";
import { scorePassword, validateFields, validators } from "./validation";

describe("validators.password", () => {
  it("rejects the prototype's old 6-character minimum", () => {
    // The static site accepted "abc123". This one does not.
    expect(validators.password("abc123")).toBe("Passwords are at least 8 characters.");
  });

  it("requires both a letter and a digit", () => {
    expect(validators.password("password")).toBe("Include at least one letter and one number.");
    expect(validators.password("12345678")).toBe("Include at least one letter and one number.");
    expect(validators.password("password1")).toBeNull();
  });
});

describe("scorePassword", () => {
  it("starts empty with the prototype's hint text", () => {
    expect(scorePassword("")).toEqual({
      score: 0,
      label: "Password must be at least 8 characters",
    });
  });

  it("does not call a long repetitive password strong", () => {
    expect(scorePassword("aaaaaaaaaaaaaaaa").score).toBeLessThanOrEqual(1);
  });

  it("rewards length and variety, capped at the four bars the UI draws", () => {
    expect(scorePassword("Str0ng!Passw0rd").score).toBe(4);
    expect(scorePassword("campus1234").score).toBeGreaterThanOrEqual(1);
  });
});

describe("validateFields", () => {
  it("returns only the fields that failed", () => {
    const errors = validateFields(
      { name: "Alex Rivera", email: "not-an-email" },
      { name: validators.name, email: validators.email },
    );
    expect(errors).toEqual({ email: "Enter a valid email address." });
  });

  it("treats a missing key as an empty value rather than skipping the rule", () => {
    const errors = validateFields({}, { email: validators.email });
    expect(errors.email).toBe("Email is required.");
  });
});
