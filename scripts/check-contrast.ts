/**
 * Audits the design tokens in `src/app/globals.css` against WCAG 2.1 contrast minimums.
 *
 * The pairs below are the ones the UI actually renders — a token is only listed once some
 * component puts that foreground on that ground. Tokens are read out of the stylesheet
 * rather than restated here, so darkening a colour in one place cannot leave this file
 * asserting a ratio nobody ships.
 *
 * Run: `npx tsx scripts/check-contrast.ts` (exits 1 on any failure).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contrastRatioHex, roundRatio } from "../src/shared/ui/contrast";

/** WCAG 2.1 AA for body text. Everything the app renders in a token colour is small text —
 *  the display headings use --color-fg — so this is the floor almost everywhere. */
const AA_TEXT = 4.5;

type Pair = {
  readonly label: string;
  readonly fg: string;
  readonly bg: string;
  readonly min: number;
};

const CSS_PATH = fileURLToPath(new URL("../src/app/globals.css", import.meta.url));

/**
 * Pulls `--color-*` declarations out of the `@theme` block and resolves the one level of
 * `var()` aliasing the token file uses (`--color-accent: var(--color-accent-text)`).
 */
function readColorTokens(css: string): ReadonlyMap<string, string> {
  const raw = new Map<string, string>();
  for (const match of css.matchAll(/--(color-[a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) raw.set(name, value.trim());
  }

  const resolved = new Map<string, string>();
  for (const [name, value] of raw) {
    const alias = /^var\(--(color-[a-z0-9-]+)\)$/.exec(value);
    const target = alias?.[1];
    const literal = target ? raw.get(target) : value;
    if (literal?.startsWith("#")) resolved.set(name, literal);
  }
  return resolved;
}

function buildPairs(token: (name: string) => string): readonly Pair[] {
  const bg = token("color-bg");
  const surface = token("color-surface");
  const hero = token("color-hero");
  const sunk = token("color-panel-sunk");
  const white = "#ffffff";
  const ink = token("color-ink");

  const onGrounds = (label: string, fg: string, min = AA_TEXT): readonly Pair[] =>
    [
      { label: `${label} on cream`, fg, bg, min },
      { label: `${label} on paper`, fg, bg: surface, min },
      { label: `${label} on hero`, fg, bg: hero, min },
      { label: `${label} on sunk panel`, fg, bg: sunk, min },
    ] as const;

  // Every pastel swatch carries the category label in ink; only `dark` carries white.
  const lightSwatches = ["blue", "green", "orange", "purple", "cream", "red", "teal"];

  // Meta text also lands on the tinted panel grounds, which the four page grounds above do
  // not bound: --color-highlight is the tightest of them. Only --color-fg-muted is listed
  // here because it is the only foreground any of these panels actually carries.
  const panelGrounds = ["color-highlight", "color-pulse", "color-checklist", "color-avatar"];

  return [
    ...onGrounds("meta text (--color-fg-muted)", token("color-fg-muted")),
    ...panelGrounds.map((ground) => ({
      label: `meta text on ${ground.replace("color-", "")} panel`,
      fg: token("color-fg-muted"),
      bg: token(ground),
      min: AA_TEXT,
    })),
    ...onGrounds("accent text (--color-accent-text)", token("color-accent-text")),
    ...onGrounds("teal eyebrow (--color-teal)", token("color-teal")),
    ...onGrounds("danger (--color-danger)", token("color-danger")),
    ...onGrounds("success (--color-success)", token("color-success")),

    { label: "free price on card", fg: token("color-green"), bg: surface, min: AA_TEXT },
    { label: "free price on cream", fg: token("color-green"), bg, min: AA_TEXT },
    { label: "exchange price on card", fg: token("color-teal"), bg: surface, min: AA_TEXT },

    { label: "white on accent fill", fg: white, bg: token("color-accent"), min: AA_TEXT },
    {
      label: "white on accent hover fill",
      fg: white,
      bg: token("color-accent-hover"),
      min: AA_TEXT,
    },
    { label: "white on danger fill", fg: white, bg: token("color-danger"), min: AA_TEXT },

    // Mode badges are a white pill on the swatch, so the ground is white, not the swatch.
    ...(["rent", "sell", "free", "exchange"] as const).map((mode) => ({
      label: `mode badge ${mode} on white pill`,
      fg: token(`color-mode-${mode}`),
      bg: white,
      min: AA_TEXT,
    })),

    ...lightSwatches.map((name) => ({
      label: `ink label on ${name} swatch`,
      fg: ink,
      bg: token(`color-swatch-${name}`),
      min: AA_TEXT,
    })),
    {
      label: "white label on dark swatch",
      fg: white,
      bg: token("color-swatch-dark"),
      min: AA_TEXT,
    },

    /**
     * The dark grounds. These exist because the darkened accent that fixed the light pages
     * reads at 2.66:1 on the sidebar — no single accent value clears 4.5:1 on both cream
     * and #1c1c1b, so dark surfaces use `--color-accent-on-dark`. Asserted here so a future
     * "simplify the tokens" change cannot quietly undo it.
     */
    {
      label: "accent-on-dark nav item on sidebar",
      fg: token("color-accent-on-dark"),
      bg: token("color-sidebar"),
      min: AA_TEXT,
    },
    {
      label: "accent-on-dark eyebrow on banner",
      fg: token("color-accent-on-dark"),
      bg: token("color-banner"),
      min: AA_TEXT,
    },
    {
      // The unread count and the "CL" mark are text on the bright orange. White is only
      // 3.01:1 there; ink is 5.95:1.
      label: "ink on accent-on-dark badge",
      fg: token("color-ink"),
      bg: token("color-accent-on-dark"),
      min: AA_TEXT,
    },

    {
      label: "sidebar meta on sidebar",
      fg: token("color-sidebar-muted"),
      bg: token("color-sidebar"),
      min: AA_TEXT,
    },

    // The raw --color-orange is a decorative fill: it manages only 2.67:1 on cream, below
    // even the 3:1 graphics floor, which is exactly why --color-accent-text exists. The
    // floor recorded here only asserts it stays visible as a block against the page.
    { label: "orange decorative fill on cream", fg: token("color-orange"), bg, min: 1.5 },
  ];
}

function main(): void {
  const tokens = readColorTokens(readFileSync(CSS_PATH, "utf8"));
  const token = (name: string): string => {
    const value = tokens.get(name);
    if (!value) throw new Error(`globals.css defines no --${name}`);
    return value;
  };

  const failures: string[] = [];
  for (const pair of buildPairs(token)) {
    const ratio = roundRatio(contrastRatioHex(pair.fg, pair.bg));
    const ok = ratio >= pair.min;
    if (!ok) failures.push(`${pair.label}: ${ratio}:1 (needs ${pair.min}:1)`);
    process.stdout.write(
      `${ok ? "pass" : "FAIL"}  ${ratio.toFixed(2).padStart(5)}:1  (min ${pair.min})  ${pair.label}\n`,
    );
  }

  if (failures.length > 0) {
    process.stderr.write(`\n${failures.length} contrast failure(s):\n`);
    for (const line of failures) process.stderr.write(`  - ${line}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("\nAll token pairs meet their contrast target.\n");
}

main();
