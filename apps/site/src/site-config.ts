/** Everything about where the site lives and what it links to. */

/** The site's address, for absolute links in `<meta>` tags. Cloudflare Pages serves it. */
export const SITE_URL = "https://example.com/";

/** The repository whose Releases ship the desktop app. */
export const GITHUB_OWNER = "your-github-user";
export const GITHUB_REPO = "my-app";

export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;

export const APP_NAME = "My App";

export const DESCRIPTION =
  "My App turns a list of names into safe file names, on Windows, macOS and Linux, as a desktop app and a command line tool.";

/** The site's pages, as its navigation lists them. */
export const PAGES = [
  { path: "/", label: "Home" },
  // site:download:start
  { path: "/download", label: "Download" },
  // site:download:end
] as const;

export type SitePath = (typeof PAGES)[number]["path"];
