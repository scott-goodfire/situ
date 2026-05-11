export function detectPlatform({
  platform = process.platform,
  arch = process.arch,
}: {
  platform?: NodeJS.Platform;
  arch?: string;
} = {}): string {
  const os = platform === "darwin" ? "darwin" : platform;
  const normalizedArch = arch === "x64" ? "x64" : arch;
  if (os !== "darwin" && os !== "linux") {
    throw new Error(`unsupported OS: ${platform}`);
  }
  if (normalizedArch !== "arm64" && normalizedArch !== "x64") {
    throw new Error(`unsupported arch: ${arch}`);
  }
  return `${os}-${normalizedArch}`;
}

export function normalizeTag({ version }: { version: string }): string {
  return version.startsWith("v") ? version : `v${version}`;
}
