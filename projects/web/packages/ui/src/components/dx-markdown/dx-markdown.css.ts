import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const root = style({
  color: vars.color.foreground,
  fontSize: vars.text.body,
  lineHeight: vars.leading.body,
  wordBreak: "break-word",
});

// Stack spacing: vertical rhythm between block-level children
globalStyle(`${root} > * + *`, {
  marginTop: 12,
});

// Tighten the gap before headings that follow a block
globalStyle(
  `${root} > * + h1, ${root} > * + h2, ${root} > * + h3, ${root} > * + h4, ${root} > * + h5, ${root} > * + h6`,
  {
    marginTop: 20,
  },
);

globalStyle(`${root} p`, {
  margin: 0,
});

globalStyle(`${root} h1, ${root} h2, ${root} h3, ${root} h4, ${root} h5, ${root} h6`, {
  margin: 0,
  fontWeight: 600,
  lineHeight: 1.25,
  letterSpacing: vars.tracking.productSm,
  color: vars.color.foreground,
});

globalStyle(`${root} h1, ${root} h2, ${root} h3`, {
  fontSize: vars.text.body,
});
globalStyle(`${root} h4, ${root} h5, ${root} h6`, {
  fontSize: vars.text.productSm,
  color: vars.color.mutedForeground,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

globalStyle(`${root} a`, {
  color: vars.color.foreground,
  textDecoration: "underline",
  textDecorationColor: vars.color.border02_5,
  textUnderlineOffset: 3,
});
globalStyle(`${root} a:hover`, {
  textDecorationColor: vars.color.foreground,
});

globalStyle(`${root} strong`, { fontWeight: 600 });
globalStyle(`${root} em`, { fontStyle: "italic" });

globalStyle(`${root} ul, ${root} ol`, {
  margin: 0,
  paddingLeft: 22,
});

globalStyle(`${root} ul`, { listStyleType: "disc" });
globalStyle(`${root} ol`, { listStyleType: "decimal" });

globalStyle(`${root} li`, {
  paddingLeft: 2,
});
globalStyle(`${root} li + li`, {
  marginTop: 4,
});

// GFM task lists
globalStyle(`${root} li > input[type="checkbox"]`, {
  marginRight: 6,
  verticalAlign: "middle",
});

globalStyle(`${root} blockquote`, {
  margin: 0,
  paddingLeft: 12,
  borderLeft: `2px solid ${vars.color.border02_5}`,
  color: vars.color.mutedForeground,
});

globalStyle(`${root} hr`, {
  margin: 0,
  border: 0,
  borderTop: `1px solid ${vars.color.border02}`,
});

globalStyle(`${root} table`, {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: vars.text.productBase,
});

globalStyle(`${root} th, ${root} td`, {
  padding: "6px 10px",
  borderBottom: `1px solid ${vars.color.border02}`,
  textAlign: "left",
  verticalAlign: "top",
});

globalStyle(`${root} th`, {
  fontWeight: 600,
  color: vars.color.mutedForeground,
  background: vars.color.card02Hex,
});

// Inline code (not a fenced block)
export const codeInline = style({
  padding: "1px 5px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.sm,
  background: vars.color.card02Hex,
  color: vars.color.foreground,
  fontFamily: vars.font.mono,
  fontSize: "0.9em",
});

// Fenced code block container (wraps either plain <pre><code> or Shiki HTML)
export const codeBlock = style({
  margin: 0,
  padding: "10px 12px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.sm,
  background: vars.color.card02Hex,
  color: vars.color.foreground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productBase,
  lineHeight: 1.55,
  overflowX: "auto",
});

// When Shiki produces <pre class="shiki">, normalize background/spacing to ours
globalStyle(`${codeBlock} pre.shiki`, {
  margin: 0,
  padding: 0,
  background: "transparent !important" as unknown as string,
  font: "inherit",
});

globalStyle(`${codeBlock} pre.shiki code`, {
  display: "block",
  font: "inherit",
  background: "transparent",
});

// Theme switch — Shiki emits per-token --shiki-light / --shiki-dark variables
globalStyle(
  `:root[data-theme="dark"] ${codeBlock} .shiki, :root[data-theme="dark"] ${codeBlock} .shiki span`,
  {
    color: "var(--shiki-dark) !important" as unknown as string,
    backgroundColor: "var(--shiki-dark-bg) !important" as unknown as string,
  },
);
