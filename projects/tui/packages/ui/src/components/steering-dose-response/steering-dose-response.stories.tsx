import type { SteeringDoseResponse as SteeringDoseResponseData } from "@almanac/chart-model";
import { SteeringDoseResponse } from "./steering-dose-response.js";
import type { TuiStory } from "../../stories/story-types.js";

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

export const stories = [
  {
    id: "steering-dose-response/conciseness",
    title: "Steering Dose Response",
    name: "conciseness",
    render: () => <SteeringDoseResponse response={response} />,
  },
] satisfies TuiStory[];
