import {
  formatMetricValue,
  heatmapCellFor,
  normalizeHeatmapMatrix,
  type HeatmapMatrix,
  type NormalizedHeatmapCell,
} from "@situ/chart-model";
import { classNames } from "../../utils/class-names";
import { vars } from "../../theme.css";
import * as s from "./heatmap-grid.css";

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
  const rootClassName = classNames({ values: [s.root, className] });

  return (
    <div className={rootClassName}>
      <div className={s.title}>{matrix.label}</div>
      <div
        className={s.matrix}
        style={{
          gridTemplateColumns: `96px repeat(${matrix.columns.length}, minmax(36px, 1fr))`,
        }}
      >
        <div />
        {matrix.columns.map((column) => (
          <div key={column.id} className={s.columnLabel}>
            {column.label}
          </div>
        ))}

        {matrix.rows.map((row) => (
          <>
            <div key={`${row.id}-label`} className={s.rowLabel}>
              {row.label}
            </div>
            {matrix.columns.map((column) => {
              const heatmapCell = heatmapCellFor({
                matrix: normalizedMatrix,
                rowId: row.id,
                columnId: column.id,
              });

              return (
                <div
                  key={`${row.id}-${column.id}`}
                  className={s.cell}
                  style={cellStyle({ cell: heatmapCell })}
                  title={cellTitle({
                    cell: heatmapCell,
                    rowLabel: row.label,
                    columnLabel: column.label,
                    precision,
                  })}
                >
                  {cellLabel({ cell: heatmapCell, precision })}
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
      backgroundColor: vars.color.border01_5,
      color: vars.color.mutedForeground,
    };
  }

  if (cell.value > 0) {
    return {
      backgroundColor: positiveCellColor({ ratio: cell.signedRatio }),
      color: vars.color.successStrong,
    };
  }

  if (cell.value < 0) {
    return {
      backgroundColor: negativeCellColor({ ratio: cell.signedRatio }),
      color: vars.color.dangerStrong,
    };
  }

  return {
    backgroundColor: vars.color.border01_5,
    color: vars.color.mutedForeground,
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
