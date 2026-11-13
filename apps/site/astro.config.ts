import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import { SITE_URL } from "./src/site-config";

// Every page is rendered to static HTML when the site is built; the Worker in `worker/` serves
// them (wrangler.jsonc). React components render to HTML with no JavaScript unless a page marks
// one as an island (`client:load`).
export default defineConfig({
  // Where the site lives, and the folder it's served from when that isn't the domain's root:
  // SITE_URL and SITE_BASE override both, as the template's GitHub Pages build does.
  site: process.env.SITE_URL ?? SITE_URL,
  base: process.env.SITE_BASE,
  // The site's links have no trailing slash, as the Worker serves its pages (`html_handling`).
  trailingSlash: "never",
  build: { format: "directory" },
  integrations: [react(), sitemap()],
  server: { port: 3000 },
});
