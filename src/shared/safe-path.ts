/** Where a student lands when the requested destination cannot be trusted. */
const FALLBACK = "/";

/**
 * Reduce a caller-supplied redirect target to a same-site path, or the fallback.
 *
 * The obvious check — "starts with a slash, but not two" — is not enough. Browsers
 * normalise a backslash to a forward slash inside a URL path, so `/\evil.com` is followed
 * as the protocol-relative `//evil.com`: an off-site redirect from a page that has just
 * accepted the user's password. Both separators have to be rejected in second position.
 *
 * Accepts an absolute URL too, keeping only its path — that is the form Auth.js puts in
 * `callbackUrl`.
 */
export function safeInternalPath(value: unknown, origin?: string): string {
  if (typeof value !== "string" || value.length === 0) return FALLBACK;

  if (/^\/(?![/\\])/.test(value)) return value;

  // An absolute URL is fine only if it points back at us; keep just the path.
  if (origin) {
    try {
      const url = new URL(value);
      if (url.origin === origin) return `${url.pathname}${url.search}` || FALLBACK;
    } catch {
      return FALLBACK;
    }
  }

  return FALLBACK;
}
