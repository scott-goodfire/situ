import { useEffect, type ReactNode } from "react";
import type { DxThemeMode } from "./dx-theme-toggle";

export function DxThemeProvider({
  mode,
  children,
}: {
  mode: DxThemeMode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    applyTheme({ mode });

    if (mode !== "auto" || typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme({ mode: "auto" });
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  return <>{children}</>;
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
