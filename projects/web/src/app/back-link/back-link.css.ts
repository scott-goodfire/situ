import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const link = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "inherit",
  textDecoration: "none",
  ":hover": {
    color: vars.color.foreground,
    textDecoration: "underline",
    textDecorationColor: vars.color.border02_5,
    textUnderlineOffset: 3,
  },
});
