import { expect, test } from "bun:test";
import { resolveOnboardingAnswers } from "./onboarding-prompt.js";

test("resolves sparse onboarding answers to defaults", () => {
  expect(
    resolveOnboardingAnswers({
      objectiveDraft: "  ",
      researchContextDraft: "",
      defaults: {
        objective: "Explore the workspace",
        researchContext: "Use project-native evals.",
      },
    }),
  ).toEqual({
    objective: "Explore the workspace",
    researchContext: "Use project-native evals.",
  });
});

test("trims explicit onboarding answers", () => {
  expect(
    resolveOnboardingAnswers({
      objectiveDraft: " Improve retrieval ",
      researchContextDraft: " Run pnpm eval ",
      defaults: {
        objective: "Explore the workspace",
        researchContext: "Use project-native evals.",
      },
    }),
  ).toEqual({
    objective: "Improve retrieval",
    researchContext: "Run pnpm eval",
  });
});
