import { expect, test } from "bun:test";
import { render } from "ink-testing-library";
import { ChoicePrompt, type ChoicePromptOption } from "./choice-prompt.js";

const options = [
  {
    label: "Continue",
    value: "continue",
  },
  {
    label: "Inspect",
    value: "inspect",
  },
  {
    label: "Pause",
    value: "pause",
  },
] satisfies ChoicePromptOption[];

test("moves with arrow keys and selects highlighted option", async () => {
  const selections: string[] = [];
  const instance = render(
    <ChoicePrompt
      title="Choose action"
      options={options}
      onSelect={({ option }) => {
        selections.push(option.value);
      }}
    />,
  );

  try {
    await waitForFrame();

    instance.stdin.write("\u001B[B");
    await waitForFrame();

    expect(instance.lastFrame()).toContain("> 2. Inspect");

    instance.stdin.write("\r");
    await waitForFrame();

    expect(selections).toEqual(["inspect"]);
  } finally {
    instance.unmount();
  }
});

test("selects numbered shortcuts", async () => {
  const selections: string[] = [];
  const instance = render(
    <ChoicePrompt
      title="Choose action"
      options={options}
      onSelect={({ option }) => {
        selections.push(option.value);
      }}
    />,
  );

  try {
    await waitForFrame();

    instance.stdin.write("3");
    await waitForFrame();

    expect(selections).toEqual(["pause"]);
  } finally {
    instance.unmount();
  }
});

async function waitForFrame() {
  await new Promise((resolveFrame) => {
    setTimeout(resolveFrame, 20);
  });
}
