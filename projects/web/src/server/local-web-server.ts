import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createLocalWebApp } from "./local-web-app";

type ServerOptions = {
  situHome: string;
  distDirectory: string;
  host: string;
  port: number;
};

const options = serverOptionsFromArgs({ args: Bun.argv.slice(2) });

if (!existsSync(resolve(options.distDirectory, "index.html"))) {
  console.error(
    `Situ web build not found at ${options.distDirectory}; run bun run build first.`,
  );
  process.exit(1);
}

const app = createLocalWebApp({
  situHome: options.situHome,
  distDirectory: options.distDirectory,
});

const server = Bun.serve({
  fetch: app.fetch,
  hostname: options.host,
  port: options.port,
});

console.log(
  `Situ web project home: http://${displayHost({ host: options.host })}:${server.port}/`,
);

process.on("SIGINT", () => stop({ code: 0 }));
process.on("SIGTERM", () => stop({ code: 0 }));

function stop({ code }: { code: number }): void {
  server.stop();
  process.exit(code);
}

function serverOptionsFromArgs({ args }: { args: string[] }): ServerOptions {
  return {
    situHome: stringFlag({
      args,
      name: "--situ-home",
      fallback: defaultSituHome(),
    }),
    distDirectory: stringFlag({
      args,
      name: "--dist",
      fallback: resolve(process.cwd(), "dist"),
    }),
    host: stringFlag({
      args,
      name: "--host",
      fallback: "127.0.0.1",
    }),
    port: numberFlag({
      args,
      name: "--port",
      fallback: 0,
    }),
  };
}

function defaultSituHome(): string {
  return resolve(homedir(), ".situ");
}

function displayHost({ host }: { host: string }): string {
  if (host === "0.0.0.0") {
    return "127.0.0.1";
  }

  return host;
}

function stringFlag({
  args,
  name,
  fallback,
}: {
  args: string[];
  name: string;
  fallback: string;
}): string {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return args[index + 1] ?? fallback;
}

function numberFlag({
  args,
  name,
  fallback,
}: {
  args: string[];
  name: string;
  fallback: number;
}): number {
  const value = stringFlag({
    args,
    name,
    fallback: String(fallback),
  });
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}
