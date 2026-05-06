import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

const rotate = keyframes({
  to: { transform: "rotate(360deg)" },
});

export const spinner = style({
  display: "inline-block",
  flexShrink: 0,
  color: vars.color.mutedForeground,
  animation: `${rotate} 0.7s linear infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});
