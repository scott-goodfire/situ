import {
  heatmapFromTokenFeatureMatrix,
  type TokenFeatureMatrix as TokenFeatureMatrixData,
} from "@almanac/chart-model";
import { HeatmapGrid } from "../heatmap-grid/heatmap-grid.js";

export function TokenFeatureMatrix({
  matrix,
  precision = 2,
}: {
  matrix: TokenFeatureMatrixData;
  precision?: number;
}) {
  const heatmap = heatmapFromTokenFeatureMatrix({ matrix });

  return <HeatmapGrid matrix={heatmap} precision={precision} />;
}
