import { optionalRecordText } from "./optional-record-text";
import { requiredRecordText } from "./required-record-text";
import { requiredText } from "./required-text";

export const textModule = {
  optionalRecordText,
  requiredRecordText,
  requiredText,
} as const;
