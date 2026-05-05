import {
  signedContributionsFromContrastiveFeatures,
  type ContrastiveFeatureSet,
} from "@situ/chart-model";
import { Box, Text } from "ink";
import { ContributionBars } from "../contribution-bars/contribution-bars.js";

export function ContrastiveFeatureDiff({
  featureSet,
  limit = 8,
}: {
  featureSet: ContrastiveFeatureSet;
  limit?: number;
}) {
  const contributions = signedContributionsFromContrastiveFeatures({ featureSet });

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        {featureSet.label}
      </Text>
      <Text dimColor>
        + {featureSet.leftLabel} / - {featureSet.rightLabel}
      </Text>
      <ContributionBars contributions={contributions} limit={limit} />
    </Box>
  );
}
