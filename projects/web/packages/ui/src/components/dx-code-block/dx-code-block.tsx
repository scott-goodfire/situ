import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";
import * as s from "./dx-code-block.css";

export type DxCodeLineTone = "neutral" | "added" | "removed";

export type DxCodeLine = {
  tone?: DxCodeLineTone;
  text: ReactNode;
};

const TONE_CLASS = { neutral: undefined, added: s.lineAdded, removed: s.lineRemoved } as const;

export function DxCodeBlock({
  lines,
  filename,
  showLineNumbers = false,
}: {
  lines: DxCodeLine[];
  filename?: ReactNode;
  showLineNumbers?: boolean;
}) {
  return (
    <div className={s.block}>
      {filename && <div className={s.filename}>{filename}</div>}
      <pre className={s.pre}>
        {lines.map((line, index) => {
          const tone = line.tone ?? "neutral";
          return (
            <div
              key={index}
              className={classNames({ values: [s.line, TONE_CLASS[tone]] })}
              data-tone={tone}
            >
              {showLineNumbers && (
                <span className={s.lineNumber} aria-hidden>
                  {index + 1}
                </span>
              )}
              <span className={s.lineMarker} aria-hidden>
                {tone === "added" ? "+" : tone === "removed" ? "-" : " "}
              </span>
              <code className={s.lineText}>{line.text}</code>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
