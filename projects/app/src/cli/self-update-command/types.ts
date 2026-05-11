export type SelfUpdateOptions = {
  version: string;
  repo: string;
  installHome: string;
  binDir: string;
  tarball?: string;
  json: boolean;
};

export type GitHubAsset = {
  name: string;
  url: string;
  browser_download_url?: string;
};

export type GitHubRelease = {
  tag_name: string;
  assets: GitHubAsset[];
};

export type PreparedRelease = {
  tag: string;
  tarballName: string;
  tarballPath: string;
  checksumsPath: string;
};

export type SelfUpdateResult = {
  previousVersion: string;
  version: string;
  repo: string;
  platform: string;
  installHome: string;
  versionDir: string;
  launcher: string;
  tarball: string;
};
