import type { Meta, StoryObj } from "@storybook/react";
import type { SteeringDoseResponse as SteeringDoseResponseData } from "@situ/chart-model";
import { SteeringDoseResponse } from "./steering-dose-response";

const response = {
  id: "conciseness",
  label: "Conciseness steering",
  metricLabel: "Mean response length",
  direction: "down",
  unit: " tokens",
  precision: 0,
  points: [
    {
      id: "strength-0",
      label: "0.0",
      strength: 0,
      value: 184,
    },
    {
      id: "strength-025",
      label: "0.25",
      strength: 0.25,
      value: 152,
    },
    {
      id: "strength-05",
      label: "0.5",
      strength: 0.5,
      value: 121,
    },
    {
      id: "strength-075",
      label: "0.75",
      strength: 0.75,
      value: 118,
    },
    {
      id: "strength-1",
      label: "1.0",
      strength: 1,
      value: 139,
    },
  ],
} satisfies SteeringDoseResponseData;

const meta = {
  title: "Charts/Steering Dose Response",
  component: SteeringDoseResponse,
  decorators: [
    (Story) => (
      <div style={{ width: "760px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    response,
  },
} satisfies Meta<typeof SteeringDoseResponse>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Conciseness: Story = {};
