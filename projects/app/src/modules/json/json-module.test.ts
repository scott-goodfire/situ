import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import { jsonModule } from ".";

let tempRoot: string | undefined;

describe("jsonModule", () => {
  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  test("normalizes unknown values into JSON records", () => {
    expect(jsonModule.record({ value: { ok: true, count: 2 } })).toEqual({
      ok: true,
      count: 2,
    });
    expect(jsonModule.record({ value: ["not", "a", "record"] })).toEqual({});
    expect(jsonModule.record({ value: null })).toEqual({});
    expect(jsonModule.record({ value: "not a record" })).toEqual({});
  });

  test("parses only object JSON as records", () => {
    expect(jsonModule.parseRecord({ raw: '{"id":"payload","count":1}' })).toEqual({
      id: "payload",
      count: 1,
    });
    expect(jsonModule.parseRecord({ raw: "[]" })).toEqual({});
    expect(jsonModule.parseRecord({ raw: "not json" })).toEqual({});
  });

  test("reads missing files as empty records and preserves file-system errors", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-json-module-"));
    const validPath = join(tempRoot, "valid.json");
    const directoryPath = join(tempRoot, "directory");
    await writeFile(validPath, '{"name":"situ"}\n');
    await mkdir(directoryPath);

    await expect(
      jsonModule.readRecordFile({ path: join(tempRoot, "missing.json") }),
    ).resolves.toEqual({});
    await expect(jsonModule.readRecordFile({ path: validPath })).resolves.toEqual({
      name: "situ",
    });
    await expect(jsonModule.readRecordFile({ path: directoryPath })).rejects.toThrow();
  });
});
