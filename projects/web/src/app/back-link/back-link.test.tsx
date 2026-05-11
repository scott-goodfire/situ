import { render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderInRouter } from "../../test-utils/router";
import { BackLink } from "./back-link";

test("BackLink renders a link to the given path with the given label", async () => {
  render(renderInRouter(<BackLink to="/workspace" label="Workspace" />));

  const link = await waitFor(() => screen.getByRole("link", { name: /workspace/i }));
  expect(link.getAttribute("href")).toBe("/workspace");
});

test("BackLink renders the chevron-left icon alongside the label", async () => {
  const { container } = render(renderInRouter(<BackLink to="/x" label="Go" />));

  await waitFor(() => screen.getByRole("link", { name: /go/i }));
  // lucide icons render as <svg> with no role; assert presence and that
  // it sits inside the link.
  const svg = container.querySelector("a > svg");
  expect(svg).not.toBeNull();
});
