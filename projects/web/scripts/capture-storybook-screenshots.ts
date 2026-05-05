import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { chromium, type Browser } from "@playwright/test";

type StoryIndex = {
  entries: Record<string, StoryIndexEntry>;
};

type StoryIndexEntry = {
  id: string;
  title: string;
  name: string;
  type: string;
};

type CaptureOptions = {
  baseUrl: string;
  outputDir: string;
  port: number;
  startServer: boolean;
};

const options = parseArgs({ argv: process.argv.slice(2) });

await captureStorybookScreenshots(options);

async function captureStorybookScreenshots({
  baseUrl,
  outputDir,
  port,
  startServer,
}: CaptureOptions): Promise<void> {
  const storybook = startServer ? startStorybook({ port }) : undefined;
  let browser: Browser | undefined;

  try {
    await waitForStorybook({ baseUrl });
    const storyIndex = await fetchStoryIndex({ baseUrl });
    const stories = storyEntries({ storyIndex });

    await mkdir(outputDir, { recursive: true });
    await writeFile(
      resolve(outputDir, "stories.json"),
      `${JSON.stringify(stories, null, 2)}\n`,
    );

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 1000,
      },
    });

    for (const story of stories) {
      const componentDir = resolve(outputDir, slug({ value: story.title }));
      await mkdir(componentDir, { recursive: true });

      const screenshotPath = resolve(componentDir, `${slug({ value: story.name })}.png`);
      const storyUrl = storyUrlFor({ baseUrl, storyId: story.id });

      await page.goto(storyUrl, {
        waitUntil: "networkidle",
      });
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
    }

    console.log(outputDir);
  } finally {
    await browser?.close();
    await stopStorybook({ storybook });
  }
}

function parseArgs({ argv }: { argv: string[] }): CaptureOptions {
  const port = numberArg({
    argv,
    name: "--port",
    fallback: 6006,
  });
  const baseUrl = stringArg({
    argv,
    name: "--base-url",
    fallback: `http://127.0.0.1:${port}`,
  });
  const outputDir = stringArg({
    argv,
    name: "--out-dir",
    fallback: defaultOutputDir(),
  });
  const startServer = !argv.includes("--no-start");

  return {
    baseUrl,
    outputDir,
    port,
    startServer,
  };
}

function stringArg({
  argv,
  name,
  fallback,
}: {
  argv: string[];
  name: string;
  fallback: string;
}): string {
  const index = argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  const value = argv.at(index + 1);
  if (!value) {
    return fallback;
  }

  return value;
}

function numberArg({
  argv,
  name,
  fallback,
}: {
  argv: string[];
  name: string;
  fallback: number;
}): number {
  const rawValue = stringArg({
    argv,
    name,
    fallback: String(fallback),
  });
  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return fallback;
}

function defaultOutputDir(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return resolve(tmpdir(), "almanac-storybook-screenshots", stamp);
}

function startStorybook({ port }: { port: number }): ChildProcess {
  const child = spawn(
    "bun",
    ["run", "storybook", "--", "--ci", "--no-open", "--port", String(port)],
    {
      cwd: resolve(import.meta.dirname, ".."),
      env: {
        ...process.env,
        STORYBOOK_DISABLE_TELEMETRY: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  return child;
}

async function waitForStorybook({ baseUrl }: { baseUrl: string }): Promise<void> {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("/index.json", baseUrl));
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until Storybook finishes starting.
    }

    await sleep({ milliseconds: 250 });
  }

  throw new Error(`Timed out waiting for Storybook at ${baseUrl}`);
}

async function fetchStoryIndex({ baseUrl }: { baseUrl: string }): Promise<StoryIndex> {
  const response = await fetch(new URL("/index.json", baseUrl));
  if (!response.ok) {
    throw new Error(`Could not read Storybook index: HTTP ${response.status}`);
  }

  return (await response.json()) as StoryIndex;
}

function storyEntries({ storyIndex }: { storyIndex: StoryIndex }): StoryIndexEntry[] {
  return Object.values(storyIndex.entries)
    .filter((entry) => entry.type === "story")
    .sort((left, right) => left.id.localeCompare(right.id));
}

function storyUrlFor({
  baseUrl,
  storyId,
}: {
  baseUrl: string;
  storyId: string;
}): string {
  const url = new URL("/iframe.html", baseUrl);
  url.searchParams.set("id", storyId);
  url.searchParams.set("viewMode", "story");

  return url.toString();
}

function slug({ value }: { value: string }): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function sleep({ milliseconds }: { milliseconds: number }): Promise<void> {
  await new Promise((resolveSleep) => {
    setTimeout(resolveSleep, milliseconds);
  });
}

async function stopStorybook({
  storybook,
}: {
  storybook: ChildProcess | undefined;
}): Promise<void> {
  if (!storybook) {
    return;
  }

  if (storybook.exitCode !== null) {
    return;
  }

  storybook.kill("SIGTERM");

  await new Promise<void>((resolveStop) => {
    storybook.once("exit", () => {
      resolveStop();
    });
  });
}
