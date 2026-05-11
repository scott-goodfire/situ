import { expect, test } from "./fixtures";

test("browser saves a key and reaches the ready state", async ({ stack, page }) => {
  await page.goto(stack.url);
  await expect(page.getByRole("heading", { name: "Before we get started" })).toBeVisible();

  await page.getByLabel("Anthropic API key").fill("sk-ant-e2e-fake");
  await page.getByRole("button", { name: "Save key" }).click();

  await expect(page).toHaveURL(/\/research-project$/);
  await expect(page.getByRole("heading", { name: "Research Project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Research Project" })).toBeVisible();
  await expect(page.getByText("Hypotheses")).toHaveCount(0);

  await page.getByLabel("Research Goal").fill("Explore the workspace and prepare a baseline.");
  await page.getByRole("button", { name: "Start Research Project" }).click();

  await expect(page.getByRole("heading", { name: "Current Research Project" })).toBeVisible();
  await expect(page.getByText("Explore the workspace and prepare a baseline.")).toBeVisible();
  await expect(page.getByText("Hypotheses")).toHaveCount(0);
});
