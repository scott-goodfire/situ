import { DateTime } from "luxon";

export function DxTime({
  iso,
  className,
}: {
  iso: string | null | undefined;
  className?: string;
}) {
  if (!iso) {
    return <span className={className}>—</span>;
  }

  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) {
    return <span className={className}>—</span>;
  }

  return (
    <time
      dateTime={iso}
      title={dt.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}
      className={className}
    >
      {formatRelative({ dt })}
    </time>
  );
}

function formatRelative({ dt }: { dt: DateTime }): string {
  const now = DateTime.now();
  const diffSeconds = Math.abs(now.diff(dt, "seconds").seconds);

  if (diffSeconds < 45) return "just now";

  const relative = dt.toRelative({ base: now });
  if (relative) return relative;

  return dt.toLocaleString(DateTime.DATETIME_MED);
}
