/**
 * The single origin listing images may be served from.
 *
 * This MUST stay in step with `images.remotePatterns` in `next.config.ts`. `next/image`
 * *throws* when handed a host it was not configured for, and a listing card renders on
 * Discover, Saved, My Loop and every profile — so one row carrying an off-host URL takes
 * those pages down for every visitor until it is deleted. Validating on the way in and
 * again on the way out means a row that somehow got written still degrades to the
 * listing's colour tile instead of an error page.
 */
export const IMAGE_ORIGIN = "https://res.cloudinary.com";

export function isAllowedImageUrl(value: string): boolean {
  try {
    // `new URL` rather than a prefix check: "https://res.cloudinary.com.evil.com/x.jpg"
    // starts with the right characters but has an entirely different origin.
    return new URL(value).origin === IMAGE_ORIGIN;
  } catch {
    return false;
  }
}
