---
name: situ-policy-storybook-stories
description: Use whenever adding, modifying, or reviewing Storybook stories — Dx primitives, app-ui list/detail views, or any *.stories.tsx file.
---

# Storybook Stories

Every component or view has stories with a fixed shape: `Meta`, default
export, named state variants, optional `AllVariants` composite.

```ts
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxButton } from "./dx-button";

const meta: Meta<typeof DxButton> = {
  title: "UI/Dx Button",
  component: DxButton,
  argTypes: { variant: { control: { type: "select" }, options: [...] } },
  args: { children: "Button", variant: "secondary" },
};

export default meta;
type Story = StoryObj<typeof DxButton>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
```

## Rules

- File name: `<sibling>.stories.tsx`.
- Import `Meta`, `StoryObj` from `@storybook/react-vite`.
- Default export is a `Meta<typeof Component>` with `title`, `component`,
  `args`, and `argTypes` (when controls help).
- Title format: `"<Section>/<PascalName>"` —
  `"UI/Dx Button"`, `"App UI/Tasks List View"`.
- Each story is a named export of type `Story`. Names are PascalCase
  variant labels (`Primary`, `Secondary`, `Active`, `Done`, `NotFound`).
- App-ui views use fixture imports (`HYPOTHESIS_FIXTURES`) to drive
  state-variant stories. Don't inline fixtures.
- An `AllVariants` story can render every variant side-by-side via a
  `render` function.

## Avoid

- A story file without a default `meta` export.
- Stories named after props (`smallButton`, `dangerButton`) instead of
  states (`Small`, `Danger`).
- Inlined fixture data in app-ui stories — import from `fixtures/`.
- Using `legacy` or non-Vite Storybook imports.

## See also

- `situ-policy-storybook-config`
- `situ-policy-fixture-shape`
- `situ-policy-dx-component-shape`
- `situ-policy-list-view-shape`
- `situ-policy-detail-view-shape`
