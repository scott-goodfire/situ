import { expect, test } from "bun:test";
import { renderInk } from "../../testing/ink-render.js";
import { LoadingView } from "./loading-view.js";

test("calls onConfirm when Enter is pressed", async () => {
  let confirmed = 0;
  const originalIsTty = process.stdin.isTTY;
  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: true,
  });

  const instance = renderInk(
    <LoadingView
      workspace="/tmp/research-workspace"
      title="Ready"
      footerLabel="Enter start · q quit"
      onConfirm={() => {
        confirmed += 1;
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

    expect(confirmed).toBe(1);
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
