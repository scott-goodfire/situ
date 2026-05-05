import {
  signedContributionsFromContrastiveFeatures,
  type ContrastiveFeatureSet,
} from "@almanac/chart-model";
import { classNames } from "../../utils/class-names";
import { ContributionBars } from "../contribution-bars/contribution-bars";

export function ContrastiveFeatureDiff({
  featureSet,
  limit = 8,
  className,
}: {
  featureSet: ContrastiveFeatureSet;
  limit?: number;
  className?: string;
}) {
  const contributions = signedContributionsFromContrastiveFeatures({ featureSet });
  const rootClassName = classNames({
    values: ["dx-contrastive-feature-diff", className],
  });

  return (
    <div className={rootClassName}>
      <div className="dx-contrastive-feature-diff__header">
        <div className="dx-contrastive-feature-diff__title">{featureSet.label}</div>
        <div className="dx-contrastive-feature-diff__legend">
          + {featureSet.leftLabel} / - {featureSet.rightLabel}
        </div>
      </div>
      <ContributionBars contributions={contributions} limit={limit} />
    </div>
  );
}
