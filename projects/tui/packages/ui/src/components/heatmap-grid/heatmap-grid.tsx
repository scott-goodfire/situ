import {
  formatMetricValue,
  heatmapCellFor,
  normalizeHeatmapMatrix,
  type HeatmapMatrix,
  type NormalizedHeatmapCell,
  type NormalizedHeatmapMatrix,
} from "@situ/chart-model";
import { Box, Text } from "ink";

const HEATMAP_STEPS = ["░", "▒", "▓", "█"];

export function HeatmapGrid({
  matrix,
  precision = 2,
}: {
  matrix: HeatmapMatrix;
  precision?: number;
}) {
  const normalizedMatrix = normalizeHeatmapMatrix({ matrix });

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        {matrix.label}
      </Text>
      <Text dimColor>{columnHeader({ matrix })}</Text>
      {normalizedMatrix.rows.map((row) => (
        <Text key={row.id}>
          <Text dimColor>{rowLabel({ label: row.label })}</Text>
          {normalizedMatrix.columns.map((column) => {
            const cell = heatmapCellFor({
              matrix: normalizedMatrix,
              rowId: row.id,
              columnId: column.id,
            });

            return (
              <Text key={column.id} color={cellColor({ cell })}>
                {cellText({ cell })}
              </Text>
            );
          })}
          {" "}
          <Text dimColor>{rowTooltip({ matrix: normalizedMatrix, rowId: row.id, precision })}</Text>
        </Text>
      ))}
    </Box>
  );
}

function columnHeader({ matrix }: { matrix: HeatmapMatrix }): string {
  const prefix = " ".repeat(6);
  const labels = matrix.columns.map((column) => column.label.slice(0, 2).padEnd(2, " "));

  return `${prefix}${labels.join("")}`;
}

function rowLabel({ label }: { label: string }): string {
  return label.slice(0, 5).padEnd(6, " ");
}

function cellText({
  cell,
}: {
  cell: NormalizedHeatmapCell | undefined;
}): string {
  if (!cell) {
    return "  ";
  }

  const step = heatmapStep({ signedRatio: cell.signedRatio });

  return `${step}${step}`;
}

function cellColor({
  cell,
}: {
  cell: NormalizedHeatmapCell | undefined;
}): "green" | "red" | "gray" {
  if (!cell) {
    return "gray";
  }

  if (cell.value > 0) {
    return "green";
  }

  if (cell.value < 0) {
    return "red";
  }

  return "gray";
}

function heatmapStep({ signedRatio }: { signedRatio: number }): string {
  const magnitude = Math.abs(signedRatio);
  const index = Math.max(
    0,
    Math.min(HEATMAP_STEPS.length - 1, Math.ceil(magnitude * HEATMAP_STEPS.length) - 1),
  );

  return HEATMAP_STEPS[index] ?? "░";
}

function rowTooltip({
  matrix,
  rowId,
  precision,
}: {
  matrix: NormalizedHeatmapMatrix;
  rowId: string;
  precision: number;
}): string {
  const rowCells = matrix.columns
    .map((column) =>
      heatmapCellFor({
        matrix,
        rowId,
        columnId: column.id,
      }),
    )
    .filter((cell): cell is NormalizedHeatmapCell => Boolean(cell));
  const strongestCell = [...rowCells].sort(
    (left: NormalizedHeatmapCell, right: NormalizedHeatmapCell) =>
      Math.abs(right.value) - Math.abs(left.value),
  )[0];

  if (!strongestCell) {
    return "";
  }

  const column = matrix.columns.find((candidate) => candidate.id === strongestCell.columnId);
  const columnLabel = column?.label ?? strongestCell.columnId;
  const value = formatMetricValue({
    value: strongestCell.value,
    precision,
  });

  return `${columnLabel}: ${value}`;
}
