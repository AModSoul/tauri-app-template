// Turns the template into a new project, once, right after it's created from the template:
//
//   pnpm install
//   pnpm template:init
//
// It asks for what it needs, or takes it as flags (`--yes` takes the defaults for the rest):
//
//   --name "Card Forge"             the app's name, as people see it
//   --slug card-forge               its name in packages, crates, binaries and URLs
//   --owner me                      the GitHub user or organisation
//   --repo card-forge               the GitHub repository
//   --app desktop|web|both|none     the app: a desktop app (Tauri), a web app (on a Cloudflare
//                                   Worker), both from one code base, or none (a website only)
//   --core rust|ts                  where a desktop app's logic lives; web and both take ts
//   --identifier dev.me.card-forge  the desktop app's bundle identifier and settings folder
//   --no-site                       leave out the Astro site (not with --app none)
//   --site-url https://...          the site's own domain, if it has one yet
//
// It renames everything, keeps what you chose and deletes the rest, gives the Windows installer
// a fresh upgrade code, deletes itself and `template/`, and reinstalls.

import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

const root = path.resolve(import.meta.dirname, "..");
const at = (...parts: string[]) => path.join(root, ...parts);
const remove = (...paths: string[]) => {
  for (const gone of paths) rmSync(at(gone), { recursive: true, force: true });
};

const { values: flags } = parseArgs({
  options: {
    name: { type: "string" },
    slug: { type: "string" },
    owner: { type: "string" },
    repo: { type: "string" },
    app: { type: "string" },
    core: { type: "string" },
    identifier: { type: "string" },
    "no-site": { type: "boolean" },
    "site-url": { type: "string" },
    yes: { type: "boolean" },
    "skip-install": { type: "boolean" },
  },
});

if (!existsSync(at("template"))) {
  throw new Error("This project has already been set up: there's no template/ folder.");
}

const interactive = process.stdin.isTTY && !flags.yes;
const prompt = interactive
  ? createInterface({ input: process.stdin, output: process.stdout })
  : null;

/** A flag's value, or the answer to `question`, or `fallback`. */
async function ask(flag: string | undefined, question: string, fallback: string) {
  if (flag !== undefined) return flag;
  if (!prompt) return fallback;
  const answer = (await prompt.question(`${question} (${fallback}): `)).trim();
  return answer === "" ? fallback : answer;
}

/** One of `choices`, from a flag or the answer to `question`. */
async function choose<T extends string>(
  flag: string | undefined,
  question: string,
  choices: readonly T[],
  fallback: T,
): Promise<T> {
  const answer = await ask(flag, `${question}: ${choices.join(", ")}`, fallback);
  const chosen = choices.find((choice) => choice === answer);
  if (!chosen) throw new Error(`"${answer}" isn't one of ${choices.join(", ")}`);
  return chosen;
}

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

const name = await ask(flags.name, "App name", "My App");
const slug = toSlug(await ask(flags.slug, "Slug, for packages, crates and URLs", toSlug(name)));
if (!/^[a-z][a-z0-9-]*$/u.test(slug))
  throw new Error(`"${slug}" won't do as a slug: use a-z, 0-9 and -, starting with a letter`);
const owner = await ask(flags.owner, "GitHub user or organisation", "your-github-user");
const repo = await ask(flags.repo, "GitHub repository", slug);

const app = await choose(
  flags.app,
  "The app",
  ["desktop", "web", "both", "none"] as const,
  "desktop",
);
const desktop = app === "desktop" || app === "both";
const web = app === "web" || app === "both";

// The core runs in the browser for a web app, so only the TypeScript one will do there.
let core: "rust" | "ts" | null = null;
if (app === "desktop") core = await choose(flags.core, "Core", ["rust", "ts"] as const, "rust");
else if (web) {
  if (flags.core === "rust") throw new Error("A web app needs the TypeScript core: --core ts");
  core = "ts";
}
const identifier = desktop
  ? await ask(flags.identifier, "Bundle identifier", `io.github.${owner.toLowerCase()}.${slug}`)
  : "com.example.my-app";

const keepSite =
  app === "none"
    ? true
    : flags["no-site"]
      ? false
      : (await ask(undefined, "Keep the Astro site? y/n", "y")).toLowerCase().startsWith("y");
if (app === "none" && flags["no-site"])
  throw new Error("With --app none, the site is all there is");
const siteUrl = keepSite
  ? await ask(
      flags["site-url"],
      "Site URL (its own domain, if it has one yet)",
      "https://example.com/",
    )
  : "https://example.com/";
prompt?.close();

const what = [
  app === "none"
    ? "a website"
    : { desktop: "a desktop app", web: "a web app", both: "a desktop and web app" }[app],
  core && `the ${core === "rust" ? "Rust" : "TypeScript"} core`,
  app !== "none" && keepSite && "the site",
].filter(Boolean);
console.log(`\nSetting up ${name} (${slug}): ${what.join(", ")}.`);

// --- The app ------------------------------------------------------------------------

if (core === "ts") {
  // The TypeScript core's versions of the files that differ.
  cpSync(at("template/ts-core"), root, { recursive: true });
  remove("crates", "apps/desktop/src/bindings", ".cargo");
  editJson("package.json", (json) => {
    delete json.scripts.bindings;
  });
  editJson("apps/desktop/package.json", (json) => {
    json.dependencies["@my-app/core"] = "workspace:*";
  });
  for (const config of [".oxlintrc.json", ".oxfmtrc.json"]) {
    editJson(config, (json) => {
      json.ignorePatterns = json.ignorePatterns.filter(
        (pattern: string) => pattern !== "apps/desktop/src/bindings",
      );
    });
  }
} else if (core === "rust") {
  remove("packages/core");
}

if (web) {
  // The app in a browser: its Worker, its headers, and its deploy.
  cpSync(at("template/web"), root, { recursive: true });
  editJson("apps/desktop/package.json", (json) => {
    json.scripts.build = `${json.scripts.build} && pnpm run typecheck:worker`;
    json.scripts.typecheck = `${json.scripts.typecheck} && pnpm run typecheck:worker`;
    json.scripts["typecheck:worker"] = "wrangler types && tsc --noEmit -p worker";
    json.scripts["cf-typegen"] = "wrangler types";
    json.scripts["preview:web"] = "pnpm run build && wrangler dev --port 1420";
    json.scripts["deploy:web"] = "pnpm run build && wrangler deploy";
    json.devDependencies.wrangler = "^4.156.0";
  });
}

if (app === "web") {
  // No Tauri: the window's own title bar, the updater, installers and releases go.
  cpSync(at("template/web-only"), root, { recursive: true });
  remove(
    "apps/desktop/src-tauri",
    "apps/desktop/src/appWindow.ts",
    "apps/desktop/src/components/WindowControls.tsx",
    "apps/desktop/src/components/WindowControls.stories.tsx",
    "apps/desktop/src/components/UpdateButton.tsx",
    "apps/desktop/src/components/UpdateButton.stories.tsx",
    "apps/desktop/screenshots/appWindow.ts",
    "apps/desktop/screenshots/tauri.ts",
  );
  editJson("apps/desktop/package.json", (json) => {
    delete json.scripts.tauri;
    for (const deps of [json.dependencies, json.devDependencies]) {
      for (const dep of Object.keys(deps)) if (dep.startsWith("@tauri-apps/")) delete deps[dep];
    }
  });
}

if (!desktop) {
  remove(
    "Cargo.toml",
    "Cargo.lock",
    "rustfmt.toml",
    ".cargo",
    "crates",
    "scripts/icons.ts",
    ".github/workflows/release.yml",
    ".agents/skills/release",
  );
  editJson("package.json", (json) => {
    for (const script of ["tauri-dev", "tauri:icons", "bindings"]) delete json.scripts[script];
  });
  editJson(".vscode/extensions.json", (json) => {
    json.recommendations = json.recommendations.filter(
      (extension: string) =>
        !["rust-lang.rust-analyzer", "tauri-apps.tauri-vscode"].includes(extension),
    );
  });
}

if (app === "none") {
  remove("apps/desktop", "packages/core", "docs/screenshots", ".agents/skills/app-screenshots");
  editJson(".agents/mcp.json", (json) => {
    delete json.mcpServers["storybook-desktop"];
  });
}

// --- The site -----------------------------------------------------------------------

if (!keepSite) {
  remove("apps/site", ".github/workflows/site.yml", ".github/workflows/site-preview.yml");
  editJson("package.json", (json) => {
    delete json.scripts["site-dev"];
  });
  editJson(".agents/mcp.json", (json) => {
    delete json.mcpServers["storybook-site"];
  });
} else if (!desktop) {
  // Nothing to download: no download page, and a home page that isn't about installers.
  cpSync(at("template/site-only"), root, { recursive: true });
  remove(
    "apps/site/src/pages/download.astro",
    "apps/site/src/components/Downloads.tsx",
    "apps/site/src/components/Downloads.stories.tsx",
    "apps/site/src/components/DownloadPanel.tsx",
    "apps/site/src/components/DownloadPanel.stories.tsx",
    "apps/site/src/components/Screenshot.tsx",
    "apps/site/src/components/Screenshot.stories.tsx",
    "apps/site/src/downloads",
    "apps/site/src/utils",
  );
}

// --- Marked blocks and names in every text file --------------------------------------

const keep: Record<string, boolean> = {
  app: app !== "none",
  "app:none": app === "none",
  "app:desktop": desktop,
  "app:web": web,
  "core:rust": core === "rust",
  "core:ts": core === "ts",
  site: keepSite,
  "site:download": keepSite && desktop,
  template: false,
};

const replacements: [string | RegExp, string][] = [
  ["com.example.my-app", identifier],
  ["your-github-user/my-app", `${owner}/${repo}`],
  ['GITHUB_REPO = "my-app"', `GITHUB_REPO = "${repo}"`],
  ["https://example.com/", siteUrl],
  [/"upgradeCode": "0{8}-0{4}-0{4}-0{4}-0{12}"/gu, `"upgradeCode": "${randomUUID()}"`],
  ["My App", name],
  ["my_app", slug.replaceAll("-", "_")],
  ["my-app", slug],
  ["your-github-user", owner],
];
if (app === "web") {
  // A web app only: its package is apps/web, not apps/desktop.
  replacements.push(
    ["apps/desktop", "apps/web"],
    ["--filter desktop", "--filter web"],
    ["storybook-desktop", "storybook-web"],
    ['"name": "desktop"', '"name": "web"'],
    ["(package `desktop`)", "(package `web`)"],
  );
}

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "target",
  "dist",
  "gen",
  "storybook-static",
  "template",
  ".claude",
  ".cursor",
  ".astro",
]);
const TEXT =
  /\.(ts|tsx|js|mjs|json|jsonc|md|yml|yaml|toml|rs|html|css|svg|txt|lock|nsh|astro)$|^(LICENSE|_headers|\.gitignore|\.gitattributes|\.editorconfig|\.nvmrc|pre-commit|post-merge|post-checkout|pnpm-lock\.yaml)$/u;

/** Skills installed from elsewhere (`skills-lock.json`), which stay as their authors wrote them. */
const lockedSkills = new Set(
  Object.keys(JSON.parse(readFileSync(at("skills-lock.json"), "utf8")).skills ?? {}).map((skill) =>
    at(".agents/skills", skill),
  ),
);

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !lockedSkills.has(full)) yield* files(full);
    } else if (TEXT.test(entry.name)) {
      yield full;
    }
  }
}

/** Keeps or drops what's between a marker's start and end, as `keep` says, and drops the markers
 * either way, until no block is left (blocks can sit inside others). Markers are
 * `<!-- name:start -->` and `<!-- name:end -->` in Markdown, on lines of their own (which go with
 * them, so a list stays tight) or inside a line; and whole lines `# name:start` in YAML and TOML,
 * and `// name:start` in code. */
function stripBlocks(text: string): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current
      .replace(
        /^[ \t]*<!-- ([a-z:]+):start -->[ \t]*\n([\s\S]*?)^[ \t]*<!-- \1:end -->[ \t]*(?:\n|$)/gmu,
        chooseBlock,
      )
      .replace(/<!-- ([a-z:]+):start -->([\s\S]*?)<!-- \1:end -->/gu, chooseBlock)
      .replace(
        /^[ \t]*(?:#|\/\/) ([a-z:]+):start\b[^\n]*\n([\s\S]*?)^[ \t]*(?:#|\/\/) \1:end\b[^\n]*\n/gmu,
        chooseBlock,
      );
  } while (current !== previous);
  return current;
}

/** A marked block as it's kept: its body, nothing, or as it was for a marker `keep` doesn't
 * know. */
function chooseBlock(block: string, marker: string, body: string): string {
  if (!(marker in keep)) return block;
  return keep[marker] ? body : "";
}

for (const file of files(root)) {
  if (path.basename(file) === "init.ts" && path.dirname(file) === at("scripts")) continue;
  if (statSync(file).size > 2_000_000) continue;
  const before = readFileSync(file, "utf8");
  let after = stripBlocks(before);
  for (const [from, to] of replacements) after = after.replaceAll(from, to);
  // Collapse the blank lines a dropped block leaves behind in Markdown; `pnpm format` tidies
  // the rest.
  if (file.endsWith(".md"))
    after = after.replace(/\n[ \t]+\n/gu, "\n\n").replace(/\n{3,}/gu, "\n\n");
  if (after !== before) writeFileSync(file, after);
}

if (app === "web") renameSync(at("apps/desktop"), at("apps/web"));

// A domain of its own serves the site's Worker. It must be on the Cloudflare account.
const wranglerConfig = at("apps/site/wrangler.jsonc");
if (keepSite && siteUrl !== "https://example.com/" && existsSync(wranglerConfig)) {
  const host = new URL(siteUrl).hostname;
  const config = readFileSync(wranglerConfig, "utf8").replace(
    /\/\/ ("routes": \[\{ "pattern": )"example\.com"/u,
    `$1"${host}"`,
  );
  writeFileSync(wranglerConfig, config);
}

// --- The template's own parts go --------------------------------------------------------

editJson("package.json", (json) => {
  delete json.scripts["template:init"];
});
remove("template");
// The template's demo of its site on GitHub Pages; a project's site deploys to Cloudflare.
remove(".github/workflows/pages.yml");
remove("scripts/init.ts");

// --- Reinstall, so the lockfiles and generated files follow -------------------------------

if (!flags["skip-install"]) {
  const run = (command: string) => execSync(command, { cwd: root, stdio: "inherit" });
  run("pnpm install");
  if (desktop) {
    try {
      run("cargo update --workspace");
      // New crate names sort differently among a file's imports.
      run("cargo fmt --all");
    } catch {
      console.warn(
        "cargo isn't installed here: run `cargo update --workspace` and `cargo fmt --all` once it is.",
      );
    }
  }
  run("pnpm format");
}

const appDir = app === "web" ? "apps/web" : "apps/desktop";
const steps = [
  desktop &&
    `Draw the app's icon in ${appDir}/src-tauri/icons-source/icon.svg and run \`pnpm tauri:icons\`.`,
  app === "web" &&
    `Replace the app's icons: ${appDir}/src/assets/app-icon.png and ${appDir}/public/favicon-32x32.png${keepSite ? ", and apps/site/public" : ""}.`,
  desktop &&
    `Make the updater's signing key: \`pnpm --filter desktop tauri signer generate -w ~/.tauri/${slug}.key\`. Put the public key in ${appDir}/src-tauri/tauri.conf.json (plugins.updater.pubkey), and the private key and its password in the repository's secrets TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD.`,
  (web || keepSite) &&
    `For Cloudflare: the repository's secrets CLOUDFLARE_API_TOKEN (from the "Edit Cloudflare Workers" template) and CLOUDFLARE_ACCOUNT_ID. The first deploy from trunk creates ${[web && `the Worker ${slug} (the app)`, keepSite && `the Worker ${slug}-site (the site)`].filter(Boolean).join(" and ")}, at <name>.<your subdomain>.workers.dev. For a domain of its own, add it to "routes" in that wrangler.jsonc${keepSite ? " and set SITE_URL in apps/site/src/site-config.ts" : ""}.`,
  "Say what it is in README.md and AGENTS.md, and start docs/plan.md.",
].filter((step): step is string => typeof step === "string");
console.log(
  `\n${name} is set up. What's left is yours to do:\n\n${steps.map((step, i) => `  ${i + 1}. ${step}`).join("\n")}\n`,
);

/** Reads a JSON file, lets `edit` change it, and writes it back. */
function editJson(file: string, edit: (json: Record<string, any>) => void) {
  const full = at(file);
  if (!existsSync(full)) return;
  const json = JSON.parse(readFileSync(full, "utf8"));
  edit(json);
  writeFileSync(full, `${JSON.stringify(json, null, 2)}\n`);
}
