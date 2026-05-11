import type { ProtocolPayload } from "@situ/protocol";

import { jsonModule } from "../../modules/json";

export function payloadRecord({
  payloadJson,
  label,
}: {
  payloadJson: string;
  label: string;
}): ProtocolPayload {
  try {
    return jsonModule.record({ value: JSON.parse(payloadJson) as unknown });
  } catch (error) {
    throw new Error(`Failed to parse Replicache payload JSON for ${label}.`, { cause: error });
  }
}
