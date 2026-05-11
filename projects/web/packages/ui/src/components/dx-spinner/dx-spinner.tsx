import { classNames } from "../../class-names";
import * as s from "./dx-spinner.css";

export function DxSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={classNames({ values: [s.spinner, className] })}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="status"
      aria-label="Loading"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.2"
      />
      <path
        d="M8 2 a6 6 0 0 1 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
