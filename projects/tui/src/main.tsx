import { render } from "ink";
import { SituTui } from "./app/situ-tui/situ-tui.js";

render(<SituTui />, {
  alternateScreen: true,
  incrementalRendering: true,
  maxFps: 20,
});
