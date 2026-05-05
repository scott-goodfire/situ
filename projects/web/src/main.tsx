import { createRoot } from "react-dom/client";
import { SituApp } from "./app/situ-app";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(<SituApp />);
