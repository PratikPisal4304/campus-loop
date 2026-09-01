/**
 * Architecture tests. These run in CI (`npm run test:arch`) and fail the build when the
 * feature-based clean architecture is violated — the boundaries are executable, not advisory.
 *
 * Allowed dependency direction:  app → features → shared → core
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "Circular dependencies signal a missing abstraction — usually a concept that belongs in core/.",
      from: {},
      to: { circular: true },
    },
    {
      name: "core-is-pure",
      severity: "error",
      comment: "core/ holds framework-agnostic primitives and may not depend on any outer layer.",
      from: { path: "^src/core" },
      to: { path: "^src/(features|shared|app|components)" },
    },
    {
      name: "core-has-no-vendors",
      severity: "error",
      comment: "core/ must not import a framework or vendor SDK.",
      from: { path: "^src/core" },
      to: { dependencyTypes: ["npm"], pathNot: "node_modules/(zod|server-only)" },
    },
    {
      name: "shared-knows-no-features",
      severity: "error",
      comment: "shared/ is cross-cutting infrastructure — the dependency points the other way.",
      from: { path: "^src/shared" },
      to: { path: "^src/(features|app)" },
    },
    {
      name: "feature-domain-is-pure",
      severity: "error",
      comment:
        "A feature's domain/ layer must not reach into persistence, UI, or another layer's implementation.",
      from: { path: "^src/features/[^/]+/domain" },
      to: {
        path: "^src/(app|components)|^src/features/[^/]+/(infrastructure|presentation)|^src/shared/db",
      },
    },
    {
      name: "feature-domain-has-no-vendors",
      severity: "error",
      comment: "A feature's domain/ layer must depend on ports, not on mongoose/next-auth/react.",
      from: { path: "^src/features/[^/]+/domain" },
      to: {
        dependencyTypes: ["npm"],
        pathNot: "node_modules/(zod|server-only)",
      },
    },
    {
      name: "application-uses-ports-not-sdks",
      severity: "error",
      comment: "Vendor SDKs belong in infrastructure/ adapters, behind a port.",
      from: { path: "^src/features/[^/]+/application" },
      to: { path: "node_modules/(mongoose|cloudinary|bcryptjs|next-auth)" },
    },
    {
      name: "cross-feature-via-barrel-only",
      severity: "error",
      comment:
        "Import another feature through its public barrel (@/features/<name>), never a deep path.",
      from: { path: "^src/features/([^/]+)/" },
      to: {
        path: "^src/features/([^/]+)/(domain|application|infrastructure|presentation)/",
        pathNot: "^src/features/$1/",
      },
    },
    {
      name: "app-uses-feature-barrels",
      severity: "error",
      comment: "Routes compose features through their public barrels.",
      from: { path: "^src/app" },
      to: { path: "^src/features/[^/]+/(domain|application|infrastructure)/" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts)$",
          "\\.d\\.ts$",
          "(^|/)tsconfig\\.json$",
          "^src/app/",
          "^src/features/[^/]+/index\\.ts$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.tsx?$|^\\.next|^legacy" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
