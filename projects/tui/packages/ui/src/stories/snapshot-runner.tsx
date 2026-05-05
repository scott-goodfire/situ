import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { DateTime } from "luxon";
import type { TuiStory } from "./story-types.js";

type PngRenderer = {
  capture: ({ frame, pngPath }: { frame: string; pngPath: string }) => Promise<void>;
  close: () => Promise<void>;
};

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
  const pngRenderer = options.png ? await createPngRenderer() : undefined;

  mkdirSync(outDir, { recursive: true });

  try {
    for (const story of allStories) {
      const instance = render(<SnapshotPreview story={story} />);

      try {
        await waitForFrame();

        const frame = instance.lastFrame() ?? "";
        const basename = story.id.replaceAll("/", "__");
        writeFileSync(join(outDir, `${basename}.txt`), `${frame}\n`);

        if (pngRenderer) {
          await pngRenderer.capture({
            frame,
            pngPath: join(outDir, `${basename}.png`),
          });
        }
      } finally {
        instance.unmount();
      }
    }

    writeFileSync(
      join(outDir, "stories.txt"),
      `${allStories.map((story) => story.id).join("\n")}\n`,
    );
    console.log(outDir);
  } finally {
    await pngRenderer?.close();
  }
}

function snapshotOptions({
  args,
}: {
  args: string[];
}): {
  outDir: string;
  color: boolean;
  png: boolean;
} {
  const outDirIndex = args.indexOf("--out-dir");
  const png = args.includes("--png");
  const color = args.includes("--color") || args.includes("--ansi") || png;

  if (outDirIndex >= 0) {
    const explicitOutDir = args[outDirIndex + 1];
    if (explicitOutDir) {
      return {
        outDir: resolve(explicitOutDir),
        color,
        png,
      };
    }
  }

  const timestamp = DateTime.now().toFormat("yyyy-LL-dd-HHmmss");

  return {
    outDir: join(tmpdir(), "almanac-tui-snapshots", timestamp),
    color,
    png,
  };
}

function enableAnsiColor() {
  delete process.env.NO_COLOR;
  process.env.FORCE_COLOR = process.env.FORCE_COLOR || "1";
}

async function createPngRenderer(): Promise<PngRenderer> {
  const [{ chromium }, ConvertModule] = await Promise.all([
    import("@playwright/test"),
    import("ansi-to-html"),
  ]);
  const Convert = ConvertModule.default;
  const converter = new Convert({
    fg: "#d6deeb",
    bg: "#0b1020",
    escapeXML: true,
  });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: {
      width: 1400,
      height: 1000,
    },
  });

  return {
    capture: async ({
      frame,
      pngPath,
    }: {
      frame: string;
      pngPath: string;
    }) => {
      await page.setContent(
        terminalSnapshotHtml({
          frame,
          ansiConverter: converter,
        }),
      );
      await page.locator("[data-terminal-frame]").screenshot({
        path: pngPath,
      });
    },
    close: async () => {
      await browser.close();
    },
  };
}

function terminalSnapshotHtml({
  frame,
  ansiConverter,
}: {
  frame: string;
  ansiConverter: {
    toHtml: (frame: string) => string;
  };
}): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html,
      body {
        margin: 0;
        background: #0b1020;
      }

      [data-terminal-frame] {
        display: inline-block;
        padding: 16px;
        color: #d6deeb;
        background: #0b1020;
        font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
        font-size: 14px;
        line-height: 1.25;
        letter-spacing: 0;
        white-space: pre;
      }
    </style>
  </head>
  <body>
    <pre data-terminal-frame>${ansiConverter.toHtml(frame)}</pre>
  </body>
</html>`;
}

async function waitForFrame() {
  await new Promise((resolveFrame) => {
    setTimeout(resolveFrame, 20);
  });
}

void main();
