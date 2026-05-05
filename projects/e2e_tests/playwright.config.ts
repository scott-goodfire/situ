import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests",
  outputDir: process.env.SITU_E2E_RESULTS_DIR ?? join(tmpdir(), "situ-e2e-results"),
  timeout: 180_000,
  expect: {
    timeout: 60_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    browserName: "chromium",
    headless: true,
  },
});
