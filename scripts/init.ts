// Turns the template into a new project, once, right after it's created from the template:
//
//   pnpm install
//   pnpm template:init
//
// It asks for what it needs, or takes it as flags (`--yes` takes the defaults for the rest):
//
//   --name "Card Forge"            the app's name, as people see it
//   --slug card-forge              its name in packages, crates, binaries and URLs
//   --identifier dev.me.card-forge the bundle identifier, and the settings folder's name
//   --owner me                     the GitHub user or organisation
//   --repo card-forge              the GitHub repository
//   --site-url https://...         the marketing site's own domain, if it has one yet
//   --core rust | ts               where the logic lives (see the README)
//   --no-site                      leave out the marketing site
//
// It renames everything, keeps the core you chose and deletes the other, gives the Windows
// installer a fresh upgrade code, deletes itself and `template/`, and reinstalls.

import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

const root = path.resolve(import.meta.dirname, "..");
const at = (...parts: string[]) => path.join(root, ...parts);

const { values: flags } = parseArgs({
  options: {
    name: { type: "string" },
    slug: { type: "string" },
    identifier: { type: "string" },
    owner: { type: "string" },
    repo: { type: "string" },
    "site-url": { type: "string" },
    core: { type: "string" },
    "no-site": { type: "boolean" },
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
const identifier = await ask(
  flags.identifier,
  "Bundle identifier",
  `io.github.${owner.toLowerCase()}.${slug}`,
);
const core = await ask(flags.core, "Core: rust or ts", "rust");
if (core !== "rust" && core !== "ts") throw new Error(`--core is rust or ts, not "${core}"`);
const keepSite = flags["no-site"]
  ? false
  : (await ask(undefined, "Keep the marketing site? y/n", "y")).toLowerCase().startsWith("y");
const siteUrl = keepSite
  ? await ask(
      flags["site-url"],
      "Site URL (its own domain, if it has one yet)",
      "https://example.com/",
    )
  : "https://example.com/";
prompt?.close();

console.log(
  `\nSetting up ${name} (${slug}), with the ${core === "rust" ? "Rust" : "TypeScript"} core${keepSite ? " and the site" : ""}.`,
);

// --- Which core ---------------------------------------------------------------

if (core === "ts") {
  // The TypeScript core's versions of the files that differ.
  cpSync(at("template/ts-core"), root, { recursive: true });
  for (const gone of ["crates", "apps/desktop/src/bindings", ".cargo"])
    rmSync(at(gone), { recursive: true, force: true });
  editJson("package.json", (json) => {
    delete json.scripts.bindings;
  });
  editJson("apps/desktop/package.json", (json) => {
    json.dependencies["@my-app/core"] = "workspace:*";
  });
  editJson(".oxlintrc.json", (json) => {
    json.ignorePatterns = json.ignorePatterns.filter(
      (pattern: string) => pattern !== "apps/desktop/src/bindings",
    );
  });
  editJson(".oxfmtrc.json", (json) => {
    json.ignorePatterns = json.ignorePatterns.filter(
      (pattern: string) => pattern !== "apps/desktop/src/bindings",
    );
  });
} else {
  rmSync(at("packages/core"), { recursive: true, force: true });
}

// --- The site -----------------------------------------------------------------

if (!keepSite) {
  for (const gone of [
    "apps/site",
    ".github/workflows/site.yml",
    ".github/workflows/site-preview.yml",
  ]) {
    rmSync(at(gone), { recursive: true, force: true });
  }
  editJson("package.json", (json) => {
    delete json.scripts["site-dev"];
  });
  editJson(".agents/mcp.json", (json) => {
    delete json.mcpServers["storybook-site"];
  });
}

// --- Marked blocks and names in every text file --------------------------------

const keep: Record<string, boolean> = {
  "core:rust": core === "rust",
  "core:ts": core === "ts",
  site: keepSite,
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
]);
const TEXT =
  /\.(ts|tsx|js|mjs|json|jsonc|md|yml|yaml|toml|rs|html|css|svg|txt|lock|nsh)$|^(LICENSE|\.gitignore|\.gitattributes|\.editorconfig|\.nvmrc|pre-commit|post-merge|post-checkout|pnpm-lock\.yaml)$/u;

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
 * either way. Markers are `<!-- name:start -->` and `<!-- name:end -->` in Markdown, on lines of
 * their own (which go with them, so a list stays tight) or inside a line, and whole lines
 * `# name:start` and `# name:end` in YAML and TOML. */
function stripBlocks(text: string): string {
  return text
    .replace(
      /^[ \t]*<!-- ([a-z:]+):start -->[ \t]*\n([\s\S]*?)^[ \t]*<!-- \1:end -->[ \t]*(?:\n|$)/gmu,
      chooseBlock,
    )
    .replace(/<!-- ([a-z:]+):start -->([\s\S]*?)<!-- \1:end -->/gu, chooseBlock)
    .replace(
      /^[ \t]*# ([a-z:]+):start\b[^\n]*\n([\s\S]*?)^[ \t]*# \1:end\b[^\n]*\n/gmu,
      chooseBlock,
    );
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

// --- The template's own parts go --------------------------------------------------

editJson("package.json", (json) => {
  delete json.scripts["template:init"];
});
rmSync(at("template"), { recursive: true, force: true });
rmSync(at("scripts/init.ts"));

// --- Reinstall, so the lockfiles and generated files follow ---------------------

if (!flags["skip-install"]) {
  const run = (command: string) => execSync(command, { cwd: root, stdio: "inherit" });
  run("pnpm install");
  try {
    run("cargo update --workspace");
    // New crate names sort differently among a file's imports.
    run("cargo fmt --all");
  } catch {
    console.warn(
      "cargo isn't installed here: run `cargo update --workspace` and `cargo fmt --all` once it is.",
    );
  }
  run("pnpm format");
}

console.log(`
${name} is set up. What's left is yours to do:

  1. Draw the app's icon in apps/desktop/src-tauri/icons-source/icon.svg and run
     \`pnpm tauri:icons\`.
  2. Make the updater's signing key: \`pnpm --filter desktop tauri signer generate -w
     ~/.tauri/${slug}.key\`. Put the public key in apps/desktop/src-tauri/tauri.conf.json
     (plugins.updater.pubkey), and the private key and its password in the repository's secrets
     TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD.${
       keepSite
         ? `
  3. For the site: the secrets CLOUDFLARE_API_TOKEN (from the "Edit Cloudflare Workers"
     template) and CLOUDFLARE_ACCOUNT_ID. The first deploy from trunk creates the Worker
     ${slug}-site, at ${slug}-site.<your subdomain>.workers.dev. For a domain of its own, add it
     to "routes" in apps/site/wrangler.jsonc and set SITE_URL in apps/site/src/site-config.ts.`
         : ""
     }
  ${keepSite ? 4 : 3}. Say what the app is in README.md and AGENTS.md, and start docs/plan.md.
`);

/** Reads a JSON file, lets `edit` change it, and writes it back. */
function editJson(file: string, edit: (json: Record<string, any>) => void) {
  const full = at(file);
  if (!existsSync(full)) return;
  const json = JSON.parse(readFileSync(full, "utf8"));
  edit(json);
  writeFileSync(full, `${JSON.stringify(json, null, 2)}\n`);
}
