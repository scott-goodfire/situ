import {
  signedContributionsFromContrastiveFeatures,
  type ContrastiveFeatureSet,
} from "../../chart-model";
import { classNames } from "../../class-names";
import { ContributionBars } from "../contribution-bars/contribution-bars";
import * as s from "./contrastive-feature-diff.css";

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
  const rootClassName = classNames({ values: [s.root, className] });

  return (
    <div className={rootClassName}>
      <div className={s.header}>
        <div className={s.title}>{featureSet.label}</div>
        <div className={s.legend}>
          + {featureSet.leftLabel} / - {featureSet.rightLabel}
        </div>
      </div>
      <ContributionBars contributions={contributions} limit={limit} />
    </div>
  );
}
