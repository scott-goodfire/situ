import type { DxThemeMode } from "../../components/dx-theme-toggle/dx-theme-toggle";

const colorSchemeQuery = "(prefers-color-scheme: dark)";

function applyDxTheme({ mode }: { mode: DxThemeMode }): void {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = resolveDxThemeMode({ mode });
  document.documentElement.setAttribute("data-theme", resolved);
}

function resolveDxThemeMode({ mode }: { mode: DxThemeMode }): "light" | "dark" {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(colorSchemeQuery).matches ? "dark" : "light";
}

function watchDxThemePreference({
  mode,
  onChange,
}: {
  mode: DxThemeMode;
  onChange: () => void;
}): (() => void) | undefined {
  if (mode !== "auto" || typeof window === "undefined") {
    return undefined;
  }

  const media = window.matchMedia(colorSchemeQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export const themeModule = {
  applyDxTheme,
  resolveDxThemeMode,
  watchDxThemePreference,
} as const;
