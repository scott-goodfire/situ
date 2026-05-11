import type { Timestamp } from "@situ/protocol";
import { useEffect, useState } from "react";

export function useNow({ intervalMs = 1_000 }: { intervalMs?: number } = {}): Timestamp {
  const [now, setNow] = useState<Timestamp>(() => new Date().toISOString());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date().toISOString());
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
