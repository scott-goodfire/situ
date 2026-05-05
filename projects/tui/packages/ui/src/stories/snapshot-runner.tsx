import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { DateTime } from "luxon";
import type { TuiStory } from "./story-types.js";

async function main() {
  const options = snapshotOptions({ args: process.argv.slice(2) });

  if (options.color) {
    enableAnsiColor();
  }

  const [{ Box, Text }, { render }, { allStories }] = await Promise.all([
    import("ink"),
    import("ink-testing-library"),
    import("./catalog.js"),
  ]);

  const SnapshotPreview = ({ story }: { story: TuiStory }) => (
    <Box flexDirection="column">
      <Text dimColor>{story.id}</Text>
      {story.render()}
    </Box>
  );

  const outDir = options.outDir;
  mkdirSync(outDir, { recursive: true });

  for (const story of allStories) {
    const instance = render(<SnapshotPreview story={story} />);
    await waitForFrame();

    const frame = instance.lastFrame() ?? "";
    const filename = `${story.id.replaceAll("/", "__")}.txt`;
    writeFileSync(join(outDir, filename), `${frame}\n`);
    instance.unmount();
  }

  writeFileSync(
    join(outDir, "stories.txt"),
    `${allStories.map((story) => story.id).join("\n")}\n`,
  );
  console.log(outDir);
}

function snapshotOptions({
  args,
}: {
  args: string[];
}): {
  outDir: string;
  color: boolean;
} {
  const outDirIndex = args.indexOf("--out-dir");
  const color = args.includes("--color") || args.includes("--ansi");

  if (outDirIndex >= 0) {
    const explicitOutDir = args[outDirIndex + 1];
    if (explicitOutDir) {
      return {
        outDir: resolve(explicitOutDir),
        color,
      };
    }
  }

  const timestamp = DateTime.now().toFormat("yyyy-LL-dd-HHmmss");

  return {
    outDir: join(tmpdir(), "almanac-tui-snapshots", timestamp),
    color,
  };
}

function enableAnsiColor() {
  delete process.env.NO_COLOR;
  process.env.FORCE_COLOR = process.env.FORCE_COLOR || "1";
}

async function waitForFrame() {
  await new Promise((resolveFrame) => {
    setTimeout(resolveFrame, 20);
  });
}

void main();
