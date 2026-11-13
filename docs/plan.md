# Plan

What's being built, the decisions made along the way, and where the work stands. The
**Progress** section is the handoff: read it first, and bring it up to date at the end of every
step, so the next session starts from where this one stopped.

## What it is

<!-- A paragraph: what the app does, for whom, and what "done" looks like for its first
release. -->

## Decisions made

<!-- One line each, dated, with the reason when it isn't obvious:
- 2026-01-01: Settings are kept in the app's config folder, shared with the command line tool.
-->

## Progress

<!-- The steps, in order, each with its state (done / in progress / not started). For the one in
progress: what's done, what isn't, and what to pick up next. Note anywhere the build differs
from this plan, and why. -->

| Step                           | State       |
| ------------------------------ | ----------- |
| 1. Replace the example feature | Not started |

## How the work is done

- One step at a time, each ending with **Progress** brought up to date.
- Before calling a step done: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`,
  a look at the app (`pnpm tauri-dev`), and the screenshots retaken if what they show changed.
