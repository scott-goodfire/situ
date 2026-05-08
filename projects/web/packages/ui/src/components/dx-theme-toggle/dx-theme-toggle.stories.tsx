import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DxThemeToggle, type DxThemeMode } from "./dx-theme-toggle";

const meta = {
  title: "UI/Dx Theme Toggle",
  component: DxThemeToggle,
} satisfies Meta<typeof DxThemeToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "auto", onChange: () => undefined },
  render: () => {
    const [mode, setMode] = useState<DxThemeMode>("auto");
    return <DxThemeToggle value={mode} onChange={({ mode: next }) => setMode(next)} />;
  },
};
