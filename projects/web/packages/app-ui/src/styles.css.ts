import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const commandPre = style({
  margin: 0,
  width: "max-content",
  padding: "8px 10px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productBase,
});
