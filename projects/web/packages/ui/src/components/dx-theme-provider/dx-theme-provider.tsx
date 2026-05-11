import { useEffect, type ReactNode } from "react";
import type { DxThemeMode } from "../dx-theme-toggle/dx-theme-toggle";
import { applyDxTheme, watchDxThemePreference } from "../__shared__/theme";

export function DxThemeProvider({ mode, children }: { mode: DxThemeMode; children: ReactNode }) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    applyDxTheme({ mode });
    return watchDxThemePreference({
      mode,
      onChange: () => applyDxTheme({ mode: "auto" }),
    });
  }, [mode]);

  return <>{children}</>;
}
