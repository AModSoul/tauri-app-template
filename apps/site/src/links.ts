// Links within the site. The site is served from the root of its domain unless Astro's `base`
// says otherwise (`SITE_BASE`, as when it's served from a GitHub Pages project site), so every
// link to one of its pages or files goes through `link`.

/** Astro's `base`, without a trailing slash: "" at the root. "/" in Storybook and tests. */
const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/u, "");

/** `path`, from the site's root ("/download", "/icon-512.png"), as a link that works wherever the
 * site is served. */
export function link(path: string): string {
  if (path === "/") return BASE === "" ? "/" : BASE;
  return `${BASE}${path}`;
}
