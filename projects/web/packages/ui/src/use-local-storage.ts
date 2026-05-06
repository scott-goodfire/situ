import { useCallback, useState } from "react";

export function useLocalStorage<T>({
  key,
  fallback,
}: {
  key: string;
  fallback: T;
}): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  });

  const setStored = useCallback(
    (next: T) => {
      setValue(next);
      if (typeof window === "undefined") {
        return;
      }
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore quota / privacy-mode errors.
      }
    },
    [key],
  );

  return [value, setStored];
}
