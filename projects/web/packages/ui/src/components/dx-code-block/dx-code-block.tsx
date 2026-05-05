import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export type DxCodeLineTone = "neutral" | "added" | "removed";

export type DxCodeLine = {
  tone?: DxCodeLineTone;
  text: ReactNode;
};

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
    <div className="dx-code-block">
      {filename && <div className="dx-code-block__filename">{filename}</div>}
      <pre className="dx-code-block__pre">
        {lines.map((line, index) => (
          <div
            key={index}
            className={classNames({
              values: ["dx-code-block__line", `dx-code-block__line--${line.tone ?? "neutral"}`],
            })}
            data-tone={line.tone ?? "neutral"}
          >
            {showLineNumbers && (
              <span className="dx-code-block__line-number" aria-hidden>
                {index + 1}
              </span>
            )}
            <span className="dx-code-block__line-marker" aria-hidden>
              {line.tone === "added" ? "+" : line.tone === "removed" ? "-" : " "}
            </span>
            <code className="dx-code-block__line-text">{line.text}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}
