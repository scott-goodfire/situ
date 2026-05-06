import { useEffect } from "react";
import { useLocalStorage } from "../../use-local-storage";
import type { DxThemeMode } from "./dx-theme-toggle";

const STORAGE_KEY = "dx-theme";

export function useDxTheme(): {
  mode: DxThemeMode;
  setMode: ({ mode }: { mode: DxThemeMode }) => void;
} {
  const [mode, setStored] = useLocalStorage<DxThemeMode>({
    key: STORAGE_KEY,
    fallback: "auto",
  });

  useEffect(() => {
    applyTheme({ mode });
  }, [mode]);

  useEffect(() => {
    if (mode !== "auto") {
      return undefined;
    }
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme({ mode: "auto" });

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  return {
    mode,
    setMode: ({ mode: next }) => setStored(next),
  };
}

function applyTheme({ mode }: { mode: DxThemeMode }) {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = resolveMode({ mode });
  document.documentElement.setAttribute("data-theme", resolved);
}

function resolveMode({ mode }: { mode: DxThemeMode }): "light" | "dark" {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
