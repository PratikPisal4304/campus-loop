import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Architecture boundaries are enforced here, not just documented.
 *
 * Dependency direction:  app → features → shared → core
 * Cross-feature imports must go through the target feature's `index.ts`.
 *
 * `npm run test:arch` checks the same rules from the module graph's side. If one of
 * these blocks you, the design is wrong — move the code, do not weaken the rule.
 */
const VENDOR_SDKS = ["mongoose", "cloudinary", "bcryptjs", "next-auth", "next-auth/*"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // The original static prototype, kept for reference only.
    "legacy/**",
  ]),

  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use a union of string literals or an `as const` array instead of an enum.",
        },
      ],
    },
  },

  // core/ is pure. It may not know that a framework, a database, or a feature exists.
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*", "@/shared/*", "@/app/*", "@/components/*"],
              message: "core/ must not depend on any outer layer. Keep it pure TypeScript.",
            },
            {
              group: [...VENDOR_SDKS, "next", "next/*", "react"],
              message: "core/ must stay framework- and vendor-agnostic.",
            },
          ],
        },
      ],
    },
  },

  // shared/ is cross-cutting infrastructure. It must not reach up into business features.
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*", "@/app/*"],
              message:
                "shared/ must not depend on a feature — the dependency points the other way.",
            },
          ],
        },
      ],
    },
  },

  // A feature's domain layer is pure business logic: no persistence, no vendors, no React.
  {
    files: ["src/features/*/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                ...VENDOR_SDKS,
                "next",
                "next/*",
                "react",
                "@/shared/db/*",
                "@/app/*",
                "@/components/*",
                "**/infrastructure/**",
                "**/presentation/**",
              ],
              message:
                "A feature's domain/ layer must not import infrastructure, UI, or vendor SDKs. Depend on a port instead.",
            },
          ],
        },
      ],
    },
  },

  // Application layer orchestrates domain + ports. Still no vendor SDKs, still no UI.
  {
    files: ["src/features/*/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [...VENDOR_SDKS, "react", "@/components/*"],
              message:
                "application/ orchestrates through ports. Vendor SDKs belong in infrastructure/.",
            },
          ],
        },
      ],
    },
  },

  // Cross-feature imports must target the public barrel, never a deep path.
  {
    files: ["src/features/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/*/domain",
                "@/features/*/domain/**",
                "@/features/*/application",
                "@/features/*/application/**",
                "@/features/*/infrastructure",
                "@/features/*/infrastructure/**",
                "@/features/*/presentation",
                "@/features/*/presentation/**",
              ],
              message:
                "Import a feature through its public barrel (`@/features/<name>`), not a deep path. Within your own feature, use a relative import.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
