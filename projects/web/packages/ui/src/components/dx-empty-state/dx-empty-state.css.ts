import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  padding: "64px 16px",
  textAlign: "center",
});

export const heading = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.displayLg,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
  lineHeight: 1.15,
});

export const description = style({
  margin: 0,
  maxWidth: 480,
  color: vars.color.mutedForeground,
  fontSize: vars.text.body,
  lineHeight: 1.5,
});

export const action = style({ marginTop: 6 });
