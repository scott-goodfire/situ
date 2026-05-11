import { globalStyle, style } from "@vanilla-extract/css";
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
    "&::marker": {
      content: "''",
    },
  },
});

// Vanilla-extract rejects descendant selectors like `& a` on a `style()` block.
// `globalStyle` is the supported way to target descendants of a defined class.
globalStyle(`${gridItem} a`, {
  textDecoration: "none",
  color: "inherit",
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
