import { useStdout } from "ink";
import { useEffect, useState } from "react";
import {
  DEFAULT_DASHBOARD_HEIGHT,
  DEFAULT_DASHBOARD_WIDTH,
} from "./dashboard-layout.js";

export type TerminalSize = {
  columns: number;
  rows: number;
};

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>(() =>
    sizeFromStdout({ stdout }),
  );

  useEffect(() => {
    function updateSize() {
      setSize(sizeFromStdout({ stdout }));
    }

    updateSize();
    stdout.on("resize", updateSize);

    return () => {
      stdout.off("resize", updateSize);
    };
  }, [stdout]);

  return size;
}

function sizeFromStdout({
  stdout,
}: {
  stdout: {
    columns?: number;
    rows?: number;
  };
}): TerminalSize {
  return {
    columns: stdout.columns ?? DEFAULT_DASHBOARD_WIDTH,
    rows: stdout.rows ?? DEFAULT_DASHBOARD_HEIGHT,
  };
}
