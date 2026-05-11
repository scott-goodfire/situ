import type { ReactNode } from "react";
import { classNames } from "../../class-names";
import * as s from "./dx-theme-toggle.css";

export type DxThemeMode = "light" | "dark" | "auto";

export function DxThemeToggle({
  value,
  onChange,
}: {
  value: DxThemeMode;
  onChange: ({ mode }: { mode: DxThemeMode }) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Theme" className={s.toggle}>
      <ThemeOption mode="light" current={value} onChange={onChange} label="Light">
        <SunIcon />
      </ThemeOption>
      <ThemeOption mode="auto" current={value} onChange={onChange} label="System">
        <MonitorIcon />
      </ThemeOption>
      <ThemeOption mode="dark" current={value} onChange={onChange} label="Dark">
        <MoonIcon />
      </ThemeOption>
    </div>
  );
}

function ThemeOption({
  mode,
  current,
  onChange,
  label,
  children,
}: {
  mode: DxThemeMode;
  current: DxThemeMode;
  onChange: ({ mode }: { mode: DxThemeMode }) => void;
  label: string;
  children: ReactNode;
}) {
  const selected = mode === current;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      className={classNames({ values: [s.option, selected && s.optionSelected] })}
      onClick={() => onChange({ mode })}
    >
      {children}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
