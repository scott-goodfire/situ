import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const divider = style({
  margin: 0,
  border: 0,
  background: vars.color.border02,
});

export const horizontal = style({
  width: "100%",
  height: 1,
});

export const vertical = style({
  width: 1,
  height: "100%",
  alignSelf: "stretch",
});
