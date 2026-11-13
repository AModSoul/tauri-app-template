import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import { SITE_URL } from "./src/site-config";

// Every page is rendered to static HTML when the site is built; the Worker in `worker/` serves
// them (wrangler.jsonc). React components render to HTML with no JavaScript unless a page marks
// one as an island (`client:load`).
export default defineConfig({
  site: SITE_URL,
  // The site's links have no trailing slash, as the Worker serves its pages (`html_handling`).
  trailingSlash: "never",
  build: { format: "directory" },
  integrations: [react(), sitemap()],
  server: { port: 3000 },
});
