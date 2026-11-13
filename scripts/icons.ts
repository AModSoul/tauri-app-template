// Makes every icon from one drawing: apps/desktop/src-tauri/icons-source/icon.svg (or a PNG of
// at least 1024 px given as the argument) becomes the desktop bundles' icons and the site's.
//
//   pnpm tauri:icons [path/to/icon.png]

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const desktop = path.join(root, "apps/desktop");
const icons = path.join(desktop, "src-tauri/icons");
const source = path.resolve(
  process.argv[2] ?? path.join(desktop, "src-tauri/icons-source/icon.svg"),
);

execSync(`pnpm tauri icon "${source}" --output "${icons}"`, { cwd: desktop, stdio: "inherit" });

// The app is desktop only; `tauri icon` makes phone icons too.
for (const dir of ["android", "ios"])
  rmSync(path.join(icons, dir), { recursive: true, force: true });

const site = path.join(root, "apps/site/public");
if (existsSync(site)) {
  copyFileSync(path.join(icons, "32x32.png"), path.join(site, "favicon-32x32.png"));
  copyFileSync(path.join(icons, "128x128@2x.png"), path.join(site, "apple-touch-icon.png"));
  copyFileSync(path.join(icons, "icon.png"), path.join(site, "icon-512.png"));
}
console.log("Icons written to apps/desktop/src-tauri/icons and apps/site/public.");
