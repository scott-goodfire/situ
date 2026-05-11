import type { Meta, StoryObj } from "@storybook/react-vite";
import { MeasurementsListView } from "./measurements-list-view";
import { MEASUREMENT_FIXTURES } from "../../fixtures";

const meta: Meta<typeof MeasurementsListView> = {
  title: "App UI/Measurements",
  component: MeasurementsListView,
};

export default meta;

type Story = StoryObj<typeof MeasurementsListView>;

export const Default: Story = { args: { measurements: MEASUREMENT_FIXTURES } };
export const Empty: Story = { args: { measurements: [] } };
