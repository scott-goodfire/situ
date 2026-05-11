import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { useLocalStorage } from "./use-local-storage";

afterEach(() => {
  window.localStorage.clear();
});

describe("useLocalStorage", () => {
  test("returns the fallback when no value is stored", () => {
    const { result } = renderHook(() => useLocalStorage({ key: "k1", fallback: "fall" }));
    expect(result.current[0]).toBe("fall");
  });

  test("loads a previously stored value", () => {
    window.localStorage.setItem("k2", JSON.stringify({ count: 7 }));
    const { result } = renderHook(() =>
      useLocalStorage<{ count: number }>({ key: "k2", fallback: { count: 0 } }),
    );
    expect(result.current[0]).toEqual({ count: 7 });
  });

  test("persists writes through the setter and re-renders with the new value", () => {
    const { result } = renderHook(() => useLocalStorage({ key: "k3", fallback: 0 }));

    act(() => {
      result.current[1](42);
    });

    expect(result.current[0]).toBe(42);
    expect(window.localStorage.getItem("k3")).toBe("42");
  });

  test("falls back when stored JSON is malformed", () => {
    window.localStorage.setItem("k4", "{not json");
    const { result } = renderHook(() => useLocalStorage({ key: "k4", fallback: "ok" }));
    expect(result.current[0]).toBe("ok");
  });
});
