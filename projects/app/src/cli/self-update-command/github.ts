import type { GitHubRelease } from "./types";

const textDecoder = new TextDecoder();

export async function fetchRelease({
  repo,
  tag,
}: {
  repo: string;
  tag: string;
}): Promise<GitHubRelease> {
  const path = tag === "latest" ? "latest" : `tags/${tag}`;
  const response = await githubFetch({
    url: `https://api.github.com/repos/${repo}/releases/${path}`,
    accept: "application/vnd.github+json",
  });
  return (await response.json()) as GitHubRelease;
}

export async function resolveLatestReleaseTag({ repo }: { repo: string }): Promise<string> {
  return (await fetchRelease({ repo, tag: "latest" })).tag_name;
}

export async function githubFetch({
  url,
  accept,
}: {
  url: string;
  accept: string;
}): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "situ-self-update",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = await resolveGitHubToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}) for ${url}`);
  }
  return response;
}

async function resolveGitHubToken(): Promise<string | undefined> {
  const envToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (envToken?.trim()) {
    return envToken.trim();
  }
  let result;
  try {
    result = Bun.spawnSync({
      cmd: ["gh", "auth", "token"],
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch {
    return undefined;
  }
  if (result.exitCode !== 0) {
    return undefined;
  }
  const token = textDecoder.decode(result.stdout).trim();
  return token || undefined;
}
