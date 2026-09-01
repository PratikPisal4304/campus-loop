/**
 * WCAG 2.1 relative-luminance and contrast maths.
 *
 * Lives in `shared/ui` rather than in the script so the arithmetic is unit-testable and
 * the design-token audit script (`scripts/check-contrast.ts`) has a single source of truth.
 */

export type Rgb = { readonly r: number; readonly g: number; readonly b: number };

const HEX_PATTERN = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parses `#rgb` / `#rrggbb` into 0–255 channels. Returns null for anything else. */
export function parseHex(hex: string): Rgb | null {
  const value = hex.trim();
  if (!HEX_PATTERN.test(value)) return null;

  const body = value.startsWith("#") ? value.slice(1) : value;
  const full =
    body.length === 3
      ? body
          .split("")
          .map((char) => char + char)
          .join("")
      : body;

  const int = Number.parseInt(full, 16);
  return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
}

/** sRGB channel (0–255) to its linear-light value, per WCAG's transfer function. */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b)
  );
}

/** Contrast ratio between two opaque colours, always ≥ 1 and ≤ 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Convenience wrapper over `contrastRatio` for hex literals. Throws on malformed input,
 *  which is a programmer error rather than an expected failure. */
export function contrastRatioHex(foreground: string, background: string): number {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) throw new Error(`Invalid hex colour: ${!fg ? foreground : background}`);
  return contrastRatio(fg, bg);
}

/** Rounds down to 2dp so a reported ratio never overstates a borderline pair. */
export function roundRatio(ratio: number): number {
  return Math.floor(ratio * 100) / 100;
}
