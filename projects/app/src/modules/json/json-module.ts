import { jsonRecord } from "./json-record";
import { parseJsonRecord } from "./parse-json-record";
import { readJsonRecordFile } from "./read-json-record-file";

export const jsonModule = {
  parseRecord: parseJsonRecord,
  readRecordFile: readJsonRecordFile,
  record: jsonRecord,
} as const;
