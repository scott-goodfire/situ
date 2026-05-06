import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const section = style({
  padding: "18px 0",
  borderBottom: `1px solid ${vars.color.border02}`,
});

export const title = style({
  margin: "0 0 10px",
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});
