import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const grid = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
});

export const gridItem = style({
  display: "block",
  listStyle: "none",
  selectors: {
    "& a": {
      textDecoration: "none",
      color: "inherit",
    },
    "&::marker": {
      content: "''",
    },
  },
});

export const cardBody = style({
  display: "grid",
  gap: 6,
});

export const cardTitle = style({
  margin: 0,
  fontSize: vars.text.productLg,
  fontWeight: 500,
  color: vars.color.foreground,
});

export const cardDescription = style({
  margin: 0,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
  lineHeight: 1.5,
});
