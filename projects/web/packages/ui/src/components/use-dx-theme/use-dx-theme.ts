import { useEffect } from "react";
import { useLocalStorage } from "../../use-local-storage";
import type { DxThemeMode } from "../dx-theme-toggle/dx-theme-toggle";
import { applyDxTheme, watchDxThemePreference } from "../__shared__/theme";

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
    applyDxTheme({ mode });
  }, [mode]);

  useEffect(() => {
    return watchDxThemePreference({
      mode,
      onChange: () => applyDxTheme({ mode: "auto" }),
    });
  }, [mode]);

  return {
    mode,
    setMode: ({ mode: next }) => setStored(next),
  };
}
