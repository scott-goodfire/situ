import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vanillaExtractPlugin()],
  test: {
    include: ["projects/web/**/*.test.ts", "projects/web/**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.situ/**",
      "**/storybook-static/**",
      "projects/app/**",
      "projects/e2e-tests/**",
    ],
    environment: "happy-dom",
    setupFiles: ["./projects/web/test-setup.ts"],
  },
});
