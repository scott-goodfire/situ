import { expect, test } from "bun:test";
import { renderInk } from "../../testing/ink-render.js";
import { OnboardingPrompt, type OnboardingAnswers } from "./onboarding-prompt.js";

test("submits defaults after the objective and context onboarding steps", async () => {
  const submissions: OnboardingAnswers[] = [];
  const originalIsTty = process.stdin.isTTY;
  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: true,
  });

  const instance = renderInk(
    <OnboardingPrompt
      workspace="/tmp/research-workspace"
      defaults={{
        objective: "Explore the workspace",
        researchContext: "Use project-native evals.",
        max_experiments: 0,
      }}
      onSubmit={({ answers }) => {
        submissions.push(answers);
      }}
      onExit={() => {}}
      terminalSize={{
        columns: 120,
        rows: 36,
      }}
    />,
  );

  try {
    await waitForFrame();

    instance.stdin.write("\r");
    await waitForFrame();
    expect(instance.lastFrame()).toContain("Research context");

    instance.stdin.write("\r");
    await waitForFrame();
    expect(instance.lastFrame()).toContain("Confirm setup");

    instance.stdin.write("\r");
    await waitForFrame();

    expect(submissions).toEqual([
      {
        objective: "Explore the workspace",
        researchContext: "Use project-native evals.",
      },
    ]);
  } finally {
    instance.unmount();
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: originalIsTty,
    });
  }
});

async function waitForFrame() {
  await new Promise((resolveFrame) => {
    setTimeout(resolveFrame, 20);
  });
}
