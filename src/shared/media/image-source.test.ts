import { describe, expect, it } from "vitest";
import { isAllowedImageUrl } from "./image-source";

describe("isAllowedImageUrl", () => {
  it("accepts real Cloudinary delivery URLs", () => {
    expect(isAllowedImageUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg")).toBe(
      true,
    );
  });

  it("rejects a host that merely starts with the allowed one", () => {
    // The reason this uses `new URL().origin` and not `startsWith`.
    expect(isAllowedImageUrl("https://res.cloudinary.com.evil.com/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://res.cloudinary.com@evil.com/a.jpg")).toBe(false);
  });

  it("rejects other hosts, other schemes, and junk", () => {
    expect(isAllowedImageUrl("https://evil.com/a.jpg")).toBe(false);
    // Plain http on the right host is still a different origin.
    expect(isAllowedImageUrl("http://res.cloudinary.com/demo/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedImageUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(false);
    expect(isAllowedImageUrl("/relative/path.jpg")).toBe(false);
    expect(isAllowedImageUrl("")).toBe(false);
  });
});
