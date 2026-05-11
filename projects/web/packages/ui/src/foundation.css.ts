import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

globalStyle("*", {
  boxSizing: "border-box",
});

globalStyle("html, body, #root, #storybook-root", {
  height: "100%",
});

globalStyle("html", {
  background: vars.color.background,
});

globalStyle("#root", {
  isolation: "isolate",
  display: "flex",
  flexDirection: "column",
});

globalStyle("body", {
  margin: 0,
  background: vars.color.background,
  color: vars.color.foreground,
  fontFamily: vars.font.sans,
  fontSize: vars.text.body,
  lineHeight: vars.leading.body,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("body.sb-show-main, #storybook-root", {
  background: vars.color.background,
});

globalStyle("a", {
  color: "inherit",
  textDecorationColor: vars.color.border02_5,
  textUnderlineOffset: 3,
});

globalStyle("a:visited", {
  color: "inherit",
});

globalStyle("#root > *", {
  flex: "1 1 auto",
  minHeight: 0,
});

globalStyle("h1, h2, p", {
  margin: 0,
});

globalStyle("h1", {
  fontSize: vars.text.displayMd,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
  lineHeight: 1.2,
});

globalStyle("*", {
  scrollbarColor: `${vars.color.fg10} transparent`,
  scrollbarWidth: "thin",
});

globalStyle("*::-webkit-scrollbar", {
  width: 8,
  height: 8,
});

globalStyle("*::-webkit-scrollbar-track", {
  background: "transparent",
});

globalStyle("*::-webkit-scrollbar-thumb", {
  background: vars.color.fg10,
  borderRadius: 999,
  border: "2px solid transparent",
  backgroundClip: "padding-box",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}`,
});

globalStyle("*::-webkit-scrollbar-thumb:hover", {
  background: `color-mix(in oklab, ${vars.color.foreground} 25%, transparent)`,
  backgroundClip: "padding-box",
  border: "2px solid transparent",
});

globalStyle("*::-webkit-scrollbar-corner", {
  background: "transparent",
});
