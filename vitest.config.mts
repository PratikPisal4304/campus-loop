import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Honours the "@/*" alias from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      // Only the layers that hold rules worth asserting. Adapters and React
      // components are covered by the Playwright suite instead.
      include: ["src/core/**", "src/features/*/domain/**", "src/features/*/application/**"],
      reporter: ["text", "html"],
    },
  },
});
