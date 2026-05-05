import { createRoot } from "react-dom/client";
import { AlmanacApp } from "./app/almanac-app";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(<AlmanacApp />);
