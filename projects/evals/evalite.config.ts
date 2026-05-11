import { defineConfig } from "evalite/config";

export default defineConfig({
  scoreThreshold: 100,
  testTimeout: 120_000,
  maxConcurrency: 1,
  forceRerunTriggers: [
    "../app/src/claude/agents/runs/prompts.ts",
    "../app/src/claude/agents/skills/runtime/**/*.md",
    "packages/fixtures/src/**/*.ts",
    "packages/worlds/src/**/*.ts",
  ],
});
