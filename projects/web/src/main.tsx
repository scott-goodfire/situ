import "@situ/web-design-tokens/styles.css";
import "@situ/web-ui/foundation.css";
import { createRoot } from "react-dom/client";
import { SituApp } from "./app/situ-app";

createRoot(document.getElementById("root") as HTMLElement).render(<SituApp />);
