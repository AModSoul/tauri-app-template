// Takes the README's and the site's screenshots of the app (docs/screenshots).
//
//   pnpm --filter desktop screenshots [scene...]
//
// The app's front end is served with `api.ts`, `appWindow.ts` and `tauri.ts` in place of Tauri,
// and each scene is shot in headless Chromium at the app window's default size and 150%, with
// the app's own title bar, as on a Windows laptop. Name scenes to take only those.

import path from "node:path";

import react from "@vitejs/plugin-react";
import { chromium, type Page } from "playwright";
import { createServer, type Plugin } from "vite";

const here = import.meta.dirname;
const desktop = path.resolve(here, "..");
const root = path.resolve(desktop, "../..");
const output = path.join(root, "docs/screenshots");

/** The window's default size, as `tauri.conf.json` opens it. */
const WINDOW = { width: 1100, height: 720 };

type Scheme = "light" | "dark";

interface Scene {
  /** The file is `<name>-<scheme>.png`. */
  name: string;
  schemes: Scheme[];
  /** What to do once the run has finished, before the shot. */
  act?: (page: Page) => Promise<void>;
}

const SCENES: Scene[] = [
  { name: "results", schemes: ["light", "dark"] },
  {
    name: "settings",
    schemes: ["dark"],
    act: async (page) => {
      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("dialog", { name: "Settings" }).waitFor();
      // The drawer opens with its first field focused, which isn't how it looks at rest.
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
    },
  },
];

const names = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const unknown = names.filter((name) => !SCENES.some((scene) => scene.name === name));
if (unknown.length > 0) {
  const known = SCENES.map((scene) => scene.name).join(", ");
  throw new Error(`No scene ${unknown.join(", ")}; there are ${known}`);
}
const scenes = SCENES.filter((scene) => names.length === 0 || names.includes(scene.name));

// The app, with the stand-ins swapped in for the modules that reach Tauri.
const swaps: Record<string, string> = {
  "@/api": path.join(here, "api.ts"),
  "@/appWindow": path.join(here, "appWindow.ts"),
  "@tauri-apps/api/core": path.join(here, "tauri.ts"),
  "@tauri-apps/plugin-dialog": path.join(here, "tauri.ts"),
  "@tauri-apps/plugin-process": path.join(here, "tauri.ts"),
  "@tauri-apps/plugin-updater": path.join(here, "tauri.ts"),
};
const harness: Plugin = {
  name: "screenshots",
  enforce: "pre",
  resolveId: (source) => swaps[source],
  transformIndexHtml: (html) => html.replace("/src/main.tsx", "/screenshots/main.tsx"),
};
const server = await createServer({
  configFile: false,
  root: desktop,
  logLevel: "warn",
  plugins: [harness, react()],
  resolve: {
    alias: [{ find: /^@\/(?!(api|appWindow)$)/, replacement: `${path.join(desktop, "src")}/` }],
  },
  server: { port: 1430, fs: { allow: [root] } },
});
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error("The dev server didn't say where it's listening");

const browser = await chromium.launch();
try {
  for (const scene of scenes) {
    for (const scheme of scene.schemes) {
      const page = await browser.newPage({
        viewport: WINDOW,
        deviceScaleFactor: 1.5,
        colorScheme: scheme,
      });
      page.on("pageerror", (error) => console.error(`${scene.name}: ${error.message}`));
      await page.goto(url);
      await page.getByRole("button", { name: "Make names" }).click();
      await page.getByText("Finished", { exact: true }).waitFor();
      // Out of the way, so nothing shows as hovered unless the scene hovers it.
      await page.mouse.move(0, WINDOW.height - 1);
      await scene.act?.(page);
      // Let toasts, tooltips and drawers finish animating in.
      await page.waitForTimeout(600);
      const file = path.join(output, `${scene.name}-${scheme}.png`);
      await page.screenshot({ path: file });
      console.log(path.relative(root, file));
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
