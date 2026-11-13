<!-- template:start -->

# Tauri app template

A starting point for a desktop app, a web app, both from one code base, or just a website, with
everything around it already set up: a pnpm workspace with one version of each shared
dependency, Chakra UI v3 with a shared theme and snippets, oxlint and oxfmt, Storybook for every
package with each story run as a test in headless Chromium, CI, Cloudflare Workers for anything
on the web, and instructions and skills for coding agents.

**See the example site:** <https://amodsoul.github.io/tauri-app-template/>, built from
`apps/site` by `.github/workflows/pages.yml` (static pages only: the Worker doesn't run there).

The app it comes with is a small example that shows each part working: type names, one a line,
and it makes each a safe file name, reporting its progress job by job, with settings in a drawer.
Replace it with your own and keep the plumbing.

## Start a project from it

1. On GitHub, **Use this template** › **Create a new repository** (or
   `gh repo create my-thing --template <owner>/tauri-app-template --private --clone`).
2. In the new repository:

   ```sh
   corepack enable          # once, for pnpm
   pnpm install
   pnpm template:init       # asks what to keep, renames everything, deletes the rest
   ```

   It prints what's left to do: the icon, the updater's signing key and the repository's
   secrets. A coding agent reading `AGENTS.md` will offer to run it for you.

## What you choose

**The app** (`--app`):

| Choice    | What you get                                                                           |
| --------- | -------------------------------------------------------------------------------------- |
| `desktop` | A Tauri app for Windows, macOS and Linux, with installers, signed releases and updates |
| `web`     | The same React app in a browser, served by a Cloudflare Worker; no Tauri, no Rust      |
| `both`    | One app, two targets: the desktop app, and its web build on a Worker                   |
| `none`    | No app: a website only                                                                 |

**The core** (`--core`), where the app's logic lives. The front end reaches it through two
files, `apps/desktop/src/api.ts` and `src/core-types.ts`, so it works the same over either.

- **Rust** (`crates/core` and a `my-app` command line tool), for a desktop app: the core runs
  in the app's Tauri process, and its types reach the front end through ts-rs. It comes with a
  shared HTTP client with rate limits, retries and 429 handling, tested against wiremock. Choose
  it for network or file work, anything heavy, or a command line tool.
- **TypeScript** (`packages/core`): the core runs in the page, with the interface. A web app
  (`web` or `both`) always has this one.

**The site** (`--no-site` to leave it out): an Astro site, every page built to static HTML
with the shared Chakra components and served by a Cloudflare Worker that also answers `/api/*`
routes of your own. With a desktop app it has a download page that sorts the latest release's
files by system. It has a real 404 page, and a preview of every pull request.

## What else is in here

- **A title bar of the app's own** on Windows and Linux, macOS's traffic lights kept over it,
  and dialogs and drawers that open below it and leave it usable.
- **`packages/ui`**: Chakra's snippets, a theme with an emerald accent, recipes, and the
  Storybook preview every package shares. oxlint stops a component from skipping a snippet.
- **Agents**: `AGENTS.md`, synced to `CLAUDE.md`, the Chakra and Storybook MCP servers for
  Claude Code, Cursor and VS Code, and skills for Chakra, code review, screenshots and releases.
- **Releases**: push a `v*` tag and `release.yml` builds Windows, macOS and Linux installers into
  a draft release with a signed update manifest; publishing it updates every installed copy.
- **Plans**: `docs/plan.md`, whose Progress section is the handoff from one session to the next.

The rest of this README is the example's, as a new project starts with it.

---

<!-- template:end -->

# My App

<!-- app:start -->

![My App after a run: each line typed on the left, and the file name it became on the right](docs/screenshots/results-dark.png)

My App turns a list of names into safe file names<!-- app:desktop:start -->, on Windows, macOS and Linux<!-- app:desktop:end -->.

<!-- app:end -->
<!-- app:none:start -->

My App's website, built with Astro and served by a Cloudflare Worker.

<!-- app:none:end -->
<!-- app:desktop:start -->

## Download

Get the installer for your system from the [latest release](https://github.com/your-github-user/my-app/releases/latest)<!-- site:start -->,
or from [the site](https://example.com/download)<!-- site:end -->. Once installed, the app offers
each new version itself.

<!-- app:desktop:end -->
<!-- app:start -->

## Using it

Type or paste names, one a line, and press **Make names**. Each line becomes a file name that
Windows, macOS and Linux all accept, shown beside it as it's made. **Settings**, in the header,
choose the case, what spaces become, the longest name, and whether a repeated name gets a number.

![The settings drawer](docs/screenshots/settings-dark.png)

<!-- app:end -->
<!-- core:rust:start -->

## From the command line

`my-app` does what the app does, and reads the same settings:

```sh
my-app names.txt                    # a file, one name a line
echo "Quarterly Report" | my-app -  # standard input
```

<!-- core:rust:end -->

## Building it

You need [Node](https://nodejs.org) 24 and pnpm (`corepack enable`)<!-- app:desktop:start -->,
[Rust](https://rustup.rs), and [Tauri's system dependencies](https://v2.tauri.app/start/prerequisites/)<!-- app:desktop:end -->.

```sh
pnpm install
pnpm storybook                       # every package's Storybook
pnpm test                            # unit tests, and every story in headless Chromium
```

<!-- app:desktop:start -->

```sh
pnpm tauri-dev                       # the app, with hot reload
cargo test --workspace
pnpm --filter desktop tauri build    # installers for this system
```

<!-- app:desktop:end -->
<!-- app:web:start -->

```sh
pnpm --filter desktop dev            # the app in a browser, with hot reload
pnpm --filter desktop preview:web    # built, with its Worker, as it's deployed
```

<!-- app:web:end -->
<!-- site:start -->

```sh
pnpm site-dev                        # the site, with hot reload
pnpm --filter site preview           # built, with its Worker, as it's deployed
```

<!-- site:end -->

[AGENTS.md](AGENTS.md) describes how the code is laid out and the rules it follows.

## Licence

[GPL-3.0-or-later](LICENSE).
