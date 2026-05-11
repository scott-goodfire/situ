import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  TINY_AUTORESEARCH_FIXTURE_FILES,
  tinyAutoresearchFileEntries,
  type TinyAutoresearchFixtureFileMap,
  type TinyAutoresearchFixtureFilePath,
} from "./files";

export type WriteTinyAutoresearchFixtureResult = Readonly<{
  rootPath: string;
  writtenFiles: TinyAutoresearchFixtureFilePath[];
}>;

export async function writeTinyAutoresearchFixture({
  rootPath,
  files = TINY_AUTORESEARCH_FIXTURE_FILES,
}: {
  rootPath: string;
  files?: TinyAutoresearchFixtureFileMap;
}): Promise<WriteTinyAutoresearchFixtureResult> {
  await mkdir(rootPath, { recursive: true });
  const writtenFiles: TinyAutoresearchFixtureFilePath[] = [];

  for (const [path] of tinyAutoresearchFileEntries()) {
    const content = files[path];
    const destination = join(rootPath, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
    writtenFiles.push(path);
  }

  return { rootPath, writtenFiles };
}
