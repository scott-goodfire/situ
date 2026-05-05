import {
  formatMetricValue,
  heatmapCellFor,
  normalizeHeatmapMatrix,
  type HeatmapMatrix,
  type NormalizedHeatmapCell,
} from "@almanac/chart-model";
import { classNames } from "../../utils/class-names";

export function HeatmapGrid({
  matrix,
  precision = 2,
  className,
}: {
  matrix: HeatmapMatrix;
  precision?: number;
  className?: string;
}) {
  const normalizedMatrix = normalizeHeatmapMatrix({ matrix });
  const rootClassName = classNames({
    values: ["dx-heatmap-grid", className],
  });

  return (
    <div className={rootClassName}>
      <div className="dx-heatmap-grid__title">{matrix.label}</div>
      <div
        className="dx-heatmap-grid__matrix"
        style={{
          gridTemplateColumns: `96px repeat(${matrix.columns.length}, minmax(36px, 1fr))`,
        }}
      >
        <div />
        {matrix.columns.map((column) => (
          <div key={column.id} className="dx-heatmap-grid__column-label">
            {column.label}
          </div>
        ))}

        {matrix.rows.map((row) => (
          <>
            <div key={`${row.id}-label`} className="dx-heatmap-grid__row-label">
              {row.label}
            </div>
            {matrix.columns.map((column) => {
              const cell = heatmapCellFor({
                matrix: normalizedMatrix,
                rowId: row.id,
                columnId: column.id,
              });

              return (
                <div
                  key={`${row.id}-${column.id}`}
                  className="dx-heatmap-grid__cell"
                  style={cellStyle({ cell })}
                  title={cellTitle({
                    cell,
                    rowLabel: row.label,
                    columnLabel: column.label,
                    precision,
                  })}
                >
                  {cellLabel({ cell, precision })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function cellStyle({
  cell,
}: {
  cell: NormalizedHeatmapCell | undefined;
}): {
  backgroundColor: string;
  color: string;
} {
  if (!cell) {
    return {
      backgroundColor: "var(--dx-color-border-soft)",
      color: "var(--dx-color-muted)",
    };
  }

  if (cell.value > 0) {
    return {
      backgroundColor: positiveCellColor({ ratio: cell.signedRatio }),
      color: "var(--dx-color-success)",
    };
  }

  if (cell.value < 0) {
    return {
      backgroundColor: negativeCellColor({ ratio: cell.signedRatio }),
      color: "var(--dx-color-danger)",
    };
  }

  return {
    backgroundColor: "var(--dx-color-border-soft)",
    color: "var(--dx-color-muted)",
  };
}

function positiveCellColor({ ratio }: { ratio: number }): string {
  const alpha = Math.max(0.12, Math.min(0.78, Math.abs(ratio) * 0.72));

  return `rgba(26, 127, 55, ${alpha})`;
}

function negativeCellColor({ ratio }: { ratio: number }): string {
  const alpha = Math.max(0.12, Math.min(0.78, Math.abs(ratio) * 0.72));

  return `rgba(207, 34, 46, ${alpha})`;
}

function cellLabel({
  cell,
  precision,
}: {
  cell: NormalizedHeatmapCell | undefined;
  precision: number;
}): string {
  if (!cell) {
    return "";
  }

  return formatMetricValue({
    value: cell.value,
    precision,
  });
}

function cellTitle({
  cell,
  rowLabel,
  columnLabel,
  precision,
}: {
  cell: NormalizedHeatmapCell | undefined;
  rowLabel: string;
  columnLabel: string;
  precision: number;
}): string {
  if (!cell) {
    return `${rowLabel} / ${columnLabel}: no value`;
  }

  return `${rowLabel} / ${columnLabel}: ${formatMetricValue({
    value: cell.value,
    precision,
  })}`;
}
