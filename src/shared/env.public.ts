/**
 * Public environment — safe to reach the browser.
 *
 * Each key is referenced *statically* (`process.env.NEXT_PUBLIC_SITE_URL`, never
 * `process.env[key]`) because Next inlines these at build time by literal substitution.
 * A computed lookup would silently become `undefined` in the client bundle.
 */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
