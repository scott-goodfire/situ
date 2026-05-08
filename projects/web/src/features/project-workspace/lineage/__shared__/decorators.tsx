import { vars } from "@situ/web-ui";
import type { ComponentType } from "react";

export const stageDecorator = (Story: ComponentType) => (
  <div
    style={{
      minHeight: "100vh",
      padding: 24,
      background: vars.color.stage,
      color: vars.color.foreground,
    }}
  >
    <Story />
  </div>
);

export const narrowStageDecorator = (Story: ComponentType) => (
  <div
    style={{
      minHeight: "100vh",
      padding: 24,
      background: vars.color.stage,
      color: vars.color.foreground,
      maxWidth: 480,
    }}
  >
    <Story />
  </div>
);

export const pageDecorator = (Story: ComponentType) => (
  <div
    style={{
      minHeight: "100vh",
      padding: "0 28px",
      background: vars.color.stage,
      color: vars.color.foreground,
    }}
  >
    <Story />
  </div>
);
