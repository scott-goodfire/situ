import { globalStyle } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

globalStyle("*", {
  boxSizing: "border-box",
});

globalStyle("html, body, #root", {
  height: "100%",
});

globalStyle("#root", {
  isolation: "isolate",
  display: "flex",
  flexDirection: "column",
});

globalStyle("body", {
  margin: 0,
  background: vars.color.stage,
  color: vars.color.foreground,
  fontFamily: vars.font.sans,
  fontSize: vars.text.body,
  lineHeight: vars.leading.body,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
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
