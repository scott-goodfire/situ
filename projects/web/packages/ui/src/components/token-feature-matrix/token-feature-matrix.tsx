import {
  heatmapFromTokenFeatureMatrix,
  type TokenFeatureMatrix as TokenFeatureMatrixData,
} from "@almanac/chart-model";
import { HeatmapGrid } from "../heatmap-grid/heatmap-grid";

export function TokenFeatureMatrix({
  matrix,
  precision = 2,
  className,
}: {
  matrix: TokenFeatureMatrixData;
  precision?: number;
  className?: string;
}) {
  const heatmap = heatmapFromTokenFeatureMatrix({ matrix });

  return <HeatmapGrid matrix={heatmap} precision={precision} className={className} />;
}
