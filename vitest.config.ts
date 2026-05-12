import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vanillaExtractPlugin()],
  test: {
    include: ["projects/web/**/*.test.ts", "projects/web/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.situ/**", "**/storybook-static/**"],
    environment: "happy-dom",
    setupFiles: [],
  },
});
