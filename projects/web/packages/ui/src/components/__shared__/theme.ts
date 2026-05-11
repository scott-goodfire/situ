import type { DxThemeMode } from "../dx-theme-toggle/dx-theme-toggle";
import { themeModule } from "../../modules/theme";

export function applyDxTheme({ mode }: { mode: DxThemeMode }): void {
  themeModule.applyDxTheme({ mode });
}

export function resolveDxThemeMode({ mode }: { mode: DxThemeMode }): "light" | "dark" {
  return themeModule.resolveDxThemeMode({ mode });
}

export function watchDxThemePreference({
  mode,
  onChange,
}: {
  mode: DxThemeMode;
  onChange: () => void;
}): (() => void) | undefined {
  return themeModule.watchDxThemePreference({ mode, onChange });
}
