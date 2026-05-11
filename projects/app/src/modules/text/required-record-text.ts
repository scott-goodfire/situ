import { optionalRecordText } from "./optional-record-text";
import { requiredText } from "./required-text";

export function requiredRecordText({
  record,
  key,
}: {
  record: Record<string, unknown>;
  key: string;
}): string {
  return requiredText({ value: optionalRecordText({ record, key }) ?? "", label: key });
}
