import "@situ/web-design-tokens/styles.css";
import "@situ/web-ui/foundation.css";
import { createRoot } from "react-dom/client";
import { SituApp } from "./app/situ-app";

const container = document.getElementById("root");
if (!container) {
  throw new Error("missing #root container");
}
createRoot(container).render(<SituApp />);
