# AGENTS.md

Guide for coding agents working in this repo. Read [README.md](README.md) for what the app does.

<!-- template:start -->

## Not set up yet

This repo is still the template: `scripts/init.ts` and `template/` exist. Before changing
anything else, ask the user for the app's name, its GitHub owner, which core it wants (Rust or
TypeScript, see the README) and whether it wants the marketing site, then run
`pnpm install` and `pnpm template:init` with those as flags (`pnpm template:init --help` lists
them; `--yes` takes the defaults for the rest). It renames everything, deletes the core not
chosen and these lines, and reinstalls. Then follow the steps it prints.

<!-- template:end -->

## Shape

A pnpm workspace and a Cargo workspace in one repo. The core does all the work; thin shells
drive it.<!-- site:start --> A marketing site sits beside them.<!-- site:end -->

<!-- core:rust:start -->

- `crates/core` (`my-app-core`): everything the app does, and its settings. Nothing in it knows
  about Tauri. `http` is the one HTTP client, `engine` runs a job list and reports `RunEvent`s,
  `naming::sanitize` makes any text a safe file name.
- `crates/cli` (`my-app`): a run with no window, printing the core's events.
- `apps/desktop` (package `desktop`): the desktop app.
  - `src-tauri`: Tauri commands over the core. A run reports progress on a `Channel<RunEvent>`
    passed to `start_run`.
  - `src`: React 19 + Chakra UI v3 + Zustand. It shows what the core reports and holds no logic
    of its own: no fetching, no parsing, no file writes. It reaches the core only through
    `src/api.ts`, and takes its types only from `src/core-types.ts` (re-exported from the ts-rs
    bindings in `src/bindings`).
  <!-- core:rust:end -->
  <!-- core:ts:start -->
- `packages/core` (`@my-app/core`): everything the app does, in TypeScript with no DOM, no Node
  and no Tauri, so the same code runs in the window, in tests and in scripts. Source only, no
  build step. `engine` runs a job list and reports `RunEvent`s; `naming.sanitize` makes any
  text a safe file name.
- `apps/desktop` (package `desktop`): the desktop app.
  - `src-tauri`: the shell. It opens the window and installs updates, and is where a command
    goes for what a window can't do (files on disk, other processes).
  - `src`: React 19 + Chakra UI v3 + Zustand. It shows what the core reports and holds no logic
    of its own. It reaches the core only through `src/api.ts`, and takes its types only from
    `src/core-types.ts`.
  <!-- core:ts:end -->
- `packages/ui` (`@my-app/ui`): the Chakra snippets, theme, provider and shared Storybook
  preview every app uses. Source only, no build step: import `@my-app/ui/<snippet>`,
  `@my-app/ui/theme`.
  <!-- site:start -->
- `apps/site` (package `site`): the marketing site, on Cloudflare Workers: Vite, TanStack
  Router, and `vite-prerender-plugin`, which renders every page to static HTML after the build,
  `404.html` included. Where it lives and links to is all in `src/site-config.ts`.
  - `wrangler.jsonc`: the Worker. It serves `dist` as static assets, and runs
    `worker/index.ts` first only for the paths in `run_worker_first` (`/api/*`).
  - `worker/`: the Worker's code, on Cloudflare's runtime (no DOM, no Node), with its own
    tsconfig. Its `Env` and runtime types come from `wrangler types` into
    `worker-configuration.d.ts`, which is generated, not committed.
  <!-- site:end -->
- `docs/plan.md`: what's being built, the decisions made, and where the work stands. Its
  Progress section is the handoff between sessions.

## Commands

| Task                          | Command                                                                     |
| ----------------------------- | --------------------------------------------------------------------------- |
| Install                       | `pnpm install` (also runs `agents:sync`; `corepack enable` once for pnpm)   |
| Desktop app                   | `pnpm tauri-dev`                                                            |
| Desktop app in a browser      | `pnpm --filter desktop dev` (no Tauri: the window buttons hide)             |
| Storybooks                    | `pnpm storybook` (all of them; VS Code starts them when the folder opens)   |
| Rust tests                    | `cargo test --workspace`                                                    |
| Rust lint and format          | `cargo clippy --workspace --all-targets -- -D warnings` / `cargo fmt --all` |
| Front end tests               | `pnpm test` (unit tests, and every package's stories in headless Chromium)  |
| Front end typecheck and build | `pnpm typecheck` / `pnpm build`                                             |
| Front end lint and format     | `pnpm lint` / `pnpm format` (oxlint and oxfmt, from the root)               |
| Chakra theme types            | `pnpm --filter @my-app/ui typegen` (the apps' dev, build and typecheck do)  |
| Icons, from one drawing       | `pnpm tauri:icons` (from `apps/desktop/src-tauri/icons-source/icon.svg`)    |
| Retake the app's screenshots  | `pnpm --filter desktop screenshots` (the `app-screenshots` skill)           |

<!-- core:rust:start -->

| Task                           | Command                                |
| ------------------------------ | -------------------------------------- |
| Regenerate TypeScript bindings | `pnpm bindings`                        |
| A real run, no window          | `cargo run -p my-app-cli -- names.txt` |

<!-- core:rust:end -->
<!-- site:start -->

| Task                 | Command                                                            |
| -------------------- | ------------------------------------------------------------------ |
| Site                 | `pnpm site-dev` (port 3000, no Worker); `pnpm --filter site build` |
| Site with its Worker | `pnpm --filter site preview` (builds, then `wrangler dev` on 3000) |
| The Worker's types   | `pnpm --filter site cf-typegen` (after changing `wrangler.jsonc`)  |
| A Worker secret      | `pnpm --filter site exec wrangler secret put <NAME>`               |

<!-- site:end -->

Run one package's script with `pnpm --filter <name> <script>`. Shared dependency versions live
in the `catalog:` in `pnpm-workspace.yaml`; a package asks for one with `"catalog:"`, so every
package gets the same React, Chakra and Vite.

The Tauri crate embeds `apps/desktop/dist`, so `pnpm --filter desktop build` once before
`cargo clippy --workspace` on a fresh clone.

## Rules

<!-- core:rust:start -->

- **Every request goes through `http::Http`.** It holds the rate limiters, retries, 429
  handling and the User-Agent. One `Http` is shared by a whole run, and by the whole app, so
  concurrent jobs share one limit. Never call `reqwest` directly. A new service gets an entry
  in `Endpoints`, so tests can point it at a `wiremock` server, and a `Limiter` if it publishes
  a rate limit.
- **Types the front end reads derive `TS` with `#[ts(export)]`.** After changing one, run
  `pnpm bindings` and commit `apps/desktop/src/bindings`. Don't edit those files by hand; CI
  fails when they don't match.
- **Tests don't touch the network.** Unit tests read saved responses in
  `crates/core/tests/fixtures`; integration tests run against `wiremock` servers
  (`crates/core/tests/http.rs`). Save a real response as a fixture rather than hand-writing
  one where you can.
  <!-- core:rust:end -->
  <!-- core:ts:start -->
- **The core is plain TypeScript.** No DOM, no Node and no Tauri in `packages/core`: what needs
  them goes in a Tauri command or the front end, behind `src/api.ts`. Its types are the
  contract with the front end; `src/core-types.ts` re-exports them.
- **Tests don't touch the network.** A request the core makes goes through a function it's
  given, so tests pass one that answers from a saved response.
  <!-- core:ts:end -->
- **A run's shape stays.** Plan the jobs, report each one's status as it changes, stop between
  jobs when cancelled, and always end with `finished`. The front end's store (`applyEvent`) and
  the run table rely on it.
- **The front end never passes URLs or file paths to work on.** It sends the user's input and
  settings; the core builds every URL and path, and file names go through `sanitize`.
- **Chakra UI v3**, not v2: compound components (`Drawer.Root`, `Switch.Root`…) and
  `colorPalette`. Check an unfamiliar component's API with the `chakra-ui` MCP server before
  using it, and load the `chakra-ui-builder` skill (or `chakra-ui-refactor`) for UI work.
- **Reach for a snippet before a compound component.** `packages/ui/src/components/ui` holds
  Chakra's snippets (`Field`, `Switch`, `SwitchField`, `Radio`, `NativeSelect*`,
  `SegmentedControl`, `Drawer*`, `Dialog*`, `EmptyState`, `Alert`, `Progress*`, `Tooltip`…),
  shared by every app, so a component writes `<Switch checked>Label</Switch>`, not the five
  parts behind it. oxlint enforces it: importing a component that has a snippet (or could have
  one) from `@chakra-ui/react` is an error outside `packages/ui/src` and `.storybook`. Before
  writing UI, check what's there with the `storybook-ui` MCP's `docs-list`. Add a missing
  snippet with `npx @chakra-ui/cli snippet add <name> --tsx --outdir packages/ui/src/components/ui`,
  convert it to React 19 style (`ref` as a prop, no `forwardRef`, no `"use client"`), import
  within the package by relative path, and give it a story so `docs-show` documents it.
- **Theme tokens, recipes and slot recipes live in `packages/ui/src/theme.ts`** and
  `packages/ui/src/recipes`, one system for every app. Run `pnpm --filter @my-app/ui typegen`
  after changing it so their props are typed. Use semantic tokens (`fg.muted`, `bg.subtle`…)
  over raw colours so both colour modes work. The accent is `emerald`.
- **In the desktop app, errors go through `showError`** (`apps/desktop/src/notify.ts`), and a
  select, segmented control or tab list over a string union narrows its value with `findOption`
  (`apps/desktop/src/utils/options.ts`). Its dialogs and drawers come from
  `@/components/ui/dialog` and `@/components/ui/drawer`, which keep the header usable while one
  is open; oxlint bans the shared ones there.
- **The window's title bar is the app's own.** On Windows and Linux the native one is off
  (`open_main_window` in `src-tauri/src/lib.rs`) and `AppHeader` draws it, with
  `WindowControls`; on macOS the native traffic lights sit over the header. `appWindow.ts` says
  which (`windowFrame`). Dialogs and drawers open below the header (`theme.ts`, `layout.ts`).
  A new window gets nothing from `capabilities/` unless a capability names it.
- **Screenshots follow the UI.** `docs/screenshots`, which the README<!-- site:start --> and the
  site<!-- site:end --> show, are taken by `pnpm --filter desktop screenshots`. A change that
  alters what one shows (theme, colours, fonts, layout, wording) retakes it in the same change;
  the `app-screenshots` skill says how, and how to check each image.
  <!-- site:start -->
- **The download page never names a file.** It fetches the latest release from GitHub and
  `apps/site/src/downloads/artifacts.ts` sorts its files with a table of rules. Files no rule
  knows are listed as "Other files", so a new kind of file shows up on its own; to give it a
  label and a place on its system's tab, add a rule there and a case to `artifacts.test.ts`.
  Never hard-code an asset name or version in a component.
- **The site's Worker runs only where it must.** Static pages are served without it; a route
  that needs code goes in `ROUTES` in `apps/site/worker/index.ts` under a path that
  `run_worker_first` sends to it, with a test in `worker/index.test.ts`. Bindings and variables
  go in `wrangler.jsonc`, secrets through `wrangler secret put`, never in the repo; run
  `cf-typegen` after either so `Env` knows them.
- **The site never creates a GitHub release or a `v*` tag.** The app's updater and the download
  page read `releases/latest`, which must always be the app's. The site deploys from `trunk` on
  its own (`.github/workflows/site.yml`); the app ships by tag (`release.yml`, the `release`
  skill).
  <!-- site:end -->
- **Types over casts** in TypeScript: narrow with a guard instead of `as`.

## Plans and handoff

`docs/plan.md` holds what's being built and where it stands. Its **Progress** section is the
handoff: read it first, and bring it up to date at the end of every step, so the next session
(or person) starts from where this one stopped. Record a decision the user makes under
**Decisions made**, with the date. Work one step at a time, and stop and report after each
rather than running a whole plan, unless the user says otherwise.

Before calling a step done, run its checklist under **How the work is done**.

## Agent config and MCP servers

`AGENTS.md`, `.agents/skills/` and `.agents/mcp.json` are the sources. `pnpm agents:sync` (run on
install, checkout and merge) generates `CLAUDE.md`, `.claude/skills/`, and the MCP configs for
Claude Code (`.mcp.json`), Cursor (`.cursor/mcp.json`) and VS Code (`.vscode/mcp.json`). Those
are gitignored: edit the sources, never the generated files. The Chakra, code review and hf-cli
skills come from `npx skills add` and are pinned in `skills-lock.json`.

- `chakra-ui`: Chakra's component docs, props and examples.
- `storybook-ui`, `storybook-desktop`<!-- site:start -->, `storybook-site`<!-- site:end -->:
  served by `@storybook/addon-mcp` at `http://localhost:6008/mcp` (`packages/ui`), `6009`
  (`apps/desktop`)<!-- site:start --> and `6010` (`apps/site`)<!-- site:end -->, so only while
  that Storybook is running. Use the one for the package you're changing, and `storybook-ui` for
  the snippets.

When working on UI components:

- Use the `storybook` MCP tools before answering questions about or changing UI components.
- Never guess component props. Call `docs-list` to see documented components and `docs-show` for
  a component's props, and use only props that are documented or shown in example stories. Story
  names don't always match prop names. If a prop isn't documented, ask the user instead of
  assuming. `docs-show` may print imports from the package's name; the real import is
  `@my-app/ui/<file>` for a snippet or `@/components/<Component>` for an app's own component.
- Call `get-storybook-story-instructions` before creating or updating stories.
- Run `test-run` to verify your changes.

## Storybook stories

Stories sit next to their component (`RunTable.tsx` and `RunTable.stories.tsx`) and every one
runs as a test under `pnpm test`. Each package has its own Storybook: `packages/ui` for the
snippets (port 6008), `apps/desktop` (6009)<!-- site:start --> and `apps/site` (6010)<!-- site:end -->.
The app Storybooks compose the library's as a "UI library" ref, so they show its stories too
while it runs. Shared preview setup (theme switcher, Chakra provider, toaster, a11y settings) is
`@my-app/ui/storybook`; each package's `.storybook/preview.tsx` spreads `basePreview` (or
`previewFor` its own system) and calls `resetUi()` in its `beforeEach`.

- Write or update a story when you create a component or a snippet, or add props, states or
  variants to one. Cover each state the component can reach (empty, loading, running, finished,
  error…), not every prop combination.
- Add a `play` function that checks the behaviour a story is about, with role- or label-based
  queries. Chakra overlays (drawers, tooltips, toasts) render in a portal: query them with
  `screen`, not `canvas`, and `waitFor` them to finish animating in.
- Don't wrap stories in a provider or add a `<Toaster />`; `.storybook/preview.tsx` does<!-- site:start -->,
  and the site's also puts every story inside a router so router links work<!-- site:end -->. Don't
  add `tags: ["autodocs"]` or a `title`; titles come from the file path.
- **There is no Tauri in Storybook.** The desktop preview mocks `src/api.ts`, `src/appWindow.ts`
  and every `@tauri-apps/*` module the app imports with `sb.mock`, and gives each a default
  answer. Override one in the story's `beforeEach` with
  `mocked(api.startRun).mockResolvedValue(…)` and assert calls with
  `expect(api.startRun).toHaveBeenCalledWith(…)`. If a component starts importing another
  `@tauri-apps/*` module, add it to the preview's `sb.mock` list and defaults. A mocked module
  must not re-export types: put them in a module that isn't mocked, as `core-types.ts` is.
- The desktop's Zustand stores are reset before every story. Seed one in `beforeEach` with
  `useRun.setState({ … })`. Typed sample data lives in `apps/desktop/src/__fixtures__`<!-- site:start -->;
  the site's sample releases are in `apps/site/src/downloads/__fixtures__`<!-- site:end -->.

## Accessibility

Storybook's a11y addon runs axe on every story. Violations are reported in the a11y panel and by
the MCP's `test-run`, but don't fail tests (`a11y.test: "todo"` in the shared preview).

- Fix structural issues yourself: labels, roles, `aria-label` on icon-only buttons, alt text,
  table headers (`VisuallyHidden` for a column with no visible title), heading order.
- Ask before changing anything visual, such as colour contrast, sizes or focus styles: describe
  the issue and offer two or three options.
- Don't turn rules off to make a report go away.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `feat(core): …`,
`fix(desktop): …`, `feat(site): …`, `refactor(ui): …`, `chore(ci): …`, in the imperative, lower
case, no trailing period. The default branch is `trunk`.
